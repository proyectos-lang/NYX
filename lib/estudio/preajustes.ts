import type { Vista } from './tipos'

/**
 * Preajustes del estudio: colores de prenda, sitios habituales para las capas
 * y tipografias.
 *
 * Existen porque una hoja en blanco con un boton de "sube un archivo" no
 * invita a nada. Con estos, el cliente prueba algo en dos clics y luego ajusta.
 */

export interface ColorPrenda {
  hex: string
  nombre: string
}

/**
 * Colores de prenda.
 *
 * Uno solo se aplica a la prenda entera: NYX no confecciona, aplica el diseno
 * sobre una prenda ya hecha, asi que frente y espalda son del mismo color.
 *
 * Ordenados de claro a oscuro y luego por familia, que es como se mira una
 * carta de colores.
 */
export const COLORES: ColorPrenda[] = [
  // Neutros
  { hex: '#FFFFFF', nombre: 'Blanco' },
  { hex: '#F3EFE7', nombre: 'Hueso' },
  { hex: '#D9D4CC', nombre: 'Arena' },
  { hex: '#C9C9C9', nombre: 'Gris claro' },
  { hex: '#8A8A8A', nombre: 'Gris' },
  { hex: '#4A4A4A', nombre: 'Gris oscuro' },
  { hex: '#3A3733', nombre: 'Grafito' },
  { hex: '#0B0B0B', nombre: 'Negro' },

  // Calidos
  { hex: '#F2C9D4', nombre: 'Rosa' },
  { hex: '#E8927C', nombre: 'Coral' },
  { hex: '#C2452D', nombre: 'Rojo' },
  { hex: '#8C2F2F', nombre: 'Vino' },
  { hex: '#E9C877', nombre: 'Mostaza' },
  { hex: '#C99A2E', nombre: 'Oro NYX' },
  { hex: '#A8622A', nombre: 'Terracota' },
  { hex: '#6B4A2F', nombre: 'Chocolate' },

  // Frios
  { hex: '#CFE1F2', nombre: 'Celeste' },
  { hex: '#5B8FC7', nombre: 'Azul claro' },
  { hex: '#3A5A8C', nombre: 'Azul' },
  { hex: '#1E2A4A', nombre: 'Azul marino' },
  { hex: '#2438C9', nombre: 'Azul electrico' },
  { hex: '#7FB89A', nombre: 'Menta' },
  { hex: '#2F7A57', nombre: 'Verde' },
  { hex: '#1F3D2E', nombre: 'Verde bosque' },
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

export interface FuentePredefinida {
  id: string
  nombre: string
  /**
   * Variable CSS donde vive la familia real.
   *
   * No se guarda el nombre de la familia porque next/font genera nombres
   * ofuscados distintos en cada compilacion (`__Bebas_Neue_a1b2c3`). El
   * compositor la resuelve en tiempo de pintado leyendo la variable, que es
   * estable.
   */
  variable: string
  peso: number
  /** Como se ve en el selector, sin tener que aplicarla. */
  muestra: string
}

/**
 * Familias disponibles para los textos de la prenda.
 *
 * Cinco y muy distintas entre si: la utilidad aqui no es tener muchas, es que
 * de un vistazo se vea cual encaja. Las dos primeras ya las usa el sitio; las
 * otras tres se cargan solo en el estudio.
 */
export const FUENTES: FuentePredefinida[] = [
  { id: 'sans', nombre: 'Moderna', variable: '--fuente-sans', peso: 700, muestra: 'Aa' },
  { id: 'serif', nombre: 'Elegante', variable: '--fuente-serif', peso: 600, muestra: 'Aa' },
  { id: 'condensada', nombre: 'Condensada', variable: '--fuente-bebas', peso: 400, muestra: 'Aa' },
  { id: 'manuscrita', nombre: 'Manuscrita', variable: '--fuente-pacifico', peso: 400, muestra: 'Aa' },
  { id: 'impacto', nombre: 'Impacto', variable: '--fuente-archivo', peso: 400, muestra: 'Aa' },
]

export function buscarFuente(id: string): FuentePredefinida {
  return FUENTES.find((f) => f.id === id) ?? FUENTES[0]
}
