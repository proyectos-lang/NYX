-- ===========================================================================
-- Cerrar el circuito del estudio: del diseño al pedido
--
-- Hasta ahora el cliente podía diseñar, pero el diseño no llegaba a NYX. Dos
-- cambios de firma lo arreglan:
--
--   guardar_diseno()  acepta la vista previa, para poder enseñarla en el panel
--                     sin tener que montar el visor 3D en la bandeja
--   crear_solicitud() acepta el token del diseño y lo engancha al pedido que
--                     acaba de crear
--
-- El enganche va DENTRO de crear_solicitud() a propósito, y no en una función
-- aparte: la tabla `disenos` es solo-staff, así que si el enlace fuera público
-- cualquiera podría colgar su diseño del pedido de otro. Aquí no hace falta
-- confiar en nadie — la función acaba de crear el pedido, así que sabe cuál es.
--
-- Las dos cambian de firma, así que se eliminan primero: añadir un parámetro
-- crearía una sobrecarga y las llamadas quedarían ambiguas.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- guardar_diseno(): admitir la vista previa
-- ---------------------------------------------------------------------------

drop function if exists nyx.guardar_diseno(jsonb, text, uuid);

create or replace function nyx.guardar_diseno(
  p_documento    jsonb,
  p_token        text default null,
  p_modelo_id    uuid default null,
  p_vista_previa text default null
)
returns text
language plpgsql
security definer
set search_path = nyx, public, extensions
as $$
declare
  v_token text;
  v_vista text;
begin
  if jsonb_typeof(p_documento) is distinct from 'object' then
    raise exception 'El diseño debe ser un objeto' using errcode = '22023';
  end if;

  -- Un documento de capas con imágenes ronda los pocos KB. Un megabyte
  -- significa que alguien está metiendo la imagen dentro del JSON.
  if pg_column_size(p_documento) > 1048576 then
    raise exception 'El diseño es demasiado grande' using errcode = '22023';
  end if;

  -- La vista previa es la URL del PNG en el bucket, no el PNG en base64: una
  -- captura del visor ronda el medio mega y no tiene por qué vivir en una
  -- columna de texto que se lee en cada consulta de la bandeja.
  v_vista := nullif(btrim(coalesce(p_vista_previa, '')), '');
  if v_vista is not null and length(v_vista) > 1000 then
    raise exception 'La vista previa debe ser una URL, no la imagen' using errcode = '22023';
  end if;

  v_token := nullif(btrim(coalesce(p_token, '')), '');

  if v_token is not null then
    update nyx.disenos
       set documento    = p_documento,
           modelo_id    = coalesce(p_modelo_id, modelo_id),
           vista_previa = coalesce(v_vista, vista_previa)
     where token = v_token;

    -- Un token que no existe (o que se borró) no debe fallar en silencio:
    -- se crea uno nuevo y el cliente se queda con ese.
    if found then
      return v_token;
    end if;
  end if;

  insert into nyx.disenos (documento, modelo_id, vista_previa)
  values (p_documento, p_modelo_id, v_vista)
  returning token into v_token;

  return v_token;
end;
$$;

