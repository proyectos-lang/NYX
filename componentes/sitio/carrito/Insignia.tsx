'use client'

import { useCarrito } from './estado'
import { type Idioma } from '@/lib/i18n'
import { textos } from '@/lib/textos'
import s from './Carrito.module.css'

/**
 * El acceso al carrito, en la cabecera.
 *
 * ABRE EL CAJON, no lleva a una pagina. Antes era un enlace a /carrito, y
 * comprobar que llevabas costaba salir de donde estabas y volver atras.
 *
 * SE VE SIEMPRE, tambien con el carrito vacio. Antes se escondia, y un carrito
 * que aparece y desaparece deja a quien navega sin saber si el sitio tiene o
 * no. El numero solo sale cuando hay algo.
 *
 * Mientras `listo` es false no se pinta el numero: el carrito se lee de
 * localStorage despues de montar, asi que el servidor no puede saber cuantas
 * unidades hay, y pintarlo antes haria que React avisara de que el HTML del
 * servidor no coincide con el del navegador.
 */
export default function InsigniaCarrito({ idioma }: { idioma: Idioma }) {
  const { unidades, listo, abrir } = useCarrito()
  const t = textos(idioma)

  return (
    <button
      type="button"
      className={s.insignia}
      onClick={abrir}
      aria-label={`${t.carrito.verCarrito}${listo && unidades > 0 ? `: ${unidades}` : ''}`}
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
      {listo && unidades > 0 && <span className={s.cuenta}>{unidades}</span>}
    </button>
  )
}
