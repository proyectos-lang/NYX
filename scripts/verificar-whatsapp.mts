/**
 * Comprobaciones de los enlaces de WhatsApp.
 *
 *     npm run verificar:whatsapp
 *
 * Lo unico delicado aqui son los telefonos: wa.me no avisa de un numero mal
 * formado, abre el chat diciendo que no existe. Y eso no se descubre probando
 * el panel, porque el numero de prueba siempre esta bien escrito.
 */

import { enlaceWhatsApp, mensajePedido, normalizarTelefono } from '../lib/whatsapp.ts'

let fallos = 0

function comprobar(descripcion: string, condicion: boolean, detalle = ''): void {
  if (condicion) {
    console.log(`  ok    ${descripcion}`)
  } else {
    fallos++
    console.log(`  FALLA ${descripcion}${detalle ? ` — ${detalle}` : ''}`)
  }
}

console.log('')
console.log('Telefonos de Ecuador')

// Todas estas son la MISMA clienta, escribiendo su numero como le salio.
const mismoMovil = [
  '0991234567',
  '099 123 4567',
  '099-123-4567',
  '(099) 123 4567',
  '+593 99 123 4567',
  '+593991234567',
  '593991234567',
  '991234567',
]

for (const escrito of mismoMovil) {
  comprobar(
    `"${escrito}" es 593991234567`,
    normalizarTelefono(escrito) === '593991234567',
    String(normalizarTelefono(escrito))
  )
}

// Fijo de Guayaquil: 04 + 7 digitos.
comprobar('un fijo con 0 inicial pierde el 0', normalizarTelefono('042345678') === '59342345678')

console.log('')
console.log('Numeros que NO se deben ofrecer')

// Preferimos no dar boton a dar uno que abre el chat de otra persona.
const malos: [string | null | undefined, string][] = [
  [null, 'sin telefono'],
  [undefined, 'indefinido'],
  ['', 'cadena vacia'],
  ['   ', 'solo espacios'],
  ['sin telefono', 'texto sin digitos'],
  ['12345', 'demasiado corto'],
  ['0991234', 'movil incompleto'],
  ['09912345678', 'movil con un digito de mas'],
  ['5939912345', 'codigo de pais con el resto incompleto'],
]

for (const [valor, motivo] of malos) {
  comprobar(`se descarta: ${motivo}`, normalizarTelefono(valor) === null, String(normalizarTelefono(valor)))
}

// Un numero extranjero escrito en internacional si vale: no hay razon para
// bloquear a un cliente de fuera.
comprobar(
  'un internacional de otro pais se respeta',
  normalizarTelefono('+57 301 234 5678') === '573012345678'
)

console.log('')
console.log('Mensajes')

const base = { ref: 'NYX-0042', cliente: { nombre: 'Maria Jose Paredes' } }

const nuevo = mensajePedido({ ...base, estado: 'nuevo' })
comprobar('saluda por el nombre de pila', nuevo.startsWith('Hola Maria,'))
comprobar('nombra la referencia del pedido', nuevo.includes('NYX-0042'))
comprobar('anuncia la cotizacion', nuevo.toLowerCase().includes('cotizacion'))

// El motivo de que el mensaje dependa del estado.
const entregado = mensajePedido({ ...base, estado: 'entregado' })
comprobar('un pedido entregado no dice que se acaba de recibir', !entregado.includes('recibimos'))
comprobar('y sabe que ya se entrego', entregado.includes('entregado'))

const enProduccion = mensajePedido({ ...base, estado: 'en_produccion' })
comprobar('en produccion tampoco promete cotizar', !enProduccion.toLowerCase().includes('cotizacion'))

// Un pedido sin nombre de cliente no debe producir "Hola , ".
const anonimo = mensajePedido({ ref: 'NYX-0001', estado: 'nuevo', cliente: null })
comprobar('sin nombre saluda igual, sin hueco', anonimo.startsWith('Hola, '))

console.log('')
console.log('Enlace')

const enlace = enlaceWhatsApp('099 123 4567', 'Hola, prueba & cotizacion')
comprobar('apunta a wa.me con el numero limpio', enlace === null ? false : enlace.startsWith('https://wa.me/593991234567?text='))
comprobar(
  'el mensaje va codificado',
  enlace === null ? false : enlace.includes('%26') && !enlace.includes(' '),
  String(enlace)
)
comprobar('sin telefono no hay enlace', enlaceWhatsApp(null, 'hola') === null)
comprobar('con telefono invalido tampoco', enlaceWhatsApp('12345', 'hola') === null)

// El mensaje real de un pedido tiene que sobrevivir a la codificacion.
const real = enlaceWhatsApp('0991234567', mensajePedido({ ...base, estado: 'nuevo' }))
comprobar('un mensaje real cabe en la URL', real !== null && real.length < 2000, `${real?.length} caracteres`)

console.log('')
console.log(fallos === 0 ? 'Todo correcto.' : `${fallos} comprobacion(es) fallidas.`)
process.exit(fallos === 0 ? 0 : 1)
