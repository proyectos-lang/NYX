import e from '@/app/panel/Panel.module.css'

/**
 * Lo que ve el panel cuando no puede leer la base de datos. Distingue el caso
 * "todavia no esta configurado" del caso "hay un fallo", porque la accion a
 * tomar es distinta.
 */
export default function SinDatos({ error }: { error: unknown }) {
  const faltaConfigurar =
    !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (faltaConfigurar) {
    return (
      <div className={e.aviso}>
        <strong>Supabase todavia no esta conectado.</strong>
        <br />
        Crea un proyecto en supabase.com, copia la URL y la clave anon a{' '}
        <code>.env.local</code> y aplica el esquema con <code>npm run db:push</code>. El
        panel funcionara en cuanto existan esas variables.
      </div>
    )
  }

  console.error('[nyx] el panel no pudo leer la base de datos', error)

  return (
    <div className={`${e.aviso} ${e.avisoError}`}>
      <strong>No pudimos leer la base de datos.</strong>
      <br />
      Revisa que el proyecto de Supabase este activo y que tu usuario tenga fila en la tabla{' '}
      <code>perfiles</code>: sin ella, las politicas RLS no devuelven nada.
    </div>
  )
}
