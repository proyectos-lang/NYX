'use client'

import { useActionState, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { crearClienteNavegador } from '@/lib/supabase/client'
import { pesoArchivo } from '@/lib/formato'
import { enviarSolicitud, type EstadoSolicitud } from './acciones'
import { ruta, type Idioma } from '@/lib/i18n'
import { textos } from '@/lib/textos'
import e from './Cotizar.module.css'

interface OpcionProducto {
  id: string
  slug: string
  nombre: string
  sku: string
}

interface Props {
  productos: OpcionProducto[]
  productoInicial?: string
  /** Sin Supabase no hay dónde subir el logo: el campo se desactiva. */
  subidaDisponible: boolean
  /** Token del diseño del estudio, si la solicitud viene de ahí. */
  disenoToken?: string
  idioma: Idioma
}

const TIPOS_ACEPTADOS =
  'image/jpeg,image/png,image/webp,image/svg+xml,application/pdf,application/postscript,application/illustrator,text/plain,application/zip'

const LIMITE_BYTES = 20 * 1024 * 1024

interface ArchivoSubido {
  ruta: string
  nombre: string
  bytes: number
  mime: string
}

function BotonEnviar({ idioma }: { idioma: Idioma }) {
  const { pending } = useFormStatus()
  const t = textos(idioma).cotizar

  return (
    <button type="submit" className={`boton-oro ${e.enviar}`} disabled={pending}>
      {pending ? t.enviando : t.enviar}
    </button>
  )
}

export default function Formulario({
  productos,
  productoInicial,
  subidaDisponible,
  disenoToken,
  idioma,
}: Props) {
  const t = textos(idioma).cotizar
  const [estado, accion] = useActionState<EstadoSolicitud, FormData>(enviarSolicitud, {
    estado: 'inicial',
  })

  const inicial = productos.find((p) => p.slug === productoInicial)
  const [seleccionado, setSeleccionado] = useState(inicial?.id ?? '')

  const [archivo, setArchivo] = useState<ArchivoSubido | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [errorArchivo, setErrorArchivo] = useState('')
  const entradaArchivo = useRef<HTMLInputElement>(null)

  const producto = productos.find((p) => p.id === seleccionado)

  /**
   * El archivo va directo del navegador al bucket privado, sin pasar por el
   * servidor de Next: así no choca con el límite de body de las Server Actions
   * y el archivo solo viaja una vez.
   */
  async function subir(archivoLocal: File) {
    setErrorArchivo('')

    if (archivoLocal.size > LIMITE_BYTES) {
      setErrorArchivo(t.archivoGrande)
      return
    }

    setSubiendo(true)
    try {
      const supabase = crearClienteNavegador()
      const extension = archivoLocal.name.split('.').pop() ?? 'dat'
      const ruta = `entrantes/${crypto.randomUUID()}.${extension}`

      const { error } = await supabase.storage
        .from('pedidos')
        .upload(ruta, archivoLocal, { contentType: archivoLocal.type || undefined })

      if (error) throw error

      setArchivo({
        ruta,
        nombre: archivoLocal.name,
        bytes: archivoLocal.size,
        mime: archivoLocal.type,
      })
    } catch (error) {
      console.error('[nyx] error al subir el archivo', error)
      setErrorArchivo(t.archivoFallo)
    } finally {
      setSubiendo(false)
    }
  }

  if (estado.estado === 'ok') {
    return (
      <div className={e.exito}>
        <span className={e.textoGrupo}>{t.exitoAntetitulo}</span>
        <h2 className={e.exitoTitulo}>{t.exitoTitulo}</h2>
        <div className={e.referencia}>{estado.referencia}</div>
        <p className={e.exitoTexto}>
          {t.exitoTexto}
        </p>
        <div style={{ marginTop: 28 }}>
          <Link href={ruta('/catalogo', idioma)} className="boton-linea">
            {t.exitoVolver}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form action={accion}>
      {/* El idioma acompaña a la solicitud para que un error del servidor
          salga en el mismo idioma en que se rellenó el formulario. */}
      <input type="hidden" name="idioma" value={idioma} />

      {estado.estado === 'error' && (
        <p className={e.error} role="alert">
          {estado.mensaje}
        </p>
      )}

      {/* El token viaja como campo oculto: quien engancha el diseño al pedido
          es crear_solicitud(), porque la tabla `disenos` es solo-staff. */}
      {disenoToken && (
        <>
          <input type="hidden" name="diseno_token" value={disenoToken} />
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 26,
              padding: '16px 18px',
              background: 'rgba(201,154,46,.08)',
              border: '1px solid var(--linea-oro)',
            }}
          >
            <span
              style={{
                font: '300 12.5px/1.7 var(--fuente-sans), sans-serif',
                color: 'var(--gris-texto)',
              }}
            >
              <strong style={{ color: 'var(--oro-claro)', fontWeight: 600 }}>
                {t.disenoAdjunto}
              </strong>{' '}
              {t.disenoAdjunto}
            </span>
            <Link
              href={`/estudio?d=${encodeURIComponent(disenoToken)}`}
              style={{
                flex: 'none',
                font: '600 10.5px/1.2 var(--fuente-sans), sans-serif',
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: 'var(--oro-claro)',
                borderBottom: '1px solid var(--oro)',
                paddingBottom: 3,
              }}
            >
              {t.seguirEditando}
            </Link>
          </div>
        </>
      )}

      {/* --------------------------------------------------- Datos de contacto */}
      <fieldset className={e.grupo} style={{ border: 'none', margin: 0, padding: 0 }}>
        <div className={e.tituloGrupo}>
          <span className={e.numeroGrupo}>01</span>
          <span className={e.textoGrupo}>{t.grupoDatos}</span>
        </div>

        <div className={e.rejillaCampos}>
          <div>
            <label className={e.etiqueta} htmlFor="nombre">
              {t.nombre}
            </label>
            <input
              className={e.campo}
              id="nombre"
              name="nombre"
              required
              maxLength={120}
              placeholder={t.nombrePlaceholder}
            />
          </div>
          <div>
            <label className={e.etiqueta} htmlFor="empresa">
              {t.empresa}
            </label>
            <input
              className={e.campo}
              id="empresa"
              name="empresa"
              maxLength={120}
              placeholder={t.empresaPlaceholder}
            />
          </div>
          <div>
            <label className={e.etiqueta} htmlFor="email">
              {t.correo}
            </label>
            <input
              className={e.campo}
              id="email"
              name="email"
              type="email"
              required
              maxLength={160}
              placeholder={t.correoPlaceholder}
            />
          </div>
          <div>
            <label className={e.etiqueta} htmlFor="telefono">
              {t.telefono}
            </label>
            <input
              className={e.campo}
              id="telefono"
              name="telefono"
              type="tel"
              maxLength={40}
              placeholder={t.telefonoPlaceholder}
            />
          </div>
        </div>
      </fieldset>

      {/* --------------------------------------------------------- El pedido */}
      <fieldset className={e.grupo} style={{ border: 'none', margin: 0, padding: 0 }}>
        <div className={e.tituloGrupo}>
          <span className={e.numeroGrupo}>02</span>
          <span className={e.textoGrupo}>{t.grupoProducto}</span>
        </div>

        <div className={e.rejillaCampos}>
          <div className={e.anchoCompleto}>
            <label className={e.etiqueta} htmlFor="producto_id">
              {t.producto}
            </label>
            <select
              className={e.select}
              id="producto_id"
              name="producto_id"
              value={seleccionado}
              onChange={(ev) => setSeleccionado(ev.target.value)}
            >
              <option value="">{t.productoOtro}</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} · {p.sku}
                </option>
              ))}
            </select>
            {/* El nombre viaja aparte para que el pedido conserve sentido
                aunque el producto salga del catálogo más adelante. */}
            <input
              type="hidden"
              name="producto_nombre"
              value={producto?.nombre ?? 'Producto a definir'}
            />
          </div>

          <div>
            <label className={e.etiqueta} htmlFor="cantidad">
              {t.cantidad}
            </label>
            <input
              className={e.campo}
              id="cantidad"
              name="cantidad"
              type="number"
              min={1}
              max={100000}
              defaultValue={50}
              required
            />
          </div>

          <div>
            <label className={e.etiqueta} htmlFor="fecha_requerida">
              {t.fecha}
            </label>
            <input
              className={e.campo}
              id="fecha_requerida"
              name="fecha_requerida"
              type="date"
            />
          </div>

          <div className={e.anchoCompleto}>
            <label className={e.etiqueta} htmlFor="especificaciones">
              {t.detalles}
            </label>
            <input
              className={e.campo}
              id="especificaciones"
              name="especificaciones"
              maxLength={1000}
              placeholder={t.detallesPlaceholder}
            />
          </div>
        </div>
      </fieldset>

      {/* --------------------------------------------------------- Tu diseño */}
      <fieldset className={e.grupo} style={{ border: 'none', margin: 0, padding: 0 }}>
        <div className={e.tituloGrupo}>
          <span className={e.numeroGrupo}>03</span>
          <span className={e.textoGrupo}>{t.grupoLogo}</span>
        </div>

        {subidaDisponible ? (
          <>
            <label className={e.zonaArchivo}>
              <input
                ref={entradaArchivo}
                type="file"
                accept={TIPOS_ACEPTADOS}
                hidden
                onChange={(ev) => {
                  const elegido = ev.target.files?.[0]
                  if (elegido) void subir(elegido)
                }}
              />
              <span className={e.zonaArchivoTitulo}>
                {subiendo ? t.subiendo : t.elegirArchivo}
              </span>
              <span className={e.zonaArchivoPista}>
                {t.formatosArchivo}
              </span>
            </label>

            {errorArchivo && (
              <p className={e.pista} style={{ color: '#e59a9a' }} role="alert">
                {errorArchivo}
              </p>
            )}

            {archivo && (
              <div className={e.archivoElegido}>
                <span>
                  {archivo.nombre} · {pesoArchivo(archivo.bytes)}
                </span>
                <button
                  type="button"
                  className={e.quitar}
                  onClick={() => {
                    setArchivo(null)
                    if (entradaArchivo.current) entradaArchivo.current.value = ''
                  }}
                >
                  Quitar
                </button>
              </div>
            )}
          </>
        ) : (
          <p className={e.pista}>
            {t.archivoSinBase}
          </p>
        )}

        {archivo && (
          <>
            <input type="hidden" name="archivo_ruta" value={archivo.ruta} />
            <input type="hidden" name="archivo_nombre" value={archivo.nombre} />
            <input type="hidden" name="archivo_bytes" value={archivo.bytes} />
            <input type="hidden" name="archivo_mime" value={archivo.mime} />
          </>
        )}

        <p className={e.pista}>
          {t.avisoArte}
        </p>
      </fieldset>

      {/* ------------------------------------------------------------ Entrega */}
      <fieldset className={e.grupo} style={{ border: 'none', margin: 0, padding: 0 }}>
        <div className={e.tituloGrupo}>
          <span className={e.numeroGrupo}>04</span>
          <span className={e.textoGrupo}>{t.grupoEntrega}</span>
        </div>

        <div className={e.rejillaCampos}>
          <div className={e.anchoCompleto}>
            <label className={e.etiqueta} htmlFor="metodo_entrega">
              {t.metodo}
            </label>
            <select className={e.select} id="metodo_entrega" name="metodo_entrega">
              <option value="">{t.metodoSinDefinir}</option>
              <option value="envio_nacional">{t.metodoEnvio}</option>
              <option value="retiro_taller">{t.metodoRetiro}</option>
              <option value="entrega_local">{t.metodoLocal}</option>
            </select>
          </div>

          <div className={e.anchoCompleto}>
            <label className={e.etiqueta} htmlFor="observaciones">
              {t.indicaciones}
            </label>
            <textarea
              className={e.area}
              id="observaciones"
              name="observaciones"
              maxLength={2000}
              placeholder={t.indicacionesPlaceholder}
            />
          </div>
        </div>
      </fieldset>

      <p className={e.pista} style={{ marginBottom: 18 }}>
        {t.avisoSinPagos}
      </p>

      <BotonEnviar idioma={idioma} />
    </form>
  )
}
