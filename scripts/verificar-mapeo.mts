/**
 * Comprobación del mapeo de UVs, sin navegador ni GPU.
 *
 *     npm run verificar:mapeo
 *
 * Son las verificaciones que el visor no puede hacer por sí mismo: si estas
 * fallan, la prenda saldrá teñida de un color plano o con el texto de la
 * espalda al revés, y eso solo se descubre mirando.
 *
 * Node 24 ejecuta TypeScript directamente quitando los tipos, así que no hay
 * paso de compilación.
 */

import * as THREE from 'three'
import { readFileSync, existsSync } from 'node:fs'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { aplicarMapeo, analizarUV, medirModelo, UMBRAL_UV_VALIDAS } from '../lib/estudio/mapeo.ts'
import { MODELO_DEMO } from '../lib/estudio/modelo-demo.ts'

let fallos = 0

function comprobar(descripcion: string, condicion: boolean, detalle = ''): void {
  if (condicion) {
    console.log(`  ok    ${descripcion}`)
  } else {
    fallos++
    console.log(`  FALLA ${descripcion}${detalle ? ` — ${detalle}` : ''}`)
  }
}

/**
 * Prenda de mentira: dos planos enfrentados, como el frente y la espalda de una
 * camiseta. Se le meten UVs disparatadas a propósito, del estilo de las que
 * traen los .glb pensados para tela estampada.
 */
function prendaDePrueba(): THREE.Object3D {
  const raiz = new THREE.Group()

  for (const [nombre, z, normalZ] of [
    ['frente', 1, 1],
    ['espalda', -1, -1],
  ] as const) {
    // Plano de 68 unidades de ancho y 90 de alto, centrado en Y=136:
    // las mismas magnitudes absurdas que trae un modelo exportado en cm.
    const geo = new THREE.PlaneGeometry(68, 90, 4, 4)
    geo.translate(0, 136, z)

    const cuenta = geo.attributes.position.count

    // UVs de -387 a 298, es decir cientos de repeticiones del mosaico.
    const uvMalas = new Float32Array(cuenta * 2)
    for (let i = 0; i < cuenta; i++) {
      uvMalas[i * 2] = -387 + (685 * i) / cuenta
      uvMalas[i * 2 + 1] = -387 + (685 * i) / cuenta
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvMalas, 2))

    // Normales explícitas: son las que separan las dos caras.
    const normales = new Float32Array(cuenta * 3)
    for (let i = 0; i < cuenta; i++) normales[i * 3 + 2] = normalZ
    geo.setAttribute('normal', new THREE.BufferAttribute(normales, 3))

    const malla = new THREE.Mesh(geo, new THREE.MeshBasicMaterial())
    malla.name = nombre
    raiz.add(malla)
  }

  return raiz
}

console.log('\nUVs de origen (las del archivo)')
const raiz = prendaDePrueba()
const antes = analizarUV(raiz)

console.log(
  `  rango U ${antes.rango.uMin.toFixed(0)}..${antes.rango.uMax.toFixed(0)} · ` +
    `${antes.dentro} de ${antes.vertices} vertices dentro de [0,1]`
)
comprobar('se detectan como inservibles', antes.proporcionDentro < UMBRAL_UV_VALIDAS)
comprobar('se sugiere proyeccion', antes.mapeoSugerido === 'proyeccion')

console.log('\nUVs regeneradas')
aplicarMapeo(raiz, 'proyeccion')
const despues = analizarUV(raiz)

comprobar(
  'el 100% de los vertices cae en [0,1]',
  despues.dentro === despues.vertices,
  `${despues.dentro}/${despues.vertices}`
)

// Cada cara en su mitad del atlas, que es lo que evita que el frente muestre
// el diseño de la espalda.
let frenteFuera = 0
let espaldaFuera = 0
let uMinEspalda = Infinity

raiz.traverse((obj) => {
  if (!(obj instanceof THREE.Mesh)) return
  const uv = obj.geometry.attributes.uv
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i)
    if (obj.name === 'frente') {
      if (u > 0.5 + 1e-6) frenteFuera++
    } else {
      if (u < 0.5 - 1e-6) espaldaFuera++
      if (u < uMinEspalda) uMinEspalda = u
    }
  }
})

comprobar('el frente cae en la mitad [0, 0.5]', frenteFuera === 0, `${frenteFuera} fuera`)
comprobar('la espalda cae en la mitad [0.5, 1]', espaldaFuera === 0, `${espaldaFuera} fuera`)

// El reflejo de la espalda: el vertice de X minima del frente va a u=0, y el
// mismo vertice de la espalda debe ir a u=1, no a u=0.5. Sin eso, un texto en
// la espalda sale invertido como en un espejo.
let uFrenteEnXMin = NaN
let uEspaldaEnXMin = NaN
raiz.traverse((obj) => {
  if (!(obj instanceof THREE.Mesh)) return
  const pos = obj.geometry.attributes.position
  const uv = obj.geometry.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(pos.getX(i) - -34) < 1e-6) {
      if (obj.name === 'frente') uFrenteEnXMin = uv.getX(i)
      else uEspaldaEnXMin = uv.getX(i)
    }
  }
})

comprobar('el borde izquierdo del frente va a u=0', Math.abs(uFrenteEnXMin - 0) < 1e-6)
comprobar(
  'el mismo borde en la espalda va a u=1 (reflejado)',
  Math.abs(uEspaldaEnXMin - 1) < 1e-6,
  `u=${uEspaldaEnXMin}`
)

console.log('\nNormalizacion de escala')
const ajuste = medirModelo(raiz)
const lado = 90 // el alto es la dimension mayor del plano de prueba

