-- ===========================================================================
-- NYX — instalacion completa del esquema
--
-- GENERADO. No editar a mano: sale de supabase/migrations/ con
--     npm run sql:instalacion
--
-- Como se usa:
--   1. Pega este archivo entero en el SQL Editor de Supabase y ejecutalo.
--   2. Anade "nyx" en Project Settings -> API -> Exposed schemas. Ese paso no
--      se puede hacer desde SQL, y sin el la API responde 404 a todo.
--   3. Crea tu usuario con supabase/crear-admin.sql.
--
-- Se puede ejecutar varias veces sin romper nada: si una tabla, tipo, indice,
-- trigger o politica ya existe, se salta o se reemplaza. Util cuando no se
-- sabe cuanto se aplico antes.
--
-- Lo que NO hace: borrar datos. Para empezar de cero, antes de esto:
--     drop schema if exists nyx cascade;
--
-- Contiene 5 migraciones:
--   · 20260917120000_esquema_inicial.sql
--   · 20260917120100_rls_y_politicas.sql
--   · 20260917120200_storage.sql
--   · 20260917120300_solicitud_con_archivos.sql
--   · 20260918100000_estudio_3d.sql
-- ===========================================================================


-- ###########################################################################
-- 20260917120000_esquema_inicial.sql
-- ###########################################################################

-- ===========================================================================
-- NYX — esquema inicial
--
-- Modela lo que hoy está simulado con datos fijos en las maquetas:
--   · Sitio público  (NYX Web.dc.html)   -> catálogo, contenido, FAQ, cotización
--   · Panel privado  (NYX Panel.dc.html) -> pedidos, catálogo, categorías,
--                                           contenido, preguntas, ajustes
--
-- Nomenclatura en español para que coincida con el dominio del negocio.
-- Las políticas RLS van en la migración siguiente.
--
-- Todo vive en el esquema `nyx`, no en `public`. En minúscula a propósito:
-- Postgres pliega a minúsculas los identificadores sin comillas, así que un
-- esquema llamado "NYX" obligaría a entrecomillarlo en cada consulta, cada
-- política y cada función. Con `nyx` se escribe igual en todas partes.
-- ===========================================================================

create schema if not exists nyx;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

-- Estados del pedido, en el mismo orden en que avanzan en el panel.
do $tipo$
begin
  create type nyx.estado_pedido as enum (
  'nuevo',
  'en_revision',
  'en_produccion',
  'entregado',
  'cancelado'
);
exception when duplicate_object then null;
end $tipo$;

do $tipo$
begin
  create type nyx.tipo_producto as enum (
  'personalizable',
  'entrega_inmediata'
);
exception when duplicate_object then null;
end $tipo$;

do $tipo$
begin
  create type nyx.metodo_entrega as enum (
  'envio_nacional',
  'retiro_taller',
  'entrega_local'
);
exception when duplicate_object then null;
end $tipo$;

do $tipo$
begin
  create type nyx.rol_usuario as enum (
  'admin',
  'editor'
);
exception when duplicate_object then null;
end $tipo$;

do $tipo$
begin
  create type nyx.tipo_media as enum (
  'imagen',
  'video'
);
exception when duplicate_object then null;
end $tipo$;

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

-- Mantiene actualizado_en en cada UPDATE. Se engancha más abajo tabla por tabla.
create or replace function nyx.tocar_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Usuarios del panel
--
-- auth.users la gestiona Supabase Auth. perfiles añade el rol propio de NYX.
-- Estar en perfiles es lo que da acceso al panel; el rol distingue quién puede
-- gestionar a los demás usuarios.
-- ---------------------------------------------------------------------------

create table if not exists nyx.perfiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  nombre         text,
  rol            nyx.rol_usuario not null default 'editor',
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

drop trigger if exists perfiles_actualizado_en on nyx.perfiles;
create trigger perfiles_actualizado_en
  before update on nyx.perfiles
  for each row execute function nyx.tocar_actualizado_en();

-- Crea el perfil automáticamente al registrar un usuario en Auth.
create or replace function nyx.crear_perfil_para_usuario()
returns trigger
language plpgsql
security definer
set search_path = nyx, public, extensions
as $$
begin
  insert into nyx.perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists crear_perfil_al_registrar on auth.users;
create trigger crear_perfil_al_registrar
  after insert on auth.users
  for each row execute function nyx.crear_perfil_para_usuario();

