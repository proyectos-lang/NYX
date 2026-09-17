'use client'

import { useState } from 'react'
import Image from 'next/image'
import estilos from './Producto.module.css'

export default function Galeria({ fotos, nombre }: { fotos: string[]; nombre: string }) {
  const [activa, setActiva] = useState(0)

  if (fotos.length === 0) {
    return (
      <div className={estilos.principal} aria-label={`Sin fotos de ${nombre}`}>
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            font: '400 12px/1.6 ui-monospace, Menlo, monospace',
            color: 'var(--gris-suave)',
          }}
        >
          foto pendiente
        </span>
      </div>
    )
  }

  return (
    <div>
      <div className={estilos.principal}>
        <Image
          src={fotos[activa]}
          alt={nombre}
          fill
          priority
          sizes="(max-width: 900px) 100vw, 50vw"
        />
      </div>

      {fotos.length > 1 && (
        <div className={estilos.miniaturas}>
          {fotos.map((foto, i) => (
            <button
              key={foto}
              type="button"
              className={estilos.miniatura}
              data-activa={i === activa}
              onClick={() => setActiva(i)}
              aria-label={`Ver foto ${i + 1} de ${nombre}`}
              aria-pressed={i === activa}
            >
              <Image src={foto} alt="" fill sizes="120px" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
