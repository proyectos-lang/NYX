'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCarrito } from './estado'
import { precio as formatearPrecio } from '@/lib/formato'
import { ruta, type Idioma } from '@/lib/i18n'
import { textos } from '@/lib/textos'
import s from './Carrito.module.css'

/**
 * El carrito como cajón lateral.
 *
 * Se abre solo al añadir algo. Antes el único carrito era una página aparte, y
 * eso obligaba a irse de donde estabas para comprobar qué llevabas: se perdía
 * el sitio en el catálogo y había que volver atrás. Aquí se ve lo añadido, se
 * ajusta la cantidad y se sigue comprando sin moverse.
 *
 * No incluye el formulario de datos: eso sigue en /carrito. Un cajón de 380px
 * no es sitio para pedir nombre, correo y teléfono, y mezclar "qué llevo" con
 * "quién soy" es lo que hace que un carrito se sienta largo.
 */
export default function CajonCarrito({ idioma }: { idioma: Idioma }) {
  const { lineas, total, unidades, cambiarCantidad, quitar, abierto, cerrar } = useCarrito()
  const rutaActual = usePathname()
  const t = textos(idioma).carrito

  // Al navegar se cierra. Si no, se pulsa "continuar" y el cajón sigue encima
  // de la página a la que acaba de llevar.
  useEffect(() => {
    cerrar()
  }, [rutaActual, cerrar])

  // Con el cajón abierto el fondo no debe desplazarse: si no, se arrastra la
  // página de detrás creyendo que se mueve la lista.
  useEffect(() => {
    if (!abierto) return

    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previo
    }
  }, [abierto])

  useEffect(() => {
    if (!abierto) return

    const alPulsar = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') cerrar()
    }

    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [abierto, cerrar])

  if (!abierto) return null

  return (
    <>
      <button type="button" className={s.veloCajon} onClick={cerrar} aria-label={t.cerrar} />

      <aside className={s.cajon} role="dialog" aria-label={t.cajonTitulo}>
        <div className={s.cajonCabecera}>
          <span className={s.cajonTitulo}>
            {t.cajonTitulo}
            {unidades > 0 && <span className={s.cajonCuenta}>{unidades}</span>}
          </span>
          <button type="button" className={s.cajonCerrar} onClick={cerrar}>
            {t.cerrar}
          </button>
        </div>

        {lineas.length === 0 ? (
          <div className={s.cajonVacio}>
            <p>{t.vacioTexto}</p>
            <Link
              href={ruta('/catalogo?tipo=entrega_inmediata', idioma)}
              className="boton-oro"
              onClick={cerrar}
            >
              {t.verDisponible}
            </Link>
          </div>
        ) : (
          <>
            <div className={s.cajonLineas}>
              {lineas.map((l) => {
                const enElTope = l.stock !== null && l.cantidad >= l.stock

                return (
                  <div key={l.productoId} className={s.cajonLinea}>
                    <Link
                      href={ruta(`/catalogo/${l.slug}`, idioma)}
                      className={s.cajonFoto}
                      onClick={cerrar}
                    >
                      {/* Foto del bucket, de dimensiones desconocidas. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {l.imagen && <img src={l.imagen} alt="" />}
                    </Link>

                    <div className={s.cajonDatos}>
                      <Link
                        href={ruta(`/catalogo/${l.slug}`, idioma)}
                        className={s.cajonNombre}
                        onClick={cerrar}
                      >
                        {l.nombre}
                      </Link>
                      <div className={s.cajonUnitario}>
                        {formatearPrecio(l.precio, idioma)} {t.porUnidad}
                      </div>

                      <div className={s.cajonControles}>
                        <div className={s.cantidad}>
                          <button
                            type="button"
                            className={s.paso}
                            onClick={() => cambiarCantidad(l.productoId, l.cantidad - 1)}
                            aria-label={t.quitarUnidad(l.nombre)}
                          >
                            −
                          </button>
                          <span className={s.valor}>{l.cantidad}</span>
                          <button
                            type="button"
                            className={s.paso}
                            disabled={enElTope}
                            onClick={() => cambiarCantidad(l.productoId, l.cantidad + 1)}
                            aria-label={t.anadirUnidad(l.nombre)}
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          className={s.quitar}
                          onClick={() => quitar(l.productoId)}
                        >
                          {t.quitar}
                        </button>
                      </div>

                      {enElTope && (
                        <div className={s.avisoStock}>{t.quedaEnStock(l.stock ?? 0)}</div>
                      )}
                    </div>

                    <span className={s.cajonSubtotal}>
                      {l.precio === null ? '—' : formatearPrecio(l.precio * l.cantidad, idioma)}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className={s.cajonPie}>
              <div className={s.cajonTotal}>
                <span>{t.subtotal}</span>
                <strong>
                  {total === null ? t.aConfirmar : formatearPrecio(total, idioma)}
                </strong>
              </div>

              <p className={s.cajonNota}>{t.sinPagoAviso}</p>

              <Link
                href={ruta('/carrito', idioma)}
                className={`boton-oro ${s.cajonAccion}`}
                onClick={cerrar}
              >
                {t.verPedido}
              </Link>

              <button type="button" className={s.cajonSeguir} onClick={cerrar}>
                {t.seguirComprando}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
