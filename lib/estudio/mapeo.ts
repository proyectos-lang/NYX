/**
 * Estudio de diseño — mapeo de la textura sobre la malla.
 *
 * Esta es la pieza central del visor, y la menos evidente.
 *
 * Los modelos de prenda suelen venir con UVs pensadas para una tela estampada
 * que se repite, no para colocar un diseño encima. Un .glb real puede traer
 * UVs de -387 a 298 (unas 686 repeticiones de la textura) sin que un solo
 * vértice caiga en el rango [0,1].
 *
 * El síntoma es desconcertante: un logo **tiñe toda la prenda de un color
 * plano** en vez de aparecer como imagen, porque cada punto de la malla
 * muestrea un píxel distinto del canvas y el logo acaba promediado.
 *
 * La solución es ignorar las UVs del archivo y regenerarlas con una proyección
 * planar frontal.
 *
 * Solo depende de `three`, no de @react-three/fiber: así este archivo sí entra
 * en la comprobación de tipos del proyecto (ver visor3d/README).
 */

import * as THREE from 'three'
import type { Mapeo } from './tipos'

/**
 * ¿Es una malla?
 *
 * Se mira la marca `isMesh` y NO `instanceof THREE.Mesh`, que es como lo hace
 * el propio three internamente y por el mismo motivo: `instanceof` falla si en
 * el paquete acaban dos copias de three. Aquí es un riesgo real, porque el
 * visor la importa de forma estática y el analizador del panel de forma
 * dinámica, así que pueden caer en chunks distintos.
 *
 * Cuando falla, falla en silencio y de la peor manera: el recorrido no
 * encuentra ninguna malla, no se sustituye ningún material y la prenda sale
 * blanca sin que nada dé error.
 */
export function esMalla(obj: THREE.Object3D): obj is THREE.Mesh {
  return (obj as THREE.Mesh).isMesh === true
}

/**
 * Regenera las UVs con una proyección planar frontal.
 *
 * Con `mapeo === 'original'` no toca nada: hay modelos bien desplegados a los
 * que la proyección les sentaría peor.
 */
export function aplicarMapeo(raiz: THREE.Object3D, mapeo: Mapeo): void {
  if (mapeo === 'original') return

  // TODO se calcula en el espacio de `raiz`, nunca en el del mundo.
  //
  // Esto costó un fallo real. Antes la caja se medía con
  // `Box3().setFromObject(raiz)`, que trabaja en coordenadas del mundo,
  // mientras que las posiciones de los vértices son locales. En el visor la
  // prenda cuelga de un grupo con escala ~0,014 para normalizarla, así que la
  // caja daba ~1 unidad y los vértices seguían valiendo ~73: las UVs salían
  // disparadas a 73 en vez de quedarse en [0,1], la textura se recortaba
  // contra el borde y la prenda aparecía sin color ni logo.
  //
  // Trabajar respecto a `raiz` lo arregla y además cubre los modelos cuyas
  // mallas traen transformaciones propias en sus nodos, que antes tampoco se
  // tenían en cuenta.
  raiz.updateWorldMatrix(true, true)
  const aRaiz = new THREE.Matrix4().copy(raiz.matrixWorld).invert()

  const mallas: { geo: THREE.BufferGeometry; aLocal: THREE.Matrix4 }[] = []

  raiz.traverse((obj) => {
    if (!esMalla(obj)) return
    const geo = obj.geometry as THREE.BufferGeometry
    if (!geo.attributes.position) return

    mallas.push({
      geo,
      aLocal: new THREE.Matrix4().multiplyMatrices(aRaiz, obj.matrixWorld),
    })
  })

  if (mallas.length === 0) return

  // --- Primera pasada: la caja envolvente ----------------------------------
  const caja = new THREE.Box3()
  const punto = new THREE.Vector3()

  for (const { geo, aLocal } of mallas) {
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      caja.expandByPoint(punto.fromBufferAttribute(pos, i).applyMatrix4(aLocal))
    }
  }

  const min = caja.min
  const tam = caja.getSize(new THREE.Vector3())

  // Un modelo plano en algún eje no debe dar una división por cero.
  const anchoX = tam.x > 0 ? tam.x : 1
  const altoY = tam.y > 0 ? tam.y : 1

  // --- Segunda pasada: las UVs ---------------------------------------------
  const normal = new THREE.Vector3()
  const matrizNormal = new THREE.Matrix3()

  for (const { geo, aLocal } of mallas) {
    const pos = geo.attributes.position
    const nor = geo.attributes.normal

    matrizNormal.getNormalMatrix(aLocal)
    const uv = new Float32Array(pos.count * 2)

    for (let i = 0; i < pos.count; i++) {
      punto.fromBufferAttribute(pos, i).applyMatrix4(aLocal)

      // La normal en Z separa las dos caras de la prenda, y también hay que
      // llevarla al espacio de `raiz`: una manga girada en su nodo tendría la
      // normal apuntando a otro lado.
      let alFrente = true
      if (nor) {
        normal.fromBufferAttribute(nor, i).applyMatrix3(matrizNormal)
        alFrente = normal.z >= 0
      }

      const u = (punto.x - min.x) / anchoX

      // El atlas es frente|espalda: [0, 0.5) frente, [0.5, 1] espalda.
      //
      // La espalda se REFLEJA en U porque se mira desde el otro lado. Sin
      // reflejarla, un texto sale al revés como en un espejo.
      uv[i * 2] = alFrente ? u * 0.5 : 1 - u * 0.5
      uv[i * 2 + 1] = (punto.y - min.y) / altoY
    }

    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  }
}

