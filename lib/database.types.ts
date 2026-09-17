/**
 * Tipos de la base de datos, escritos a mano a partir de supabase/migrations.
 *
 * En cuanto haya un proyecto vinculado, este archivo se regenera solo y deja
 * de mantenerse a mano:
 *
 *     npm run db:types
 *
 * Mientras tanto, si cambias una migración, cambia también este archivo.
 *
 * Nota sobre el tipo `Database` del final: los clientes de lib/supabase/ NO lo
 * usan todavía como genérico. El parser de cadenas de `.select()` de
 * supabase-js necesita los metadatos exactos que produce el generador
 * (incluidas las relaciones), y contra un tipo escrito a mano deduce `never`
 * para cada fila, lo que rompe todo el tipado aguas abajo. Por eso las
 * consultas de lib/consultas.ts declaran la forma de cada fila donde la usan.
 *
 * Cuando `npm run db:types` sustituya este archivo por el generado, se puede
 * volver a poner el genérico —createServerClient<Database>(...)— y quitar esas
 * declaraciones locales.
 */

export type EstadoPedido =
  | 'nuevo'
  | 'en_revision'
  | 'en_produccion'
  | 'entregado'
  | 'cancelado'

export type TipoProducto = 'personalizable' | 'entrega_inmediata'

export type MetodoEntrega = 'envio_nacional' | 'retiro_taller' | 'entrega_local'

export type RolUsuario = 'admin' | 'editor'

export type TipoMedia = 'imagen' | 'video'

/** Etiquetas visibles, para no repetir el mapeo por toda la interfaz. */
export const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
  nuevo: 'Nuevo',
  en_revision: 'En revisión',
  en_produccion: 'En producción',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export const ETIQUETA_TIPO: Record<TipoProducto, string> = {
  personalizable: 'Personalizable',
  entrega_inmediata: 'Entrega inmediata',
}

export const ETIQUETA_ENTREGA: Record<MetodoEntrega, string> = {
  envio_nacional: 'Envío nacional',
  retiro_taller: 'Retiro en taller',
  entrega_local: 'Entrega local coordinada',
}

/** Colores de cada estado en el panel, tal como los define la maqueta. */
export const COLOR_ESTADO: Record<EstadoPedido, { fondo: string; texto: string }> = {
  nuevo: { fondo: '#FBF0D6', texto: '#7a5a08' },
  en_revision: { fondo: '#E4ECF7', texto: '#2c4a78' },
  en_produccion: { fondo: '#EDE4F7', texto: '#4a2c78' },
  entregado: { fondo: '#dff3e4', texto: '#0a5c2b' },
  cancelado: { fondo: '#f2e4e4', texto: '#7a2020' },
}

type Marca = string | null

export interface Categoria {
  id: string
  slug: string
  nombre_es: string
  nombre_en: Marca
  descripcion_es: Marca
  descripcion_en: Marca
  imagen_portada: Marca
  orden: number
  visible: boolean
  creado_en: string
  actualizado_en: string
}

export interface Producto {
  id: string
  sku: string
  slug: string
  nombre_es: string
  nombre_en: Marca
  categoria_id: string | null
  descripcion_es: Marca
  descripcion_en: Marca
  precio_referencia: number | null
  moneda: string
  tipo: TipoProducto
  stock: number | null
  bajo_pedido: boolean
  visible: boolean
  orden: number
  creado_en: string
  actualizado_en: string
}

export interface ProductoFoto {
  id: string
  producto_id: string
  url: string
  alt: Marca
  orden: number
  es_portada: boolean
  creado_en: string
}

export interface Cliente {
  id: string
  nombre: string
  email: Marca
  telefono: Marca
  empresa: Marca
  notas: Marca
  creado_en: string
}

export interface Pedido {
  id: string
  ref: string
  cliente_id: string | null
  estado: EstadoPedido
  metodo_entrega: MetodoEntrega | null
  fecha_requerida: string | null
  precio_referencia: number | null
  observaciones: Marca
  origen: string
  creado_en: string
  actualizado_en: string
}

