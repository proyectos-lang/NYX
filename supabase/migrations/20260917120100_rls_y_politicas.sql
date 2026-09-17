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

alter table public.perfiles             enable row level security;
alter table public.categorias           enable row level security;
alter table public.categoria_fotos      enable row level security;
alter table public.productos            enable row level security;
alter table public.producto_fotos       enable row level security;
alter table public.clientes             enable row level security;
alter table public.pedidos              enable row level security;
alter table public.pedido_items         enable row level security;
alter table public.pedido_archivos      enable row level security;
alter table public.pedido_eventos       enable row level security;
alter table public.contenido_bloques    enable row level security;
alter table public.contenido_campos     enable row level security;
alter table public.contenido_media      enable row level security;
alter table public.faq                  enable row level security;
alter table public.ajustes              enable row level security;
alter table public.enlaces_compartidos  enable row level security;
alter table public.enlace_productos     enable row level security;

-- ---------------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------------

create policy "perfiles: cada uno lee el suyo"
  on public.perfiles for select
  using (id = auth.uid());

create policy "perfiles: el admin lee todos"
  on public.perfiles for select
  using (public.es_admin());

create policy "perfiles: el admin gestiona"
  on public.perfiles for all
  using (public.es_admin())
  with check (public.es_admin());

-- ---------------------------------------------------------------------------
-- Catálogo — lectura pública de lo visible, escritura solo del staff
-- ---------------------------------------------------------------------------

create policy "categorias: lectura pública de las visibles"
  on public.categorias for select
  using (visible or public.es_staff());

create policy "categorias: el staff gestiona"
  on public.categorias for all
  using (public.es_staff())
  with check (public.es_staff());

create policy "categoria_fotos: lectura pública si la categoría es visible"
  on public.categoria_fotos for select
  using (
    public.es_staff()
    or exists (
      select 1 from public.categorias c
      where c.id = categoria_fotos.categoria_id and c.visible
    )
  );

create policy "categoria_fotos: el staff gestiona"
  on public.categoria_fotos for all
  using (public.es_staff())
  with check (public.es_staff());

create policy "productos: lectura pública de los visibles"
  on public.productos for select
  using (visible or public.es_staff());

create policy "productos: el staff gestiona"
  on public.productos for all
  using (public.es_staff())
  with check (public.es_staff());

create policy "producto_fotos: lectura pública si el producto es visible"
  on public.producto_fotos for select
  using (
    public.es_staff()
    or exists (
      select 1 from public.productos p
      where p.id = producto_fotos.producto_id and p.visible
    )
  );

create policy "producto_fotos: el staff gestiona"
  on public.producto_fotos for all
  using (public.es_staff())
  with check (public.es_staff());

-- ---------------------------------------------------------------------------
-- Clientes y pedidos — privados en su totalidad
--
-- Sin políticas para anon: el público no puede leer ni escribir estas tablas
-- de forma directa. Contienen datos personales (correo, teléfono, empresa).
-- ---------------------------------------------------------------------------

create policy "clientes: solo el staff"
  on public.clientes for all
  using (public.es_staff())
  with check (public.es_staff());

create policy "pedidos: solo el staff"
  on public.pedidos for all
  using (public.es_staff())
  with check (public.es_staff());

create policy "pedido_items: solo el staff"
  on public.pedido_items for all
  using (public.es_staff())
  with check (public.es_staff());

create policy "pedido_archivos: solo el staff"
  on public.pedido_archivos for all
  using (public.es_staff())
  with check (public.es_staff());

-- El historial lo escriben los triggers, no las personas: solo lectura.
create policy "pedido_eventos: el staff lee"
  on public.pedido_eventos for select
  using (public.es_staff());

-- ---------------------------------------------------------------------------
-- Contenido del sitio y FAQ — lectura pública
-- ---------------------------------------------------------------------------

create policy "contenido_bloques: lectura pública"
  on public.contenido_bloques for select
  using (true);

create policy "contenido_bloques: el staff gestiona"
  on public.contenido_bloques for all
  using (public.es_staff())
  with check (public.es_staff());

create policy "contenido_campos: lectura pública"
  on public.contenido_campos for select
  using (true);

create policy "contenido_campos: el staff gestiona"
  on public.contenido_campos for all
  using (public.es_staff())
  with check (public.es_staff());

create policy "contenido_media: lectura pública"
  on public.contenido_media for select
  using (true);

create policy "contenido_media: el staff gestiona"
  on public.contenido_media for all
  using (public.es_staff())
  with check (public.es_staff());

create policy "faq: lectura pública de las visibles"
  on public.faq for select
  using (visible or public.es_staff());

create policy "faq: el staff gestiona"
  on public.faq for all
  using (public.es_staff())
  with check (public.es_staff());

-- ---------------------------------------------------------------------------
-- Ajustes — el público solo ve los marcados como públicos
--
-- Importante: el flag `publico` es lo que separa el teléfono del pie de página
-- (público) de la lista de correos que reciben los avisos (privado).
-- ---------------------------------------------------------------------------

create policy "ajustes: lectura pública de los marcados como públicos"
  on public.ajustes for select
  using (publico or public.es_staff());

create policy "ajustes: el staff gestiona"
  on public.ajustes for all
  using (public.es_staff())
  with check (public.es_staff());

-- ---------------------------------------------------------------------------
-- Enlaces compartidos
--
-- El enlace se resuelve por token desde el servidor, no consultando la tabla
-- con la clave anon: por eso aquí solo hay políticas de staff.
-- ---------------------------------------------------------------------------

create policy "enlaces_compartidos: solo el staff"
  on public.enlaces_compartidos for all
  using (public.es_staff())
  with check (public.es_staff());

create policy "enlace_productos: solo el staff"
  on public.enlace_productos for all
  using (public.es_staff())
  with check (public.es_staff());

-- ===========================================================================
-- Única vía de escritura pública: el formulario de cotización
--
-- SECURITY DEFINER, así que se salta RLS — pero solo puede hacer lo que el
-- cuerpo de la función permite. El cliente no elige el estado, ni la
-- referencia, ni el precio: esos los fija NYX desde el panel.
-- ===========================================================================

create or replace function public.crear_solicitud(
  p_nombre          text,
  p_email           text,
  p_items           jsonb,
  p_telefono        text default null,
  p_empresa         text default null,
  p_fecha_requerida date default null,
  p_metodo_entrega  public.metodo_entrega default null,
  p_observaciones   text default null
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

  return v_ref;
end;
$$;

-- El formulario público la llama con la clave anon; el panel, autenticado.
revoke all on function public.crear_solicitud(
  text, text, jsonb, text, text, date, public.metodo_entrega, text
) from public;

grant execute on function public.crear_solicitud(
  text, text, jsonb, text, text, date, public.metodo_entrega, text
) to anon, authenticated;
