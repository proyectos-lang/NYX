/**
 * Reglas del carrito, sin React.
 *
 * Están aquí y no dentro del componente para poder comprobarlas sin navegador
 * (ver scripts/verificar-carrito.mts). Lo delicado del carrito no es pintarlo:
 * es que el stock no se pueda desbordar, que el total no mienta y que lo
 * guardado en el navegador no reviente la página cuando venga estropeado.
 */

export interface LineaCarrito {
  productoId: string
  slug: string
  nombre: string
  precio: number | null
  imagen: string | null
  cantidad: number
  /** El stock que había al añadirlo; sirve para no dejar pedir de más. */
  stock: number | null
}

/** Nunca más de lo que hay en stock, y nunca menos de cero. */
export function acotarAlStock(cantidad: number, stock: number | null): number {
  const minimo = Math.max(0, Math.trunc(cantidad) || 0)
  if (stock === null) return minimo
  return Math.min(minimo, Math.max(0, stock))
}

/**
 * Suma de unidades: lo que muestra la insignia de la cabecera.
 *
 * Unidades y no líneas, porque "3" con tres camisetas iguales dentro es lo que
 * la gente espera ver.
 */
export function contarUnidades(lineas: LineaCarrito[]): number {
  return lineas.reduce((suma, l) => suma + l.cantidad, 0)
}

/**
 * Total del carrito, o null si no se puede saber.
 *
 * Si una sola línea no tiene precio, no hay total. Enseñar una suma incompleta
 * como si fuera el importe final es prometer algo que luego cambia, y se
 * descubre justo al pagar.
 */
export function calcularTotal(lineas: LineaCarrito[]): number | null {
  if (lineas.some((l) => l.precio === null)) return null
  return lineas.reduce((suma, l) => suma + (l.precio ?? 0) * l.cantidad, 0)
}

/**
 * Normaliza lo que venía guardado en el navegador.
 *
 * Puede ser de una versión anterior del sitio, o de alguien que lo editó a
 * mano desde las herramientas de desarrollo. Una línea que no se entiende se
 * descarta; el carrito entero no se tira por una línea mala.
 */
export function normalizarLineas(crudo: unknown): LineaCarrito[] {
  if (!Array.isArray(crudo)) return []

  const vistos = new Set<string>()
  const salida: LineaCarrito[] = []

  for (const dato of crudo) {
    if (!dato || typeof dato !== 'object') continue

    const l = dato as Record<string, unknown>
    const productoId = typeof l.productoId === 'string' ? l.productoId : ''
    if (!productoId) continue

    // Un id repetido significa carrito corrupto: se queda la primera línea,
    // porque dos líneas del mismo producto descuadran el total y el stock.
    if (vistos.has(productoId)) continue
    vistos.add(productoId)

    const numero = (valor: unknown): number | null =>
      typeof valor === 'number' && Number.isFinite(valor) ? valor : null

    const stock = numero(l.stock)

    // Ojo con `Number(l.cantidad) || 1`: convertiría un 0 explícito en 1, y
    // entonces una línea marcada como vacía volvería al carrito con una
    // unidad. Lo que falta vale 1; lo que dice 0, es 0.
    const cruda = l.cantidad === undefined || l.cantidad === null ? 1 : Number(l.cantidad)
    const cantidad = acotarAlStock(Number.isFinite(cruda) ? cruda : 1, stock)

    // Una línea con cantidad 0 no es una línea: es basura que ocuparía sitio
    // en el carrito sin poder pedirse.
    if (cantidad < 1) continue

    salida.push({
      productoId,
      slug: typeof l.slug === 'string' ? l.slug : '',
      nombre: typeof l.nombre === 'string' && l.nombre.trim() ? l.nombre : 'Producto',
      precio: numero(l.precio),
      imagen: typeof l.imagen === 'string' ? l.imagen : null,
      cantidad,
      stock,
    })
  }

  return salida
}

/**
 * Añade un producto, o suma unidades si ya estaba.
 *
 * Lo segundo es lo que espera cualquiera: pulsar dos veces "añadir" da dos
 * unidades, no dos líneas iguales.
 */
export function anadirLinea(
  lineas: LineaCarrito[],
  nueva: Omit<LineaCarrito, 'cantidad'>,
  cantidad = 1
): LineaCarrito[] {
  const existente = lineas.find((l) => l.productoId === nueva.productoId)

  if (existente) {
    return lineas.map((l) =>
      l.productoId === nueva.productoId
        ? { ...l, cantidad: acotarAlStock(l.cantidad + cantidad, l.stock) }
        : l
    )
  }

  const acotada = acotarAlStock(cantidad, nueva.stock)
  if (acotada < 1) return lineas

  return [...lineas, { ...nueva, cantidad: acotada }]
}

/** Cambia la cantidad. Bajar a cero quita la línea, que es lo natural. */
export function cambiarCantidadLinea(
  lineas: LineaCarrito[],
  productoId: string,
  cantidad: number
): LineaCarrito[] {
  return lineas
    .map((l) =>
      l.productoId === productoId ? { ...l, cantidad: acotarAlStock(cantidad, l.stock) } : l
    )
    .filter((l) => l.cantidad > 0)
}

/** Las líneas tal como las espera crear_solicitud(). */
export function aItemsDeSolicitud(
  lineas: LineaCarrito[]
): { producto_id: string; nombre: string; cantidad: number }[] {
  return lineas.map((l) => ({
    producto_id: l.productoId,
    nombre: l.nombre,
    cantidad: l.cantidad,
  }))
}
