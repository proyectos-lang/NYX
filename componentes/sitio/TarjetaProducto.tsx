import Link from 'next/link'
import Image from 'next/image'
import type { ProductoVista } from '@/lib/demo'
import { precio as formatearPrecio, stock as textoStock } from '@/lib/formato'
import { ruta, type Idioma } from '@/lib/i18n'
import { textos } from '@/lib/textos'
import BotonAnadir from './carrito/BotonAnadir'
import estilos from './TarjetaProducto.module.css'

interface Props {
  producto: ProductoVista
  /** "oscura" para la sección de destacados, "clara" para entrega inmediata. */
  variante?: 'oscura' | 'clara'
  idioma: Idioma
}

export default function TarjetaProducto({
  producto,
  variante = 'oscura',
  idioma,
}: Props) {
  const inmediato = producto.tipo === 'entrega_inmediata'
  const href = ruta(`/catalogo/${producto.slug}`, idioma)
  const t = textos(idioma)

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
          <span className={estilos.sinFoto}>
            {t.catalogo.fotoPendiente} · {producto.slug}
          </span>
        )}

        {inmediato ? (
          <span
            className={estilos.insignia}
            style={{ background: '#dff3e4', color: '#0a5c2b' }}
          >
            <span className={estilos.puntoVerde} />
            {t.catalogo.disponibleAhora}
          </span>
        ) : (
          <span
            className={estilos.insignia}
            style={{ background: 'rgba(201,154,46,.92)', color: '#080808' }}
          >
            {t.catalogo.personalizable}
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
              {textoStock(producto.stock, producto.bajoPedido, idioma)}
            </div>
            <span className={estilos.precio} style={{ display: 'block', margin: '10px 0' }}>
              {formatearPrecio(producto.precio, idioma)}
            </span>

            {/* Solo los de entrega inmediata entran al carrito: los
                personalizables no tienen precio hasta que NYX sabe cantidad,
                material y acabado, así que siguen por la cotización. */}
            {inmediato ? (
              <BotonAnadir
                variante="discreto"
                idioma={idioma}
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
              <Link
                href={ruta(`/cotizar?producto=${producto.slug}`, idioma)}
                className={estilos.accionSolida}
              >
                {t.catalogo.solicitar}
              </Link>
            )}
          </>
        ) : (
          <div className={estilos.pie}>
            <span className={estilos.precio}>
              {formatearPrecio(producto.precio, idioma)}
            </span>
            <Link href={href} className={estilos.accion}>
              {t.catalogo.verProducto}
            </Link>
          </div>
        )}
      </div>
    </article>
  )
}
