import e from '@/app/(admin)/panel/Panel.module.css'

/**
 * Lo que ve el panel cuando no puede leer la base de datos.
 *
 * ENSEÑA EL ERROR REAL, no una suposición.
 *
 * Antes daba siempre el mismo consejo —"revisa que tu usuario tenga fila en
 * `perfiles`"— pasara lo que pasara. Cuando el fallo era otro, ese texto
 * mandaba a buscar por donde no era, y con toda la confianza del mundo. Un
 * mensaje de error que adivina cuesta más tiempo que uno que solo dice "no
 * pude".
 *
 * Las causas probables siguen ahí, pero como pistas y después del motivo, no
 * en su lugar.
 */

/** El mensaje que trae el fallo, mirando también dentro de `cause`. */
function motivo(error: unknown): string | null {
  if (!error) return null

  if (error instanceof Error) {
    // SinConexion envuelve el error de PostgREST: lo interesante está dentro.
    const causa = error.cause
    if (causa) {
      if (typeof causa === 'string') return causa
      if (typeof causa === 'object' && 'message' in causa) {
        return String((causa as { message: unknown }).message)
      }
    }
    return error.message
  }

  return typeof error === 'string' ? error : null
}

export default function SinDatos({ error }: { error: unknown }) {
  const faltaConfigurar =
    !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (faltaConfigurar) {
    return (
      <div className={e.aviso}>
        <strong>Supabase todavía no está conectado.</strong>
        <br />
        Crea un proyecto en supabase.com, copia la URL y la clave anon a{' '}
        <code>.env.local</code> y aplica el esquema con <code>npm run db:push</code>. El
        panel funcionará en cuanto existan esas variables.
      </div>
    )
  }

  console.error('[nyx] el panel no pudo leer la base de datos', error)

  const detalle = motivo(error)

  // Una columna que no existe casi siempre significa que falta ejecutar el
  // script de contenido, y conviene decirlo en vez de dejar el mensaje crudo
  // de PostgREST, que no le dice nada a quien administra el sitio.
  const faltaColumna = Boolean(detalle && /does not exist|no existe la columna/i.test(detalle))

  return (
    <div className={`${e.aviso} ${e.avisoError}`}>
      <strong>No pudimos leer la base de datos.</strong>

      {detalle && (
        <>
          <br />
          <span style={{ font: '400 11.5px/1.6 ui-monospace, Menlo, monospace' }}>
            {detalle}
          </span>
        </>
      )}

      <br />

      {faltaColumna ? (
        <>
          Parece que falta aplicar <code>supabase/contenido-inicial.sql</code>. Pégalo en el
          editor SQL de Supabase y vuelve a cargar esta página.
        </>
      ) : (
        <>
          Comprueba que el proyecto de Supabase esté activo y que tu usuario tenga fila en{' '}
          <code>perfiles</code>: sin ella, las políticas RLS no devuelven nada.
        </>
      )}
    </div>
  )
}
