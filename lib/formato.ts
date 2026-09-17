/** Formateo compartido entre el sitio público y el panel. */

const PRECIO = new Intl.NumberFormat('es-EC', {
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

export function precio(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return 'A cotizar'
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
export function stock(unidades: number | null, bajoPedido: boolean): string {
  if (bajoPedido) return 'Bajo pedido'
  if (unidades === null) return 'Consultar'
  if (unidades === 0) return 'Agotado'
  return `${unidades} en stock`
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
