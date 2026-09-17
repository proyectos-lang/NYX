import e from '@/app/panel/Panel.module.css'

/**
 * Banda de confirmacion o de error. Los Server Actions del panel redirigen con
 * ?aviso= o ?error=, asi que el mensaje sobrevive a la recarga del formulario
 * y se ve aunque el navegador no ejecute JavaScript.
 */
export default function Aviso({ aviso, error }: { aviso?: string; error?: string }) {
  if (error) {
    return (
      <div className={`${e.aviso} ${e.avisoError}`} role="alert">
        No se pudo guardar: {error}
      </div>
    )
  }

  if (aviso) {
    return (
      <div className={e.aviso} role="status">
        {aviso}
      </div>
    )
  }

  return null
}
