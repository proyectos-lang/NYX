/**
 * Estudio de diseño — compositor.
 *
 * Pinta el diseño en un `<canvas>` 2D. Sin React y sin three, a propósito: lo
 * usan tanto el editor 2D como el visor 3D, y si cada uno pintara por su
 * cuenta, la previsualización y el modelo acabarían mostrando cosas distintas.
 *
 * Solo funciona en el navegador (usa `Image` y `document`).
 */

import { VISTAS, type CaraDiseno, type CapaLogo, type DisenoEstudio, type Vista } from './tipos'

/** Potencia de dos: es lo que espera WebGL para poder generar mipmaps. */
export const LADO_TEXTURA = 1024

// ---------------------------------------------------------------------------
// Caché de imágenes
// ---------------------------------------------------------------------------

/**
 * Hay dos mapas, pero UNA sola vía de entrada.
 *
 * `cacheImagenes` evita lanzar dos peticiones para la misma URL; `resueltas`
 * permite consultar de forma síncrona desde el bucle de dibujo, que no puede
 * esperar promesas.
 *
 * Lo importante es que `resueltas` se rellena **dentro del `onload`** de la
 * única promesa que existe por URL. Si en su lugar se rellenara desde un
 * `.then()` del llamante, habría dos cachés de verdad: la precarga llenaría
 * una y el dibujo consultaría la otra, siempre vacía. El síntoma de ese bug es
 * desconcertante — el modelo 3D solo muestra el color de fondo, porque es lo
 * único que no necesita cargar nada.
 */
const cacheImagenes = new Map<string, Promise<HTMLImageElement>>()
const resueltas = new Map<string, HTMLImageElement>()

export function cargarImagen(url: string): Promise<HTMLImageElement> {
  const cacheada = cacheImagenes.get(url)
  if (cacheada) return cacheada

  const promesa = new Promise<HTMLImageElement>((resolver, rechazar) => {
    const img = new Image()

    // Sin esto el canvas queda "tainted" y toDataURL() lanza al exportar.
    // Obliga a que el host de las imágenes responda con CORS.
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      resueltas.set(url, img)
      resolver(img)
    }
    img.onerror = () => {
      // Que un fallo de red no envenene la caché para siempre.
      cacheImagenes.delete(url)
      rechazar(new Error(`No se pudo cargar la imagen: ${url}`))
    }

    img.src = url
  })

  cacheImagenes.set(url, promesa)
  return promesa
}

/** Todas las URLs que necesita un diseño, sin repetir. */
function urlsDe(diseno: DisenoEstudio): Set<string> {
  const urls = new Set<string>()
  for (const cara of Object.values(diseno.caras)) {
    if (cara.textura?.url) urls.add(cara.textura.url)
  }
  for (const logo of diseno.logos) urls.add(logo.url)
  return urls
}

export async function precargarDiseno(diseno: DisenoEstudio): Promise<void> {
  // allSettled y no all: una imagen rota no debe tumbar la composición entera.
  await Promise.allSettled([...urlsDe(diseno)].map((url) => cargarImagen(url)))
}

/**
 * Consulta síncrona. Si la imagen no está, lanza la carga y devuelve null: esa
 * capa se salta este cuadro y aparecerá en cuanto llegue.
 */
function imagenLista(url: string): HTMLImageElement | null {
  const ya = resueltas.get(url)
  if (ya) return ya

  void cargarImagen(url).catch(() => undefined)
  return null
}

/** ¿Están ya todas las imágenes del diseño? El visor lo usa para dejar de repintar. */
export function disenoListo(diseno: DisenoEstudio): boolean {
  for (const url of urlsDe(diseno)) {
    if (!resueltas.has(url)) return false
  }
  return true
}

/** Solo para las pruebas: vacía la caché entre casos. */
export function vaciarCache(): void {
  cacheImagenes.clear()
  resueltas.clear()
}

// ---------------------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------------------

function acotar(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor))
}

