import Link from 'next/link'
import Image from 'next/image'
import {
  obtenerCategorias,
  obtenerContacto,
  obtenerContenido,
  obtenerDestacados,
  obtenerDisponiblesHoy,
  obtenerFaq,
  obtenerMedia,
  enlaceWhatsapp,
  type Media,
} from '@/lib/consultas'
import { MOSAICO_DEMO } from '@/lib/demo'
import { ruta, esIdioma, type Idioma } from '@/lib/i18n'
import { textos } from '@/lib/textos'
import TarjetaProducto from '@/componentes/sitio/TarjetaProducto'
import Faq from '@/componentes/sitio/Faq'
import s from '@/componentes/sitio/Secciones.module.css'

// El contenido puede cambiar desde el panel: se revalida cada 5 minutos en
// lugar de quedar congelado en el build.
export const revalidate = 300

/** La marquesina son nombres de producto: se traducen. */
const PALABRAS_MARQUESINA: Record<Idioma, string[]> = {
  es: [
    'Sublimación', 'Camisas', 'Buzos', 'Gorras',
    'Tazas', 'Termos', 'Llaveros', 'Corporativo',
  ],
  en: [
    'Sublimation', 'Shirts', 'Hoodies', 'Caps',
    'Mugs', 'Tumblers', 'Keychains', 'Corporate',
  ],
}

/**
 * Las imágenes de la portada, con su valor por defecto.
 *
 * Cada una se puede reemplazar desde el panel: la clave (`hero-1`…) es la que
 * identifica el hueco en `contenido_media`. La ruta de `/assets` se queda como
 * respaldo para que la portada se vea entera aunque la base no responda — que
 * es justo el momento en el que menos conviene enseñar huecos grises.
 */
const FOTOS_PORTADA = [
  { clave: 'hero-1', src: '/assets/tee-newplan.jpeg', alt: 'Camiseta personalizada NYX' },
  { clave: 'hero-2', src: '/assets/bottle-create.jpeg', alt: 'Termo personalizado NYX' },
  { clave: 'hero-3', src: '/assets/kit-blue.jpeg', alt: 'Kit corporativo NYX' },
]

/** Busca un hueco concreto; si no está en la base, devuelve el valor de siempre. */
function media(
  m: Media,
  bloque: string,
  clave: string,
  porDefecto: string,
  altPorDefecto = ''
): { src: string; alt: string } {
  const encontrado = m[bloque]?.[clave]
  return {
    src: encontrado?.url ?? porDefecto,
    alt: encontrado?.alt || altPorDefecto,
  }
}

