'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { componerCara, precargarDiseno } from '@/lib/estudio/compositor'
import type { DisenoEstudio, Vista } from '@/lib/estudio/tipos'
import { buscarFuente } from '@/lib/estudio/preajustes'
import e from './Estudio.module.css'

interface Props {
  diseno: DisenoEstudio
  vista: Vista
  seleccionado: string | null
  onSeleccionar: (id: string | null) => void
  /** `fusionar` en true mientras dura un arrastre; false al soltar. */
  onMoverCapa: (id: string, x: number, y: number, fusionar: boolean) => void
}

/**
 * Editor 2D.
 *
 * El fondo (color + textura) se pinta en un `<canvas>` con el mismo compositor
 * que alimenta al visor 3D, para que ambos muestren exactamente lo mismo.
 *
 * Los logos, en cambio, van ENCIMA como elementos del DOM. Así se pueden
 * arrastrar sin escribir a mano la detección de impactos, y el navegador se
 * encarga del cursor, del foco y de la accesibilidad.
 */
export default function Editor2D({
  diseno,
  vista,
  seleccionado,
  onSeleccionar,
  onMoverCapa,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const [arrastrando, setArrastrando] = useState<string | null>(null)

  // El fondo se repinta cuando cambia el diseño o la cara. Se compone a 1024
  // aunque se muestre más pequeño: así la previsualización tiene la misma
  // resolución que la textura que acabará en el modelo.
  const repintar = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Se pinta SOLO el fondo. Logos y textos son elementos del DOM encima del
    // lienzo, así que pintarlos aquí también los duplicaría.
    componerCara(canvas, { ...diseno, logos: [], textos: [] }, vista)
  }, [diseno, vista])

  useEffect(() => {
    let vivo = true
    repintar()
    void precargarDiseno(diseno).then(() => {
      if (vivo) repintar()
    })
    return () => {
      vivo = false
    }
  }, [repintar, diseno])

  /**
   * El arrastre se escucha en WINDOW, no en el logo.
   *
   * Si el puntero se mueve rápido y sale del elemento, los eventos dejarían de
   * llegar y el logo se quedaría pegado a medio camino, con el ratón ya suelto
   * y el estado creyendo que sigue el arrastre.
   */
  useEffect(() => {
    if (!arrastrando) return

    const mover = (ev: PointerEvent) => {
      const caja = contenedorRef.current?.getBoundingClientRect()
      if (!caja || caja.width === 0 || caja.height === 0) return

      const x = Math.max(0, Math.min(100, ((ev.clientX - caja.left) / caja.width) * 100))
      const y = Math.max(0, Math.min(100, ((ev.clientY - caja.top) / caja.height) * 100))

      // fusionar: el movimiento no apila un estado nuevo en cada píxel.
      onMoverCapa(arrastrando, x, y, true)
    }

    const soltar = () => setArrastrando(null)

    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)

    return () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
    }
  }, [arrastrando, onMoverCapa])

  const logos = diseno.logos
    .filter((l) => l.vista === vista)
    .sort((a, b) => a.z - b.z)

  const textos = (diseno.textos ?? []).filter((x) => x.vista === vista)

  return (
    <div className={e.lienzo} ref={contenedorRef}>
      <canvas ref={canvasRef} />

      {/* Estado vacío: un lienzo con solo un color no dice qué se espera de ti.
          Desaparece en cuanto hay un logo en esta cara. */}
      {logos.length === 0 && textos.length === 0 && (
        <div className={e.lienzoVacio}>
          Añade un logotipo o un texto desde el panel de la derecha
          <br />y arrástralo hasta donde lo quieras.
        </div>
      )}

      <div
        className={e.zonaLogos}
        onPointerDown={(ev) => {
          // Pinchar en el fondo deselecciona.
          if (ev.target === ev.currentTarget) onSeleccionar(null)
        }}
      >
        {logos.map((logo) => (
          <div
            key={logo.id}
            className={e.logo}
            data-seleccionado={seleccionado === logo.id}
            data-arrastrando={arrastrando === logo.id}
            style={{
              left: `${logo.x}%`,
              top: `${logo.y}%`,
              width: `${logo.ancho}%`,
              opacity: logo.opacidad,
              zIndex: logo.z + 1,
              transform: `translate(-50%, -50%) rotate(${logo.rotacion}deg)`,
            }}
            onPointerDown={(ev) => {
              ev.preventDefault()
              onSeleccionar(logo.id)
              // El punto de partida ya está en el historial: al seleccionar no
              // se apila nada, y el arrastre fusiona. Un solo deshacer basta
              // para volver a donde estaba el logo.
              setArrastrando(logo.id)
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo.url} alt={logo.nombre} draggable={false} />
          </div>
        ))}

        {textos.map((capa) => {
          const fuente = buscarFuente(capa.fuente)

          return (
            <div
              key={capa.id}
              className={e.texto}
              data-seleccionado={seleccionado === capa.id}
              data-arrastrando={arrastrando === capa.id}
              style={{
                left: `${capa.x}%`,
                top: `${capa.y}%`,
                // cqh es 1% del alto del contenedor, que es exactamente la
                // unidad en la que la capa guarda su tamano. Asi el texto de
                // pantalla y el del lienzo 3D miden lo mismo sin medir nada
                // en JavaScript.
                fontSize: `${capa.tamano}cqh`,
                fontFamily: `var(${fuente.variable})`,
                fontWeight: fuente.peso,
                color: capa.color,
                opacity: capa.opacidad,
                zIndex: capa.z + 1,
                transform: `translate(-50%, -50%) rotate(${capa.rotacion}deg)`,
              }}
              onPointerDown={(ev) => {
                ev.preventDefault()
                onSeleccionar(capa.id)
                setArrastrando(capa.id)
              }}
            >
              {capa.texto}
            </div>
          )
        })}
      </div>
    </div>
  )
}
