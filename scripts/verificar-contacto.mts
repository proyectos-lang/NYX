/**
 * Comprobaciones de los datos de contacto.
 *
 *     npm run verificar:contacto
 *
 * POR QUÉ EXISTE
 *
 * El botón de WhatsApp de la web apuntaba a `https://wa.me/`, sin número. Ese
 * enlace abre WhatsApp y no lleva a ninguna conversación, así que desde fuera
 * parece que el sitio está roto.
 *
 * La causa estaba en cómo se mezclaban los datos guardados con los de por
 * defecto: `{ ...defecto, ...base }`. La propagación no distingue "no hay
 * valor" de "valor vacío", así que un campo en blanco guardado desde el panel
 * pisaba el de por defecto y dejaba la web sin teléfono. Y no daba error en
 * ningún sitio: el enlace se construía igual, solo que sin dígitos.
 *
 * Aquí se comprueban las dos mitades: que un campo vacío no borre el valor de
 * por defecto, y que un enlace sin número no llegue a construirse.
 */

import { AJUSTES_DEMO } from '../lib/demo.ts'

let fallos = 0

function comprobar(descripcion: string, condicion: boolean, detalle = ''): void {
  if (condicion) {
    console.log(`  ok    ${descripcion}`)
  } else {
    fallos++
    console.log(`  FALLA ${descripcion}${detalle ? ` — ${detalle}` : ''}`)
  }
}

/**
 * La misma mezcla que hace lib/consultas.ts.
 *
 * Se copia aquí en vez de importarla porque consultas.ts lleva 'server-only' y
 * arrastra el cliente de Supabase: importarlo desde un script suelto revienta
 * antes de llegar a comprobar nada.
 */
type Contacto = typeof AJUSTES_DEMO.contacto

function fusionarContacto(base: Partial<Contacto>): Contacto {
  const salida = { ...AJUSTES_DEMO.contacto }

  for (const clave of Object.keys(salida) as (keyof Contacto)[]) {
    const valor = base[clave]
    if (typeof valor === 'string' && valor.trim()) salida[clave] = valor.trim()
  }

  return salida
}

/** La misma construcción del enlace que hace lib/consultas.ts. */
function enlaceWhatsapp(numero: string, mensaje?: string): string {
  const digitos = numero.replace(/\D/g, '')
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''
  return `https://wa.me/${digitos}${texto}`
}

console.log('')
console.log('Mezcla con los valores de por defecto')

comprobar(
  'lo guardado gana a lo de por defecto',
  fusionarContacto({ whatsapp: '+1 845 972 1825' }).whatsapp === '+1 845 972 1825'
)

// El caso que rompió la web: el panel guardó el campo en blanco.
comprobar(
  'un campo vacío NO borra el de por defecto',
  fusionarContacto({ whatsapp: '' }).whatsapp === AJUSTES_DEMO.contacto.whatsapp,
  fusionarContacto({ whatsapp: '' }).whatsapp
)

comprobar(
  'solo espacios tampoco lo borra',
  fusionarContacto({ whatsapp: '   ' }).whatsapp === AJUSTES_DEMO.contacto.whatsapp
)

comprobar(
  'un objeto vacío devuelve todo lo de por defecto',
  fusionarContacto({}).email === AJUSTES_DEMO.contacto.email
)

comprobar(
  'los espacios de los lados se recortan',
  fusionarContacto({ ciudad: '  Estados Unidos  ' }).ciudad === 'Estados Unidos'
)

comprobar(
  'vaciar un campo no arrastra a los demás',
  fusionarContacto({ whatsapp: '', email: 'hola@nyx.ec' }).email === 'hola@nyx.ec'
)

console.log('')
console.log('El enlace de WhatsApp')

// Lo que se veía en producción: wa.me sin nada detrás.
const roto = enlaceWhatsapp('')
comprobar(
  'sin número, el enlace queda sin dígitos y hay que evitarlo',
  roto === 'https://wa.me/',
  roto
)

comprobar(
  'con los datos ya fusionados, nunca queda vacío',
  enlaceWhatsapp(fusionarContacto({ whatsapp: '' }).whatsapp) !== 'https://wa.me/'
)

const bueno = enlaceWhatsapp('+1 845 972 1825', 'Hola NYX')
comprobar('se quedan solo los dígitos', bueno.startsWith('https://wa.me/18459721825'))
comprobar('el mensaje va codificado', bueno.includes('?text=Hola%20NYX'))

console.log('')
console.log('Los valores de por defecto sirven')

const c = AJUSTES_DEMO.contacto

comprobar('hay un WhatsApp', c.whatsapp.replace(/\D/g, '').length >= 10, c.whatsapp)
comprobar('hay un teléfono', c.telefono.replace(/\D/g, '').length >= 10, c.telefono)
comprobar('el correo parece un correo', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email), c.email)
comprobar('hay ciudad', c.ciudad.trim().length > 0, c.ciudad)
comprobar('hay horario', c.horario.trim().length > 0, c.horario)

console.log('')
console.log(fallos === 0 ? 'Todo correcto.' : `${fallos} comprobacion(es) fallidas.`)
process.exit(fallos === 0 ? 0 : 1)
