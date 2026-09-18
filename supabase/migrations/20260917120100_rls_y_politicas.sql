-- ===========================================================================
-- NYX — Row Level Security
--
-- Regla general, en dos frases:
--   · El público (clave anon) SOLO LEE lo que está marcado como visible.
--   · El staff del panel (usuario con fila en perfiles) lee y escribe todo.
--
-- El público nunca escribe directamente en pedidos. La única vía de escritura
-- anónima es la función crear_solicitud() del final de este archivo, que valida
-- la entrada y controla exactamente qué campos se pueden fijar.
-- ===========================================================================

alter table nyx.perfiles             enable row level security;
alter table nyx.categorias           enable row level security;
alter table nyx.categoria_fotos      enable row level security;
alter table nyx.productos            enable row level security;
alter table nyx.producto_fotos       enable row level security;
alter table nyx.clientes             enable row level security;
alter table nyx.pedidos              enable row level security;
alter table nyx.pedido_items         enable row level security;
alter table nyx.pedido_archivos      enable row level security;
alter table nyx.pedido_eventos       enable row level security;
alter table nyx.contenido_bloques    enable row level security;
alter table nyx.contenido_campos     enable row level security;
alter table nyx.contenido_media      enable row level security;
alter table nyx.faq                  enable row level security;
alter table nyx.ajustes              enable row level security;
alter table nyx.enlaces_compartidos  enable row level security;
alter table nyx.enlace_productos     enable row level security;

-- ---------------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------------

create policy "perfiles: cada uno lee el suyo"
  on nyx.perfiles for select
  using (id = auth.uid());

create policy "perfiles: el admin lee todos"
  on nyx.perfiles for select
  using (nyx.es_admin());

create policy "perfiles: el admin gestiona"
  on nyx.perfiles for all
  using (nyx.es_admin())
  with check (nyx.es_admin());

-- ---------------------------------------------------------------------------
-- Catálogo — lectura pública de lo visible, escritura solo del staff
-- ---------------------------------------------------------------------------

create policy "categorias: lectura pública de las visibles"
  on nyx.categorias for select
  using (visible or nyx.es_staff());

create policy "categorias: el staff gestiona"
  on nyx.categorias for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

create policy "categoria_fotos: lectura pública si la categoría es visible"
  on nyx.categoria_fotos for select
  using (
    nyx.es_staff()
    or exists (
      select 1 from nyx.categorias c
      where c.id = categoria_fotos.categoria_id and c.visible
    )
  );

create policy "categoria_fotos: el staff gestiona"
  on nyx.categoria_fotos for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

create policy "productos: lectura pública de los visibles"
  on nyx.productos for select
  using (visible or nyx.es_staff());

create policy "productos: el staff gestiona"
  on nyx.productos for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

create policy "producto_fotos: lectura pública si el producto es visible"
  on nyx.producto_fotos for select
  using (
    nyx.es_staff()
    or exists (
      select 1 from nyx.productos p
      where p.id = producto_fotos.producto_id and p.visible
    )
  );

create policy "producto_fotos: el staff gestiona"
  on nyx.producto_fotos for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

-- ---------------------------------------------------------------------------
-- Clientes y pedidos — privados en su totalidad
--
-- Sin políticas para anon: el público no puede leer ni escribir estas tablas
-- de forma directa. Contienen datos personales (correo, teléfono, empresa).
-- ---------------------------------------------------------------------------

create policy "clientes: solo el staff"
  on nyx.clientes for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

create policy "pedidos: solo el staff"
  on nyx.pedidos for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

create policy "pedido_items: solo el staff"
  on nyx.pedido_items for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

create policy "pedido_archivos: solo el staff"
  on nyx.pedido_archivos for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

-- El historial lo escriben los triggers, no las personas: solo lectura.
create policy "pedido_eventos: el staff lee"
  on nyx.pedido_eventos for select
  using (nyx.es_staff());

-- ---------------------------------------------------------------------------
-- Contenido del sitio y FAQ — lectura pública
-- ---------------------------------------------------------------------------

create policy "contenido_bloques: lectura pública"
  on nyx.contenido_bloques for select
  using (true);

create policy "contenido_bloques: el staff gestiona"
  on nyx.contenido_bloques for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

create policy "contenido_campos: lectura pública"
  on nyx.contenido_campos for select
  using (true);

create policy "contenido_campos: el staff gestiona"
  on nyx.contenido_campos for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

create policy "contenido_media: lectura pública"
  on nyx.contenido_media for select
  using (true);

create policy "contenido_media: el staff gestiona"
  on nyx.contenido_media for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

create policy "faq: lectura pública de las visibles"
  on nyx.faq for select
  using (visible or nyx.es_staff());

create policy "faq: el staff gestiona"
  on nyx.faq for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

-- ---------------------------------------------------------------------------
-- Ajustes — el público solo ve los marcados como públicos
--
-- Importante: el flag `publico` es lo que separa el teléfono del pie de página
-- (público) de la lista de correos que reciben los avisos (privado).
-- ---------------------------------------------------------------------------

create policy "ajustes: lectura pública de los marcados como públicos"
  on nyx.ajustes for select
  using (publico or nyx.es_staff());

create policy "ajustes: el staff gestiona"
  on nyx.ajustes for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

-- ---------------------------------------------------------------------------
-- Enlaces compartidos
--
-- El enlace se resuelve por token desde el servidor, no consultando la tabla
-- con la clave anon: por eso aquí solo hay políticas de staff.
-- ---------------------------------------------------------------------------

create policy "enlaces_compartidos: solo el staff"
  on nyx.enlaces_compartidos for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

create policy "enlace_productos: solo el staff"
  on nyx.enlace_productos for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

-- ===========================================================================
-- Única vía de escritura pública: el formulario de cotización
--
-- SECURITY DEFINER, así que se salta RLS — pero solo puede hacer lo que el
-- cuerpo de la función permite. El cliente no elige el estado, ni la
-- referencia, ni el precio: esos los fija NYX desde el panel.
-- ===========================================================================

create or replace function nyx.crear_solicitud(
  p_nombre          text,
  p_email           text,
  p_items           jsonb,
  p_telefono        text default null,
  p_empresa         text default null,
  p_fecha_requerida date default null,
  p_metodo_entrega  nyx.metodo_entrega default null,
  p_observaciones   text default null
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

  return v_ref;
end;
$$;

-- El formulario público la llama con la clave anon; el panel, autenticado.
revoke all on function nyx.crear_solicitud(
  text, text, jsonb, text, text, date, nyx.metodo_entrega, text
) from public;

grant execute on function nyx.crear_solicitud(
  text, text, jsonb, text, text, date, nyx.metodo_entrega, text
) to anon, authenticated;
