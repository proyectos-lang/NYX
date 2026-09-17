'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { iniciarSesion, type EstadoAcceso } from './acciones'
import e from './Login.module.css'

function BotonEntrar() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={e.entrar} disabled={pending}>
      {pending ? 'Entrando…' : 'Entrar al panel'}
    </button>
  )
}

export default function Acceso({ volver }: { volver: string }) {
  const [estado, accion] = useActionState<EstadoAcceso, FormData>(iniciarSesion, {})

  return (
    <div className={e.pantalla}>
      <form className={e.caja} action={accion}>
        <Image
          src="/assets/nyx-logo-dark.png"
          alt="NYX"
          width={160}
          height={44}
          className={e.marca}
          priority
        />

        <div className={e.antetituloAcceso}>Acceso privado</div>
        <h1 className={e.titulo}>Panel de administración</h1>
        <p className={e.subtitulo}>
          Pedidos, catálogo y contenido del sitio. Solo para el equipo de NYX.
        </p>

        <div className={e.campos}>
          {estado.error && (
            <p className={e.error} role="alert">
              {estado.error}
            </p>
          )}

          <div>
            <label className={e.etiqueta} htmlFor="email">
              Correo electrónico
            </label>
            <input
              className={e.campo}
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="ana@nyx.ec"
            />
          </div>

          <div>
            <label className={e.etiqueta} htmlFor="password">
              Contraseña
            </label>
            <input
              className={e.campo}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </div>

          <input type="hidden" name="volver" value={volver} />

          <BotonEntrar />
        </div>

        <span className={e.nota}>
          ¿Olvidaste la contraseña? Pide a un administrador que la restablezca desde Supabase.
        </span>

        <Link href="/" className={e.volver}>
          ← Volver al sitio
        </Link>
      </form>
    </div>
  )
}
