import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  obtenerCatalogo,
  obtenerContacto,
  obtenerProducto,
  obtenerSlugsDeProductos,
  enlaceWhatsapp,
} from '@/lib/consultas'
import { ETIQUETA_TIPO } from '@/lib/database.types'
import { precio as formatearPrecio, stock as textoStock } from '@/lib/formato'
import TarjetaProducto from '@/componentes/sitio/TarjetaProducto'
import BotonAnadir from '@/componentes/sitio/carrito/BotonAnadir'
import { IDIOMAS, ruta, esIdioma, type Idioma } from '@/lib/i18n'
import { textos } from '@/lib/textos'
import Galeria from './Galeria'
import e from './Producto.module.css'

export const revalidate = 300

/** Cada producto, en cada idioma. */
export async function generateStaticParams() {
  const slugs = await obtenerSlugsDeProductos()
  return IDIOMAS.flatMap((idioma) => slugs.map((slug) => ({ idioma, slug })))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ idioma: string; slug: string }>
}): Promise<Metadata> {
  const { idioma: crudo, slug } = await params
  const idioma: Idioma = esIdioma(crudo) ? crudo : 'es'
  const producto = await obtenerProducto(slug, idioma)

  if (!producto) {
    return { title: idioma === 'en' ? 'Product not found' : 'Producto no encontrado' }
  }

  return {
    title: producto.nombre,
    description:
      producto.descripcion ??
      (idioma === 'en'
        ? `${producto.nombre}, personalized by NYX. Reference price, confirmed by quantity and finish.`
        : `${producto.nombre} personalizable por NYX. Precio referencial, confirmado según cantidad y acabado.`),
    openGraph: producto.imagen ? { images: [{ url: producto.imagen }] } : undefined,
  }
}

export default async function FichaProducto({
  params,
}: {
  params: Promise<{ idioma: string; slug: string }>
}) {
  const { idioma: crudo, slug } = await params
  const idioma: Idioma = esIdioma(crudo) ? crudo : 'es'
  const txt = textos(idioma)

  const producto = await obtenerProducto(slug, idioma)

  if (!producto) notFound()

  const [contacto, relacionados] = await Promise.all([
    obtenerContacto(),
    obtenerCatalogo({ categoria: producto.categoriaSlug, porPagina: 5 }, idioma),
  ])

  const inmediato = producto.tipo === 'entrega_inmediata'
  const otros = relacionados.productos.filter((p) => p.slug !== producto.slug).slice(0, 4)

  const mensajeWhatsapp = txt.producto.mensajeWhatsapp(producto.nombre, producto.sku)

  return (
    <div className={e.pagina}>
      <div className="contenedor">
        <nav className={e.migas}>
          <Link href={ruta('/', idioma)}>{txt.nav.inicio}</Link> /{' '}
          <Link href={ruta('/catalogo', idioma)}>{txt.catalogo.migas}</Link> /{' '}
          <Link href={ruta(`/catalogo?categoria=${producto.categoriaSlug}`, idioma)}>
            {producto.categoria}
          </Link>{' '}
          / {producto.nombre}
        </nav>

        <div className={e.cuerpo}>
          <Galeria fotos={producto.fotos} nombre={producto.nombre} />

          <div>
            <span
              className={e.insignia}
              style={
                inmediato
                  ? { background: '#dff3e4', color: '#0a5c2b' }
                  : { background: 'rgba(201,154,46,.92)', color: '#080808' }
              }
            >
              {inmediato ? txt.catalogo.entregaInmediata : txt.catalogo.personalizable}
            </span>

            <h1 className={e.nombre}>{producto.nombre}</h1>
            <div className={e.sku}>{txt.producto.referencia} {producto.sku}</div>

            {producto.descripcion && <p className={e.descripcion}>{producto.descripcion}</p>}

            <div className={e.bloquePrecio}>
              <div className={e.precio}>{formatearPrecio(producto.precio, idioma)}</div>
              <div className={e.precioNota}>
                {txt.producto.precioNota}
              </div>
            </div>

            <div className={e.datos}>
              <div className={e.dato}>
                <div className={e.datoEtiqueta}>{txt.producto.categoria}</div>
                <div className={e.datoValor}>{producto.categoria}</div>
              </div>
              <div className={e.dato}>
                <div className={e.datoEtiqueta}>{txt.producto.disponibilidad}</div>
                <div className={e.datoValor}>
                  {textoStock(producto.stock, producto.bajoPedido, idioma)}
                </div>
              </div>
              <div className={e.dato}>
                <div className={e.datoEtiqueta}>{txt.producto.tipo}</div>
                <div className={e.datoValor}>{inmediato ? txt.catalogo.entregaInmediata : txt.catalogo.personalizable}</div>
              </div>
              <div className={e.dato}>
                <div className={e.datoEtiqueta}>{txt.producto.tiempoEstimado}</div>
                <div className={e.datoValor}>
                  {inmediato ? txt.producto.mismoDia : txt.producto.diasHabiles}
                </div>
              </div>
            </div>

            {/* Entrega inmediata: hay stock y precio cerrado, así que se puede
                pedir directamente. Los personalizables no tienen precio hasta
                que NYX sabe cantidad, material y acabado. */}
            {inmediato && (
              <div style={{ marginBottom: 14 }}>
                <BotonAnadir
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
              </div>
            )}

            <div className={e.acciones}>
              <Link
                href={ruta(`/cotizar?producto=${producto.slug}`, idioma)}
                className="boton-oro"
              >
                {txt.producto.cotizar}
              </Link>
              <a
                href={enlaceWhatsapp(contacto.whatsapp, mensajeWhatsapp)}
                className="boton-linea"
              >
                {txt.producto.preguntarWhatsapp}
              </a>
            </div>

            <p className={e.aviso}>
              {txt.producto.avisoArchivo}
            </p>
          </div>
        </div>

        {otros.length > 0 && (
          <section className={e.relacionados}>
            <h2 className={e.tituloRelacionados}>{txt.producto.masDe(producto.categoria)}</h2>
            <div className={e.rejilla}>
              {otros.map((p) => (
                <TarjetaProducto key={p.id} producto={p} variante="oscura" idioma={idioma} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
