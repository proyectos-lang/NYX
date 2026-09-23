'use client'

import { useActionState, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { crearClienteNavegador } from '@/lib/supabase/client'
import { pesoArchivo } from '@/lib/formato'
import { enviarSolicitud, type EstadoSolicitud } from './acciones'
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

function BotonEnviar() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={`boton-oro ${e.enviar}`} disabled={pending}>
      {pending ? 'Enviando…' : 'Enviar solicitud'}
    </button>
  )
}

export default function Formulario({
  productos,
  productoInicial,
  subidaDisponible,
  disenoToken,
}: Props) {
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
      setErrorArchivo('El archivo supera los 20 MB. Comprímelo o envíanoslo por WhatsApp.')
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
      setErrorArchivo('No pudimos subir el archivo. Puedes enviarlo después por WhatsApp.')
    } finally {
      setSubiendo(false)
    }
  }

  if (estado.estado === 'ok') {
    return (
      <div className={e.exito}>
        <span className={e.textoGrupo}>Solicitud recibida</span>
        <h2 className={e.exitoTitulo}>Gracias, ya la tenemos</h2>
        <div className={e.referencia}>{estado.referencia}</div>
        <p className={e.exitoTexto}>
          Guarda esta referencia. NYX revisa tu solicitud y responde con el precio final y el
          tiempo de entrega en un máximo de 24 horas hábiles.
        </p>
        <div style={{ marginTop: 28 }}>
          <Link href="/catalogo" className="boton-linea">
            Seguir viendo el catálogo
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form action={accion}>
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
                Tu diseño va adjunto.
              </strong>{' '}
              NYX lo verá tal como lo dejaste en el estudio.
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
              Seguir editándolo
            </Link>
          </div>
        </>
      )}

      {/* --------------------------------------------------- Datos de contacto */}
      <fieldset className={e.grupo} style={{ border: 'none', margin: 0, padding: 0 }}>
        <div className={e.tituloGrupo}>
          <span className={e.numeroGrupo}>01</span>
          <span className={e.textoGrupo}>Tus datos</span>
        </div>

        <div className={e.rejillaCampos}>
          <div>
            <label className={e.etiqueta} htmlFor="nombre">
              Nombre completo
            </label>
            <input
              className={e.campo}
              id="nombre"
              name="nombre"
              required
              maxLength={120}
              placeholder="Ana Martínez"
            />
          </div>
          <div>
            <label className={e.etiqueta} htmlFor="empresa">
              Empresa (opcional)
            </label>
            <input
              className={e.campo}
              id="empresa"
              name="empresa"
              maxLength={120}
              placeholder="NYX Studio S.A."
            />
          </div>
          <div>
            <label className={e.etiqueta} htmlFor="email">
              Correo electrónico
            </label>
            <input
              className={e.campo}
              id="email"
              name="email"
              type="email"
              required
              maxLength={160}
              placeholder="ana@empresa.com"
            />
          </div>
          <div>
            <label className={e.etiqueta} htmlFor="telefono">
              Teléfono / WhatsApp
            </label>
            <input
              className={e.campo}
              id="telefono"
              name="telefono"
              type="tel"
              maxLength={40}
              placeholder="+593 99 000 0000"
            />
          </div>
        </div>
      </fieldset>

      {/* --------------------------------------------------------- El pedido */}
      <fieldset className={e.grupo} style={{ border: 'none', margin: 0, padding: 0 }}>
        <div className={e.tituloGrupo}>
          <span className={e.numeroGrupo}>02</span>
          <span className={e.textoGrupo}>Qué quieres personalizar</span>
        </div>

        <div className={e.rejillaCampos}>
          <div className={e.anchoCompleto}>
            <label className={e.etiqueta} htmlFor="producto_id">
              Producto
            </label>
            <select
              className={e.select}
              id="producto_id"
              name="producto_id"
              value={seleccionado}
              onChange={(ev) => setSeleccionado(ev.target.value)}
            >
              <option value="">Otro / no está en la lista</option>
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
              Cantidad
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
              Fecha requerida
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
              Colores, tallas y detalles
            </label>
            <input
              className={e.campo}
              id="especificaciones"
              name="especificaciones"
              maxLength={1000}
              placeholder="Negro · tallas S a XL · logo frontal centrado"
            />
          </div>
        </div>
      </fieldset>

      {/* --------------------------------------------------------- Tu diseño */}
      <fieldset className={e.grupo} style={{ border: 'none', margin: 0, padding: 0 }}>
        <div className={e.tituloGrupo}>
          <span className={e.numeroGrupo}>03</span>
          <span className={e.textoGrupo}>Tu logotipo o diseño</span>
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
                {subiendo ? 'Subiendo…' : 'Selecciona tu archivo'}
              </span>
              <span className={e.zonaArchivoPista}>
                PNG, JPG, PDF, AI o SVG · hasta 20 MB
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
            La carga de archivos se activa cuando el sitio esté conectado a Supabase.
            Mientras tanto, envíanos el diseño por WhatsApp o correo tras enviar la solicitud.
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
          Revisamos el arte antes de producir. Si la resolución no alcanza, te avisamos.
        </p>
      </fieldset>

      {/* ------------------------------------------------------------ Entrega */}
      <fieldset className={e.grupo} style={{ border: 'none', margin: 0, padding: 0 }}>
        <div className={e.tituloGrupo}>
          <span className={e.numeroGrupo}>04</span>
          <span className={e.textoGrupo}>Entrega y observaciones</span>
        </div>

        <div className={e.rejillaCampos}>
          <div className={e.anchoCompleto}>
            <label className={e.etiqueta} htmlFor="metodo_entrega">
              Método de entrega
            </label>
            <select className={e.select} id="metodo_entrega" name="metodo_entrega">
              <option value="">Aún no lo sé</option>
              <option value="envio_nacional">Envío nacional</option>
              <option value="retiro_taller">Retiro en taller</option>
              <option value="entrega_local">Entrega local coordinada</option>
            </select>
          </div>

          <div className={e.anchoCompleto}>
            <label className={e.etiqueta} htmlFor="observaciones">
              Indicaciones adicionales
            </label>
            <textarea
              className={e.area}
              id="observaciones"
              name="observaciones"
              maxLength={2000}
              placeholder="Ubicación del logotipo, colores de referencia, empaque, texto adicional…"
            />
          </div>
        </div>
      </fieldset>

      <p className={e.pista} style={{ marginBottom: 18 }}>
        Sin pagos en línea. Tu solicitud es revisada y confirmada por NYX antes de producción.
      </p>

      <BotonEnviar />
    </form>
  )
}
