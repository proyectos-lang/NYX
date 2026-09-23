import type { Metadata } from 'next'
import { obtenerModelos3D } from '@/lib/estudio/servidor'
import Estudio from '@/componentes/estudio/Estudio'
import { cargarDiseno } from './acciones'
import { CLASES_FUENTES } from './fuentes'
import { esIdioma, type Idioma } from '@/lib/i18n'

// El estudio es interactivo de principio a fin: no tiene sentido prerenderizarlo.
export const dynamic = 'force-dynamic'

/** La textura desaparecio del estudio, asi que el texto tampoco la menciona. */
const META: Record<Idioma, { title: string; description: string }> = {
  es: {
    title: 'Estudio de diseño',
    description:
      'Elige el color, coloca tu logotipo y mira tu prenda personalizada en 3D antes de pedirla.',
  },
  en: {
    title: 'Design studio',
    description:
      'Pick the color, place your logo and see your personalized garment in 3D before ordering.',
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ idioma: string }>
}): Promise<Metadata> {
  const { idioma: crudo } = await params
  return META[esIdioma(crudo) ? crudo : 'es']
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
    // Las variables de fuente cuelgan de aqui y no del <html>: solo hacen falta
    // en esta pagina.
    <div className={CLASES_FUENTES}>
      <Estudio
        modelos={modelos}
        disenoInicial={diseno ?? undefined}
        // Si el token no resolvio a nada (borrado, o mal copiado), se empieza
        // en blanco en vez de arrastrar un token muerto que luego no
        // actualizaria.
        tokenInicial={diseno ? token : undefined}
      />
    </div>
  )
}
