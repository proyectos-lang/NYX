import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { ESQUEMA } from './esquema'

/**
 * Cliente con la clave service_role: SE SALTA TODAS LAS POLITICAS RLS.
 *
 * El import de 'server-only' hace que el build falle si alguien lo importa
 * por accidente desde un componente de cliente, que es justo el error que
 * filtraria la clave al navegador.
 *
 * Usalo solo cuando de verdad haga falta saltarse RLS (webhooks, tareas
 * programadas, migraciones de datos). Para todo lo demas, crearClienteServidor.
 */
export function crearClienteAdmin() {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!clave) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY. Revisa .env.local (o las variables de entorno en Vercel).'
    )
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, clave, {
    db: { schema: ESQUEMA },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
