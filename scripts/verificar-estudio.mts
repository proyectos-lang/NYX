/**
 * Comprobaciones del estudio que no necesitan navegador.
 *
 *     npm run verificar:estudio
 *
 * Cubre el normalizador de diseños y el historial. Lo que toca canvas o WebGL
 * no se puede comprobar aquí; para eso hay que abrir el estudio con un .glb
 * real.
 */

import { normalizarDiseno, disenoVacio, type DisenoEstudio } from '../lib/estudio/tipos.ts'
import {
  aplicar,
  deshacer,
  iniciar,
  puedeDeshacer,
  puedeRehacer,
  rehacer,
  MAXIMO_PASOS,
} from '../lib/estudio/historial.ts'

let fallos = 0

function comprobar(descripcion: string, condicion: boolean, detalle = ''): void {
  if (condicion) {
    console.log(`  ok    ${descripcion}`)
  } else {
    fallos++
    console.log(`  FALLA ${descripcion}${detalle ? ` — ${detalle}` : ''}`)
  }
}

console.log('\nNormalizador de disenos')

comprobar('null devuelve un diseno vacio valido', normalizarDiseno(null).color === '#FFFFFF')
comprobar('una cadena no rompe nada', normalizarDiseno('basura').logos.length === 0)

// El caso que motiva el normalizador: un diseno guardado antes de que
// existieran ciertos campos.
const antiguo = {
  version: 1,
  color: '#0B0B0B',
  logos: [{ url: '/logo.png' }], // sin x, y, ancho, opacidad, z, vista
}
const recuperado = normalizarDiseno(antiguo)

comprobar('conserva lo que el usuario si guardo', recuperado.color === '#0B0B0B')
comprobar('el logo sobrevive', recuperado.logos.length === 1)
comprobar('el logo se centra por defecto', recuperado.logos[0].x === 50 && recuperado.logos[0].y === 50)
comprobar('el logo recibe un id', Boolean(recuperado.logos[0].id))
comprobar('la vista por defecto es frontal', recuperado.logos[0].vista === 'frontal')

// Migracion: los disenos guardados cuando cada cara tenia su propio color y su
// textura. NYX no confecciona -- aplica el diseno sobre una prenda ya hecha --
// asi que eso desaparecio. Lo que no puede desaparecer es el trabajo del
// cliente: el color de la cara frontal es el que estaba mirando al guardar.
const porCaras = normalizarDiseno({
  caras: {
    frontal: { color: '#3A5A8C', textura: { url: '/t.png', escala: 2 } },
    trasera: { color: '#8C2F2F' },
  },
  logos: [{ url: '/l.png' }],
})

comprobar('un diseno con color por cara recupera el frontal', porCaras.color === '#3A5A8C')
comprobar('y no se pierden sus logos', porCaras.logos.length === 1)
comprobar(
  'la textura antigua se descarta sin romper nada',
  !('textura' in (porCaras as unknown as Record<string, unknown>))
)

// Valores fuera de rango que reventarian el dibujo.
const corrupto = normalizarDiseno({
  logos: [{ url: '/l.png', x: -40, y: 400, ancho: 0, opacidad: -2 }],
})

comprobar('las coordenadas se acotan a 0..100', corrupto.logos[0].x === 0 && corrupto.logos[0].y === 100)
comprobar('un ancho de 0 se corrige', corrupto.logos[0].ancho >= 1)
comprobar('una opacidad negativa se acota a 0', corrupto.logos[0].opacidad === 0)

console.log('')
console.log('Capas de texto')

// El caso que de verdad preocupa: un diseno guardado ANTES de que existieran
// los textos no trae la lista. Sin respaldo, el editor reventaria al
// recorrerla y el cliente perderia un trabajo que si habia guardado.
const sinTextos = normalizarDiseno({ color: '#fff', logos: [] })
comprobar('un diseno antiguo recibe la lista de textos', Array.isArray(sinTextos.textos))
comprobar('y llega vacia, no indefinida', sinTextos.textos.length === 0)

