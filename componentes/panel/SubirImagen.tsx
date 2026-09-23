'use client'

import { useRef, useState } from 'react'
import { crearClienteNavegador } from '@/lib/supabase/client'
import e from '@/app/(admin)/panel/Panel.module.css'
import s from './SubirImagen.module.css'

/**
 * Reemplazar una imagen del sitio desde el panel.
 *
 * El archivo va DIRECTO del navegador al bucket, y al servidor solo llega la
 * URL resultante. Es el mismo camino que ya usan SubirModelo.tsx y el estudio,
 * y el motivo es que una Server Action recibe el archivo entero en memoria:
 * pasar por ahí un MP4 de 40 MB es pedirle al servidor que aguante algo que el
 * bucket hace mejor y gratis.
 *
 * El puente entre el cliente y el servidor es un campo oculto: se escribe la
 * URL dentro y se envía el formulario con requestSubmit(). Así la acción que
 * guarda en la base es una Server Action normal, sin nada especial.
 */

const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp', 'image/avif']
const TIPOS_VIDEO = ['video/mp4']

/** Los límites reales de los buckets. Pasarse devuelve un error feo de Supabase. */
const LIMITE_IMAGEN = 5 * 1024 * 1024
const LIMITE_VIDEO = 40 * 1024 * 1024

interface Props {
  /** Bucket de destino: 'contenido' admite vídeo, 'productos' no. */
  bucket: 'contenido' | 'productos'
  /** La acción que guarda la URL en la base. */
  accion: (datos: FormData) => void | Promise<void>
  /** Campos ocultos que la acción necesita para saber qué fila tocar. */
  campos: Record<string, string>
  /** Lo que hay ahora, para enseñarlo. */
  urlActual?: string | null
  /** Nombre del hueco: "Foto 1 del hero". */
  etiqueta: string
  /** true si este hueco acepta un MP4. */
  admiteVideo?: boolean
  /** Texto del botón cuando no hay nada todavía. */
  textoVacio?: string
  /**
   * Acción para dejar el hueco vacío. Si no se pasa, no sale el botón de
   * quitar: hay sitios donde no tiene sentido, como la foto de un producto
   * que se borra desde su propia fila.
   */
  alQuitar?: (datos: FormData) => void | Promise<void>
}

function megas(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function SubirImagen({
  bucket,
  accion,
  campos,
  urlActual,
  etiqueta,
  admiteVideo = false,
  textoVacio = 'Subir imagen',
  alQuitar,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const quitarRef = useRef<HTMLFormElement>(null)
  const entradaRef = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const admitidos = admiteVideo ? [...TIPOS_IMAGEN, ...TIPOS_VIDEO] : TIPOS_IMAGEN

  async function alElegir(archivo: File) {
    setError(null)

    const esVideo = archivo.type.startsWith('video/')

    if (!admitidos.includes(archivo.type)) {
      setError(
        admiteVideo
          ? 'Usa una imagen JPG, PNG, WEBP o AVIF, o un vídeo MP4.'
          : 'Usa una imagen JPG, PNG, WEBP o AVIF.'
      )
      return
    }

    const limite = esVideo ? LIMITE_VIDEO : LIMITE_IMAGEN
    if (archivo.size > limite) {
      // Se dice cuánto pesa y cuánto cabe: "es muy grande" obliga a adivinar
      // cuánto hay que recortar.
      setError(
        `Pesa ${megas(archivo.size)} y el máximo es ${megas(limite)}. Prueba con una más ligera.`
      )
      return
    }

    setSubiendo(true)

    try {
      const supabase = crearClienteNavegador()
      const extension = archivo.name.split('.').pop()?.toLowerCase() || 'jpg'
      const ruta = `${crypto.randomUUID()}.${extension}`

      const { error: errorSubida } = await supabase.storage
        .from(bucket)
        .upload(ruta, archivo, { contentType: archivo.type || undefined })

      if (errorSubida) throw errorSubida

      const { data } = supabase.storage.from(bucket).getPublicUrl(ruta)

      const campoUrl = formRef.current?.elements.namedItem('url') as HTMLInputElement | null
      const campoTipo = formRef.current?.elements.namedItem('tipo') as HTMLInputElement | null
      if (campoUrl) campoUrl.value = data.publicUrl
      if (campoTipo) campoTipo.value = esVideo ? 'video' : 'imagen'

      formRef.current?.requestSubmit()
    } catch (fallo) {
      console.error('[nyx] no se pudo subir la imagen', fallo)
      setError(
        'No se pudo subir. Comprueba tu conexión; si sigue fallando, puede que tu cuenta no tenga permisos.'
      )
      setSubiendo(false)
    }
  }

  const esVideoActual = Boolean(urlActual && urlActual.toLowerCase().endsWith('.mp4'))

  return (
    <div className={s.hueco}>
      <div className={s.vista}>
        {urlActual ? (
          esVideoActual ? (
            <video src={urlActual} muted playsInline preload="metadata" />
          ) : (
            // Imagen del bucket, de dimensiones desconocidas: <img> normal en
            // vez de next/image, que exige tamaño o dominio configurado.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urlActual} alt="" />
          )
        ) : (
          <span className={s.vacia}>Sin imagen</span>
        )}
      </div>

      <div className={s.datos}>
        <div className={s.etiqueta}>{etiqueta}</div>

        <form action={accion} ref={formRef}>
          {Object.entries(campos).map(([nombre, valor]) => (
            <input key={nombre} type="hidden" name={nombre} value={valor} />
          ))}
          {/* Los rellena alElegir() antes de enviar. */}
          <input type="hidden" name="url" defaultValue="" />
          <input type="hidden" name="tipo" defaultValue="imagen" />
        </form>

        <input
          ref={entradaRef}
          type="file"
          accept={admitidos.join(',')}
          hidden
          onChange={(ev) => {
            const archivo = ev.target.files?.[0]
            // Se limpia para que elegir el MISMO archivo otra vez, después de
            // un error, vuelva a disparar el evento.
            ev.target.value = ''
            if (archivo) void alElegir(archivo)
          }}
        />

        <div className={s.botones}>
          <button
            type="button"
            className={e.botonTenue}
            disabled={subiendo}
            onClick={() => entradaRef.current?.click()}
          >
            {subiendo ? 'Subiendo…' : urlActual ? 'Reemplazar' : textoVacio}
          </button>

          {/* Solo cuando hay algo que quitar. Un botón de quitar sobre un
              hueco vacío no hace nada y hace dudar de si se pulsó bien. */}
          {alQuitar && urlActual && (
            <form action={alQuitar} ref={quitarRef}>
              {Object.entries(campos).map(([nombre, valor]) => (
                <input key={nombre} type="hidden" name={nombre} value={valor} />
              ))}
              <button type="submit" className={s.quitar} disabled={subiendo}>
                Quitar
              </button>
            </form>
          )}
        </div>

        {error && <p className={s.error}>{error}</p>}
      </div>
    </div>
  )
}
