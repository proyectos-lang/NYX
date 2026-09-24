/**
 * Datos de respaldo, copiados de las maquetas originales.
 *
 * Sirven para que el sitio arranque y se vea completo antes de que exista un
 * proyecto de Supabase. En cuanto haya base de datos con contenido, las
 * consultas de lib/consultas.ts dejan de usarlos.
 *
 * Son los mismos valores que carga supabase/seed.sql, así que la transición de
 * uno a otro no cambia lo que se ve.
 */

import type { TipoProducto } from '@/lib/database.types'

export interface CategoriaVista {
  slug: string
  nombre: string
  imagen: string | null
  cuenta: number
}

export interface ProductoVista {
  id: string
  sku: string
  slug: string
  nombre: string
  categoria: string
  categoriaSlug: string
  descripcion: string | null
  precio: number | null
  tipo: TipoProducto
  stock: number | null
  bajoPedido: boolean
  imagen: string | null
  fotos: string[]
}

export interface FaqVista {
  pregunta: string
  respuesta: string
}

export const CATEGORIAS_DEMO: CategoriaVista[] = [
  { slug: 'camisas', nombre: 'Camisas', imagen: '/assets/tee-oasis.jpeg', cuenta: 24 },
  { slug: 'buzos', nombre: 'Buzos', imagen: '/assets/hoodie-gray.jpeg', cuenta: 11 },
  { slug: 'termos-y-botellas', nombre: 'Termos y botellas', imagen: '/assets/bottle-create.jpeg', cuenta: 12 },
  { slug: 'gorras', nombre: 'Gorras', imagen: '/assets/cap-pastel.jpeg', cuenta: 9 },
  { slug: 'tazas', nombre: 'Tazas', imagen: '/assets/mug-photos.jpeg', cuenta: 18 },
  { slug: 'pulseras', nombre: 'Pulseras', imagen: '/assets/band-kura.jpeg', cuenta: 21 },
  { slug: 'llaveros', nombre: 'Llaveros', imagen: '/assets/key-charms.jpeg', cuenta: 16 },
  { slug: 'libretas-y-kits', nombre: 'Libretas y kits', imagen: '/assets/kit-indcom.jpeg', cuenta: 14 },
]

