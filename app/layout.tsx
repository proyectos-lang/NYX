import type { Metadata } from 'next'
import { Playfair_Display, Montserrat } from 'next/font/google'
import './globals.css'

// Las mismas dos familias de la maqueta. next/font las sirve desde el propio
// dominio: sin llamada a Google en tiempo de carga y sin salto de tipografía.
const serif = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--fuente-serif',
  display: 'swap',
})

const sans = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--fuente-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'NYX — Sublimación y productos personalizados',
    template: '%s · NYX',
  },
  description:
    'Personalizamos cada detalle para crear productos que representen tu marca, evento o idea. Camisas, tazas, termos, gorras y kits corporativos.',
  openGraph: {
    title: 'NYX — Sublimación y productos personalizados',
    description:
      'Convertimos tu idea en un objeto que representa tu marca. Cotización según cantidad, material y acabado.',
    type: 'website',
    locale: 'es_EC',
  },
}

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
