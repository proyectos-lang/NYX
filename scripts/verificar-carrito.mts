/**
 * Comprobaciones del carrito.
 *
 *     npm run verificar:carrito
 *
 * Lo delicado del carrito no es pintarlo. Es que no se pueda pedir más de lo
 * que hay, que el total no mienta y que lo guardado en el navegador no reviente
 * la página cuando venga estropeado. Nada de eso se ve probando a mano: el
 * carrito de prueba siempre tiene datos bien formados.
 */

import {
  acotarAlStock,
  aItemsDeSolicitud,
  anadirLinea,
  calcularTotal,
  cambiarCantidadLinea,
  contarUnidades,
  normalizarLineas,
  type LineaCarrito,
} from '../lib/carrito.ts'

let fallos = 0

function comprobar(descripcion: string, condicion: boolean, detalle = ''): void {
  if (condicion) {
    console.log(`  ok    ${descripcion}`)
  } else {
    fallos++
    console.log(`  FALLA ${descripcion}${detalle ? ` — ${detalle}` : ''}`)
  }
}

function linea(parcial: Partial<LineaCarrito> = {}): Omit<LineaCarrito, 'cantidad'> {
  return {
    productoId: 'p1',
    slug: 'gorra-bordada',
    nombre: 'Gorra bordada',
    precio: 8.4,
    imagen: null,
    stock: 14,
    ...parcial,
  }
}

console.log('')
console.log('Stock')

comprobar('no se puede pedir más de lo que hay', acotarAlStock(50, 14) === 14)
comprobar('una cantidad normal pasa tal cual', acotarAlStock(3, 14) === 3)
comprobar('justo el stock entero vale', acotarAlStock(14, 14) === 14)
comprobar('sin stock declarado no hay tope', acotarAlStock(999, null) === 999)
comprobar('un negativo se convierte en 0', acotarAlStock(-5, 14) === 0)
comprobar('los decimales se truncan', acotarAlStock(2.9, 14) === 2)
comprobar('con stock 0 no se puede pedir nada', acotarAlStock(3, 0) === 0)

console.log('')
console.log('Añadir')

const unaLinea = anadirLinea([], linea())
comprobar('añadir crea la línea', unaLinea.length === 1)
comprobar('con cantidad 1 por defecto', unaLinea[0].cantidad === 1)

// Lo que espera cualquiera al pulsar dos veces el botón.
const dosVeces = anadirLinea(unaLinea, linea())
comprobar('añadir lo mismo suma unidades', dosVeces[0].cantidad === 2)
comprobar('y no crea una segunda línea', dosVeces.length === 1)

const otro = anadirLinea(dosVeces, linea({ productoId: 'p2', nombre: 'Pulsera' }))
comprobar('otro producto sí crea línea nueva', otro.length === 2)

// El caso que de verdad protege el stock: sumar de uno en uno hasta pasarse.
let insistente = anadirLinea([], linea({ stock: 3 }))
for (let i = 0; i < 20; i++) insistente = anadirLinea(insistente, linea({ stock: 3 }))
comprobar(
  'insistir en el botón no supera el stock',
  insistente[0].cantidad === 3,
  `${insistente[0].cantidad}`
)

comprobar(
  'un producto agotado no entra al carrito',
  anadirLinea([], linea({ stock: 0 })).length === 0
)

console.log('')
console.log('Cambiar cantidad y quitar')

const base = anadirLinea([], linea(), 5)
comprobar('se puede subir la cantidad', cambiarCantidadLinea(base, 'p1', 9)[0].cantidad === 9)
comprobar('y bajarla', cambiarCantidadLinea(base, 'p1', 2)[0].cantidad === 2)
comprobar('bajar a cero quita la línea', cambiarCantidadLinea(base, 'p1', 0).length === 0)
comprobar('un negativo también la quita', cambiarCantidadLinea(base, 'p1', -3).length === 0)
comprobar('el tope de stock también se aplica aquí', cambiarCantidadLinea(base, 'p1', 99)[0].cantidad === 14)
comprobar('cambiar un id que no está no rompe nada', cambiarCantidadLinea(base, 'nadie', 3).length === 1)

console.log('')
console.log('Totales')

const carrito = [
  { ...linea(), cantidad: 2 }, // 8.40 x 2 = 16.80
  { ...linea({ productoId: 'p2', precio: 1.4, stock: 180 }), cantidad: 10 }, // 14.00
]

comprobar('las unidades suman, no las líneas', contarUnidades(carrito) === 12)
comprobar('el total multiplica por cantidad', Math.abs((calcularTotal(carrito) ?? 0) - 30.8) < 0.001,
  String(calcularTotal(carrito)))
comprobar('un carrito vacío vale 0', calcularTotal([]) === 0)

// La razón de que el total pueda ser null: un precio que falta no es un cero.
const conPrecioAusente = [...carrito, { ...linea({ productoId: 'p3', precio: null }), cantidad: 1 }]
comprobar(
  'si falta un precio no se inventa un total',
  calcularTotal(conPrecioAusente) === null
)

console.log('')
console.log('Lo guardado en el navegador')

comprobar('null no rompe nada', normalizarLineas(null).length === 0)
comprobar('una cadena tampoco', normalizarLineas('basura').length === 0)
comprobar('un objeto tampoco', normalizarLineas({ a: 1 }).length === 0)

const sucio = normalizarLineas([
  { productoId: 'p1', nombre: 'Gorra', precio: 8.4, cantidad: 2, stock: 14 },
  null,
  'basura',
  { nombre: 'Sin id' }, // sin productoId no se puede pedir
  { productoId: 'p2', cantidad: 0, stock: 5 }, // cantidad 0 no es una línea
  { productoId: 'p3', cantidad: 500, stock: 4 }, // editado a mano para pedir de más
  { productoId: 'p1', cantidad: 9, stock: 14 }, // id repetido
])

comprobar('se descartan las líneas inservibles', sucio.length === 2, `${sucio.length}`)
comprobar('sobrevive la buena', sucio[0].productoId === 'p1' && sucio[0].cantidad === 2)
comprobar('un id repetido no se duplica', sucio.filter((l) => l.productoId === 'p1').length === 1)

// El que de verdad importa: alguien edita localStorage para pedir 500 de algo
// de lo que hay 4. El tope se aplica al leer, no solo al pulsar el botón.
const forzado = sucio.find((l) => l.productoId === 'p3')
comprobar('una cantidad manipulada se recorta al stock', forzado?.cantidad === 4, String(forzado?.cantidad))

comprobar('una línea sin nombre recibe uno', normalizarLineas([{ productoId: 'x', cantidad: 1 }])[0].nombre === 'Producto')

console.log('')
console.log('Envío del pedido')

const items = aItemsDeSolicitud(carrito)
comprobar('se envía una entrada por línea', items.length === 2)
comprobar('con el id del producto', items[0].producto_id === 'p1')
comprobar('el nombre viaja también', items[0].nombre === 'Gorra bordada')
comprobar('y la cantidad', items[1].cantidad === 10)

console.log('')
console.log(fallos === 0 ? 'Todo correcto.' : `${fallos} comprobacion(es) fallidas.`)
process.exit(fallos === 0 ? 0 : 1)
