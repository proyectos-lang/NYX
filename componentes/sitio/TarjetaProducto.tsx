import Link from 'next/link'
import Image from 'next/image'
import type { ProductoVista } from '@/lib/demo'
import { precio as formatearPrecio, stock as textoStock } from '@/lib/formato'
import BotonAnadir from './carrito/BotonAnadir'
import estilos from './TarjetaProducto.module.css'

interface Props {
  producto: ProductoVista
  /** "oscura" para la sección de destacados, "clara" para entrega inmediata. */
  variante?: 'oscura' | 'clara'
}

export default function TarjetaProducto({ producto, variante = 'oscura' }: Props) {
  const inmediato = producto.tipo === 'entrega_inmediata'
  const href = `/catalogo/${producto.slug}`

  return (
    <article className={`${estilos.tarjeta} ${estilos[variante]} al-entrar`}>
      <Link href={href} className={estilos.foto} aria-label={producto.nombre}>
        {producto.imagen ? (
          <Image
            src={producto.imagen}
            alt={producto.nombre}
            fill
            sizes="(max-width: 720px) 50vw, 25vw"
          />
        ) : (
          <span className={estilos.sinFoto}>foto pendiente · {producto.slug}</span>
        )}

        {inmediato ? (
          <span
            className={estilos.insignia}
            style={{ background: '#dff3e4', color: '#0a5c2b' }}
          >
            <span className={estilos.puntoVerde} />
            Disponible ahora
          </span>
        ) : (
          <span
            className={estilos.insignia}
            style={{ background: 'rgba(201,154,46,.92)', color: '#080808' }}
          >
            Personalizable
          </span>
        )}
      </Link>

      <div className={estilos.cuerpo}>
        <div className={estilos.categoria}>{producto.categoria}</div>
        <Link href={href} className={estilos.nombre}>
          {producto.nombre}
        </Link>

        {variante === 'clara' ? (
          <>
            <div className={estilos.detalle}>{producto.descripcion ?? producto.sku}</div>
            <div className={estilos.existencias}>
              {textoStock(producto.stock, producto.bajoPedido)}
            </div>
            <span className={estilos.precio} style={{ display: 'block', margin: '10px 0' }}>
              {formatearPrecio(producto.precio)}
            </span>

            {/* Solo los de entrega inmediata entran al carrito: los
                personalizables no tienen precio hasta que NYX sabe cantidad,
                material y acabado, así que siguen por la cotización. */}
            {inmediato ? (
              <BotonAnadir
                variante="discreto"
                producto={{
                  productoId: producto.id,
                  slug: producto.slug,
                  nombre: producto.nombre,
                  precio: producto.precio,
                  imagen: producto.imagen,
                  stock: producto.stock,
                }}
              />
            ) : (
              <Link href={`/cotizar?producto=${producto.slug}`} className={estilos.accionSolida}>
                Solicitar
              </Link>
            )}
          </>
        ) : (
          <div className={estilos.pie}>
            <span className={estilos.precio}>{formatearPrecio(producto.precio)}</span>
            <Link href={href} className={estilos.accion}>
              Ver producto
            </Link>
          </div>
        )}
      </div>
    </article>
  )
}
