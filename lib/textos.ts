import type { Idioma } from './i18n'

/**
 * Los textos que NO viven en la base de datos.
 *
 * La diferencia importa: lo que escribe NYX desde el panel —titulares,
 * descripciones, preguntas frecuentes— va en la base, con su columna en cada
 * idioma. Lo de aquí son las piezas fijas de la interfaz: botones, etiquetas
 * de formulario, avisos. Nadie las va a editar desde el panel, y tenerlas en
 * la base obligaría a una consulta para pintar la palabra "Buscar".
 *
 * Están todos juntos en un archivo, y no repartidos por los componentes, por
 * un motivo práctico: así se ve de un vistazo qué falta por traducir.
 * Repartidos, un texto sin traducir se descubre cuando un cliente se encuentra
 * un botón en español.
 */

interface Textos {
  nav: {
    inicio: string
    catalogo: string
    estudio: string
    personalizables: string
    entregaInmediata: string
    nosotros: string
    preguntas: string
    contacto: string
    cotizar: string
    abrirMenu: string
    cerrarMenu: string
    irAlInicio: string
  }
  pie: {
    lema: string
    navegacion: string
    categorias: string
    contacto: string
    whatsapp: string
    correo: string
    derechos: string
    acceso: string
  }
  portada: {
    categoriasAntetitulo: string
    categoriasTitulo: string
    verTodo: string
    productos: string
    seleccionAntetitulo: string
    destacadosTitulo: string
    precioNota: string
    trabajosAntetitulo: string
    trabajosTitulo: string
    trabajoAlt: string
    procesoAntetitulo: string
    procesoTitulo: string
    comenzar: string
    vistaPrevia: string
    tuLogotipo: string
    aqui: string
    avisoVistaPrevia: string
    inmediataEtiqueta: string
    inmediataTitulo: string
    inmediataNota: string
    empresasAntetitulo: string
    procesoNyx: string
    cotizarEmpresarial: string
    nosotrosAntetitulo: string
    preguntasAntetitulo: string
    preguntasTitulo: string
    cierreTitulo: string
    cierreTexto: string
    hablarWhatsapp: string
    mensajeWhatsapp: string
    pedidosEntregados: string
    entrega48: string
    arteRevisado: string
  }
  catalogo: {
    titulo: string
    descripcion: string
    migas: string
    mostrando: (desde: number, hasta: number, total: number) => string
    sinResultados: string
    buscar: string
    buscarPlaceholder: string
    todos: string
    personalizables: string
    entregaInmediata: string
    categorias: string
    todas: string
    vacioTitulo: string
    vacioTexto: string
    fotoPendiente: string
    verProducto: string
    solicitar: string
    disponibleAhora: string
    personalizable: string
  }
  producto: {
    referencia: string
    precioNota: string
    categoria: string
    disponibilidad: string
    tipo: string
    tiempoEstimado: string
    mismoDia: string
    diasHabiles: string
    cotizar: string
    preguntarWhatsapp: string
    mensajeWhatsapp: (nombre: string, sku: string) => string
    avisoArchivo: string
    masDe: (categoria: string) => string
  }
  carrito: {
    titulo: string
    intro: string
    migas: string
    verCarrito: string
    anadir: string
    anadido: string
    agotado: string
    yaTienesTodo: (n: number) => string
    vacioTitulo: string
    vacioTexto: string
    verDisponible: string
    porUnidad: string
    quedaEnStock: (n: number) => string
    quitar: string
    quitarUnidad: (nombre: string) => string
    anadirUnidad: (nombre: string) => string
    total: string
    articulo: string
    articulos: string
    aConfirmar: string
    notaSinPagos: string
    tusDatos: string
    nombre: string
    telefono: string
    correo: string
    cuandoRetiras: string
    cuandoRetirasPlaceholder: string
    enviar: string
    enviando: string
    preguntarWhatsapp: string
    mensajeWhatsapp: string
    recibidoTitulo: string
    recibidoTexto: (referencia: string) => string
    seguirViendo: string
    errorVacio: string
    errorNombre: string
    errorCorreo: string
    errorSinBase: string
    errorGenerico: string
  }
  comun: {
    stockBajoPedido: string
    stockConsultar: string
    stockAgotado: string
    stockUnidades: (n: number) => string
    precioACotizar: string
    cambiarIdioma: string
  }
}

