import type { Vista } from './tipos'

/**
 * Preajustes del estudio: texturas listas y sitios habituales para el logo.
 *
 * Existen porque una hoja en blanco con un botón de "sube un archivo" no
 * invita a nada. Con estos, el cliente prueba algo en dos clics y luego ya
 * ajusta.
 */

export interface TexturaPredefinida {
  id: string
  nombre: string
  url: string
  /** Tamaño del mosaico con el que se ve bien de entrada. */
  escala: number
  opacidad: number
}

/**
 * Los archivos los genera `npm run texturas`.
 *
 * Son blanco y negro semitransparentes, no estampados de color: así la textura
 * tiñe la prenda en vez de taparla, y la misma malla deportiva se ve azul
 * sobre una camisa azul. Con patrones de color haría falta una versión por
 * cada color del catálogo.
 */
export const TEXTURAS: TexturaPredefinida[] = [
  { id: 'deportiva', nombre: 'Deportiva', url: '/texturas/deportiva.png', escala: 1, opacidad: 0.85 },
  { id: 'rayas', nombre: 'Rayas', url: '/texturas/rayas.png', escala: 1, opacidad: 0.7 },
  { id: 'cuadros', nombre: 'Cuadros', url: '/texturas/cuadros.png', escala: 1, opacidad: 0.8 },
  { id: 'puntos', nombre: 'Puntos', url: '/texturas/puntos.png', escala: 1, opacidad: 0.75 },
  { id: 'camuflaje', nombre: 'Camuflaje', url: '/texturas/camuflaje.png', escala: 1.4, opacidad: 0.9 },
  { id: 'fibra', nombre: 'Fibra', url: '/texturas/fibra.png', escala: 0.7, opacidad: 0.65 },
]

export interface PosicionLogo {
  id: string
  nombre: string
  /** Centro, en % del ancho y del alto. */
  x: number
  y: number
  /** Ancho sugerido, en % del ancho. */
  ancho: number
  /** Cara en la que tiene sentido; si falta, vale para las dos. */
  vista?: Vista
}

/**
 * Sitios habituales donde va un logo en una prenda.
 *
 * Son puntos de partida, no posiciones exactas: la textura se proyecta sobre
 * la silueta completa, así que el sitio fino depende de cada modelo. Después
 * de aplicar uno, el logo se sigue pudiendo arrastrar en el editor.
 */
export const POSICIONES: PosicionLogo[] = [
  { id: 'pecho-izq', nombre: 'Pecho izquierdo', x: 34, y: 32, ancho: 14, vista: 'frontal' },
  { id: 'pecho-der', nombre: 'Pecho derecho', x: 66, y: 32, ancho: 14, vista: 'frontal' },
  { id: 'pecho-centro', nombre: 'Centro del pecho', x: 50, y: 36, ancho: 28, vista: 'frontal' },
  { id: 'frontal-grande', nombre: 'Frontal grande', x: 50, y: 50, ancho: 52, vista: 'frontal' },
  { id: 'nuca', nombre: 'Nuca', x: 50, y: 22, ancho: 16, vista: 'trasera' },
  { id: 'espalda', nombre: 'Espalda completa', x: 50, y: 46, ancho: 58, vista: 'trasera' },
  { id: 'manga-izq', nombre: 'Manga izquierda', x: 11, y: 36, ancho: 11 },
  { id: 'manga-der', nombre: 'Manga derecha', x: 89, y: 36, ancho: 11 },
]
