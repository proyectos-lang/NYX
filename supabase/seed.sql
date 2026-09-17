-- ===========================================================================
-- NYX — datos de demostración
--
-- Son exactamente los datos que hoy están escritos a mano dentro de las
-- maquetas, para que la base local reproduzca lo que ya se ve en pantalla.
-- Se cargan solos con `npm run db:reset` (nunca en producción).
--
-- Las rutas de imagen apuntan a /assets, igual que las maquetas. Cuando el
-- catálogo se gestione de verdad, pasarán a ser URLs del bucket 'productos'.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Categorías
-- ---------------------------------------------------------------------------

insert into public.categorias (slug, nombre_es, nombre_en, imagen_portada, orden) values
  ('camisas',            'Camisas',            'Shirts',             'assets/tee-oasis.jpeg',     1),
  ('buzos',              'Buzos',              'Hoodies',            'assets/hoodie-gray.jpeg',   2),
  ('termos-y-botellas',  'Termos y botellas',  'Tumblers & bottles', 'assets/bottle-create.jpeg', 3),
  ('gorras',             'Gorras',             'Caps',               'assets/cap-blue.jpeg',      4),
  ('tazas',              'Tazas',              'Mugs',               'assets/mug-photos.jpeg',    5),
  ('libretas-y-kits',    'Libretas y kits',    'Notebooks & kits',   'assets/kit-blue.jpeg',      6),
  ('pulseras',           'Pulseras',           'Wristbands',         'assets/prod/p012.jpg',      7),
  ('llaveros',           'Llaveros',           'Keychains',          'assets/prod/p009.jpg',      8);

-- ---------------------------------------------------------------------------
-- Productos
-- ---------------------------------------------------------------------------

insert into public.productos
  (sku, slug, nombre_es, nombre_en, categoria_id, precio_referencia, tipo, stock, bajo_pedido, orden)
select
  d.sku, d.slug, d.nombre_es, d.nombre_en,
  c.id, d.precio, d.tipo::public.tipo_producto, d.stock, d.bajo_pedido, d.orden
from (values
  ('NYX-001', 'camisa-oversize-nyx',     'Camisa oversize NYX',      'NYX oversize shirt',      'camisas',           13.40, 'personalizable',     24,  false, 1),
  ('NYX-002', 'buzo-con-capucha',        'Buzo con capucha',         'Hooded sweatshirt',       'buzos',             28.00, 'personalizable',   null,  true,  2),
  ('NYX-003', 'termo-signature-750',     'Termo Signature 750 ml',   'Signature tumbler 750ml', 'termos-y-botellas', 18.50, 'personalizable',     18,  false, 3),
  ('NYX-004', 'botella-pixel-500',       'Botella pixel 500 ml',     'Pixel bottle 500ml',      'termos-y-botellas', 11.20, 'entrega_inmediata',  32,  false, 4),
  ('NYX-005', 'taza-ceramica-con-nombre','Taza cerámica con nombre', 'Ceramic mug with name',   'tazas',              7.20, 'personalizable',     40,  false, 5),
  ('NYX-006', 'gorra-bordada',           'Gorra bordada',            'Embroidered cap',         'gorras',             8.40, 'entrega_inmediata',  14,  false, 6),
  ('NYX-007', 'libreta-ejecutiva-a5',    'Libreta ejecutiva A5',     'A5 executive notebook',   'libretas-y-kits',    9.20, 'personalizable',     26,  false, 7),
  ('NYX-008', 'pulsera-de-silicona',     'Pulsera de silicona',      'Silicone wristband',      'pulseras',           1.40, 'entrega_inmediata', 180,  false, 8)
) as d(sku, slug, nombre_es, nombre_en, cat_slug, precio, tipo, stock, bajo_pedido, orden)
join public.categorias c on c.slug = d.cat_slug;

insert into public.producto_fotos (producto_id, url, orden, es_portada)
select p.id, f.url, 0, true
from (values
  ('NYX-001', 'assets/prod/p001.jpg'),
  ('NYX-002', 'assets/prod/p002.jpg'),
  ('NYX-003', 'assets/prod/p003.jpg'),
  ('NYX-004', 'assets/prod/p005.jpg'),
  ('NYX-005', 'assets/prod/p007.jpg'),
  ('NYX-006', 'assets/prod/p008.jpg'),
  ('NYX-007', 'assets/prod/p010.jpg'),
  ('NYX-008', 'assets/prod/p012.jpg')
) as f(sku, url)
join public.productos p on p.sku = f.sku;

