import 'server-only'

import { crearClienteServidor } from '@/lib/supabase/server'
import {
  AJUSTES_DEMO,
  CATEGORIAS_DEMO,
  CONTENIDO_DEMO,
  FAQ_DEMO,
  PRODUCTOS_DEMO,
  type CategoriaVista,
  type FaqVista,
  type ProductoVista,
} from '@/lib/demo'
import type { TipoProducto } from '@/lib/database.types'

/**
 * Capa de lectura del sitio público.
 *
 * Todas las funciones siguen el mismo patrón: si no hay Supabase configurado, o
 * si la consulta falla, devuelven los datos de demostración en lugar de romper
 * la página. Así el sitio se puede desarrollar y desplegar antes de que exista
 * la base de datos, y conectarla después es solo poner las variables de entorno.
 *
 * El fallback se avisa siempre por consola del servidor: si ves esos mensajes
 * en producción, es que la web está mostrando datos inventados.
 */

export function hayBaseDeDatos(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function avisar(que: string, detalle?: unknown) {
  if (detalle) {
    console.error(`[nyx] ${que} — se usan datos de demostración.`, detalle)
  } else {
    console.warn(`[nyx] ${que} — se usan datos de demostración.`)
  }
}

/** Las rutas del seed vienen sin barra inicial; en Next viven bajo /assets. */
function rutaImagen(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
    return url
  }
  return `/${url}`
}

// ---------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------

export async function obtenerCategorias(): Promise<CategoriaVista[]> {
  if (!hayBaseDeDatos()) {
    avisar('Supabase sin configurar')
    return CATEGORIAS_DEMO
  }

  try {
    const supabase = await crearClienteServidor()
    const { data, error } = await supabase
      .from('categorias')
      .select('slug, nombre_es, imagen_portada, productos(count)')
      .eq('visible', true)
      .order('orden')

    if (error) throw error
    if (!data?.length) {
      avisar('No hay categorías en la base')
      return CATEGORIAS_DEMO
    }

    type FilaCategoria = {
      slug: string
      nombre_es: string
      imagen_portada: string | null
      // El embed de conteo llega como [{ count: n }].
      productos: { count: number }[] | null
    }

    return (data as unknown as FilaCategoria[]).map((c) => ({
      slug: c.slug,
      nombre: c.nombre_es,
      imagen: rutaImagen(c.imagen_portada),
      cuenta: c.productos?.[0]?.count ?? 0,
    }))
  } catch (error) {
    avisar('Error al leer categorías', error)
    return CATEGORIAS_DEMO
  }
}

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

/** Columnas y relaciones que necesita ProductoVista. */
const SELECT_PRODUCTO = `
  id, sku, slug, nombre_es, descripcion_es, precio_referencia, tipo,
  stock, bajo_pedido,
  categorias ( slug, nombre_es ),
  producto_fotos ( url, orden, es_portada )
`

type FilaProducto = {
  id: string
  sku: string
  slug: string
  nombre_es: string
  descripcion_es: string | null
  precio_referencia: number | null
  tipo: TipoProducto
  stock: number | null
  bajo_pedido: boolean
  categorias: { slug: string; nombre_es: string } | null
  producto_fotos: { url: string; orden: number; es_portada: boolean }[]
}

function aProductoVista(fila: FilaProducto): ProductoVista {
  const fotos = [...(fila.producto_fotos ?? [])]
    .sort((a, b) => Number(b.es_portada) - Number(a.es_portada) || a.orden - b.orden)
    .map((f) => rutaImagen(f.url))
    .filter((u): u is string => Boolean(u))

  return {
    id: fila.id,
    sku: fila.sku,
    slug: fila.slug,
    nombre: fila.nombre_es,
    categoria: fila.categorias?.nombre_es ?? 'Sin categoría',
    categoriaSlug: fila.categorias?.slug ?? '',
    descripcion: fila.descripcion_es,
    precio: fila.precio_referencia,
    tipo: fila.tipo,
    stock: fila.stock,
    bajoPedido: fila.bajo_pedido,
    imagen: fotos[0] ?? null,
    fotos,
  }
}

