import Link from 'next/link'
import Image from 'next/image'
import {
  contarPorEstado,
  obtenerPedidos,
  urlFirmadaArchivo,
  type PedidoPanel,
} from '@/lib/panel'
import {
  COLOR_ESTADO,
  ETIQUETA_ENTREGA,
  ETIQUETA_ESTADO,
  type EstadoPedido,
} from '@/lib/database.types'
import { fecha, fechaRelativa, pesoArchivo, precio } from '@/lib/formato'
import { enlaceWhatsApp, mensajePedido } from '@/lib/whatsapp'
import { cambiarEstadoPedido, guardarNotasPedido } from '../acciones'
import SinDatos from '@/componentes/panel/SinDatos'
import Aviso from '@/componentes/panel/Aviso'
import p from './Pedidos.module.css'
import e from '../Panel.module.css'

export const metadata = { title: 'Pedidos' }

const FILTROS: { id: string; etiqueta: string }[] = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'nuevo', etiqueta: 'Nuevos' },
  { id: 'en_revision', etiqueta: 'En revisión' },
  { id: 'en_produccion', etiqueta: 'En producción' },
  { id: 'entregado', etiqueta: 'Entregados' },
]

const ESTADOS_ORDENADOS: EstadoPedido[] = [
  'nuevo',
  'en_revision',
  'en_produccion',
  'entregado',
  'cancelado',
]

function Chip({ estado }: { estado: EstadoPedido }) {
  const color = COLOR_ESTADO[estado]
  return (
    <span className={e.chip} style={{ background: color.fondo, color: color.texto }}>
      {ETIQUETA_ESTADO[estado]}
    </span>
  )
}

