'use client'

import { useRouter } from 'next/navigation'
import e from './Panel.module.css'

/**
 * Volver a la pantalla anterior del panel.
 *
 * Existe porque el panel tiene enlaces que saltan de una sección a otra —desde
 * "Página principal" se va a Categorías o a Catálogo para cambiar lo que se
 * edita allí— y sin esto la única forma de deshacer ese salto es acordarse de
 * en qué sección se estaba y buscarla en el menú.
 *
 * Usa el historial del navegador, así que "anterior" significa lo mismo que en
 * el botón de atrás: la pantalla de la que se viene, no una jerarquía inventada
 * que nadie ha recorrido.
 *
 * Si no hay nada atrás —alguien abrió el enlace directo, o es la primera
 * página de la pestaña— lleva a Pedidos en lugar de sacar a la persona fuera
 * del panel, que es lo que haría `back()` a secas.
 */
export default function Volver() {
  const router = useRouter()

  return (
    <button
      type="button"
      className={e.volver}
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length <= 1) {
          router.push('/panel/pedidos')
          return
        }
        router.back()
      }}
    >
      <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
        <path
          d="M10 3L5 8l5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Volver
    </button>
  )
}