export const PRODUCTOS_DEMO: ProductoVista[] = [
  {
    id: 'demo-1', sku: 'NYX-001', slug: 'camisa-oversize-nyx', nombre: 'Camisa oversize NYX',
    categoria: 'Camisas', categoriaSlug: 'camisas',
    descripcion: 'Camisa de algodón con corte oversize y sublimación de alta durabilidad. Ideal para uniformes, eventos y merchandising de marca.',
    precio: 13.40, tipo: 'personalizable', stock: 24, bajoPedido: false,
    imagen: '/assets/prod/p001.jpg',
    fotos: ['/assets/prod/p001.jpg', '/assets/tee-oasis.jpeg', '/assets/tee-max.jpeg'],
  },
  {
    id: 'demo-2', sku: 'NYX-002', slug: 'buzo-con-capucha', nombre: 'Buzo con capucha',
    categoria: 'Buzos', categoriaSlug: 'buzos',
    descripcion: 'Buzo con capucha y bolsillo canguro. Bordado o sublimación según el diseño.',
    precio: 28.00, tipo: 'personalizable', stock: null, bajoPedido: true,
    imagen: '/assets/prod/p002.jpg',
    fotos: ['/assets/prod/p002.jpg', '/assets/hoodie.jpeg', '/assets/hoodie-gray.jpeg'],
  },
  {
    id: 'demo-3', sku: 'NYX-003', slug: 'termo-signature-750', nombre: 'Termo Signature 750 ml',
    categoria: 'Termos y botellas', categoriaSlug: 'termos-y-botellas',
    descripcion: 'Termo de acero inoxidable con doble pared, acabado mate y sublimación de alta durabilidad. Ideal para kits corporativos, eventos y regalos personalizados.',
    precio: 18.50, tipo: 'personalizable', stock: 18, bajoPedido: false,
    imagen: '/assets/prod/p003.jpg',
    fotos: ['/assets/prod/p003.jpg', '/assets/bottle-create.jpeg', '/assets/bottle-pixel.jpeg'],
  },
  {
    id: 'demo-4', sku: 'NYX-004', slug: 'botella-pixel-500', nombre: 'Botella pixel 500 ml',
    categoria: 'Termos y botellas', categoriaSlug: 'termos-y-botellas',
    descripcion: 'Botella deportiva de 500 ml con grabado láser. Disponible para entrega inmediata.',
    precio: 11.20, tipo: 'entrega_inmediata', stock: 32, bajoPedido: false,
    imagen: '/assets/prod/p005.jpg',
    fotos: ['/assets/prod/p005.jpg', '/assets/bottle-pixel.jpeg'],
  },
  {
    id: 'demo-5', sku: 'NYX-005', slug: 'taza-ceramica-con-nombre', nombre: 'Taza cerámica con nombre',
    categoria: 'Tazas', categoriaSlug: 'tazas',
    descripcion: 'Taza de cerámica con interior de color y nombre individual. Perfecta para regalos y detalles de evento.',
    precio: 7.20, tipo: 'personalizable', stock: 40, bajoPedido: false,
    imagen: '/assets/prod/p007.jpg',
    fotos: ['/assets/prod/p007.jpg', '/assets/mug-gift.jpeg', '/assets/mug-photos.jpeg'],
  },
  {
    id: 'demo-6', sku: 'NYX-006', slug: 'gorra-bordada', nombre: 'Gorra bordada',
    categoria: 'Gorras', categoriaSlug: 'gorras',
    descripcion: 'Gorra con bordado frontal. Varios colores disponibles, entrega inmediata.',
    precio: 8.40, tipo: 'entrega_inmediata', stock: 14, bajoPedido: false,
    imagen: '/assets/prod/p008.jpg',
    fotos: ['/assets/prod/p008.jpg', '/assets/cap-blue.jpeg', '/assets/cap-pastel.jpeg'],
  },
  {
    id: 'demo-7', sku: 'NYX-007', slug: 'libreta-ejecutiva-a5', nombre: 'Libreta ejecutiva A5',
    categoria: 'Libretas y kits', categoriaSlug: 'libretas-y-kits',
    descripcion: 'Libreta A5 de tapa dura, personalizable en portada. Se combina en kits con termo y bolígrafo.',
    precio: 9.20, tipo: 'personalizable', stock: 26, bajoPedido: false,
    imagen: '/assets/prod/p010.jpg',
    fotos: ['/assets/prod/p010.jpg', '/assets/kit-blue.jpeg', '/assets/kit-indcom.jpeg'],
  },
  {
    id: 'demo-8', sku: 'NYX-008', slug: 'pulsera-de-silicona', nombre: 'Pulsera de silicona',
    categoria: 'Pulseras', categoriaSlug: 'pulseras',
    descripcion: 'Pulsera de silicona con texto grabado. Pensada para eventos, conciertos y bodas.',
    precio: 1.40, tipo: 'entrega_inmediata', stock: 180, bajoPedido: false,
    imagen: '/assets/prod/p012.jpg',
    fotos: ['/assets/prod/p012.jpg', '/assets/band-kura.jpeg', '/assets/band-chetko.jpeg'],
  },
]

