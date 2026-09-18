/**
 * Estudio de diseño — modelo de datos.
 *
 * Dos reglas que sostienen todo lo demás:
 *
 * 1. Las coordenadas van en **porcentaje 0–100**, nunca en píxeles. Así el
 *    documento no depende de la resolución a la que se compuso la textura: el
 *    mismo diseño sirve para una miniatura y para un atlas de 2048.
 *
 * 2. El diseño se guarda como **documento de capas**, no como imagen. Guardar
 *    solo el PNG deja el trabajo imposible de retomar.
 */

export type Vista = 'frontal' | 'trasera'

export const VISTAS: Vista[] = ['frontal', 'trasera']

export const ETIQUETA_VISTA: Record<Vista, string> = {
  frontal: 'Frontal',
  trasera: 'Trasera',
}

export interface CapaLogo {
  id: string
  url: string
  nombre: string
  vista: Vista
  /** Centro, % del ancho. */
  x: number
  /** Centro, % del alto. */
  y: number
  /** % del ancho. El alto sale de la proporción real de la imagen. */
  ancho: number
  /** Grados. */
  rotacion: number
  /** 0–1. */
  opacidad: number
  /** Orden de apilado; mayor va encima. */
  z: number
}

export interface CapaTextura {
  url: string
  nombre: string
  /** Tamaño del mosaico. */
  escala: number
  opacidad: number
  /** Grados. */
  rotacion: number
}

export interface CaraDiseno {
  /** Hex del fondo. */
  color: string
  textura: CapaTextura | null
}

export interface DisenoEstudio {
  version: 1
  modeloId: string | null
  caras: Record<Vista, CaraDiseno>
  /** De ambas caras; se filtran por `vista` al pintar. */
  logos: CapaLogo[]
}

/**
 * Cómo se mapea la textura sobre la malla.
 *
 * - `original`: se respetan las UVs del archivo .glb.
 * - `proyeccion`: se regeneran con una proyección planar frontal.
 *
 * Lo decide el analizador al subir el modelo; ver visor3d/analisis.ts.
 */
export type Mapeo = 'original' | 'proyeccion'

export interface Modelo3D {
  id: string
  nombre: string
  archivoUrl: string
  mapeo: Mapeo
  /** Factor para llevar el modelo a ~1 unidad. */
  escala: number
  /** Centro de la caja envolvente, para trasladarlo al origen. */
  centro: { x: number; y: number; z: number }
  /** Materiales que no se pintan: cremalleras, botones, cordones. */
  materialesExcluidos: string[]
}

// ---------------------------------------------------------------------------
// Valores por defecto y normalización
// ---------------------------------------------------------------------------

export const COLOR_POR_DEFECTO = '#FFFFFF'

export function caraVacia(): CaraDiseno {
  return { color: COLOR_POR_DEFECTO, textura: null }
}

export function disenoVacio(modeloId: string | null = null): DisenoEstudio {
  return {
    version: 1,
    modeloId,
    caras: { frontal: caraVacia(), trasera: caraVacia() },
    logos: [],
  }
}

function numero(valor: unknown, porDefecto: number): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : porDefecto
}

function acotar(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor))
}

function texto(valor: unknown, porDefecto = ''): string {
  return typeof valor === 'string' ? valor : porDefecto
}

function normalizarTextura(crudo: unknown): CapaTextura | null {
  if (!crudo || typeof crudo !== 'object') return null
  const t = crudo as Record<string, unknown>
  const url = texto(t.url)
  if (!url) return null

  return {
    url,
    nombre: texto(t.nombre, 'Textura'),
    // Una escala de 0 o negativa deja el patrón invisible o invertido.
    escala: Math.max(0.05, numero(t.escala, 1)),
    opacidad: acotar(numero(t.opacidad, 1), 0, 1),
    rotacion: numero(t.rotacion, 0),
  }
}

function normalizarLogo(crudo: unknown, indice: number): CapaLogo | null {
  if (!crudo || typeof crudo !== 'object') return null
  const l = crudo as Record<string, unknown>
  const url = texto(l.url)
  if (!url) return null

  const vista: Vista = l.vista === 'trasera' ? 'trasera' : 'frontal'

  return {
    id: texto(l.id) || `logo-${indice}-${Math.random().toString(36).slice(2, 8)}`,
    url,
    nombre: texto(l.nombre, 'Logo'),
    vista,
    x: acotar(numero(l.x, 50), 0, 100),
    y: acotar(numero(l.y, 50), 0, 100),
    ancho: acotar(numero(l.ancho, 25), 1, 100),
    rotacion: numero(l.rotacion, 0),
    opacidad: acotar(numero(l.opacidad, 1), 0, 1),
    z: numero(l.z, indice),
  }
}

/**
 * Rellena lo que falte al leer un diseño de la base de datos.
 *
 * Un diseño guardado hace semanas puede no tener campos añadidos después. Sin
 * esto el editor revienta con `undefined` en vez de mostrar lo que el usuario
 * sí guardó, que es mucho peor que perder un ajuste nuevo.
 */
export function normalizarDiseno(crudo: unknown): DisenoEstudio {
  if (!crudo || typeof crudo !== 'object') return disenoVacio()

  const d = crudo as Record<string, unknown>
  const carasCrudas = (d.caras ?? {}) as Record<string, unknown>

  const caras = {} as Record<Vista, CaraDiseno>
  for (const vista of VISTAS) {
    const cara = (carasCrudas[vista] ?? {}) as Record<string, unknown>
    caras[vista] = {
      color: texto(cara.color, COLOR_POR_DEFECTO) || COLOR_POR_DEFECTO,
      textura: normalizarTextura(cara.textura),
    }
  }

  const logos = Array.isArray(d.logos)
    ? d.logos
        .map((l, i) => normalizarLogo(l, i))
        .filter((l): l is CapaLogo => l !== null)
    : []

  return {
    version: 1,
    modeloId: typeof d.modeloId === 'string' ? d.modeloId : null,
    caras,
    logos,
  }
}

// ---------------------------------------------------------------------------
// Contrato del visor 3D
//
// Vive aqui, y no junto a la implementacion, porque esa carpeta esta excluida
// de la comprobacion de tipos (ver componentes/estudio/visor/README.md). Este
// archivo es el unico punto en el que el resto del proyecto y el visor se
// ponen de acuerdo.
// ---------------------------------------------------------------------------

export interface PropsVisor {
  modelo: Modelo3D
  diseno: DisenoEstudio
  /**
   * Entrega una funcion que devuelve el lienzo como PNG en base64, o null si
   * todavia no hay nada que capturar. Se llama una vez, al montar.
   */
  alPoderCapturar?: (capturar: () => string | null) => void
}
