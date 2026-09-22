import { Bebas_Neue, Pacifico, Archivo_Black } from 'next/font/google'

/**
 * Familias extra para los textos de las prendas.
 *
 * Se cargan SOLO en el estudio y no en el layout raiz: son tres familias que
 * no usa ninguna otra pagina, y meterlas en la raiz las pondria en la carga de
 * todo el sitio.
 *
 * El compositor las resuelve por su variable CSS y no por nombre, porque
 * next/font genera nombres ofuscados distintos en cada compilacion.
 */
const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--fuente-bebas',
  display: 'swap',
})

const pacifico = Pacifico({
  subsets: ['latin'],
  weight: '400',
  variable: '--fuente-pacifico',
  display: 'swap',
})

const archivo = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--fuente-archivo',
  display: 'swap',
})

export const CLASES_FUENTES = `${bebas.variable} ${pacifico.variable} ${archivo.variable}`
