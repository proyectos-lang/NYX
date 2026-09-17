import { obtenerFaqPanel, type FaqPanel } from '@/lib/panel'
import { eliminarPregunta, guardarPregunta } from '../acciones'
import SinDatos from '@/componentes/panel/SinDatos'
import Aviso from '@/componentes/panel/Aviso'
import c from '../catalogo/Catalogo.module.css'
import e from '../Panel.module.css'

export const metadata = { title: 'Preguntas frecuentes' }

function FormularioPregunta({ pregunta }: { pregunta?: FaqPanel }) {
  const prefijo = pregunta?.id ?? 'nueva'

  return (
    <form action={guardarPregunta}>
      {pregunta && <input type="hidden" name="id" value={pregunta.id} />}

      <div className={e.rejillaCampos}>
        <div className={e.completo}>
          <label className={e.etiqueta} htmlFor={`pes-${prefijo}`}>
            Pregunta (español)
          </label>
          <input
            className={e.campo}
            id={`pes-${prefijo}`}
            name="pregunta_es"
            required
            maxLength={300}
            defaultValue={pregunta?.preguntaEs}
            placeholder="¿Cuánto tarda un pedido?"
          />
        </div>

        <div className={e.completo}>
          <label className={e.etiqueta} htmlFor={`res-${prefijo}`}>
            Respuesta (español)
          </label>
          <textarea
            className={e.area}
            id={`res-${prefijo}`}
            name="respuesta_es"
            required
            maxLength={1200}
            defaultValue={pregunta?.respuestaEs}
          />
        </div>

        <div className={e.completo}>
          <label className={e.etiqueta} htmlFor={`pen-${prefijo}`}>
            Pregunta (inglés)
          </label>
          <input
            className={e.campo}
            id={`pen-${prefijo}`}
            name="pregunta_en"
            maxLength={300}
            defaultValue={pregunta?.preguntaEn ?? ''}
          />
        </div>

        <div className={e.completo}>
          <label className={e.etiqueta} htmlFor={`ren-${prefijo}`}>
            Respuesta (inglés)
          </label>
          <textarea
            className={e.area}
            id={`ren-${prefijo}`}
            name="respuesta_en"
            maxLength={1200}
            defaultValue={pregunta?.respuestaEn ?? ''}
          />
        </div>

        <div>
          <label className={e.etiqueta} htmlFor={`orden-${prefijo}`}>
            Orden
          </label>
          <input
            className={e.campo}
            id={`orden-${prefijo}`}
            name="orden"
            type="number"
            min="0"
            defaultValue={pregunta?.orden ?? 0}
          />
        </div>

        <div>
          <label className={e.etiqueta} htmlFor={`visible-${prefijo}`}>
            Visibilidad
          </label>
          <select
            className={e.select}
            id={`visible-${prefijo}`}
            name="visible"
            defaultValue={pregunta?.visible === false ? 'false' : 'true'}
          >
            <option value="true">Se muestra en la web</option>
            <option value="false">Oculta</option>
          </select>
        </div>
      </div>

      <div className={e.acciones}>
        <button type="submit" className={e.boton}>
          {pregunta ? 'Guardar cambios' : 'Añadir pregunta'}
        </button>
      </div>
    </form>
  )
}

export default async function PreguntasPanel({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string; error?: string }>
}) {
  const { aviso, error: errorUrl } = await searchParams

  let preguntas

  try {
    preguntas = await obtenerFaqPanel()
  } catch (error) {
    return <SinDatos error={error} />
  }

  return (
    <>
      <Aviso aviso={aviso} error={errorUrl} />

      <div className={e.cabeceraPantalla}>
        <div>
          <span className={e.antetituloPantalla}>Contenido</span>
          <h1 className={e.tituloPantalla}>Preguntas frecuentes</h1>
          <p className={e.pistaPantalla}>
            Añade, reordena o elimina preguntas en ambos idiomas. El orden controla cómo se
            listan en la portada.
          </p>
        </div>
      </div>

      <details className={c.nuevo}>
        <summary className={c.nuevoResumen}>+ Nueva pregunta</summary>
        <div className={c.editorCuerpo} style={{ marginTop: 12, border: '1px solid rgba(0,0,0,.08)' }}>
          <FormularioPregunta />
        </div>
      </details>

      {preguntas.length === 0 ? (
        <div className={e.vacio}>Todavía no hay preguntas publicadas.</div>
      ) : (
        <div className={c.tabla}>
          {preguntas.map((pregunta) => (
            <div key={pregunta.id}>
              <div className={c.fila} style={{ gridTemplateColumns: '48px minmax(0,1fr) 120px' }}>
                <span
                  style={{
                    font: '400 15px/1 var(--fuente-serif), Georgia, serif',
                    color: '#9a9a9a',
                  }}
                >
                  {String(pregunta.orden).padStart(2, '0')}
                </span>

                <div style={{ minWidth: 0 }}>
                  <div className={c.nombre}>{pregunta.preguntaEs}</div>
                  <div className={c.meta}>{pregunta.respuestaEs.slice(0, 110)}…</div>
                </div>

                <span className={c.celda}>{pregunta.visible ? 'Visible' : 'Oculta'}</span>
              </div>

              <details>
                <summary className={c.filaEditar}>Editar pregunta</summary>
                <div className={c.editorCuerpo}>
                  <FormularioPregunta pregunta={pregunta} />

                  <form action={eliminarPregunta} style={{ marginTop: 20 }}>
                    <input type="hidden" name="id" value={pregunta.id} />
                    <button type="submit" className={e.botonPeligro}>
                      Eliminar pregunta
                    </button>
                  </form>
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
