import type { Metadata } from 'next'
import { obtenerModelos3D } from '@/lib/estudio/servidor'
import Estudio from '@/componentes/estudio/Estudio'
import { cargarDiseno } from './acciones'

// El estudio es interactivo de principio a fin: no tiene sentido prerenderizarlo.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Estudio de diseno',
  description:
    'Elige color, textura y logotipo, y mira tu prenda personalizada en 3D antes de pedirla.',
}

export default async function PaginaEstudio({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>
}) {
  // ?d=<token> retoma un diseno guardado. Va en la URL y no solo en el
  // almacenamiento del navegador para que el enlace se pueda compartir: el
  // cliente manda su diseno a un companero, o NYX lo abre desde el pedido.
  const [{ d: token }, modelos] = await Promise.all([searchParams, obtenerModelos3D()])

  const diseno = token ? await cargarDiseno(token) : null

  return (
    <Estudio
      modelos={modelos}
      disenoInicial={diseno ?? undefined}
      // Si el token no resolvio a nada (borrado, o mal copiado), se empieza en
      // blanco en vez de arrastrar un token muerto que luego no actualizaria.
      tokenInicial={diseno ? token : undefined}
    />
  )
}
