/**
 * Español e inglés.
 *
 * El idioma va en la DIRECCIÓN, no en una cookie: /catalogo es español y
 * /en/catalogo es inglés. Cuesta más que recordarlo en el navegador, pero es
 * la diferencia entre poder mandarle a alguien "la web en inglés" por WhatsApp
 * y que le abra en español porque su navegador no sabe nada de tu elección.
 * También es lo que permite que Google indexe las dos versiones.
 *
 * El español no lleva prefijo: es el idioma de casa y la dirección corta es la
 * suya. Por dentro sí existe /es, y el middleware reescribe / hacia ahí para
 * que cada idioma tenga su propia página y su propia caché. Sin eso, las dos
 * versiones compartirían el HTML guardado y la inglesa acabaría sirviendo
 * español a quien llegara primero.
 */

export const IDIOMAS = ['es', 'en'] as const

export type Idioma = (typeof IDIOMAS)[number]

export const IDIOMA_POR_DEFECTO: Idioma = 'es'

/** El que no lleva prefijo en la dirección. */
export const SIN_PREFIJO: Idioma = 'es'

export function esIdioma(valor: unknown): valor is Idioma {
  return typeof valor === 'string' && (IDIOMAS as readonly string[]).includes(valor)
}

/** Lo que espera el atributo lang del <html>. */
export const ETIQUETA_HTML: Record<Idioma, string> = {
  es: 'es-EC',
  en: 'en',
}

export const NOMBRE_IDIOMA: Record<Idioma, string> = {
  es: 'Español',
  en: 'English',
}

/**
 * Una ruta interna, con el prefijo que le toque.
 *
 *     ruta('/catalogo', 'es')  ->  '/catalogo'
 *     ruta('/catalogo', 'en')  ->  '/en/catalogo'
 *
 * Hay que usarla en TODOS los enlaces del sitio. Un enlace sin prefijo
 * devuelve al español a mitad de navegación, y el fallo es de los que nadie
 * reporta: se cambia de idioma sin querer y parece que la web se estropeó.
 */
export function ruta(destino: string, idioma: Idioma): string {
  if (idioma === SIN_PREFIJO) return destino

  // Las anclas de la portada (/#preguntas) llevan el prefijo delante del #.
  if (destino.startsWith('/#')) return `/${idioma}${destino}`
  if (destino === '/') return `/${idioma}`

  return `/${idioma}${destino}`
}

/**
 * La misma página en el otro idioma, para el botón de cambiar.
 *
 * Se calcula a partir de la ruta actual y no se manda siempre a la portada:
 * quien está mirando un producto quiere ese producto en inglés, no empezar de
 * cero.
 */
export function rutaEnOtroIdioma(rutaActual: string, destino: Idioma): string {
  let limpia = rutaActual

  for (const idioma of IDIOMAS) {
    if (idioma === SIN_PREFIJO) continue
    if (limpia === `/${idioma}`) {
      limpia = '/'
      break
    }
    if (limpia.startsWith(`/${idioma}/`)) {
      limpia = limpia.slice(idioma.length + 1)
      break
    }
  }

  return ruta(limpia, destino)
}
