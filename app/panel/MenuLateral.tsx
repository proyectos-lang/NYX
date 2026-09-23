'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import e from './Panel.module.css'

/**
 * La barra lateral del panel, que en móvil es un cajón.
 *
 * Hasta ahora, por debajo de 900px la barra se apilaba encima del contenido:
 * al entrar a cualquier pantalla lo primero eran siete enlaces y había que
 * pasarlos de largo para llegar a lo que ibas a hacer. Y como el menú va
 * creciendo, cada sección nueva empujaba el trabajo más abajo.
 *
 * Ahora se comporta como en el ordenador: está a la izquierda y siempre en el
 * mismo sitio, solo que oculta hasta que se pide.
 */
export default function MenuLateral({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  const ruta = usePathname()

  // Al cambiar de pantalla el cajón se cierra solo. Si no, se navega y el menú
  // sigue tapando justo lo que se acaba de abrir.
  useEffect(() => {
    setAbierto(false)
  }, [ruta])

  // Con el cajón abierto, el fondo no debe poder desplazarse: si no, se arrastra
  // la página de detrás creyendo que se mueve el menú.
  useEffect(() => {
    if (!abierto) return

    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previo
    }
  }, [abierto])

  // Escape cierra, como cualquier cosa que se superpone.
  useEffect(() => {
    if (!abierto) return

    const alPulsar = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setAbierto(false)
    }

    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [abierto])

  return (
    <>
      {/* Solo se ve en móvil; en el ordenador la barra está siempre. */}
      <button
        type="button"
        className={e.abrirMenu}
        onClick={() => setAbierto(true)}
        aria-label="Abrir el menú"
        aria-expanded={abierto}
      >
        <span className={e.rayas}>
          <span />
          <span />
          <span />
        </span>
        Menú
      </button>

      {abierto && (
        <button
          type="button"
          className={e.velo}
          onClick={() => setAbierto(false)}
          aria-label="Cerrar el menú"
          tabIndex={-1}
        />
      )}

      <aside className={e.lateral} data-abierto={abierto}>
        <button
          type="button"
          className={e.cerrarMenu}
          onClick={() => setAbierto(false)}
          aria-label="Cerrar el menú"
        >
          ✕
        </button>

        {children}
      </aside>
    </>
  )
}
