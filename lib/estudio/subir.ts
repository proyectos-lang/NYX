'use client'

import { crearClienteNavegador } from '@/lib/supabase/client'

/**
 * Subida de logos y texturas desde el estudio.
 *
 * Van directas del navegador al bucket, igual que el logo del formulario de
 * cotización: el servidor solo maneja la URL resultante.
 *
 * El bucket `disenos` es PÚBLICO a propósito. No es descuido: el visor 3D carga
 * estas imágenes en un canvas con `crossOrigin = "anonymous"`, y si el host no
 * responde con CORS el canvas queda inutilizable como textura y la exportación
 * a PNG falla. Supabase sirve los buckets públicos con CORS abierto; una URL
 * firmada y temporal no valdría, porque el diseño guarda la ruta para siempre.
 */

export const LIMITE_IMAGEN = 8 * 1024 * 1024

export const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export interface ImagenSubida {
  url: string
  nombre: string
  /**
   * true cuando no hubo dónde subirla y se está usando una URL de objeto local.
   * Se ve bien en pantalla, pero desaparece al recargar y no se puede guardar.
   */
  temporal: boolean
}

export function hayAlmacenamiento(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export class ErrorImagen extends Error {}

export async function subirImagen(archivo: File): Promise<ImagenSubida> {
  if (!TIPOS_IMAGEN.includes(archivo.type)) {
    throw new ErrorImagen('Formato no admitido. Usa PNG, JPG, WEBP o SVG.')
  }
  if (archivo.size > LIMITE_IMAGEN) {
    throw new ErrorImagen('La imagen supera los 8 MB.')
  }

  // Sin Supabase el estudio sigue siendo usable: la imagen se ve, pero vive
  // solo en esta pestaña. Quien llama debe avisarlo.
  if (!hayAlmacenamiento()) {
    return { url: URL.createObjectURL(archivo), nombre: archivo.name, temporal: true }
  }

  const supabase = crearClienteNavegador()
  const extension = archivo.name.split('.').pop() || 'png'
  const ruta = `capas/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage
    .from('disenos')
    .upload(ruta, archivo, { contentType: archivo.type || undefined })

  if (error) {
    console.error('[nyx] no se pudo subir la imagen del estudio', error)
    throw new ErrorImagen('No se pudo subir la imagen. Inténtalo de nuevo.')
  }

  const { data } = supabase.storage.from('disenos').getPublicUrl(ruta)

  return { url: data.publicUrl, nombre: archivo.name, temporal: false }
}
