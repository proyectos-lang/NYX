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

comprobar('null devuelve un diseno vacio valido', normalizarDiseno(null).caras.frontal.color === '#FFFFFF')
comprobar('una cadena no rompe nada', normalizarDiseno('basura').logos.length === 0)

// El caso que motiva el normalizador: un diseno guardado antes de que
// existieran ciertos campos.
const antiguo = {
  version: 1,
  caras: { frontal: { color: '#0B0B0B' } }, // sin textura, sin cara trasera
  logos: [{ url: '/logo.png' }], // sin x, y, ancho, opacidad, z, vista
}
const recuperado = normalizarDiseno(antiguo)

comprobar('conserva lo que el usuario si guardo', recuperado.caras.frontal.color === '#0B0B0B')
comprobar('inventa la cara que falta', recuperado.caras.trasera.color === '#FFFFFF')
comprobar('el logo sobrevive', recuperado.logos.length === 1)
comprobar('el logo se centra por defecto', recuperado.logos[0].x === 50 && recuperado.logos[0].y === 50)
comprobar('el logo recibe un id', Boolean(recuperado.logos[0].id))
comprobar('la vista por defecto es frontal', recuperado.logos[0].vista === 'frontal')

// Valores fuera de rango que reventarian el dibujo.
const corrupto = normalizarDiseno({
  caras: { frontal: { color: '#fff', textura: { url: '/t.png', escala: 0, opacidad: 9 } } },
  logos: [{ url: '/l.png', x: -40, y: 400, ancho: 0, opacidad: -2 }],
})

comprobar('una escala de 0 se corrige', (corrupto.caras.frontal.textura?.escala ?? 0) > 0)
comprobar('la opacidad se acota a 1', corrupto.caras.frontal.textura?.opacidad === 1)
comprobar('las coordenadas se acotan a 0..100', corrupto.logos[0].x === 0 && corrupto.logos[0].y === 100)
comprobar('un ancho de 0 se corrige', corrupto.logos[0].ancho >= 1)
comprobar('una opacidad negativa se acota a 0', corrupto.logos[0].opacidad === 0)

// Una textura sin url no es una textura.
const sinUrl = normalizarDiseno({ caras: { frontal: { textura: { nombre: 'X' } } } })
comprobar('una textura sin url se descarta', sinUrl.caras.frontal.textura === null)

console.log('\nCapas de texto')

// El caso que de verdad preocupa: un diseno guardado ANTES de que existieran
// los textos no trae la lista. Sin respaldo, el editor reventaria al
// recorrerla y el cliente perderia un trabajo que si habia guardado.
const sinTextos = normalizarDiseno({ caras: { frontal: { color: '#fff' } }, logos: [] })
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
  'las coordenadas se acotan a 0..100',
  conTexto.textos[1].x === 0 && conTexto.textos[1].y === 100
)
comprobar('el tamano se acota', conTexto.textos[1].tamano <= 60)
comprobar('la opacidad se acota a 1', conTexto.textos[1].opacidad === 1)
comprobar('un texto sin fuente cae en la de por defecto', conTexto.textos[1].fuente === 'sans')

// Un texto larguisimo no debe poder inflar el documento guardado.
const textoLargo = normalizarDiseno({ textos: [{ texto: 'a'.repeat(5000) }] })
comprobar('el contenido se recorta', textoLargo.textos[0].texto.length === 200)

console.log('\nHistorial')

const a = disenoVacio()
const b: DisenoEstudio = { ...a, caras: { ...a.caras, frontal: { color: '#111', textura: null } } }
const c: DisenoEstudio = { ...a, caras: { ...a.caras, frontal: { color: '#222', textura: null } } }

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

console.log(fallos === 0 ? '\nTodo correcto.\n' : `\n${fallos} comprobacion(es) fallidas.\n`)
process.exit(fallos === 0 ? 0 : 1)
