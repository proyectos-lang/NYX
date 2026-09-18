import 'server-only'

import { crearClienteServidor } from '@/lib/supabase/server'
import { hayBaseDeDatos } from '@/lib/consultas'
import type { Mapeo, Modelo3D } from './tipos'

/**
 * Lecturas del estudio que pasan por el servidor.
 *
 * Igual que el resto del sitio publico: si no hay Supabase, se devuelve lista
 * vacia y el estudio lo explica en pantalla en vez de romperse. Aqui no hay
 * datos de demostracion posibles -- un modelo 3D es un archivo real o no es.
 */
export async function obtenerModelos3D(): Promise<Modelo3D[]> {
  if (!hayBaseDeDatos()) return []

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

    /* eslint-disable @typescript-eslint/no-explicit-any */
    return (data ?? []).map((m: any) => ({
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
    return []
  }
}
