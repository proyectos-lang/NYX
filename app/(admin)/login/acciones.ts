'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { crearClienteServidor } from '@/lib/supabase/server'
import { hayBaseDeDatos } from '@/lib/consultas'

export interface EstadoAcceso {
  error?: string
}

export async function iniciarSesion(
  _previo: EstadoAcceso,
  datos: FormData
): Promise<EstadoAcceso> {
  if (!hayBaseDeDatos()) {
    return {
      error:
        'Supabase todavía no está configurado. Añade NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.',
    }
  }

  const email = String(datos.get('email') ?? '').trim()
  const password = String(datos.get('password') ?? '')
  const volver = String(datos.get('volver') ?? '/panel/pedidos')

  if (!email || !password) {
    return { error: 'Escribe tu correo y tu contraseña.' }
  }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // No se distingue "usuario no existe" de "contraseña incorrecta": decirlo
    // permitiría averiguar qué correos tienen cuenta.
    console.error('[nyx] acceso denegado', error.message)
    return { error: 'Correo o contraseña incorrectos.' }
  }

  // Solo el staff entra al panel. Alguien puede tener cuenta en Auth sin fila
  // en perfiles, y entonces RLS le dejaría ver la web pero nada del panel.
  const { data: esStaff } = await supabase.rpc('es_staff')

  if (!esStaff) {
    await supabase.auth.signOut()
    return { error: 'Tu cuenta no tiene acceso al panel. Pide a un administrador que te dé de alta.' }
  }

  // El panel es lo unico que cambia al entrar o salir; el sitio publico no
  // depende de la sesion. Antes decia '/', que era el layout raiz cuando habia
  // uno solo: al separar el sitio y el panel en dos raices dejo de existir.
  revalidatePath('/panel', 'layout')
  // Solo rutas internas: un "volver" con dominio ajeno sería un redirect abierto.
  redirect(volver.startsWith('/panel') ? volver : '/panel/pedidos')
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor()
  await supabase.auth.signOut()
  // El panel es lo unico que cambia al entrar o salir; el sitio publico no
  // depende de la sesion. Antes decia '/', que era el layout raiz cuando habia
  // uno solo: al separar el sitio y el panel en dos raices dejo de existir.
  revalidatePath('/panel', 'layout')
  redirect('/')
}
