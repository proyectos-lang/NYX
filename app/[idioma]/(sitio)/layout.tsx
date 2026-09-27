import Cabecera from '@/componentes/sitio/Cabecera'
import Pie from '@/componentes/sitio/Pie'
import { esIdioma, type Idioma } from '@/lib/i18n'

/**
 * La cabecera y el pie del sitio publico.
 *
 * El <html>, el idioma y la metadata viven en la raiz de [idioma]; aqui solo
 * esta lo que envuelve al contenido.
 *
 * Ya no hay carrito. NYX trabaja por encargo: todo pasa por una cotizacion,
 * asi que no habia nada que meter en un carrito ni precio cerrado que sumar.
 */
export default async function LayoutSitio({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ idioma: string }>
}) {
  const { idioma: crudo } = await params
  const idioma: Idioma = esIdioma(crudo) ? crudo : 'es'

  return (
    <>
      <Cabecera idioma={idioma} />
      <main>{children}</main>
      <Pie idioma={idioma} />
    </>
  )
}
