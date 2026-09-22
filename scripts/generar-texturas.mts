/**
 * Genera las texturas predeterminadas del estudio.
 *
 *     npm run texturas
 *
 * Son PNG de 128x128 **teselables**: el patron continua sin costura al
 * repetirse, que es como los usa el compositor (createPattern con "repeat").
 *
 * Y son **semitransparentes en blanco y negro**, no estampados de color. Asi
 * la textura tine la prenda en vez de taparla: la misma malla deportiva se ve
 * azul sobre una camisa azul y negra sobre una negra. Un patron de color fijo
 * obligaria a tener una version por cada color del catalogo.
 *
 * El PNG se escribe a mano porque generar imagenes en Node sin dependencias es
 * esto o arrastrar una libreria de canvas entera para seis archivos de 2 KB.
 */

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const LADO = 128
const DESTINO = 'public/texturas'

// ---------------------------------------------------------------------------
// Codificador PNG
// ---------------------------------------------------------------------------

const TABLA_CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(datos: Buffer): number {
  let c = 0xffffffff
  for (const b of datos) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function trozo(tipo: string, datos: Buffer): Buffer {
  const longitud = Buffer.alloc(4)
  longitud.writeUInt32BE(datos.length, 0)

  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos])

  const suma = Buffer.alloc(4)
  suma.writeUInt32BE(crc32(cuerpo), 0)

  return Buffer.concat([longitud, cuerpo, suma])
}

/** `pixeles` va en RGBA, cuatro bytes por punto. */
function codificarPNG(ancho: number, alto: number, pixeles: Buffer): Buffer {
  // Cada fila lleva delante un byte de filtro; 0 = sin filtrar.
  const crudo = Buffer.alloc((ancho * 4 + 1) * alto)
  for (let y = 0; y < alto; y++) {
    crudo[y * (ancho * 4 + 1)] = 0
    pixeles.copy(crudo, y * (ancho * 4 + 1) + 1, y * ancho * 4, (y + 1) * ancho * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(ancho, 0)
  ihdr.writeUInt32BE(alto, 4)
  ihdr[8] = 8 // bits por canal
  ihdr[9] = 6 // color RGBA
  ihdr[10] = 0 // deflate
  ihdr[11] = 0 // filtro adaptativo
  ihdr[12] = 0 // sin entrelazado

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr),
    trozo('IDAT', deflateSync(crudo, { level: 9 })),
    trozo('IEND', Buffer.alloc(0)),
  ])
}

// ---------------------------------------------------------------------------
// Patrones
//
// Cada funcion recibe la coordenada y devuelve [luz, alfa]: `luz` es 0 para
// negro y 255 para blanco, `alfa` cuanto tapa. Todo en 0..255.
// ---------------------------------------------------------------------------

type Patron = (x: number, y: number) => [number, number]

/** Distancia al centro del circulo mas cercano de una rejilla, con envoltura. */
function aRejilla(x: number, y: number, paso: number, desfase = 0): number {
  const fila = Math.floor(y / paso)
  const cx = ((Math.floor((x - (fila % 2) * desfase) / paso) + 0.5) * paso + (fila % 2) * desfase)
  const cy = (fila + 0.5) * paso
  return Math.hypot(x - cx, y - cy)
}

const PATRONES: Record<string, { nombre: string; patron: Patron }> = {
  deportiva: {
    nombre: 'Deportiva',
    // Malla de agujeritos, como una camiseta de rejilla.
    patron: (x, y) => {
      const d = aRejilla(x, y, 8, 4)
      return d < 2.1 ? [0, 60] : d < 3 ? [255, 26] : [0, 0]
    },
  },

  rayas: {
    nombre: 'Rayas',
    // Diagonales: (x + y) es periodico en las dos direcciones, asi que tesela.
    patron: (x, y) => {
      const p = (x + y) % 16
      return p < 8 ? [0, 34] : [255, 18]
    },
  },

  cuadros: {
    nombre: 'Cuadros',
    patron: (x, y) => {
      const borde = x % 32 < 2 || y % 32 < 2
      const fino = x % 32 === 16 || y % 32 === 16
      if (borde) return [0, 48]
      if (fino) return [255, 24]
      return [0, 0]
    },
  },

  puntos: {
    nombre: 'Puntos',
    patron: (x, y) => (aRejilla(x, y, 16, 8) < 3.2 ? [0, 52] : [0, 0]),
  },

  camuflaje: {
    nombre: 'Camuflaje',
    // Suma de senos: es periodica por construccion, asi que tesela perfecto, y
    // al mezclar frecuencias distintas da manchas de aspecto organico.
    patron: (x, y) => {
      const t = (Math.PI * 2) / LADO
      const n =
        Math.sin(x * t * 2) * Math.cos(y * t * 3) +
        Math.sin((x + y) * t * 3) * 0.7 +
        Math.cos(x * t * 5 - y * t * 2) * 0.5

      if (n > 0.9) return [0, 70]
      if (n > 0.1) return [0, 38]
      if (n > -0.7) return [255, 20]
      return [0, 0]
    },
  },

  fibra: {
    nombre: 'Fibra',
    // Sarga 2x2: el tejido tipico de la fibra de carbono.
    patron: (x, y) => {
      const bloque = 8
      const bx = Math.floor(x / bloque) % 2
      const by = Math.floor(y / bloque) % 2
      const enX = bx === by
      const hebra = (enX ? y : x) % bloque
      const luz = hebra < 2 ? 0 : hebra > bloque - 3 ? 0 : 255
      return [luz, luz === 0 ? 42 : 20]
    },
  },
}

// ---------------------------------------------------------------------------

mkdirSync(DESTINO, { recursive: true })

const indice: { id: string; nombre: string; url: string }[] = []

for (const [id, { nombre, patron }] of Object.entries(PATRONES)) {
  const pixeles = Buffer.alloc(LADO * LADO * 4)

  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      const [luz, alfa] = patron(x, y)
      const i = (y * LADO + x) * 4
      pixeles[i] = luz
      pixeles[i + 1] = luz
      pixeles[i + 2] = luz
      pixeles[i + 3] = alfa
    }
  }

  const png = codificarPNG(LADO, LADO, pixeles)
  writeFileSync(`${DESTINO}/${id}.png`, png)

  indice.push({ id, nombre, url: `/texturas/${id}.png` })
  console.log(`  ${nombre.padEnd(12)} ${String(png.length).padStart(5)} bytes`)
}

console.log(`\n${indice.length} texturas en ${DESTINO}\n`)
