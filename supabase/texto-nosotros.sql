-- ===========================================================================
-- NYX — el párrafo de "Sobre nosotros"
--
-- Pégalo en el SQL Editor de Supabase y ejecútalo. Cambia SOLO ese párrafo.
--
-- Se hace con un script aparte y no repitiendo contenido-inicial.sql porque
-- ese devuelve TODOS los textos de la portada a su valor original, y se
-- llevaría por delante cualquier otro que hayas escrito desde el panel.
--
-- También se puede hacer sin SQL: /panel/inicio → "Sobre nosotros" → Párrafo,
-- y el mismo texto en "Versión en inglés".
-- ===========================================================================

set search_path to nyx, public;

update nyx.contenido_campos c
set valor_es = 'NYX nació del oficio de la sublimación. Ahora también hacemos DTF, grabado láser, bordado y nuestra nueva impresión 3D.',
    valor_en = 'NYX was born from the craft of sublimation. Now we also do DTF, laser engraving, embroidery and our new 3D printing.'
from nyx.contenido_bloques b
where c.bloque_id = b.id
  and b.clave = 'nosotros'
  and c.clave = 'parrafo';

select valor_es as "español", valor_en as "inglés"
from nyx.contenido_campos c
join nyx.contenido_bloques b on b.id = c.bloque_id
where b.clave = 'nosotros' and c.clave = 'parrafo';