export const FAQ_DEMO: FaqVista[] = [
  {
    pregunta: '¿Cuánto tarda un pedido?',
    respuesta: 'Los pedidos personalizados se entregan entre 3 y 7 días hábiles según cantidad y complejidad. Los productos de entrega inmediata se retiran el mismo día.',
  },
  {
    pregunta: '¿Cuál es la cantidad mínima?',
    respuesta: 'No hay mínimo para productos individuales. Para pedidos corporativos con diseño exclusivo el mínimo referencial es de 10 unidades.',
  },
  {
    pregunta: '¿Puedo enviar mi propio diseño?',
    respuesta: 'Sí. Puedes cargar tu logotipo en PNG, JPG, PDF, AI o SVG. Recomendamos alta resolución o vectores para el mejor resultado.',
  },
  {
    pregunta: '¿Realizan pedidos empresariales?',
    respuesta: 'Sí, trabajamos kits corporativos, uniformes, reconocimientos y artículos para eventos con cotización dedicada.',
  },
  {
    pregunta: '¿Hacen entregas o envíos?',
    respuesta: 'Realizamos entregas locales coordinadas y envíos a nivel nacional por courier. El costo se confirma en la cotización.',
  },
  {
    pregunta: '¿Cómo se confirma el precio?',
    respuesta: 'El precio mostrado es referencial. NYX revisa tu solicitud y confirma el valor final según cantidad, material y acabado.',
  },
  {
    pregunta: '¿Qué métodos de pago aceptan?',
    respuesta: 'Transferencia bancaria y pago en efectivo al retirar. No procesamos pagos en línea en esta etapa.',
  },
]

/** Textos de los bloques editables, con los valores por defecto de la maqueta. */
export const CONTENIDO_DEMO: Record<string, Record<string, string>> = {
  portada: {
    etiqueta: 'Sublimación NYX',
    titular: 'Todo lo que imagines,',
    titularEnfasis: 'personalizado',
    apoyo: 'Personalizamos cada detalle para crear productos que representen tu marca, evento o idea.',
  },
  'como-funciona': {
    'paso-01': 'Elige tu producto',
    'paso-01-detalle': 'Explora el catálogo por categoría y elige el artículo que quieres personalizar.',
    'paso-02': 'Carga tu logotipo o diseño',
    'paso-02-detalle': 'PNG, JPG, PDF, AI o SVG. Revisamos la resolución antes de producir.',
    'paso-03': 'Indica cantidad, colores y detalles',
    'paso-03-detalle': 'Tallas, colores, ubicación del logotipo y fecha en la que lo necesitas.',
    'paso-04': 'Recibe la confirmación de NYX',
    'paso-04-detalle': 'Respondemos con precio final y tiempo de entrega en menos de 24 horas hábiles.',
  },
  empresas: {
    titular: 'Personalizamos la identidad de tu empresa',
    parrafo: 'Creamos productos corporativos personalizados para fortalecer tu marca, reconocer a tu equipo o destacar en cada evento.',
    etiquetas: 'Uniformes, Kits de bienvenida, Eventos, Reconocimientos, Merchandising',
  },
  nosotros: {
    titular: 'Detalle, oficio y renacimiento',
    parrafo: 'NYX nace del oficio de la sublimación: convertir una idea en un objeto que se usa, se regala y se recuerda. Trabajamos con materiales seleccionados, control de color y revisión pieza por pieza antes de entregar.',
    cifra1: '6 años',
    cifra1Detalle: 'de experiencia',
    cifra2: '1 a 1',
    cifra2Detalle: 'revisión de diseño',
  },
}

export const AJUSTES_DEMO = {
  contacto: {
    email: 'hola@nyx.ec',
    telefono: '+1 845 972 1825',
    whatsapp: '+1 845 972 1825',
    ciudad: 'Quito, Ecuador',
    horario: 'Lun a Vie 9:00–18:00 · Sáb 9:00–13:00',
  },
  redes: {
    instagram: '',
    facebook: '',
    tiktok: '',
  },
}

/** Fotos del mosaico "Trabajos reales", tal como las elige la maqueta. */
export const MOSAICO_DEMO = [3, 7, 14, 21, 30, 34, 41, 44, 50, 53, 57, 60].map(
  (n) => `/assets/prod/p${String(n).padStart(3, '0')}.jpg`
)
