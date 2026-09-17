-- ===========================================================================
-- crear_solicitud(): aceptar los archivos que adjunta el cliente
--
-- El formulario de cotización sube el logo directamente al bucket privado
-- 'pedidos' desde el navegador (política "storage: subida anónima a
-- pedidos/entrantes"), y luego manda aquí la ruta resultante.
--
-- Esa subida en dos pasos es a propósito: pasar un archivo de hasta 20 MB por
-- una Server Action de Next obligaría a subir el límite de body y a que el
-- archivo viaje dos veces. Subiéndolo directo, el servidor solo ve la ruta.
--
-- Como pedido_archivos es tabla solo-staff, la fila la inserta esta función,
-- que es SECURITY DEFINER; el cliente nunca escribe en ella.
--
-- Se elimina la versión anterior porque cambia la firma: añadir un parámetro
-- crearía una sobrecarga y las llamadas quedarían ambiguas.
-- ===========================================================================

drop function if exists public.crear_solicitud(
  text, text, jsonb, text, text, date, public.metodo_entrega, text
);

create or replace function public.crear_solicitud(
  p_nombre          text,
  p_email           text,
  p_items           jsonb,
  p_telefono        text default null,
  p_empresa         text default null,
  p_fecha_requerida date default null,
  p_metodo_entrega  public.metodo_entrega default null,
  p_observaciones   text default null,
  p_archivos        jsonb default '[]'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public
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
  from public.clientes
  where lower(email) = p_email
  limit 1;

  if v_cliente_id is null then
    insert into public.clientes (nombre, email, telefono, empresa)
    values (p_nombre, p_email, nullif(btrim(coalesce(p_telefono, '')), ''),
            nullif(btrim(coalesce(p_empresa, '')), ''))
    returning id into v_cliente_id;
  else
    -- Completa los datos que falten sin pisar lo que ya tenga el panel.
    update public.clientes
       set telefono = coalesce(telefono, nullif(btrim(coalesce(p_telefono, '')), '')),
           empresa  = coalesce(empresa,  nullif(btrim(coalesce(p_empresa, '')), ''))
     where id = v_cliente_id;
  end if;

  -- --- Pedido ---------------------------------------------------------------
  insert into public.pedidos (
    cliente_id, estado, metodo_entrega, fecha_requerida, observaciones, origen
  )
  values (
    v_cliente_id, 'nuevo', p_metodo_entrega, p_fecha_requerida, p_observaciones, 'web'
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
      from public.productos p
      where p.id = v_ref_prod::uuid and p.visible;
    else
      v_producto_id := null;
    end if;

    v_cantidad := case
      when coalesce(v_item ->> 'cantidad', '') ~ '^[0-9]{1,7}$'
        then greatest(1, (v_item ->> 'cantidad')::integer)
      else 1
    end;

    insert into public.pedido_items (
      pedido_id, producto_id, nombre_producto, cantidad, especificaciones
    )
    values (
      v_pedido_id,
      v_producto_id,
      coalesce(
        nullif(btrim(coalesce(v_item ->> 'nombre', '')), ''),
        (select p.nombre_es from public.productos p where p.id = v_producto_id),
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
      insert into public.pedido_archivos (
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

  return v_ref;
end;
$$;

revoke all on function public.crear_solicitud(
  text, text, jsonb, text, text, date, public.metodo_entrega, text, jsonb
) from public;

grant execute on function public.crear_solicitud(
  text, text, jsonb, text, text, date, public.metodo_entrega, text, jsonb
) to anon, authenticated;
