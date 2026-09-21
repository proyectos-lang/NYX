import 'server-only'

import { crearClienteServidor } from '@/lib/supabase/server'
import { hayBaseDeDatos } from '@/lib/consultas'
import type { Mapeo, Modelo3D } from './tipos'
import { MODELO_DEMO } from './modelo-demo'

/**
 * Lecturas del estudio que pasan por el servidor.
 *
 * Igual que el resto del sitio publico: si no hay Supabase, o si la tabla esta
 * vacia, se cae al modelo de prueba de public/modelos/. Asi el visor siempre
 * tiene algo que ensenar en vez de una pantalla en blanco, y el estudio se
 * puede revisar antes de que existan modelos de verdad.
 */
export async function obtenerModelos3D(): Promise<Modelo3D[]> {
  if (!hayBaseDeDatos()) return [MODELO_DEMO]

  try {
    const supabase = await crearClienteServidor()
    const { data, error } = await supabase
      .from('modelos_3d')
      .select(
        'id, nombre, archivo_url, mapeo, escala, centro_x, centro_y, centro_z, materiales_excluidos'
      )
      .eq('visible', true)
      .order('orden')

    if (error) throw error

    // Tabla vacia: mejor el modelo de prueba que un visor sin nada.
    if (!data?.length) return [MODELO_DEMO]

    /* eslint-disable @typescript-eslint/no-explicit-any */
    return data.map((m: any) => ({
      id: m.id,
      nombre: m.nombre,
      archivoUrl: m.archivo_url,
      mapeo: m.mapeo as Mapeo,
      escala: Number(m.escala) || 1,
      centro: {
        x: Number(m.centro_x) || 0,
        y: Number(m.centro_y) || 0,
        z: Number(m.centro_z) || 0,
      },
      materialesExcluidos: m.materiales_excluidos ?? [],
    }))
    /* eslint-enable @typescript-eslint/no-explicit-any */
  } catch (error) {
    console.error('[nyx] no se pudieron leer los modelos 3D', error)
    return [MODELO_DEMO]
  }
}
