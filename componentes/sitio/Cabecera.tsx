'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ruta, type Idioma } from '@/lib/i18n'
import { textos } from '@/lib/textos'
import InsigniaCarrito from './carrito/Insignia'
import BotonIdioma from './BotonIdioma'
import estilos from './Cabecera.module.css'

export default function Cabecera({ idioma }: { idioma: Idioma }) {
  const [abierto, setAbierto] = useState(false)
  const rutaActual = usePathname()
  const t = textos(idioma)

  // Todos los enlaces pasan por ruta(): uno sin prefijo devuelve al español a
  // mitad de navegación, y el fallo es de los que nadie reporta porque parece
  // que la web se estropeó sola.
  const ENLACES = [
    { texto: t.nav.inicio, href: '/' },
    { texto: t.nav.catalogo, href: '/catalogo' },
    { texto: t.nav.estudio, href: '/estudio' },
    { texto: t.nav.personalizables, href: '/catalogo?tipo=personalizable' },
    { texto: t.nav.entregaInmediata, href: '/catalogo?tipo=entrega_inmediata' },
    { texto: t.nav.nosotros, href: '/#nosotros' },
    { texto: t.nav.preguntas, href: '/#preguntas' },
    { texto: t.nav.contacto, href: '/#contacto' },
  ]

  return (
    <header className={estilos.cabecera} style={{ position: 'sticky' }}>
      <Link href={ruta('/', idioma)} className={estilos.logo} aria-label={t.nav.irAlInicio}>
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
        {ENLACES.map((e) => {
          const destino = ruta(e.href, idioma)
          return (
            <Link
              key={e.href}
              href={destino}
              className={estilos.enlace}
              data-activo={rutaActual === destino}
            >
              {e.texto}
            </Link>
          )
        })}
        <Link href={ruta('/cotizar', idioma)} className={estilos.cta}>
          {t.nav.cotizar}
        </Link>
      </nav>

      {/* Fuera de <nav> a propósito: la navegación se oculta por debajo de
          1040px y el carrito y el idioma quedarían inalcanzables justo en el
          móvil, que es donde más se compra algo que ya está hecho. */}
      <div className={estilos.acciones}>
        <InsigniaCarrito idioma={idioma} />
        <BotonIdioma idioma={idioma} />
      </div>

      <button
        type="button"
        className={estilos.hamburguesa}
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={abierto ? t.nav.cerrarMenu : t.nav.abrirMenu}
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
              href={ruta(e.href, idioma)}
              className={estilos.enlaceMovil}
              onClick={() => setAbierto(false)}
            >
              {e.texto}
            </Link>
          ))}
          <Link
            href={ruta('/cotizar', idioma)}
            className={estilos.ctaMovil}
            onClick={() => setAbierto(false)}
          >
            {t.nav.cotizar}
          </Link>
        </div>
      )}
    </header>
  )
}
