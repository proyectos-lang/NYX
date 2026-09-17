import Cabecera from '@/componentes/sitio/Cabecera'
import Pie from '@/componentes/sitio/Pie'

export default function LayoutSitio({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Cabecera />
      <main>{children}</main>
      <Pie />
    </>
  )
}
