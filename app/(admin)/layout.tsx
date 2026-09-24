import type { Metadata } from 'next'
import { CLASES_FUENTES } from '@/app/fuentes'
import '@/app/globals.css'

/**
 * La raíz del panel y del acceso.
 *
 * Separada de la del sitio porque el sitio es bilingüe y el panel no: aquí el
 * idioma es siempre español y no hay ningún segmento del que deducirlo.
 *
 * Fuera de los buscadores, que es lo que corresponde a una zona privada.
 */
export const metadata: Metadata = {
  title: { default: 'NYX', template: '%s · NYX' },
  robots: { index: false, follow: false },
}

export default function RaizAdmin({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={CLASES_FUENTES}>
      <body>{children}</body>
    </html>
  )
}
