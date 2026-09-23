import type { Metadata } from 'next'
import Acceso from './Acceso'

export const metadata: Metadata = {
  title: 'Acceso al panel',
  robots: { index: false, follow: false },
}

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string }>
}) {
  const { volver } = await searchParams
  // El middleware manda aqui con ?volver=<ruta> al cortar el acceso al panel.
  const destino = volver?.startsWith('/panel') ? volver : '/panel/pedidos'

  return <Acceso volver={destino} />
}
