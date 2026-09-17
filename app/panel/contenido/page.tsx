import Image from 'next/image'
import { obtenerBloquesPanel } from '@/lib/panel'
import { guardarBloque } from '../acciones'
import SinDatos from '@/componentes/panel/SinDatos'
import Aviso from '@/componentes/panel/Aviso'
import c from '../catalogo/Catalogo.module.css'
import e from '../Panel.module.css'

export const metadata = { title: 'Contenido del sitio' }

export default async function ContenidoPanel({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string; error?: string }>
}) {
  const { aviso, error: errorUrl } = await searchParams

  let bloques

  try {
    bloques = await obtenerBloquesPanel()
  } catch (error) {
    return <SinDatos error={error} />
  }

  return (
    <>
      <Aviso aviso={aviso} error={errorUrl} />

      <div className={e.cabeceraPantalla}>
        <div>
          <span className={e.antetituloPantalla}>Contenido</span>
          <h1 className={e.tituloPantalla}>Textos e imágenes del sitio</h1>
          <p className={e.pistaPantalla}>
            Cada bloque de la web tiene sus propios campos, en español e inglés. El orden de
            las secciones y el diseño están bloqueados: aquí solo se cambian los textos.
          </p>
        </div>
      </div>

      {bloques.length === 0 ? (
        <div className={e.vacio}>
          No hay bloques de contenido. Cárgalos con <code>npm run db:reset</code> en local, o
          insértalos desde el editor SQL de Supabase.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {bloques.map((bloque) => (
            <section key={bloque.id} className={e.tarjeta}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  padding: '18px 22px',
                  borderBottom: '1px solid rgba(0,0,0,.08)',
                }}
              >
                <div>
                  <span className={e.antetituloPantalla}>{bloque.seccion}</span>
                  <h2
                    style={{
                      margin: '10px 0 0',
                      font: '400 19px/1.25 var(--fuente-serif), Georgia, serif',
                      color: 'var(--negro)',
                    }}
                  >
                    {bloque.titulo}
                  </h2>
                </div>
                {bloque.bloqueado && (
                  <span className={e.chip} style={{ background: '#efefef', color: '#6f6f6f' }}>
                    Maqueta fija
                  </span>
                )}
              </div>

              <div className={e.tarjetaPad}>
                <form action={guardarBloque}>
                  <div className={e.rejillaCampos}>
                    {bloque.campos.map((campo) => (
                      <div key={campo.id} className={campo.multilinea ? e.completo : undefined}>
                        <label className={e.etiqueta} htmlFor={`campo_${campo.id}_es`}>
                          {campo.etiqueta}
                        </label>
                        {campo.multilinea ? (
                          <textarea
                            className={e.area}
                            id={`campo_${campo.id}_es`}
                            name={`campo_${campo.id}_es`}
                            defaultValue={campo.valorEs ?? ''}
                            maxLength={2000}
                          />
                        ) : (
                          <input
                            className={e.campo}
                            id={`campo_${campo.id}_es`}
                            name={`campo_${campo.id}_es`}
                            defaultValue={campo.valorEs ?? ''}
                            maxLength={500}
                          />
                        )}

                        <label
                          className={e.etiqueta}
                          htmlFor={`campo_${campo.id}_en`}
                          style={{ marginTop: 10 }}
                        >
                          {campo.etiqueta} · inglés
                        </label>
                        <input
                          className={e.campo}
                          id={`campo_${campo.id}_en`}
                          name={`campo_${campo.id}_en`}
                          defaultValue={campo.valorEn ?? ''}
                          maxLength={2000}
                        />
                      </div>
                    ))}
                  </div>

                  {bloque.media.length > 0 && (
                    <div style={{ marginTop: 24 }}>
                      <div className={e.etiqueta}>Media del bloque</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {bloque.media.map((m) => (
                          <div
                            key={m.id}
                            style={{
                              position: 'relative',
                              width: 96,
                              aspectRatio: '1',
                              overflow: 'hidden',
                              background: '#f0f0f0',
                              border: '1px solid rgba(0,0,0,.1)',
                            }}
                          >
                            {m.tipo === 'imagen' ? (
                              <Image src={m.url} alt="" fill sizes="96px" />
                            ) : (
                              <span
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  display: 'grid',
                                  placeItems: 'center',
                                  font: '400 10px/1.4 ui-monospace, Menlo, monospace',
                                  color: '#6f6f6f',
                                }}
                              >
                                vídeo
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      {bloque.nota && (
                        <p
                          style={{
                            marginTop: 10,
                            font: '300 11px/1.6 var(--fuente-sans), sans-serif',
                            color: '#8a8a8a',
                          }}
                        >
                          {bloque.nota} La sustitución de media desde el panel todavía no
                          está implementada.
                        </p>
                      )}
                    </div>
                  )}

                  <div className={e.acciones}>
                    <button type="submit" className={e.boton}>
                      Guardar {bloque.titulo.toLowerCase()}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          ))}
        </div>
      )}

      <p
        style={{
          marginTop: 24,
          font: '300 11.5px/1.7 var(--fuente-sans), sans-serif',
          color: '#8a8a8a',
          maxWidth: '70ch',
        }}
        className={c.meta}
      >
        Los cambios se publican al guardar. La web cachea el contenido cinco minutos, así que
        pueden tardar ese tiempo en verse para quien ya tenía la página abierta.
      </p>
    </>
  )
}