revoke all on function nyx.guardar_diseno(jsonb, text, uuid, text) from public;
grant execute on function nyx.guardar_diseno(jsonb, text, uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- crear_solicitud(): enganchar el diseño al pedido
-- ---------------------------------------------------------------------------

drop function if exists nyx.crear_solicitud(
  text, text, jsonb, text, text, date, nyx.metodo_entrega, text, jsonb
);

create or replace function nyx.crear_solicitud(
  p_nombre          text,
  p_email           text,
  p_items           jsonb,
  p_telefono        text default null,
  p_empresa         text default null,
  p_fecha_requerida date default null,
  p_metodo_entrega  nyx.metodo_entrega default null,
  p_observaciones   text default null,
  p_archivos        jsonb default '[]'::jsonb,
  p_diseno_token    text default null
)
returns text
language plpgsql
security definer
set search_path = nyx, public, extensions
as $$
declare
  v_cliente_id  uuid;
  v_pedido_id   uuid;
  v_ref         text;
  v_item        jsonb;
  v_total       integer;
  v_producto_id uuid;
  v_cantidad    integer;
  v_ref_prod    text;
  v_archivo     jsonb;
  v_ruta        text;
  v_diseno      text;
begin
  -- --- Validación de entrada -----------------------------------------------
  p_nombre := nullif(btrim(coalesce(p_nombre, '')), '');
  p_email  := nullif(lower(btrim(coalesce(p_email, ''))), '');

  if p_nombre is null then
    raise exception 'El nombre es obligatorio' using errcode = '22023';
  end if;

  if p_email is null or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Correo electrónico no válido' using errcode = '22023';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Los productos deben enviarse como lista' using errcode = '22023';
  end if;

  v_total := jsonb_array_length(p_items);
  if v_total = 0 then
    raise exception 'La solicitud debe incluir al menos un producto' using errcode = '22023';
  end if;
  if v_total > 50 then
    raise exception 'Máximo 50 líneas por solicitud' using errcode = '22023';
  end if;

  if length(coalesce(p_observaciones, '')) > 2000 then
    raise exception 'Las observaciones son demasiado largas' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_archivos, '[]'::jsonb)) is distinct from 'array'
     or jsonb_array_length(coalesce(p_archivos, '[]'::jsonb)) > 10 then
    raise exception 'Máximo 10 archivos por solicitud' using errcode = '22023';
  end if;

  -- --- Cliente: reutiliza el existente si ya escribió antes ----------------
  select id into v_cliente_id
  from nyx.clientes
  where lower(email) = p_email
  limit 1;

  if v_cliente_id is null then
    insert into nyx.clientes (nombre, email, telefono, empresa)
    values (p_nombre, p_email, nullif(btrim(coalesce(p_telefono, '')), ''),
            nullif(btrim(coalesce(p_empresa, '')), ''))
    returning id into v_cliente_id;
  else
    -- Completa los datos que falten sin pisar lo que ya tenga el panel.
    update nyx.clientes
       set telefono = coalesce(telefono, nullif(btrim(coalesce(p_telefono, '')), '')),
           empresa  = coalesce(empresa,  nullif(btrim(coalesce(p_empresa, '')), ''))
     where id = v_cliente_id;
  end if;

  -- --- Pedido ---------------------------------------------------------------
  insert into nyx.pedidos (
    cliente_id, estado, metodo_entrega, fecha_requerida, observaciones, origen
  )
  values (
    v_cliente_id, 'nuevo', p_metodo_entrega, p_fecha_requerida, p_observaciones,
    case when nullif(btrim(coalesce(p_diseno_token, '')), '') is not null
         then 'estudio' else 'web' end
  )
  returning id, ref into v_pedido_id, v_ref;

  -- --- Líneas ---------------------------------------------------------------
  --
  -- producto_id solo se acepta si apunta a un producto visible: así una
  -- solicitud anónima no puede enlazar productos ocultos del catálogo.
  -- El nombre se guarda siempre, aunque el producto no exista (pedido libre).
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    -- Se comprueba el formato antes de castear: un producto_id basura debe
    -- degradar a "pedido libre", no reventar toda la solicitud.
    v_ref_prod := nullif(btrim(coalesce(v_item ->> 'producto_id', '')), '');

    if v_ref_prod ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select p.id into v_producto_id
      from nyx.productos p
      where p.id = v_ref_prod::uuid and p.visible;
    else
      v_producto_id := null;
    end if;

    v_cantidad := case
      when coalesce(v_item ->> 'cantidad', '') ~ '^[0-9]{1,7}$'
        then greatest(1, (v_item ->> 'cantidad')::integer)
      else 1
    end;

    insert into nyx.pedido_items (
      pedido_id, producto_id, nombre_producto, cantidad, especificaciones
    )
    values (
      v_pedido_id,
      v_producto_id,
      coalesce(
        nullif(btrim(coalesce(v_item ->> 'nombre', '')), ''),
        (select p.nombre_es from nyx.productos p where p.id = v_producto_id),
        'Producto sin especificar'
      ),
      v_cantidad,
      left(nullif(btrim(coalesce(v_item ->> 'especificaciones', '')), ''), 1000)
    );
  end loop;

  -- --- Archivos adjuntos -----------------------------------------------------
  --
  -- Solo se aceptan rutas dentro de entrantes/, que es lo único donde la
  -- política de Storage deja escribir a un visitante anónimo. Cualquier otra
  -- ruta se ignora en silencio en vez de tumbar la solicitud.
  for v_archivo in select * from jsonb_array_elements(coalesce(p_archivos, '[]'::jsonb))
  loop
    v_ruta := nullif(btrim(coalesce(v_archivo ->> 'ruta', '')), '');

    if v_ruta is not null and v_ruta like 'entrantes/%' and v_ruta !~ '\.\.' then
      insert into nyx.pedido_archivos (
        pedido_id, ruta_storage, nombre_archivo, bytes, mime
      )
      values (
        v_pedido_id,
        v_ruta,
        left(coalesce(nullif(btrim(coalesce(v_archivo ->> 'nombre', '')), ''), 'archivo'), 200),
        case
          when coalesce(v_archivo ->> 'bytes', '') ~ '^[0-9]{1,12}$'
            then (v_archivo ->> 'bytes')::bigint
          else null
        end,
        left(nullif(btrim(coalesce(v_archivo ->> 'mime', '')), ''), 120)
      );
    end if;
  end loop;

  -- --- El diseño del estudio -------------------------------------------------
  --
  -- Solo se engancha si el diseño existe y NO está ya en otro pedido: así un
  -- token que alguien copie de otra sesión no puede robar un diseño ajeno ni
  -- reasignarlo. Si no cuadra, se ignora en silencio: perder el enlace es
  -- molesto, perder la solicitud entera lo es mucho más.
  v_diseno := nullif(btrim(coalesce(p_diseno_token, '')), '');

  if v_diseno is not null then
    update nyx.disenos
       set pedido_id = v_pedido_id
     where token = v_diseno
       and pedido_id is null;
  end if;

  return v_ref;
