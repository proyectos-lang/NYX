import Link from 'next/link'
import Image from 'next/image'
import {
  obtenerCategorias,
  obtenerContacto,
  obtenerContenido,
  obtenerDestacados,
  obtenerDisponiblesHoy,
  obtenerFaq,
  enlaceWhatsapp,
} from '@/lib/consultas'
import { MOSAICO_DEMO } from '@/lib/demo'
import TarjetaProducto from '@/componentes/sitio/TarjetaProducto'
import Faq from '@/componentes/sitio/Faq'
import s from '@/componentes/sitio/Secciones.module.css'

// El contenido puede cambiar desde el panel: se revalida cada 5 minutos en
// lugar de quedar congelado en el build.
export const revalidate = 300

const PALABRAS_MARQUESINA = [
  'Sublimación', 'Camisas', 'Buzos', 'Gorras',
  'Tazas', 'Termos', 'Llaveros', 'Corporativo',
]

const FOTOS_PORTADA = [
  { src: '/assets/tee-newplan.jpeg', alt: 'Camiseta personalizada NYX' },
  { src: '/assets/bottle-create.jpeg', alt: 'Termo personalizado NYX' },
  { src: '/assets/kit-blue.jpeg', alt: 'Kit corporativo NYX' },
]

export default async function Portada() {
  const [categorias, destacados, disponibles, preguntas, contenido, contacto] =
    await Promise.all([
      obtenerCategorias(),
      obtenerDestacados(6),
      obtenerDisponiblesHoy(6),
      obtenerFaq(),
      obtenerContenido(),
      obtenerContacto(),
    ])

  const portada = contenido.portada ?? {}
  const proceso = contenido['como-funciona'] ?? {}
  const empresas = contenido.empresas ?? {}
  const nosotros = contenido.nosotros ?? {}

  const pasos = [1, 2, 3, 4].map((n) => {
    const clave = `paso-0${n}`
    return {
      numero: `0${n}`,
      titulo: proceso[clave] ?? '',
      detalle: proceso[`${clave}-detalle`] ?? '',
    }
  })

  const etiquetasEmpresa = (empresas.etiquetas ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  return (
    <>
      {/* ---------------------------------------------------------- Portada */}
      <section className={s.hero}>
        <div className={s.heroFondo}>
          {FOTOS_PORTADA.map((f, i) => (
            <div key={f.src} className={s.heroImagen}>
              <Image
                src={f.src}
                alt={f.alt}
                fill
                priority={i === 0}
                sizes="(max-width: 720px) 100vw, 33vw"
              />
            </div>
          ))}
        </div>
        <div className={s.heroVelo} />

        <div className={s.heroContenido}>
          <span className={s.etiqueta}>{portada.etiqueta ?? 'Sublimación NYX'}</span>
          <h1 className={s.heroTitulo}>
            {portada.titular ?? 'Todo lo que imagines,'}
            <br />
            <em>{portada.titularEnfasis ?? 'personalizado'}</em>
          </h1>

          <div className={s.botones}>
            <Link href="/catalogo" className="boton-oro">
              Ver catálogo
            </Link>
            <Link
              href="/cotizar"
              className="boton-linea"
              style={{ borderColor: 'rgba(255,255,255,.35)' }}
            >
              Solicitar cotización
            </Link>
          </div>

          <div className={s.heroDatos}>
            <div className={s.heroDato}>+850 pedidos entregados</div>
            <div className={s.heroDato}>Entrega inmediata en 48 h</div>
            <div className={s.heroDato}>Arte revisado antes de producir</div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Categorías */}
      <section className={`${s.seccionClara} seccion`}>
        <div className="contenedor al-entrar">
          <div className={s.encabezado}>
            <div>
              <span className="antetitulo">Categorías</span>
              <h2 className="titulo-seccion">Encuentra lo que deseas personalizar</h2>
            </div>
            <Link href="/catalogo" className={s.enlaceVerTodo}>
              Ver todo el catálogo
            </Link>
          </div>

          <div className={s.rejillaCategorias}>
            {categorias.map((c) => (
              <Link
                key={c.slug}
                href={`/catalogo?categoria=${c.slug}`}
                className={`${s.categoria} al-entrar`}
              >
                <div className={s.categoriaFoto}>
                  {c.imagen && (
                    <Image
                      src={c.imagen}
                      alt={c.nombre}
                      fill
                      sizes="(max-width: 720px) 50vw, 25vw"
                    />
                  )}
                </div>
                <div className={s.categoriaPie}>
                  <div>
                    <div className={s.categoriaNombre}>{c.nombre}</div>
                    <div className={s.categoriaCuenta}>{c.cuenta} productos</div>
                  </div>
                  <span className={s.flecha} aria-hidden="true">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Destacados */}
      <section className={`${s.seccionOscura} seccion`}>
        <div className="contenedor al-entrar">
          <div className={s.encabezado}>
            <div>
              <span className="antetitulo" style={{ color: '#fff' }}>
                Selección
              </span>
              <h2 className="titulo-seccion">Productos destacados</h2>
            </div>
            <span className={s.nota} style={{ color: 'var(--gris-suave)' }}>
              Precios referenciales. El valor final se confirma según cantidad y acabado.
            </span>
          </div>

          <div className={s.rejillaProductos}>
            {destacados.map((p) => (
              <TarjetaProducto key={p.id} producto={p} variante="oscura" />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Marquesina */}
      <div className={s.marquesina}>
        <div className={s.marquesinaPista}>
          {[...PALABRAS_MARQUESINA, ...PALABRAS_MARQUESINA].map((palabra, i) => (
            <span
              key={`${palabra}-${i}`}
              className={s.marquesinaItem}
              style={{ color: i % 2 ? '#ffffff' : '#6f6f6f' }}
            >
              {palabra}
              <span className={s.rombo} aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>

      {/* --------------------------------------------------- Trabajos reales */}
      <section className={`${s.seccionBlanca} seccion`}>
        <div className="contenedor">
          <div className={s.encabezado}>
            <div>
              <span className="antetitulo" style={{ color: 'var(--oro-oscuro)' }}>
                Trabajos reales
              </span>
              <h2 className="titulo-seccion">Lo que hemos producido</h2>
            </div>
            <Link href="/catalogo" className={s.enlaceVerTodo}>
              Ver todo el catálogo
            </Link>
          </div>

          <div className={s.mosaico}>
            {MOSAICO_DEMO.map((src, i) => (
              <div key={src} className={s.mosaicoFoto}>
                <Image
                  src={src}
                  alt={`Trabajo NYX ${i + 1}`}
                  fill
                  sizes="(max-width: 720px) 50vw, 20vw"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- Cómo funciona */}
      <section className={`${s.seccionCarbon} seccion`} id="proceso">
        <div className={`contenedor ${s.dosColumnas} al-entrar`}>
          <div>
            <span className="antetitulo" style={{ color: '#fff' }}>
              Cómo funciona
            </span>
            <h2 className="titulo-seccion" style={{ marginBottom: 34 }}>
              Personalizar con NYX es simple
            </h2>

            <div>
              {pasos.map((p) => (
                <div key={p.numero} className={s.paso}>
                  <span className={s.pasoNumero}>{p.numero}</span>
                  <div>
                    <div className={s.pasoTitulo}>{p.titulo}</div>
                    <div className={s.pasoDetalle}>{p.detalle}</div>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/cotizar" className="boton-oro" style={{ marginTop: 34 }}>
              Comenzar mi pedido
            </Link>
          </div>

          <div>
            <div className={s.previsualizacion}>
              <span className={s.cinta}>VISTA PREVIA</span>
              <Image
                src="/assets/tee-max.jpeg"
                alt="Vista previa de un logotipo sobre camiseta"
                fill
                sizes="(max-width: 900px) 100vw, 45vw"
              />
              <span className={s.marcaLogo}>
                tu logotipo
                <br />
                aquí
              </span>
            </div>
            <p
              style={{
                margin: '16px 0 0',
                font: '300 11.5px/1.7 var(--fuente-sans), sans-serif',
                color: 'var(--gris-suave)',
              }}
            >
              La vista previa es únicamente referencial. El diseño final será revisado y
              aprobado por NYX antes de producirlo.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Entrega inmediata */}
      {disponibles.length > 0 && (
        <section className={`${s.seccionClara} seccion`}>
          <div className="contenedor al-entrar">
            <div className={s.encabezado}>
              <div>
                <span className={s.etiqueta}>Entrega inmediata</span>
                <h2 className="titulo-seccion" style={{ marginTop: 18 }}>
                  Listos para llevar hoy
                </h2>
              </div>
              <span className={s.nota} style={{ color: 'var(--gris-medio)' }}>
                Stock existente, sin tiempo de producción. Cantidades limitadas.
              </span>
            </div>

            <div className={s.rejillaProductos}>
              {disponibles.map((p) => (
                <TarjetaProducto key={p.id} producto={p} variante="clara" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- Empresas */}
      <section
        className={`${s.seccionOscura} seccion`}
        id="empresas"
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(90% 70% at 20% 50%, rgba(201,154,46,.12), transparent 62%)',
          }}
        />
        <div
          className={`contenedor ${s.dosColumnas} al-entrar`}
          style={{ position: 'relative' }}
        >
          <div className={s.empresasMedia}>
            <div className={s.empresasFoto}>
              <Image
                src="/assets/kit-blue.jpeg"
                alt="Kit corporativo NYX"
                width={600}
                height={800}
              />
            </div>
            <div className={s.empresasVideo}>
              <span className={s.cinta}>PROCESO NYX</span>
              <video
                src="/assets/nyx-proceso.mp4"
                autoPlay
                muted
                loop
                playsInline
                controls
                preload="metadata"
              />
            </div>
          </div>

          <div>
            <span className="antetitulo" style={{ color: '#fff' }}>
              Empresas
            </span>
            <h2 className="titulo-seccion">
              {empresas.titular ?? 'Personalizamos la identidad de tu empresa'}
            </h2>
            <p className={s.parrafoIzquierda} style={{ color: 'var(--gris-texto)' }}>
              {empresas.parrafo}
            </p>

            <div className={s.pildoras}>
              {etiquetasEmpresa.map((t) => (
                <span key={t} className={s.pildora}>
                  {t}
                </span>
              ))}
            </div>

            <Link href="/cotizar" className="boton-linea" style={{ marginTop: 34 }}>
              Solicitar cotización empresarial
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- Nosotros */}
      <section className={`${s.seccionBlanca} seccion`} id="nosotros">
        <div className={`contenedor ${s.dosColumnas} al-entrar`}>
          <div>
            <Image
              src="/assets/nyx-logo.jpeg"
              alt="NYX"
              width={190}
              height={90}
              style={{ margin: '0 0 26px', mixBlendMode: 'multiply', height: 'auto' }}
            />
            <span className="antetitulo">Sobre nosotros</span>
            <h2 className="titulo-seccion">
              {nosotros.titular ?? 'Detalle, oficio y renacimiento'}
            </h2>
            <p className={s.parrafoIzquierda} style={{ color: 'var(--gris-fuerte)' }}>
              {nosotros.parrafo}
            </p>

            <div className={s.cifras}>
              <div>
                <div className={s.cifra}>{nosotros.cifra1 ?? '6 años'}</div>
                <div className={s.cifraDetalle}>{nosotros.cifra1Detalle ?? 'de experiencia'}</div>
              </div>
              <div>
                <div className={s.cifra}>{nosotros.cifra2 ?? '1 a 1'}</div>
                <div className={s.cifraDetalle}>
                  {nosotros.cifra2Detalle ?? 'revisión de diseño'}
                </div>
              </div>
            </div>
          </div>

          <div className={s.retrato}>
            <Image
              src="/assets/key-studio.jpeg"
              alt="Llaveros personalizados NYX"
              width={600}
              height={750}
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Preguntas frecuentes */}
      <section className={`${s.seccionOscura} seccion`} id="preguntas">
        <div className="contenedor al-entrar" style={{ maxWidth: 900 }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <span className="antetitulo" style={{ color: '#fff' }}>
              Preguntas frecuentes
            </span>
            <h2 className="titulo-seccion">Antes de tu pedido</h2>
          </div>
          <Faq preguntas={preguntas} />
        </div>
      </section>

      {/* ------------------------------------------------------------ Cierre */}
      <section className={s.cierre}>
        <div className={s.cierreLuz} />
        <div className={s.cierreAro} />
        <div className={`${s.cierreContenido} al-entrar`}>
          <h2 className="titulo-seccion" style={{ margin: 0, textWrap: 'balance' }}>
            Haz realidad tu próxima idea con <em style={{ fontStyle: 'italic' }}>NYX</em>
          </h2>
          <p className={s.parrafo}>
            Cuéntanos qué deseas personalizar y recibe una cotización según las
            características de tu pedido.
          </p>
          <div className={s.botonesCentrados}>
            <Link href="/cotizar" className="boton-oro">
              Solicitar cotización
            </Link>
            <a
              href={enlaceWhatsapp(contacto.whatsapp, 'Hola NYX, quisiera personalizar un producto.')}
              target="_blank"
              rel="noopener noreferrer"
              className="boton-linea"
              style={{ borderColor: 'rgba(255,255,255,.24)' }}
            >
              Hablar por WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
