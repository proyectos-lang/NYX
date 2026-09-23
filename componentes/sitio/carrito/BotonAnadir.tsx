'use client'

import { useState } from 'react'
import { useCarrito } from './estado'
import type { LineaCarrito } from '@/lib/carrito'
import type { Idioma } from '@/lib/i18n'
import { textos } from '@/lib/textos'
import s from './Carrito.module.css'

interface Props {
  producto: Omit<LineaCarrito, 'cantidad'>
  /** 'solido' en la ficha del producto, 'discreto' en las tarjetas. */
  variante?: 'solido' | 'discreto'
  idioma: Idioma
}

/**
 * Añadir al carrito.
 *
 * Solo se pinta para productos de entrega inmediata: ver el porqué en
 * carrito/estado.tsx. Quien lo coloca decide, este componente no comprueba el
 * tipo.
 *
 * Confirma en el propio botón durante un par de segundos en vez de abrir un
 * aviso o el panel del carrito. Añadir varias cosas seguidas es lo normal, y
 * cualquier cosa que interrumpa obliga a cerrarla para seguir comprando.
 */
export default function BotonAnadir({ producto, variante = 'solido', idioma }: Props) {
  const { anadir, lineas } = useCarrito()
  const [confirmado, setConfirmado] = useState(false)
  const t = textos(idioma)

  const enCarrito = lineas.find((l) => l.productoId === producto.productoId)?.cantidad ?? 0
  const agotado = producto.stock !== null && producto.stock <= 0
  const topeAlcanzado = producto.stock !== null && enCarrito >= producto.stock

  if (agotado) {
    // El borde punteado cambia con el fondo: la ficha del producto es casi
    // negra y las tarjetas del catálogo son blancas.
    return (
      <span
        className={variante === 'solido' ? s.agotadoOscuro : s.agotado}
        aria-disabled="true"
      >
        {t.carrito.agotado}
      </span>
    )
  }

  return (
    <button
      type="button"
      className={variante === 'solido' ? s.anadirSolido : s.anadirDiscreto}
      disabled={topeAlcanzado}
      onClick={() => {
        anadir(producto)
        setConfirmado(true)
        window.setTimeout(() => setConfirmado(false), 1800)
      }}
    >
      {topeAlcanzado
        ? t.carrito.yaTienesTodo(producto.stock ?? 0)
        : confirmado
          ? t.carrito.anadido
          : t.carrito.anadir}
    </button>
  )
}
