import type { Metadata } from 'next'
import { obtenerModelos3D } from '@/lib/estudio/servidor'
import Estudio from '@/componentes/estudio/Estudio'

// El estudio es interactivo de principio a fin: no tiene sentido prerenderizarlo.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Estudio de diseno',
  description:
    'Elige color, textura y logotipo, y mira tu prenda personalizada en 3D antes de pedirla.',
}

export default async function PaginaEstudio() {
  const modelos = await obtenerModelos3D()

  return <Estudio modelos={modelos} />
}
