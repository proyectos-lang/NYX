/**
 * Enlaces de WhatsApp para el panel.
 *
 * Aparte de la pagina y sin React a proposito: lo unico dificil de esto son los
 * telefonos, y eso se puede comprobar sin navegador (ver
 * scripts/verificar-whatsapp.mts).
 */

import type { EstadoPedido } from './database.types'

/** Codigo de pais de Ecuador, sin el +. */
const ECUADOR = '593'

/**
 * Pasa un telefono escrito por el cliente al formato que exige wa.me: solo
 * digitos, con codigo de pais y sin el +.
 *
 * Hace falta porque el numero llega tal cual lo tecleo el cliente en el
 * formulario. En Ecuador la gente lo escribe de todas estas formas, y todas
 * son el mismo numero:
 *
 *     0991234567      099 123 4567      09-9123-4567
 *     +593 99 123 4567                  593991234567
 *
 * wa.me con un numero mal formado no da error: abre WhatsApp diciendo que el
 * numero no existe, y quien lo use pensara que la clienta se equivoco al
 * escribirlo.
 *
 * Devuelve null si no se puede asegurar cual es el numero. Es deliberado:
 * mejor no ofrecer el boton que abrir un chat con quien no es.
 */
export function normalizarTelefono(crudo: string | null | undefined): string | null {
  if (!crudo) return null

  // Un "+" solo cuenta si abre el numero; dentro es basura de formato.
  const tieneMas = crudo.trimStart().startsWith('+')
  const digitos = crudo.replace(/[^0-9]/g, '')
  if (!digitos) return null

  // Ya viene internacional: se respeta, sea de Ecuador o de donde sea. Un
  // cliente extranjero es raro pero no imposible, y no hay motivo para
  // rechazarlo.
  if (tieneMas) return digitos.length >= 8 ? digitos : null

  // 593 + 9 digitos = 12. Escrito sin el +, que es lo habitual al copiarlo.
  if (digitos.startsWith(ECUADOR) && digitos.length === 12) return digitos

  // Nacional con el 0 de salida: 0991234567 (movil) o 042345678 (fijo). El 0
  // no viaja en el formato internacional.
  if (digitos.startsWith('0') && (digitos.length === 10 || digitos.length === 9)) {
    return ECUADOR + digitos.slice(1)
  }

  // Sin el 0 inicial: 991234567. Solo movil, porque un fijo de 8 digitos se
  // confunde con medio numero mal copiado.
  if (digitos.startsWith('9') && digitos.length === 9) return ECUADOR + digitos

  return null
}

/** Solo el nombre de pila, para que el mensaje no suene a formulario. */
function nombreDePila(nombre: string | null | undefined): string {
  const limpio = (nombre ?? '').trim()
  if (!limpio) return ''
  return limpio.split(/[ ]+/)[0]
}

/**
 * El mensaje que se escribe solo, segun en que punto esta el pedido.
 *
 * Se elige por estado en vez de dejar un texto fijo porque el boton sigue ahi
 * cuando el pedido ya avanzo: mandar "recibimos tu solicitud" a quien lleva
 * dos semanas esperando la entrega queda peor que no escribir nada.
 *
 * Son borradores, no envios: WhatsApp los abre en la caja de texto y quien
 * atiende puede cambiarlos antes de mandarlos.
 */
export function mensajePedido(pedido: {
  ref: string
  estado: EstadoPedido
  cliente?: { nombre?: string | null } | null
}): string {
  const nombre = nombreDePila(pedido.cliente?.nombre)
  const saludo = nombre ? `Hola ${nombre}` : 'Hola'
  const ref = pedido.ref

  switch (pedido.estado) {
    case 'nuevo':
      return `${saludo}, te escribimos de NYX. Ya recibimos tu solicitud ${ref} y la estamos revisando. En poco tiempo te enviamos la cotizacion. Gracias por escribirnos.`

    case 'en_revision':
      return `${saludo}, te escribimos de NYX. Estamos preparando la cotizacion de tu solicitud ${ref}. Te avisamos apenas la tengamos lista.`

    case 'en_produccion':
      return `${saludo}, te escribimos de NYX. Tu pedido ${ref} ya esta en produccion. Te avisamos en cuanto este listo.`

    case 'entregado':
      return `${saludo}, te escribimos de NYX. Tu pedido ${ref} ya fue entregado. Cualquier cosa quedamos a la orden, y gracias por confiar en nosotros.`

    case 'cancelado':
      return `${saludo}, te escribimos de NYX por tu solicitud ${ref}.`
  }
}

/**
 * Enlace a la conversacion, con el mensaje ya escrito.
 *
 * wa.me y no api.whatsapp.com: es el que WhatsApp documenta para esto y el
 * unico que se comporta igual en el movil (abre la app) y en el escritorio
 * (abre WhatsApp Web o la app de escritorio).
 *
 * Devuelve null si el telefono no sirve, para que la pagina pueda explicarlo
 * en vez de ofrecer un boton roto.
 */
export function enlaceWhatsApp(
  telefono: string | null | undefined,
  mensaje: string
): string | null {
  const numero = normalizarTelefono(telefono)
  if (!numero) return null

  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}
