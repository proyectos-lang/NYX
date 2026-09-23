-- ===========================================================================
-- NYX — traducciones al inglés del contenido editable
--
-- Cómo se usa:
--   1. Ejecuta ANTES supabase/contenido-inicial.sql. Esto solo rellena la
--      columna en inglés de lo que ya existe; no crea nada.
--   2. Pégalo entero en el SQL Editor de Supabase y ejecútalo.
--   3. Mira la tabla del final: dice cuánto queda sin traducir.
--
-- SE PUEDE REPETIR. Al repetirlo devuelve las traducciones a estos valores,
-- así que si ella ya corrigió alguna desde el panel, no lo vuelvas a ejecutar
-- sin avisarle.
--
-- POR QUÉ IMPORTA QUE ESTÉ COMPLETO
--
-- La web cae al español cuando falta el inglés, a propósito: un hueco es peor
-- que una frase en el idioma que no toca. Pero eso significa que una
-- traducción olvidada NO da error — simplemente aparece una frase en español
-- en mitad de la página inglesa, y solo la ve quien navega en inglés.
--
-- La consulta del final está para eso: cuenta lo que sigue sin traducir.
-- ===========================================================================

set search_path to nyx, public;

-- ---------------------------------------------------------------------------
-- 1. Textos de la portada
-- ---------------------------------------------------------------------------

update nyx.contenido_campos c
set valor_en = d.en
from (values
  ('portada', 'etiqueta',       'NYX sublimation'),
  ('portada', 'titular',        'Anything you imagine,'),
  ('portada', 'titularEnfasis', 'personalized'),

  ('como-funciona', 'paso-01',         'Choose your product'),
  ('como-funciona', 'paso-01-detalle', 'Browse the catalog by category and pick the item you want to personalize.'),
  ('como-funciona', 'paso-02',         'Upload your logo or design'),
  ('como-funciona', 'paso-02-detalle', 'PNG, JPG, PDF, AI or SVG. We check the resolution before producing.'),
  ('como-funciona', 'paso-03',         'Set quantity, colors and details'),
  ('como-funciona', 'paso-03-detalle', 'Sizes, colors, logo placement and the date you need it.'),
  ('como-funciona', 'paso-04',         'Get NYX confirmation'),
  ('como-funciona', 'paso-04-detalle', 'We reply with the final price and lead time within 24 business hours.'),

  ('empresas', 'titular',   'We personalize your company identity'),
  ('empresas', 'parrafo',   'We create personalized corporate products to strengthen your brand, recognize your team or stand out at every event.'),
  ('empresas', 'etiquetas', 'Uniforms, Welcome kits, Events, Awards, Merchandising'),

  ('nosotros', 'titular',       'Detail, craft and rebirth'),
  ('nosotros', 'parrafo',       'NYX was born from the craft of sublimation: turning an idea into an object that is used, gifted and remembered. We work with selected materials, color control and piece-by-piece review before delivery.'),
  ('nosotros', 'cifra1',        '6 years'),
  ('nosotros', 'cifra1Detalle', 'of experience'),
  ('nosotros', 'cifra2',        '1 to 1'),
  ('nosotros', 'cifra2Detalle', 'design review')
) as d(bloque, clave, en)
join nyx.contenido_bloques b on b.clave = d.bloque
where c.bloque_id = b.id and c.clave = d.clave;

-- ---------------------------------------------------------------------------
-- 2. Alt de las imágenes
--
-- No es decorativo: es lo que lee un lector de pantalla y lo que aparece si la
-- foto no carga.
-- ---------------------------------------------------------------------------

alter table nyx.contenido_media add column if not exists alt_en text;

update nyx.contenido_media m
set alt_en = d.en
from (values
  ('portada', 'hero-1', 'Personalized NYX t-shirt'),
  ('portada', 'hero-2', 'Personalized NYX tumbler'),
  ('portada', 'hero-3', 'NYX corporate kit'),
  ('como-funciona', 'proceso-muestra', 'Preview of a logo on a t-shirt'),
  ('empresas', 'empresas-foto',  'NYX corporate kit'),
  ('empresas', 'empresas-video', 'NYX production process'),
  ('nosotros', 'nosotros-logo', 'NYX'),
  ('nosotros', 'nosotros-foto', 'Personalized NYX keychains')
) as d(bloque, clave, en)
join nyx.contenido_bloques b on b.clave = d.bloque
where m.bloque_id = b.id and m.clave = d.clave;

update nyx.contenido_media
set alt_en = 'NYX work ' || substring(clave from 9)
where clave like 'mosaico-%';

-- ---------------------------------------------------------------------------
-- 3. Preguntas frecuentes
-- ---------------------------------------------------------------------------

