'use server'

import { crearClienteServidor } from '@/lib/supabase/server'
import { hayBaseDeDatos } from '@/lib/consultas'
import type { MetodoEntrega } from '@/lib/database.types'

export interface EstadoSolicitud {
  estado: 'inicial' | 'ok' | 'error'
  mensaje?: string
  referencia?: string
}

const METODOS: MetodoEntrega[] = ['envio_nacional', 'retiro_taller', 'entrega_local']

function texto(datos: FormData, campo: string): string {
  const valor = datos.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

/**
 * Envía la solicitud de cotización.
 *
 * No inserta en las tablas: llama a crear_solicitud(), la única vía de
 * escritura que las políticas RLS abren al público. Esa función decide el
 * estado, la referencia y el precio; aquí solo se recogen los datos del
 * formulario.
 */
export async function enviarSolicitud(
  _previo: EstadoSolicitud,
  datos: FormData
): Promise<EstadoSolicitud> {
  const nombre = texto(datos, 'nombre')
  const email = texto(datos, 'email')

  // Validación de cortesía: la de verdad está en la función de Postgres, que
  // es la que no se puede saltar desde el navegador.
  if (!nombre) {
    return { estado: 'error', mensaje: 'Escribe tu nombre para poder responderte.' }
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { estado: 'error', mensaje: 'Revisa el correo electrónico: no parece válido.' }
  }

  const nombreProducto = texto(datos, 'producto_nombre')
  if (!nombreProducto) {
    return { estado: 'error', mensaje: 'Indica qué producto quieres personalizar.' }
  }

  const cantidadCruda = Number(texto(datos, 'cantidad'))
  const cantidad = Number.isFinite(cantidadCruda) && cantidadCruda > 0
    ? Math.floor(cantidadCruda)
    : 1

  const metodoCrudo = texto(datos, 'metodo_entrega')
  const metodo = METODOS.includes(metodoCrudo as MetodoEntrega)
    ? (metodoCrudo as MetodoEntrega)
    : null

  const fecha = texto(datos, 'fecha_requerida')

  // El navegador ya subió el archivo al bucket y nos pasa solo la ruta.
  const archivos: { ruta: string; nombre: string; bytes: number; mime: string }[] = []
  const rutaArchivo = texto(datos, 'archivo_ruta')
  if (rutaArchivo) {
    archivos.push({
      ruta: rutaArchivo,
      nombre: texto(datos, 'archivo_nombre') || 'archivo',
      bytes: Number(texto(datos, 'archivo_bytes')) || 0,
      mime: texto(datos, 'archivo_mime'),
    })
  }

  if (!hayBaseDeDatos()) {
    return {
      estado: 'error',
      mensaje:
        'El formulario todavía no está conectado a la base de datos. Escríbenos por WhatsApp o correo y lo gestionamos igual.',
    }
  }

  try {
    const supabase = await crearClienteServidor()
    const { data, error } = await supabase.rpc('crear_solicitud', {
      p_nombre: nombre,
      p_email: email,
      p_telefono: texto(datos, 'telefono') || null,
      p_empresa: texto(datos, 'empresa') || null,
      p_items: [
        {
          producto_id: texto(datos, 'producto_id') || null,
          nombre: nombreProducto,
          cantidad,
          especificaciones: texto(datos, 'especificaciones') || null,
        },
      ],
      p_fecha_requerida: fecha || null,
      p_metodo_entrega: metodo,
      p_observaciones: texto(datos, 'observaciones') || null,
      p_archivos: archivos,
    })

    if (error) {
      // 22023 es el errcode que usa crear_solicitud para los datos inválidos:
      // ese mensaje sí se puede enseñar tal cual.
      const esDeValidacion = error.code === '22023'
      console.error('[nyx] crear_solicitud falló', error)
      return {
        estado: 'error',
        mensaje: esDeValidacion
          ? error.message
          : 'No pudimos registrar la solicitud. Inténtalo de nuevo o escríbenos por WhatsApp.',
      }
    }

    return { estado: 'ok', referencia: String(data) }
  } catch (error) {
    console.error('[nyx] error inesperado al crear la solicitud', error)
    return {
      estado: 'error',
      mensaje: 'Algo falló al enviar la solicitud. Inténtalo de nuevo en un momento.',
    }
  }
}
