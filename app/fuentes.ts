import { Playfair_Display, Montserrat } from 'next/font/google'

/**
 * Las dos familias de la maqueta, en un módulo aparte.
 *
 * Viven fuera de los layouts porque ahora hay DOS raíces —el sitio público y
 * el panel— y next/font tiene que cargarlas una sola vez. Declaradas en cada
 * layout se descargarían por duplicado con nombres distintos.
 *
 * next/font las sirve desde el propio dominio: sin llamada a Google al cargar
 * y sin salto de tipografía.
 */

export const serif = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--fuente-serif',
  display: 'swap',
})

export const sans = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--fuente-sans',
  display: 'swap',
})

/** Lo que va en el className del <html>. */
export const CLASES_FUENTES = `${serif.variable} ${sans.variable}`