update nyx.faq f
set pregunta_en = d.p, respuesta_en = d.r
from (values
  ('¿Cuánto tarda un pedido?',
   'How long does an order take?',
   'Personalized orders are delivered in 3 to 7 business days depending on quantity and complexity. Ready-to-ship items can be picked up the same day.'),
  ('¿Cuál es la cantidad mínima?',
   'What is the minimum quantity?',
   'No minimum for individual products. For corporate orders with exclusive artwork the reference minimum is 10 units.'),
  ('¿Puedo enviar mi propio diseño?',
   'Can I send my own design?',
   'Yes. You can upload your logo as PNG, JPG, PDF, AI or SVG. We recommend high resolution or vectors for the best result.'),
  ('¿Realizan pedidos empresariales?',
   'Do you handle corporate orders?',
   'Yes, we work on corporate kits, uniforms, awards and event items with a dedicated quote.'),
  ('¿Hacen entregas o envíos?',
   'Do you deliver or ship?',
   'We offer scheduled local delivery and nationwide courier shipping. The cost is confirmed in the quote.'),
  ('¿Cómo se confirma el precio?',
   'How is the price confirmed?',
   'The price shown is for reference. NYX reviews your request and confirms the final amount by quantity, material and finish.'),
  ('¿Qué métodos de pago aceptan?',
   'Which payment methods do you accept?',
   'Bank transfer and cash on pickup. We do not process online payments at this stage.')
) as d(es, p, r)
where f.pregunta_es = d.es;

-- ---------------------------------------------------------------------------
-- 4. Categorías
-- ---------------------------------------------------------------------------

update nyx.categorias c
set nombre_en = d.en
from (values
  ('camisas',           'Shirts'),
  ('buzos',             'Hoodies'),
  ('termos-y-botellas', 'Tumblers & bottles'),
  ('gorras',            'Caps'),
  ('tazas',             'Mugs'),
  ('pulseras',          'Wristbands'),
  ('llaveros',          'Keychains'),
  ('libretas-y-kits',   'Notebooks & kits')
) as d(slug, en)
where c.slug = d.slug;

-- ---------------------------------------------------------------------------
-- 5. Productos
-- ---------------------------------------------------------------------------

update nyx.productos p
set nombre_en = d.nombre, descripcion_en = d.descripcion
from (values
  ('NYX-001', 'NYX oversize t-shirt',
   'Cotton t-shirt with an oversize cut and long-lasting sublimation. Ideal for uniforms, events and brand merchandising.'),
  ('NYX-002', 'Hooded sweatshirt',
   'Hooded sweatshirt with a kangaroo pocket. Embroidery or sublimation depending on the design.'),
  ('NYX-003', 'Signature tumbler 750 ml',
   'Double-walled stainless steel tumbler with a matte finish and long-lasting sublimation. Ideal for corporate kits, events and personalized gifts.'),
  ('NYX-004', 'Pixel bottle 500 ml',
   'A 500 ml sports bottle with laser engraving. Available for immediate pickup.'),
  ('NYX-005', 'Ceramic mug with name',
   'Ceramic mug with a colored interior and an individual name. Perfect for gifts and event favors.'),
  ('NYX-006', 'Embroidered cap',
   'Cap with front embroidery. Several colors available, ready to ship.'),
  ('NYX-007', 'A5 executive notebook',
   'Hardcover A5 notebook, personalized on the cover. Pairs with a tumbler and pen in corporate kits.'),
  ('NYX-008', 'Silicone wristband',
   'Silicone wristband with engraved text. Made for events, concerts and weddings.')
) as d(sku, nombre, descripcion)
where p.sku = d.sku;

-- ---------------------------------------------------------------------------
-- 6. Qué queda sin traducir
--
-- Si alguna fila sale con un número distinto de 0, la web en inglés va a
-- enseñar esas frases en español. No da error: hay que mirarlo aquí.
-- ---------------------------------------------------------------------------

select 'textos de la portada' as que,
       count(*) filter (where coalesce(btrim(valor_en), '') = '') as sin_traducir,
       count(*) as total
from nyx.contenido_campos
union all
select 'preguntas frecuentes',
       count(*) filter (where coalesce(btrim(pregunta_en), '') = ''
                           or coalesce(btrim(respuesta_en), '') = ''),
       count(*)
from nyx.faq
union all
select 'categorías',
       count(*) filter (where coalesce(btrim(nombre_en), '') = ''),
       count(*)
from nyx.categorias
union all
select 'nombres de producto',
       count(*) filter (where coalesce(btrim(nombre_en), '') = ''),
       count(*)
from nyx.productos
union all
select 'descripciones de producto',
       count(*) filter (where coalesce(btrim(descripcion_en), '') = ''),
       count(*)
from nyx.productos;