export async function obtenerDestacados(limite = 6): Promise<ProductoVista[]> {
  if (!hayBaseDeDatos()) return PRODUCTOS_DEMO.slice(0, limite)

  try {
    const supabase = await crearClienteServidor()
    const { data, error } = await supabase
      .from('productos')
      .select(SELECT_PRODUCTO)
      .eq('visible', true)
      .order('orden')
      .limit(limite)

    if (error) throw error
    if (!data?.length) return PRODUCTOS_DEMO.slice(0, limite)

    return (data as unknown as FilaProducto[]).map(aProductoVista)
  } catch (error) {
    avisar('Error al leer productos destacados', error)
    return PRODUCTOS_DEMO.slice(0, limite)
  }
}

export async function obtenerDisponiblesHoy(limite = 6): Promise<ProductoVista[]> {
  const deDemo = PRODUCTOS_DEMO.filter((p) => p.tipo === 'entrega_inmediata').slice(0, limite)

  if (!hayBaseDeDatos()) return deDemo

  try {
    const supabase = await crearClienteServidor()
    const { data, error } = await supabase
      .from('productos')
      .select(SELECT_PRODUCTO)
      .eq('visible', true)
      .eq('tipo', 'entrega_inmediata')
      .gt('stock', 0)
      .order('orden')
      .limit(limite)

    if (error) throw error
    if (!data?.length) return deDemo

    return (data as unknown as FilaProducto[]).map(aProductoVista)
  } catch (error) {
    avisar('Error al leer productos de entrega inmediata', error)
    return deDemo
  }
}

export interface FiltrosCatalogo {
  categoria?: string
  tipo?: TipoProducto | 'todos'
  busqueda?: string
  pagina?: number
  porPagina?: number
}

export interface ResultadoCatalogo {
  productos: ProductoVista[]
  total: number
  pagina: number
  paginas: number
}

export async function obtenerCatalogo(
  filtros: FiltrosCatalogo = {}
): Promise<ResultadoCatalogo> {
  const porPagina = filtros.porPagina ?? 24
  const pagina = Math.max(1, filtros.pagina ?? 1)

  const filtrarEnMemoria = (lista: ProductoVista[]) => {
    let salida = lista
    if (filtros.categoria) salida = salida.filter((p) => p.categoriaSlug === filtros.categoria)
    if (filtros.tipo && filtros.tipo !== 'todos') {
      salida = salida.filter((p) => p.tipo === filtros.tipo)
    }
    if (filtros.busqueda) {
      const q = filtros.busqueda.toLowerCase()
      salida = salida.filter(
        (p) => p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      )
    }
    const desde = (pagina - 1) * porPagina
    return {
      productos: salida.slice(desde, desde + porPagina),
      total: salida.length,
      pagina,
      paginas: Math.max(1, Math.ceil(salida.length / porPagina)),
    }
  }

  if (!hayBaseDeDatos()) return filtrarEnMemoria(PRODUCTOS_DEMO)

  try {
    const supabase = await crearClienteServidor()
    let consulta = supabase
      .from('productos')
      .select(SELECT_PRODUCTO, { count: 'exact' })
      .eq('visible', true)

    if (filtros.tipo && filtros.tipo !== 'todos') consulta = consulta.eq('tipo', filtros.tipo)
    if (filtros.busqueda) {
      const q = filtros.busqueda.replace(/[%,()]/g, ' ').trim()
      if (q) consulta = consulta.or(`nombre_es.ilike.%${q}%,sku.ilike.%${q}%`)
    }
    if (filtros.categoria) {
      const { data: cat } = await supabase
        .from('categorias')
        .select('id')
        .eq('slug', filtros.categoria)
        .maybeSingle()
      // Categoría inexistente: catálogo vacío, no catálogo completo.
      consulta = consulta.eq('categoria_id', cat?.id ?? '00000000-0000-0000-0000-000000000000')
    }

    const desde = (pagina - 1) * porPagina
    const { data, error, count } = await consulta
      .order('orden')
      .range(desde, desde + porPagina - 1)

    if (error) throw error

    const total = count ?? 0
    return {
      productos: (data as unknown as FilaProducto[]).map(aProductoVista),
      total,
      pagina,
      paginas: Math.max(1, Math.ceil(total / porPagina)),
    }
  } catch (error) {
    avisar('Error al leer el catálogo', error)
    return filtrarEnMemoria(PRODUCTOS_DEMO)
  }
}

