'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IDIOMAS, rutaEnOtroIdioma, type Idioma } from '@/lib/i18n'
import estilos from './BotonIdioma.module.css'

/**
 * ES | EN.
 *
 * Cada opción es un ENLACE, no un botón que recarga. Así se puede abrir en otra
 * pestaña, copiar la dirección o volver con el botón de atrás, y Google
 * descubre la versión inglesa siguiéndolo.
 *
 * Lleva a la misma página en el otro idioma, no a la portada: quien está
 * mirando un producto quiere ese producto en inglés, no empezar de cero.
 */
export default function BotonIdioma({ idioma }: { idioma: Idioma }) {
  const ruta = usePathname()

  return (
    <div className={estilos.grupo}>
      {IDIOMAS.map((otro) => (
        <Link
          key={otro}
          href={rutaEnOtroIdioma(ruta, otro)}
          className={estilos.opcion}
          data-activo={otro === idioma}
          // hreflang le dice a Google que esto es la misma página en otro
          // idioma, no contenido distinto.
          hrefLang={otro}
          aria-current={otro === idioma ? 'true' : undefined}
        >
          {otro.toUpperCase()}
        </Link>
      ))}
    </div>
  )
}
