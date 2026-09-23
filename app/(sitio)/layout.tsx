import Cabecera from '@/componentes/sitio/Cabecera'
import Pie from '@/componentes/sitio/Pie'
import { ProveedorCarrito } from '@/componentes/sitio/carrito/estado'

export default function LayoutSitio({ children }: { children: React.ReactNode }) {
  return (
    // El carrito envuelve todo el sitio para que no se vacíe al navegar de la
    // ficha de un producto al catálogo, que es justo cuando se van añadiendo
    // cosas.
    <ProveedorCarrito>
      <Cabecera />
      <main>{children}</main>
      <Pie />
    </ProveedorCarrito>
  )
}
