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
    destacadosNota: string
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
    respuesta24: string
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
    categorias: string
    todas: string
    vacioTitulo: string
    vacioTexto: string
    fotoPendiente: string
    verProducto: string
    solicitar: string
    tecnicas: string
  }
  producto: {
    referencia: string
    precioNota: string
    categoria: string
    disponibilidad: string
    tiempoEstimado: string
    diasHabiles: string
    cotizar: string
    preguntarWhatsapp: string
    mensajeWhatsapp: (nombre: string, sku: string) => string
    avisoArchivo: string
    masDe: (categoria: string) => string
  }
  cotizar: {
    titulo: string
    intro: string
    migas: string
    comoFunciona: string
    puntos: string[]
    prefieresEscribir: string
    grupoDatos: string
    grupoProducto: string
    grupoLogo: string
    grupoEntrega: string
    nombre: string
    nombrePlaceholder: string
    empresa: string
    empresaPlaceholder: string
    correo: string
    correoPlaceholder: string
    telefono: string
    telefonoPlaceholder: string
    producto: string
    productoOtro: string
    cantidad: string
    fecha: string
    detalles: string
    detallesPlaceholder: string
    metodo: string
    metodoSinDefinir: string
    metodoEnvio: string
    metodoRetiro: string
    metodoLocal: string
    indicaciones: string
    indicacionesPlaceholder: string
    elegirArchivo: string
    subiendo: string
    formatosArchivo: string
    archivoGrande: string
    archivoFallo: string
    archivoSinBase: string
    avisoArte: string
    avisoSinPagos: string
    enviar: string
    enviando: string
    disenoAdjunto: string
    seguirEditando: string
    exitoAntetitulo: string
    exitoTitulo: string
    exitoTexto: string
    exitoVolver: string
    errorNombre: string
    errorCorreo: string
    errorProducto: string
    errorSinBase: string
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
    estudio: 'Design Studio',
    nosotros: 'Nosotros',
    preguntas: 'Preguntas frecuentes',
    contacto: 'Contacto',
    cotizar: 'Solicitar cotización',
    abrirMenu: 'Abrir menú',
    cerrarMenu: 'Cerrar menú',
    irAlInicio: 'NYX, ir al inicio',
  },
  pie: {
    lema: 'Productos personalizados. Camisetas, tazas, termos, gorras y regalos corporativos.',
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
    destacadosNota:
      'Uno de cada técnica: sublimación, impresión DTF, grabado láser, bordado e impresión 3D.',
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
    respuesta24: 'Respuesta en 24 horas hábiles',
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
    categorias: 'Categorías',
    todas: 'Todas',
    vacioTitulo: 'No encontramos nada con esos filtros',
    vacioTexto: 'Prueba con otra categoría, o cuéntanos qué necesitas y lo cotizamos.',
    fotoPendiente: 'foto pendiente',
    verProducto: 'Ver producto',
    solicitar: 'Solicitar',
    tecnicas: 'Lo hacemos en',
  },
  producto: {
    referencia: 'Referencia',
    precioNota:
      'Precio referencial. NYX confirma el valor final según cantidad, material y acabado.',
    categoria: 'Categoría',
    disponibilidad: 'Disponibilidad',
    tiempoEstimado: 'Tiempo estimado',
    diasHabiles: '3 a 7 días hábiles',
    cotizar: 'Solicitar cotización',
    preguntarWhatsapp: 'Preguntar por WhatsApp',
    mensajeWhatsapp: (nombre, sku) => `Hola NYX, me interesa el producto ${nombre} (${sku}).`,
    avisoArchivo:
      'Podrás adjuntar tu logotipo o diseño en el formulario. Aceptamos PNG, JPG, PDF, AI o SVG. Revisamos el arte antes de producir.',
    masDe: (categoria) => `Más de ${categoria}`,
  },
  cotizar: {
    titulo: 'Solicitar cotización',
    intro:
      'Cuéntanos qué deseas personalizar. Recibirás la confirmación de NYX con el precio final y el tiempo de entrega.',
    migas: 'Cotización',
    comoFunciona: 'Cómo funciona',
    puntos: [
      'Respondemos en un máximo de 24 horas hábiles.',
      'El precio de la web es referencial; el final depende de cantidad, material y acabado.',
      'Revisamos tu arte antes de producir y te avisamos si la resolución no alcanza.',
      'Sin mínimo para productos individuales. Corporativo desde 10 unidades.',
    ],
    prefieresEscribir: '¿Prefieres escribirnos?',
    grupoDatos: 'Tus datos',
    grupoProducto: 'Qué quieres personalizar',
    grupoLogo: 'Tu logotipo o diseño',
    grupoEntrega: 'Entrega y observaciones',
    nombre: 'Nombre completo',
    nombrePlaceholder: 'Ana Martínez',
    empresa: 'Empresa (opcional)',
    empresaPlaceholder: 'NYX Studio S.A.',
    correo: 'Correo electrónico',
    correoPlaceholder: 'ana@empresa.com',
    telefono: 'Teléfono / WhatsApp',
    telefonoPlaceholder: '+593 99 000 0000',
    producto: 'Producto',
    productoOtro: 'Otro / no está en la lista',
    cantidad: 'Cantidad',
    fecha: 'Fecha requerida',
    detalles: 'Colores, tallas y detalles',
    detallesPlaceholder: 'Negro · tallas S a XL · logo frontal centrado',
    metodo: 'Método de entrega',
    metodoSinDefinir: 'Aún no lo sé',
    metodoEnvio: 'Envío nacional',
    metodoRetiro: 'Retiro en taller',
    metodoLocal: 'Entrega local coordinada',
    indicaciones: 'Indicaciones adicionales',
    indicacionesPlaceholder:
      'Ubicación del logotipo, colores de referencia, empaque, texto adicional…',
    elegirArchivo: 'Selecciona tu archivo',
    subiendo: 'Subiendo…',
    formatosArchivo: 'PNG, JPG, PDF, AI o SVG · hasta 20 MB',
    archivoGrande: 'El archivo supera los 20 MB. Envíalo por WhatsApp o correo.',
    archivoFallo: 'No pudimos subir el archivo. Inténtalo de nuevo.',
    archivoSinBase:
      'La carga de archivos se activa cuando el sitio esté conectado a Supabase. Mientras tanto, envíanos el diseño por WhatsApp o correo tras enviar la solicitud.',
    avisoArte:
      'Revisamos el arte antes de producir. Si la resolución no alcanza, te avisamos.',
    avisoSinPagos:
      'Sin pagos en línea. Tu solicitud es revisada y confirmada por NYX antes de producción.',
    enviar: 'Enviar solicitud',
    enviando: 'Enviando…',
    disenoAdjunto: 'Tu diseño va adjunto.',
    seguirEditando: 'Seguir editándolo',
    exitoAntetitulo: 'Solicitud recibida',
    exitoTitulo: 'Gracias, ya la tenemos',
    exitoTexto:
      'Guarda esta referencia. NYX revisa tu solicitud y responde con el precio final y el tiempo de entrega.',
    exitoVolver: 'Seguir viendo el catálogo',
    errorNombre: 'Escribe tu nombre para poder responderte.',
    errorCorreo: 'Revisa el correo electrónico: no parece válido.',
    errorProducto: 'Indica qué producto quieres personalizar.',
    errorSinBase:
      'El formulario todavía no está conectado a la base de datos. Escríbenos por WhatsApp o correo y lo gestionamos igual.',
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
    estudio: 'Design Studio',
    nosotros: 'About us',
    preguntas: 'FAQ',
    contacto: 'Contact',
    cotizar: 'Request a quote',
    abrirMenu: 'Open menu',
    cerrarMenu: 'Close menu',
    irAlInicio: 'NYX, go to home',
  },
  pie: {
    lema: 'Personalized products. T-shirts, mugs, tumblers, caps and corporate gifts.',
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
    destacadosNota:
      'One of each technique: sublimation, DTF printing, laser engraving, embroidery and 3D printing.',
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
    respuesta24: 'Reply within 24 business hours',
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
    categorias: 'Categories',
    todas: 'All',
    vacioTitulo: 'We found nothing with those filters',
    vacioTexto: 'Try another category, or tell us what you need and we will quote it.',
    fotoPendiente: 'photo pending',
    verProducto: 'View product',
    solicitar: 'Request',
    tecnicas: 'We make it with',
  },
  producto: {
    referencia: 'Reference',
    precioNota: 'Reference price. NYX confirms the final amount by quantity, material and finish.',
    categoria: 'Category',
    disponibilidad: 'Availability',
    tiempoEstimado: 'Estimated time',
    diasHabiles: '3 to 7 business days',
    cotizar: 'Request a quote',
    preguntarWhatsapp: 'Ask on WhatsApp',
    mensajeWhatsapp: (nombre, sku) => `Hi NYX, I am interested in ${nombre} (${sku}).`,
    avisoArchivo:
      'You can attach your logo or design in the form. We accept PNG, JPG, PDF, AI or SVG. We review the artwork before producing.',
    masDe: (categoria) => `More from ${categoria}`,
  },
  cotizar: {
    titulo: 'Request a quote',
    intro:
      'Tell us what you want to personalize. You will get NYX confirmation with the final price and lead time.',
    migas: 'Quote',
    comoFunciona: 'How it works',
    puntos: [
      'We reply within 24 business hours.',
      'Website prices are for reference; the final one depends on quantity, material and finish.',
      'We review your artwork before producing and tell you if the resolution falls short.',
      'No minimum for individual products. Corporate orders from 10 units.',
    ],
    prefieresEscribir: 'Prefer to write to us?',
    grupoDatos: 'Your details',
    grupoProducto: 'What you want to personalize',
    grupoLogo: 'Your logo or design',
    grupoEntrega: 'Delivery and notes',
    nombre: 'Full name',
    nombrePlaceholder: 'Ana Martinez',
    empresa: 'Company (optional)',
    empresaPlaceholder: 'NYX Studio Inc.',
    correo: 'Email address',
    correoPlaceholder: 'ana@company.com',
    telefono: 'Phone / WhatsApp',
    telefonoPlaceholder: '+593 99 000 0000',
    producto: 'Product',
    productoOtro: 'Other / not on the list',
    cantidad: 'Quantity',
    fecha: 'Date needed',
    detalles: 'Colors, sizes and details',
    detallesPlaceholder: 'Black · sizes S to XL · centered front logo',
    metodo: 'Delivery method',
    metodoSinDefinir: 'Not sure yet',
    metodoEnvio: 'Nationwide shipping',
    metodoRetiro: 'Pickup at the workshop',
    metodoLocal: 'Scheduled local delivery',
    indicaciones: 'Additional notes',
    indicacionesPlaceholder: 'Logo placement, reference colors, packaging, extra text…',
    elegirArchivo: 'Choose your file',
    subiendo: 'Uploading…',
    formatosArchivo: 'PNG, JPG, PDF, AI or SVG · up to 20 MB',
    archivoGrande: 'The file is over 20 MB. Send it on WhatsApp or by email.',
    archivoFallo: 'We could not upload the file. Try again.',
    archivoSinBase:
      'File upload turns on once the site is connected to Supabase. In the meantime, send us the design on WhatsApp or by email after submitting.',
    avisoArte:
      'We review the artwork before producing. If the resolution falls short, we let you know.',
    avisoSinPagos:
      'No online payments. Your request is reviewed and confirmed by NYX before production.',
    enviar: 'Send request',
    enviando: 'Sending…',
    disenoAdjunto: 'Your design is attached.',
    seguirEditando: 'Keep editing it',
    exitoAntetitulo: 'Request received',
    exitoTitulo: 'Thanks, we have it',
    exitoTexto:
      'Keep this reference. NYX reviews your request and replies with the final price and lead time.',
    exitoVolver: 'Keep browsing the catalog',
    errorNombre: 'Write your name so we can reply.',
    errorCorreo: 'Check the email address: it does not look valid.',
    errorProducto: 'Tell us which product you want to personalize.',
    errorSinBase:
      'The form is not connected to the database yet. Write to us on WhatsApp or by email and we will handle it.',
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
