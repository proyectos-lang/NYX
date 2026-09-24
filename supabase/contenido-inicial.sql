-- ===========================================================================
-- NYX — contenido inicial del sitio
--
-- Cómo se usa:
--   1. Pégalo entero en el SQL Editor de Supabase y ejecútalo.
--   2. Mira la tabla que devuelve al final: dice cuántas filas quedó cada cosa.
--   3. Entra en /panel/inicio y comprueba que ya puedes editarlo todo.
--
-- SE PUEDE REPETIR SIN MIEDO. Todo va con `on conflict` o `where not exists`,
-- así que ejecutarlo dos veces no duplica nada. Lo que SÍ hace al repetirlo es
-- devolver los textos a su valor original, así que si ella ya escribió los
-- suyos, no lo vuelvas a ejecutar sin avisarle.
--
-- POR QUÉ EXISTE ESTE ARCHIVO
--
-- El sitio tenía el contenido escrito a mano en el código (lib/demo.ts) y lo
-- mostraba cuando la tabla correspondiente estaba vacía. El efecto era
-- desconcertante: la web enseñaba siete preguntas frecuentes y el panel no
-- enseñaba ninguna, porque cada uno miraba un sitio distinto. Esto mete en la
-- base exactamente lo que hoy se ve, para que web y panel dejen de discrepar.
--
-- La página no cambia de aspecto al ejecutarlo. Lo que cambia es que a partir
-- de aquí todo sale de la base, y por tanto todo se puede editar.
-- ===========================================================================

set search_path to nyx, public;

-- ---------------------------------------------------------------------------
-- 1. Cada imagen del sitio necesita un nombre estable
--
-- Hasta ahora las imágenes de un bloque solo se distinguían por `orden`, que
-- es un número que cambia en cuanto se reordena o se borra una. Si el sitio
-- pidiera "la imagen 2 del hero" y alguien borrara la 1, la portada cambiaría
-- sola. `clave` le da a cada hueco un nombre que no se mueve: 'hero-1' es
-- siempre la primera foto del hero, la haya subido quien la haya subido.
-- ---------------------------------------------------------------------------

alter table nyx.contenido_media add column if not exists clave text;

-- El índice es parcial porque las filas viejas (sin clave) no deben chocar
-- entre sí mientras no se les asigne una.
create unique index if not exists contenido_media_clave_idx
  on nyx.contenido_media (bloque_id, clave)
  where clave is not null;

-- ---------------------------------------------------------------------------
-- 2. Bloques de la portada, en el orden en que se ven en la web
--
-- 'trabajos-reales' es nuevo: el mosaico de 12 fotos existía solo en el código
-- y no había forma de tocarlo desde ningún sitio.
-- ---------------------------------------------------------------------------

insert into nyx.contenido_bloques (clave, seccion, titulo, nota, orden, bloqueado) values
  ('portada',         'Portada',            'Banner principal',
   'Tres fotos en vertical. En móvil solo se ve la primera.',                    1, false),
  ('trabajos-reales', 'Trabajos reales',    'Mosaico de trabajos',
   'Doce fotos cuadradas. Salen en la web justo debajo de la marquesina.',       2, false),
  ('como-funciona',   'Cómo funciona',      'Cuatro pasos del proceso',
   'Una foto de muestra con el logotipo encima.',                                3, false),
  ('empresas',        'Empresas',           'Bloque corporativo',
   'Una foto vertical y un vídeo. El vídeo admite MP4 de hasta 40 MB.',          4, false),
  ('nosotros',        'Nosotros',           'Historia y cifras',
   'Una foto vertical, formato 4:5 recomendado.',                                5, false)
on conflict (clave) do update
  set seccion = excluded.seccion,
      titulo  = excluded.titulo,
      nota    = excluded.nota,
      orden   = excluded.orden;

-- ---------------------------------------------------------------------------
-- 3. Los textos que la web lee DE VERDAD
--
-- El seed anterior y el código se habían desincronizado, y de la peor manera
-- posible: el panel enseñaba campos que la web no leía. Se editaban, se
-- guardaban sin error, y no cambiaba nada en pantalla. Aquí van los 20 campos
-- que app/(sitio)/page.tsx consume realmente; los huérfanos se borran más
-- abajo.
-- ---------------------------------------------------------------------------

