'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { guardarDisenoEstudio } from '@/app/[idioma]/(sitio)/estudio/acciones'
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
  type CapaTexto,
  type DisenoEstudio,
  type DiagnosticoVisor,
  type Modelo3D,
  type Vista,
} from '@/lib/estudio/tipos'
import {
  ErrorImagen,
  hayAlmacenamiento,
  subirImagen,
  subirVistaPrevia,
} from '@/lib/estudio/subir'
import { COLORES, FUENTES, POSICIONES } from '@/lib/estudio/preajustes'
import Visor from './Visor'
import e from './Estudio.module.css'

/**
 * Colores de tinta habituales.
 *
 * Casi todo el texto de una prenda es blanco, negro o un tono de marca; el
 * selector del sistema sigue estando para cualquier otro, pero abrirlo para
 * poner negro es un paso de más.
 */
const TINTAS = [
  '#FFFFFF', '#0B0B0B', '#C99A2E', '#E2BD63',
  '#8C2F2F', '#3A5A8C', '#1F3D2E', '#C9C9C9',
]

/** Donde el navegador recuerda el diseño entre visitas. */
const CLAVE_TOKEN = 'nyx-diseno'

/**
 * ¿El color de la prenda es claro?
 *
 * Se usa para elegir el color inicial del texto. Sin esto, escribir sobre una
 * camisa blanca daría letra blanca: el texto existiría pero parecería que no
 * se ha añadido nada.
 *
 * La fórmula es la luminancia percibida, que pondera el verde por encima del
 * rojo y el azul porque el ojo lo ve más brillante.
 */
function esClaro(hex: string): boolean {
  const limpio = hex.replace('#', '')
  if (limpio.length < 6) return true

  const r = parseInt(limpio.slice(0, 2), 16)
  const g = parseInt(limpio.slice(2, 4), 16)
  const b = parseInt(limpio.slice(4, 6), 16)

  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55
}

