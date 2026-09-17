import Link from 'next/link'
import Image from 'next/image'
import { obtenerCategorias, obtenerContacto, enlaceWhatsapp } from '@/lib/consultas'
import estilos from './Pie.module.css'

export default async function Pie() {
  const [contacto, categorias] = await Promise.all([obtenerContacto(), obtenerCategorias()])

  return (
    <footer className={estilos.pie} id="contacto">
      <div className={`contenedor ${estilos.rejilla} al-entrar`}>
        <div className={estilos.marca}>
          <Image src="/assets/nyx-logo-dark.png" alt="NYX" width={200} height={64} />
          <p className={estilos.lema}>
            Sublimación y productos personalizados. Convertimos tu idea en un objeto que
            representa tu marca.
          </p>
          <div className={estilos.redes}>
            <a
              className={estilos.red}
              href={enlaceWhatsapp(contacto.whatsapp, 'Hola NYX, quisiera una cotización.')}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
            <a className={estilos.red} href={`mailto:${contacto.email}`}>
              Correo
            </a>
          </div>
        </div>

        <div>
          <div className={estilos.tituloColumna}>Navegación</div>
          <div className={estilos.columna}>
            <Link href="/">Inicio</Link>
            <Link href="/catalogo">Catálogo</Link>
            <Link href="/catalogo?tipo=personalizable">Personalizables</Link>
            <Link href="/catalogo?tipo=entrega_inmediata">Entrega inmediata</Link>
            <Link href="/#nosotros">Nosotros</Link>
          </div>
        </div>

        <div>
          <div className={estilos.tituloColumna}>Categorías</div>
          <div className={estilos.columna}>
            {categorias.slice(0, 5).map((c) => (
              <Link key={c.slug} href={`/catalogo?categoria=${c.slug}`}>
                {c.nombre}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className={estilos.tituloColumna}>Contacto</div>
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
          © {new Date().getFullYear()} NYX. Todos los derechos reservados.
        </span>
        <span className={estilos.legal}>{contacto.horario}</span>
        <Link href="/login" className={estilos.acceso}>
          Acceso administrador
        </Link>
      </div>
    </footer>
  )
}
