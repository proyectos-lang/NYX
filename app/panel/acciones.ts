'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { crearClienteServidor } from '@/lib/supabase/server'
import { slug as aSlug } from '@/lib/formato'
import type { EstadoPedido, TipoProducto } from '@/lib/database.types'

/**
 * Mutaciones del panel.
 *
 * Ninguna comprueba permisos por su cuenta: todas escriben con la sesión del
 * usuario, así que la política RLS "el staff gestiona" es la que decide. Si
 * alguien llegara aquí sin ser staff, la escritura falla en la base de datos y
 * no en una comprobación de este archivo que se pueda olvidar.
 *
 * Todas terminan redirigiendo con ?aviso= o ?error= en vez de devolver un
 * valor. Los <form> del panel son formularios normales, sin JavaScript: así el
 * panel sigue funcionando aunque el JS no cargue, y el mensaje se ve igual.
 *
 * Tras cada cambio se revalida el panel y también el sitio público, porque
 * catálogo, contenido y FAQ se sirven con revalidate de 5 minutos y de otro
 * modo el cambio tardaría en verse.
 */

const ESTADOS: EstadoPedido[] = [
  'nuevo',
  'en_revision',
  'en_produccion',
  'entregado',
  'cancelado',
]

const TIPOS: TipoProducto[] = ['personalizable', 'entrega_inmediata']

