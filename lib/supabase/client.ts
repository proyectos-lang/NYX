'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Cliente para componentes del navegador. Usa la clave anon, asi que todo lo
 * que haga pasa por las politicas RLS.
 */
export function crearClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