end;
$$;

revoke all on function nyx.crear_solicitud(
  text, text, jsonb, text, text, date, nyx.metodo_entrega, text, jsonb, text
) from public;

grant execute on function nyx.crear_solicitud(
  text, text, jsonb, text, text, date, nyx.metodo_entrega, text, jsonb, text
) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- El panel necesita leer el diseño de un pedido
--
-- `disenos` ya es solo-staff, así que la política existente basta. Lo que
-- faltaba era el índice: la bandeja embebe el diseño de cada pedido y sin esto
-- sería un recorrido completo de la tabla por cada carga.
-- ---------------------------------------------------------------------------

create index if not exists disenos_pedido_no_nulo_idx
  on nyx.disenos (pedido_id) where pedido_id is not null;

-- ---------------------------------------------------------------------------
-- Storage: permitir tambien la vista previa
--
-- La politica anterior solo dejaba al visitante anonimo escribir en `capas/`,
-- que es donde van los logos y las texturas. La captura del visor va en
-- `vistas/`, asi que sin esto la subida se rechazaria y el diseno se guardaria
-- siempre sin miniatura.
--
-- Se sigue acotando a esas dos carpetas: no es "el anonimo escribe donde
-- quiera en el bucket".
-- ---------------------------------------------------------------------------

drop policy if exists "storage: subida anónima de capas del estudio" on storage.objects;

create policy "storage: subida anónima de capas del estudio"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'disenos'
    and (storage.foldername(name))[1] in ('capas', 'vistas')
  );
