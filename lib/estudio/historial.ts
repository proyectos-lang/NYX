/**
 * Estudio de diseño — deshacer y rehacer.
 *
 * Toda edición pasa por `aplicar`, que es lo que mantiene el historial
 * coherente: si alguna ruta escribiera el estado por su cuenta, deshacer
 * saltaría a un punto que nunca existió.
 *
 * Puro y sin React, para poder comprobarlo sin navegador.
 */

export interface Historial<T> {
  pasado: T[]
  presente: T
  futuro: T[]
}

/**
 * Tope de estados guardados.
 *
 * Un diseño con logos y texturas no es pequeño; sin tope, una sesión larga de
 * edición acaba reteniendo cientos de copias en memoria.
 */
export const MAXIMO_PASOS = 50

export function iniciar<T>(presente: T): Historial<T> {
  return { pasado: [], presente, futuro: [] }
}

/**
 * Registra un estado nuevo.
 *
 * `fusionar` sustituye el estado actual en lugar de apilar uno nuevo. Es lo que
 * usa el arrastre de un logo: sin ello, mover un logo generaría decenas de
 * estados y deshacer se volvería inútil —habría que pulsarlo treinta veces para
 * volver al punto anterior—. El punto de partida ya quedó guardado al empezar
 * el arrastre.
 */
export function aplicar<T>(h: Historial<T>, siguiente: T, fusionar = false): Historial<T> {
  if (fusionar) {
    return { pasado: h.pasado, presente: siguiente, futuro: [] }
  }

  const pasado = [...h.pasado, h.presente]

  return {
    // Se descartan los más antiguos, no los recientes.
    pasado: pasado.length > MAXIMO_PASOS ? pasado.slice(pasado.length - MAXIMO_PASOS) : pasado,
    presente: siguiente,
    // Cualquier edición nueva invalida lo que hubiera por rehacer.
    futuro: [],
  }
}

export function puedeDeshacer<T>(h: Historial<T>): boolean {
  return h.pasado.length > 0
}

export function puedeRehacer<T>(h: Historial<T>): boolean {
  return h.futuro.length > 0
}

export function deshacer<T>(h: Historial<T>): Historial<T> {
  if (h.pasado.length === 0) return h

  const anterior = h.pasado[h.pasado.length - 1]

  return {
    pasado: h.pasado.slice(0, -1),
    presente: anterior,
    futuro: [h.presente, ...h.futuro],
  }
}

export function rehacer<T>(h: Historial<T>): Historial<T> {
  if (h.futuro.length === 0) return h

  const siguiente = h.futuro[0]

  return {
    pasado: [...h.pasado, h.presente],
    presente: siguiente,
    futuro: h.futuro.slice(1),
  }
}