function texto(datos: FormData, campo: string): string {
  const valor = datos.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

function numero(datos: FormData, campo: string): number | null {
  const crudo = texto(datos, campo)
  if (!crudo) return null
  const valor = Number(crudo.replace(',', '.'))
  return Number.isFinite(valor) ? valor : null
}

function entero(datos: FormData, campo: string): number | null {
  const valor = numero(datos, campo)
  return valor === null ? null : Math.trunc(valor)
}

function conAviso(ruta: string, aviso: string): string {
  const separador = ruta.includes('?') ? '&' : '?'
  return `${ruta}${separador}aviso=${encodeURIComponent(aviso)}`
}

function conError(ruta: string, error: unknown, contexto: string): string {
  console.error(`[nyx] ${contexto}`, error)
  const mensaje = error instanceof Error ? error.message : 'Error desconocido'
  const separador = ruta.includes('?') ? '&' : '?'
  return `${ruta}${separador}error=${encodeURIComponent(mensaje)}`
}

function refrescarPublico() {
  revalidatePath('/')
  revalidatePath('/catalogo')
  revalidatePath('/catalogo/[slug]', 'page')
  revalidatePath('/cotizar')
}

/** Solo rutas internas del panel: un destino externo sería un redirect abierto. */
function volverA(datos: FormData, porDefecto: string): string {
  const destino = texto(datos, 'volver')
  return destino.startsWith('/panel') ? destino : porDefecto
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

export async function cambiarEstadoPedido(datos: FormData): Promise<void> {
  const base = volverA(datos, '/panel/pedidos')
  const id = texto(datos, 'id')
  const estado = texto(datos, 'estado') as EstadoPedido

  if (!id || !ESTADOS.includes(estado)) {
    redirect(conError(base, new Error('Estado no válido.'), 'estado de pedido inválido'))
  }

  let destino: string
  try {
    const supabase = await crearClienteServidor()
    // El historial en pedido_eventos lo escribe un trigger, no hace falta aquí.
    const { error } = await supabase.from('pedidos').update({ estado }).eq('id', id)
    if (error) throw error

    revalidatePath('/panel/pedidos')
    destino = conAviso(base, 'Estado actualizado')
  } catch (error) {
    destino = conError(base, error, 'no se pudo cambiar el estado del pedido')
  }

  redirect(destino)
}

export async function guardarNotasPedido(datos: FormData): Promise<void> {
  const base = volverA(datos, '/panel/pedidos')
  const id = texto(datos, 'id')

  if (!id) redirect(conError(base, new Error('Falta el pedido.'), 'pedido sin id'))

  let destino: string
  try {
    const supabase = await crearClienteServidor()
    const { error } = await supabase
      .from('pedidos')
      .update({
        observaciones: texto(datos, 'observaciones') || null,
        precio_referencia: numero(datos, 'precio_referencia'),
      })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/panel/pedidos')
    destino = conAviso(base, 'Pedido guardado')
  } catch (error) {
    destino = conError(base, error, 'no se pudieron guardar las notas del pedido')
  }

  redirect(destino)
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export async function alternarVisibilidad(datos: FormData): Promise<void> {
  const id = texto(datos, 'id')
  const visible = texto(datos, 'visible') === 'true'

  let destino: string
  try {
    const supabase = await crearClienteServidor()
    const { error } = await supabase.from('productos').update({ visible }).eq('id', id)
    if (error) throw error

    revalidatePath('/panel/catalogo')
    refrescarPublico()
    destino = conAviso('/panel/catalogo', visible ? 'Producto visible' : 'Producto oculto')
  } catch (error) {
    destino = conError('/panel/catalogo', error, 'no se pudo cambiar la visibilidad')
  }

  redirect(destino)
}

export async function guardarProducto(datos: FormData): Promise<void> {
  const base = '/panel/catalogo'
  const id = texto(datos, 'id')
  const nombre = texto(datos, 'nombre')
  const tipo = texto(datos, 'tipo') as TipoProducto

  if (!nombre) {
    redirect(conError(base, new Error('El nombre es obligatorio.'), 'producto sin nombre'))
  }
  if (!TIPOS.includes(tipo)) {
    redirect(conError(base, new Error('Tipo de producto no válido.'), 'tipo inválido'))
  }

  const campos = {
    nombre_es: nombre,
    categoria_id: texto(datos, 'categoria_id') || null,
    precio_referencia: numero(datos, 'precio'),
    tipo,
    stock: entero(datos, 'stock'),
    bajo_pedido: texto(datos, 'bajo_pedido') === 'on',
    descripcion_es: texto(datos, 'descripcion') || null,
  }

  let destino: string
  try {
    const supabase = await crearClienteServidor()

    if (id) {
      const { error } = await supabase.from('productos').update(campos).eq('id', id)
      if (error) throw error
    } else {
      const sku = texto(datos, 'sku') || `NYX-${Date.now().toString().slice(-6)}`
      const { error } = await supabase.from('productos').insert({
        ...campos,
        sku,
        slug: aSlug(nombre) || aSlug(sku),
        visible: true,
      })
      if (error) throw error
    }

    revalidatePath(base)
    refrescarPublico()
    destino = conAviso(base, id ? 'Producto actualizado' : 'Producto creado')
  } catch (error) {
    destino = conError(base, error, 'no se pudo guardar el producto')
  }

  redirect(destino)
}

export async function eliminarProducto(datos: FormData): Promise<void> {
  const base = '/panel/catalogo'
  const id = texto(datos, 'id')

  if (!id) redirect(conError(base, new Error('Falta el producto.'), 'producto sin id'))

  let destino: string
  try {
    const supabase = await crearClienteServidor()
    const { error } = await supabase.from('productos').delete().eq('id', id)
    if (error) throw error

    revalidatePath(base)
    refrescarPublico()
    destino = conAviso(base, 'Producto eliminado')
  } catch (error) {
    destino = conError(base, error, 'no se pudo eliminar el producto')
  }

  redirect(destino)
}

// ---------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------

export async function guardarCategoria(datos: FormData): Promise<void> {
  const base = '/panel/categorias'
  const id = texto(datos, 'id')
  const nombreEs = texto(datos, 'nombre_es')

  if (!nombreEs) {
    redirect(conError(base, new Error('El nombre en español es obligatorio.'), 'categoría sin nombre'))
  }

  const campos = {
    nombre_es: nombreEs,
    nombre_en: texto(datos, 'nombre_en') || null,
    imagen_portada: texto(datos, 'imagen') || null,
    orden: entero(datos, 'orden') ?? 0,
    visible: texto(datos, 'visible') !== 'false',
  }

  let destino: string
  try {
    const supabase = await crearClienteServidor()

    if (id) {
      const { error } = await supabase.from('categorias').update(campos).eq('id', id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('categorias')
        .insert({ ...campos, slug: aSlug(nombreEs) })
      if (error) throw error
    }

    revalidatePath(base)
    refrescarPublico()
    destino = conAviso(base, id ? 'Categoría actualizada' : 'Categoría creada')
  } catch (error) {
    destino = conError(base, error, 'no se pudo guardar la categoría')
  }

  redirect(destino)
}

export async function eliminarCategoria(datos: FormData): Promise<void> {
  const base = '/panel/categorias'
  const id = texto(datos, 'id')

  if (!id) redirect(conError(base, new Error('Falta la categoría.'), 'categoría sin id'))

  let destino: string
  try {
    const supabase = await crearClienteServidor()
    // Los productos no se borran: la FK los deja con categoria_id en null.
    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (error) throw error

    revalidatePath(base)
    refrescarPublico()
    destino = conAviso(base, 'Categoría eliminada')
  } catch (error) {
    destino = conError(base, error, 'no se pudo eliminar la categoría')
  }

  redirect(destino)
}

// ---------------------------------------------------------------------------
// Preguntas frecuentes
// ---------------------------------------------------------------------------

export async function guardarPregunta(datos: FormData): Promise<void> {
  const base = '/panel/preguntas'
  const id = texto(datos, 'id')
  const preguntaEs = texto(datos, 'pregunta_es')
  const respuestaEs = texto(datos, 'respuesta_es')

  if (!preguntaEs || !respuestaEs) {
    redirect(
      conError(
        base,
        new Error('La pregunta y la respuesta en español son obligatorias.'),
        'faq incompleta'
      )
    )
  }

  const campos = {
    pregunta_es: preguntaEs,
    respuesta_es: respuestaEs,
    pregunta_en: texto(datos, 'pregunta_en') || null,
    respuesta_en: texto(datos, 'respuesta_en') || null,
    orden: entero(datos, 'orden') ?? 0,
    visible: texto(datos, 'visible') !== 'false',
  }

  let destino: string
  try {
    const supabase = await crearClienteServidor()

    if (id) {
      const { error } = await supabase.from('faq').update(campos).eq('id', id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('faq').insert(campos)
      if (error) throw error
    }

    revalidatePath(base)
    refrescarPublico()
    destino = conAviso(base, id ? 'Pregunta actualizada' : 'Pregunta añadida')
  } catch (error) {
    destino = conError(base, error, 'no se pudo guardar la pregunta')
  }

  redirect(destino)
}

export async function eliminarPregunta(datos: FormData): Promise<void> {
  const base = '/panel/preguntas'
  const id = texto(datos, 'id')

  if (!id) redirect(conError(base, new Error('Falta la pregunta.'), 'faq sin id'))

  let destino: string
  try {
    const supabase = await crearClienteServidor()
    const { error } = await supabase.from('faq').delete().eq('id', id)
    if (error) throw error

    revalidatePath(base)
    refrescarPublico()
    destino = conAviso(base, 'Pregunta eliminada')
  } catch (error) {
    destino = conError(base, error, 'no se pudo eliminar la pregunta')
  }

  redirect(destino)
}

// ---------------------------------------------------------------------------
// Contenido del sitio
// ---------------------------------------------------------------------------

export async function guardarBloque(datos: FormData): Promise<void> {
  const base = '/panel/contenido'

  // Los campos llegan como campo_<id>_es y campo_<id>_en: así un bloque entero
  // se guarda de una vez, que es como lo edita la persona.
  const cambios = new Map<string, { valor_es?: string | null; valor_en?: string | null }>()

  for (const [clave, valor] of datos.entries()) {
    const coincidencia = /^campo_(.+)_(es|en)$/.exec(clave)
    if (!coincidencia || typeof valor !== 'string') continue

    const [, id, idioma] = coincidencia
    const actual = cambios.get(id) ?? {}
    actual[idioma === 'es' ? 'valor_es' : 'valor_en'] = valor.trim() || null
    cambios.set(id, actual)
  }

  if (cambios.size === 0) redirect(base)

  let destino: string
  try {
    const supabase = await crearClienteServidor()

    for (const [id, campos] of cambios) {
      const { error } = await supabase.from('contenido_campos').update(campos).eq('id', id)
      if (error) throw error
    }

    revalidatePath(base)
    refrescarPublico()
    destino = conAviso(base, 'Contenido publicado')
  } catch (error) {
    destino = conError(base, error, 'no se pudo guardar el bloque de contenido')
  }

  redirect(destino)
}

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------

export async function guardarContacto(datos: FormData): Promise<void> {
  const base = '/panel/ajustes'
  const valor = {
    email: texto(datos, 'email'),
    telefono: texto(datos, 'telefono'),
    whatsapp: texto(datos, 'whatsapp'),
    ciudad: texto(datos, 'ciudad'),
    horario: texto(datos, 'horario'),
  }

  let destino: string
  try {
    const supabase = await crearClienteServidor()
    const { error } = await supabase
      .from('ajustes')
      .upsert({ clave: 'contacto', valor, publico: true }, { onConflict: 'clave' })

    if (error) throw error

    revalidatePath(base)
    refrescarPublico()
    destino = conAviso(base, 'Contacto guardado')
  } catch (error) {
    destino = conError(base, error, 'no se pudieron guardar los datos de contacto')
  }

  redirect(destino)
}

export async function guardarNotificaciones(datos: FormData): Promise<void> {
  const base = '/panel/ajustes'
  const destinatarios = texto(datos, 'destinatarios')
    .split(/[,\n;]/)
    .map((d) => d.trim())
    .filter((d) => d.includes('@'))

  const valor = {
    destinatarios,
    avisar_pedido_nuevo: texto(datos, 'avisar_pedido_nuevo') === 'on',
    avisar_resumen_diario: texto(datos, 'avisar_resumen_diario') === 'on',
    avisar_stock_bajo: texto(datos, 'avisar_stock_bajo') === 'on',
  }

  let destino: string
  try {
    const supabase = await crearClienteServidor()
    const { error } = await supabase
      .from('ajustes')
      // publico: false — esta lista de correos no debe salir en la web.
      .upsert({ clave: 'notificaciones', valor, publico: false }, { onConflict: 'clave' })

    if (error) throw error

    revalidatePath(base)
    destino = conAviso(base, 'Notificaciones guardadas')
  } catch (error) {
    destino = conError(base, error, 'no se pudieron guardar las notificaciones')
  }

  redirect(destino)
}

// ---------------------------------------------------------------------------
// Modelos 3D
//
// El archivo lo sube el navegador directo al bucket `modelos`, y ahi mismo lo
// analiza para medir mapeo, escala y centro. Aqui solo llega el resultado: son
// numeros, no el .glb, que puede pesar decenas de megas.
//
// Medir una vez al subir y guardarlo es a proposito. Hacerlo en cada carga del
// visor obliga a esperar a que la malla este lista y repite trabajo; y, sobre
// todo, asi el usuario sabe EN EL MOMENTO si su archivo sirve, en vez de
// descubrirlo cuando ve la prenda tenida de un color plano.
// ---------------------------------------------------------------------------

export async function guardarModelo3D(datos: FormData): Promise<void> {
  const base = '/panel/modelos'

  const nombre = texto(datos, 'nombre')
  const archivoUrl = texto(datos, 'archivo_url')
  const mapeo = texto(datos, 'mapeo')

  if (!nombre || !archivoUrl) {
    redirect(conError(base, new Error('Falta el nombre o el archivo.'), 'modelo incompleto'))
  }
  if (mapeo !== 'original' && mapeo !== 'proyeccion') {
    redirect(conError(base, new Error('Mapeo no valido.'), 'mapeo invalido'))
  }

  const escala = numero(datos, 'escala')
  if (!escala || escala <= 0) {
    redirect(conError(base, new Error('La escala medida no es valida.'), 'escala invalida'))
  }

  const excluidos = texto(datos, 'materiales_excluidos')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)

  let destino: string
  try {
    const supabase = await crearClienteServidor()
    const { error } = await supabase.from('modelos_3d').insert({
      nombre,
      slug: aSlug(nombre) || `modelo-${Date.now().toString().slice(-6)}`,
      archivo_url: archivoUrl,
      mapeo,
      escala,
      centro_x: numero(datos, 'centro_x') ?? 0,
      centro_y: numero(datos, 'centro_y') ?? 0,
      centro_z: numero(datos, 'centro_z') ?? 0,
      materiales_excluidos: excluidos,
      uv_proporcion_dentro: numero(datos, 'uv_proporcion'),
      uv_vertices: entero(datos, 'uv_vertices'),
      visible: true,
    })

    if (error) throw error

    revalidatePath(base)
    revalidatePath('/estudio')
    destino = conAviso(base, `Modelo "${nombre}" anadido`)
  } catch (error) {
    destino = conError(base, error, 'no se pudo guardar el modelo 3D')
  }

  redirect(destino)
}

export async function alternarVisibilidadModelo(datos: FormData): Promise<void> {
  const base = '/panel/modelos'
  const id = texto(datos, 'id')
  const visible = texto(datos, 'visible') === 'true'

  let destino: string
  try {
    const supabase = await crearClienteServidor()
    const { error } = await supabase.from('modelos_3d').update({ visible }).eq('id', id)
    if (error) throw error

    revalidatePath(base)
    revalidatePath('/estudio')
    destino = conAviso(base, visible ? 'Modelo visible' : 'Modelo oculto')
  } catch (error) {
    destino = conError(base, error, 'no se pudo cambiar la visibilidad del modelo')
  }

  redirect(destino)
}

export async function eliminarModelo3D(datos: FormData): Promise<void> {
  const base = '/panel/modelos'
  const id = texto(datos, 'id')

  if (!id) redirect(conError(base, new Error('Falta el modelo.'), 'modelo sin id'))

  let destino: string
  try {
    const supabase = await crearClienteServidor()

    // El archivo del bucket no se borra aqui: un diseno ya guardado puede
    // seguir apuntando a el, y dejar huerfano un .glb cuesta menos que romper
    // un pedido. Se limpian aparte.
    const { error } = await supabase.from('modelos_3d').delete().eq('id', id)
    if (error) throw error

    revalidatePath(base)
    revalidatePath('/estudio')
    destino = conAviso(base, 'Modelo eliminado')
  } catch (error) {
    destino = conError(base, error, 'no se pudo eliminar el modelo')
  }

  redirect(destino)
}
