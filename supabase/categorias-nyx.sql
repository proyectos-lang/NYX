-- ===========================================================================
-- NYX — categorías del portafolio, con sus técnicas
--
-- Cómo se usa:
--   1. Pégalo entero en el SQL Editor de Supabase y ejecútalo.
--   2. Entra en /panel/categorias y súbeles foto a las que no la tengan.
--   3. Las dos tablas del final dicen qué falta.
--
-- SE PUEDE REPETIR. Todo va con `on conflict`, así que no duplica nada, y la
-- foto solo se pone si la fila no tenía ninguna: repetirlo no borra lo que se
-- haya subido desde el panel.
--
-- QUÉ SON LAS TÉCNICAS
--
-- Con qué se fabrica lo de cada categoría: DTF, sublimación, vinil, grabado
-- láser, bordado, impresión 3D. Salen en la web al abrir la categoría.
--
-- Van en la CATEGORÍA y no en el producto porque es lo que hay que saber
-- antes de que haya productos. Una camiseta de NYX se hace en DTF y no
-- sublimada, y eso conviene decirlo aunque el catálogo de camisetas esté
-- todavía vacío.
--
-- Se editan desde /panel/categorias, en un campo con comas. Esto es solo el
-- punto de partida.
-- ===========================================================================

set search_path to nyx, public;

-- ---------------------------------------------------------------------------
-- 1. La columna
--
-- Texto con comas y no una lista de verdad: el panel lo edita con un solo
-- campo, y escribir "DTF, Vinil" es más rápido que añadir filas de una en una.
-- ---------------------------------------------------------------------------

alter table nyx.categorias add column if not exists tecnicas_es text;
alter table nyx.categorias add column if not exists tecnicas_en text;

-- ---------------------------------------------------------------------------
-- 2. Las categorías
--
-- Las que están sin técnicas es porque no me las has dicho todavía, no porque
-- no las tengan. Se rellenan desde el panel.
-- ---------------------------------------------------------------------------

insert into nyx.categorias
  (slug, nombre_es, nombre_en, tecnicas_es, tecnicas_en, imagen_portada, orden, visible)
values
  ('camisas',            'Camisetas',            'T-shirts',
   'DTF',                             'DTF',
   '/assets/tee-oasis.jpeg',     1, true),

  ('buzos',              'Buzos',                'Hoodies',
   'DTF, Vinil',                      'DTF, Vinyl',
   '/assets/hoodie-gray.jpeg',   2, true),

  ('termos-y-botellas',  'Termos y botellas',    'Tumblers & bottles',
   'Sublimación, Grabado láser',      'Sublimation, Laser engraving',
   '/assets/bottle-create.jpeg', 3, true),

  ('tazas',              'Tazas',                'Mugs',
   'Sublimación',                     'Sublimation',
   '/assets/mug-photos.jpeg',    4, true),

  ('gorras',             'Gorras',               'Caps',
   'Sublimación, DTF, Bordado',       'Sublimation, DTF, Embroidery',
   '/assets/cap-pastel.jpeg',    5, true),

  -- Nueva.
  ('cobijas',            'Cobijas',              'Blankets',
   'Sublimación',                     'Sublimation',
   null,                         6, true),

  ('llaveros',           'Llaveros',             'Keychains',
   'Impresión 3D',                    '3D printing',
   '/assets/key-charms.jpeg',    7, true),

  ('llaveros-qr',        'Llaveros QR',          'QR keychains',
   null,                              null,
   null,                         8, true),

  ('pulseras',           'Pulseras',             'Bracelets',
   'Impresión 3D',                    '3D printing',
   '/assets/band-kura.jpeg',     9, true),

  ('bolsos',             'Bolsos',               'Bags',
   null,                              null,
   null,                        10, true),

  ('invitaciones',       'Invitaciones',         'Invitations',
   null,                              null,
   null,                        11, true),

  -- Nueva: el grabado láser como categoría propia, para enseñar en lo que se
  -- usa. Los productos concretos se crean desde /panel/catalogo.
  ('grabado-laser',      'Grabado láser',        'Laser engraving',
   null,                              null,
   null,                        12, true),

  ('letreros-acrilicos', 'Letreros acrílicos',   'Acrylic signs',
   'Grabado láser',                   'Laser engraving',
   null,                        13, true),

  ('productos-nfc',      'Productos NFC',        'NFC products',
   null,                              null,
   null,                        14, true),

  ('impresion-3d',       'Impresión 3D',         '3D printing',
   null,                              null,
   null,                        15, true),

  -- Antes era "Libretas y kits". Mismo slug para no romper los enlaces que ya
  -- puedan estar compartidos, y mismos productos.
  ('libretas-y-kits',    'Regalos corporativos', 'Corporate gifts',
   null,                              null,
   '/assets/kit-indcom.jpeg',   16, true)

on conflict (slug) do update
  set nombre_es   = excluded.nombre_es,
      nombre_en   = excluded.nombre_en,
      orden       = excluded.orden,
      -- Igual que la foto: solo se pone si no había nada, para no pisar lo
      -- que se haya escrito desde el panel.
      tecnicas_es = coalesce(nyx.categorias.tecnicas_es, excluded.tecnicas_es),
      tecnicas_en = coalesce(nyx.categorias.tecnicas_en, excluded.tecnicas_en),
      imagen_portada = coalesce(nyx.categorias.imagen_portada, excluded.imagen_portada);

-- ---------------------------------------------------------------------------
-- 3. Qué falta
-- ---------------------------------------------------------------------------

select nombre_es as "categoría",
       case when coalesce(btrim(imagen_portada), '') = '' then 'FALTA' else 'ok' end as foto,
       case when coalesce(btrim(tecnicas_es), '') = '' then 'FALTA' else tecnicas_es end
         as "técnicas",
       orden
from nyx.categorias
order by orden;