-- ---------------------------------------------------------------------------
-- Clientes y pedidos de la bandeja
-- ---------------------------------------------------------------------------

insert into public.clientes (nombre, email, telefono, empresa) values
  ('Distribuidora Andes',  'compras@andes.ec',           '+593 99 812 4410', 'Distribuidora Andes'),
  ('Camila Ríos',          'camila.rios@gmail.com',      '+593 98 220 7731', null),
  ('Colegio San Marcos',   'admin@sanmarcos.edu.ec',     '+593 2 244 8890',  'Colegio San Marcos'),
  ('Estudio Ferra',        'hola@estudioferra.com',      '+593 99 031 2288', 'Estudio Ferra'),
  ('Gimnasio Pulso',       'info@pulsogym.ec',           '+593 98 774 1203', 'Gimnasio Pulso'),
  ('Bodas Lía & Tomás',    'lia.tomas@gmail.com',        '+593 99 660 5512', null);

insert into public.pedidos
  (ref, cliente_id, estado, metodo_entrega, fecha_requerida, precio_referencia, observaciones, creado_en)
select
  d.ref, c.id, d.estado::public.estado_pedido, d.metodo::public.metodo_entrega,
  d.fecha::date, d.precio, d.obs, d.creado::timestamptz
from (values
  ('NYX-P-0148', 'compras@andes.ec',       'nuevo',          'envio_nacional', '2026-09-24', 18.50, 'Empaque individual con etiqueta.',              '2026-09-17 09:14'),
  ('NYX-P-0147', 'camila.rios@gmail.com',  'nuevo',          'retiro_taller',  '2026-09-21',  7.20, 'Un nombre por taza, tipografía script.',        '2026-09-17 08:02'),
  ('NYX-P-0146', 'admin@sanmarcos.edu.ec', 'en_revision',    'entrega_local',  '2026-10-02', 13.40, 'Escudo en pecho izquierdo, nombre atrás.',      '2026-09-16 17:40'),
  ('NYX-P-0145', 'hola@estudioferra.com',  'en_produccion',  'envio_nacional', '2026-09-19', 34.00, 'Caja negra con cinta dorada.',                  '2026-09-12 11:20'),
  ('NYX-P-0144', 'info@pulsogym.ec',       'en_produccion',  'retiro_taller',  '2026-09-18', 11.20, 'Grabado en una sola cara.',                     '2026-09-11 15:55'),
  ('NYX-P-0143', 'lia.tomas@gmail.com',    'entregado',      'entrega_local',  '2026-09-14',  1.40, 'Entregado el 13 de septiembre.',                '2026-09-08 10:05')
) as d(ref, email, estado, metodo, fecha, precio, obs, creado)
join public.clientes c on lower(c.email) = d.email;

insert into public.pedido_items
  (pedido_id, producto_id, nombre_producto, cantidad, especificaciones, precio_unitario)
select
  ped.id, prod.id, d.nombre, d.cantidad, d.specs, d.precio
from (values
  ('NYX-P-0148', 'NYX-003', 'Termo Signature 750 ml',    50, 'negro · logo frontal centrado',              18.50),
  ('NYX-P-0147', 'NYX-005', 'Taza cerámica con nombre',  12, 'interior azul · nombres individuales',        7.20),
  ('NYX-P-0146', 'NYX-001', 'Camisa oversize NYX',      120, 'blanco · tallas S a XL',                     13.40),
  ('NYX-P-0145', 'NYX-007', 'Kit corporativo',           30, 'libreta + termo + bolígrafo',                34.00),
  ('NYX-P-0144', 'NYX-004', 'Botella deportiva 500 ml',  80, 'azul · grabado láser',                       11.20),
  ('NYX-P-0143', 'NYX-008', 'Pulsera de silicona',      200, 'beige · texto grabado',                       1.40)
) as d(ref, sku, nombre, cantidad, specs, precio)
join public.pedidos   ped  on ped.ref  = d.ref
join public.productos prod on prod.sku = d.sku;

