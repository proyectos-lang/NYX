import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
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

  // Aparte de categoriaActiva porque se usa en dos bloques, y repetir el
  // encadenamiento opcional en cada uno se lee peor.
  const subcategorias = categoriaActiva?.subcategorias ?? []

  // La subcategoría abierta, si la hay. Se busca sin distinguir mayúsculas
  // porque el nombre viaja en la dirección y ahí puede llegar escrito de otra
  // forma; lo que se pinta es el nombre tal como está guardado.
  const subcategoriaActiva = subcategorias.find(
    (s) => s.nombre.toLowerCase() === (parametros.tecnica ?? '').toLowerCase()
  )
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
            <span className={e.tituloTecnica}>
              {' '}
              · {subcategoriaActiva?.nombre ?? parametros.tecnica}
            </span>
          )}
        </h1>

        {/* Dentro de una subcategoría, su descripción. Es el mismo texto que se
            lee en la tarjeta de la categoría: si desapareciera al entrar, lo
            que se escribe en el panel solo se vería de pasada. */}
        {subcategoriaActiva?.descripcion && (
          <p className={e.resumen}>{subcategoriaActiva.descripcion}</p>
        )}

        {/* Las subcategorías de esta categoría: con qué se fabrica lo que hay
            dentro. Es lo que hay que saber ANTES de que haya productos —una
            camiseta de NYX se hace en DTF y no sublimada— y conviene decirlo
            aunque el catálogo de camisetas esté todavía vacío.

            Se enseñan de dos formas según dónde estés:

            · Al entrar en la categoría, como TARJETAS con foto y descripción.
              Ahí son el contenido principal: lo que explica qué hace NYX con
              ese producto.
            · Ya dentro de una subcategoría, como una fila de CHIPS. Ahí ya no
              hay que explicarlas, solo poder cambiar de una a otra sin que
              ocupen media pantalla. */}
        {subcategorias.length > 0 && !parametros.tecnica && (
          <div className={e.rejillaSubcategorias}>
            {subcategorias.map((sub) => (
              <Link
                key={sub.nombre}
                href={construirEnlace(parametros, { tecnica: sub.nombre, pagina: '1' }, idioma)}
                className={e.subcategoria}
              >
                <div className={e.subcategoriaFoto}>
                  {sub.imagen ? (
                    <Image
                      src={sub.imagen}
                      alt={sub.nombre}
                      fill
                      sizes="(max-width: 720px) 50vw, 25vw"
                    />
                  ) : (
                    <span className={e.subcategoriaSinFoto}>{sub.nombre}</span>
                  )}
                </div>
                <div className={e.subcategoriaCuerpo}>
                  <div className={e.subcategoriaNombre}>{sub.nombre}</div>
                  {sub.descripcion && (
                    <p className={e.subcategoriaTexto}>{sub.descripcion}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {subcategorias.length > 0 && parametros.tecnica && (
          <div className={e.tecnicas}>
            <span className={e.tecnicasEtiqueta}>{txt.catalogo.tecnicas}</span>

            <Link
              href={construirEnlace(parametros, { tecnica: undefined, pagina: '1' }, idioma)}
              className={e.tecnica}
              data-activa={false}
            >
              {txt.catalogo.todas}
            </Link>

            {subcategorias.map((sub) => (
              <Link
                key={sub.nombre}
                href={construirEnlace(parametros, { tecnica: sub.nombre, pagina: '1' }, idioma)}
                className={e.tecnica}
                data-activa={
                  (parametros.tecnica ?? '').toLowerCase() === sub.nombre.toLowerCase()
                }
              >
                {sub.nombre}
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