const ES: Textos = {
  nav: {
    inicio: 'Inicio',
    catalogo: 'Catálogo',
    estudio: 'Estudio 3D',
    personalizables: 'Personalizables',
    entregaInmediata: 'Entrega inmediata',
    nosotros: 'Nosotros',
    preguntas: 'Preguntas frecuentes',
    contacto: 'Contacto',
    cotizar: 'Solicitar cotización',
    abrirMenu: 'Abrir menú',
    cerrarMenu: 'Cerrar menú',
    irAlInicio: 'NYX, ir al inicio',
  },
  pie: {
    lema: 'Sublimación y productos personalizados en Ecuador. Camisas, tazas, termos, gorras y kits corporativos.',
    navegacion: 'Navegación',
    categorias: 'Categorías',
    contacto: 'Contacto',
    whatsapp: 'WhatsApp',
    correo: 'Correo',
    derechos: 'Todos los derechos reservados.',
    acceso: 'Acceso administrador',
  },
  portada: {
    categoriasAntetitulo: 'Categorías',
    categoriasTitulo: 'Encuentra lo que deseas personalizar',
    verTodo: 'Ver todo el catálogo',
    productos: 'productos',
    seleccionAntetitulo: 'Selección',
    destacadosTitulo: 'Productos destacados',
    precioNota: 'Precios referenciales. El valor final se confirma según cantidad y acabado.',
    trabajosAntetitulo: 'Trabajos reales',
    trabajosTitulo: 'Lo que hemos producido',
    trabajoAlt: 'Trabajo NYX',
    procesoAntetitulo: 'Cómo funciona',
    procesoTitulo: 'Personalizar con NYX es simple',
    comenzar: 'Comenzar mi pedido',
    vistaPrevia: 'VISTA PREVIA',
    tuLogotipo: 'tu logotipo',
    aqui: 'aquí',
    avisoVistaPrevia:
      'La vista previa es únicamente referencial. NYX revisa el arte antes de producir.',
    inmediataEtiqueta: 'Entrega inmediata',
    inmediataTitulo: 'Listos para llevar hoy',
    inmediataNota: 'Stock existente, sin tiempo de producción. Cantidades limitadas.',
    empresasAntetitulo: 'Empresas',
    procesoNyx: 'PROCESO NYX',
    cotizarEmpresarial: 'Solicitar cotización empresarial',
    nosotrosAntetitulo: 'Sobre nosotros',
    preguntasAntetitulo: 'Preguntas frecuentes',
    preguntasTitulo: 'Antes de tu pedido',
    cierreTitulo: 'Haz realidad tu próxima idea con NYX',
    cierreTexto:
      'Cuéntanos qué deseas personalizar y recibe una cotización con precio final y tiempo de entrega.',
    hablarWhatsapp: 'Hablar por WhatsApp',
    mensajeWhatsapp: 'Hola NYX, quisiera personalizar un producto.',
    pedidosEntregados: '+850 pedidos entregados',
    entrega48: 'Entrega inmediata en 48 h',
    arteRevisado: 'Arte revisado antes de producir',
  },
  catalogo: {
    titulo: 'Catálogo',
    descripcion:
      'Camisas, buzos, gorras, tazas, termos, pulseras, llaveros y kits corporativos personalizados.',
    migas: 'Catálogo',
    mostrando: (desde, hasta, total) =>
      `Mostrando ${desde}–${hasta} de ${total} productos · precios referenciales`,
    sinResultados: 'Sin resultados para los filtros seleccionados',
    buscar: 'Buscar',
    buscarPlaceholder: 'Buscar producto, categoría o código',
    todos: 'Todos',
    personalizables: 'Personalizables',
    entregaInmediata: 'Entrega inmediata',
    categorias: 'Categorías',
    todas: 'Todas',
    vacioTitulo: 'No encontramos nada con esos filtros',
    vacioTexto: 'Prueba con otra categoría, o cuéntanos qué necesitas y lo cotizamos.',
    fotoPendiente: 'foto pendiente',
    verProducto: 'Ver producto',
    solicitar: 'Solicitar',
    disponibleAhora: 'Disponible ahora',
    personalizable: 'Personalizable',
  },
  producto: {
    referencia: 'Referencia',
    precioNota:
      'Precio referencial. NYX confirma el valor final según cantidad, material y acabado.',
    categoria: 'Categoría',
    disponibilidad: 'Disponibilidad',
    tipo: 'Tipo',
    tiempoEstimado: 'Tiempo estimado',
    mismoDia: 'Retiro el mismo día',
    diasHabiles: '3 a 7 días hábiles',
    cotizar: 'Solicitar cotización',
    preguntarWhatsapp: 'Preguntar por WhatsApp',
    mensajeWhatsapp: (nombre, sku) => `Hola NYX, me interesa el producto ${nombre} (${sku}).`,
    avisoArchivo:
      'Podrás adjuntar tu logotipo o diseño en el formulario. Aceptamos PNG, JPG, PDF, AI o SVG. Revisamos el arte antes de producir.',
    masDe: (categoria) => `Más de ${categoria}`,
  },
  carrito: {
    titulo: 'Tu pedido',
    intro:
      'Productos de entrega inmediata: ya están hechos, así que no hay tiempo de producción. Confirmamos la disponibilidad y coordinamos el retiro o el envío.',
    migas: 'Carrito',
    verCarrito: 'Carrito',
    anadir: 'Añadir al carrito',
    anadido: 'Añadido ✓',
    agotado: 'Agotado',
    yaTienesTodo: (n) => `Ya tienes las ${n} disponibles`,
    vacioTitulo: 'Tu carrito está vacío',
    vacioTexto:
      'Aquí se reúnen los productos de entrega inmediata: los que ya están hechos y se retiran el mismo día. Lo personalizado va por cotización.',
    verDisponible: 'Ver lo disponible hoy',
    porUnidad: 'por unidad',
    quedaEnStock: (n) => `Es todo lo que queda en stock (${n}).`,
    quitar: 'Quitar',
    quitarUnidad: (nombre) => `Quitar una unidad de ${nombre}`,
    anadirUnidad: (nombre) => `Añadir una unidad de ${nombre}`,
    total: 'Total',
    articulo: 'artículo',
    articulos: 'artículos',
    aConfirmar: 'A confirmar',
    notaSinPagos:
      'Sin pagos en línea: envías el pedido, NYX confirma la disponibilidad y coordináis la entrega o el retiro. Añadir algo al carrito no lo aparta del stock.',
    tusDatos: 'Tus datos',
    nombre: 'Nombre completo',
    telefono: 'Teléfono / WhatsApp',
    correo: 'Correo electrónico',
    cuandoRetiras: '¿Cuándo pasas a retirarlo? ¿Prefieres envío?',
    cuandoRetirasPlaceholder: 'Paso mañana por la tarde',
    enviar: 'Enviar pedido',
    enviando: 'Enviando…',
    preguntarWhatsapp: 'Preguntar por WhatsApp',
    mensajeWhatsapp: 'Hola NYX, quiero pedir productos de entrega inmediata.',
    recibidoTitulo: 'Pedido recibido',
    recibidoTexto: (referencia) =>
      `Guarda esta referencia: ${referencia}. Te escribimos para confirmarte la disponibilidad y coordinar la entrega.`,
    seguirViendo: 'Seguir viendo',
    errorVacio: 'El carrito está vacío.',
    errorNombre: 'Escribe tu nombre para poder avisarte.',
    errorCorreo: 'Revisa el correo electrónico: no parece válido.',
    errorSinBase:
      'El pedido todavía no se puede registrar. Escríbenos por WhatsApp y lo gestionamos igual.',
    errorGenerico:
      'No pudimos registrar el pedido. Inténtalo de nuevo o escríbenos por WhatsApp.',
  },
  comun: {
    stockBajoPedido: 'Bajo pedido',
    stockConsultar: 'Consultar',
    stockAgotado: 'Agotado',
    stockUnidades: (n) => `${n} en stock`,
    precioACotizar: 'A cotizar',
    cambiarIdioma: 'Cambiar idioma',
  },
}

