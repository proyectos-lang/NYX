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
import Galeria from './Galeria'
import e from './Producto.module.css'

export const revalidate = 300

export async function generateStaticParams() {
  const slugs = await obtenerSlugsDeProductos()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const producto = await obtenerProducto(slug)

  if (!producto) return { title: 'Producto no encontrado' }

  return {
    title: producto.nombre,
    description:
      producto.descripcion ??
      `${producto.nombre} personalizable por NYX. Precio referencial, confirmado según cantidad y acabado.`,
    openGraph: producto.imagen ? { images: [{ url: producto.imagen }] } : undefined,
  }
}

export default async function FichaProducto({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const producto = await obtenerProducto(slug)

  if (!producto) notFound()

  const [contacto, relacionados] = await Promise.all([
    obtenerContacto(),
    obtenerCatalogo({ categoria: producto.categoriaSlug, porPagina: 5 }),
  ])

  const inmediato = producto.tipo === 'entrega_inmediata'
  const otros = relacionados.productos.filter((p) => p.slug !== producto.slug).slice(0, 4)

  const mensajeWhatsapp = `Hola NYX, me interesa el producto ${producto.nombre} (${producto.sku}).`

  return (
    <div className={e.pagina}>
      <div className="contenedor">
        <nav className={e.migas}>
          <Link href="/">Inicio</Link> / <Link href="/catalogo">Catálogo</Link> /{' '}
          <Link href={`/catalogo?categoria=${producto.categoriaSlug}`}>
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
              {ETIQUETA_TIPO[producto.tipo]}
            </span>

            <h1 className={e.nombre}>{producto.nombre}</h1>
            <div className={e.sku}>Referencia {producto.sku}</div>

            {producto.descripcion && <p className={e.descripcion}>{producto.descripcion}</p>}

            <div className={e.bloquePrecio}>
              <div className={e.precio}>{formatearPrecio(producto.precio)}</div>
              <div className={e.precioNota}>
                Precio referencial. NYX confirma el valor final según cantidad, material y
                acabado.
              </div>
            </div>

            <div className={e.datos}>
              <div className={e.dato}>
                <div className={e.datoEtiqueta}>Categoría</div>
                <div className={e.datoValor}>{producto.categoria}</div>
              </div>
              <div className={e.dato}>
                <div className={e.datoEtiqueta}>Disponibilidad</div>
                <div className={e.datoValor}>
                  {textoStock(producto.stock, producto.bajoPedido)}
                </div>
              </div>
              <div className={e.dato}>
                <div className={e.datoEtiqueta}>Tipo</div>
                <div className={e.datoValor}>{ETIQUETA_TIPO[producto.tipo]}</div>
              </div>
              <div className={e.dato}>
                <div className={e.datoEtiqueta}>Tiempo estimado</div>
                <div className={e.datoValor}>
                  {inmediato ? 'Retiro el mismo día' : '3 a 7 días hábiles'}
                </div>
              </div>
            </div>

            <div className={e.acciones}>
              <Link href={`/cotizar?producto=${producto.slug}`} className="boton-oro">
                Solicitar cotización
              </Link>
              <a
                href={enlaceWhatsapp(contacto.whatsapp, mensajeWhatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="boton-linea"
              >
                Preguntar por WhatsApp
              </a>
            </div>

            <p className={e.aviso}>
              Podrás adjuntar tu logotipo o diseño en el formulario. Aceptamos PNG, JPG, PDF,
              AI o SVG. Revisamos el arte antes de producir.
            </p>
          </div>
        </div>

        {otros.length > 0 && (
          <section className={e.relacionados}>
            <h2 className={e.tituloRelacionados}>Más de {producto.categoria}</h2>
            <div className={e.rejilla}>
              {otros.map((p) => (
                <TarjetaProducto key={p.id} producto={p} variante="oscura" />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
