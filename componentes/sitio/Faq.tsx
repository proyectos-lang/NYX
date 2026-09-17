'use client'

import { useState } from 'react'
import type { FaqVista } from '@/lib/demo'
import estilos from './Secciones.module.css'

/**
 * Acordeón de preguntas. Como en la maqueta, solo una abierta a la vez y la
 * primera empieza desplegada.
 */
export default function Faq({ preguntas }: { preguntas: FaqVista[] }) {
  const [abierta, setAbierta] = useState(0)

  return (
    <div className={estilos.faqLista}>
      {preguntas.map((p, i) => {
        const estaAbierta = abierta === i
        const idPanel = `faq-panel-${i}`

        return (
          <div key={p.pregunta} className={estilos.faqItem}>
            <button
              type="button"
              className={estilos.faqBoton}
              aria-expanded={estaAbierta}
              aria-controls={idPanel}
              onClick={() => setAbierta(estaAbierta ? -1 : i)}
            >
              <span>{p.pregunta}</span>
              <span className={estilos.faqSigno} aria-hidden="true">
                {estaAbierta ? '−' : '+'}
              </span>
            </button>
            {estaAbierta && (
              <p id={idPanel} className={estilos.faqRespuesta}>
                {p.respuesta}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