insert into nyx.contenido_campos (bloque_id, clave, etiqueta, valor_es, valor_en, multilinea, orden)
select b.id, d.clave, d.etiqueta, d.es, d.en, d.multi, d.orden
from (values
  -- Portada. El titular va partido en dos porque la web pinta la segunda
  -- mitad en cursiva dorada; si fuera un solo campo no habría forma de decir
  -- qué parte se resalta.
  ('portada', 'etiqueta',       'Etiqueta pequeña',      'Sublimación NYX',      'NYX sublimation',           false, 1),
  ('portada', 'titular',        'Titular',               'Todo lo que imagines,','Anything you imagine,',     false, 2),
  ('portada', 'titularEnfasis', 'Titular resaltado',     'personalizado',        'personalized',              false, 3),

  ('como-funciona', 'paso-01',         'Paso 1 · título', 'Elige tu producto',                                        'Choose your product',                                       false, 1),
  ('como-funciona', 'paso-01-detalle', 'Paso 1 · detalle','Explora el catálogo por categoría y elige el artículo que quieres personalizar.', 'Browse the catalog by category and pick the item you want to personalize.', true,  2),
  ('como-funciona', 'paso-02',         'Paso 2 · título', 'Carga tu logotipo o diseño',                               'Upload your logo or design',                                false, 3),
  ('como-funciona', 'paso-02-detalle', 'Paso 2 · detalle','PNG, JPG, PDF, AI o SVG. Revisamos la resolución antes de producir.', 'PNG, JPG, PDF, AI or SVG. We check the resolution before producing.', true,  4),
  ('como-funciona', 'paso-03',         'Paso 3 · título', 'Indica cantidad, colores y detalles',                      'Set quantity, colors and details',                          false, 5),
  ('como-funciona', 'paso-03-detalle', 'Paso 3 · detalle','Tallas, colores, ubicación del logotipo y fecha en la que lo necesitas.', 'Sizes, colors, logo placement and the date you need it.',    true,  6),
  ('como-funciona', 'paso-04',         'Paso 4 · título', 'Recibe la confirmación de NYX',                            'Get NYX confirmation',                                      false, 7),
  ('como-funciona', 'paso-04-detalle', 'Paso 4 · detalle','Respondemos con precio final y tiempo de entrega en menos de 24 horas hábiles.', 'We reply with the final price and lead time within 24 business hours.', true,  8),

  ('empresas', 'titular',   'Titular',   'Personalizamos la identidad de tu empresa', 'We personalize your company identity', false, 1),
  ('empresas', 'parrafo',   'Párrafo',   'Creamos productos corporativos personalizados para fortalecer tu marca, reconocer a tu equipo o destacar en cada evento.', 'We create personalized corporate products to strengthen your brand, recognize your team or stand out at every event.', true, 2),
  -- Separadas por comas: la web las convierte en píldoras, una por coma.
  ('empresas', 'etiquetas', 'Etiquetas (separadas por coma)', 'Uniformes, Kits de bienvenida, Eventos, Reconocimientos, Merchandising', 'Uniforms, Welcome kits, Events, Awards, Merchandising', false, 3),

  ('nosotros', 'titular',       'Titular',            'Detalle, oficio y renacimiento', 'Detail, craft and rebirth', false, 1),
  ('nosotros', 'parrafo',       'Párrafo',            'NYX nace del oficio de la sublimación: convertir una idea en un objeto que se usa, se regala y se recuerda. Trabajamos con materiales seleccionados, control de color y revisión pieza por pieza antes de entregar.', 'NYX was born from the craft of sublimation: turning an idea into an object that is used, gifted and remembered. We work with selected materials, color control and piece-by-piece review before delivery.', true, 2),
  ('nosotros', 'cifra1',        'Cifra 1',            '6 años',               '6 years',           false, 3),
  ('nosotros', 'cifra1Detalle', 'Cifra 1 · detalle',  'de experiencia',       'of experience',     false, 4),
  ('nosotros', 'cifra2',        'Cifra 2',            '1 a 1',                '1 to 1',            false, 5),
  ('nosotros', 'cifra2Detalle', 'Cifra 2 · detalle',  'revisión de diseño',   'design review',     false, 6)
) as d(bloque, clave, etiqueta, es, en, multi, orden)
join nyx.contenido_bloques b on b.clave = d.bloque
on conflict (bloque_id, clave) do update
  set etiqueta   = excluded.etiqueta,
      valor_es   = excluded.valor_es,
      valor_en   = excluded.valor_en,
      multilinea = excluded.multilinea,
      orden      = excluded.orden;