insert into public.pedido_archivos (pedido_id, ruta_storage, nombre_archivo, bytes, mime)
select ped.id, 'entrantes/' || lower(d.ref) || '/' || d.archivo, d.archivo, d.bytes, d.mime
from (values
  ('NYX-P-0148', 'logo-andes-vector.svg',  245760::bigint, 'image/svg+xml'),
  ('NYX-P-0147', 'nombres-lista.pdf',       90112::bigint, 'application/pdf'),
  ('NYX-P-0146', 'escudo-colegio.ai',     1887436::bigint, 'application/illustrator'),
  ('NYX-P-0145', 'kit-ferra-manual.pdf',  3565158::bigint, 'application/pdf'),
  ('NYX-P-0144', 'pulso-logo.png',         634880::bigint, 'image/png'),
  ('NYX-P-0143', 'texto-pulseras.txt',       2048::bigint, 'text/plain')
) as d(ref, archivo, bytes, mime)
join public.pedidos ped on ped.ref = d.ref;

-- La secuencia ya arranca en 149, así que el próximo pedido real será NYX-P-0149.

-- ---------------------------------------------------------------------------
-- Preguntas frecuentes
-- ---------------------------------------------------------------------------

insert into public.faq (pregunta_es, respuesta_es, pregunta_en, respuesta_en, orden) values
  ('¿Cuánto tarda un pedido?',
   'Entre 3 y 7 días hábiles según cantidad y complejidad. Los productos de entrega inmediata se retiran el mismo día.',
   'How long does an order take?',
   '3 to 7 business days depending on quantity and complexity. Ready-to-ship items can be picked up the same day.', 1),
  ('¿Cuál es la cantidad mínima?',
   'No hay mínimo para productos individuales. Para pedidos corporativos con diseño exclusivo el mínimo referencial es de 10 unidades.',
   'What is the minimum quantity?',
   'No minimum for individual products. Corporate orders with exclusive artwork start at 10 units.', 2),
  ('¿Puedo enviar mi propio diseño?',
   'Sí. PNG, JPG, PDF, AI o SVG. Recomendamos alta resolución o vectores.',
   'Can I send my own design?',
   'Yes. PNG, JPG, PDF, AI or SVG. High resolution or vectors recommended.', 3),
  ('¿Realizan pedidos empresariales?',
   'Sí, kits corporativos, uniformes, reconocimientos y artículos para eventos con cotización dedicada.',
   'Do you handle corporate orders?',
   'Yes — corporate kits, uniforms, awards and event items with a dedicated quote.', 4),
  ('¿Hacen entregas o envíos?',
   'Entregas locales coordinadas y envíos nacionales por courier.',
   'Do you deliver or ship?',
   'Scheduled local delivery and nationwide courier shipping.', 5),
  ('¿Cómo se confirma el precio?',
   'El precio de la web es referencial; NYX confirma el valor final según cantidad, material y acabado.',
   'How is the price confirmed?',
   'Website prices are for reference; NYX confirms the final amount by quantity, material and finish.', 6),
  ('¿Qué métodos de pago aceptan?',
   'Transferencia bancaria y efectivo al retirar.',
   'Which payment methods do you accept?',
   'Bank transfer and cash on pickup.', 7);

-- ---------------------------------------------------------------------------
-- Bloques de contenido del sitio
-- ---------------------------------------------------------------------------

insert into public.contenido_bloques (clave, seccion, titulo, nota, orden) values
  ('portada',      'Portada',        'Banner principal',           'En móvil se muestra solo la primera foto.',        1),
  ('como-funciona','Cómo funciona',  'Cuatro pasos del proceso',   'Acepta MP4 hasta 40 MB o una foto de reemplazo.',  2),
  ('empresas',     'Empresas',       'Bloque corporativo',         'La primera ranura admite vídeo; la segunda, foto.',3),
  ('nosotros',     'Nosotros',       'Historia y cifras',          'Formato vertical 4:5 recomendado.',                4);

