'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import InsigniaCarrito from './carrito/Insignia'
import estilos from './Cabecera.module.css'

const ENLACES = [
  { texto: 'Inicio', href: '/' },
  { texto: 'Catálogo', href: '/catalogo' },
  { texto: 'Estudio 3D', href: '/estudio' },
  { texto: 'Personalizables', href: '/catalogo?tipo=personalizable' },
  { texto: 'Entrega inmediata', href: '/catalogo?tipo=entrega_inmediata' },
  { texto: 'Nosotros', href: '/#nosotros' },
  { texto: 'Preguntas frecuentes', href: '/#preguntas' },
  { texto: 'Contacto', href: '/#contacto' },
]

export default function Cabecera() {
  const [abierto, setAbierto] = useState(false)
  const ruta = usePathname()

  return (
    <header className={estilos.cabecera} style={{ position: 'sticky' }}>
      <Link href="/" className={estilos.logo} aria-label="NYX, ir al inicio">
        <Image
          src="/assets/nyx-logo-dark.png"
          alt="NYX"
          width={140}
          height={36}
          priority
          style={{ height: 'auto', width: 'auto' }}
        />
      </Link>

      <nav className={estilos.navegacion}>
        {ENLACES.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className={estilos.enlace}
            data-activo={ruta === e.href}
          >
            {e.texto}
          </Link>
        ))}
        <Link href="/cotizar" className={estilos.cta}>
          Solicitar cotización
        </Link>
      </nav>

      {/* Fuera de <nav> a propósito: la navegación se oculta por debajo de
          1040px y el carrito quedaría inalcanzable justo en el móvil, que es
          donde más se compra algo que ya está hecho. */}
      <div className={estilos.acciones}>
        <InsigniaCarrito />
      </div>

      <button
        type="button"
        className={estilos.hamburguesa}
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
      >
        <span />
        <span />
        <span />
      </button>

      {abierto && (
        <div className={estilos.desplegable}>
          {ENLACES.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className={estilos.enlaceMovil}
              onClick={() => setAbierto(false)}
            >
              {e.texto}
            </Link>
          ))}
          <Link href="/cotizar" className={estilos.ctaMovil} onClick={() => setAbierto(false)}>
            Solicitar cotización
          </Link>
        </div>
      )}
    </header>
  )
}
