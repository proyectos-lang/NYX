import Link from 'next/link'
import { obtenerBloquesPanel, type BloquePanel } from '@/lib/panel'
import { eliminarMedia, guardarBloque, guardarMedia } from '../acciones'
import SubirImagen from '@/componentes/panel/SubirImagen'
import SinDatos from '@/componentes/panel/SinDatos'
import Aviso from '@/componentes/panel/Aviso'
import s from '@/componentes/panel/SubirImagen.module.css'
import e from '../Panel.module.css'
import p from './Inicio.module.css'

export const metadata = { title: 'Inicio' }

const RUTA = '/panel/inicio'

/**
 * Las secciones de la portada, EN EL MISMO ORDEN EN QUE SE VEN EN LA WEB.
 *
 * Esa es toda la idea de esta pantalla. Antes el panel se organizaba por
 * tablas —"Contenido", "Catálogo", "Categorías"— y para cambiar la foto
 * grande de arriba había que saber que eso vivía en el bloque "portada" de la
 * sección "Contenido". Aquí se baja por la lista igual que se baja por la web.
 *
 * Por eso aparecen también las secciones que NO se editan aquí: si se saltaran,
 * quien busca dónde cambiar la foto de una categoría se quedaría sin pista. Se
 * muestran con un enlace a la pantalla que sí las gestiona.
 */
type Seccion =
  | {
      tipo: 'bloque'
      /** La clave en contenido_bloques. */
      clave: string
      /** Cómo se llama en la web, no en la base de datos. */
      nombre: string
      /** Los huecos de imagen de esta sección, en orden. */
      imagenes?: { clave: string; etiqueta: string; video?: boolean }[]
    }
  | { tipo: 'enlace'; nombre: string; explicacion: string; href: string; texto: string }
  | { tipo: 'fija'; nombre: string; explicacion: string }

const SECCIONES: Seccion[] = [
  {
    tipo: 'bloque',
    clave: 'portada',
    nombre: 'Lo primero que se ve',
    imagenes: [
      { clave: 'hero-1', etiqueta: 'Foto 1 · la única que se ve en el móvil' },
      { clave: 'hero-2', etiqueta: 'Foto 2 · centro' },
      { clave: 'hero-3', etiqueta: 'Foto 3 · derecha' },
    ],
  },
  {
    tipo: 'enlace',
    nombre: 'Categorías',
    explicacion: 'La fila de categorías con su foto y el número de productos.',
    href: '/panel/categorias',
    texto: 'Editar categorías',
  },
  {
    tipo: 'enlace',
    nombre: 'Productos destacados',
    explicacion: 'Los seis primeros productos visibles del catálogo, por orden.',
    href: '/panel/catalogo',
    texto: 'Editar catálogo',
  },
  {
    tipo: 'fija',
    nombre: 'Cinta de palabras',
    explicacion:
      'La tira dorada que se desplaza sola (Sublimación · Camisas · Buzos…). Forma parte del diseño y no se edita desde aquí.',
  },
  {
    tipo: 'bloque',
    clave: 'trabajos-reales',
    nombre: 'Trabajos reales',
    imagenes: Array.from({ length: 12 }, (_, i) => ({
      clave: `mosaico-${String(i + 1).padStart(2, '0')}`,
      etiqueta: `Foto ${i + 1}`,
    })),
  },
  {
    tipo: 'bloque',
    clave: 'como-funciona',
    nombre: 'Cómo funciona',
    imagenes: [{ clave: 'proceso-muestra', etiqueta: 'Camiseta de muestra con el logotipo' }],
  },
  {
    tipo: 'enlace',
    nombre: 'Listos para llevar hoy',
    explicacion:
      'Solo aparece en la web si hay productos marcados como "entrega inmediata" con stock. Si está vacía, la sección no se dibuja.',
    href: '/panel/catalogo',
    texto: 'Editar catálogo',
  },
  {
    tipo: 'bloque',
    clave: 'empresas',
    nombre: 'Empresas',
    imagenes: [
      { clave: 'empresas-foto', etiqueta: 'Foto vertical' },
      { clave: 'empresas-video', etiqueta: 'Vídeo del proceso · MP4', video: true },
    ],
  },
  {
    tipo: 'bloque',
    clave: 'nosotros',
    nombre: 'Sobre nosotros',
    imagenes: [
      { clave: 'nosotros-logo', etiqueta: 'Logotipo sobre el texto' },
      { clave: 'nosotros-foto', etiqueta: 'Foto vertical' },
    ],
  },
  {
    tipo: 'enlace',
    nombre: 'Preguntas frecuentes',
    explicacion: 'El acordeón del final. Se muestran en el orden que tengan.',
    href: '/panel/preguntas',
    texto: 'Editar preguntas',
  },
  {
    tipo: 'enlace',
    nombre: 'Cierre y pie de página',
    explicacion: 'El botón de WhatsApp, el correo, la ciudad y el horario.',
    href: '/panel/ajustes',
    texto: 'Editar contacto',
  },
]