insert into public.contenido_campos (bloque_id, clave, etiqueta, valor_es, valor_en, multilinea, orden)
select b.id, d.clave, d.etiqueta, d.es, d.en, d.multi, d.orden
from (values
  ('portada', 'etiqueta', 'Etiqueta',        'Sublimación NYX', 'NYX sublimation', false, 1),
  ('portada', 'titular',  'Titular',         'Todo lo que imagines, personalizado', 'Anything you imagine, personalized', false, 2),
  ('portada', 'apoyo',    'Texto de apoyo',  'Camisas · Tazas · Termos · Gorras · Kits', 'Shirts · Mugs · Tumblers · Caps · Kits', false, 3),
  ('portada', 'botones',  'Botones',         'Ver catálogo / Solicitar cotización', 'View catalog / Request a quote', false, 4),

  ('como-funciona', 'paso-01', 'Paso 01', 'Elige tu producto', 'Choose your product', false, 1),
  ('como-funciona', 'paso-02', 'Paso 02', 'Carga tu logotipo o diseño', 'Upload your logo or design', false, 2),
  ('como-funciona', 'paso-03', 'Paso 03', 'Indica cantidad, colores y detalles', 'Set quantity, colors and details', false, 3),
  ('como-funciona', 'paso-04', 'Paso 04', 'Recibe la confirmación de NYX', 'Get NYX confirmation', false, 4),

  ('empresas', 'titular',  'Titular',   'Personalizamos la identidad de tu empresa', 'We personalize your company identity', false, 1),
  ('empresas', 'parrafo',  'Párrafo',   'Creamos productos corporativos personalizados para fortalecer tu marca, reconocer a tu equipo o destacar en cada evento.', 'We create personalized corporate products to strengthen your brand, recognize your team or stand out at every event.', true, 2),
  ('empresas', 'etiquetas','Etiquetas', 'Uniformes, Kits de bienvenida, Eventos, Reconocimientos', 'Uniforms, Welcome kits, Events, Awards', false, 3),

  ('nosotros', 'titular', 'Titular', 'Detalle, oficio y renacimiento', 'Detail, craft and rebirth', false, 1),
  ('nosotros', 'parrafo', 'Párrafo', 'NYX nace del oficio de la sublimación: convertir una idea en un objeto que se usa, se regala y se recuerda.', 'NYX was born from the craft of sublimation: turning an idea into an object that is used, gifted and remembered.', true, 2),
  ('nosotros', 'cifras',  'Cifras',  '6 años de experiencia / 1 a 1 revisión de diseño', '6 years of experience / 1 to 1 design review', false, 3)
) as d(bloque, clave, etiqueta, es, en, multi, orden)
join public.contenido_bloques b on b.clave = d.bloque;

insert into public.contenido_media (bloque_id, url, tipo, orden)
select b.id, d.url, d.tipo::public.tipo_media, d.orden
from (values
  ('portada',       'assets/tee-newplan.jpeg',   'imagen', 1),
  ('portada',       'assets/bottle-create.jpeg', 'imagen', 2),
  ('como-funciona', 'assets/nyx-proceso.mp4',    'video',  1),
  ('como-funciona', 'assets/prod/p006.jpg',      'imagen', 2),
  ('empresas',      'assets/kit-blue.jpeg',      'imagen', 1),
  ('empresas',      'assets/prod/p011.jpg',      'imagen', 2),
  ('nosotros',      'assets/prod/p002.jpg',      'imagen', 1),
  ('nosotros',      'assets/prod/p013.jpg',      'imagen', 2)
) as d(bloque, url, tipo, orden)
join public.contenido_bloques b on b.clave = d.bloque;

-- ---------------------------------------------------------------------------
-- Ajustes
-- ---------------------------------------------------------------------------

insert into public.ajustes (clave, valor, descripcion, publico) values
  ('contacto',
   '{"email": "hola@nyx.ec", "telefono": "+593 99 000 0000", "whatsapp": "+593 99 000 0000", "ciudad": "Quito, Ecuador", "horario": "Lunes a viernes, 9:00 a 18:00"}'::jsonb,
   'Datos que aparecen en el pie de página de la web.', true),
  ('redes',
   '{"instagram": "", "facebook": "", "tiktok": ""}'::jsonb,
   'Enlaces a redes sociales.', true),
  ('notificaciones',
   '{"destinatarios": ["pedidos@nyx.ec"], "avisar_pedido_nuevo": true, "avisar_resumen_diario": true, "avisar_stock_bajo": false}'::jsonb,
   'A dónde llegan los avisos de pedidos nuevos. Privado.', false);
