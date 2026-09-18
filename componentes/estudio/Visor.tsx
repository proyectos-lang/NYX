'use client'

import dynamic from 'next/dynamic'
import type { PropsVisor } from '@/lib/estudio/tipos'

/**
 * Puente entre el proyecto y el visor 3D.
 *
 * La carga es diferida porque three + fiber + drei pesan cerca de un megabyte y
 * no tienen por qué entrar en la carga inicial del sitio: quedan en su propio
 * chunk, que solo se pide al abrir la pestaña 3D. Y `ssr: false` porque el
 * visor toca `document` y WebGL.
 *
 * Nota sobre una receta que NO se usó aquí. Es habitual aislar el visor en una
 * carpeta excluida del tsconfig e importarla con la ruta guardada en una
 * constante, para que TypeScript no la resuelva: @react-three/fiber amplía el
 * JSX global de React con `declare module 'react'` y en algunas combinaciones
 * de versiones eso deja a `never` las props comunes de `React.ElementType`,
 * rompiendo cualquier `<Algo className="…" />` del resto del proyecto.
 *
 * Se probó y en este proyecto (React 19.2, TS 5.6, fiber 9.7) ese problema no
 * aparece: `npm run typecheck` pasa limpio con los tipos de fiber dentro. En
 * cambio, la ruta en constante sí rompía algo real — webpack no puede resolver
 * un import dinámico que no sea literal, avisaba con "Critical dependency: the
 * request of a dependency is an expression" y NO generaba el chunk, así que el
 * visor fallaba al abrirlo.
 *
 * Si al actualizar versiones reaparece el colapso de tipos, la salida es
 * declarar un alias en next.config y un `declare module` propio: el import
 * sigue siendo literal (webpack lo resuelve) pero TypeScript usa los tipos
 * declarados en vez de leer el archivo.
 */

function Cargando() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--negro-4)',
        font: '400 11px/1.6 ui-monospace, Menlo, monospace',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--gris-suave)',
      }}
    >
      Cargando visor 3D…
    </div>
  )
}

export const Visor = dynamic<PropsVisor>(
  () => import('./visor/visor-impl').then((m) => m.VisorImpl),
  { ssr: false, loading: Cargando }
)

export default Visor
