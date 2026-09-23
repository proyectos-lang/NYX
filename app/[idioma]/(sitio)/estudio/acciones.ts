'use server'

import { crearClienteServidor } from '@/lib/supabase/server'
import { hayBaseDeDatos } from '@/lib/consultas'
import { normalizarDiseno, type DisenoEstudio } from '@/lib/estudio/tipos'

/**
 * Guardar y recuperar el diseño del estudio.
 *
 * Como en el formulario de cotización, no se escribe en las tablas: se llama a
 * guardar_diseno(), que es SECURITY DEFINER y decide qué se puede tocar. El
 * cliente no tiene cuenta, así que su diseño se identifica por un token que
 * guarda su propio navegador.
 */

export interface ResultadoGuardado {
  ok: boolean
  token?: string
  mensaje?: string
}

export async function guardarDisenoEstudio(datos: {
  documento: DisenoEstudio
  token?: string | null
  modeloId?: string | null
  vistaPrevia?: string | null
}): Promise<ResultadoGuardado> {
  if (!hayBaseDeDatos()) {
    return {
      ok: false,
      mensaje: 'El estudio no está conectado a la base de datos, así que no se puede guardar.',
    }
  }

  try {
    const supabase = await crearClienteServidor()

    const { data, error } = await supabase.rpc('guardar_diseno', {
      p_documento: datos.documento,
      p_token: datos.token ?? null,
      // Un modelo de demostración no existe en la tabla: su id no es un uuid y
      // la función lo rechazaría. Se guarda el diseño sin modelo asociado.
      p_modelo_id: esUuid(datos.modeloId) ? datos.modeloId : null,
      p_vista_previa: datos.vistaPrevia ?? null,
    })

    if (error) {
      console.error('[nyx] no se pudo guardar el diseño', error)
      return {
        ok: false,
        mensaje:
          error.code === '22023'
            ? error.message
            : 'No se pudo guardar el diseño. Inténtalo de nuevo.',
      }
    }

    return { ok: true, token: String(data) }
  } catch (error) {
    console.error('[nyx] error inesperado al guardar el diseño', error)
    return { ok: false, mensaje: 'Algo falló al guardar. Inténtalo de nuevo en un momento.' }
  }
}

export async function cargarDiseno(token: string): Promise<DisenoEstudio | null> {
  if (!hayBaseDeDatos() || !token) return null

  try {
    const supabase = await crearClienteServidor()
    const { data, error } = await supabase.rpc('leer_diseno', { p_token: token })

    if (error) throw error
    if (!data) return null

    // Siempre por el normalizador: un diseño guardado hace semanas puede no
    // tener campos añadidos después, y sin esto el editor reventaría con
    // undefined en vez de mostrar lo que el cliente sí guardó.
    return normalizarDiseno(data)
  } catch (error) {
    console.error('[nyx] no se pudo leer el diseño', error)
    return null
  }
}

function esUuid(valor: string | null | undefined): boolean {
  return (
    typeof valor === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)
  )
}
