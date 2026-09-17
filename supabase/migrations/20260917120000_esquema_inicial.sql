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
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

-- Estados del pedido, en el mismo orden en que avanzan en el panel.
create type public.estado_pedido as enum (
  'nuevo',
  'en_revision',
  'en_produccion',
  'entregado',
  'cancelado'
);

create type public.tipo_producto as enum (
  'personalizable',
  'entrega_inmediata'
);

create type public.metodo_entrega as enum (
  'envio_nacional',
  'retiro_taller',
  'entrega_local'
);

create type public.rol_usuario as enum (
  'admin',
  'editor'
);

create type public.tipo_media as enum (
  'imagen',
  'video'
);

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

-- Mantiene actualizado_en en cada UPDATE. Se engancha más abajo tabla por tabla.
create or replace function public.tocar_actualizado_en()
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

create table public.perfiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  nombre         text,
  rol            public.rol_usuario not null default 'editor',
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create trigger perfiles_actualizado_en
  before update on public.perfiles
  for each row execute function public.tocar_actualizado_en();

-- Crea el perfil automáticamente al registrar un usuario en Auth.
create or replace function public.crear_perfil_para_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger crear_perfil_al_registrar
  after insert on auth.users
  for each row execute function public.crear_perfil_para_usuario();

-- Helpers usados por las políticas RLS.
-- SECURITY DEFINER a propósito: consultan perfiles sin pasar por RLS y así
-- evitan la recursión infinita de una política que se consulta a sí misma.
create or replace function public.es_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.perfiles p where p.id = auth.uid());
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = auth.uid() and p.rol = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------

create table public.categorias (
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

create index categorias_orden_idx on public.categorias (orden) where visible;

create trigger categorias_actualizado_en
  before update on public.categorias
  for each row execute function public.tocar_actualizado_en();

-- Fotos adicionales de la categoría (el panel permite varias por categoría).
create table public.categoria_fotos (
  id           uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias (id) on delete cascade,
  url          text not null,
  alt          text,
  orden        integer not null default 0,
  creado_en    timestamptz not null default now()
);

create index categoria_fotos_categoria_idx on public.categoria_fotos (categoria_id, orden);

create table public.productos (
  id                uuid primary key default gen_random_uuid(),
  sku               text not null unique,
  slug              text not null unique,
  nombre_es         text not null,
  nombre_en         text,
  categoria_id      uuid references public.categorias (id) on delete set null,
  descripcion_es    text,
  descripcion_en    text,
  -- Precio de referencia: la web lo muestra como orientativo y NYX confirma el
  -- valor final según cantidad, material y acabado.
  precio_referencia numeric(10, 2) check (precio_referencia >= 0),
  moneda            text not null default 'USD',
  tipo              public.tipo_producto not null default 'personalizable',
  stock             integer check (stock >= 0),
  bajo_pedido       boolean not null default false,
  -- El interruptor del panel: controla si el producto se ve en la web.
  visible           boolean not null default true,
  orden             integer not null default 0,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now()
);

create index productos_categoria_idx on public.productos (categoria_id);
create index productos_visible_idx   on public.productos (visible, orden);
create index productos_tipo_idx      on public.productos (tipo);

create trigger productos_actualizado_en
  before update on public.productos
  for each row execute function public.tocar_actualizado_en();

create table public.producto_fotos (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id) on delete cascade,
  url         text not null,
  alt         text,
  orden       integer not null default 0,
  es_portada  boolean not null default false,
  creado_en   timestamptz not null default now()
);

create index producto_fotos_producto_idx on public.producto_fotos (producto_id, orden);

-- Una sola portada por producto.
create unique index producto_fotos_portada_idx
  on public.producto_fotos (producto_id) where es_portada;

-- ---------------------------------------------------------------------------
-- Clientes y pedidos
--
-- "Pedido" aquí es lo que en la web es una solicitud de cotización: el cliente
-- la envía desde el formulario público y aparece en la bandeja del panel.
-- ---------------------------------------------------------------------------

create table public.clientes (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null,
  email     text,
  telefono  text,
  empresa   text,
  notas     text,
  creado_en timestamptz not null default now()
);

create unique index clientes_email_idx
  on public.clientes (lower(email)) where email is not null;

-- Referencias legibles tipo NYX-P-0149, continuando la numeración de la maqueta.
create sequence public.pedidos_ref_seq start with 149;

create table public.pedidos (
  id                uuid primary key default gen_random_uuid(),
  ref               text not null unique,
  cliente_id        uuid references public.clientes (id) on delete set null,
  estado            public.estado_pedido not null default 'nuevo',
  metodo_entrega    public.metodo_entrega,
  fecha_requerida   date,
  precio_referencia numeric(10, 2) check (precio_referencia >= 0),
  observaciones     text,
  origen            text not null default 'web',
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now()
);

create index pedidos_estado_idx  on public.pedidos (estado, creado_en desc);
create index pedidos_cliente_idx on public.pedidos (cliente_id);