export default async function Portada({
  params,
}: {
  params: Promise<{ idioma: string }>
}) {
  const { idioma: crudo } = await params
  const idioma: Idioma = esIdioma(crudo) ? crudo : 'es'
  const t = textos(idioma)

  const [categorias, destacados, disponibles, preguntas, contenido, contacto, imagenes] =
    await Promise.all([
      obtenerCategorias(idioma),
      obtenerDestacados(6, idioma),
      obtenerDisponiblesHoy(6, idioma),
      obtenerFaq(idioma),
      obtenerContenido(idioma),
      obtenerContacto(),
      obtenerMedia(),
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
          {FOTOS_PORTADA.map((f, i) => {
            const foto = media(imagenes, 'portada', f.clave, f.src, f.alt)
            return (
              <div key={f.clave} className={s.heroImagen}>
                <Image
                  src={foto.src}
                  alt={foto.alt}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 720px) 100vw, 33vw"
                />
              </div>
            )
          })}
        </div>
        <div className={s.heroVelo} />

        <div className={s.heroContenido}>
          <span className={s.etiqueta}>{portada.etiqueta ?? (idioma === 'en' ? 'NYX sublimation' : 'Sublimación NYX')}</span>
          <h1 className={s.heroTitulo}>
            {portada.titular ?? (idioma === 'en' ? 'Anything you imagine,' : 'Todo lo que imagines,')}
            <br />
            <em>{portada.titularEnfasis ?? (idioma === 'en' ? 'personalized' : 'personalizado')}</em>
          </h1>

          <div className={s.botones}>
            <Link href={ruta('/catalogo', idioma)} className="boton-oro">
              {t.nav.catalogo}
            </Link>
            <Link
              href={ruta('/cotizar', idioma)}
              className="boton-linea"
              style={{ borderColor: 'rgba(255,255,255,.35)' }}
            >
              {t.nav.cotizar}
            </Link>
          </div>

          <div className={s.heroDatos}>
            <div className={s.heroDato}>{t.portada.pedidosEntregados}</div>
            <div className={s.heroDato}>{t.portada.entrega48}</div>
            <div className={s.heroDato}>{t.portada.arteRevisado}</div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Categorías */}
      <section className={`${s.seccionClara} seccion`}>
        <div className="contenedor al-entrar">
          <div className={s.encabezado}>
            <div>
              <span className="antetitulo">{t.portada.categoriasAntetitulo}</span>
              <h2 className="titulo-seccion">{t.portada.categoriasTitulo}</h2>
            </div>
            <Link href={ruta('/catalogo', idioma)} className={s.enlaceVerTodo}>
              {t.portada.verTodo}
            </Link>
          </div>

          <div className={s.rejillaCategorias}>
            {categorias.map((c) => (
              <Link
                key={c.slug}
                href={ruta(`/catalogo?categoria=${c.slug}`, idioma)}
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
                    <div className={s.categoriaCuenta}>{c.cuenta} {t.portada.productos}</div>
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
                {t.portada.seleccionAntetitulo}
              </span>
              <h2 className="titulo-seccion">{t.portada.destacadosTitulo}</h2>
            </div>
            <span className={s.nota} style={{ color: 'var(--gris-suave)' }}>
              {t.portada.precioNota}
            </span>
          </div>

          <div className={s.rejillaProductos}>
            {destacados.map((p) => (
              <TarjetaProducto key={p.id} producto={p} variante="oscura"
                idioma={idioma} />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Marquesina */}
      <div className={s.marquesina}>
        <div className={s.marquesinaPista}>
          {[...PALABRAS_MARQUESINA[idioma], ...PALABRAS_MARQUESINA[idioma]].map((palabra, i) => (
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
                {t.portada.trabajosAntetitulo}
              </span>
              <h2 className="titulo-seccion">{t.portada.trabajosTitulo}</h2>
            </div>
            <Link href={ruta('/catalogo', idioma)} className={s.enlaceVerTodo}>
              {t.portada.verTodo}
            </Link>
          </div>

          <div className={s.mosaico}>
            {MOSAICO_DEMO.map((src, i) => {
              const clave = `mosaico-${String(i + 1).padStart(2, '0')}`
              const foto = media(imagenes, 'trabajos-reales', clave, src, `${t.portada.trabajoAlt} ${i + 1}`)
              return (
              <div key={clave} className={s.mosaicoFoto}>
                <Image
                  src={foto.src}
                  alt={foto.alt}
                  fill
                  sizes="(max-width: 720px) 50vw, 20vw"
                />
              </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- Cómo funciona */}
      <section className={`${s.seccionCarbon} seccion`} id="proceso">
        <div className={`contenedor ${s.dosColumnas} al-entrar`}>
          <div>
            <span className="antetitulo" style={{ color: '#fff' }}>
              {t.portada.procesoAntetitulo}
            </span>
            <h2 className="titulo-seccion" style={{ marginBottom: 34 }}>
              {t.portada.procesoTitulo}
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

            <Link href={ruta('/cotizar', idioma)} className="boton-oro" style={{ marginTop: 34 }}>
              {t.portada.comenzar}
            </Link>
          </div>

          <div>
            <div className={s.previsualizacion}>
              <span className={s.cinta}>{t.portada.vistaPrevia}</span>
              <Image
                {...media(
                  imagenes,
                  'como-funciona',
                  'proceso-muestra',
                  '/assets/tee-max.jpeg',
                  'Vista previa de un logotipo sobre camiseta'
                )}
                fill
                sizes="(max-width: 900px) 100vw, 45vw"
              />
              <span className={s.marcaLogo}>
                {t.portada.tuLogotipo}
                <br />
                {t.portada.aqui}
              </span>
            </div>
            <p
              style={{
                margin: '16px 0 0',
                font: '300 11.5px/1.7 var(--fuente-sans), sans-serif',
                color: 'var(--gris-suave)',
              }}
            >
              {t.portada.avisoVistaPrevia}
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
                <span className={s.etiqueta}>{t.portada.inmediataEtiqueta}</span>
                <h2 className="titulo-seccion" style={{ marginTop: 18 }}>
                  {t.portada.inmediataTitulo}
                </h2>
              </div>
              <span className={s.nota} style={{ color: 'var(--gris-medio)' }}>
                {t.portada.inmediataNota}
              </span>
            </div>

            <div className={s.rejillaProductos}>
              {disponibles.map((p) => (
                <TarjetaProducto key={p.id} producto={p} variante="clara"
                  idioma={idioma} />
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
                {...media(
                  imagenes,
                  'empresas',
                  'empresas-foto',
                  '/assets/kit-blue.jpeg',
                  'Kit corporativo NYX'
                )}
                width={600}
                height={800}
              />
            </div>
            <div className={s.empresasVideo}>
              <span className={s.cinta}>{t.portada.procesoNyx}</span>
              <video
                src={
                  media(imagenes, 'empresas', 'empresas-video', '/assets/nyx-proceso.mp4').src
                }
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
              {t.portada.empresasAntetitulo}
            </span>
            <h2 className="titulo-seccion">
              {empresas.titular ?? (idioma === 'en' ? 'We personalize your company identity' : 'Personalizamos la identidad de tu empresa')}
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

            <Link href={ruta('/cotizar', idioma)} className="boton-linea" style={{ marginTop: 34 }}>
              {t.portada.cotizarEmpresarial}
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- Nosotros */}
      <section className={`${s.seccionBlanca} seccion`} id="nosotros">
        <div className={`contenedor ${s.dosColumnas} al-entrar`}>
          <div>
            <Image
              {...media(imagenes, 'nosotros', 'nosotros-logo', '/assets/nyx-logo.jpeg', 'NYX')}
              width={190}
              height={90}
              style={{ margin: '0 0 26px', mixBlendMode: 'multiply', height: 'auto' }}
            />
            <span className="antetitulo">{t.portada.nosotrosAntetitulo}</span>
            <h2 className="titulo-seccion">
              {nosotros.titular ?? (idioma === 'en' ? 'Detail, craft and rebirth' : 'Detalle, oficio y renacimiento')}
            </h2>
            <p className={s.parrafoIzquierda} style={{ color: 'var(--gris-fuerte)' }}>
              {nosotros.parrafo}
            </p>

            <div className={s.cifras}>
              <div>
                <div className={s.cifra}>{nosotros.cifra1 ?? (idioma === 'en' ? '6 years' : '6 años')}</div>
                <div className={s.cifraDetalle}>{nosotros.cifra1Detalle ?? (idioma === 'en' ? 'of experience' : 'de experiencia')}</div>
              </div>
              <div>
                <div className={s.cifra}>{nosotros.cifra2 ?? (idioma === 'en' ? '1 to 1' : '1 a 1')}</div>
                <div className={s.cifraDetalle}>
                  {nosotros.cifra2Detalle ?? (idioma === 'en' ? 'design review' : 'revisión de diseño')}
                </div>
              </div>
            </div>
          </div>

          <div className={s.retrato}>
            <Image
              {...media(
                imagenes,
                'nosotros',
                'nosotros-foto',
                '/assets/key-studio.jpeg',
                'Llaveros personalizados NYX'
              )}
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
              {t.portada.preguntasAntetitulo}
            </span>
            <h2 className="titulo-seccion">{t.portada.preguntasTitulo}</h2>
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
            {t.portada.cierreTitulo}
          </h2>
          <p className={s.parrafo}>
            {t.portada.cierreTexto}
          </p>
          <div className={s.botonesCentrados}>
            <Link href={ruta('/cotizar', idioma)} className="boton-oro">
              {t.nav.cotizar}
            </Link>
            <a
              href={enlaceWhatsapp(contacto.whatsapp, t.portada.mensajeWhatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="boton-linea"
              style={{ borderColor: 'rgba(255,255,255,.24)' }}
            >
              {t.portada.hablarWhatsapp}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
