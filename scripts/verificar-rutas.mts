/**
 * Comprueba que las rutas que se refrescan existen de verdad.
 *
 *     npm run verificar:rutas
 *
 * POR QUÉ EXISTE
 *
 * `revalidatePath('/catalogo')` con una ruta que no existe NO da error. No
 * lanza, no avisa por consola, no falla el build: simplemente no refresca
 * nada. El panel dice "Guardado", la base se actualiza, y la web sigue
 * enseñando lo de antes.
 *
 * Eso paso de verdad: el sitio publico se movio a /[idioma]/... y las cuatro
 * llamadas de refrescarPublico() se quedaron apuntando a las rutas viejas.
 * Desde el panel todo parecia correcto.
 *
 * Esto compara cada ruta que se pasa a revalidatePath con las carpetas que hay
 * en app/. Es texto contra sistema de archivos, sin navegador ni base de
 * datos.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

let fallos = 0

function comprobar(descripcion: string, condicion: boolean, detalle = ''): void {
  if (condicion) {
    console.log(`  ok    ${descripcion}`)
  } else {
    fallos++
    console.log(`  FALLA ${descripcion}${detalle ? ` — ${detalle}` : ''}`)
  }
}

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

/**
 * Todas las rutas que Next sirve, deducidas de las carpetas de app/.
 *
 * Los grupos entre parentesis —(sitio), (admin)— no salen en la direccion, asi
 * que se saltan. Los segmentos dinamicos se conservan tal cual, porque es como
 * hay que escribirlos en revalidatePath.
 */
function rutasDeLaApp(dir: string, prefijo = ''): string[] {
  const salida: string[] = []

  for (const nombre of readdirSync(dir)) {
    const completo = join(dir, nombre)
    if (!statSync(completo).isDirectory()) continue
    if (nombre.startsWith('_') || nombre === 'node_modules') continue

    // Grupo de rutas: organiza carpetas pero no aparece en la direccion.
    const esGrupo = nombre.startsWith('(') && nombre.endsWith(')')
    const ruta = esGrupo ? prefijo : `${prefijo}/${nombre}`

    const hijos = readdirSync(completo)
    if (hijos.includes('page.tsx') || hijos.includes('page.ts')) {
      salida.push(ruta === '' ? '/' : ruta)
    }

    salida.push(...rutasDeLaApp(completo, ruta))
  }

  return salida
}

const rutas = new Set(rutasDeLaApp(join(raiz, 'app')))

console.log('')
console.log('Rutas que existen en app/')
console.log('  ' + [...rutas].sort().join('\n  '))

// ---------------------------------------------------------------------------
// Lo que se refresca
// ---------------------------------------------------------------------------

console.log('')
console.log('Rutas que se refrescan')

const ARCHIVOS = [
  'app/(admin)/panel/acciones.ts',
  'app/(admin)/login/acciones.ts',
  'app/[idioma]/(sitio)/carrito/acciones.ts',
  'app/[idioma]/(sitio)/cotizar/acciones.ts',
  'app/[idioma]/(sitio)/estudio/acciones.ts',
]

for (const archivo of ARCHIVOS) {
  let contenido: string
  try {
    contenido = readFileSync(join(raiz, archivo), 'utf8')
  } catch {
    continue
  }

  // Los comentarios se quitan antes de buscar. Si no, un comentario que
  // explique por que una ruta vieja ya no vale se leeria como si esa llamada
  // siguiera en el codigo, y la prueba se delataria a si misma.
  const codigo = contenido
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')

  // revalidatePath('...') con la ruta escrita literalmente. Las que se calculan
  // en una variable —revalidatePath(base)— no se pueden comprobar aqui: esas
  // van a /panel/..., que es el propio panel y siempre existe.
  const llamadas = [...codigo.matchAll(/revalidatePath\(\s*'([^']+)'/g)].map((m) => m[1])

  for (const ruta of new Set(llamadas)) {
    comprobar(
      `${archivo.split('/').pop()}: ${ruta}`,
      rutas.has(ruta),
      'esa ruta no existe en app/'
    )
  }
}

// ---------------------------------------------------------------------------
// El caso concreto que fallo
// ---------------------------------------------------------------------------

console.log('')
console.log('El sitio publico se refresca de verdad')

const acciones = readFileSync(join(raiz, 'app/(admin)/panel/acciones.ts'), 'utf8')

comprobar(
  'refrescarPublico apunta al layout del idioma',
  /refrescarPublico\(\)[\s\S]{0,200}revalidatePath\('\/\[idioma\]',\s*'layout'\)/.test(acciones),
  'sin eso, guardar en el panel no cambia la web'
)

// Las rutas viejas: si alguien las reintroduce, no refrescarian nada.
for (const vieja of ['/catalogo', '/cotizar', '/carrito']) {
  comprobar(
    `no queda un revalidatePath('${vieja}') sin idioma`,
    !acciones.includes(`revalidatePath('${vieja}')`),
    'esa ruta ya no existe: el sitio vive bajo /[idioma]'
  )
}

console.log('')
console.log(fallos === 0 ? 'Todo correcto.' : `${fallos} comprobacion(es) fallidas.`)
process.exit(fallos === 0 ? 0 : 1)