function Cabecera({ nombre, posicion }: { nombre: string; posicion: number }) {
  return (
    <div className={p.cabeceraSeccion}>
      <span className={p.posicion}>{posicion}</span>
      <h2 className={p.nombreSeccion}>{nombre}</h2>
    </div>
  )
}

function Textos({ bloque }: { bloque: BloquePanel }) {
  if (bloque.campos.length === 0) return null

  return (
    <form action={guardarBloque}>
      <input type="hidden" name="volver" value={RUTA} />

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
          </div>
        ))}
      </div>

      {/* El inglés va plegado: la web todavía no tiene versión en inglés, y
          tenerlo siempre a la vista duplicaba la longitud del formulario por
          algo que hoy no se publica en ninguna parte. */}
      <details className={p.ingles}>
        <summary>Versión en inglés</summary>
        <div className={e.rejillaCampos} style={{ marginTop: 14 }}>
          {bloque.campos.map((campo) => (
            <div key={campo.id}>
              <label className={e.etiqueta} htmlFor={`campo_${campo.id}_en`}>
                {campo.etiqueta}
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
      </details>

      <div className={e.acciones}>
        <button type="submit" className={e.boton}>
          Guardar textos
        </button>
      </div>
    </form>
  )
}

export default async function InicioPanel({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string; error?: string }>
}) {
  const { aviso, error: errorUrl } = await searchParams

  let bloques: BloquePanel[]

  try {
    bloques = await obtenerBloquesPanel()
  } catch (error) {
    return <SinDatos error={error} />
  }

  const porClave = new Map(bloques.map((b) => [b.clave, b]))

  return (
    <>
      <Aviso aviso={aviso} error={errorUrl} />

      <div className={e.cabeceraPantalla}>
        <div>
          <span className={e.antetituloPantalla}>Inicio</span>
          <h1 className={e.tituloPantalla}>La página principal</h1>
          <p className={e.pistaPantalla}>
            Las secciones están en el mismo orden en que se ven en la web. Los cambios
            aparecen en el sitio en unos minutos.
          </p>
        </div>

        <Link href="/" target="_blank" rel="noopener noreferrer" className={e.botonTenue}>
          Ver la web
        </Link>
      </div>

      <div className={p.lista}>
        {SECCIONES.map((seccion, i) => {
          const posicion = i + 1

          if (seccion.tipo === 'fija') {
            return (
              <section key={seccion.nombre} className={`${e.tarjeta} ${p.tarjetaTenue}`}>
                <Cabecera nombre={seccion.nombre} posicion={posicion} />
                <div className={e.tarjetaPad}>
                  <p className={p.explicacion}>{seccion.explicacion}</p>
                </div>
              </section>
            )
          }

          if (seccion.tipo === 'enlace') {
            return (
              <section key={seccion.nombre} className={`${e.tarjeta} ${p.tarjetaTenue}`}>
                <Cabecera nombre={seccion.nombre} posicion={posicion} />
                <div className={e.tarjetaPad}>
                  <p className={p.explicacion}>{seccion.explicacion}</p>
                  <Link href={seccion.href} className={e.botonTenue}>
                    {seccion.texto}
                  </Link>
                </div>
              </section>
            )
          }

          const bloque = porClave.get(seccion.clave)

          if (!bloque) {
            return (
              <section key={seccion.clave} className={`${e.tarjeta} ${p.tarjetaTenue}`}>
                <Cabecera nombre={seccion.nombre} posicion={posicion} />
                <div className={e.tarjetaPad}>
                  <p className={p.explicacion}>
                    Esta sección todavía no está en la base de datos, así que la web muestra
                    los valores de ejemplo. Ejecuta <code>supabase/contenido-inicial.sql</code>{' '}
                    en Supabase para poder editarla.
                  </p>
                </div>
              </section>
            )
          }

          const media = new Map(
            bloque.media.filter((m) => m.clave).map((m) => [m.clave as string, m])
          )

          return (
            <section key={bloque.id} className={e.tarjeta}>
              <Cabecera nombre={seccion.nombre} posicion={posicion} />

              <div className={e.tarjetaPad}>
                {seccion.imagenes && seccion.imagenes.length > 0 && (
                  <div style={{ marginBottom: 26 }}>
                    <div className={e.etiqueta} style={{ marginBottom: 10 }}>
                      {seccion.imagenes.length === 1 ? 'Imagen' : 'Imágenes'}
                    </div>

                    <div className={s.rejilla}>
                      {seccion.imagenes.map((hueco) => (
                        <SubirImagen
                          key={hueco.clave}
                          bucket="contenido"
                          accion={guardarMedia}
                          campos={{
                            volver: RUTA,
                            bloque_id: bloque.id,
                            clave: hueco.clave,
                            alt: media.get(hueco.clave)?.alt ?? hueco.etiqueta,
                          }}
                          urlActual={media.get(hueco.clave)?.url || null}
                          etiqueta={hueco.etiqueta}
                          admiteVideo={hueco.video}
                          alQuitar={eliminarMedia}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <Textos bloque={bloque} />

                {bloque.nota && <p className={p.nota}>{bloque.nota}</p>}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}
