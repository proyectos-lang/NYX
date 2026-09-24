/**
 * Enlaces de WhatsApp para el panel.
 *
 * Aparte de la pagina y sin React a proposito: lo unico dificil de esto son los
 * telefonos, y eso se puede comprobar sin navegador (ver
 * scripts/verificar-whatsapp.mts).
 */

import type { EstadoPedido } from './database.types'

/** Codigos de pais, sin el +. */
const ESTADOS_UNIDOS = '1'
const ECUADOR = '593'

/**
 * Pasa un telefono escrito por el cliente al formato que exige wa.me: solo
 * digitos, con codigo de pais y sin el +.
 *
 * Hace falta porque el numero llega tal cual lo tecleo el cliente en el
 * formulario, y cada uno lo escribe a su manera. Todas estas son el mismo
 * numero de Estados Unidos:
 *
 *     8459721825      845 972 1825      (845) 972-1825
 *     +1 845 972 1825                   18459721825
 *
 * Y todas estas el mismo de Ecuador, que se sigue admitiendo porque parte de
 * la clientela esta alli:
 *
 *     0991234567      099 123 4567      +593 99 123 4567
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

  // Ya viene internacional: se respeta, del pais que sea. No hay motivo para
  // rechazar a alguien por escribirlo bien.
  if (tieneMas) return digitos.length >= 8 ? digitos : null

  // 593 + 9 digitos = 12. Escrito sin el +, que es lo habitual al copiarlo.
  if (digitos.startsWith(ECUADOR) && digitos.length === 12) return digitos

  // 1 + 10 digitos = 11. Igual, copiado sin el +.
  if (digitos.startsWith(ESTADOS_UNIDOS) && digitos.length === 11) return digitos

  // El 0 de salida es ecuatoriano: 0991234567 (movil) o 042345678 (fijo). En
  // Estados Unidos no se escribe ningun 0 delante, asi que no hay confusion.
  if (digitos.startsWith('0') && (digitos.length === 10 || digitos.length === 9)) {
    return ECUADOR + digitos.slice(1)
  }

  // Diez digitos sin 0 delante: es de Estados Unidos, que es donde esta NYX.
  // Un movil ecuatoriano sin el 0 tiene nueve, asi que los dos casos no se
  // pisan.
  //
  // La excepcion es empezar por 593: ahi no se puede saber si es un numero de
  // Ecuador al que le falta un digito o uno de Estados Unidos con prefijo 593.
  // Se descarta, que es lo que hace el resto de la funcion ante una duda:
  // mejor no ofrecer el boton que abrir un chat con quien no es. Y 593 no es
  // un prefijo asignado en Estados Unidos, asi que descartar no quita nada
  // real.
  if (digitos.length === 10 && !digitos.startsWith(ECUADOR)) {
    return ESTADOS_UNIDOS + digitos
  }

  // Nueve empezando por 9: movil ecuatoriano sin el 0. Solo movil, porque un
  // fijo de ocho digitos se confunde con medio numero mal copiado.
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