comprobar(
  'el modelo se reduce a ~1 unidad',
  Math.abs(ajuste.escala * lado - 1) < 1e-6,
  `escala=${ajuste.escala}`
)
comprobar('el centro en Y se detecta en 136', Math.abs(ajuste.centro.y - 136) < 1e-6)
comprobar(
  'una camara a 1.9 queda fuera de la prenda ya normalizada',
  1.9 > (lado * ajuste.escala) / 2
)

console.log('\nCaso degenerado')
const vacio = new THREE.Group()
const ajusteVacio = medirModelo(vacio)
comprobar('un modelo vacio no da escala infinita', Number.isFinite(ajusteVacio.escala))


// ===========================================================================
// El .glb real que genera `npm run modelo:demo`
//
// Hasta aqui todo se probaba sobre una malla inventada en memoria. Esto carga
// el archivo de verdad, con su cabecera glTF y sus UVs de ExtrudeGeometry, que
// son exactamente del tipo que no sirve para colocar un diseno.
// ===========================================================================


const RUTA_GLB = 'public/modelos/camisa-demo.glb'

console.log('\nModelo .glb real')

if (!existsSync(RUTA_GLB)) {
  comprobar(`existe ${RUTA_GLB}`, false, 'ejecuta: npm run modelo:demo')
} else {
  const datos = readFileSync(RUTA_GLB)
  const buffer = datos.buffer.slice(datos.byteOffset, datos.byteOffset + datos.byteLength)

  const escena = await new Promise<THREE.Object3D>((resolver, rechazar) => {
    new GLTFLoader().parse(buffer as ArrayBuffer, '', (g) => resolver(g.scene), rechazar)
  })

  let mallas = 0
  escena.traverse((o) => {
    if (o instanceof THREE.Mesh) mallas++
  })

  comprobar('el archivo se parsea como glTF valido', mallas > 0, `${mallas} mallas`)

  // La forma del material importa: three solo interpreta un array cuando la
  // geometria tiene grupos, y envolver un material unico en un array de uno
  // deja la malla SIN DIBUJAR.
  let materialEnArray = false
  escena.traverse((o) => {
    if (o instanceof THREE.Mesh && Array.isArray(o.material)) materialEnArray = true
  })
  comprobar('el material NO viene envuelto en un array', !materialEnArray)

  const uvOriginal = analizarUV(escena)
  console.log(
    `  UVs del archivo: rango U ${uvOriginal.rango.uMin.toFixed(1)}..${uvOriginal.rango.uMax.toFixed(1)} · ` +
      `${(uvOriginal.proporcionDentro * 100).toFixed(1)}% dentro de [0,1]`
  )
  comprobar(
    'el analizador las descarta y pide proyeccion',
    uvOriginal.mapeoSugerido === 'proyeccion'
  )

  aplicarMapeo(escena, 'proyeccion')
  const uvFinal = analizarUV(escena)
  comprobar(
    'tras proyectar, el 100% cae en [0,1]',
    uvFinal.dentro === uvFinal.vertices,
    `${uvFinal.dentro}/${uvFinal.vertices}`
  )

  // Las dos mitades del atlas tienen que usarse de verdad: si todo cayera en
  // una, el frente mostraria tambien el diseno de la espalda.
  let enFrente = 0
  let enEspalda = 0
  escena.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    const uv = o.geometry.attributes.uv
    for (let i = 0; i < uv.count; i++) (uv.getX(i) < 0.5 ? enFrente++ : enEspalda++)
  })
  comprobar('se usan las dos mitades del atlas', enFrente > 0 && enEspalda > 0,
    `frente ${enFrente} / espalda ${enEspalda}`)

  const ajusteGlb = medirModelo(escena)
  console.log(
    `  normalizacion: escala ${ajusteGlb.escala.toFixed(5)} · ` +
      `centro y=${ajusteGlb.centro.y.toFixed(2)}`
  )
  comprobar('la escala lleva el modelo a ~1 unidad', Math.abs(ajusteGlb.escala) > 0 && Number.isFinite(ajusteGlb.escala))

  const cajaFinal = new THREE.Box3().setFromObject(escena)
  const mayor = Math.max(...cajaFinal.getSize(new THREE.Vector3()).toArray())
  comprobar(
    'la camara a 1.9 queda fuera de la prenda normalizada',
    1.9 > (mayor * ajusteGlb.escala) / 2
  )

  // Las medidas de MODELO_DEMO estan escritas a mano, como las que se guardan
  // en nyx.modelos_3d. Si alguien cambia la silueta del generador y se olvida
  // de actualizarlas, la prenda saldria descentrada o a destiempo de escala:
  // esto lo detecta antes de que llegue a producirse.
  comprobar(
    'MODELO_DEMO.escala coincide con el archivo',
    Math.abs(MODELO_DEMO.escala - ajusteGlb.escala) < 1e-6,
    `constante ${MODELO_DEMO.escala} vs archivo ${ajusteGlb.escala.toFixed(8)}`
  )
  comprobar(
    'MODELO_DEMO.centro coincide con el archivo',
    Math.abs(MODELO_DEMO.centro.x - ajusteGlb.centro.x) < 1e-4 &&
      Math.abs(MODELO_DEMO.centro.y - ajusteGlb.centro.y) < 1e-4 &&
      Math.abs(MODELO_DEMO.centro.z - ajusteGlb.centro.z) < 1e-4
  )
  comprobar(
    'MODELO_DEMO.mapeo coincide con lo que sugiere el analizador',
    MODELO_DEMO.mapeo === uvOriginal.mapeoSugerido
  )
}

console.log(fallos === 0 ? '\nTodo correcto.\n' : `\n${fallos} comprobacion(es) fallidas.\n`)
process.exit(fallos === 0 ? 0 : 1)