const conTexto = normalizarDiseno({
  textos: [
    { texto: 'NYX', fuente: 'impacto', x: 30, y: 40, tamano: 12, color: '#fff' },
    { texto: '   ' }, // solo espacios: no es un texto
    { fuente: 'sans' }, // sin contenido
    { texto: 'Fuera de rango', x: -50, y: 900, tamano: 999, opacidad: 4 },
  ],
})

comprobar('se descartan los textos vacios', conTexto.textos.length === 2)
comprobar('se conserva el contenido', conTexto.textos[0].texto === 'NYX')
comprobar('se conserva la tipografia', conTexto.textos[0].fuente === 'impacto')
comprobar('cada texto recibe un id', Boolean(conTexto.textos[0].id))
comprobar(
  'las coordenadas del texto se acotan',
  conTexto.textos[1].x === 0 && conTexto.textos[1].y === 100
)
comprobar('el tamano se acota', conTexto.textos[1].tamano <= 60)
comprobar('la opacidad del texto se acota a 1', conTexto.textos[1].opacidad === 1)
comprobar('un texto sin fuente cae en la de por defecto', conTexto.textos[1].fuente === 'sans')

// Un texto larguisimo no debe poder inflar el documento guardado.
const textoLargo = normalizarDiseno({ textos: [{ texto: 'a'.repeat(5000) }] })
comprobar('el contenido se recorta', textoLargo.textos[0].texto.length === 200)

console.log('')
console.log('Historial')

const a = disenoVacio()
const b: DisenoEstudio = { ...a, color: '#111111' }
const c: DisenoEstudio = { ...a, color: '#222222' }

let h = iniciar(a)
comprobar('al empezar no se puede deshacer', !puedeDeshacer(h))

h = aplicar(h, b)
h = aplicar(h, c)
comprobar('dos ediciones apilan dos pasos', h.pasado.length === 2)

h = deshacer(h)
comprobar('deshacer vuelve al anterior', h.presente === b)
comprobar('y habilita rehacer', puedeRehacer(h))

h = rehacer(h)
comprobar('rehacer avanza otra vez', h.presente === c)

// Una edicion nueva despues de deshacer descarta la rama abandonada.
h = deshacer(h)
h = aplicar(h, a)
comprobar('editar tras deshacer limpia el futuro', !puedeRehacer(h))

// La razon de ser de `fusionar`: un arrastre de raton.
let arrastre = iniciar(a)
arrastre = aplicar(arrastre, b) // al soltar el logo se registra el punto de partida
const pasosAntes = arrastre.pasado.length
for (let i = 0; i < 40; i++) arrastre = aplicar(arrastre, c, true)

comprobar(
  '40 pasos de arrastre no generan 40 estados',
  arrastre.pasado.length === pasosAntes,
  `${arrastre.pasado.length} pasos`
)
comprobar('pero el resultado del arrastre si se conserva', arrastre.presente === c)
comprobar('y un solo deshacer vuelve antes del arrastre', deshacer(arrastre).presente === a)

// Tope de memoria.
let largo = iniciar(a)
for (let i = 0; i < MAXIMO_PASOS + 30; i++) largo = aplicar(largo, { ...a, modeloId: String(i) })

comprobar(
  `el historial se corta en ${MAXIMO_PASOS}`,
  largo.pasado.length === MAXIMO_PASOS,
  `${largo.pasado.length}`
)
comprobar(
  'se descartan los mas antiguos, no los recientes',
  largo.pasado[largo.pasado.length - 1].modeloId === String(MAXIMO_PASOS + 28)
)

console.log('')
console.log(fallos === 0 ? 'Todo correcto.' : `${fallos} comprobacion(es) fallidas.`)
process.exit(fallos === 0 ? 0 : 1)