// ---------------------------------------------------------------------------
// Normalización de escala
// ---------------------------------------------------------------------------

export interface AjusteModelo {
  /** Factor para llevar el modelo a ~1 unidad en su lado mayor. */
  escala: number
  /** Centro de la caja envolvente. */
  centro: { x: number; y: number; z: number }
}

/**
 * Mide el modelo para poder normalizarlo.
 *
 * Los .glb vienen en las unidades con que se exportaron. Uno real medía 68
 * unidades de ancho y estaba centrado en Y=136 —centímetros, no metros—: con
 * una cámara pensada para un objeto de ~1 unidad, la cámara queda **dentro** de
 * la prenda y solo se ve el gris de la cara interna.
 */
export function medirModelo(raiz: THREE.Object3D): AjusteModelo {
  const caja = new THREE.Box3().setFromObject(raiz)
  const tam = caja.getSize(new THREE.Vector3())
  const centro = caja.getCenter(new THREE.Vector3())

  const mayor = Math.max(tam.x, tam.y, tam.z)
  // Un modelo degenerado o vacío no debe dar una escala infinita.
  const escala = mayor > 0 && Number.isFinite(mayor) ? 1 / mayor : 1

  return { escala, centro: { x: centro.x, y: centro.y, z: centro.z } }
}

// ---------------------------------------------------------------------------
// Análisis de las UVs
// ---------------------------------------------------------------------------

export interface AnalisisUV {
  vertices: number
  /** Cuántos caen dentro de [0,1] en ambos ejes. */
  dentro: number
  /** Proporción 0–1. */
  proporcionDentro: number
  rango: { uMin: number; uMax: number; vMin: number; vMax: number }
  /** Lo que habría que usar según el análisis. */
  mapeoSugerido: Mapeo
}

/**
 * Umbral para decidir si las UVs del archivo sirven.
 *
 * No se exige el 100%: es normal que algún vértice se salga por las costuras.
 */
export const UMBRAL_UV_VALIDAS = 0.9

/**
 * Cuenta qué porcentaje de las UVs cae en [0,1] y sugiere el mapeo.
 *
 * Conviene ejecutarlo **al subir el modelo**, no en cada carga, y guardar la
 * decisión junto al archivo: así el usuario sabe en el momento si su .glb
 * sirve, en vez de descubrirlo al ver el resultado.
 */
export function analizarUV(raiz: THREE.Object3D): AnalisisUV {
  let vertices = 0
  let dentro = 0
  let uMin = Infinity
  let uMax = -Infinity
  let vMin = Infinity
  let vMax = -Infinity

  raiz.traverse((obj) => {
    if (!esMalla(obj)) return

    const geo = obj.geometry as THREE.BufferGeometry
    const uv = geo.attributes.uv
    if (!uv) return

    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i)
      const v = uv.getY(i)

      vertices++
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) dentro++

      if (u < uMin) uMin = u
      if (u > uMax) uMax = u
      if (v < vMin) vMin = v
      if (v > vMax) vMax = v
    }
  })

  // Sin UVs no hay nada que respetar: hay que proyectar.
  if (vertices === 0) {
    return {
      vertices: 0,
      dentro: 0,
      proporcionDentro: 0,
      rango: { uMin: 0, uMax: 0, vMin: 0, vMax: 0 },
      mapeoSugerido: 'proyeccion',
    }
  }

  const proporcionDentro = dentro / vertices

  return {
    vertices,
    dentro,
    proporcionDentro,
    rango: { uMin, uMax, vMin, vMax },

    // Se sugiere SIEMPRE proyección, incluso con las UVs del archivo en rango.
    //
    // Antes se sugería 'original' cuando el archivo venía bien desplegado, y
    // era la pregunta equivocada: que las UVs estén en [0,1] significa que el
    // modelo tiene un despliegue coherente, no que ese despliegue coincida con
    // el atlas frente|espalda que espera el estudio. Para un .glb de terceros
    // no coincide nunca, y el resultado es que el diseño sale descuadrado o
    // directamente no aparece.
    //
    // Y es justo lo que pasa con los modelos buenos: como traen UVs correctas,
    // se elegía 'original' y no funcionaban. Los malos, en cambio, sí.
    //
    // 'original' solo tiene sentido en un modelo desplegado a propósito para
    // este estudio, y eso lo sabe una persona, no el analizador. Se cambia a
    // mano desde el panel.
    mapeoSugerido: 'proyeccion',
  }
}
