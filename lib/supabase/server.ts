import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { ESQUEMA } from './esquema'

/**
 * Cliente para Server Components, Server Actions y Route Handlers.
 *
 * Lee la sesion de las cookies. En un Server Component escribir cookies no
 * esta permitido, por eso el setAll se traga el error: ahi el refresco de
 * sesion ya lo hizo el middleware.
 */
export async function crearClienteServidor() {
  const almacen = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: ESQUEMA },
      cookies: {
        getAll() {
          return almacen.getAll()
        },
        setAll(cookiesNuevas) {
          try {
            for (const { name, value, options } of cookiesNuevas) {
              almacen.set(name, value, options)
            }
          } catch {
            // Server Component: el middleware ya refresco la sesion.
          }
        },
      },
    }
  )
}
