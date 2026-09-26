-- ===========================================================================
-- NYX — categorías reales del portafolio
--
-- Cómo se usa:
--   1. Pégalo entero en el SQL Editor de Supabase y ejecútalo.
--   2. Entra en /panel/categorias y súbeles foto a las que no la tengan.
--   3. La tabla del final dice cuáles están sin foto.
--
-- SE PUEDE REPETIR. Todo va con `on conflict`, así que no duplica nada.
--
-- DE DÓNDE SALEN
--
-- Del portafolio de NYX: camisetas, buzos, termos, tazas, llaveros, llaveros
-- QR, gorras, bolsos, invitaciones, letreros acrílicos, productos NFC e
-- impresión 3D.
--
-- Lo que NO entra aquí son las técnicas —DTF, sublimación, vinil, grabado
-- láser, bordado—. No son categorías: son la forma de fabricar, y la misma
-- camiseta puede salir por dos técnicas distintas. Si fueran categorías, cada
-- producto tendría que estar en varias a la vez y el filtro del catálogo
-- dejaría de servir para elegir. Van en la cinta de la portada, que es donde
-- se cuenta lo que sabe hacer NYX.
--
-- "Pulseras" y "Libretas y kits" se quedan aunque no estén en la lista: el
-- portafolio acaba en "Etc." y ya tienen productos. Si no se ofrecen, se
-- apagan desde /panel/categorias con el interruptor.
-- ===========================================================================

set search_path to nyx, public;

insert into nyx.categorias (slug, nombre_es, nombre_en, imagen_portada, orden, visible) values
  -- Las que ya existían: cambia el orden y, en camisas, el nombre.
  ('camisas',            'Camisetas',          'T-shirts',        '/assets/tee-oasis.jpeg',    1, true),
  ('buzos',              'Buzos',              'Hoodies',         '/assets/hoodie-gray.jpeg',  2, true),
  ('termos-y-botellas',  'Termos y botellas',  'Tumblers & bottles','/assets/bottle-create.jpeg',3, true),
  ('tazas',              'Tazas',              'Mugs',            '/assets/mug-photos.jpeg',   4, true),
  ('gorras',             'Gorras',             'Caps',            '/assets/cap-pastel.jpeg',   5, true),
  ('llaveros',           'Llaveros',           'Keychains',       '/assets/key-charms.jpeg',   6, true),

  -- Nuevas. Sin foto a propósito: poner una que no sea del producto es peor
  -- que dejar el hueco, porque el hueco avisa de que falta y una foto ajena
  -- no. La web enseña el nombre mientras tanto.
  ('llaveros-qr',        'Llaveros QR',        'QR keychains',    null,                        7, true),
  ('bolsos',             'Bolsos',             'Bags',            null,                        8, true),
  ('invitaciones',       'Invitaciones',       'Invitations',     null,                        9, true),
  ('letreros-acrilicos', 'Letreros acrílicos', 'Acrylic signs',   null,                       10, true),
  ('productos-nfc',      'Productos NFC',      'NFC products',    null,                       11, true),
  ('impresion-3d',       'Impresión 3D',       '3D printing',     null,                       12, true),

  -- No están en el portafolio, pero ya tienen productos. Al final de la lista.
  ('pulseras',           'Pulseras',           'Wristbands',      '/assets/band-kura.jpeg',   13, true),
  ('libretas-y-kits',    'Libretas y kits',    'Notebooks & kits','/assets/kit-indcom.jpeg',  14, true)

on conflict (slug) do update
  set nombre_es = excluded.nombre_es,
      nombre_en = excluded.nombre_en,
      orden     = excluded.orden,
      -- La foto SOLO se toca si la fila no tenía ninguna. Así, volver a
      -- ejecutar esto no borra lo que se haya subido desde el panel.
      imagen_portada = coalesce(nyx.categorias.imagen_portada, excluded.imagen_portada);

-- ---------------------------------------------------------------------------
-- Qué falta
--
-- Las que salgan aquí se ven en la web con un recuadro y su nombre, sin foto.
-- Se suben desde /panel/categorias.
-- ---------------------------------------------------------------------------

select nombre_es as "categoría sin foto",
       nombre_en as "en inglés",
       orden
from nyx.categorias
where coalesce(btrim(imagen_portada), '') = ''
order by orden;