-- Campos que el panel enseñaba pero la web nunca leyó. Se quitan porque un
-- campo que se guarda sin error y no cambia nada es peor que no tenerlo: se
-- pierde el rato buscando por qué no se ve el cambio.
delete from nyx.contenido_campos c
using nyx.contenido_bloques b
where c.bloque_id = b.id
  and (b.clave, c.clave) in (
    ('portada',  'apoyo'),
    ('portada',  'botones'),
    ('nosotros', 'cifras')
  );

-- ---------------------------------------------------------------------------
-- 4. Las imágenes del sitio
--
-- Apuntan a los archivos de /public/assets que ya están en el repositorio, así
-- que la web se ve igual que antes. La diferencia es que ahora cada una tiene
-- una fila que el panel puede reemplazar por una subida al bucket.
--
-- El `alt` no es decorativo: es lo que el panel usa como nombre del hueco y lo
-- que leen los lectores de pantalla en la web.
-- ---------------------------------------------------------------------------

insert into nyx.contenido_media (bloque_id, clave, url, tipo, alt, orden)
select b.id, d.clave, d.url, d.tipo::nyx.tipo_media, d.alt, d.orden
from (values
  ('portada', 'hero-1', '/assets/tee-newplan.jpeg',   'imagen', 'Camiseta personalizada NYX', 1),
  ('portada', 'hero-2', '/assets/bottle-create.jpeg', 'imagen', 'Termo personalizado NYX',    2),
  ('portada', 'hero-3', '/assets/kit-blue.jpeg',      'imagen', 'Kit corporativo NYX',        3),

  ('trabajos-reales', 'mosaico-01', '/assets/prod/p003.jpg', 'imagen', 'Trabajo NYX 1',  1),
  ('trabajos-reales', 'mosaico-02', '/assets/prod/p007.jpg', 'imagen', 'Trabajo NYX 2',  2),
  ('trabajos-reales', 'mosaico-03', '/assets/prod/p014.jpg', 'imagen', 'Trabajo NYX 3',  3),
  ('trabajos-reales', 'mosaico-04', '/assets/prod/p021.jpg', 'imagen', 'Trabajo NYX 4',  4),
  ('trabajos-reales', 'mosaico-05', '/assets/prod/p030.jpg', 'imagen', 'Trabajo NYX 5',  5),
  ('trabajos-reales', 'mosaico-06', '/assets/prod/p034.jpg', 'imagen', 'Trabajo NYX 6',  6),
  ('trabajos-reales', 'mosaico-07', '/assets/prod/p041.jpg', 'imagen', 'Trabajo NYX 7',  7),
  ('trabajos-reales', 'mosaico-08', '/assets/prod/p044.jpg', 'imagen', 'Trabajo NYX 8',  8),
  ('trabajos-reales', 'mosaico-09', '/assets/prod/p050.jpg', 'imagen', 'Trabajo NYX 9',  9),
  ('trabajos-reales', 'mosaico-10', '/assets/prod/p053.jpg', 'imagen', 'Trabajo NYX 10', 10),
  ('trabajos-reales', 'mosaico-11', '/assets/prod/p057.jpg', 'imagen', 'Trabajo NYX 11', 11),
  ('trabajos-reales', 'mosaico-12', '/assets/prod/p060.jpg', 'imagen', 'Trabajo NYX 12', 12),

  ('como-funciona', 'proceso-muestra', '/assets/tee-max.jpeg', 'imagen', 'Vista previa de un logotipo sobre camiseta', 1),

  ('empresas', 'empresas-foto',  '/assets/kit-blue.jpeg',    'imagen', 'Kit corporativo NYX',        1),
  ('empresas', 'empresas-video', '/assets/nyx-proceso.mp4',  'video',  'Proceso de producción NYX',  2),

  ('nosotros', 'nosotros-logo', '/assets/nyx-logo.jpeg',   'imagen', 'NYX',                         1),
  ('nosotros', 'nosotros-foto', '/assets/key-studio.jpeg', 'imagen', 'Llaveros personalizados NYX', 2)
) as d(bloque, clave, url, tipo, alt, orden)
join nyx.contenido_bloques b on b.clave = d.bloque
on conflict (bloque_id, clave) where clave is not null do update
  set url   = excluded.url,
      tipo  = excluded.tipo,
      alt   = excluded.alt,
      orden = excluded.orden;

