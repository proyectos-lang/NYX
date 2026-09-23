import type { Metadata } from 'next'
import Link from 'next/link'
import { obtenerContacto, enlaceWhatsapp } from '@/lib/consultas'
import Carrito from './Carrito'
import e from '@/app/(sitio)/cotizar/Cotizar.module.css'

export const metadata: Metadata = {
  title: 'Carrito',
  description: 'Productos de entrega inmediata listos para retirar.',
  // El carrito es de cada visitante y no tiene nada que indexar.
  robots: { index: false, follow: true },
}

export default async function PaginaCarrito() {
  const contacto = await obtenerContacto()

  return (
    <div className={e.pagina}>
      <div className="contenedor">
        <nav className={e.migas}>
          <Link href="/">Inicio</Link> / Carrito
        </nav>

        <h1 className={e.titulo}>Tu pedido</h1>
        <p className={e.intro}>
          Productos de entrega inmediata: ya están hechos, así que no hay tiempo de
          producción. Confirmamos la disponibilidad y coordinamos el retiro o el envío.
        </p>

        <div style={{ marginTop: 32, maxWidth: 860 }}>
          <Carrito
            whatsapp={enlaceWhatsapp(
              contacto.whatsapp,
              'Hola NYX, quiero pedir productos de entrega inmediata.'
            )}
          />
        </div>
      </div>
    </div>
  )
}
