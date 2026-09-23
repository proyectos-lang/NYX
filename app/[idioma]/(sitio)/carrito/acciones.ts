'use server'

import { crearClienteServidor } from '@/lib/supabase/server'
import { hayBaseDeDatos } from '@/lib/consultas'
import { esIdioma, type Idioma } from '@/lib/i18n'
import { textos } from '@/lib/textos'

export interface EstadoPedido {
  estado: 'inicial' | 'ok' | 'error'
  mensaje?: string
  referencia?: string
}

function texto(datos: FormData, campo: string): string {
  const valor = datos.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

/**
 * Envía el pedido del carrito.
 *
 * Entra por `crear_solicitud()`, la misma puerta que las cotizaciones, y no
 * por una tabla nueva. Dos motivos: es la única vía de escritura que las
 * políticas RLS abren al público, y así el pedido cae en la misma bandeja del
 * panel. Para quien atiende, un pedido de entrega inmediata y una cotización
 * se gestionan igual: se responde, se confirma y se entrega.
 *
 * Las líneas llegan como JSON desde el navegador, PERO NO SE CONFÍA EN ELLAS
 * para nada que importe. `crear_solicitud` vuelve a mirar cada producto_id
 * contra la tabla y descarta los que no existan o no estén visibles, y el
 * precio no viaja en la petición: lo pone NYX al responder. Alguien que
 * manipule el carrito desde el navegador puede pedir cosas raras, no comprar
 * barato.
 */
export async function enviarPedido(
  _previo: EstadoPedido,
  datos: FormData
): Promise<EstadoPedido> {
  // El idioma viaja en el formulario: los mensajes de error tienen que salir
  // en el mismo idioma en que se rellenó, no en el del servidor.
  const crudo = texto(datos, 'idioma')
  const idioma: Idioma = esIdioma(crudo) ? crudo : 'es'
  const t = textos(idioma).carrito

  const nombre = texto(datos, 'nombre')
  const email = texto(datos, 'email')

  if (!nombre) {
    return { estado: 'error', mensaje: t.errorNombre }
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { estado: 'error', mensaje: t.errorCorreo }
  }

  let items: { producto_id: string; nombre: string; cantidad: number }[]

  try {
    const crudo = JSON.parse(texto(datos, 'items') || '[]')
    items = Array.isArray(crudo) ? crudo : []
  } catch {
    items = []
  }

  if (items.length === 0) {
    return { estado: 'error', mensaje: t.errorVacio }
  }

  if (!hayBaseDeDatos()) {
    return { estado: 'error', mensaje: t.errorSinBase }
  }

  try {
    const supabase = await crearClienteServidor()
    const { data, error } = await supabase.rpc('crear_solicitud', {
      p_nombre: nombre,
      p_email: email,
      p_telefono: texto(datos, 'telefono') || null,
      p_items: items,
      // Entrega inmediata significa que ya está hecho: el método por defecto
      // es pasar a recogerlo, y quien prefiera envío lo dice en el mensaje.
      p_metodo_entrega: 'retiro_taller',
      p_observaciones:
        [
          'PEDIDO DE ENTREGA INMEDIATA (desde el carrito).',
          texto(datos, 'observaciones'),
        ]
          .filter(Boolean)
          .join(' ') || null,
    })

    if (error) {
      // 22023 es el errcode que crear_solicitud usa para datos inválidos: ese
      // mensaje sí se puede enseñar tal cual.
      const esDeValidacion = error.code === '22023'
      console.error('[nyx] crear_solicitud falló desde el carrito', error)
      return {
        estado: 'error',
        mensaje: esDeValidacion ? error.message : t.errorGenerico,
      }
    }

    return { estado: 'ok', referencia: String(data) }
  } catch (error) {
    console.error('[nyx] error inesperado al enviar el pedido del carrito', error)
    return { estado: 'error', mensaje: t.errorGenerico }
  }
}
