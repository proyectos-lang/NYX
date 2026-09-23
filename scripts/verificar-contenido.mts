/**
 * Comprueba que el contenido editable y la web hablan del mismo sitio.
 *
 *     npm run verificar:contenido
 *
 * POR QUÉ EXISTE
 *
 * El seed y la portada se habían desincronizado sin que nadie lo notara, y el
 * fallo es de los peores que hay: el panel enseñaba campos que la web no leía.
 * Se editaban, se guardaban sin error y no cambiaba nada en pantalla. Desde el
 * panel es indistinguible de un fallo al guardar.
 *
 * Esto lee las claves que `app/[idioma]/(sitio)/page.tsx` consume de verdad y las
 * compara con las que `supabase/contenido-inicial.sql` inserta. No necesita
 * base de datos: es texto contra texto.
 */

import { readFileSync } from 'node:fs'

let fallos = 0

function comprobar(descripcion: string, condicion: boolean, detalle = ''): void {
  if (condicion) {
    console.log(`  ok    ${descripcion}`)
  } else {
    fallos++
    console.log(`  FALLA ${descripcion}${detalle ? ` — ${detalle}` : ''}`)
  }
}

const portada = readFileSync(new URL('../app/[idioma]/(sitio)/page.tsx', import.meta.url), 'utf8')
const sql = readFileSync(new URL('../supabase/contenido-inicial.sql', import.meta.url), 'utf8')

// ---------------------------------------------------------------------------
// Campos de texto
// ---------------------------------------------------------------------------

console.log('')
console.log('Textos editables')

/**
 * Los campos que la portada lee, escritos a mano.
 *
 * Se listan en vez de deducirlos del .tsx a fuerza de expresiones regulares
 * porque la portada los consulta de varias formas —`portada.titular`,
 * `proceso[clave]`, `${clave}-detalle`— y una regex que las cubriera todas
 * sería más frágil que la lista. Si se añade un campo nuevo a la web, se añade
 * aquí, y la prueba avisa si falta en el SQL.
 */
const CAMPOS: Record<string, string[]> = {
  portada: ['etiqueta', 'titular', 'titularEnfasis'],
  'como-funciona': [
    'paso-01', 'paso-01-detalle',
    'paso-02', 'paso-02-detalle',
    'paso-03', 'paso-03-detalle',
    'paso-04', 'paso-04-detalle',
  ],
  empresas: ['titular', 'parrafo', 'etiquetas'],
  nosotros: ['titular', 'parrafo', 'cifra1', 'cifra1Detalle', 'cifra2', 'cifra2Detalle'],
}

for (const [bloque, claves] of Object.entries(CAMPOS)) {
  for (const clave of claves) {
    comprobar(
      `${bloque}.${clave} se carga en la base`,
      sql.includes(`('${bloque}', '${clave}',`)
    )
  }
}

// El otro lado del desajuste: un campo en el SQL que la web no lee sale en el
// panel, se guarda bien y no cambia nada. Es más difícil de detectar que el
// que falta, porque nada falla.
console.log('')
console.log('Campos que nadie lee')

for (const huerfano of ['apoyo', 'botones', 'cifras']) {
  comprobar(
    `'${huerfano}' ya no se inserta`,
    !new RegExp(`\\('(portada|nosotros)', '${huerfano}',`).test(sql)
  )
}

// ---------------------------------------------------------------------------
// Imágenes
// ---------------------------------------------------------------------------

console.log('')
console.log('Imágenes editables')

const HUECOS: Record<string, string[]> = {
  portada: ['hero-1', 'hero-2', 'hero-3'],
  'trabajos-reales': Array.from(
    { length: 12 },
    (_, i) => `mosaico-${String(i + 1).padStart(2, '0')}`
  ),
  'como-funciona': ['proceso-muestra'],
  empresas: ['empresas-foto', 'empresas-video'],
  nosotros: ['nosotros-logo', 'nosotros-foto'],
}

for (const [bloque, claves] of Object.entries(HUECOS)) {
  for (const clave of claves) {
    comprobar(
      `${bloque}/${clave} se carga en la base`,
      sql.includes(`('${bloque}', '${clave}',`)
    )
  }
}

// Que el bloque exista: sin él, el `join` del SQL descarta sus imágenes en
// silencio y la carga parece correcta aunque no inserte nada.
console.log('')
console.log('Bloques')

for (const bloque of Object.keys(HUECOS)) {
  comprobar(`el bloque '${bloque}' se crea`, sql.includes(`('${bloque}',`))
}

// ---------------------------------------------------------------------------
// La portada no debe volver a tener rutas fijas
// ---------------------------------------------------------------------------

console.log('')
console.log('La portada lee de la base')

comprobar('pide las imágenes editables', portada.includes('obtenerMedia()'))

// Las rutas siguen en el archivo como valor por defecto, pero solo dentro de
// una llamada a media(...) o de FOTOS_PORTADA. Una ruta suelta en un src=""
// sería una imagen que el panel no puede cambiar.
const rutasSueltas = [...portada.matchAll(/src="(\/assets\/[^"]+)"/g)].map((m) => m[1])
comprobar(
  'ninguna imagen queda fuera del panel',
  rutasSueltas.length === 0,
  rutasSueltas.join(', ')
)

console.log('')
console.log(fallos === 0 ? 'Todo correcto.' : `${fallos} comprobacion(es) fallidas.`)
process.exit(fallos === 0 ? 0 : 1)
