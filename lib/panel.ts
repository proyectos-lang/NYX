import 'server-only'

import { crearClienteServidor } from '@/lib/supabase/server'
import type {
  Ajuste,
  EstadoPedido,
  MetodoEntrega,
  Perfil,
  TipoProducto,
} from '@/lib/database.types'

/**
 * Lecturas del panel.
 *
 * A diferencia de lib/consultas.ts, aquí NO hay datos de demostración de
 * respaldo: el panel muestra el estado real del negocio y enseñar pedidos
 * inventados sería peor que enseñar un error. Cuando algo falla, la función
 * lo propaga y la pantalla lo cuenta.
 *
 * Todas las consultas pasan por RLS con la sesión del usuario, así que un
 * usuario sin fila en `perfiles` no ve nada aunque llegue hasta aquí.
 */

export class SinConexion extends Error {
  constructor(causa?: unknown) {
    super('No se pudo consultar la base de datos.')
    this.name = 'SinConexion'
    this.cause = causa
  }
}

function comprobarConfiguracion() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new SinConexion('Faltan las variables de entorno de Supabase.')
  }
}

// ---------------------------------------------------------------------------
// Perfil de quien está usando el panel
// ---------------------------------------------------------------------------

export async function obtenerPerfil(): Promise<Perfil | null> {
  comprobarConfiguracion()
  const supabase = await crearClienteServidor()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('perfiles')
    .select('id, nombre, rol, creado_en, actualizado_en')
    .eq('id', user.id)
    .maybeSingle()

  return (data as Perfil | null) ?? null
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

export interface PedidoPanel {
  id: string
  ref: string
  estado: EstadoPedido
  metodoEntrega: MetodoEntrega | null
  fechaRequerida: string | null
  precioReferencia: number | null
  observaciones: string | null
  creadoEn: string
  cliente: { nombre: string; email: string | null; telefono: string | null; empresa: string | null } | null
  items: {
    id: string
    nombre: string
    cantidad: number
    especificaciones: string | null
    precioUnitario: number | null
    foto: string | null
  }[]
  archivos: { id: string; nombre: string; ruta: string; bytes: number | null }[]
  /** Diseno del estudio, si la solicitud salio de ahi. */
  diseno: { token: string; vistaPrevia: string | null } | null
}

const SELECT_PEDIDO = `
  id, ref, estado, metodo_entrega, fecha_requerida, precio_referencia,
  observaciones, creado_en,
  clientes ( nombre, email, telefono, empresa ),
  pedido_items (
    id, nombre_producto, cantidad, especificaciones, precio_unitario,
    productos ( producto_fotos ( url, es_portada, orden ) )
  ),
  pedido_archivos ( id, nombre_archivo, ruta_storage, bytes ),
  disenos ( token, vista_previa )
`

/* eslint-disable @typescript-eslint/no-explicit-any */
function aPedidoPanel(fila: any): PedidoPanel {
  return {
    id: fila.id,
    ref: fila.ref,
    estado: fila.estado,
    metodoEntrega: fila.metodo_entrega,
    fechaRequerida: fila.fecha_requerida,
    precioReferencia: fila.precio_referencia,
    observaciones: fila.observaciones,
    creadoEn: fila.creado_en,
    cliente: fila.clientes ?? null,
    items: (fila.pedido_items ?? []).map((i: any) => {
      const fotos = i.productos?.producto_fotos ?? []
      const portada =
        fotos.find((f: any) => f.es_portada) ??
        [...fotos].sort((a: any, b: any) => a.orden - b.orden)[0]
      const url: string | undefined = portada?.url

      return {
        id: i.id,
        nombre: i.nombre_producto,
        cantidad: i.cantidad,
        especificaciones: i.especificaciones,
        precioUnitario: i.precio_unitario,
        foto: url ? (url.startsWith('/') || url.startsWith('http') ? url : `/${url}`) : null,
      }
    }),
    archivos: (fila.pedido_archivos ?? []).map((a: any) => ({
      id: a.id,
      nombre: a.nombre_archivo,
      ruta: a.ruta_storage,
      bytes: a.bytes,
    })),
    // Un pedido lleva como mucho un diseno, pero el embed llega como lista.
    diseno: fila.disenos?.[0]
      ? { token: fila.disenos[0].token, vistaPrevia: fila.disenos[0].vista_previa ?? null }
      : null,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function obtenerPedidos(estado?: EstadoPedido): Promise<PedidoPanel[]> {
  comprobarConfiguracion()
  const supabase = await crearClienteServidor()

  let consulta = supabase.from('pedidos').select(SELECT_PEDIDO).order('creado_en', {
    ascending: false,
  })

  if (estado) consulta = consulta.eq('estado', estado)

  const { data, error } = await consulta
  if (error) throw new SinConexion(error)

  return (data ?? []).map(aPedidoPanel)
}

export async function contarPorEstado(): Promise<Record<EstadoPedido, number>> {
  comprobarConfiguracion()
  const supabase = await crearClienteServidor()

  const { data, error } = await supabase.from('pedidos').select('estado')
  if (error) throw new SinConexion(error)

  const cuenta: Record<EstadoPedido, number> = {
    nuevo: 0,
    en_revision: 0,
    en_produccion: 0,
    entregado: 0,
    cancelado: 0,
  }

  for (const fila of (data ?? []) as { estado: EstadoPedido }[]) {
    cuenta[fila.estado] = (cuenta[fila.estado] ?? 0) + 1
  }

  return cuenta
}

/**
 * URL temporal para ver un adjunto del bucket privado. Caduca en una hora:
 * no sirve para compartir fuera del panel, que es justo lo que se quiere.
 */
export async function urlFirmadaArchivo(ruta: string): Promise<string | null> {
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.storage.from('pedidos').createSignedUrl(ruta, 3600)

  if (error) {
    console.error('[nyx] no se pudo firmar la URL del archivo', error)
    return null
  }

  return data?.signedUrl ?? null
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export interface ProductoPanel {
  id: string
  sku: string
  slug: string
  nombre: string
  categoriaId: string | null
  categoria: string
  precio: number | null
  tipo: TipoProducto
  stock: number | null
  bajoPedido: boolean
  visible: boolean
  orden: number
  descripcion: string | null
  foto: string | null
}

export async function obtenerProductosPanel(): Promise<ProductoPanel[]> {
  comprobarConfiguracion()
  const supabase = await crearClienteServidor()

  const { data, error } = await supabase
    .from('productos')
    .select(
      `id, sku, slug, nombre_es, categoria_id, precio_referencia, tipo, stock,
       bajo_pedido, visible, orden, descripcion_es,
       categorias ( nombre_es ),
       producto_fotos ( url, es_portada, orden )`
    )
    .order('orden')

  if (error) throw new SinConexion(error)

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).map((p: any) => {
    const fotos = p.producto_fotos ?? []
    const portada =
      fotos.find((f: any) => f.es_portada) ??
      [...fotos].sort((a: any, b: any) => a.orden - b.orden)[0]
    const url: string | undefined = portada?.url

    return {
      id: p.id,
      sku: p.sku,
      slug: p.slug,
      nombre: p.nombre_es,
      categoriaId: p.categoria_id,
      categoria: p.categorias?.nombre_es ?? 'Sin categoría',
      precio: p.precio_referencia,
      tipo: p.tipo,
      stock: p.stock,
      bajoPedido: p.bajo_pedido,
      visible: p.visible,
      orden: p.orden,
      descripcion: p.descripcion_es,
      foto: url ? (url.startsWith('/') || url.startsWith('http') ? url : `/${url}`) : null,
    }
  })
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export interface CategoriaPanel {
  id: string
  slug: string
  nombreEs: string
  nombreEn: string | null
  imagen: string | null
  orden: number
  visible: boolean
  productos: number
}

export async function obtenerCategoriasPanel(): Promise<CategoriaPanel[]> {
  comprobarConfiguracion()
  const supabase = await crearClienteServidor()

  const { data, error } = await supabase
    .from('categorias')
    .select('id, slug, nombre_es, nombre_en, imagen_portada, orden, visible, productos(count)')
    .order('orden')

  if (error) throw new SinConexion(error)

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).map((c: any) => ({
    id: c.id,
    slug: c.slug,
    nombreEs: c.nombre_es,
    nombreEn: c.nombre_en,
    imagen: c.imagen_portada
      ? c.imagen_portada.startsWith('/') || c.imagen_portada.startsWith('http')
        ? c.imagen_portada
        : `/${c.imagen_portada}`
      : null,
    orden: c.orden,
    visible: c.visible,
    productos: c.productos?.[0]?.count ?? 0,
  }))
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

// ---------------------------------------------------------------------------
// Preguntas frecuentes
// ---------------------------------------------------------------------------

export interface FaqPanel {
  id: string
  preguntaEs: string
  respuestaEs: string
  preguntaEn: string | null
  respuestaEn: string | null
  orden: number
  visible: boolean
}

export async function obtenerFaqPanel(): Promise<FaqPanel[]> {
  comprobarConfiguracion()
  const supabase = await crearClienteServidor()

  const { data, error } = await supabase
    .from('faq')
    .select('id, pregunta_es, respuesta_es, pregunta_en, respuesta_en, orden, visible')
    .order('orden')

  if (error) throw new SinConexion(error)

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).map((f: any) => ({
    id: f.id,
    preguntaEs: f.pregunta_es,
    respuestaEs: f.respuesta_es,
    preguntaEn: f.pregunta_en,
    respuestaEn: f.respuesta_en,
    orden: f.orden,
    visible: f.visible,
  }))
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

// ---------------------------------------------------------------------------
// Contenido del sitio
// ---------------------------------------------------------------------------

export interface BloquePanel {
  id: string
  clave: string
  seccion: string
  titulo: string
  nota: string | null
  bloqueado: boolean
  campos: {
    id: string
    clave: string
    etiqueta: string
    valorEs: string | null
    valorEn: string | null
    multilinea: boolean
  }[]
  /** `clave` identifica el hueco del sitio: 'hero-1', 'nosotros-foto'… */
  media: { id: string; clave: string | null; url: string; tipo: string; alt: string | null }[]
}

export async function obtenerBloquesPanel(): Promise<BloquePanel[]> {
  comprobarConfiguracion()
  const supabase = await crearClienteServidor()

  const { data, error } = await supabase
    .from('contenido_bloques')
    .select(
      `id, clave, seccion, titulo, nota, bloqueado, orden,
       contenido_campos ( id, clave, etiqueta, valor_es, valor_en, multilinea, orden ),
       contenido_media ( id, clave, url, tipo, alt, orden )`
    )
    .order('orden')

  if (error) throw new SinConexion(error)

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).map((b: any) => ({
    id: b.id,
    clave: b.clave,
    seccion: b.seccion,
    titulo: b.titulo,
    nota: b.nota,
    bloqueado: b.bloqueado,
    campos: [...(b.contenido_campos ?? [])]
      .sort((x: any, y: any) => x.orden - y.orden)
      .map((c: any) => ({
        id: c.id,
        clave: c.clave,
        etiqueta: c.etiqueta,
        valorEs: c.valor_es,
        valorEn: c.valor_en,
        multilinea: c.multilinea,
      })),
    media: [...(b.contenido_media ?? [])]
      .sort((x: any, y: any) => x.orden - y.orden)
      .map((m: any) => ({
        id: m.id,
        clave: m.clave ?? null,
        url: m.url.startsWith('/') || m.url.startsWith('http') ? m.url : `/${m.url}`,
        tipo: m.tipo,
        alt: m.alt ?? null,
      })),
  }))
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------

export async function obtenerAjustes(): Promise<Ajuste[]> {
  comprobarConfiguracion()
  const supabase = await crearClienteServidor()

  const { data, error } = await supabase
    .from('ajustes')
    .select('clave, valor, descripcion, publico, actualizado_en')
    .order('clave')

  if (error) throw new SinConexion(error)

  return (data ?? []) as Ajuste[]
}

// ---------------------------------------------------------------------------
// Modelos 3D
// ---------------------------------------------------------------------------

export interface ModeloPanel {
  id: string
  nombre: string
  slug: string
  archivoUrl: string
  mapeo: string
  escala: number
  visible: boolean
  materialesExcluidos: string[]
  uvProporcion: number | null
  uvVertices: number | null
  creadoEn: string
}

export async function obtenerModelosPanel(): Promise<ModeloPanel[]> {
  comprobarConfiguracion()
  const supabase = await crearClienteServidor()

  const { data, error } = await supabase
    .from('modelos_3d')
    .select(
      `id, nombre, slug, archivo_url, mapeo, escala, visible,
       materiales_excluidos, uv_proporcion_dentro, uv_vertices, creado_en`
    )
    .order('orden')

  if (error) throw new SinConexion(error)

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).map((m: any) => ({
    id: m.id,
    nombre: m.nombre,
    slug: m.slug,
    archivoUrl: m.archivo_url,
    mapeo: m.mapeo,
    escala: Number(m.escala) || 1,
    visible: m.visible,
    materialesExcluidos: m.materiales_excluidos ?? [],
    uvProporcion: m.uv_proporcion_dentro === null ? null : Number(m.uv_proporcion_dentro),
    uvVertices: m.uv_vertices,
    creadoEn: m.creado_en,
  }))
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
