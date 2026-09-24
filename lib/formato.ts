/** Formateo compartido entre el sitio público y el panel. */

import { IDIOMA_POR_DEFECTO, type Idioma } from './i18n'

/**
 * El precio se escribe a la estadounidense: $11.20, no $11,20.
 *
 * NYX opera desde Estados Unidos. Antes aqui se usaba el formato ecuatoriano,
 * que pone coma decimal, y sobre un precio en dolares leido por alguien de
 * Estados Unidos eso se lee mal: $11,20 parece once mil doscientos, o
 * directamente un error.
 *
 * Va igual en los dos idiomas. La moneda no depende de en que idioma se este
 * leyendo, sino de donde se cobra.
 *
 * Lo que si cambia con el idioma son las palabras -- "A cotizar", "Agotado" --,
 * que es lo que de verdad no se entiende en otro idioma.
 */

const PRECIO = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

const FECHA_CORTA = new Intl.DateTimeFormat('es-EC', {
  day: '2-digit',
  month: 'short',
})

const FECHA_LARGA = new Intl.DateTimeFormat('es-EC', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const HORA = new Intl.DateTimeFormat('es-EC', {
  hour: '2-digit',
  minute: '2-digit',
})

export function precio(
  valor: number | null | undefined,
  idioma: Idioma = IDIOMA_POR_DEFECTO
): string {
  if (valor === null || valor === undefined) {
    return idioma === 'en' ? 'Quote on request' : 'A cotizar'
  }
  return PRECIO.format(valor)
}

export function fecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  return FECHA_LARGA.format(new Date(iso))
}

/**
 * "Hoy, 09:14" · "Ayer, 17:40" · "12 sept, 11:20", como en la maqueta del panel.
 */
export function fechaRelativa(iso: string | null | undefined): string {
  if (!iso) return '—'

  const momento = new Date(iso)
  const hoy = new Date()
  const dia = 24 * 60 * 60 * 1000

  const soloDia = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const diferencia = Math.round((soloDia(hoy) - soloDia(momento)) / dia)

  if (diferencia === 0) return `Hoy, ${HORA.format(momento)}`
  if (diferencia === 1) return `Ayer, ${HORA.format(momento)}`
  return `${FECHA_CORTA.format(momento)}, ${HORA.format(momento)}`
}

export function pesoArchivo(bytes: number | null | undefined): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Texto de stock tal como lo muestra la maqueta: "18 en stock", "Bajo pedido".
 */
export function stock(
  unidades: number | null,
  bajoPedido: boolean,
  idioma: Idioma = IDIOMA_POR_DEFECTO
): string {
  const en = idioma === 'en'

  if (bajoPedido) return en ? 'Made to order' : 'Bajo pedido'
  if (unidades === null) return en ? 'Ask us' : 'Consultar'
  if (unidades === 0) return en ? 'Sold out' : 'Agotado'

  return en ? `${unidades} in stock` : `${unidades} en stock`
}

/** Convierte un texto libre en slug utilizable en una URL. */
export function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