/** Flechas curvas de deshacer y rehacer. */
function FlechaDeshacer({ invertida = false }: { invertida?: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={invertida ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path d="M3 8h10a6 6 0 0 1 0 12H8" />
      <polyline points="7 4 3 8 7 12" />
    </svg>
  )
}

interface Props {
  modelos: Modelo3D[]
  disenoInicial?: DisenoEstudio
  /** Token del diseño que se está retomando, si venía en la URL. */
  tokenInicial?: string
}

export default function Estudio({ modelos, disenoInicial, tokenInicial }: Props) {
  const [historial, setHistorial] = useState<Historial<DisenoEstudio>>(() =>
    iniciar(disenoInicial ?? disenoVacio(modelos[0]?.id ?? null))
  )
  const [vista, setVista] = useState<Vista>('frontal')
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [aviso, setAviso] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [token, setToken] = useState<string | null>(tokenInicial ?? null)
  const [guardando, setGuardando] = useState(false)
  const [guardadoEn, setGuardadoEn] = useState<Date | null>(tokenInicial ? new Date() : null)
  const [diagnostico, setDiagnostico] = useState<DiagnosticoVisor>({})

  const alDiagnosticar = useCallback((d: DiagnosticoVisor) => {
    setDiagnostico((previo) => ({ ...previo, ...d }))
  }, [])

  const router = useRouter()
  const capturarRef = useRef<(() => string | null) | null>(null)
  const entradaLogo = useRef<HTMLInputElement>(null)

  const diseno = historial.presente

  /**
   * Único punto por el que pasa cualquier edición. Si alguna ruta escribiera el
   * estado por su cuenta, deshacer saltaría a un punto que nunca existió.
   */
  const editar = useCallback((siguiente: DisenoEstudio, fusionar = false) => {
    setHistorial((h) => aplicar(h, siguiente, fusionar))
  }, [])

  const logoActivo = diseno.logos.find((l) => l.id === seleccionado) ?? null

  const modelo = useMemo(
    () => modelos.find((m) => m.id === diseno.modeloId) ?? modelos[0] ?? null,
    [modelos, diseno.modeloId]
  )

  // --- Operaciones sobre el diseño -----------------------------------------

  /** El color es de la prenda entera, no de una cara. */
  const cambiarColor = (color: string) => editar({ ...diseno, color })

  const cambiarLogo = (id: string, patch: Partial<CapaLogo>, fusionar = false) =>
    editar(
      { ...diseno, logos: diseno.logos.map((l) => (l.id === id ? { ...l, ...patch } : l)) },
      fusionar
    )

  const borrarLogo = (id: string) => {
    editar({ ...diseno, logos: diseno.logos.filter((l) => l.id !== id) })
    setSeleccionado(null)
  }

  const textoActivo = (diseno.textos ?? []).find((x) => x.id === seleccionado) ?? null

  const cambiarTexto = (id: string, patch: Partial<CapaTexto>, fusionar = false) =>
    editar(
      {
        ...diseno,
        textos: (diseno.textos ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)),
      },
      fusionar
    )

  const anadirTexto = () => {
    const nuevo: CapaTexto = {
      id: crypto.randomUUID(),
      texto: 'TU TEXTO',
      fuente: 'sans',
      vista,
      x: 50,
      y: 55,
      tamano: 8,
      // Negro o blanco segun el fondo, para que se vea desde el primer momento
      // en vez de aparecer invisible sobre una prenda del mismo color.
      color: esClaro(diseno.color) ? '#0B0B0B' : '#FFFFFF',
      rotacion: 0,
      opacidad: 1,
      z: diseno.logos.length + (diseno.textos ?? []).length,
    }
    editar({ ...diseno, textos: [...(diseno.textos ?? []), nuevo] })
    setSeleccionado(nuevo.id)
  }

  const borrarTexto = (id: string) => {
    editar({ ...diseno, textos: (diseno.textos ?? []).filter((x) => x.id !== id) })
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

  // --- Guardar --------------------------------------------------------------

  /**
   * Si esta pestaña no traía token pero el navegador recuerda uno de una visita
   * anterior, se recarga con ?d= para que el servidor lo traiga. Se hace por la
   * URL y no pidiendo el diseño aquí porque así el enlace queda compartible:
   * el cliente puede mandárselo a un compañero tal cual.
   */
  useEffect(() => {
    if (tokenInicial) return

    try {
      const recordado = window.localStorage.getItem(CLAVE_TOKEN)
      if (recordado) router.replace(`/estudio?d=${encodeURIComponent(recordado)}`)
    } catch {
      // Ventana privada o almacenamiento bloqueado: se empieza en blanco.
    }
  }, [tokenInicial, router])

  const guardar = useCallback(async (): Promise<string | null> => {
    setGuardando(true)
    setAviso('')

    try {
      // La miniatura solo existe si el cliente llegó a abrir la vista 3D. Si no,
      // se guarda el diseño igual: es lo que importa.
      const png = capturarRef.current?.() ?? null
      const vistaPrevia = png ? await subirVistaPrevia(png) : null

      const resultado = await guardarDisenoEstudio({
        documento: diseno,
        token,
        modeloId: diseno.modeloId,
        vistaPrevia,
      })

      if (!resultado.ok || !resultado.token) {
        setAviso(resultado.mensaje ?? 'No se pudo guardar el diseño.')
        return null
      }

      setToken(resultado.token)
      setGuardadoEn(new Date())

      try {
        window.localStorage.setItem(CLAVE_TOKEN, resultado.token)
      } catch {
        // Sin almacenamiento el diseño se guarda igual; solo no se recupera solo.
      }

      // replaceState y no router.replace: cambiar la URL no debe recargar la
      // página ni perder lo que el cliente tiene en pantalla.
      window.history.replaceState(null, '', `/estudio?d=${encodeURIComponent(resultado.token)}`)

      return resultado.token
    } finally {
      setGuardando(false)
    }
  }, [diseno, token])

  /** Guarda antes de ir al formulario: sin token, el pedido llegaría sin diseño. */
  const pedirCotizacion = async () => {
    const guardado = await guardar()

    if (!guardado) {
      setAviso(
        'No se pudo guardar el diseño, así que la cotización no lo llevaría. Inténtalo otra vez.'
      )
      return
    }

    router.push(`/cotizar?diseno=${encodeURIComponent(guardado)}`)
  }

  // --- Exportar -------------------------------------------------------------

  /** Descarga el compuesto de las cuatro vistas que arma el visor. */
  const exportar = () => {
    const png = capturarRef.current?.()
    if (!png) {
      setAviso('Abre la vista 3D antes de exportar: las cuatro vistas salen de ahí.')
      return
    }
    const enlace = document.createElement('a')
    enlace.href = png
    enlace.download = 'nyx-diseno-4-vistas.png'
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
            Elige el color de la prenda, coloca tu logotipo y añade texto. Gíralo en 3D
            para verlo antes de pedirlo.
          </p>
        </div>

        <div className={e.barra}>
          <button
            type="button"
            className={e.botonIcono}
            onClick={() => setHistorial(deshacer)}
            disabled={!puedeDeshacer(historial)}
            title="Deshacer"
            aria-label="Deshacer"
          >
            <FlechaDeshacer />
          </button>
          <button
            type="button"
            className={e.botonIcono}
            onClick={() => setHistorial(rehacer)}
            disabled={!puedeRehacer(historial)}
            title="Rehacer"
            aria-label="Rehacer"
          >
            <FlechaDeshacer invertida />
          </button>
          <button type="button" className={e.botonTenue} onClick={exportar}>
            Exportar 4 vistas
          </button>
          <button
            type="button"
            className={e.botonTenue}
            onClick={() => void guardar()}
            disabled={guardando || !hayAlmacenamiento()}
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            className={e.boton}
            onClick={() => void pedirCotizacion()}
            disabled={guardando}
          >
            {guardando ? 'Guardando…' : 'Pedir cotización'}
          </button>
        </div>
      </div>

      {guardadoEn && (
        <p
          style={{
            maxWidth: 1500,
            margin: '0 auto 14px',
            font: '300 11px/1.6 var(--fuente-sans), sans-serif',
            color: 'var(--gris-suave)',
          }}
        >
          Diseño guardado a las{' '}
          {guardadoEn.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}. Este
          enlace lo recupera tal cual, y tu navegador lo recordará en la próxima visita.
        </p>
      )}

      <div className={e.cuerpo}>
        {/* Esta columna queda fija al desplazar: si el lienzo se va de
            pantalla, se edita a ciegas y hay que subir después de cada cambio
            para ver el resultado. */}
        <div className={e.columnaLienzo}>
          <div className={e.pestanas}>
            {/* Ya no hay pestañas: el estudio es siempre la vista 3D. El
                lienzo 2D que había aquí enseñaba la prenda estirada en plano,
                y no se entendía de qué parte de la camiseta era cada trozo.
                Todo se coloca desde el panel de la derecha y se comprueba
                girando el modelo, que es como se va a ver de verdad. */}
            <span style={{ flex: 1 }} />

            {/* Se rotulan porque sin la palabra "cara" estos dos botones se
                confunden con elegir un color por delante y otro por detras.
                Lo que cambian es el lado sobre el que se colocan los logos. */}
            <span
              style={{
                font: '400 11px/1 var(--fuente-sans), sans-serif',
                color: 'var(--gris-suave)',
                marginRight: 2,
              }}
            >
              Cara
            </span>

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

          {/* La guía sigue haciendo falta: sin ella, un lienzo con una prenda
              de un solo color no dice qué se espera de ti. Lo que cambió es el
              paso 3, que antes era "arrástralo" y ahora apunta al panel. */}
          <div className={e.guia}>
            <span className={e.guiaPaso}>
              <span className={e.guiaNumero}>1</span> Elige el color de la prenda a la derecha
            </span>
            <span className={e.guiaPaso}>
              <span className={e.guiaNumero}>2</span> Sube un logotipo o añade texto
            </span>
            <span className={e.guiaPaso}>
              <span className={e.guiaNumero}>3</span> Colócalo con los controles y gira la prenda
            </span>
          </div>

          <div className={`${e.lienzo} ${e.lienzoCompacto}`}>
              {modelo ? (
                <Visor
                  modelo={modelo}
                  diseno={diseno}
                  alPoderCapturar={(f) => {
                    capturarRef.current = f
                  }}
                  alDiagnosticar={alDiagnosticar}
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

          {/* Diagnóstico del visor.
              Va en pantalla y no en la consola del navegador a propósito:
              "no se ve nada en el 3D" puede ser que el .glb no cargue, que no
              se reconozcan las mallas, que no se sustituyan los materiales o
              que las UVs se disparen — y cada causa se arregla en un sitio
              distinto. Pedirle a alguien que abra las herramientas de
              desarrollo para averiguarlo no funciona. */}
          <div className={e.diagnostico}>
              {diagnostico.error ? (
                <span className={e.diagnosticoMal}>
                  El modelo no se pudo cargar: {diagnostico.error}
                </span>
              ) : diagnostico.mallas === undefined ? (
                <span>Cargando el modelo…</span>
              ) : (
                <>
                  <span className={diagnostico.mallas > 0 ? e.diagnosticoBien : e.diagnosticoMal}>
                    {diagnostico.mallas} malla(s)
                  </span>
                  <span
                    className={
                      diagnostico.pintadas && diagnostico.pintadas > 0
                        ? e.diagnosticoBien
                        : e.diagnosticoMal
                    }
                  >
                    {diagnostico.pintadas ?? 0} con el diseño aplicado
                  </span>
                  {diagnostico.rangoUV && (
                    <span
                      className={
                        diagnostico.rangoUV.min >= -0.01 && diagnostico.rangoUV.max <= 1.01
                          ? e.diagnosticoBien
                          : e.diagnosticoMal
                      }
                    >
                      UV {diagnostico.rangoUV.min.toFixed(2)}–
                      {diagnostico.rangoUV.max.toFixed(2)}
                    </span>
                  )}
                  {diagnostico.mapeo && (
                    <span className={diagnostico.mapeo === 'original' ? e.diagnosticoMal : undefined}>
                      mapeo {diagnostico.mapeo}
                      {diagnostico.mapeo === 'original' && ' (suele dar problemas)'}
                    </span>
                  )}
                  {diagnostico.atlas && <span>{diagnostico.atlas}</span>}
                </>
              )}
          </div>
        </div>

        <div className={e.panel}>
          {aviso && <div className={e.aviso}>{aviso}</div>}

          {/* ---------------------------------------------------- Prenda */}
          <div className={e.bloque}>
            <div className={e.tituloBloque}>Color de la prenda</div>
            <p className={e.notaBloque}>
              El color es el mismo por delante y por detrás: la prenda se compra ya
              hecha y encima se estampa.
            </p>

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
                value={diseno.color}
                onChange={(ev) => cambiarColor(ev.target.value)}
                aria-label="Color de la prenda"
              />
              <span className={e.valor}>{diseno.color}</span>
            </div>

            <div className={e.paleta}>
              {COLORES.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  className={e.muestra}
                  style={{ background: c.hex }}
                  data-activa={diseno.color.toUpperCase() === c.hex}
                  onClick={() => cambiarColor(c.hex)}
                  title={c.nombre}
                  aria-label={`Color ${c.nombre}`}
                />
              ))}
            </div>
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
              {subiendo
                ? 'Subiendo…'
                : diseno.logos.length === 0
                  ? 'Subir un logotipo'
                  : 'Añadir otro logotipo'}
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
          {/* ------------------------------------------------------- Textos */}
          <div className={e.bloque}>
            <div className={e.tituloBloque}>Texto</div>

            <button
              type="button"
              className={e.archivo}
              onClick={anadirTexto}
              style={{ marginBottom: (diseno.textos ?? []).length > 0 ? 14 : 0 }}
            >
              {(diseno.textos ?? []).length === 0 ? 'Añadir texto' : 'Añadir otro texto'}
            </button>

            {(diseno.textos ?? []).length > 0 && (
              <div className={e.listaCapas}>
                {[...(diseno.textos ?? [])]
                  .sort((a, b) => b.z - a.z)
                  .map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      className={e.capa}
                      data-seleccionada={seleccionado === x.id}
                      onClick={() => {
                        setSeleccionado(x.id)
                        setVista(x.vista)
                      }}
                    >
                      <span className={e.nombreCapa}>{x.texto.split('\n')[0]}</span>
                      <span className={e.vistaCapa}>{ETIQUETA_VISTA[x.vista]}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* --------------------------------------------- Texto seleccionado */}
          {textoActivo && (
            <div className={e.bloque}>
              <div className={e.tituloBloque}>Editar texto</div>

              <textarea
                className={e.campoTexto}
                value={textoActivo.texto}
                maxLength={200}
                rows={2}
                onChange={(ev) => cambiarTexto(textoActivo.id, { texto: ev.target.value }, true)}
                style={{ width: '100%', marginBottom: 14, resize: 'vertical' }}
                placeholder="Escribe aquí"
              />
              <p
                style={{
                  margin: '-8px 0 14px',
                  font: '300 10.5px/1.6 var(--fuente-sans), sans-serif',
                  color: 'var(--gris-suave)',
                }}
              >
                Salta de línea para poner varias.
              </p>

              {/* Cada botón se muestra con SU tipografía: es la única forma de
                  elegir una sin tener que probarlas todas. */}
              <span className={e.etiqueta}>Tipografía</span>
              <div className={e.fuentes}>
                {FUENTES.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={e.fuente}
                    data-activa={textoActivo.fuente === f.id}
                    onClick={() => cambiarTexto(textoActivo.id, { fuente: f.id })}
                    title={f.nombre}
                  >
                    <span
                      className={e.fuenteMuestra}
                      style={{ fontFamily: `var(${f.variable})`, fontWeight: f.peso }}
                    >
                      {f.muestra}
                    </span>
                    <span className={e.fuenteNombre}>{f.nombre}</span>
                  </button>
                ))}
              </div>

              {/* Los mismos sitios que para los logos. Faltaban aquí, así que
                  colocar un texto en el pecho izquierdo obligaba a afinarlo a
                  mano mientras que con un logo era un clic. */}
              <span className={e.etiqueta}>Colocar en</span>
              <div className={e.posiciones}>
                {POSICIONES.filter((p) => !p.vista || p.vista === textoActivo.vista).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={e.posicion}
                    onClick={() => cambiarTexto(textoActivo.id, { x: p.x, y: p.y })}
                  >
                    {p.nombre}
                  </button>
                ))}
              </div>

              <p
                style={{
                  margin: '0 0 16px',
                  font: '300 10.5px/1.6 var(--fuente-sans), sans-serif',
                  color: 'var(--gris-suave)',
                }}
              >
                Gira la prenda para comprobar cómo queda por cada lado.
              </p>

              <div className={e.fila}>
                <span className={e.etiqueta}>Color</span>
                <input
                  className={e.color}
                  type="color"
                  value={textoActivo.color}
                  onChange={(ev) =>
                    cambiarTexto(textoActivo.id, { color: ev.target.value }, true)
                  }
                  aria-label="Color del texto"
                />
                <span className={e.valor}>{textoActivo.color}</span>
              </div>

              <div className={e.paleta} style={{ marginBottom: 14 }}>
                {TINTAS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={e.muestraTexto}
                    style={{ background: c }}
                    data-activa={textoActivo.color.toUpperCase() === c}
                    onClick={() => cambiarTexto(textoActivo.id, { color: c })}
                    aria-label={`Color de texto ${c}`}
                  />
                ))}
              </div>

              <div className={e.fila}>
                <span className={e.etiqueta}>Tamaño</span>
                <input
                  className={e.deslizador}
                  type="range"
                  min={2}
                  max={30}
                  step={0.5}
                  value={textoActivo.tamano}
                  onChange={(ev) =>
                    cambiarTexto(textoActivo.id, { tamano: Number(ev.target.value) }, true)
                  }
                />
                <span className={e.valor}>{textoActivo.tamano.toFixed(0)}%</span>
              </div>

              <div className={e.fila}>
                <span className={e.etiqueta}>Giro</span>
                <input
                  className={e.deslizador}
                  type="range"
                  min={-180}
                  max={180}
                  value={textoActivo.rotacion}
                  onChange={(ev) =>
                    cambiarTexto(textoActivo.id, { rotacion: Number(ev.target.value) }, true)
                  }
                />
                <span className={e.valor}>{Math.round(textoActivo.rotacion)}°</span>
              </div>

              <div className={e.fila}>
                <span className={e.etiqueta}>Horizontal</span>
                <input
                  className={e.deslizador}
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={textoActivo.x}
                  onChange={(ev) =>
                    cambiarTexto(textoActivo.id, { x: Number(ev.target.value) }, true)
                  }
                />
                <span className={e.valor}>{textoActivo.x.toFixed(0)}%</span>
              </div>

              <div className={e.fila}>
                <span className={e.etiqueta}>Vertical</span>
                <input
                  className={e.deslizador}
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={textoActivo.y}
                  onChange={(ev) =>
                    cambiarTexto(textoActivo.id, { y: Number(ev.target.value) }, true)
                  }
                />
                <span className={e.valor}>{textoActivo.y.toFixed(0)}%</span>
              </div>

              <div className={e.fila}>
                <span className={e.etiqueta}>Cara</span>
                <select
                  className={e.campoTexto}
                  value={textoActivo.vista}
                  onChange={(ev) => {
                    const v = ev.target.value as Vista
                    cambiarTexto(textoActivo.id, { vista: v })
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
                onClick={() => borrarTexto(textoActivo.id)}
              >
                Eliminar texto
              </button>
            </div>
          )}

          {logoActivo && (
            <div className={e.bloque}>
              <div className={e.tituloBloque}>Ajustar «{logoActivo.nombre}»</div>

              {/* Colocación rápida: casi todo el mundo quiere el logo en uno de
                  estos sitios, y llevarlo a ojo hasta el pecho izquierdo cuesta
                  más que pulsar un botón. Después se sigue pudiendo arrastrar. */}
              <span className={e.etiqueta}>Colocar en</span>
              <div className={e.posiciones}>
                {POSICIONES.filter((p) => !p.vista || p.vista === logoActivo.vista).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={e.posicion}
                    onClick={() => cambiarLogo(logoActivo.id, { x: p.x, y: p.y, ancho: p.ancho })}
                  >
                    {p.nombre}
                  </button>
                ))}
              </div>

              <p
                style={{
                  margin: '0 0 16px',
                  font: '300 10.5px/1.6 var(--fuente-sans), sans-serif',
                  color: 'var(--gris-suave)',
                }}
              >
                O ajústalo al milímetro aquí abajo.
              </p>

              {/* Posición numérica.
                  Arrastrar sirve para colocar a ojo; esto, para repetir la
                  misma colocación en varias prendas o para afinar dos puntos
                  que a mano no se cogen. */}
              <div className={e.fila}>
                <span className={e.etiqueta}>Horizontal</span>
                <input
                  className={e.deslizador}
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={logoActivo.x}
                  onChange={(ev) =>
                    cambiarLogo(logoActivo.id, { x: Number(ev.target.value) }, true)
                  }
                />
                <span className={e.valor}>{logoActivo.x.toFixed(0)}%</span>
              </div>

              <div className={e.fila}>
                <span className={e.etiqueta}>Vertical</span>
                <input
                  className={e.deslizador}
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={logoActivo.y}
                  onChange={(ev) =>
                    cambiarLogo(logoActivo.id, { y: Number(ev.target.value) }, true)
                  }
                />
                <span className={e.valor}>{logoActivo.y.toFixed(0)}%</span>
              </div>

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
