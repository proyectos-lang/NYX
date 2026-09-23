import Link from 'next/link'
import { obtenerModelosPanel } from '@/lib/panel'
import { fecha } from '@/lib/formato'
import {
  alternarVisibilidadModelo,
  cambiarMapeoModelo,
  eliminarModelo3D,
  guardarMaterialesExcluidos,
} from '../acciones'
import SinDatos from '@/componentes/panel/SinDatos'
import Aviso from '@/componentes/panel/Aviso'
import SubirModelo from '@/componentes/panel/SubirModelo'
import c from '../catalogo/Catalogo.module.css'
import e from '../Panel.module.css'

export const metadata = { title: 'Modelos 3D' }

export default async function ModelosPanel({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string; error?: string }>
}) {
  const { aviso, error: errorUrl } = await searchParams

  let modelos

  try {
    modelos = await obtenerModelosPanel()
  } catch (error) {
    return <SinDatos error={error} />
  }

  return (
    <>
      <Aviso aviso={aviso} error={errorUrl} />

      <div className={e.cabeceraPantalla}>
        <div>
          <span className={e.antetituloPantalla}>Estudio</span>
          <h1 className={e.tituloPantalla}>Modelos 3D</h1>
          <p className={e.pistaPantalla}>
            Las prendas que el cliente puede personalizar en el{' '}
            <Link href="/estudio" style={{ borderBottom: '1px solid var(--oro)' }}>
              estudio
            </Link>
            . Al subir un archivo se mide su mapeo, escala y centro una sola vez, y esos
            valores son los que usa el visor después.
          </p>
        </div>
      </div>

      <SubirModelo />

      {modelos.length === 0 ? (
        <div className={e.vacio}>
          Todavía no hay modelos. Mientras no haya ninguno, el estudio usa la camisa de
          prueba que se genera con <code>npm run modelo:demo</code>.
        </div>
      ) : (
        <div className={c.tabla}>
          {modelos.map((m) => {
            const uvPct = m.uvProporcion === null ? null : (m.uvProporcion * 100).toFixed(1)

            return (
              <div key={m.id}>
                <div
                  className={c.fila}
                  style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.4fr) 110px 110px' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className={c.nombre}>{m.nombre}</div>
                    <div className={c.meta}>
                      {m.slug} · subido el {fecha(m.creadoEn)}
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div className={c.celda}>
                      {m.mapeo === 'proyeccion' ? 'UVs regeneradas' : 'UVs del archivo'}
                    </div>
                    <div className={c.meta}>
                      {uvPct !== null && m.uvVertices !== null
                        ? `${uvPct}% en rango · ${m.uvVertices.toLocaleString('es')} vértices`
                        : 'sin diagnóstico'}
                    </div>
                  </div>

                  <span className={c.celda}>escala {m.escala.toFixed(4)}</span>

                  <div className={c.acciones}>
                    <form action={alternarVisibilidadModelo}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="visible" value={String(!m.visible)} />
                      <button
                        type="submit"
                        className={`${c.interruptor} ${
                          m.visible ? c.interruptorEncendido : c.interruptorApagado
                        }`}
                        aria-label={
                          m.visible
                            ? `Ocultar ${m.nombre} del estudio`
                            : `Mostrar ${m.nombre} en el estudio`
                        }
                        aria-pressed={m.visible}
                      >
                        <span className={c.perilla} />
                      </button>
                    </form>
                  </div>
                </div>

                <details>
                  <summary className={c.filaEditar}>Detalles y archivo</summary>
                  <div className={c.editorCuerpo}>
                    <div className={e.rejillaCampos}>
                      <div>
                        <span className={e.etiqueta}>Archivo</span>
                        <a
                          href={m.archivoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            font: '400 11.5px/1.6 ui-monospace, Menlo, monospace',
                            color: 'var(--oro-oscuro)',
                            wordBreak: 'break-all',
                          }}
                        >
                          {m.archivoUrl}
                        </a>
                      </div>
                      <div>
                        <span className={e.etiqueta}>Partes sin pintar</span>
                        <div style={{ font: '400 12.5px/1.6 var(--fuente-sans), sans-serif' }}>
                          {m.materialesExcluidos.length > 0
                            ? m.materialesExcluidos.join(', ')
                            : 'ninguna: se pinta la prenda entera'}
                        </div>
                      </div>
                    </div>

                    {/* Corregir las partes sin pintar sin volver a subir.
                        Si se marcan TODOS los materiales al subir, el modelo
                        queda mudo: carga, se mapea y no recibe el diseño en
                        ninguna malla. Pasó, y no había forma de deshacerlo. */}
                    <form action={guardarMaterialesExcluidos} style={{ marginTop: 22 }}>
                      <input type="hidden" name="id" value={m.id} />

                      {m.materialesExcluidos.length > 0 && (
                        <div
                          className={e.aviso}
                          style={{ marginBottom: 14 }}
                          role={m.materialesExcluidos.length >= 1 ? 'status' : undefined}
                        >
                          Estas partes <strong>no llevan el diseño</strong> y conservan el
                          material del archivo. Si el cliente no ve su diseño en el estudio,
                          es lo primero que hay que revisar: con todas marcadas, la prenda no
                          se pinta en ningún sitio.
                        </div>
                      )}

                      <label className={e.etiqueta} htmlFor={`excl-${m.id}`}>
                        Nombres de los materiales que NO se pintan
                      </label>
                      <input
                        className={e.campo}
                        id={`excl-${m.id}`}
                        name="materiales_excluidos"
                        defaultValue={m.materialesExcluidos.join(', ')}
                        placeholder="Vacío = se pinta la prenda entera"
                      />
                      <p
                        style={{
                          margin: '8px 0 0',
                          font: '300 11px/1.6 var(--fuente-sans), sans-serif',
                          color: '#8a8a8a',
                        }}
                      >
                        Separados por comas. Aquí van cremalleras, botones o cordones — no la
                        tela.
                      </p>

                      <div className={e.acciones}>
                        <button type="submit" className={e.boton}>
                          Guardar
                        </button>
                      </div>
                    </form>

                    {/* Cambiar el mapeo después de subir.
                        Hace falta porque el analizador acierta la mayoría de
                        veces pero no siempre: un modelo con UVs correctas para
                        SU despliegue las tiene bien según el análisis, y aun
                        así el diseño no encaja, porque el estudio espera su
                        propio reparto frente|espalda. Cuando en el estudio el
                        diseño no aparece o sale descuadrado, esto es lo
                        primero que hay que probar. */}
                    <form action={cambiarMapeoModelo} style={{ marginTop: 22 }}>
                      <input type="hidden" name="id" value={m.id} />
                      <input
                        type="hidden"
                        name="mapeo"
                        value={m.mapeo === 'proyeccion' ? 'original' : 'proyeccion'}
                      />
                      <span className={e.etiqueta}>Mapeo de la textura</span>
                      <p
                        style={{
                          margin: '0 0 12px',
                          font: '300 11.5px/1.7 var(--fuente-sans), sans-serif',
                          color: '#5c5c5c',
                        }}
                      >
                        {m.mapeo === 'proyeccion' ? (
                          <>
                            Ahora se <strong>regeneran</strong> las UVs por proyección, con el
                            diseño repartido entre cara frontal y trasera. Es lo que funciona
                            con casi cualquier modelo.
                          </>
                        ) : (
                          <>
                            Ahora se <strong>respetan</strong> las UVs del archivo. Solo
                            funciona si el modelo se desplegó pensando en este estudio; si no,
                            el diseño sale descuadrado o no aparece.
                          </>
                        )}
                      </p>
                      <button type="submit" className={e.botonTenue}>
                        {m.mapeo === 'proyeccion'
                          ? 'Respetar las UVs del archivo'
                          : 'Regenerar las UVs por proyección'}
                      </button>
                    </form>

                    <form action={eliminarModelo3D} style={{ marginTop: 20 }}>
                      <input type="hidden" name="id" value={m.id} />
                      <button type="submit" className={e.botonPeligro}>
                        Eliminar modelo
                      </button>
                      <p
                        style={{
                          marginTop: 10,
                          font: '300 11px/1.6 var(--fuente-sans), sans-serif',
                          color: '#8a8a8a',
                        }}
                      >
                        El archivo se queda en el bucket: un diseño ya guardado puede seguir
                        apuntando a él.
                      </p>
                    </form>
                  </div>
                </details>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
