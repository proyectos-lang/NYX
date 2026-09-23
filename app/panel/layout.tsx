import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { contarPorEstado, obtenerPerfil } from '@/lib/panel'
import { cerrarSesion } from '@/app/login/acciones'
import NavPanel from './NavPanel'
import Volver from './Volver'
import e from './Panel.module.css'

export const metadata: Metadata = {
  title: { default: 'Panel', template: '%s · Panel NYX' },
  robots: { index: false, follow: false },
}

// El panel refleja el estado real del negocio: nada de caché.
export const dynamic = 'force-dynamic'

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  // Si la base no responde, el panel sigue navegable y es cada pantalla la que
  // explica el problema; la barra lateral no debe tumbar toda la sección.
  let nombre = 'Equipo NYX'
  let rol = 'editor'
  let nuevos = 0

  try {
    const [perfil, cuenta] = await Promise.all([obtenerPerfil(), contarPorEstado()])
    if (perfil?.nombre) nombre = perfil.nombre
    if (perfil?.rol) rol = perfil.rol
    nuevos = cuenta.nuevo
  } catch {
    // Silencio a propósito: lo cuenta la pantalla, no el armazón.
  }

  return (
    <div className={e.shell}>
      <aside className={e.lateral}>
        <div className={e.marca}>
          <Image src="/assets/nyx-logo-dark.png" alt="NYX" width={110} height={34} />
          <div>
            <div className={e.marcaTexto}>Panel</div>
            <div className={e.marcaSub}>Administración</div>
          </div>
        </div>

        <NavPanel pedidosNuevos={nuevos} />

        <div className={e.pieLateral}>
          <div>
            <div className={e.usuario}>{nombre}</div>
            <div className={e.rol}>{rol}</div>
          </div>

          <Link href="/" className={e.enlaceSecundario}>
            Ver el sitio
          </Link>

          <form action={cerrarSesion}>
            <button type="submit" className={e.enlaceSecundario} style={{ width: '100%' }}>
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className={e.principal}>
        <Volver />
        {children}
      </main>
    </div>
  )
}
