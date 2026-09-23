import type { Metadata } from 'next'
import Link from 'next/link'
import {
  obtenerCatalogo,
  obtenerContacto,
  hayBaseDeDatos,
  enlaceWhatsapp,
} from '@/lib/consultas'
import Formulario from './Formulario'
import { ruta, esIdioma, type Idioma } from '@/lib/i18n'
import { textos } from '@/lib/textos'
import e from './Cotizar.module.css'

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ idioma: string }>
}): Promise<Metadata> {
  const { idioma: crudo } = await params
  const t = textos(esIdioma(crudo) ? crudo : 'es').cotizar
  return { title: t.titulo, description: t.intro }
}

export default async function Cotizar({
  params,
  searchParams,
}: {
  params: Promise<{ idioma: string }>
  searchParams: Promise<{ producto?: string; diseno?: string }>
}) {
  const { idioma: crudo } = await params
  const idioma: Idioma = esIdioma(crudo) ? crudo : 'es'
  const t = textos(idioma).cotizar

  const [{ producto: slugInicial, diseno: disenoToken }, contacto, catalogo] = await Promise.all([
    searchParams,
    obtenerContacto(),
    // Todo el catálogo visible cabe en el desplegable de producto.
    obtenerCatalogo({ porPagina: 200 }, idioma),
  ])

  const opciones = catalogo.productos.map((p) => ({
    id: p.id,
    slug: p.slug,
    nombre: p.nombre,
    sku: p.sku,
  }))

  return (
    <div className={e.pagina}>
      <div className="contenedor">
        <nav className={e.migas}>
          <Link href={ruta('/', idioma)}>{textos(idioma).nav.inicio}</Link> / {t.migas}
        </nav>

        <div className={e.cuerpo}>
          <div>
            <h1 className={e.titulo}>{t.titulo}</h1>
            <p className={e.intro}>{t.intro}</p>

            <Formulario
              productos={opciones}
              productoInicial={slugInicial}
              subidaDisponible={hayBaseDeDatos()}
              disenoToken={disenoToken}
              idioma={idioma}
            />
          </div>

          <aside className={e.lateral}>
            <div className={e.tituloLateral}>{t.comoFunciona}</div>
            <ul className={e.puntos}>
              {t.puntos.map((p) => (
                <li key={p} className={e.punto}>
                  <span className={e.puntoMarca} aria-hidden="true">
                    —
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>

            <div className={e.contactoLateral}>
              <span>{t.prefieresEscribir}</span>
              <a
                href={enlaceWhatsapp(contacto.whatsapp, textos(idioma).portada.mensajeWhatsapp)}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp {contacto.whatsapp}
              </a>
              <a href={`mailto:${contacto.email}`}>{contacto.email}</a>
              <span>{contacto.horario}</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