-- Las filas del seed viejo no tenían clave y quedarían como duplicados
-- fantasma: se ven en el panel, no se pueden identificar y no salen en la web.
delete from nyx.contenido_media where clave is null;

-- ---------------------------------------------------------------------------
-- 5. Preguntas frecuentes
--
-- Son las siete que la web venía mostrando desde el código. `faq` no tiene
-- clave única, así que la comprobación va por el texto de la pregunta.
-- ---------------------------------------------------------------------------

insert into nyx.faq (pregunta_es, respuesta_es, pregunta_en, respuesta_en, orden, visible)
select d.pes, d.res, d.pen, d.ren, d.orden, true
from (values
  ('¿Cuánto tarda un pedido?',
   'Los pedidos personalizados se entregan entre 3 y 7 días hábiles según cantidad y complejidad. Los productos de entrega inmediata se retiran el mismo día.',
   'How long does an order take?',
   '3 to 7 business days depending on quantity and complexity. Ready-to-ship items can be picked up the same day.', 1),
  ('¿Cuál es la cantidad mínima?',
   'No hay mínimo para productos individuales. Para pedidos corporativos con diseño exclusivo el mínimo referencial es de 10 unidades.',
   'What is the minimum quantity?',
   'No minimum for individual products. Corporate orders with exclusive artwork start at 10 units.', 2),
  ('¿Puedo enviar mi propio diseño?',
   'Sí. Puedes cargar tu logotipo en PNG, JPG, PDF, AI o SVG. Recomendamos alta resolución o vectores para el mejor resultado.',
   'Can I send my own design?',
   'Yes. PNG, JPG, PDF, AI or SVG. High resolution or vectors recommended.', 3),
  ('¿Realizan pedidos empresariales?',
   'Sí, trabajamos kits corporativos, uniformes, reconocimientos y artículos para eventos con cotización dedicada.',
   'Do you handle corporate orders?',
   'Yes — corporate kits, uniforms, awards and event items with a dedicated quote.', 4),
  ('¿Hacen entregas o envíos?',
   'Realizamos entregas locales coordinadas y envíos a nivel nacional por courier. El costo se confirma en la cotización.',
   'Do you deliver or ship?',
   'Scheduled local delivery and nationwide courier shipping. The cost is confirmed in the quote.', 5),
  ('¿Cómo se confirma el precio?',
   'El precio mostrado es referencial. NYX revisa tu solicitud y confirma el valor final según cantidad, material y acabado.',
   'How is the price confirmed?',
   'Website prices are for reference; NYX confirms the final amount by quantity, material and finish.', 6),
  ('¿Qué métodos de pago aceptan?',
   'Transferencia bancaria y pago en efectivo al retirar. No procesamos pagos en línea en esta etapa.',
   'Which payment methods do you accept?',
   'Bank transfer and cash on pickup. We do not process online payments at this stage.', 7)
) as d(pes, res, pen, ren, orden)
where not exists (select 1 from nyx.faq f where f.pregunta_es = d.pes);

-- ---------------------------------------------------------------------------
-- 6. Categorías
-- ---------------------------------------------------------------------------

