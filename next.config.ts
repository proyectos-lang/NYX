import type { NextConfig } from 'next'

/**
 * El dominio del bucket de Supabase, para que next/image acepte las fotos que
 * se suben desde el panel.
 *
 * Sin esto, next/image lanza "hostname is not configured" y la página entera
 * deja de renderizar. Y no se ve venir: en desarrollo todas las imágenes son
 * rutas de /assets y funcionan, así que el fallo aparece la primera vez que
 * alguien sube una foto de verdad.
 *
 * Sale de la variable de entorno en vez de estar escrito a mano porque el
 * dominio lleva dentro el identificador del proyecto de Supabase, y cambia si
 * el sitio se mueve a otro.
 */
function dominioDeSupabase(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null

  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

const anfitrion = dominioDeSupabase()

const config: NextConfig = {
  images: {
    remotePatterns: anfitrion
      ? [{ protocol: 'https', hostname: anfitrion, pathname: '/storage/v1/object/public/**' }]
      : [],
  },

  // Las maquetas originales siguen navegables en produccion como referencia
  // visual. Viven en public/, asi que Next las sirve tal cual; esto solo les
  // da rutas legibles.
  async rewrites() {
    return [
      { source: '/maquetas', destination: '/maquetas.html' },
      { source: '/maquetas/web', destination: '/NYX Web.dc.html' },
      { source: '/maquetas/v2', destination: '/NYX Web v2.dc.html' },
      { source: '/maquetas/panel', destination: '/NYX Panel.dc.html' },
    ]
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Las maquetas son datos de demostracion: fuera de los buscadores.
        source: '/maquetas/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/panel/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
}

export default config
