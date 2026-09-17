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

create policy "storage: lectura pública de productos y contenido"
  on storage.objects for select
  using (bucket_id in ('productos', 'contenido'));

create policy "storage: el staff gestiona productos y contenido"
  on storage.objects for all
  using (bucket_id in ('productos', 'contenido') and public.es_staff())
  with check (bucket_id in ('productos', 'contenido') and public.es_staff());

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

create policy "storage: subida anónima a pedidos/entrantes"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'pedidos'
    and (storage.foldername(name))[1] = 'entrantes'
  );

create policy "storage: el staff gestiona pedidos"
  on storage.objects for all
  using (bucket_id = 'pedidos' and public.es_staff())
  with check (bucket_id = 'pedidos' and public.es_staff());
