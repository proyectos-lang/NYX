'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  aplicar,
  deshacer,
  iniciar,
  puedeDeshacer,
  puedeRehacer,
  rehacer,
  type Historial,
} from '@/lib/estudio/historial'
import {
  disenoVacio,
  ETIQUETA_VISTA,
  VISTAS,
  type CapaLogo,
  type DisenoEstudio,
  type Modelo3D,
  type Vista,
} from '@/lib/estudio/tipos'
import { ErrorImagen, hayAlmacenamiento, subirImagen } from '@/lib/estudio/subir'
import Editor2D from './Editor2D'
import Visor from './Visor'
import e from './Estudio.module.css'

/** Colores de prenda habituales en sublimación. */
const PALETA = [
  '#FFFFFF', '#0B0B0B', '#3A3733', '#C9C9C9',
  '#C99A2E', '#8C2F2F', '#3A5A8C', '#1F3D2E',
  '#F2C9D4', '#CFE1F2', '#E9C877', '#2438C9',
]

interface Props {
  modelos: Modelo3D[]
  disenoInicial?: DisenoEstudio
}

export default function Estudio({ modelos, disenoInicial }: Props) {
  const [historial, setHistorial] = useState<Historial<DisenoEstudio>>(() =>
    iniciar(disenoInicial ?? disenoVacio(modelos[0]?.id ?? null))
  )
  const [vista, setVista] = useState<Vista>('frontal')
  const [pestana, setPestana] = useState<'2d' | '3d'>('2d')
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [aviso, setAviso] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  const capturarRef = useRef<(() => string | null) | null>(null)
  const entradaLogo = useRef<HTMLInputElement>(null)
  const entradaTextura = useRef<HTMLInputElement>(null)

  const diseno = historial.presente

  /**
   * Único punto por el que pasa cualquier edición. Si alguna ruta escribiera el
   * estado por su cuenta, deshacer saltaría a un punto que nunca existió.
   */
  const editar = useCallback((siguiente: DisenoEstudio, fusionar = false) => {
    setHistorial((h) => aplicar(h, siguiente, fusionar))
  }, [])

  const cara = diseno.caras[vista]
  const logoActivo = diseno.logos.find((l) => l.id === seleccionado) ?? null

  const modelo = useMemo(
    () => modelos.find((m) => m.id === diseno.modeloId) ?? modelos[0] ?? null,
    [modelos, diseno.modeloId]
  )

  // --- Operaciones sobre el diseño -----------------------------------------

  const cambiarCara = (patch: Partial<typeof cara>) =>
    editar({ ...diseno, caras: { ...diseno.caras, [vista]: { ...cara, ...patch } } })

  const cambiarLogo = (id: string, patch: Partial<CapaLogo>, fusionar = false) =>
    editar(
      { ...diseno, logos: diseno.logos.map((l) => (l.id === id ? { ...l, ...patch } : l)) },
      fusionar
    )

  const moverLogo = useCallback(
    (id: string, x: number, y: number, fusionar: boolean) => {
      setHistorial((h) =>
        aplicar(
          h,
          {
            ...h.presente,
            logos: h.presente.logos.map((l) => (l.id === id ? { ...l, x, y } : l)),
          },
          fusionar
        )
      )
    },
    []
  )

  const borrarLogo = (id: string) => {
    editar({ ...diseno, logos: diseno.logos.filter((l) => l.id !== id) })
    setSeleccionado(null)
  }

  // --- Subida de imágenes ---------------------------------------------------

  async function conArchivo(
    archivo: File | undefined,
    alSubir: (url: string, nombre: string) => void
  ) {
    if (!archivo) return

    setSubiendo(true)
    setAviso('')

    try {
      const imagen = await subirImagen(archivo)
      alSubir(imagen.url, imagen.nombre)

      if (imagen.temporal) {
        setAviso(
          'Supabase no está conectado: la imagen se ve, pero vive solo en esta pestaña y no se puede guardar.'
        )
      }
    } catch (error) {
      setAviso(
        error instanceof ErrorImagen ? error.message : 'No se pudo procesar la imagen.'
      )
    } finally {
      setSubiendo(false)
    }
  }

  const anadirLogo = (url: string, nombre: string) => {
    const nuevo: CapaLogo = {
      id: crypto.randomUUID(),
      url,
      nombre,
      vista,
      x: 50,
      y: 40,
      ancho: 25,
      rotacion: 0,
      opacidad: 1,
      z: diseno.logos.length,
    }
    editar({ ...diseno, logos: [...diseno.logos, nuevo] })
    setSeleccionado(nuevo.id)
  }

  // --- Exportar -------------------------------------------------------------

  const exportar = () => {
    const png = capturarRef.current?.()
    if (!png) {
      setAviso('Abre la vista 3D antes de exportar la imagen.')
      return
    }
    const enlace = document.createElement('a')
    enlace.href = png
    enlace.download = 'nyx-diseno.png'
    enlace.click()
  }

  // --- Interfaz -------------------------------------------------------------

  return (
    <div className={e.estudio}>
      <div className={e.cabecera}>
        <div>
          <span className="antetitulo" style={{ color: 'var(--oro)' }}>
            Estudio
          </span>
          <h1 className={e.titulo}>Diseña tu prenda</h1>
          <p className={e.pista}>
            Elige el color, añade una textura y coloca tu logotipo. Gíralo en 3D para verlo
            antes de pedirlo.
          </p>
        </div>

        <div className={e.barra}>
          <button
            type="button"
            className={e.botonTenue}
            onClick={() => setHistorial(deshacer)}
            disabled={!puedeDeshacer(historial)}
          >
            Deshacer
          </button>
          <button
            type="button"
            className={e.botonTenue}
            onClick={() => setHistorial(rehacer)}
            disabled={!puedeRehacer(historial)}
          >
            Rehacer
          </button>
          <button type="button" className={e.botonTenue} onClick={exportar}>
            Exportar PNG
          </button>
          <Link href="/cotizar" className={e.boton} style={{ textDecoration: 'none' }}>
            Pedir cotización
          </Link>
        </div>
      </div>

      <div className={e.cuerpo}>
        <div>
          <div className={e.pestanas}>
            <button
              type="button"
              className={e.pestana}
              data-activa={pestana === '2d'}
              onClick={() => setPestana('2d')}
            >
              Editar
            </button>
            <button
              type="button"
              className={e.pestana}
              data-activa={pestana === '3d'}
              onClick={() => setPestana('3d')}
            >
              Ver en 3D
            </button>

            <span style={{ flex: 1 }} />

            {VISTAS.map((v) => (
              <button
                key={v}
                type="button"
                className={e.pestana}
                data-activa={vista === v}
                onClick={() => setVista(v)}
              >
                {ETIQUETA_VISTA[v]}
              </button>
            ))}
          </div>

          {pestana === '2d' ? (
            <Editor2D
              diseno={diseno}
              vista={vista}
              seleccionado={seleccionado}
              onSeleccionar={setSeleccionado}
              onMoverLogo={moverLogo}
            />
          ) : (
            <div className={e.lienzo}>
              {modelo ? (
                <Visor
                  modelo={modelo}
                  diseno={diseno}
                  alPoderCapturar={(f) => {
                    capturarRef.current = f
                  }}
                />
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    placeItems: 'center',
                    padding: 30,
                    textAlign: 'center',
                    font: '300 12.5px/1.8 var(--fuente-sans), sans-serif',
                    color: 'var(--gris-suave)',
                  }}
                >
                  No hay ningún modelo 3D cargado todavía. Sube un archivo .glb desde el panel
                  para poder ver la prenda.
                </div>
              )}
            </div>
          )}
        </div>

        <div className={e.panel}>
          {aviso && <div className={e.aviso}>{aviso}</div>}

          {/* ---------------------------------------------------- Prenda */}
          <div className={e.bloque}>
            <div className={e.tituloBloque}>Prenda · {ETIQUETA_VISTA[vista]}</div>

            {modelos.length > 1 && (
              <div className={e.fila}>
                <span className={e.etiqueta}>Modelo</span>
                <select
                  className={e.campoTexto}
                  value={diseno.modeloId ?? ''}
                  onChange={(ev) => editar({ ...diseno, modeloId: ev.target.value })}
                >
                  {modelos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={e.fila}>
              <span className={e.etiqueta}>Color</span>
              <input
                className={e.color}
                type="color"
                value={cara.color}
                onChange={(ev) => cambiarCara({ color: ev.target.value })}
                aria-label="Color de la prenda"
              />
              <span className={e.valor}>{cara.color}</span>
            </div>

            <div className={e.paleta}>
              {PALETA.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={e.muestra}
                  style={{ background: c }}
                  data-activa={cara.color.toUpperCase() === c}
                  onClick={() => cambiarCara({ color: c })}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* --------------------------------------------------- Textura */}
          <div className={e.bloque}>
            <div className={e.tituloBloque}>Textura</div>

            {cara.textura ? (
              <>
                <div className={e.fila}>
                  <span className={e.etiqueta}>Tamaño</span>
                  <input
                    className={e.deslizador}
                    type="range"
                    min={0.1}
                    max={4}
                    step={0.05}
                    value={cara.textura.escala}
                    onChange={(ev) =>
                      cambiarCara({
                        textura: { ...cara.textura!, escala: Number(ev.target.value) },
                      })
                    }
                  />
                  <span className={e.valor}>{cara.textura.escala.toFixed(2)}</span>
                </div>

                <div className={e.fila}>
                  <span className={e.etiqueta}>Giro</span>
                  <input
                    className={e.deslizador}
                    type="range"
                    min={0}
                    max={360}
                    value={cara.textura.rotacion}
                    onChange={(ev) =>
                      cambiarCara({
                        textura: { ...cara.textura!, rotacion: Number(ev.target.value) },
                      })
                    }
                  />
                  <span className={e.valor}>{Math.round(cara.textura.rotacion)}°</span>
                </div>

                <div className={e.fila}>
                  <span className={e.etiqueta}>Opacidad</span>
                  <input
                    className={e.deslizador}
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={cara.textura.opacidad}
                    onChange={(ev) =>
                      cambiarCara({
                        textura: { ...cara.textura!, opacidad: Number(ev.target.value) },
                      })
                    }
                  />
                  <span className={e.valor}>{Math.round(cara.textura.opacidad * 100)}%</span>
                </div>

                <button
                  type="button"
                  className={e.botonBorrar}
                  onClick={() => cambiarCara({ textura: null })}
                >
                  Quitar textura
                </button>
              </>
            ) : (
              <>
                <input
                  ref={entradaTextura}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(ev) =>
                    void conArchivo(ev.target.files?.[0], (url, nombre) =>
                      cambiarCara({
                        textura: { url, nombre, escala: 1, opacidad: 1, rotacion: 0 },
                      })
                    )
                  }
                />
                <button
                  type="button"
                  className={e.archivo}
                  onClick={() => entradaTextura.current?.click()}
                  disabled={subiendo}
                >
                  {subiendo ? 'Subiendo…' : 'Añadir una textura en mosaico'}
                </button>
              </>
            )}
          </div>

          {/* ------------------------------------------------------ Logos */}
          <div className={e.bloque}>
            <div className={e.tituloBloque}>Logotipos</div>

            <input
              ref={entradaLogo}
              type="file"
              accept="image/*"
              hidden
              onChange={(ev) => void conArchivo(ev.target.files?.[0], anadirLogo)}
            />
            <button
              type="button"
              className={e.archivo}
              onClick={() => entradaLogo.current?.click()}
              disabled={subiendo}
              style={{ marginBottom: 14 }}
            >
              {subiendo ? 'Subiendo…' : 'Subir un logotipo'}
            </button>

            {diseno.logos.length === 0 ? (
              <p className={e.vacio}>
                Todavía no hay ninguno. PNG con fondo transparente o SVG dan el mejor
                resultado.
              </p>
            ) : (
              <div className={e.listaCapas}>
                {[...diseno.logos]
                  .sort((a, b) => b.z - a.z)
                  .map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      className={e.capa}
                      data-seleccionada={seleccionado === l.id}
                      onClick={() => {
                        setSeleccionado(l.id)
                        setVista(l.vista)
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className={e.miniCapa} src={l.url} alt="" />
                      <span className={e.nombreCapa}>{l.nombre}</span>
                      <span className={e.vistaCapa}>{ETIQUETA_VISTA[l.vista]}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* ------------------------------------------- Logo seleccionado */}
          {logoActivo && (
            <div className={e.bloque}>
              <div className={e.tituloBloque}>Ajustar «{logoActivo.nombre}»</div>

              <div className={e.fila}>
                <span className={e.etiqueta}>Tamaño</span>
                <input
                  className={e.deslizador}
                  type="range"
                  min={2}
                  max={100}
                  value={logoActivo.ancho}
                  onChange={(ev) =>
                    cambiarLogo(logoActivo.id, { ancho: Number(ev.target.value) }, true)
                  }
                />
                <span className={e.valor}>{Math.round(logoActivo.ancho)}%</span>
              </div>

              <div className={e.fila}>
                <span className={e.etiqueta}>Giro</span>
                <input
                  className={e.deslizador}
                  type="range"
                  min={-180}
                  max={180}
                  value={logoActivo.rotacion}
                  onChange={(ev) =>
                    cambiarLogo(logoActivo.id, { rotacion: Number(ev.target.value) }, true)
                  }
                />
                <span className={e.valor}>{Math.round(logoActivo.rotacion)}°</span>
              </div>

              <div className={e.fila}>
                <span className={e.etiqueta}>Opacidad</span>
                <input
                  className={e.deslizador}
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={logoActivo.opacidad}
                  onChange={(ev) =>
                    cambiarLogo(logoActivo.id, { opacidad: Number(ev.target.value) }, true)
                  }
                />
                <span className={e.valor}>{Math.round(logoActivo.opacidad * 100)}%</span>
              </div>

              <div className={e.fila}>
                <span className={e.etiqueta}>Cara</span>
                <select
                  className={e.campoTexto}
                  value={logoActivo.vista}
                  onChange={(ev) => {
                    const v = ev.target.value as Vista
                    cambiarLogo(logoActivo.id, { vista: v })
                    setVista(v)
                  }}
                >
                  {VISTAS.map((v) => (
                    <option key={v} value={v}>
                      {ETIQUETA_VISTA[v]}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className={e.botonBorrar}
                onClick={() => borrarLogo(logoActivo.id)}
              >
                Eliminar logotipo
              </button>
            </div>
          )}

          {!hayAlmacenamiento() && (
            <div className={e.bloque}>
              <p className={e.vacio}>
                Supabase no está conectado. Puedes diseñar y exportar la imagen, pero las
                imágenes que subas no se guardan y se pierden al recargar.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
