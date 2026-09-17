import type { Metadata } from 'next'
import Link from 'next/link'
import { obtenerCatalogo, obtenerCategorias } from '@/lib/consultas'
import type { TipoProducto } from '@/lib/database.types'
import TarjetaProducto from '@/componentes/sitio/TarjetaProducto'
import e from './Catalogo.module.css'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Catálogo',
  description:
    'Camisas, buzos, termos, gorras, tazas, libretas y kits corporativos listos para personalizar.',
}

const TIPOS = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'personalizable', etiqueta: 'Personalizables' },
  { id: 'entrega_inmediata', etiqueta: 'Entrega inmediata' },
] as const

type Parametros = {
  categoria?: string
  tipo?: string
  q?: string
  pagina?: string
}

/** Conserva los filtros vigentes al cambiar uno solo. */
function construirEnlace(actuales: Parametros, cambios: Parametros): string {
  const params = new URLSearchParams()
  const fusion = { ...actuales, ...cambios }

  for (const [clave, valor] of Object.entries(fusion)) {
    // "todos" y la página 1 son el estado por defecto: fuera de la URL.
    if (!valor || valor === 'todos' || (clave === 'pagina' && valor === '1')) continue
    params.set(clave, valor)
  }

  const cadena = params.toString()
  return cadena ? `/catalogo?${cadena}` : '/catalogo'
}

export default async function Catalogo({
  searchParams,
}: {
  searchParams: Promise<Parametros>
}) {
  const parametros = await searchParams
  const tipo = (TIPOS.find((t) => t.id === parametros.tipo)?.id ?? 'todos') as
    | TipoProducto
    | 'todos'
  const pagina = Number(parametros.pagina) || 1

  const [categorias, resultado] = await Promise.all([
    obtenerCategorias(),
    obtenerCatalogo({
      categoria: parametros.categoria,
      tipo,
      busqueda: parametros.q,
      pagina,
    }),
  ])

  const categoriaActiva = categorias.find((c) => c.slug === parametros.categoria)
  const desde = resultado.total === 0 ? 0 : (resultado.pagina - 1) * 24 + 1
  const hasta = Math.min(resultado.total, resultado.pagina * 24)

  return (
    <div className={e.pagina}>
      <div className="contenedor">
        <nav className={e.migas}>
          <Link href="/">Inicio</Link> / Catálogo
          {categoriaActiva ? ` / ${categoriaActiva.nombre}` : ''}
        </nav>

        <h1 className={e.titulo}>{categoriaActiva?.nombre ?? 'Catálogo'}</h1>
        <p className={e.resumen}>
          {resultado.total > 0
            ? `Mostrando ${desde}–${hasta} de ${resultado.total} productos · precios referenciales`
            : 'Sin resultados para los filtros seleccionados'}
        </p>

        <div className={e.barra}>
          {/* Formulario GET: la búsqueda vive en la URL, sin JavaScript. */}
          <form className={e.buscador} action="/catalogo" method="get">
            {parametros.categoria && (
              <input type="hidden" name="categoria" value={parametros.categoria} />
            )}
            {tipo !== 'todos' && <input type="hidden" name="tipo" value={tipo} />}
            <input
              className={e.campoBusqueda}
              type="search"
              name="q"
              defaultValue={parametros.q ?? ''}
              placeholder="Buscar producto, categoría o código"
              aria-label="Buscar en el catálogo"
            />
            <button className={e.botonBuscar} type="submit">
              Buscar
            </button>
          </form>

          <div className={e.pestanas}>
            {TIPOS.map((t) => (
              <Link
                key={t.id}
                href={construirEnlace(parametros, { tipo: t.id, pagina: '1' })}
                className={e.pestana}
                data-activa={tipo === t.id}
              >
                {t.etiqueta}
              </Link>
            ))}
          </div>
        </div>

        <div className={e.cuerpo}>
          <aside className={e.lateral}>
            <div className={e.tituloFiltro}>Categorías</div>
            <div className={e.listaFiltro}>
              <Link
                href={construirEnlace(parametros, { categoria: undefined, pagina: '1' })}
                className={e.opcionFiltro}
                data-activa={!parametros.categoria}
              >
                Todas
              </Link>
              {categorias.map((c) => (
                <Link
                  key={c.slug}
                  href={construirEnlace(parametros, { categoria: c.slug, pagina: '1' })}
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
                <div className={e.vacioTitulo}>No encontramos nada con esos filtros</div>
                <p className={e.vacioTexto}>
                  Prueba con otra categoría, o cuéntanos qué necesitas y lo cotizamos.
                </p>
                <Link href="/cotizar" className="boton-oro">
                  Solicitar cotización
                </Link>
              </div>
            ) : (
              <div className={e.rejilla}>
                {resultado.productos.map((p) => (
                  <TarjetaProducto key={p.id} producto={p} variante="oscura" />
                ))}
              </div>
            )}

            {resultado.paginas > 1 && (
              <nav className={e.paginacion} aria-label="Paginación del catálogo">
                {Array.from({ length: resultado.paginas }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={construirEnlace(parametros, { pagina: String(n) })}
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