insert into nyx.categorias (slug, nombre_es, nombre_en, imagen_portada, orden, visible) values
  ('camisas',           'Camisas',           'Shirts',            '/assets/tee-oasis.jpeg',   1, true),
  ('buzos',             'Buzos',             'Hoodies',           '/assets/hoodie-gray.jpeg', 2, true),
  ('termos-y-botellas', 'Termos y botellas', 'Tumblers & bottles','/assets/bottle-create.jpeg',3, true),
  ('gorras',            'Gorras',            'Caps',              '/assets/cap-pastel.jpeg',  4, true),
  ('tazas',             'Tazas',             'Mugs',              '/assets/mug-photos.jpeg',  5, true),
  ('pulseras',          'Pulseras',          'Wristbands',        '/assets/band-kura.jpeg',   6, true),
  ('llaveros',          'Llaveros',          'Keychains',         '/assets/key-charms.jpeg',  7, true),
  ('libretas-y-kits',   'Libretas y kits',   'Notebooks & kits',  '/assets/kit-indcom.jpeg',  8, true)
on conflict (slug) do update
  set nombre_es      = excluded.nombre_es,
      nombre_en      = excluded.nombre_en,
      imagen_portada = excluded.imagen_portada,
      orden          = excluded.orden;

-- ---------------------------------------------------------------------------
-- 7. Productos
--
-- Tres van marcados 'entrega_inmediata' con stock, para que la sección
-- "Listos para llevar hoy" de la portada tenga algo que enseñar: esa sección
-- solo se dibuja si hay al menos un producto de ese tipo con stock.
-- ---------------------------------------------------------------------------

insert into nyx.productos
  (sku, slug, nombre_es, categoria_id, descripcion_es, precio_referencia, tipo, stock, bajo_pedido, visible, orden)
select d.sku, d.slug, d.nombre, c.id, d.descripcion, d.precio, d.tipo::nyx.tipo_producto,
       d.stock, d.bajo_pedido, true, d.orden
from (values
  ('NYX-001', 'camisa-oversize-nyx', 'Camisa oversize NYX', 'camisas',
   'Camisa de algodón con corte oversize y sublimación de alta durabilidad. Ideal para uniformes, eventos y merchandising de marca.',
   13.40, 'personalizable', 24, false, 1),
  ('NYX-002', 'buzo-con-capucha', 'Buzo con capucha', 'buzos',
   'Buzo con capucha y bolsillo canguro. Bordado o sublimación según el diseño.',
   28.00, 'personalizable', null, true, 2),
  ('NYX-003', 'termo-signature-750', 'Termo Signature 750 ml', 'termos-y-botellas',
   'Termo de acero inoxidable con doble pared, acabado mate y sublimación de alta durabilidad. Ideal para kits corporativos, eventos y regalos personalizados.',
   18.50, 'personalizable', 18, false, 3),
  ('NYX-004', 'botella-pixel-500', 'Botella pixel 500 ml', 'termos-y-botellas',
   'Botella deportiva de 500 ml con grabado láser. Disponible para entrega inmediata.',
   11.20, 'entrega_inmediata', 32, false, 4),
  ('NYX-005', 'taza-ceramica-con-nombre', 'Taza cerámica con nombre', 'tazas',
   'Taza de cerámica con interior de color y nombre individual. Perfecta para regalos y detalles de evento.',
   7.20, 'personalizable', 40, false, 5),
  ('NYX-006', 'gorra-bordada', 'Gorra bordada', 'gorras',
   'Gorra con bordado frontal. Varios colores disponibles, entrega inmediata.',
   8.40, 'entrega_inmediata', 14, false, 6),
  ('NYX-007', 'libreta-ejecutiva-a5', 'Libreta ejecutiva A5', 'libretas-y-kits',
   'Libreta A5 de tapa dura, personalizable en portada. Se combina en kits con termo y bolígrafo.',
   9.20, 'personalizable', 26, false, 7),
  ('NYX-008', 'pulsera-de-silicona', 'Pulsera de silicona', 'pulseras',
   'Pulsera de silicona con texto grabado. Pensada para eventos, conciertos y bodas.',
   1.40, 'entrega_inmediata', 180, false, 8)
) as d(sku, slug, nombre, categoria, descripcion, precio, tipo, stock, bajo_pedido, orden)
join nyx.categorias c on c.slug = d.categoria
on conflict (sku) do update
  set nombre_es         = excluded.nombre_es,
      categoria_id      = excluded.categoria_id,
      descripcion_es    = excluded.descripcion_es,
      precio_referencia = excluded.precio_referencia,
      tipo              = excluded.tipo,
      stock             = excluded.stock,
      bajo_pedido       = excluded.bajo_pedido,
      orden             = excluded.orden;