const EN: Textos = {
  nav: {
    inicio: 'Home',
    catalogo: 'Catalog',
    estudio: '3D Studio',
    personalizables: 'Custom made',
    entregaInmediata: 'Ready to ship',
    nosotros: 'About us',
    preguntas: 'FAQ',
    contacto: 'Contact',
    cotizar: 'Request a quote',
    abrirMenu: 'Open menu',
    cerrarMenu: 'Close menu',
    irAlInicio: 'NYX, go to home',
  },
  pie: {
    lema: 'Sublimation and personalized products in Ecuador. Shirts, mugs, tumblers, caps and corporate kits.',
    navegacion: 'Navigation',
    categorias: 'Categories',
    contacto: 'Contact',
    whatsapp: 'WhatsApp',
    correo: 'Email',
    derechos: 'All rights reserved.',
    acceso: 'Admin access',
  },
  portada: {
    categoriasAntetitulo: 'Categories',
    categoriasTitulo: 'Find what you want to personalize',
    verTodo: 'See the full catalog',
    productos: 'products',
    seleccionAntetitulo: 'Selection',
    destacadosTitulo: 'Featured products',
    precioNota: 'Reference prices. The final amount is confirmed by quantity and finish.',
    trabajosAntetitulo: 'Real work',
    trabajosTitulo: 'What we have produced',
    trabajoAlt: 'NYX work',
    procesoAntetitulo: 'How it works',
    procesoTitulo: 'Personalizing with NYX is simple',
    comenzar: 'Start my order',
    vistaPrevia: 'PREVIEW',
    tuLogotipo: 'your logo',
    aqui: 'here',
    avisoVistaPrevia:
      'The preview is for reference only. NYX reviews the artwork before producing.',
    inmediataEtiqueta: 'Ready to ship',
    inmediataTitulo: 'Take it home today',
    inmediataNota: 'In stock, no production time. Limited quantities.',
    empresasAntetitulo: 'Companies',
    procesoNyx: 'NYX PROCESS',
    cotizarEmpresarial: 'Request a corporate quote',
    nosotrosAntetitulo: 'About us',
    preguntasAntetitulo: 'Frequently asked questions',
    preguntasTitulo: 'Before you order',
    cierreTitulo: 'Bring your next idea to life with NYX',
    cierreTexto:
      'Tell us what you want to personalize and get a quote with the final price and lead time.',
    hablarWhatsapp: 'Chat on WhatsApp',
    mensajeWhatsapp: 'Hi NYX, I would like to personalize a product.',
    pedidosEntregados: '+850 orders delivered',
    entrega48: 'Ready to ship in 48 h',
    arteRevisado: 'Artwork reviewed before producing',
  },
  catalogo: {
    titulo: 'Catalog',
    descripcion:
      'Personalized shirts, hoodies, caps, mugs, tumblers, wristbands, keychains and corporate kits.',
    migas: 'Catalog',
    mostrando: (desde, hasta, total) =>
      `Showing ${desde}–${hasta} of ${total} products · reference prices`,
    sinResultados: 'No results for the selected filters',
    buscar: 'Search',
    buscarPlaceholder: 'Search product, category or code',
    todos: 'All',
    personalizables: 'Custom made',
    entregaInmediata: 'Ready to ship',
    categorias: 'Categories',
    todas: 'All',
    vacioTitulo: 'We found nothing with those filters',
    vacioTexto: 'Try another category, or tell us what you need and we will quote it.',
    fotoPendiente: 'photo pending',
    verProducto: 'View product',
    solicitar: 'Request',
    disponibleAhora: 'Available now',
    personalizable: 'Custom made',
  },
  producto: {
    referencia: 'Reference',
    precioNota: 'Reference price. NYX confirms the final amount by quantity, material and finish.',
    categoria: 'Category',
    disponibilidad: 'Availability',
    tipo: 'Type',
    tiempoEstimado: 'Estimated time',
    mismoDia: 'Same-day pickup',
    diasHabiles: '3 to 7 business days',
    cotizar: 'Request a quote',
    preguntarWhatsapp: 'Ask on WhatsApp',
    mensajeWhatsapp: (nombre, sku) => `Hi NYX, I am interested in ${nombre} (${sku}).`,
    avisoArchivo:
      'You can attach your logo or design in the form. We accept PNG, JPG, PDF, AI or SVG. We review the artwork before producing.',
    masDe: (categoria) => `More from ${categoria}`,
  },
  carrito: {
    titulo: 'Your order',
    intro:
      'Ready-to-ship products: they are already made, so there is no production time. We confirm availability and arrange pickup or delivery.',
    migas: 'Cart',
    verCarrito: 'Cart',
    anadir: 'Add to cart',
    anadido: 'Added ✓',
    agotado: 'Sold out',
    yaTienesTodo: (n) => `You already have all ${n} available`,
    vacioTitulo: 'Your cart is empty',
    vacioTexto:
      'This is where ready-to-ship products go: the ones already made that you pick up the same day. Custom work goes through a quote.',
    verDisponible: 'See what is available today',
    porUnidad: 'per unit',
    quedaEnStock: (n) => `That is all we have left in stock (${n}).`,
    quitar: 'Remove',
    quitarUnidad: (nombre) => `Remove one unit of ${nombre}`,
    anadirUnidad: (nombre) => `Add one unit of ${nombre}`,
    total: 'Total',
    articulo: 'item',
    articulos: 'items',
    aConfirmar: 'To be confirmed',
    notaSinPagos:
      'No online payments: you send the order, NYX confirms availability and you arrange pickup or delivery. Adding something to the cart does not reserve it.',
    tusDatos: 'Your details',
    nombre: 'Full name',
    telefono: 'Phone / WhatsApp',
    correo: 'Email address',
    cuandoRetiras: 'When are you picking it up? Do you prefer delivery?',
    cuandoRetirasPlaceholder: 'Tomorrow afternoon',
    enviar: 'Send order',
    enviando: 'Sending…',
    preguntarWhatsapp: 'Ask on WhatsApp',
    mensajeWhatsapp: 'Hi NYX, I would like to order ready-to-ship products.',
    recibidoTitulo: 'Order received',
    recibidoTexto: (referencia) =>
      `Keep this reference: ${referencia}. We will write to confirm availability and arrange delivery.`,
    seguirViendo: 'Keep browsing',
    errorVacio: 'Your cart is empty.',
    errorNombre: 'Write your name so we can reply.',
    errorCorreo: 'Check the email address: it does not look valid.',
    errorSinBase:
      'Orders cannot be registered yet. Write to us on WhatsApp and we will handle it.',
    errorGenerico: 'We could not register the order. Try again or write to us on WhatsApp.',
  },
  comun: {
    stockBajoPedido: 'Made to order',
    stockConsultar: 'Ask us',
    stockAgotado: 'Sold out',
    stockUnidades: (n) => `${n} in stock`,
    precioACotizar: 'Quote on request',
    cambiarIdioma: 'Change language',
  },
}

const DICCIONARIOS: Record<Idioma, Textos> = { es: ES, en: EN }

export function textos(idioma: Idioma): Textos {
  return DICCIONARIOS[idioma] ?? ES
}

export type { Textos }
