import Cabecera from '@/componentes/sitio/Cabecera'
import Pie from '@/componentes/sitio/Pie'
import { ProveedorCarrito } from '@/componentes/sitio/carrito/estado'
import { esIdioma, type Idioma } from '@/lib/i18n'

/**
 * La cabecera, el pie y el carrito del sitio publico.
 *
 * El <html>, el idioma y la metadata viven en la raiz de [idioma]; aqui solo
 * esta lo que envuelve al contenido.
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
    // El carrito envuelve todo el sitio para que no se vacie al navegar de la
    // ficha de un producto al catalogo, que es justo cuando se van anadiendo
    // cosas.
    <ProveedorCarrito>
      <Cabecera idioma={idioma} />
      <main>{children}</main>
      <Pie idioma={idioma} />
    </ProveedorCarrito>
  )
}