export interface PedidoItem {
  id: string
  pedido_id: string
  producto_id: string | null
  nombre_producto: string
  cantidad: number
  especificaciones: Marca
  precio_unitario: number | null
  creado_en: string
}

export interface PedidoArchivo {
  id: string
  pedido_id: string
  ruta_storage: string
  nombre_archivo: string
  bytes: number | null
  mime: Marca
  creado_en: string
}

export interface PedidoEvento {
  id: string
  pedido_id: string
  estado_anterior: EstadoPedido | null
  estado_nuevo: EstadoPedido
  usuario_id: string | null
  nota: Marca
  creado_en: string
}

export interface ContenidoBloque {
  id: string
  clave: string
  seccion: string
  titulo: string
  nota: Marca
  bloqueado: boolean
  orden: number
  creado_en: string
  actualizado_en: string
}

export interface ContenidoCampo {
  id: string
  bloque_id: string
  clave: string
  etiqueta: string
  valor_es: Marca
  valor_en: Marca
  multilinea: boolean
  orden: number
  actualizado_en: string
}

export interface ContenidoMedia {
  id: string
  bloque_id: string
  url: string
  tipo: TipoMedia
  alt: Marca
  orden: number
  creado_en: string
}

export interface Faq {
  id: string
  pregunta_es: string
  respuesta_es: string
  pregunta_en: Marca
  respuesta_en: Marca
  orden: number
  visible: boolean
  creado_en: string
  actualizado_en: string
}

export interface Ajuste {
  clave: string
  valor: Record<string, unknown>
  descripcion: Marca
  publico: boolean
  actualizado_en: string
}

export interface Perfil {
  id: string
  nombre: Marca
  rol: RolUsuario
  creado_en: string
  actualizado_en: string
}

/** Forma que espera el cliente de Supabase. */
type Tabla<Fila, Requerido extends keyof Fila> = {
  Row: Fila
  Insert: Partial<Fila> & Pick<Fila, Requerido>
  Update: Partial<Fila>
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      perfiles: Tabla<Perfil, 'id'>
      categorias: Tabla<Categoria, 'slug' | 'nombre_es'>
      productos: Tabla<Producto, 'sku' | 'slug' | 'nombre_es'>
      producto_fotos: Tabla<ProductoFoto, 'producto_id' | 'url'>
      clientes: Tabla<Cliente, 'nombre'>
      pedidos: Tabla<Pedido, never>
      pedido_items: Tabla<PedidoItem, 'pedido_id' | 'nombre_producto' | 'cantidad'>
      pedido_archivos: Tabla<PedidoArchivo, 'pedido_id' | 'ruta_storage' | 'nombre_archivo'>
      pedido_eventos: Tabla<PedidoEvento, 'pedido_id' | 'estado_nuevo'>
      contenido_bloques: Tabla<ContenidoBloque, 'clave' | 'seccion' | 'titulo'>
      contenido_campos: Tabla<ContenidoCampo, 'bloque_id' | 'clave' | 'etiqueta'>
      contenido_media: Tabla<ContenidoMedia, 'bloque_id' | 'url'>
      faq: Tabla<Faq, 'pregunta_es' | 'respuesta_es'>
      ajustes: Tabla<Ajuste, 'clave'>
    }
    Views: Record<never, never>
    Functions: {
      crear_solicitud: {
        Args: {
          p_nombre: string
          p_email: string
          p_items: unknown
          p_telefono?: string | null
          p_empresa?: string | null
          p_fecha_requerida?: string | null
          p_metodo_entrega?: MetodoEntrega | null
          p_observaciones?: string | null
        }
        Returns: string
      }
      es_staff: { Args: Record<never, never>; Returns: boolean }
      es_admin: { Args: Record<never, never>; Returns: boolean }
    }
    Enums: {
      estado_pedido: EstadoPedido
      tipo_producto: TipoProducto
      metodo_entrega: MetodoEntrega
      rol_usuario: RolUsuario
      tipo_media: TipoMedia
    }
    CompositeTypes: Record<never, never>
  }
}