/**
 * Textura en mosaico.
 *
 * El patrón de canvas se ancla al origen, así que para escalarlo y rotarlo hay
 * que transformar el contexto. El área pintada se compensa con la diagonal: si
 * se pintara solo el cuadrado, al rotar quedarían esquinas sin cubrir.
 */
function pintarTextura(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cara: CaraDiseno,
  lado: number
): void {
  const t = cara.textura
  if (!t) return

  const patron = ctx.createPattern(img, 'repeat')
  if (!patron) return

  ctx.save()
  ctx.globalAlpha = acotar(t.opacidad, 0, 1)

  const escala = t.escala > 0 ? t.escala : 1
  const diagonal = lado * Math.SQRT2

  ctx.translate(lado / 2, lado / 2)
  ctx.rotate(((t.rotacion || 0) * Math.PI) / 180)
  ctx.scale(escala, escala)
  ctx.fillStyle = patron
  ctx.fillRect(
    -diagonal / (2 * escala),
    -diagonal / (2 * escala),
    diagonal / escala,
    diagonal / escala
  )
  ctx.restore()
}

/**
 * Logo.
 *
 * El alto sale de la proporción real de la imagen. Escalar los dos ejes por
 * separado deforma el logo, que es justo lo que un cliente nota al instante.
 */
function pintarLogo(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  logo: CapaLogo,
  lado: number
): void {
  const ancho = (logo.ancho / 100) * lado
  const alto = ancho * (img.naturalHeight / (img.naturalWidth || 1))

  ctx.save()
  ctx.globalAlpha = acotar(logo.opacidad, 0, 1)
  ctx.translate((logo.x / 100) * lado, (logo.y / 100) * lado)
  if (logo.rotacion) ctx.rotate((logo.rotacion * Math.PI) / 180)
  ctx.drawImage(img, -ancho / 2, -alto / 2, ancho, alto)
  ctx.restore()
}

/**
 * Pinta una cara completa.
 *
 * Síncrona a propósito: el visor repinta dentro de su bucle de animación y no
 * puede esperar promesas. Lo que no esté cargado se salta y entra al cuadro
 * siguiente.
 */
export function componerCara(
  canvas: HTMLCanvasElement,
  diseno: DisenoEstudio,
  vista: Vista,
  lado: number = LADO_TEXTURA
): void {
  canvas.width = lado
  canvas.height = lado

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const cara = diseno.caras[vista]

  ctx.clearRect(0, 0, lado, lado)
  ctx.fillStyle = cara.color || '#FFFFFF'
  ctx.fillRect(0, 0, lado, lado)

  if (cara.textura) {
    const img = imagenLista(cara.textura.url)
    if (img) pintarTextura(ctx, img, cara, lado)
  }

  const logos = diseno.logos
    .filter((l) => l.vista === vista)
    .sort((a, b) => a.z - b.z)

  for (const logo of logos) {
    const img = imagenLista(logo.url)
    if (img) pintarLogo(ctx, img, logo, lado)
  }
}

/**
 * Atlas de dos caras.
 *
 * Frente y espalda comparten malla en un .glb y no se pueden separar de forma
 * fiable, así que van en un solo mapa lado a lado y son las UVs las que mandan
 * cada cara a su mitad.
 *
 * 2048×1024 sigue siendo potencia de dos en ambos lados, que es lo que hace
 * falta para los mipmaps.
 */
export function componerAtlas(
  canvas: HTMLCanvasElement,
  diseno: DisenoEstudio,
  lado: number = LADO_TEXTURA
): void {
  canvas.width = lado * 2
  canvas.height = lado

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, lado * 2, lado)

  // Reutiliza componerCara en vez de repetir aquí las reglas de dibujo: si
  // divergieran, el 3D y la previsualización 2D dejarían de coincidir.
  const temporal = document.createElement('canvas')
  VISTAS.forEach((vista, i) => {
    componerCara(temporal, diseno, vista, lado)
    ctx.drawImage(temporal, i * lado, 0)
  })
}
