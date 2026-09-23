import type { Metadata } from 'next'
import Link from 'next/link'
import {
  obtenerCatalogo,
  obtenerContacto,
  hayBaseDeDatos,
  enlaceWhatsapp,
} from '@/lib/consultas'
import Formulario from './Formulario'
import e from './Cotizar.module.css'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Solicitar cotización',
  description:
    'Cuéntanos qué deseas personalizar y recibe una cotización según cantidad, material y acabado.',
}

const PUNTOS = [
  'Respondemos en un máximo de 24 horas hábiles.',
  'El precio de la web es referencial; el final depende de cantidad, material y acabado.',
  'Revisamos tu arte antes de producir y te avisamos si la resolución no alcanza.',
  'Sin mínimo para productos individuales. Corporativo desde 10 unidades.',
]

export default async function Cotizar({
  searchParams,
}: {
  searchParams: Promise<{ producto?: string; diseno?: string }>
}) {
  const [{ producto: slugInicial, diseno: disenoToken }, contacto, catalogo] = await Promise.all([
    searchParams,
    obtenerContacto(),
    // Todo el catálogo visible cabe en el desplegable de producto.
    obtenerCatalogo({ porPagina: 200 }),
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
          <Link href="/">Inicio</Link> / Cotización
        </nav>

        <div className={e.cuerpo}>
          <div>
            <h1 className={e.titulo}>Solicitar cotización</h1>
            <p className={e.intro}>
              Cuéntanos qué deseas personalizar. Recibirás la confirmación de NYX con el
              precio final y el tiempo de entrega.
            </p>

            <Formulario
              productos={opciones}
              productoInicial={slugInicial}
              subidaDisponible={hayBaseDeDatos()}
              disenoToken={disenoToken}
            />
          </div>

          <aside className={e.lateral}>
            <div className={e.tituloLateral}>Cómo funciona</div>
            <ul className={e.puntos}>
              {PUNTOS.map((p) => (
                <li key={p} className={e.punto}>
                  <span className={e.puntoMarca} aria-hidden="true">
                    —
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>

            <div className={e.contactoLateral}>
              <span>¿Prefieres escribirnos?</span>
              <a
                href={enlaceWhatsapp(contacto.whatsapp, 'Hola NYX, quisiera una cotización.')}
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
