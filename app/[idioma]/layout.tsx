import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CLASES_FUENTES } from '@/app/fuentes'
import { ETIQUETA_HTML, IDIOMAS, esIdioma, type Idioma } from '@/lib/i18n'
import '@/app/globals.css'

/**
 * La raíz del sitio público.
 *
 * Es una raíz de verdad —trae su propio <html>— y no un layout más. Next
 * permite varias raíces cuando cada zona vive en su propio segmento de primer
 * nivel, y aquí hacía falta por una razón concreta: el atributo lang depende
 * del idioma, y el idioma está en esta ruta.
 *
 * Con una sola raíz arriba, lang tenía que deducirse de las cabeceras, y eso
 * no funciona: las páginas se generan en el build, cuando no hay petición que
 * mirar. El resultado era /en sirviéndose con lang="es-EC", que hace que un
 * lector de pantalla lea el inglés con voz española, palabra por palabra.
 *
 * El panel tiene la suya en app/(admin)/layout.tsx.
 */

const DESCRIPCION: Record<Idioma, string> = {
  es: 'Personalizamos cada detalle para crear productos que representen tu marca, evento o idea. Camisas, tazas, termos, gorras y kits corporativos.',
  en: 'We personalize every detail to create products that represent your brand, event or idea. Shirts, mugs, tumblers, caps and corporate kits.',
}

const TITULO: Record<Idioma, string> = {
  es: 'NYX — Sublimación y productos personalizados',
  en: 'NYX — Sublimation and personalized products',
}

export function generateStaticParams() {
  return IDIOMAS.map((idioma) => ({ idioma }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ idioma: string }>
}): Promise<Metadata> {
  const { idioma: crudo } = await params
  const idioma: Idioma = esIdioma(crudo) ? crudo : 'es'

  return {
    // Base para resolver las imágenes de Open Graph. Vercel expone el dominio
    // del despliegue en VERCEL_PROJECT_PRODUCTION_URL; en local vale localhost.
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITIO_URL ??
        (process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : 'http://localhost:3000')
    ),
    title: { default: TITULO[idioma], template: '%s · NYX' },
    description: DESCRIPCION[idioma],
    // hreflang: le dice a Google que estas dos páginas son la misma en otro
    // idioma, no contenido duplicado. Sin esto compiten entre sí.
    alternates: {
      canonical: idioma === 'es' ? '/' : '/en',
      languages: { es: '/', en: '/en' },
    },
    openGraph: {
      title: TITULO[idioma],
      description: DESCRIPCION[idioma],
      type: 'website',
      locale: idioma === 'en' ? 'en_US' : 'es_EC',
    },
  }
}

export default async function RaizSitio({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ idioma: string }>
}) {
  const { idioma } = await params

  // Cualquier otra cosa en esa posición no es un idioma, es una ruta que no
  // existe: /portugues daría una página en blanco en vez de un 404 honesto.
  if (!esIdioma(idioma)) notFound()

  return (
    <html lang={ETIQUETA_HTML[idioma]} className={CLASES_FUENTES}>
      <body>{children}</body>
    </html>
  )
}