-- Helpers usados por las políticas RLS.
-- SECURITY DEFINER a propósito: consultan perfiles sin pasar por RLS y así
-- evitan la recursión infinita de una política que se consulta a sí misma.
create or replace function nyx.es_staff()
returns boolean
language sql
stable
security definer
set search_path = nyx, public, extensions
as $$
  select exists (select 1 from nyx.perfiles p where p.id = auth.uid());
$$;

create or replace function nyx.es_admin()
returns boolean
language sql
stable
security definer
set search_path = nyx, public, extensions
as $$
  select exists (
    select 1 from nyx.perfiles p
    where p.id = auth.uid() and p.rol = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------

create table if not exists nyx.categorias (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  nombre_es      text not null,
  nombre_en      text,
  descripcion_es text,
  descripcion_en text,
  imagen_portada text,
  orden          integer not null default 0,
  visible        boolean not null default true,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists categorias_orden_idx on nyx.categorias (orden) where visible;

drop trigger if exists categorias_actualizado_en on nyx.categorias;
create trigger categorias_actualizado_en
  before update on nyx.categorias
  for each row execute function nyx.tocar_actualizado_en();

-- Fotos adicionales de la categoría (el panel permite varias por categoría).
create table if not exists nyx.categoria_fotos (
  id           uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references nyx.categorias (id) on delete cascade,
  url          text not null,
  alt          text,
  orden        integer not null default 0,
  creado_en    timestamptz not null default now()
);

create index if not exists categoria_fotos_categoria_idx on nyx.categoria_fotos (categoria_id, orden);

create table if not exists nyx.productos (
  id                uuid primary key default gen_random_uuid(),
  sku               text not null unique,
  slug              text not null unique,
  nombre_es         text not null,
  nombre_en         text,
  categoria_id      uuid references nyx.categorias (id) on delete set null,
  descripcion_es    text,
  descripcion_en    text,
  -- Precio de referencia: la web lo muestra como orientativo y NYX confirma el
  -- valor final según cantidad, material y acabado.
  precio_referencia numeric(10, 2) check (precio_referencia >= 0),
  moneda            text not null default 'USD',
  tipo              nyx.tipo_producto not null default 'personalizable',
  stock             integer check (stock >= 0),
  bajo_pedido       boolean not null default false,
  -- El interruptor del panel: controla si el producto se ve en la web.
  visible           boolean not null default true,
  orden             integer not null default 0,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now()
);

create index if not exists productos_categoria_idx on nyx.productos (categoria_id);
create index if not exists productos_visible_idx   on nyx.productos (visible, orden);
create index if not exists productos_tipo_idx      on nyx.productos (tipo);

drop trigger if exists productos_actualizado_en on nyx.productos;
create trigger productos_actualizado_en
  before update on nyx.productos
  for each row execute function nyx.tocar_actualizado_en();

create table if not exists nyx.producto_fotos (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references nyx.productos (id) on delete cascade,
  url         text not null,
  alt         text,
  orden       integer not null default 0,
  es_portada  boolean not null default false,
  creado_en   timestamptz not null default now()
);

create index if not exists producto_fotos_producto_idx on nyx.producto_fotos (producto_id, orden);

-- Una sola portada por producto.
create unique index if not exists producto_fotos_portada_idx
  on nyx.producto_fotos (producto_id) where es_portada;

-- ---------------------------------------------------------------------------
-- Clientes y pedidos
--
-- "Pedido" aquí es lo que en la web es una solicitud de cotización: el cliente
-- la envía desde el formulario público y aparece en la bandeja del panel.
-- ---------------------------------------------------------------------------

create table if not exists nyx.clientes (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null,
  email     text,
  telefono  text,
  empresa   text,
  notas     text,
  creado_en timestamptz not null default now()
);

create unique index if not exists clientes_email_idx
  on nyx.clientes (lower(email)) where email is not null;

-- Referencias legibles tipo NYX-P-0149, continuando la numeración de la maqueta.
create sequence if not exists nyx.pedidos_ref_seq start with 149;

create table if not exists nyx.pedidos (
  id                uuid primary key default gen_random_uuid(),
  ref               text not null unique,
  cliente_id        uuid references nyx.clientes (id) on delete set null,
  estado            nyx.estado_pedido not null default 'nuevo',
  metodo_entrega    nyx.metodo_entrega,
  fecha_requerida   date,
  precio_referencia numeric(10, 2) check (precio_referencia >= 0),
  observaciones     text,
  origen            text not null default 'web',
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now()
);

create index if not exists pedidos_estado_idx  on nyx.pedidos (estado, creado_en desc);
create index if not exists pedidos_cliente_idx on nyx.pedidos (cliente_id);

create or replace function nyx.asignar_ref_pedido()
returns trigger
language plpgsql
as $$
begin
  if new.ref is null or new.ref = '' then
    new.ref := 'NYX-P-' || lpad(nextval('nyx.pedidos_ref_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists pedidos_ref on nyx.pedidos;
create trigger pedidos_ref
  before insert on nyx.pedidos
  for each row execute function nyx.asignar_ref_pedido();

drop trigger if exists pedidos_actualizado_en on nyx.pedidos;
create trigger pedidos_actualizado_en
  before update on nyx.pedidos
  for each row execute function nyx.tocar_actualizado_en();

create table if not exists nyx.pedido_items (
  id               uuid primary key default gen_random_uuid(),
  pedido_id        uuid not null references nyx.pedidos (id) on delete cascade,
  -- Nullable a propósito: el producto puede salir del catálogo sin que el
  -- pedido histórico pierda sentido, por eso se guarda también el nombre.
  producto_id      uuid references nyx.productos (id) on delete set null,
  nombre_producto  text not null,
  cantidad         integer not null check (cantidad > 0),
  especificaciones text,
  precio_unitario  numeric(10, 2) check (precio_unitario >= 0),
  creado_en        timestamptz not null default now()
);

create index if not exists pedido_items_pedido_idx on nyx.pedido_items (pedido_id);

-- Archivos que sube el cliente (logo, lista de nombres, manual de marca).
-- ruta_storage apunta al bucket privado 'pedidos'.
create table if not exists nyx.pedido_archivos (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references nyx.pedidos (id) on delete cascade,
  ruta_storage   text not null,
  nombre_archivo text not null,
  bytes          bigint check (bytes >= 0),
  mime           text,
  creado_en      timestamptz not null default now()
);

create index if not exists pedido_archivos_pedido_idx on nyx.pedido_archivos (pedido_id);

-- Historial de cambios de estado, para saber quién movió qué y cuándo.
create table if not exists nyx.pedido_eventos (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references nyx.pedidos (id) on delete cascade,
  estado_anterior nyx.estado_pedido,
  estado_nuevo    nyx.estado_pedido not null,
  usuario_id      uuid references nyx.perfiles (id) on delete set null,
  nota            text,
  creado_en       timestamptz not null default now()
);

create index if not exists pedido_eventos_pedido_idx on nyx.pedido_eventos (pedido_id, creado_en desc);

create or replace function nyx.registrar_cambio_estado()
returns trigger
language plpgsql
security definer
set search_path = nyx, public, extensions
as $$
begin
  if new.estado is distinct from old.estado then
    insert into nyx.pedido_eventos (pedido_id, estado_anterior, estado_nuevo, usuario_id)
    values (new.id, old.estado, new.estado, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists pedidos_historial on nyx.pedidos;
create trigger pedidos_historial
  after update on nyx.pedidos
  for each row execute function nyx.registrar_cambio_estado();

-- ---------------------------------------------------------------------------
-- Contenido editable del sitio
--
-- La maqueta del panel bloquea el orden y el diseño de las secciones: solo se
-- editan textos e imágenes. Por eso el bloque es fijo (bloqueado = true) y lo
-- que varía son sus campos y su media.
-- ---------------------------------------------------------------------------

create table if not exists nyx.contenido_bloques (
  id             uuid primary key default gen_random_uuid(),
  clave          text not null unique,
  seccion        text not null,
  titulo         text not null,
  nota           text,
  bloqueado      boolean not null default true,
  orden          integer not null default 0,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

drop trigger if exists contenido_bloques_actualizado_en on nyx.contenido_bloques;
create trigger contenido_bloques_actualizado_en
  before update on nyx.contenido_bloques
  for each row execute function nyx.tocar_actualizado_en();

create table if not exists nyx.contenido_campos (
  id             uuid primary key default gen_random_uuid(),
  bloque_id      uuid not null references nyx.contenido_bloques (id) on delete cascade,
  clave          text not null,
  etiqueta       text not null,
  valor_es       text,
  valor_en       text,
  multilinea     boolean not null default false,
  orden          integer not null default 0,
  actualizado_en timestamptz not null default now(),
  unique (bloque_id, clave)
);

create index if not exists contenido_campos_bloque_idx on nyx.contenido_campos (bloque_id, orden);

drop trigger if exists contenido_campos_actualizado_en on nyx.contenido_campos;
create trigger contenido_campos_actualizado_en
  before update on nyx.contenido_campos
  for each row execute function nyx.tocar_actualizado_en();

create table if not exists nyx.contenido_media (
  id        uuid primary key default gen_random_uuid(),
  bloque_id uuid not null references nyx.contenido_bloques (id) on delete cascade,
  url       text not null,
  tipo      nyx.tipo_media not null default 'imagen',
  alt       text,
  orden     integer not null default 0,
  creado_en timestamptz not null default now()
);

create index if not exists contenido_media_bloque_idx on nyx.contenido_media (bloque_id, orden);

create table if not exists nyx.faq (
  id             uuid primary key default gen_random_uuid(),
  pregunta_es    text not null,
  respuesta_es   text not null,
  pregunta_en    text,
  respuesta_en   text,
  orden          integer not null default 0,
  visible        boolean not null default true,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists faq_orden_idx on nyx.faq (orden) where visible;

drop trigger if exists faq_actualizado_en on nyx.faq;
create trigger faq_actualizado_en
  before update on nyx.faq
  for each row execute function nyx.tocar_actualizado_en();

-- ---------------------------------------------------------------------------
-- Ajustes
--
-- Clave/valor en jsonb: contacto del pie de página, destinatarios de avisos,
-- redes sociales. Evita una migración cada vez que se añade un ajuste.
-- ---------------------------------------------------------------------------

create table if not exists nyx.ajustes (
  clave          text primary key,
  valor          jsonb not null default '{}'::jsonb,
  descripcion    text,
  -- Los ajustes públicos (contacto, redes) los lee la web sin autenticar.
  -- Los privados (notificaciones) solo el panel.
  publico        boolean not null default false,
  actualizado_en timestamptz not null default now()
);

drop trigger if exists ajustes_actualizado_en on nyx.ajustes;
create trigger ajustes_actualizado_en
  before update on nyx.ajustes
  for each row execute function nyx.tocar_actualizado_en();

-- ---------------------------------------------------------------------------
-- Enlaces compartidos
--
-- El panel permite seleccionar productos y generar un enlace temporal, con o
-- sin precios, para enviárselo a un cliente.
-- ---------------------------------------------------------------------------

create table if not exists nyx.enlaces_compartidos (
  id              uuid primary key default gen_random_uuid(),
  token           text not null unique default encode(gen_random_bytes(12), 'hex'),
  titulo          text,
  mostrar_precios boolean not null default true,
  permite_cotizar boolean not null default true,
  expira_en       timestamptz,
  visitas         integer not null default 0,
  creado_por      uuid references nyx.perfiles (id) on delete set null,
  creado_en       timestamptz not null default now()
);

create index if not exists enlaces_compartidos_token_idx on nyx.enlaces_compartidos (token);

create table if not exists nyx.enlace_productos (
  enlace_id   uuid not null references nyx.enlaces_compartidos (id) on delete cascade,
  producto_id uuid not null references nyx.productos (id) on delete cascade,
  orden       integer not null default 0,
  primary key (enlace_id, producto_id)
);

-- ---------------------------------------------------------------------------
-- Permisos del esquema
--
-- Supabase concede estos privilegios automaticamente en `public`, pero no en
-- un esquema propio: hay que hacerlo a mano o PostgREST responde 404 a todo.
--
-- Conceder ALL a anon parece excesivo y no lo es: sin el GRANT, Postgres corta
-- antes de llegar a evaluar las politicas RLS, asi que ni siquiera se
-- consultarian. Quien decide de verdad que puede ver o tocar cada rol son las
-- politicas de la migracion siguiente, no estos permisos.
--
-- Falta ademas un paso que no se puede hacer desde SQL: anadir `nyx` a
-- Settings -> API -> Exposed schemas en el panel de Supabase. Sin eso la API
-- no expone el esquema por mucho permiso que tenga.
-- ---------------------------------------------------------------------------

grant usage on schema nyx to anon, authenticated, service_role;

grant all on all tables    in schema nyx to anon, authenticated, service_role;
grant all on all sequences in schema nyx to anon, authenticated, service_role;
grant all on all routines  in schema nyx to anon, authenticated, service_role;

-- Para que las tablas que se creen mas adelante hereden lo mismo y no haya que
-- acordarse de repetir el GRANT en cada migracion.
alter default privileges in schema nyx
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema nyx
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema nyx
  grant all on routines to anon, authenticated, service_role;


-- ###########################################################################
-- 20260917120100_rls_y_politicas.sql
-- ###########################################################################

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

drop policy if exists "perfiles: cada uno lee el suyo" on nyx.perfiles;
create policy "perfiles: cada uno lee el suyo"
  on nyx.perfiles for select
  using (id = auth.uid());

drop policy if exists "perfiles: el admin lee todos" on nyx.perfiles;
create policy "perfiles: el admin lee todos"
  on nyx.perfiles for select
  using (nyx.es_admin());

drop policy if exists "perfiles: el admin gestiona" on nyx.perfiles;
create policy "perfiles: el admin gestiona"
  on nyx.perfiles for all
  using (nyx.es_admin())
  with check (nyx.es_admin());

-- ---------------------------------------------------------------------------
-- Catálogo — lectura pública de lo visible, escritura solo del staff
-- ---------------------------------------------------------------------------

drop policy if exists "categorias: lectura pública de las visibles" on nyx.categorias;
create policy "categorias: lectura pública de las visibles"
  on nyx.categorias for select
  using (visible or nyx.es_staff());

drop policy if exists "categorias: el staff gestiona" on nyx.categorias;
create policy "categorias: el staff gestiona"
  on nyx.categorias for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

drop policy if exists "categoria_fotos: lectura pública si la categoría es visible" on nyx.categoria_fotos;
create policy "categoria_fotos: lectura pública si la categoría es visible"
  on nyx.categoria_fotos for select
  using (
    nyx.es_staff()
    or exists (
      select 1 from nyx.categorias c
      where c.id = categoria_fotos.categoria_id and c.visible
    )
  );

drop policy if exists "categoria_fotos: el staff gestiona" on nyx.categoria_fotos;
create policy "categoria_fotos: el staff gestiona"
  on nyx.categoria_fotos for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

drop policy if exists "productos: lectura pública de los visibles" on nyx.productos;
create policy "productos: lectura pública de los visibles"
  on nyx.productos for select
  using (visible or nyx.es_staff());

drop policy if exists "productos: el staff gestiona" on nyx.productos;
create policy "productos: el staff gestiona"
  on nyx.productos for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

drop policy if exists "producto_fotos: lectura pública si el producto es visible" on nyx.producto_fotos;
create policy "producto_fotos: lectura pública si el producto es visible"
  on nyx.producto_fotos for select
  using (
    nyx.es_staff()
    or exists (
      select 1 from nyx.productos p
      where p.id = producto_fotos.producto_id and p.visible
    )
  );

drop policy if exists "producto_fotos: el staff gestiona" on nyx.producto_fotos;
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

drop policy if exists "clientes: solo el staff" on nyx.clientes;
create policy "clientes: solo el staff"
  on nyx.clientes for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

drop policy if exists "pedidos: solo el staff" on nyx.pedidos;
create policy "pedidos: solo el staff"
  on nyx.pedidos for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

drop policy if exists "pedido_items: solo el staff" on nyx.pedido_items;
create policy "pedido_items: solo el staff"
  on nyx.pedido_items for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

drop policy if exists "pedido_archivos: solo el staff" on nyx.pedido_archivos;
create policy "pedido_archivos: solo el staff"
  on nyx.pedido_archivos for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

-- El historial lo escriben los triggers, no las personas: solo lectura.
drop policy if exists "pedido_eventos: el staff lee" on nyx.pedido_eventos;
create policy "pedido_eventos: el staff lee"
  on nyx.pedido_eventos for select
  using (nyx.es_staff());

-- ---------------------------------------------------------------------------
-- Contenido del sitio y FAQ — lectura pública
-- ---------------------------------------------------------------------------

drop policy if exists "contenido_bloques: lectura pública" on nyx.contenido_bloques;
create policy "contenido_bloques: lectura pública"
  on nyx.contenido_bloques for select
  using (true);

drop policy if exists "contenido_bloques: el staff gestiona" on nyx.contenido_bloques;
create policy "contenido_bloques: el staff gestiona"
  on nyx.contenido_bloques for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

drop policy if exists "contenido_campos: lectura pública" on nyx.contenido_campos;
create policy "contenido_campos: lectura pública"
  on nyx.contenido_campos for select
  using (true);

drop policy if exists "contenido_campos: el staff gestiona" on nyx.contenido_campos;
create policy "contenido_campos: el staff gestiona"
  on nyx.contenido_campos for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

drop policy if exists "contenido_media: lectura pública" on nyx.contenido_media;
create policy "contenido_media: lectura pública"
  on nyx.contenido_media for select
  using (true);

drop policy if exists "contenido_media: el staff gestiona" on nyx.contenido_media;
create policy "contenido_media: el staff gestiona"
  on nyx.contenido_media for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

drop policy if exists "faq: lectura pública de las visibles" on nyx.faq;
create policy "faq: lectura pública de las visibles"
  on nyx.faq for select
  using (visible or nyx.es_staff());

drop policy if exists "faq: el staff gestiona" on nyx.faq;
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

drop policy if exists "ajustes: lectura pública de los marcados como públicos" on nyx.ajustes;
create policy "ajustes: lectura pública de los marcados como públicos"
  on nyx.ajustes for select
  using (publico or nyx.es_staff());

drop policy if exists "ajustes: el staff gestiona" on nyx.ajustes;
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

drop policy if exists "enlaces_compartidos: solo el staff" on nyx.enlaces_compartidos;
create policy "enlaces_compartidos: solo el staff"
  on nyx.enlaces_compartidos for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

drop policy if exists "enlace_productos: solo el staff" on nyx.enlace_productos;
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


-- ###########################################################################
-- 20260917120200_storage.sql
-- ###########################################################################

-- ===========================================================================
-- NYX — buckets de Storage
--
--   productos  (público)  fotos de producto y de categoría
--   contenido  (público)  imágenes y vídeo de los bloques del sitio
--   pedidos    (privado)  archivos que adjunta el cliente al cotizar
--
-- Los límites de tamaño y de tipo MIME se aplican en el propio bucket, así que
-- valen tanto para el panel como para cualquier subida desde la web.
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'productos', 'productos', true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contenido', 'contenido', true,
  41943040, -- 40 MB: el panel admite MP4 de proceso en este bloque
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pedidos', 'pedidos', false,
  20971520, -- 20 MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml',
    'application/pdf', 'application/postscript', 'application/illustrator',
    'text/plain', 'application/zip'
  ]
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Buckets públicos: cualquiera lee, solo el staff escribe
-- ---------------------------------------------------------------------------

drop policy if exists "storage: lectura pública de productos y contenido" on storage.objects;
create policy "storage: lectura pública de productos y contenido"
  on storage.objects for select
  using (bucket_id in ('productos', 'contenido'));

drop policy if exists "storage: el staff gestiona productos y contenido" on storage.objects;
create policy "storage: el staff gestiona productos y contenido"
  on storage.objects for all
  using (bucket_id in ('productos', 'contenido') and nyx.es_staff())
  with check (bucket_id in ('productos', 'contenido') and nyx.es_staff());

-- ---------------------------------------------------------------------------
-- Bucket privado de pedidos
--
-- El cliente puede DEJAR un archivo en pedidos/entrantes/... pero no listar ni
-- descargar nada: no hay política de select para anon. El panel accede a todo
-- y genera URLs firmadas cuando necesita mostrar el archivo.
--
-- Nota: esto deja una vía de subida anónima. El límite de tamaño y la lista de
-- MIME del bucket acotan el abuso, pero si el spam llega a ser un problema, lo
-- siguiente es mover la subida a URLs firmadas generadas en el servidor.
-- ---------------------------------------------------------------------------

drop policy if exists "storage: subida anónima a pedidos/entrantes" on storage.objects;
create policy "storage: subida anónima a pedidos/entrantes"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'pedidos'
    and (storage.foldername(name))[1] = 'entrantes'
  );

drop policy if exists "storage: el staff gestiona pedidos" on storage.objects;
create policy "storage: el staff gestiona pedidos"
  on storage.objects for all
  using (bucket_id = 'pedidos' and nyx.es_staff())
  with check (bucket_id = 'pedidos' and nyx.es_staff());


-- ###########################################################################
-- 20260917120300_solicitud_con_archivos.sql
-- ###########################################################################

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

drop function if exists nyx.crear_solicitud(
  text, text, jsonb, text, text, date, nyx.metodo_entrega, text
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
  p_archivos        jsonb default '[]'::jsonb
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

  return v_ref;
end;
$$;

revoke all on function nyx.crear_solicitud(
  text, text, jsonb, text, text, date, nyx.metodo_entrega, text, jsonb
) from public;

grant execute on function nyx.crear_solicitud(
  text, text, jsonb, text, text, date, nyx.metodo_entrega, text, jsonb
) to anon, authenticated;


-- ###########################################################################
-- 20260918100000_estudio_3d.sql
-- ###########################################################################

-- ===========================================================================
-- Estudio de diseño 3D
--
-- Dos tablas y un bucket:
--   · modelos_3d  los .glb de cada prenda, con lo que el visor necesita saber
--                 de ellos (mapeo, escala, centro) medido UNA vez al subirlos
--   · disenos     el documento de capas que arma el cliente
--
-- El diseño se guarda como documento JSON, no como imagen. Guardar solo el PNG
-- dejaría el trabajo imposible de retomar: no se podría mover un logo ni
-- cambiar un color sin rehacerlo entero.
-- ===========================================================================

do $tipo$
begin
  create type nyx.mapeo_uv as enum ('original', 'proyeccion');
exception when duplicate_object then null;
end $tipo$;

-- ---------------------------------------------------------------------------
-- Modelos 3D
-- ---------------------------------------------------------------------------

create table if not exists nyx.modelos_3d (
  id                   uuid primary key default gen_random_uuid(),
  nombre               text not null,
  slug                 text not null unique,
  archivo_url          text not null,
  producto_id          uuid references nyx.productos (id) on delete set null,

  -- Cómo mapear la textura. Lo decide el analizador al subir el archivo:
  -- si menos del 90% de las UVs cae en [0,1], las del .glb no sirven para
  -- colocar un diseño y hay que regenerarlas por proyección.
  mapeo                nyx.mapeo_uv not null default 'proyeccion',

  -- Medidas tomadas al subirlo, para no recalcularlas en cada carga. Los .glb
  -- vienen en las unidades con que se exportaron: uno real medía 68 de ancho y
  -- estaba centrado en Y=136, y con una cámara pensada para ~1 unidad la
  -- cámara queda DENTRO de la prenda.
  escala               numeric(12, 6) not null default 1 check (escala > 0),
  centro_x             numeric(12, 4) not null default 0,
  centro_y             numeric(12, 4) not null default 0,
  centro_z             numeric(12, 4) not null default 0,

  -- Materiales que no se pintan: cremalleras, botones, cordones.
  materiales_excluidos text[] not null default '{}',

  -- Diagnóstico del analizador, para poder explicar al usuario por qué su
  -- archivo salió como salió.
  uv_proporcion_dentro numeric(5, 4),
  uv_vertices          integer,

  visible              boolean not null default true,
  orden                integer not null default 0,
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now()
);

create index if not exists modelos_3d_visible_idx  on nyx.modelos_3d (visible, orden);
create index if not exists modelos_3d_producto_idx on nyx.modelos_3d (producto_id);

drop trigger if exists modelos_3d_actualizado_en on nyx.modelos_3d;
create trigger modelos_3d_actualizado_en
  before update on nyx.modelos_3d
  for each row execute function nyx.tocar_actualizado_en();

-- ---------------------------------------------------------------------------
-- Diseños
--
-- El cliente no tiene cuenta, así que el diseño se identifica por un token que
-- guarda su navegador. No hay políticas de lectura para anon: se accede por las
-- funciones del final, que exigen el token.
-- ---------------------------------------------------------------------------

create table if not exists nyx.disenos (
  id             uuid primary key default gen_random_uuid(),
  token          text not null unique default encode(gen_random_bytes(16), 'hex'),
  modelo_id      uuid references nyx.modelos_3d (id) on delete set null,

  -- El DisenoEstudio completo: caras, textura y logos.
  documento      jsonb not null,

  -- PNG exportado del visor, para enseñarlo en el panel junto al pedido.
  vista_previa   text,

  -- Se rellena si el diseño acaba adjuntándose a una solicitud.
  pedido_id      uuid references nyx.pedidos (id) on delete set null,

  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists disenos_token_idx  on nyx.disenos (token);
create index if not exists disenos_pedido_idx on nyx.disenos (pedido_id);

drop trigger if exists disenos_actualizado_en on nyx.disenos;
create trigger disenos_actualizado_en
  before update on nyx.disenos
  for each row execute function nyx.tocar_actualizado_en();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table nyx.modelos_3d enable row level security;
alter table nyx.disenos    enable row level security;

drop policy if exists "modelos_3d: lectura pública de los visibles" on nyx.modelos_3d;
create policy "modelos_3d: lectura pública de los visibles"
  on nyx.modelos_3d for select
  using (visible or nyx.es_staff());

drop policy if exists "modelos_3d: el staff gestiona" on nyx.modelos_3d;
create policy "modelos_3d: el staff gestiona"
  on nyx.modelos_3d for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

-- Sin políticas para anon: un diseño puede llevar el logotipo sin publicar de
-- una empresa. Se accede solo por token, vía las funciones de abajo.
drop policy if exists "disenos: solo el staff" on nyx.disenos;
create policy "disenos: solo el staff"
  on nyx.disenos for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

-- ---------------------------------------------------------------------------
-- Guardar y recuperar por token
--
-- SECURITY DEFINER, como crear_solicitud(): es la única vía por la que el
-- público escribe, y controla exactamente qué se puede tocar.
-- ---------------------------------------------------------------------------

create or replace function nyx.guardar_diseno(
  p_documento jsonb,
  p_token     text default null,
  p_modelo_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = nyx, public, extensions
as $$
declare
  v_token text;
begin
  if jsonb_typeof(p_documento) is distinct from 'object' then
    raise exception 'El diseño debe ser un objeto' using errcode = '22023';
  end if;

  -- Un documento de capas con imágenes ronda los pocos KB. Un megabyte
  -- significa que alguien está metiendo la imagen dentro del JSON.
  if pg_column_size(p_documento) > 1048576 then
    raise exception 'El diseño es demasiado grande' using errcode = '22023';
  end if;

  v_token := nullif(btrim(coalesce(p_token, '')), '');

  if v_token is not null then
    update nyx.disenos
       set documento = p_documento,
           modelo_id = coalesce(p_modelo_id, modelo_id)
     where token = v_token;

    -- Un token que no existe (o que caducó) no debe fallar en silencio:
    -- se crea uno nuevo y el cliente se queda con ese.
    if found then
      return v_token;
    end if;
  end if;

  insert into nyx.disenos (documento, modelo_id)
  values (p_documento, p_modelo_id)
  returning token into v_token;

  return v_token;
end;
$$;

create or replace function nyx.leer_diseno(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = nyx, public, extensions
as $$
declare
  v_documento jsonb;
begin
  -- Token corto o vacío: ni se consulta.
  if length(coalesce(p_token, '')) < 16 then
    return null;
  end if;

  select documento into v_documento
  from nyx.disenos
  where token = p_token;

  return v_documento;
end;
$$;

revoke all on function nyx.guardar_diseno(jsonb, text, uuid) from public;
revoke all on function nyx.leer_diseno(text) from public;

grant execute on function nyx.guardar_diseno(jsonb, text, uuid) to anon, authenticated;
grant execute on function nyx.leer_diseno(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Bucket de las capas del estudio
--
-- Público a propósito, y no por descuido: el visor carga estas imágenes en un
-- canvas con crossOrigin="anonymous". Si el host no responde con CORS, el
-- canvas queda "tainted" y tanto la textura del modelo como la exportación a
-- PNG dejan de funcionar. Una URL firmada y temporal tampoco valdría, porque
-- el documento guarda la ruta para siempre.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'disenos', 'disenos', true,
  8388608, -- 8 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

-- Los .glb los sube el staff, no el público: bucket aparte y sin subida anónima.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'modelos', 'modelos', true,
  52428800, -- 50 MB
  array['model/gltf-binary', 'model/gltf+json', 'application/octet-stream']
)
on conflict (id) do nothing;

drop policy if exists "storage: lectura pública de disenos y modelos" on storage.objects;
create policy "storage: lectura pública de disenos y modelos"
  on storage.objects for select
  using (bucket_id in ('disenos', 'modelos'));

drop policy if exists "storage: subida anónima de capas del estudio" on storage.objects;
create policy "storage: subida anónima de capas del estudio"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'disenos'
    and (storage.foldername(name))[1] = 'capas'
  );

drop policy if exists "storage: el staff gestiona disenos y modelos" on storage.objects;
create policy "storage: el staff gestiona disenos y modelos"
  on storage.objects for all
  using (bucket_id in ('disenos', 'modelos') and nyx.es_staff())
  with check (bucket_id in ('disenos', 'modelos') and nyx.es_staff());
