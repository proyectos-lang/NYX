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

create type nyx.mapeo_uv as enum ('original', 'proyeccion');

-- ---------------------------------------------------------------------------
-- Modelos 3D
-- ---------------------------------------------------------------------------

create table nyx.modelos_3d (
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

create index modelos_3d_visible_idx  on nyx.modelos_3d (visible, orden);
create index modelos_3d_producto_idx on nyx.modelos_3d (producto_id);

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

create table nyx.disenos (
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

create index disenos_token_idx  on nyx.disenos (token);
create index disenos_pedido_idx on nyx.disenos (pedido_id);

create trigger disenos_actualizado_en
  before update on nyx.disenos
  for each row execute function nyx.tocar_actualizado_en();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table nyx.modelos_3d enable row level security;
alter table nyx.disenos    enable row level security;

create policy "modelos_3d: lectura pública de los visibles"
  on nyx.modelos_3d for select
  using (visible or nyx.es_staff());

create policy "modelos_3d: el staff gestiona"
  on nyx.modelos_3d for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

-- Sin políticas para anon: un diseño puede llevar el logotipo sin publicar de
-- una empresa. Se accede solo por token, vía las funciones de abajo.
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

create policy "storage: lectura pública de disenos y modelos"
  on storage.objects for select
  using (bucket_id in ('disenos', 'modelos'));

create policy "storage: subida anónima de capas del estudio"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'disenos'
    and (storage.foldername(name))[1] = 'capas'
  );

create policy "storage: el staff gestiona disenos y modelos"
  on storage.objects for all
  using (bucket_id in ('disenos', 'modelos') and nyx.es_staff())
  with check (bucket_id in ('disenos', 'modelos') and nyx.es_staff());