create or replace function public.asignar_ref_pedido()
returns trigger
language plpgsql
as $$
begin
  if new.ref is null or new.ref = '' then
    new.ref := 'NYX-P-' || lpad(nextval('public.pedidos_ref_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger pedidos_ref
  before insert on public.pedidos
  for each row execute function public.asignar_ref_pedido();

create trigger pedidos_actualizado_en
  before update on public.pedidos
  for each row execute function public.tocar_actualizado_en();

create table public.pedido_items (
  id               uuid primary key default gen_random_uuid(),
  pedido_id        uuid not null references public.pedidos (id) on delete cascade,
  -- Nullable a propósito: el producto puede salir del catálogo sin que el
  -- pedido histórico pierda sentido, por eso se guarda también el nombre.
  producto_id      uuid references public.productos (id) on delete set null,
  nombre_producto  text not null,
  cantidad         integer not null check (cantidad > 0),
  especificaciones text,
  precio_unitario  numeric(10, 2) check (precio_unitario >= 0),
  creado_en        timestamptz not null default now()
);

create index pedido_items_pedido_idx on public.pedido_items (pedido_id);

-- Archivos que sube el cliente (logo, lista de nombres, manual de marca).
-- ruta_storage apunta al bucket privado 'pedidos'.
create table public.pedido_archivos (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references public.pedidos (id) on delete cascade,
  ruta_storage   text not null,
  nombre_archivo text not null,
  bytes          bigint check (bytes >= 0),
  mime           text,
  creado_en      timestamptz not null default now()
);

create index pedido_archivos_pedido_idx on public.pedido_archivos (pedido_id);

-- Historial de cambios de estado, para saber quién movió qué y cuándo.
create table public.pedido_eventos (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references public.pedidos (id) on delete cascade,
  estado_anterior public.estado_pedido,
  estado_nuevo    public.estado_pedido not null,
  usuario_id      uuid references public.perfiles (id) on delete set null,
  nota            text,
  creado_en       timestamptz not null default now()
);

create index pedido_eventos_pedido_idx on public.pedido_eventos (pedido_id, creado_en desc);

create or replace function public.registrar_cambio_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado is distinct from old.estado then
    insert into public.pedido_eventos (pedido_id, estado_anterior, estado_nuevo, usuario_id)
    values (new.id, old.estado, new.estado, auth.uid());
  end if;
  return new;
end;
$$;

create trigger pedidos_historial
  after update on public.pedidos
  for each row execute function public.registrar_cambio_estado();

-- ---------------------------------------------------------------------------
-- Contenido editable del sitio
--
-- La maqueta del panel bloquea el orden y el diseño de las secciones: solo se
-- editan textos e imágenes. Por eso el bloque es fijo (bloqueado = true) y lo
-- que varía son sus campos y su media.
-- ---------------------------------------------------------------------------

create table public.contenido_bloques (
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

create trigger contenido_bloques_actualizado_en
  before update on public.contenido_bloques
  for each row execute function public.tocar_actualizado_en();

create table public.contenido_campos (
  id             uuid primary key default gen_random_uuid(),
  bloque_id      uuid not null references public.contenido_bloques (id) on delete cascade,
  clave          text not null,
  etiqueta       text not null,
  valor_es       text,
  valor_en       text,
  multilinea     boolean not null default false,
  orden          integer not null default 0,
  actualizado_en timestamptz not null default now(),
  unique (bloque_id, clave)
);

create index contenido_campos_bloque_idx on public.contenido_campos (bloque_id, orden);

create trigger contenido_campos_actualizado_en
  before update on public.contenido_campos
  for each row execute function public.tocar_actualizado_en();

create table public.contenido_media (
  id        uuid primary key default gen_random_uuid(),
  bloque_id uuid not null references public.contenido_bloques (id) on delete cascade,
  url       text not null,
  tipo      public.tipo_media not null default 'imagen',
  alt       text,
  orden     integer not null default 0,
  creado_en timestamptz not null default now()
);

create index contenido_media_bloque_idx on public.contenido_media (bloque_id, orden);

create table public.faq (
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

create index faq_orden_idx on public.faq (orden) where visible;

create trigger faq_actualizado_en
  before update on public.faq
  for each row execute function public.tocar_actualizado_en();

-- ---------------------------------------------------------------------------
-- Ajustes
--
-- Clave/valor en jsonb: contacto del pie de página, destinatarios de avisos,
-- redes sociales. Evita una migración cada vez que se añade un ajuste.
-- ---------------------------------------------------------------------------

create table public.ajustes (
  clave          text primary key,
  valor          jsonb not null default '{}'::jsonb,
  descripcion    text,
  -- Los ajustes públicos (contacto, redes) los lee la web sin autenticar.
  -- Los privados (notificaciones) solo el panel.
  publico        boolean not null default false,
  actualizado_en timestamptz not null default now()
);

create trigger ajustes_actualizado_en
  before update on public.ajustes
  for each row execute function public.tocar_actualizado_en();

-- ---------------------------------------------------------------------------
-- Enlaces compartidos
--
-- El panel permite seleccionar productos y generar un enlace temporal, con o
-- sin precios, para enviárselo a un cliente.
-- ---------------------------------------------------------------------------

create table public.enlaces_compartidos (
  id              uuid primary key default gen_random_uuid(),
  token           text not null unique default encode(gen_random_bytes(12), 'hex'),
  titulo          text,
  mostrar_precios boolean not null default true,
  permite_cotizar boolean not null default true,
  expira_en       timestamptz,
  visitas         integer not null default 0,
  creado_por      uuid references public.perfiles (id) on delete set null,
  creado_en       timestamptz not null default now()
);

create index enlaces_compartidos_token_idx on public.enlaces_compartidos (token);

create table public.enlace_productos (
  enlace_id   uuid not null references public.enlaces_compartidos (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete cascade,
  orden       integer not null default 0,
  primary key (enlace_id, producto_id)
);
