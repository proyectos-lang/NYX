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