async function Detalle({ pedido, volver }: { pedido: PedidoPanel; volver: string }) {
  // Las URLs se firman al renderizar y caducan en una hora: el bucket es
  // privado y no hay enlace permanente que se pueda reenviar por ahí.
  const archivos = await Promise.all(
    pedido.archivos.map(async (a) => ({ ...a, url: await urlFirmadaArchivo(a.ruta) }))
  )

  // El mensaje depende del estado del pedido: ver lib/whatsapp.ts.
  const whatsapp = enlaceWhatsApp(pedido.cliente?.telefono, mensajePedido(pedido))

  return (
    <div className={p.detalle}>
      <div className={p.detalleCabecera}>
        <div>
          <span className={p.referencia}>{pedido.ref}</span>
          <h2 className={p.detalleTitulo}>{pedido.cliente?.nombre ?? 'Cliente sin nombre'}</h2>
          <div className={p.contacto}>
            {pedido.cliente?.empresa && <>{pedido.cliente.empresa}<br /></>}
            {pedido.cliente?.email && (
              <a href={`mailto:${pedido.cliente.email}`}>{pedido.cliente.email}</a>
            )}
            {pedido.cliente?.telefono && <> · {pedido.cliente.telefono}</>}
          </div>

          {/* Escribir por WhatsApp es lo primero que se hace al abrir un pedido
              nuevo, asi que el boton va aqui arriba y no al final de la ficha. */}
          {whatsapp ? (
            <a
              className={p.whatsapp}
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconoWhatsApp />
              Escribir por WhatsApp
            </a>
          ) : (
            <p className={p.whatsappNo}>
              {pedido.cliente?.telefono
                ? `No se puede abrir WhatsApp: "${pedido.cliente.telefono}" no parece un numero completo.`
                : 'Esta clienta no dejo telefono.'}
            </p>
          )}
        </div>
        <Chip estado={pedido.estado} />
      </div>

      <div className={p.seccion}>
        <div className={p.tituloSeccion}>Productos solicitados</div>
        {pedido.items.map((i) => (
          <div key={i.id} className={p.linea}>
            <div className={p.lineaFoto}>
              {i.foto && <Image src={i.foto} alt="" fill sizes="44px" />}
            </div>
            <div>
              <div className={p.lineaNombre}>{i.nombre}</div>
              {i.especificaciones && <div className={p.lineaSpecs}>{i.especificaciones}</div>}
            </div>
            <div className={p.lineaCantidad}>{i.cantidad} u.</div>
          </div>
        ))}
      </div>

      <div className={p.seccion}>
        <div className={p.tituloSeccion}>Detalles del pedido</div>
        <div className={p.campos}>
          <div className={p.campoCelda}>
            <div className={p.campoEtiqueta}>Recibido</div>
            <div className={p.campoValor}>{fechaRelativa(pedido.creadoEn)}</div>
          </div>
          <div className={p.campoCelda}>
            <div className={p.campoEtiqueta}>Entrega requerida</div>
            <div className={p.campoValor}>{fecha(pedido.fechaRequerida)}</div>
          </div>
          <div className={p.campoCelda}>
            <div className={p.campoEtiqueta}>Método</div>
            <div className={p.campoValor}>
              {pedido.metodoEntrega ? ETIQUETA_ENTREGA[pedido.metodoEntrega] : 'Sin definir'}
            </div>
          </div>
          <div className={p.campoCelda}>
            <div className={p.campoEtiqueta}>Referencia de precio</div>
            <div className={p.campoValor}>{precio(pedido.precioReferencia)}</div>
          </div>
        </div>
      </div>

      {pedido.diseno && (
        <div className={p.seccion}>
          <div className={p.tituloSeccion}>Diseño del estudio</div>

          {pedido.diseno.vistaPrevia ? (
            <a
              href={`/estudio?d=${encodeURIComponent(pedido.diseno.token)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', border: '1px solid rgba(0,0,0,.1)' }}
            >
              {/* Imagen del bucket, de dimensiones desconocidas: <img> normal
                  en vez de next/image, que exige tamaño o dominio configurado. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pedido.diseno.vistaPrevia}
                alt="Vista previa del diseño"
                style={{ width: '100%', display: 'block', background: '#0b0b0b' }}
              />
            </a>
          ) : (
            <p
              style={{
                margin: '0 0 12px',
                font: '300 11.5px/1.7 var(--fuente-sans), sans-serif',
                color: '#8a8a8a',
              }}
            >
              Sin vista previa: el cliente no llegó a abrir la pestaña 3D. El diseño sí está
              guardado.
            </p>
          )}

          <a
            href={`/estudio?d=${encodeURIComponent(pedido.diseno.token)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={p.archivoEnlace}
            style={{ display: 'inline-block', marginTop: 12 }}
          >
            Abrir en el estudio
          </a>
        </div>
      )}

      {archivos.length > 0 && (
        <div className={p.seccion}>
          <div className={p.tituloSeccion}>Archivos del cliente</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {archivos.map((a) => (
              <div key={a.id} className={p.archivo}>
                <span>
                  {a.nombre}
                  {a.bytes ? ` · ${pesoArchivo(a.bytes)}` : ''}
                </span>
                {a.url ? (
                  <a
                    className={p.archivoEnlace}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir
                  </a>
                ) : (
                  <span className={p.archivoEnlace} style={{ color: '#9a9a9a' }}>
                    No disponible
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={p.seccion}>
        <div className={p.tituloSeccion}>Cambiar estado</div>
        <div className={p.estados}>
          {ESTADOS_ORDENADOS.map((estado) => (
            <form key={estado} action={cambiarEstadoPedido}>
              <input type="hidden" name="id" value={pedido.id} />
              <input type="hidden" name="volver" value={volver} />
              <input type="hidden" name="estado" value={estado} />
              <button
                type="submit"
                className={p.botonEstado}
                data-activo={pedido.estado === estado}
              >
                {ETIQUETA_ESTADO[estado]}
              </button>
            </form>
          ))}
        </div>
      </div>

      <form action={guardarNotasPedido} className={p.seccion}>
        <div className={p.tituloSeccion}>Notas y precio confirmado</div>
        <input type="hidden" name="id" value={pedido.id} />
        <input type="hidden" name="volver" value={volver} />

        <label className={e.etiqueta} htmlFor={`precio-${pedido.id}`}>
          Precio unitario de referencia (USD)
        </label>
        <input
          className={e.campo}
          id={`precio-${pedido.id}`}
          name="precio_referencia"
          type="number"
          step="0.01"
          min="0"
          defaultValue={pedido.precioReferencia ?? ''}
        />

        <label
          className={e.etiqueta}
          htmlFor={`obs-${pedido.id}`}
          style={{ marginTop: 16 }}
        >
          Observaciones
        </label>
        <textarea
          className={e.area}
          id={`obs-${pedido.id}`}
          name="observaciones"
          defaultValue={pedido.observaciones ?? ''}
        />

        <div className={e.acciones}>
          <button type="submit" className={e.boton}>
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}

export default async function Pedidos({
  searchParams,
}: {
  searchParams: Promise<{
    estado?: string
    pedido?: string
    aviso?: string
    error?: string
  }>
}) {
  const {
    estado: filtro = 'todos',
    pedido: idSeleccionado,
    aviso,
    error: errorUrl,
  } = await searchParams

  let pedidos: PedidoPanel[]
  let cuenta: Record<EstadoPedido, number>

  try {
    const estadoFiltro = ESTADOS_ORDENADOS.includes(filtro as EstadoPedido)
      ? (filtro as EstadoPedido)
      : undefined
    ;[pedidos, cuenta] = await Promise.all([obtenerPedidos(estadoFiltro), contarPorEstado()])
  } catch (error) {
    return <SinDatos error={error} />
  }

  const seleccionado = pedidos.find((x) => x.id === idSeleccionado) ?? pedidos[0] ?? null

  return (
    <>
      <Aviso aviso={aviso} error={errorUrl} />

      <div className={e.cabeceraPantalla}>
        <div>
          <span className={e.antetituloPantalla}>Bandeja</span>
          <h1 className={e.tituloPantalla}>Pedidos recibidos</h1>
          <p className={e.pistaPantalla}>
            Cada solicitud enviada desde la web llega aquí con producto, cantidad, archivo del
            cliente y fecha requerida.
          </p>
        </div>
      </div>

      <div className={p.resumen}>
        <div className={p.dato}>
          <div className={p.datoCifra}>{cuenta.nuevo}</div>
          <div className={p.datoEtiqueta}>Nuevos</div>
        </div>
        <div className={p.dato}>
          <div className={p.datoCifra}>{cuenta.en_revision}</div>
          <div className={p.datoEtiqueta}>En revisión</div>
        </div>
        <div className={p.dato}>
          <div className={p.datoCifra}>{cuenta.en_produccion}</div>
          <div className={p.datoEtiqueta}>En producción</div>
        </div>
        <div className={p.dato}>
          <div className={p.datoCifra}>{cuenta.entregado}</div>
          <div className={p.datoEtiqueta}>Entregados</div>
        </div>
      </div>

      <div className={e.filtros}>
        {FILTROS.map((f) => (
          <Link
            key={f.id}
            href={f.id === 'todos' ? '/panel/pedidos' : `/panel/pedidos?estado=${f.id}`}
            className={e.filtro}
            data-activo={filtro === f.id}
          >
            {f.etiqueta}
          </Link>
        ))}
      </div>

      {pedidos.length === 0 ? (
        <div className={e.vacio}>
          No hay pedidos con este filtro. Cuando alguien envíe el formulario de cotización,
          aparecerá aquí.
        </div>
      ) : (
        <div className={p.columnas}>
          <div className={p.lista}>
            {pedidos.map((pedido) => (
              <Link
                key={pedido.id}
                href={`/panel/pedidos?${new URLSearchParams({
                  ...(filtro !== 'todos' ? { estado: filtro } : {}),
                  pedido: pedido.id,
                })}`}
                className={p.fila}
                data-activa={seleccionado?.id === pedido.id}
              >
                <div className={p.miniatura}>
                  {pedido.items[0]?.foto && (
                    <Image src={pedido.items[0].foto} alt="" fill sizes="56px" />
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <span className={p.referencia}>{pedido.ref}</span>
                  <div className={p.clienteNombre}>
                    {pedido.cliente?.nombre ?? 'Cliente sin nombre'}
                  </div>
                  <div className={p.resumenLinea}>
                    {pedido.items
                      .map((i) => `${i.cantidad} × ${i.nombre}`)
                      .join(' · ') || 'Sin líneas'}
                  </div>
                </div>
                <div className={p.meta}>
                  <Chip estado={pedido.estado} />
                  <span className={p.cuando}>{fechaRelativa(pedido.creadoEn)}</span>
                </div>
              </Link>
            ))}
          </div>

          {seleccionado && (
            <Detalle
              pedido={seleccionado}
              volver={`/panel/pedidos?${new URLSearchParams({
                ...(filtro !== 'todos' ? { estado: filtro } : {}),
                pedido: seleccionado.id,
              })}`}
            />
          )}
        </div>
      )}
    </>
  )
}

/**
 * Logo de WhatsApp.
 *
 * En linea y no como archivo: es un solo trazo y asi no depende de una
 * peticion mas que puede llegar despues que el boton.
 */
function IconoWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07s.89 2.4 1.02 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29z" />
    </svg>
  )
}
