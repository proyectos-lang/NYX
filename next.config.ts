import type { NextConfig } from 'next'

const config: NextConfig = {
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
