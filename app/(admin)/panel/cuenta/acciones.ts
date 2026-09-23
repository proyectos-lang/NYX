'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { crearClienteServidor } from '@/lib/supabase/server'

const RUTA = '/panel/cuenta'

/** Mínimo real. Supabase acepta 6, pero seis caracteres no protegen nada. */
const MINIMO = 10

function texto(datos: FormData, campo: string): string {
  const valor = datos.get(campo)
  return typeof valor === 'string' ? valor : ''
}

function conAviso(mensaje: string): string {
  return `${RUTA}?aviso=${encodeURIComponent(mensaje)}`
}

function conError(mensaje: string): string {
  return `${RUTA}?error=${encodeURIComponent(mensaje)}`
}

/**
 * Cambia la contraseña de quien ha iniciado sesión.
 *
 * PIDE LA ACTUAL, aunque Supabase no lo exija. Sin eso, cualquiera que
 * encuentre una sesión abierta —un portátil sin bloquear, una cuenta olvidada
 * en un ordenador compartido— puede cambiar la contraseña y dejar fuera al
 * dueño. Pedirla convierte "tener la pantalla delante" en "saber la clave".
 *
 * La comprobación usa un cliente APARTE, con la sesión desactivada. Si se
 * hiciera con el cliente normal, el intento de acceso reescribiría las cookies
 * de sesión de quien está dentro; y si la contraseña fuera incorrecta, podría
 * dejarle la sesión en un estado raro por equivocarse al teclear.
 */
export async function cambiarContrasena(datos: FormData): Promise<void> {
  const actual = texto(datos, 'actual')
  const nueva = texto(datos, 'nueva')
  const repetida = texto(datos, 'repetida')

  let destino: string

  try {
    const supabase = await crearClienteServidor()
    const { data: sesion } = await supabase.auth.getUser()
    const email = sesion.user?.email

    if (!email) {
      redirect('/login?volver=/panel/cuenta')
    }

    if (!actual || !nueva) {
      redirect(conError('Rellena los tres campos.'))
    }

    if (nueva !== repetida) {
      redirect(conError('Las dos contraseñas nuevas no coinciden.'))
    }

    if (nueva.length < MINIMO) {
      redirect(conError(`La contraseña nueva necesita al menos ${MINIMO} caracteres.`))
    }

    if (nueva === actual) {
      redirect(conError('La contraseña nueva es igual que la actual.'))
    }

    // Cliente de usar y tirar: comprueba la contraseña actual sin tocar la
    // sesión que hay abierta en las cookies.
    const verificador = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { error: errorActual } = await verificador.auth.signInWithPassword({
      email,
      password: actual,
    })

    if (errorActual) {
      redirect(conError('La contraseña actual no es correcta.'))
    }

    const { error } = await supabase.auth.updateUser({ password: nueva })

    if (error) {
      // El mensaje de Supabase aquí sí sirve: suele explicar por qué rechaza
      // la contraseña (demasiado corta, filtrada en alguna brecha conocida).
      console.error('[nyx] no se pudo cambiar la contraseña', error.message)
      redirect(conError(error.message))
    }

    destino = conAviso('Contraseña cambiada. Úsala la próxima vez que entres.')
  } catch (error) {
    // redirect() lanza por dentro: si es suyo, hay que dejarlo pasar o el
    // formulario se quedaría sin respuesta.
    if (error && typeof error === 'object' && 'digest' in error) throw error

    console.error('[nyx] error inesperado al cambiar la contraseña', error)
    destino = conError('No se pudo cambiar la contraseña. Inténtalo de nuevo.')
  }

  redirect(destino)
}
