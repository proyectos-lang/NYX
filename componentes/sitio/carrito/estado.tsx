'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  anadirLinea,
  calcularTotal,
  cambiarCantidadLinea,
  contarUnidades,
  normalizarLineas,
  type LineaCarrito,
} from '@/lib/carrito'

/**
 * El carrito, del lado del navegador.
 *
 * Las reglas —stock, totales, normalización— viven en lib/carrito.ts para
 * poder comprobarlas sin navegador. Aquí solo está lo que necesita React:
 * el estado, el contexto y la persistencia.
 *
 * SOLO ADMITE PRODUCTOS DE ENTREGA INMEDIATA, y no es una limitación técnica:
 * un producto personalizable no tiene precio hasta que NYX sabe cuántas
 * unidades, en qué material y con qué acabado. Meterlo en un carrito con un
 * total al pie sería prometer un precio que después cambia, y eso se descubre
 * en el peor momento. Esos siguen por el camino de la cotización.
 *
 * Vive en localStorage y no en la base: no hay cuentas de cliente, así que no
 * hay a quién asociar un carrito guardado en el servidor. El efecto es que el
 * carrito es de ESTE navegador: no viaja al móvil ni sobrevive a borrar los
 * datos del sitio.
 *
 * NO RESERVA STOCK. Añadir algo aquí no lo aparta para nadie; dos personas
 * pueden pedir la última unidad a la vez. Lo confirma NYX al responder, igual
 * que ya pasaba con las cotizaciones.
 */

interface Carrito {
  lineas: LineaCarrito[]
  unidades: number
  total: number | null
  anadir: (linea: Omit<LineaCarrito, 'cantidad'>, cantidad?: number) => void
  cambiarCantidad: (productoId: string, cantidad: number) => void
  quitar: (productoId: string) => void
  vaciar: () => void
  /** false hasta haber leído localStorage: evita parpadeos al cargar. */
  listo: boolean
}

const CLAVE = 'nyx:carrito:v1'

const ContextoCarrito = createContext<Carrito | null>(null)

function leerGuardado(): LineaCarrito[] {
  try {
    const crudo = window.localStorage.getItem(CLAVE)
    return crudo ? normalizarLineas(JSON.parse(crudo)) : []
  } catch {
    // Modo incógnito, almacenamiento bloqueado o JSON roto: el carrito arranca
    // vacío en lugar de tumbar la página.
    return []
  }
}

export function ProveedorCarrito({ children }: { children: React.ReactNode }) {
  const [lineas, setLineas] = useState<LineaCarrito[]>([])
  const [listo, setListo] = useState(false)

  // Se lee DESPUÉS de montar, no durante el render: en el servidor no existe
  // localStorage, y si el primer HTML llevara el carrito lleno, React avisaría
  // de que el cliente no coincide con el servidor.
  useEffect(() => {
    setLineas(leerGuardado())
    setListo(true)
  }, [])

  useEffect(() => {
    if (!listo) return
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(lineas))
    } catch {
      // Sin espacio o almacenamiento bloqueado: el carrito sigue sirviendo en
      // esta pestaña, solo que no sobrevive a recargar.
    }
  }, [lineas, listo])

  const anadir = useCallback(
    (linea: Omit<LineaCarrito, 'cantidad'>, cantidad = 1) =>
      setLineas((previas) => anadirLinea(previas, linea, cantidad)),
    []
  )

  const cambiarCantidad = useCallback(
    (productoId: string, cantidad: number) =>
      setLineas((previas) => cambiarCantidadLinea(previas, productoId, cantidad)),
    []
  )

  const quitar = useCallback(
    (productoId: string) =>
      setLineas((previas) => previas.filter((l) => l.productoId !== productoId)),
    []
  )

  const vaciar = useCallback(() => setLineas([]), [])

  const valor = useMemo<Carrito>(
    () => ({
      lineas,
      unidades: contarUnidades(lineas),
      total: calcularTotal(lineas),
      anadir,
      cambiarCantidad,
      quitar,
      vaciar,
      listo,
    }),
    [lineas, anadir, cambiarCantidad, quitar, vaciar, listo]
  )

  return <ContextoCarrito.Provider value={valor}>{children}</ContextoCarrito.Provider>
}

export function useCarrito(): Carrito {
  const contexto = useContext(ContextoCarrito)

  if (!contexto) {
    throw new Error('useCarrito necesita estar dentro de <ProveedorCarrito>')
  }

  return contexto
}

export type { LineaCarrito }
