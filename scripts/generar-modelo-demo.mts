/**
 * Genera un .glb de camisa para poder probar el visor.
 *
 *     npm run modelo:demo
 *
 * No es un modelo de producción: es una silueta extruida, sin arrugas, sin
 * costuras y sin caída de tela. Sirve para lo que hasta ahora no se podía
 * comprobar —que el diseño se aplique de verdad sobre una malla, que las caras
 * caigan en su mitad del atlas y que la cámara encuadre la prenda— y para que
 * el estudio tenga algo que enseñar mientras no haya un .glb real.
 *
 * El GLB se escribe a mano en vez de usar GLTFExporter: el exportador de three
 * depende de APIs del navegador (FileReader, Blob) que en Node no están
 * completas, y el contenedor glTF binario es lo bastante simple como para no
 * arrastrar esa dependencia.
 */

import * as THREE from 'three'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

// ---------------------------------------------------------------------------
// Silueta
// ---------------------------------------------------------------------------

/**
 * Contorno de camisa en unidades tipo centímetro: ~70 de ancho y ~70 de alto.
 *
 * Se usan magnitudes "de exportación real" a propósito, no un modelo de 1
 * unidad ya normalizado: así el .glb ejercita el mismo camino de normalización
 * que tendrá que aguantar cualquier archivo que suba el cliente.
 */
function siluetaCamisa(): THREE.Shape {
  const s = new THREE.Shape()

  s.moveTo(-7, 67) // cuello, lado izquierdo
  s.lineTo(-21, 70) // hombro izquierdo
  s.lineTo(-35, 60) // manga izquierda, arriba
  s.lineTo(-31, 43) // manga izquierda, abajo
  s.lineTo(-21, 48) // axila izquierda
  s.lineTo(-23, 3) // costado izquierdo
  s.quadraticCurveTo(-23, 0, -20, 0) // esquina del dobladillo
  s.lineTo(20, 0)
  s.quadraticCurveTo(23, 0, 23, 3) // esquina derecha
  s.lineTo(21, 48) // axila derecha
  s.lineTo(31, 43) // manga derecha, abajo
  s.lineTo(35, 60) // manga derecha, arriba
  s.lineTo(21, 70) // hombro derecho
  s.lineTo(7, 67) // cuello, lado derecho
  s.quadraticCurveTo(0, 61, -7, 67) // escote

  return s
}

function construirGeometria(): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(siluetaCamisa(), {
    depth: 13,
    bevelEnabled: true,
    bevelThickness: 2.2,
    bevelSize: 1.6,
    bevelSegments: 3,
    curveSegments: 12,
  })

  // La extrusión crece hacia +Z desde z=0; se centra para que el grosor quede
  // repartido y la cara frontal mire a la cámara.
  geo.center()
  geo.computeVertexNormals()

  // Sin grupos: una sola primitiva y un solo material. Con grupos, three
  // esperaría un array de materiales y el visor tendría que conservar esa forma.
  geo.clearGroups()

  return geo
}

// ---------------------------------------------------------------------------
// Escritura del GLB
// ---------------------------------------------------------------------------

function alinear(n: number): number {
  return (4 - (n % 4)) % 4
}

