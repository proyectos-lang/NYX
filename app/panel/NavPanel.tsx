'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import e from './Panel.module.css'

const SECCIONES = [
  { href: '/panel/pedidos', etiqueta: 'Pedidos' },
  { href: '/panel/catalogo', etiqueta: 'Catálogo' },
  { href: '/panel/categorias', etiqueta: 'Categorías' },
  { href: '/panel/modelos', etiqueta: 'Modelos 3D' },
  { href: '/panel/contenido', etiqueta: 'Contenido' },
  { href: '/panel/preguntas', etiqueta: 'Preguntas' },
  { href: '/panel/ajustes', etiqueta: 'Contacto y ajustes' },
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
