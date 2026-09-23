'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import e from './Panel.module.css'

/**
 * El menú sigue el recorrido de la web, no la forma de la base de datos.
 *
 * Antes iba por tablas —Catálogo, Categorías, Contenido, Preguntas— y para
 * cambiar la foto grande de la portada había que saber que eso vivía dentro de
 * "Contenido". Ahora se busca por donde se ve: lo de la página principal está
 * en Inicio, lo del pie en Contacto.
 *
 * Pedidos se queda arriba del todo aunque no salga en la web: es la bandeja de
 * trabajo, lo que se abre cada mañana.
 */
const SECCIONES = [
  { href: '/panel/pedidos', etiqueta: 'Pedidos' },
  { href: '/panel/inicio', etiqueta: 'Página principal' },
  { href: '/panel/catalogo', etiqueta: 'Catálogo' },
  { href: '/panel/categorias', etiqueta: 'Categorías' },
  { href: '/panel/preguntas', etiqueta: 'Preguntas frecuentes' },
  { href: '/panel/ajustes', etiqueta: 'Contacto y pie' },
  // Al final y separado: es técnico y no forma parte del recorrido de la web.
  { href: '/panel/modelos', etiqueta: 'Modelos 3D' },
]

export default function NavPanel({ pedidosNuevos }: { pedidosNuevos: number }) {
  const ruta = usePathname()

  return (
    <nav className={e.nav}>
      {SECCIONES.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          className={e.navEnlace}
          data-activo={ruta.startsWith(s.href)}
        >
          <span>{s.etiqueta}</span>
          {s.href === '/panel/pedidos' && pedidosNuevos > 0 && (
            <span className={e.insigniaNav}>{pedidosNuevos}</span>
          )}
        </Link>
      ))}
    </nav>
  )
}