function exportarGLB(geo: THREE.BufferGeometry, nombre: string): Buffer {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const nor = geo.getAttribute('normal') as THREE.BufferAttribute
  const uvAttr = geo.getAttribute('uv') as THREE.BufferAttribute | undefined
  const idx = geo.getIndex()

  const posiciones = new Float32Array(pos.array)
  const normales = new Float32Array(nor.array)

  // Las UVs del archivo se incluyen tal cual las genera ExtrudeGeometry, que
  // NO sirven para colocar un diseño: es justo lo que el analizador debe
  // detectar y lo que aplicarMapeo() regenera.
  const uvs = uvAttr
    ? new Float32Array(uvAttr.array)
    : new Float32Array((posiciones.length / 3) * 2)

  const indices = idx
    ? new Uint32Array(idx.array)
    : new Uint32Array(Array.from({ length: posiciones.length / 3 }, (_, i) => i))

  // Caja envolvente: glTF exige min/max en el accessor de POSITION.
  geo.computeBoundingBox()
  const caja = geo.boundingBox!

  const partes = [
    { datos: Buffer.from(posiciones.buffer, posiciones.byteOffset, posiciones.byteLength) },
    { datos: Buffer.from(normales.buffer, normales.byteOffset, normales.byteLength) },
    { datos: Buffer.from(uvs.buffer, uvs.byteOffset, uvs.byteLength) },
    { datos: Buffer.from(indices.buffer, indices.byteOffset, indices.byteLength) },
  ]

  const vistas: { buffer: number; byteOffset: number; byteLength: number }[] = []
  const trozos: Buffer[] = []
  let desplazamiento = 0

  for (const parte of partes) {
    vistas.push({ buffer: 0, byteOffset: desplazamiento, byteLength: parte.datos.byteLength })
    trozos.push(parte.datos)
    desplazamiento += parte.datos.byteLength

    const relleno = alinear(desplazamiento)
    if (relleno) {
      trozos.push(Buffer.alloc(relleno))
      desplazamiento += relleno
    }
  }

  const binario = Buffer.concat(trozos)

  const gltf = {
    asset: { version: '2.0', generator: 'NYX · generar-modelo-demo' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: nombre }],
    meshes: [
      {
        name: nombre,
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
            indices: 3,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        name: 'Tela',
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorFactor: [1, 1, 1, 1],
          metallicFactor: 0,
          roughnessFactor: 0.8,
        },
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126, // FLOAT
        count: posiciones.length / 3,
        type: 'VEC3',
        min: [caja.min.x, caja.min.y, caja.min.z],
        max: [caja.max.x, caja.max.y, caja.max.z],
      },
      { bufferView: 1, componentType: 5126, count: normales.length / 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count: uvs.length / 2, type: 'VEC2' },
      { bufferView: 3, componentType: 5125, count: indices.length, type: 'SCALAR' }, // UNSIGNED_INT
    ],
    bufferViews: vistas,
    buffers: [{ byteLength: binario.byteLength }],
  }

  // --- Contenedor binario ---------------------------------------------------
  let json = Buffer.from(JSON.stringify(gltf), 'utf8')
  const rellenoJson = alinear(json.byteLength)
  if (rellenoJson) json = Buffer.concat([json, Buffer.alloc(rellenoJson, 0x20)]) // espacios

  const cabeceraJson = Buffer.alloc(8)
  cabeceraJson.writeUInt32LE(json.byteLength, 0)
  cabeceraJson.writeUInt32LE(0x4e4f534a, 4) // 'JSON'

  const cabeceraBin = Buffer.alloc(8)
  cabeceraBin.writeUInt32LE(binario.byteLength, 0)
  cabeceraBin.writeUInt32LE(0x004e4942, 4) // 'BIN\0'

  const total = 12 + 8 + json.byteLength + 8 + binario.byteLength

  const cabecera = Buffer.alloc(12)
  cabecera.writeUInt32LE(0x46546c67, 0) // 'glTF'
  cabecera.writeUInt32LE(2, 4) // versión
  cabecera.writeUInt32LE(total, 8)

  return Buffer.concat([cabecera, cabeceraJson, json, cabeceraBin, binario])
}

// ---------------------------------------------------------------------------

const destino = 'public/modelos/camisa-demo.glb'

const geo = construirGeometria()
const glb = exportarGLB(geo, 'Camisa')

mkdirSync(dirname(destino), { recursive: true })
writeFileSync(destino, glb)

const pos = geo.getAttribute('position')
geo.computeBoundingBox()
const tam = geo.boundingBox!.getSize(new THREE.Vector3())

console.log(`\nEscrito ${destino}`)
console.log(`  vertices   : ${pos.count}`)
console.log(`  triangulos : ${(geo.getIndex()?.count ?? pos.count) / 3}`)
console.log(
  `  tamano     : ${tam.x.toFixed(1)} x ${tam.y.toFixed(1)} x ${tam.z.toFixed(1)} unidades`
)
console.log(`  archivo    : ${(glb.byteLength / 1024).toFixed(1)} KB\n`)
