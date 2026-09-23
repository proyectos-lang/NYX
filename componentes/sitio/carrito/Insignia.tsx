'use client'

import Link from 'next/link'
import { useCarrito } from './estado'
import { ruta, type Idioma } from '@/lib/i18n'
import { textos } from '@/lib/textos'
import s from './Carrito.module.css'

/**
 * El acceso al carrito, en la cabecera.
 *
 * Mientras `listo` es false no se pinta el número. El carrito se lee de
 * localStorage después de montar, así que el servidor no puede saber cuántas
 * unidades hay: pintarlo antes haría que React avisara de que el HTML del
 * servidor no coincide con el del navegador.
 *
 * Con el carrito vacío no se enseña nada, ni el icono. Un carrito
 * permanentemente vacío en la cabecera invita a pulsarlo para no encontrar
 * nada, y este sitio vende sobre todo por cotización: el carrito es el camino
 * secundario.
 */
export default function InsigniaCarrito({ idioma }: { idioma: Idioma }) {
  const { unidades, listo } = useCarrito()
  const t = textos(idioma)

  if (!listo || unidades === 0) return null

  return (
    <Link
      href={ruta('/carrito', idioma)}
      className={s.insignia}
      aria-label={`${t.carrito.verCarrito}: ${unidades}`}
    >
      <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
        <path
          d="M3 4h2l1.6 8.4a1 1 0 0 0 1 .8h6.9a1 1 0 0 0 1-.8L17 7H6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="8.5" cy="16" r="1.2" fill="currentColor" />
        <circle cx="14.5" cy="16" r="1.2" fill="currentColor" />
      </svg>
      <span className={s.cuenta}>{unidades}</span>
    </Link>
  )
}
