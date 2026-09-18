'use client'

import { createBrowserClient } from '@supabase/ssr'
import { ESQUEMA } from './esquema'

/**
 * Cliente para componentes del navegador. Usa la clave anon, asi que todo lo
 * que haga pasa por las politicas RLS.
 *
 * El esquema es `nyx`, no `public`. Sin esta opcion, cada consulta buscaria las
 * tablas en public y devolveria 404. Y aparte de esto hace falta que `nyx` este
 * en Settings -> API -> Exposed schemas del panel de Supabase.
 */
export function crearClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: ESQUEMA } }
  )
}
