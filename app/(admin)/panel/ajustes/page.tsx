import { obtenerAjustes } from '@/lib/panel'
import { guardarContacto, guardarNotificaciones } from '../acciones'
import SinDatos from '@/componentes/panel/SinDatos'
import Aviso from '@/componentes/panel/Aviso'
import e from '../Panel.module.css'

export const metadata = { title: 'Contacto y ajustes' }

interface Contacto {
  email?: string
  telefono?: string
  whatsapp?: string
  ciudad?: string
  horario?: string
}

interface Notificaciones {
  destinatarios?: string[]
  avisar_pedido_nuevo?: boolean
  avisar_resumen_diario?: boolean
  avisar_stock_bajo?: boolean
}

function Casilla({
  nombre,
  etiqueta,
  marcada,
}: {
  nombre: string
  etiqueta: string
  marcada?: boolean
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 0',
        borderTop: '1px solid rgba(0,0,0,.07)',
        font: '400 12.5px/1.4 var(--fuente-sans), sans-serif',
        color: '#5c5c5c',
      }}
    >
      <input type="checkbox" name={nombre} defaultChecked={marcada} />
      {etiqueta}
    </label>
  )
}

export default async function AjustesPanel({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string; error?: string }>
}) {
  const { aviso, error: errorUrl } = await searchParams

  let ajustes

  try {
    ajustes = await obtenerAjustes()
  } catch (error) {
    return <SinDatos error={error} />
  }

  const contacto = (ajustes.find((a) => a.clave === 'contacto')?.valor ?? {}) as Contacto
  const avisos = (ajustes.find((a) => a.clave === 'notificaciones')?.valor ??
    {}) as Notificaciones

  return (
    <>
      <Aviso aviso={aviso} error={errorUrl} />

      <div className={e.cabeceraPantalla}>
        <div>
          <span className={e.antetituloPantalla}>Ajustes</span>
          <h1 className={e.tituloPantalla}>Contacto y notificaciones</h1>
          <p className={e.pistaPantalla}>
            Datos que aparecen en el pie de página del sitio y a dónde llegan los avisos de
            pedidos nuevos.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 18, gridTemplateColumns: '1fr' }}>
        <section className={e.tarjeta}>
          <div className={e.tarjetaPad}>
            <h2
              style={{
                margin: '0 0 6px',
                font: '400 19px/1.25 var(--fuente-serif), Georgia, serif',
                color: 'var(--negro)',
              }}
            >
              Contacto público
            </h2>
            <p
              style={{
                margin: '0 0 22px',
                font: '300 11.5px/1.7 var(--fuente-sans), sans-serif',
                color: '#8a8a8a',
              }}
            >
              Esto sí se ve en la web: pie de página, botones de WhatsApp y ficha de producto.
            </p>

            <form action={guardarContacto}>
              <div className={e.rejillaCampos}>
                <div>
                  <label className={e.etiqueta} htmlFor="email">
                    Correo electrónico
                  </label>
                  <input
                    className={e.campo}
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={contacto.email ?? ''}
                    placeholder="hola@nyx.ec"
                  />
                </div>

                <div>
                  <label className={e.etiqueta} htmlFor="telefono">
                    Teléfono
                  </label>
                  <input
                    className={e.campo}
                    id="telefono"
                    name="telefono"
                    defaultValue={contacto.telefono ?? ''}
                    placeholder="+593 99 000 0000"
                  />
                </div>

                <div>
                  <label className={e.etiqueta} htmlFor="whatsapp">
                    WhatsApp
                  </label>
                  <input
                    className={e.campo}
                    id="whatsapp"
                    name="whatsapp"
                    defaultValue={contacto.whatsapp ?? ''}
                    placeholder="+593 99 000 0000"
                  />
                </div>

                <div>
                  <label className={e.etiqueta} htmlFor="ciudad">
                    Ciudad
                  </label>
                  <input
                    className={e.campo}
                    id="ciudad"
                    name="ciudad"
                    defaultValue={contacto.ciudad ?? ''}
                    placeholder="Quito, Ecuador"
                  />
                </div>

                <div className={e.completo}>
                  <label className={e.etiqueta} htmlFor="horario">
                    Horario de atención
                  </label>
                  <input
                    className={e.campo}
                    id="horario"
                    name="horario"
                    defaultValue={contacto.horario ?? ''}
                    placeholder="Lun a Vie 9:00–18:00 · Sáb 9:00–13:00"
                  />
                </div>
              </div>

              <div className={e.acciones}>
                <button type="submit" className={e.boton}>
                  Guardar contacto
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className={e.tarjeta}>
          <div className={e.tarjetaPad}>
            <h2
              style={{
                margin: '0 0 6px',
                font: '400 19px/1.25 var(--fuente-serif), Georgia, serif',
                color: 'var(--negro)',
              }}
            >
              Notificaciones internas
            </h2>
            <p
              style={{
                margin: '0 0 22px',
                font: '300 11.5px/1.7 var(--fuente-sans), sans-serif',
                color: '#8a8a8a',
              }}
            >
              Privado: esta lista nunca sale en la web.
            </p>

            <form action={guardarNotificaciones}>
              <label className={e.etiqueta} htmlFor="destinatarios">
                Correos que reciben los avisos
              </label>
              <textarea
                className={e.area}
                id="destinatarios"
                name="destinatarios"
                defaultValue={(avisos.destinatarios ?? []).join('\n')}
                placeholder={'pedidos@nyx.ec\nana@nyx.ec'}
              />
              <p
                style={{
                  marginTop: 8,
                  font: '300 11px/1.6 var(--fuente-sans), sans-serif',
                  color: '#8a8a8a',
                }}
              >
                Uno por línea. Se guardan las direcciones; el envío de los correos todavía no
                está implementado.
              </p>

              <div style={{ marginTop: 20 }}>
                <Casilla
                  nombre="avisar_pedido_nuevo"
                  etiqueta="Avisar cuando llegue un pedido nuevo"
                  marcada={avisos.avisar_pedido_nuevo}
                />
                <Casilla
                  nombre="avisar_resumen_diario"
                  etiqueta="Enviar un resumen diario de la bandeja"
                  marcada={avisos.avisar_resumen_diario}
                />
                <Casilla
                  nombre="avisar_stock_bajo"
                  etiqueta="Avisar cuando un producto baje de stock"
                  marcada={avisos.avisar_stock_bajo}
                />
              </div>

              <div className={e.acciones}>
                <button type="submit" className={e.boton}>
                  Guardar notificaciones
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </>
  )
}
