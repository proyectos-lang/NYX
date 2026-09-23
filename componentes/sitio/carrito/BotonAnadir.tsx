'use client'

import { useState } from 'react'
import { useCarrito } from './estado'
import type { LineaCarrito } from '@/lib/carrito'
import s from './Carrito.module.css'

interface Props {
  producto: Omit<LineaCarrito, 'cantidad'>
  /** 'solido' en la ficha del producto, 'discreto' en las tarjetas. */
  variante?: 'solido' | 'discreto'
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
export default function BotonAnadir({ producto, variante = 'solido' }: Props) {
  const { anadir, lineas } = useCarrito()
  const [confirmado, setConfirmado] = useState(false)

  const enCarrito = lineas.find((l) => l.productoId === producto.productoId)?.cantidad ?? 0
  const agotado = producto.stock !== null && producto.stock <= 0
  const topeAlcanzado = producto.stock !== null && enCarrito >= producto.stock

  if (agotado) {
    return (
      <span className={s.agotado} aria-disabled="true">
        Agotado
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
        ? `Ya tienes las ${producto.stock} disponibles`
        : confirmado
          ? 'Añadido ✓'
          : 'Añadir al carrito'}
    </button>
  )
}
