import type { Metadata } from 'next'
import Link from 'next/link'
import { obtenerContacto, enlaceWhatsapp } from '@/lib/consultas'
import Carrito from './Carrito'
import { ruta, esIdioma, type Idioma } from '@/lib/i18n'
import { textos } from '@/lib/textos'
import e from '@/app/[idioma]/(sitio)/cotizar/Cotizar.module.css'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ idioma: string }>
}): Promise<Metadata> {
  const t = textos(esIdioma((await params).idioma) ? ((await params).idioma as Idioma) : 'es')
  return {
    title: t.carrito.verCarrito,
    description: t.carrito.intro,
    // El carrito es de cada visitante y no tiene nada que indexar.
    robots: { index: false, follow: true },
  }
}

export default async function PaginaCarrito({
  params,
}: {
  params: Promise<{ idioma: string }>
}) {
  const { idioma: crudo } = await params
  const idioma: Idioma = esIdioma(crudo) ? crudo : 'es'
  const t = textos(idioma)

  const contacto = await obtenerContacto()

  return (
    <div className={e.pagina}>
      <div className="contenedor">
        <nav className={e.migas}>
          <Link href={ruta('/', idioma)}>{t.nav.inicio}</Link> / {t.carrito.migas}
        </nav>

        <h1 className={e.titulo}>{t.carrito.titulo}</h1>
        <p className={e.intro}>
          {t.carrito.intro}
        </p>

        <div style={{ marginTop: 32, maxWidth: 860 }}>
          <Carrito
            idioma={idioma}
            whatsapp={enlaceWhatsapp(contacto.whatsapp, t.carrito.mensajeWhatsapp)}
          />
        </div>
      </div>
    </div>
  )
}
