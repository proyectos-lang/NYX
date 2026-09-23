'use client'

import { useActionState, useEffect } from 'react'
import Link from 'next/link'
import { useCarrito } from '@/componentes/sitio/carrito/estado'
import { aItemsDeSolicitud } from '@/lib/carrito'
import { precio as formatearPrecio } from '@/lib/formato'
import { enviarPedido, type EstadoPedido } from './acciones'
import s from '@/componentes/sitio/carrito/Carrito.module.css'
import c from '@/app/(sitio)/cotizar/Cotizar.module.css'

const INICIAL: EstadoPedido = { estado: 'inicial' }

export default function Carrito({ whatsapp }: { whatsapp: string }) {
  const { lineas, total, unidades, cambiarCantidad, quitar, vaciar, listo } = useCarrito()
  const [estado, accion, enviando] = useActionState(enviarPedido, INICIAL)

  // El carrito se vacía DESPUÉS de que el pedido entre, no antes de enviarlo:
  // si algo falla, lo que la persona había reunido sigue ahí.
  useEffect(() => {
    if (estado.estado === 'ok') vaciar()
  }, [estado.estado, vaciar])

  if (estado.estado === 'ok') {
    return (
      <div className={s.vacio}>
        <div className={s.vacioTitulo}>Pedido recibido</div>
        <p className={s.vacioTexto}>
          Guarda esta referencia: <strong>{estado.referencia}</strong>. Te escribimos para
          confirmarte la disponibilidad y coordinar la entrega.
        </p>
        <Link href="/catalogo?tipo=entrega_inmediata" className="boton-oro">
          Seguir viendo
        </Link>
      </div>
    )
  }

  // Mientras se lee localStorage no se sabe si hay algo: enseñar "carrito
  // vacío" y cambiarlo medio segundo después se ve como un fallo.
  if (!listo) return <div style={{ minHeight: 240 }} />

  if (lineas.length === 0) {
    return (
      <div className={s.vacio}>
        <div className={s.vacioTitulo}>Tu carrito está vacío</div>
        <p className={s.vacioTexto}>
          Aquí se reúnen los productos de entrega inmediata: los que ya están hechos y se
          retiran el mismo día. Lo personalizado va por cotización.
        </p>
        <Link href="/catalogo?tipo=entrega_inmediata" className="boton-oro">
          Ver lo disponible hoy
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className={s.lineas}>
        {lineas.map((l) => {
          const enElTope = l.stock !== null && l.cantidad >= l.stock

          return (
            <div key={l.productoId} className={s.linea}>
              <Link href={`/catalogo/${l.slug}`} className={s.foto}>
                {/* Foto del bucket, de dimensiones desconocidas. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {l.imagen && <img src={l.imagen} alt="" />}
              </Link>

              <div>
                <Link href={`/catalogo/${l.slug}`} className={s.nombre}>
                  {l.nombre}
                </Link>
                <div className={s.unitario}>{formatearPrecio(l.precio)} por unidad</div>
                {enElTope && (
                  <div className={s.avisoStock}>
                    Es todo lo que queda en stock ({l.stock}).
                  </div>
                )}
              </div>

              <div className={s.controles}>
                <div className={s.cantidad}>
                  <button
                    type="button"
                    className={s.paso}
                    onClick={() => cambiarCantidad(l.productoId, l.cantidad - 1)}
                    aria-label={`Quitar una unidad de ${l.nombre}`}
                  >
                    −
                  </button>
                  <span className={s.valor}>{l.cantidad}</span>
                  <button
                    type="button"
                    className={s.paso}
                    disabled={enElTope}
                    onClick={() => cambiarCantidad(l.productoId, l.cantidad + 1)}
                    aria-label={`Añadir una unidad de ${l.nombre}`}
                  >
                    +
                  </button>
                </div>

                <span className={s.subtotal}>
                  {l.precio === null ? '—' : formatearPrecio(l.precio * l.cantidad)}
                </span>

                <button
                  type="button"
                  className={s.quitar}
                  onClick={() => quitar(l.productoId)}
                >
                  Quitar
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className={s.resumen}>
        <div className={s.totalFila}>
          <span className={s.totalEtiqueta}>
            Total · {unidades} {unidades === 1 ? 'artículo' : 'artículos'}
          </span>
          <span className={s.totalCifra}>
            {total === null ? 'A confirmar' : formatearPrecio(total)}
          </span>
        </div>

        <p className={s.nota}>
          Sin pagos en línea: envías el pedido, NYX confirma la disponibilidad y coordináis
          la entrega o el retiro. Añadir algo al carrito no lo aparta del stock.
        </p>
      </div>

      <form action={accion} style={{ marginTop: 28 }}>
        {/* El carrito vive en el navegador, así que viaja con el formulario.
            crear_solicitud vuelve a comprobar cada producto contra la tabla, y
            el precio no se envía: lo pone NYX. */}
        <input type="hidden" name="items" value={JSON.stringify(aItemsDeSolicitud(lineas))} />

        <div className={c.tituloGrupo}>
          <span className={c.numeroGrupo}>01</span>
          <span className={c.textoGrupo}>Tus datos</span>
        </div>

        <div className={c.rejillaCampos}>
          <div>
            <label className={c.etiqueta} htmlFor="nombre">
              Nombre completo
            </label>
            <input className={c.campo} id="nombre" name="nombre" required maxLength={160} />
          </div>

          <div>
            <label className={c.etiqueta} htmlFor="telefono">
              Teléfono / WhatsApp
            </label>
            <input
              className={c.campo}
              id="telefono"
              name="telefono"
              type="tel"
              maxLength={40}
              placeholder="+593 99 000 0000"
            />
          </div>

          <div className={c.anchoCompleto}>
            <label className={c.etiqueta} htmlFor="email">
              Correo electrónico
            </label>
            <input
              className={c.campo}
              id="email"
              name="email"
              type="email"
              required
              maxLength={200}
            />
          </div>

          <div className={c.anchoCompleto}>
            <label className={c.etiqueta} htmlFor="observaciones">
              ¿Cuándo pasas a retirarlo? ¿Prefieres envío?
            </label>
            <textarea
              className={c.area}
              id="observaciones"
              name="observaciones"
              maxLength={1000}
              placeholder="Paso mañana por la tarde"
            />
          </div>
        </div>

        {estado.estado === 'error' && (
          <p
            role="alert"
            style={{
              margin: '18px 0 0',
              padding: '12px 14px',
              background: '#f7e6e6',
              border: '1px solid rgba(160,60,60,.35)',
              font: '400 12px/1.6 var(--fuente-sans), sans-serif',
              color: '#7a2020',
            }}
          >
            {estado.mensaje}
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 22 }}>
          <button type="submit" className="boton-oro" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar pedido'}
          </button>

          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="boton-linea"
            >
              Preguntar por WhatsApp
            </a>
          )}
        </div>
      </form>
    </>
  )
}