export async function obtenerProducto(slug: string): Promise<ProductoVista | null> {
  const deDemo = PRODUCTOS_DEMO.find((p) => p.slug === slug) ?? null

  if (!hayBaseDeDatos()) return deDemo

  try {
    const supabase = await crearClienteServidor()
    const { data, error } = await supabase
      .from('productos')
      .select(SELECT_PRODUCTO)
      .eq('slug', slug)
      .eq('visible', true)
      .maybeSingle()

    if (error) throw error
    if (!data) return deDemo

    return aProductoVista(data as unknown as FilaProducto)
  } catch (error) {
    avisar(`Error al leer el producto "${slug}"`, error)
    return deDemo
  }
}

/** Para generateStaticParams y el mapa del sitio. */
export async function obtenerSlugsDeProductos(): Promise<string[]> {
  if (!hayBaseDeDatos()) return PRODUCTOS_DEMO.map((p) => p.slug)

  try {
    const supabase = await crearClienteServidor()
    const { data, error } = await supabase.from('productos').select('slug').eq('visible', true)
    if (error) throw error
    return data?.map((p) => p.slug) ?? []
  } catch {
    return PRODUCTOS_DEMO.map((p) => p.slug)
  }
}

// ---------------------------------------------------------------------------
// Preguntas frecuentes
// ---------------------------------------------------------------------------

export async function obtenerFaq(): Promise<FaqVista[]> {
  if (!hayBaseDeDatos()) return FAQ_DEMO

  try {
    const supabase = await crearClienteServidor()
    const { data, error } = await supabase
      .from('faq')
      .select('pregunta_es, respuesta_es')
      .eq('visible', true)
      .order('orden')

    if (error) throw error
    if (!data?.length) return FAQ_DEMO

    return data.map((f) => ({ pregunta: f.pregunta_es, respuesta: f.respuesta_es }))
  } catch (error) {
    avisar('Error al leer las preguntas frecuentes', error)
    return FAQ_DEMO
  }
}

// ---------------------------------------------------------------------------
// Contenido editable
// ---------------------------------------------------------------------------

export type Contenido = Record<string, Record<string, string>>

/**
 * Devuelve los textos indexados por bloque y campo, con respaldo campo a campo:
 * si la base tiene el bloque pero le falta un campo, se usa el de demostración
 * en lugar de dejar un hueco en la página.
 */
export async function obtenerContenido(): Promise<Contenido> {
  if (!hayBaseDeDatos()) return CONTENIDO_DEMO

  try {
    const supabase = await crearClienteServidor()
    const { data, error } = await supabase
      .from('contenido_bloques')
      .select('clave, contenido_campos ( clave, valor_es )')
      .order('orden')

    if (error) throw error
    if (!data?.length) return CONTENIDO_DEMO

    const salida: Contenido = {}
    for (const bloque of data) {
      const campos: Record<string, string> = { ...(CONTENIDO_DEMO[bloque.clave] ?? {}) }
      const lista = bloque.contenido_campos as unknown as
        | { clave: string; valor_es: string | null }[]
        | null
      for (const campo of lista ?? []) {
        if (campo.valor_es) campos[campo.clave] = campo.valor_es
      }
      salida[bloque.clave] = campos
    }

    // Bloques que aún no existan en la base siguen saliendo de la demo.
    return { ...CONTENIDO_DEMO, ...salida }
  } catch (error) {
    avisar('Error al leer el contenido del sitio', error)
    return CONTENIDO_DEMO
  }
}

// ---------------------------------------------------------------------------
// Ajustes públicos
// ---------------------------------------------------------------------------

export interface Contacto {
  email: string
  telefono: string
  whatsapp: string
  ciudad: string
  horario: string
}

export async function obtenerContacto(): Promise<Contacto> {
  if (!hayBaseDeDatos()) return AJUSTES_DEMO.contacto

  try {
    const supabase = await crearClienteServidor()
    const { data, error } = await supabase
      .from('ajustes')
      .select('valor')
      .eq('clave', 'contacto')
      .maybeSingle()

    if (error) throw error
    if (!data?.valor) return AJUSTES_DEMO.contacto

    return { ...AJUSTES_DEMO.contacto, ...(data.valor as Partial<Contacto>) }
  } catch (error) {
    avisar('Error al leer los datos de contacto', error)
    return AJUSTES_DEMO.contacto
  }
}

/** Número de WhatsApp en el formato que espera wa.me (solo dígitos). */
export function enlaceWhatsapp(numero: string, mensaje?: string): string {
  const digitos = numero.replace(/\D/g, '')
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''
  return `https://wa.me/${digitos}${texto}`
}
