import Link from 'next/link'
import Image from 'next/image'
import { obtenerCategorias, obtenerContacto, enlaceWhatsapp } from '@/lib/consultas'
import { ruta, type Idioma } from '@/lib/i18n'
import { textos } from '@/lib/textos'
import estilos from './Pie.module.css'

export default async function Pie({ idioma }: { idioma: Idioma }) {
  const [contacto, categorias] = await Promise.all([
    obtenerContacto(),
    obtenerCategorias(idioma),
  ])

  const t = textos(idioma)

  const NAVEGACION = [
    { texto: t.nav.inicio, href: '/' },
    { texto: t.nav.catalogo, href: '/catalogo' },
    { texto: t.nav.personalizables, href: '/catalogo?tipo=personalizable' },
    { texto: t.nav.entregaInmediata, href: '/catalogo?tipo=entrega_inmediata' },
    { texto: t.nav.nosotros, href: '/#nosotros' },
  ]

  return (
    <footer className={estilos.pie} id="contacto">
      <div className={`contenedor ${estilos.rejilla} al-entrar`}>
        <div className={estilos.marca}>
          <Image src="/assets/nyx-logo-dark.png" alt="NYX" width={200} height={64} />
          <p className={estilos.lema}>{t.pie.lema}</p>
          <div className={estilos.redes}>
            <a
              className={estilos.red}
              href={enlaceWhatsapp(contacto.whatsapp, t.portada.mensajeWhatsapp)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.pie.whatsapp}
            </a>
            <a className={estilos.red} href={`mailto:${contacto.email}`}>
              {t.pie.correo}
            </a>
          </div>
        </div>

        <div>
          <div className={estilos.tituloColumna}>{t.pie.navegacion}</div>
          <div className={estilos.columna}>
            {NAVEGACION.map((n) => (
              <Link key={n.href} href={ruta(n.href, idioma)}>
                {n.texto}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className={estilos.tituloColumna}>{t.pie.categorias}</div>
          <div className={estilos.columna}>
            {categorias.slice(0, 5).map((c) => (
              <Link key={c.slug} href={ruta(`/catalogo?categoria=${c.slug}`, idioma)}>
                {c.nombre}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className={estilos.tituloColumna}>{t.pie.contacto}</div>
          <div className={estilos.columna}>
            <a
              href={enlaceWhatsapp(contacto.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp {contacto.whatsapp}
            </a>
            <a href={`mailto:${contacto.email}`}>{contacto.email}</a>
            <span>{contacto.ciudad}</span>
            <span>{contacto.horario}</span>
          </div>
        </div>
      </div>

      <div className={estilos.barra}>
        <span className={estilos.legal}>
          © {new Date().getFullYear()} NYX. {t.pie.derechos}
        </span>
        <span className={estilos.legal}>{contacto.horario}</span>
        {/* El panel no es bilingüe todavía, así que este enlace no lleva
            prefijo de idioma. */}
        <Link href="/login" className={estilos.acceso}>
          {t.pie.acceso}
        </Link>
      </div>
    </footer>
  )
}
