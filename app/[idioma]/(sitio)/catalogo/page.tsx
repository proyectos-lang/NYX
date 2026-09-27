import type { Metadata } from 'next'
import Link from 'next/link'
import { obtenerCatalogo, obtenerCategorias } from '@/lib/consultas'
import TarjetaProducto from '@/componentes/sitio/TarjetaProducto'
import { ruta, esIdioma, type Idioma } from '@/lib/i18n'
import { textos } from '@/lib/textos'
import e from './Catalogo.module.css'

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ idioma: string }>
}): Promise<Metadata> {
  const { idioma: crudo } = await params
  const t = textos(esIdioma(crudo) ? crudo : 'es')
  return { title: t.catalogo.titulo, description: t.catalogo.descripcion }
}

type Parametros = {
  categoria?: string
  /** La subcategoría: DTF, Sublimación, Bordado… */
  tecnica?: string
  q?: string
  pagina?: string
}

/** Conserva los filtros vigentes al cambiar uno solo. */
function construirEnlace(
  actuales: Parametros,
  cambios: Parametros,
  idioma: Idioma
): string {
  const params = new URLSearchParams()
  const fusion = { ...actuales, ...cambios }

  for (const [clave, valor] of Object.entries(fusion)) {
    // "todos" y la página 1 son el estado por defecto: fuera de la URL.
    if (!valor || valor === 'todos' || (clave === 'pagina' && valor === '1')) continue
    params.set(clave, valor)
  }

  const cadena = params.toString()
  return ruta(cadena ? `/catalogo?${cadena}` : '/catalogo', idioma)
}

export default async function Catalogo({
  params,
  searchParams,
}: {
  params: Promise<{ idioma: string }>
  searchParams: Promise<Parametros>
}) {
  const { idioma: crudo } = await params
  const idioma: Idioma = esIdioma(crudo) ? crudo : 'es'
  const txt = textos(idioma)

  const parametros = await searchParams
  const pagina = Number(parametros.pagina) || 1

  const [categorias, resultado] = await Promise.all([
    obtenerCategorias(idioma),
    obtenerCatalogo(
      {
        categoria: parametros.categoria,
        tecnica: parametros.tecnica,
        busqueda: parametros.q,
        pagina,
      },
      idioma
    ),
  ])

  const categoriaActiva = categorias.find((c) => c.slug === parametros.categoria)
  const desde = resultado.total === 0 ? 0 : (resultado.pagina - 1) * 24 + 1
  const hasta = Math.min(resultado.total, resultado.pagina * 24)

  return (
    <div className={e.pagina}>
      <div className="contenedor">
        <nav className={e.migas}>
          <Link href={ruta('/', idioma)}>{txt.nav.inicio}</Link> / {txt.catalogo.migas}
          {categoriaActiva ? ` / ${categoriaActiva.nombre}` : ''}
        </nav>

        <h1 className={e.titulo}>
          {categoriaActiva?.nombre ?? txt.catalogo.titulo}
          {parametros.tecnica && (
            <span className={e.tituloTecnica}> · {parametros.tecnica}</span>
          )}
        </h1>

        {/* Con que se fabrica lo de esta categoria. Es lo que hay que saber
            ANTES de que haya productos: una camiseta de NYX se hace en DTF y
            no sublimada, y conviene decirlo aunque el catalogo de camisetas
            este todavia vacio. */}
        {categoriaActiva && categoriaActiva.tecnicas.length > 0 && (
          <div className={e.tecnicas}>
            <span className={e.tecnicasEtiqueta}>{txt.catalogo.tecnicas}</span>

            {/* Son ENLACES, no etiquetas: al pulsarlas se filtra el catálogo
                por esa técnica. Es lo que las convierte en subcategoría — sin
                esto serían un cartel que se puede pulsar y no hace nada. */}
            <Link
              href={construirEnlace(parametros, { tecnica: undefined, pagina: '1' }, idioma)}
              className={e.tecnica}
              data-activa={!parametros.tecnica}
            >
              {txt.catalogo.todas}
            </Link>

            {categoriaActiva.tecnicas.map((tecnica) => (
              <Link
                key={tecnica}
                href={construirEnlace(parametros, { tecnica, pagina: '1' }, idioma)}
                className={e.tecnica}
                data-activa={
                  (parametros.tecnica ?? '').toLowerCase() === tecnica.toLowerCase()
                }
              >
                {tecnica}
              </Link>
            ))}
          </div>
        )}
        <p className={e.resumen}>
          {resultado.total > 0
            ? txt.catalogo.mostrando(desde, hasta, resultado.total)
            : txt.catalogo.sinResultados}
        </p>

        <div className={e.barra}>
          {/* Formulario GET: la búsqueda vive en la URL, sin JavaScript. */}
          <form className={e.buscador} action={ruta('/catalogo', idioma)} method="get">
            {parametros.categoria && (
              <input type="hidden" name="categoria" value={parametros.categoria} />
            )}
            <input
              className={e.campoBusqueda}
              type="search"
              name="q"
              defaultValue={parametros.q ?? ''}
              placeholder={txt.catalogo.buscarPlaceholder}
              aria-label={txt.catalogo.buscar}
            />
            <button className={e.botonBuscar} type="submit">
              {txt.catalogo.buscar}
            </button>
          </form>

        </div>

        <div className={e.cuerpo}>
          <aside className={e.lateral}>
            <div className={e.tituloFiltro}>{txt.catalogo.categorias}</div>
            <div className={e.listaFiltro}>
              <Link
                href={construirEnlace(parametros, { categoria: undefined, pagina: '1' }, idioma)}
                className={e.opcionFiltro}
                data-activa={!parametros.categoria}
              >
                {txt.catalogo.todas}
              </Link>
              {categorias.map((c) => (
                <Link
                  key={c.slug}
                  href={construirEnlace(parametros, { categoria: c.slug, pagina: '1' }, idioma)}
                  className={e.opcionFiltro}
                  data-activa={parametros.categoria === c.slug}
                >
                  {c.nombre}
                </Link>
              ))}
            </div>
          </aside>

          <div>
            {resultado.productos.length === 0 ? (
              <div className={e.vacio}>
                <div className={e.vacioTitulo}>{txt.catalogo.vacioTitulo}</div>
                <p className={e.vacioTexto}>
                  {txt.catalogo.vacioTexto}
                </p>
                <Link href={ruta('/cotizar', idioma)} className="boton-oro">
                  {txt.nav.cotizar}
                </Link>
              </div>
            ) : (
              <div className={e.rejilla}>
                {resultado.productos.map((p) => (
                  <TarjetaProducto key={p.id} producto={p} variante="oscura" idioma={idioma} />
                ))}
              </div>
            )}

            {resultado.paginas > 1 && (
              <nav className={e.paginacion} aria-label={txt.catalogo.titulo}>
                {Array.from({ length: resultado.paginas }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={construirEnlace(parametros, { pagina: String(n) }, idioma)}
                    className={e.pagina}
                    data-activa={n === resultado.pagina}
                    aria-current={n === resultado.pagina ? 'page' : undefined}
                  >
                    {n}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
