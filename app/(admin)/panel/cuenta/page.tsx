import { obtenerPerfil } from '@/lib/panel'
import { cambiarContrasena } from './acciones'
import Aviso from '@/componentes/panel/Aviso'
import e from '../Panel.module.css'

export const metadata = { title: 'Tu cuenta' }

export default async function CuentaPanel({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string; error?: string }>
}) {
  const { aviso, error: errorUrl } = await searchParams

  // Si la base no responde, la pantalla sigue siendo usable: cambiar la
  // contraseña es cosa de Auth, no de las tablas del esquema.
  let nombre: string | null = null
  let rol: string | null = null

  try {
    const perfil = await obtenerPerfil()
    nombre = perfil?.nombre ?? null
    rol = perfil?.rol ?? null
  } catch {
    // Silencio: el formulario de abajo no depende de esto.
  }

  return (
    <>
      <Aviso aviso={aviso} error={errorUrl} />

      <div className={e.cabeceraPantalla}>
        <div>
          <span className={e.antetituloPantalla}>Tu cuenta</span>
          <h1 className={e.tituloPantalla}>Contraseña y acceso</h1>
          <p className={e.pistaPantalla}>
            Esto solo afecta a tu acceso al panel. Los datos que ve el público se cambian en
            Contacto y pie.
          </p>
        </div>
      </div>

      <div className={e.tarjeta}>
        <div className={e.tarjetaPad}>
          {(nombre || rol) && (
            <p
              style={{
                margin: '0 0 24px',
                paddingBottom: 20,
                borderBottom: '1px solid rgba(0,0,0,.08)',
                font: '300 12px/1.7 var(--fuente-sans), sans-serif',
                color: '#6f6f6f',
              }}
            >
              Estás dentro como <strong style={{ color: 'var(--negro)' }}>{nombre ?? 'usuario'}</strong>
              {rol ? `, con permisos de ${rol}` : ''}.
            </p>
          )}

          <form action={cambiarContrasena}>
            <div className={e.rejillaCampos}>
              <div className={e.completo}>
                <label className={e.etiqueta} htmlFor="actual">
                  Contraseña actual
                </label>
                <input
                  className={e.campo}
                  id="actual"
                  name="actual"
                  type="password"
                  required
                  autoComplete="current-password"
                />
                {/* Se pide aunque Supabase no lo exija: sin ella, cualquiera que
                    encuentre la sesión abierta puede cambiarla y dejar fuera al
                    dueño de la cuenta. */}
                <p
                  style={{
                    margin: '8px 0 0',
                    font: '300 11px/1.6 var(--fuente-sans), sans-serif',
                    color: '#8a8a8a',
                  }}
                >
                  La pedimos para asegurarnos de que eres tú, no solo alguien con esta
                  pantalla delante.
                </p>
              </div>

              <div>
                <label className={e.etiqueta} htmlFor="nueva">
                  Contraseña nueva
                </label>
                <input
                  className={e.campo}
                  id="nueva"
                  name="nueva"
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className={e.etiqueta} htmlFor="repetida">
                  Repite la nueva
                </label>
                <input
                  className={e.campo}
                  id="repetida"
                  name="repetida"
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <p
              style={{
                margin: '14px 0 0',
                font: '300 11.5px/1.65 var(--fuente-sans), sans-serif',
                color: '#6f6f6f',
                maxWidth: '62ch',
              }}
            >
              Al menos 10 caracteres. Mejor tres o cuatro palabras que recuerdes que una
              palabra con símbolos raros: es más larga, más difícil de adivinar y no hace
              falta apuntarla en un papel.
            </p>

            <div className={e.acciones}>
              <button type="submit" className={e.boton}>
                Cambiar contraseña
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