-- ---------------------------------------------------------------------------
-- 8. Fotos de los productos
--
-- Sin esto los productos salen con el texto "foto pendiente" en la web. Se
-- borran primero las que tenga cada uno para poder repetir el script sin
-- acumular duplicados, y porque el índice único de portada rechazaría una
-- segunda foto marcada como principal.
-- ---------------------------------------------------------------------------

delete from nyx.producto_fotos f
using nyx.productos p
where f.producto_id = p.id
  and p.sku in ('NYX-001','NYX-002','NYX-003','NYX-004',
                'NYX-005','NYX-006','NYX-007','NYX-008');

insert into nyx.producto_fotos (producto_id, url, alt, orden, es_portada)
select p.id, d.url, p.nombre_es, d.orden, d.orden = 1
from (values
  ('NYX-001', '/assets/prod/p001.jpg',     1),
  ('NYX-001', '/assets/tee-oasis.jpeg',    2),
  ('NYX-001', '/assets/tee-max.jpeg',      3),
  ('NYX-002', '/assets/prod/p002.jpg',     1),
  ('NYX-002', '/assets/hoodie.jpeg',       2),
  ('NYX-002', '/assets/hoodie-gray.jpeg',  3),
  ('NYX-003', '/assets/prod/p003.jpg',     1),
  ('NYX-003', '/assets/bottle-create.jpeg',2),
  ('NYX-003', '/assets/bottle-pixel.jpeg', 3),
  ('NYX-004', '/assets/prod/p005.jpg',     1),
  ('NYX-004', '/assets/bottle-pixel.jpeg', 2),
  ('NYX-005', '/assets/prod/p007.jpg',     1),
  ('NYX-005', '/assets/mug-gift.jpeg',     2),
  ('NYX-005', '/assets/mug-photos.jpeg',   3),
  ('NYX-006', '/assets/prod/p008.jpg',     1),
  ('NYX-006', '/assets/cap-blue.jpeg',     2),
  ('NYX-006', '/assets/cap-pastel.jpeg',   3),
  ('NYX-007', '/assets/prod/p010.jpg',     1),
  ('NYX-007', '/assets/kit-blue.jpeg',     2),
  ('NYX-007', '/assets/kit-indcom.jpeg',   3),
  ('NYX-008', '/assets/prod/p012.jpg',     1),
  ('NYX-008', '/assets/band-kura.jpeg',    2),
  ('NYX-008', '/assets/band-chetko.jpeg',  3)
) as d(sku, url, orden)
join nyx.productos p on p.sku = d.sku;

-- ---------------------------------------------------------------------------
-- 9. Datos de contacto
--
-- Alimentan el pie, los botones de WhatsApp de la web y la página de cotizar.
-- ---------------------------------------------------------------------------

insert into nyx.ajustes (clave, valor, descripcion, publico) values
  ('contacto',
   '{"email": "hola@nyx.ec", "telefono": "+1 845 972 1825", "whatsapp": "+1 845 972 1825", "ciudad": "Quito, Ecuador", "horario": "Lun a Vie 9:00–18:00 · Sáb 9:00–13:00"}'::jsonb,
   'Datos de contacto que se muestran en la web.', true)
on conflict (clave) do nothing;

-- ---------------------------------------------------------------------------
-- 10. Qué quedó
--
-- Si alguna fila sale en 0, algo no se aplicó y conviene mirar por qué antes
-- de dar el contenido por cargado.
-- ---------------------------------------------------------------------------

select 'bloques de contenido' as que, count(*) as filas from nyx.contenido_bloques
union all select 'textos editables',     count(*) from nyx.contenido_campos
union all select 'imágenes del sitio',   count(*) from nyx.contenido_media
union all select 'preguntas frecuentes', count(*) from nyx.faq
union all select 'categorías',           count(*) from nyx.categorias
union all select 'productos',            count(*) from nyx.productos
union all select '  de ellos, entrega inmediata con stock',
                 count(*) from nyx.productos where tipo = 'entrega_inmediata' and stock > 0
union all select 'fotos de producto',    count(*) from nyx.producto_fotos
union all select 'ajustes',              count(*) from nyx.ajustes;
