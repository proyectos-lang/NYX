import Link from 'next/link'
import Image from 'next/image'
import type { ProductoVista } from '@/lib/demo'
import { precio as formatearPrecio } from '@/lib/formato'
import { ruta, type Idioma } from '@/lib/i18n'
import { textos } from '@/lib/textos'
import estilos from './TarjetaProducto.module.css'

interface Props {
  producto: ProductoVista
  /** "oscura" sobre las secciones negras, "clara" sobre las de fondo claro. */
  variante?: 'oscura' | 'clara'
  idioma: Idioma
}

/**
 * Una ficha de producto en una rejilla.
 *
 * Ya no distingue entre personalizable y entrega inmediata: NYX trabaja por
 * encargo y todo pasa por una cotización, así que esa diferencia dejó de
 * existir. Lo que sí se enseña es la TÉCNICA, que es lo que de verdad cambia
 * de un producto a otro.
 */
export default function TarjetaProducto({
  producto,
  variante = 'oscura',
  idioma,
}: Props) {
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
      </Link>

      <div className={estilos.cuerpo}>
        <div className={estilos.categoria}>
          {producto.categoria}
          {/* La técnica, al lado de la categoría. Es lo que convierte la fila
              de destacados en una muestra de lo que sabe hacer NYX: sin esto
              se ven seis productos y no se nota que cada uno está hecho de una
              forma distinta. */}
          {producto.tecnica && <span className={estilos.tecnica}>{producto.tecnica}</span>}
        </div>

        <Link href={href} className={estilos.nombre}>
          {producto.nombre}
        </Link>

        {variante === 'clara' && producto.descripcion && (
          <div className={estilos.detalle}>{producto.descripcion}</div>
        )}

        <div className={estilos.pie}>
          <span className={estilos.precio}>{formatearPrecio(producto.precio, idioma)}</span>
          <Link href={href} className={estilos.accion}>
            {t.catalogo.verProducto}
          </Link>
        </div>
      </div>
    </article>
  )
}
