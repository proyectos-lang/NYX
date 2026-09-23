import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { IDIOMAS, SIN_PREFIJO } from '@/lib/i18n'

/** Rutas que no son del sitio publico y no llevan idioma. */
const SIN_IDIOMA = ['/panel', '/login', '/api', '/maquetas']

/**
 * El espanol vive en / pero por dentro es /es.
 *
 * Hace falta que cada idioma tenga su propia ruta interna para que tenga su
 * propia pagina guardada: si las dos compartieran ruta, compartirian cache y
 * la version inglesa acabaria sirviendo espanol a quien llegara despues.
 *
 * Se reescribe, no se redirige: la direccion que ve quien navega sigue siendo
 * la corta.
 */
function reescribirIdioma(peticion: NextRequest): NextResponse | null {
  const ruta = peticion.nextUrl.pathname

  if (SIN_IDIOMA.some((p) => ruta === p || ruta.startsWith(p + '/'))) return null

  // Ya lleva prefijo de idioma: se deja tal cual.
  for (const idioma of IDIOMAS) {
    if (ruta === '/' + idioma || ruta.startsWith('/' + idioma + '/')) return null
  }

  const destino = peticion.nextUrl.clone()
  destino.pathname = '/' + SIN_PREFIJO + (ruta === '/' ? '' : ruta)
  return NextResponse.rewrite(destino)
}

/**
 * Hace dos cosas en cada peticion:
 *
 *   1. Refresca el token de Supabase y reescribe las cookies. Sin esto, la
 *      sesion caduca a los pocos minutos dentro de los Server Components.
 *   2. Cierra /panel a quien no haya iniciado sesion.
 *
 * Importante: getUser() valida el token contra Supabase. getSession() solo lee
 * la cookie y se puede falsificar, asi que no sirve para proteger rutas.
 */
export async function middleware(peticion: NextRequest) {
  const conIdioma = reescribirIdioma(peticion)
  if (conIdioma) return conIdioma

  let respuesta = NextResponse.next({ request: peticion })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Sin Supabase configurado no hay sesión que refrescar, y crear el cliente
  // lanzaría una excepción que dejaría el sitio entero inaccesible. El sitio
  // público debe seguir funcionando con los datos de demostración; el panel se
  // manda a /login, que es quien explica lo que falta.
  if (!url || !clave) {
    if (peticion.nextUrl.pathname.startsWith('/panel')) {
      const destino = peticion.nextUrl.clone()
      destino.pathname = '/login'
      destino.search = ''
      return NextResponse.redirect(destino)
    }
    return respuesta
  }

  const supabase = createServerClient(url, clave, {
    cookies: {
      getAll() {
        return peticion.cookies.getAll()
      },
      setAll(cookiesNuevas) {
        for (const { name, value } of cookiesNuevas) {
          peticion.cookies.set(name, value)
        }
        respuesta = NextResponse.next({ request: peticion })
        for (const { name, value, options } of cookiesNuevas) {
          respuesta.cookies.set(name, value, options)
        }
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ruta = peticion.nextUrl.pathname

  if (ruta.startsWith('/panel') && !user) {
    const destino = peticion.nextUrl.clone()
    destino.pathname = '/login'
    destino.searchParams.set('volver', ruta)
    return NextResponse.redirect(destino)
  }

  if (ruta === '/login' && user) {
    const destino = peticion.nextUrl.clone()
    destino.pathname = '/panel/pedidos'
    destino.search = ''
    return NextResponse.redirect(destino)
  }

  return respuesta
}

export const config = {
  matcher: [
    // Todo menos estaticos de Next, imagenes y las maquetas de public/.
    '/((?!_next/static|_next/image|favicon.ico|assets|support.js|maquetas|.*\.(?:html|png|jpg|jpeg|webp|avif|svg|mp4|ico)$).*)',
  ],
}
