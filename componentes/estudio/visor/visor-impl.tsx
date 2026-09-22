'use client'

/**
 * Visor 3D — implementación.
 *
 * No se importa directamente desde el resto del proyecto, sino a través de
 * `../Visor.tsx`, que lo carga con `next/dynamic`: así three + fiber + drei
 * quedan en su propio chunk y no entran en la carga inicial del sitio. Ese
 * archivo explica también por qué NO está aislado del tsconfig.
 */

import { Component, Suspense, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, OrbitControls, useGLTF } from '@react-three/drei'

import {
  componerAtlas,
  componerCara,
  disenoListo,
  precargarDiseno,
  LADO_TEXTURA,
} from '@/lib/estudio/compositor'
import { aplicarMapeo, esMalla } from '@/lib/estudio/mapeo'
import type {
  DiagnosticoVisor,
  Mapeo,
  DisenoEstudio,
  Modelo3D,
  PropsVisor,
} from '@/lib/estudio/tipos'

/**
 * Límite de error alrededor del modelo.
 *
 * Sin esto, un .glb que no carga —404, CORS, archivo corrupto— deja el lienzo
 * en blanco y sin una sola pista de por qué. Era literalmente el caso de
 * "no aparece nada en el 3D" y no había forma de distinguirlo de un problema
 * de texturas.
 *
 * Tiene que ser un componente de clase: React no ofrece límites de error con
 * hooks.
 */
class LimiteDeError extends Component<
  { children: ReactNode; alFallar: (mensaje: string) => void },
  { fallo: boolean }
> {
  state = { fallo: false }

  static getDerivedStateFromError() {
    return { fallo: true }
  }

  componentDidCatch(error: Error) {
    console.error('[nyx] el visor 3D fallo al cargar el modelo', error)
    this.props.alFallar(error.message || 'Error desconocido al cargar el modelo')
  }

  render() {
    return this.state.fallo ? null : this.props.children
  }
}

// ---------------------------------------------------------------------------
// Textura viva
// ---------------------------------------------------------------------------

/**
 * Devuelve SIEMPRE la misma instancia de CanvasTexture; lo que cambia es su
 * contenido. Recrearla en cada edición obligaría a recompilar el material.
 */
function useTexturaDiseno(diseno: DisenoEstudio, mapeo: Mapeo) {
  // La textura TIENE que corresponderse con el mapeo, y no siempre fue asi.
  //
  // Con 'proyeccion' las UVs las genera aplicarMapeo() y mandan cada cara a su
  // mitad de un atlas 2:1. Con 'original' se respetan las del .glb, que son un
  // despliegue propio sobre el cuadrado 0-1 completo: darle el atlas significa
  // que la prenda muestrea a caballo entre las dos mitades segun SU reparto, y
  // el diseno sale descuadrado o irreconocible.
  //
  // Es justo lo que le pasa a un modelo de prenda bien hecho: como trae UVs
  // correctas, el analizador elige 'original' y el resultado no se parece a
  // nada.
  const esAtlas = mapeo === 'proyeccion'

  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = esAtlas ? LADO_TEXTURA * 2 : LADO_TEXTURA
    c.height = LADO_TEXTURA
    return c
  }, [esAtlas])

  const textura = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace

    // Con 'proyeccion', flipY = true: las UVs salen de la Y del modelo, que
    // crece hacia arriba, mientras el canvas crece hacia abajo.
    //
    // Con 'original' manda la convencion de glTF, que es flipY = false. Ponerlo
    // al reves deja el diseno boca abajo sobre la prenda.
    t.flipY = esAtlas

    return t
  }, [canvas, esAtlas])

  const repintar = useCallback(() => {
    // Con las UVs del archivo no hay forma de saber que region es la espalda,
    // asi que se pinta la cara frontal en todo el mapa. Es una limitacion real
    // de 'original', y una razon mas para preferir 'proyeccion'.
    if (esAtlas) componerAtlas(canvas, diseno)
    else componerCara(canvas, diseno, 'frontal')

    textura.needsUpdate = true // avisa a la GPU de que el canvas cambio
  }, [canvas, textura, diseno, esAtlas])

  useEffect(() => {
    let vivo = true
    repintar() // inmediato, con lo que ya haya en caché
    void precargarDiseno(diseno).then(() => {
      if (vivo) repintar()
    })
    return () => {
      vivo = false
    }
  }, [repintar, diseno])

  // Mientras falte alguna imagen se repinta cada cuadro: es la única forma de
  // que un logo recién cargado aparezca sin tocar nada. Cuando están todas,
  // deja de repintar y en reposo no cuesta nada.
  //
  // Un flag "pendiente" que se apagara tras la primera carga dejaría fuera para
  // siempre cualquier imagen que llegue después.
  useFrame(() => {
    if (!disenoListo(diseno)) repintar()
  })

  useEffect(() => () => textura.dispose(), [textura])

  return textura
}

// ---------------------------------------------------------------------------
// La prenda
// ---------------------------------------------------------------------------

function Prenda({
  modelo,
  diseno,
  alDiagnosticar,
}: {
  modelo: Modelo3D
  diseno: DisenoEstudio
  alDiagnosticar?: (d: DiagnosticoVisor) => void
}) {
  const { scene } = useGLTF(modelo.archivoUrl)

  // useGLTF cachea la escena: mutar sus materiales afectaría a cualquier otro
  // visor que cargue el mismo archivo.
  //
  // Y no basta con scene.clone(): Mesh.clone() comparte la geometría por
  // referencia, así que regenerar las UVs pisaría las del original en la
  // caché. Se vería al cambiar un modelo a mapeo "original": mostraría las
  // proyectadas de una visita anterior y no habría forma de recuperarlas sin
  // recargar la página.
  const clon = useMemo(() => {
    const copia = scene.clone(true)

    copia.traverse((obj) => {
      if (esMalla(obj)) obj.geometry = obj.geometry.clone()
    })

    return copia
  }, [scene])

  const textura = useTexturaDiseno(diseno, modelo.mapeo)

  // Las UVs se regeneran una vez por clon, antes de pintar nada.
  useEffect(() => {
    aplicarMapeo(clon, modelo.mapeo)

    // Se mide despues de mapear: unas UVs fuera de [0,1] significan que la
    // textura se recorta contra el borde y la prenda sale de un color plano.
    let min = Infinity
    let max = -Infinity
    let mallas = 0

    clon.traverse((obj) => {
      if (!esMalla(obj)) return
      mallas++
      const uv = obj.geometry.attributes.uv
      if (!uv) return
      for (let i = 0; i < uv.count; i++) {
        const u = uv.getX(i)
        if (u < min) min = u
        if (u > max) max = u
      }
    })

    alDiagnosticar?.({
      mallas,
      rangoUV: Number.isFinite(min) ? { min, max } : undefined,
      mapeo: modelo.mapeo,
      atlas:
        modelo.mapeo === 'proyeccion'
          ? `${LADO_TEXTURA * 2}x${LADO_TEXTURA} (atlas)`
          : `${LADO_TEXTURA}x${LADO_TEXTURA} (cara)`,
    })
  }, [clon, modelo.mapeo, alDiagnosticar])

  useEffect(() => {
    const excluidos = new Set(modelo.materialesExcluidos)

    const pintar = (m?: THREE.Material): THREE.Material => {
      // Cremalleras, botones y cordones se dejan como están.
      if (m && excluidos.has(m.name)) return m

      const nuevo = new THREE.MeshStandardMaterial({
        map: textura,
        roughness: 0.75,
        metalness: 0.02,
        side: THREE.DoubleSide,
      })
      nuevo.name = m?.name ?? ''
      return nuevo
    }

    let pintadas = 0

    clon.traverse((obj) => {
      if (!esMalla(obj)) return

      // CONSERVA LA FORMA del material. three solo interpreta un array cuando
      // la geometría tiene grupos; envolver un material único en un array de
      // uno deja la malla SIN DIBUJAR.
      obj.material = Array.isArray(obj.material)
        ? obj.material.map(pintar)
        : pintar(obj.material)

      pintadas++
    })

    // Sin esto, el fallo es mudo: la prenda sale blanca y no hay nada en
    // consola que lo explique. Que pase significa que el recorrido no reconoce
    // las mallas del .glb, o que todos sus materiales estan excluidos.
    alDiagnosticar?.({ pintadas })
  }, [clon, textura, modelo.materialesExcluidos, alDiagnosticar])

  // Escala y centro vienen medidos al subir el modelo; medir aquí en cada carga
  // sería repetir trabajo y, peor, hacerlo antes de que la malla esté lista.
  const { escala, centro } = modelo

  return (
    <group scale={escala}>
      {/* Centrar en el origen para que OrbitControls gire alrededor de la
          prenda y no de un punto lejano. */}
      <group position={[-centro.x, -centro.y, -centro.z]}>
        <primitive object={clon} />
      </group>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Captura a PNG
// ---------------------------------------------------------------------------

const VISTAS_CAPTURA = ['Frente', 'Lado derecho', 'Espalda', 'Lado izquierdo']

/** Lado maximo de cada vista dentro del compuesto. */
const LADO_VISTA = 512

function Capturador({ alPoderCapturar }: { alPoderCapturar?: (f: () => string | null) => void }) {
  const { gl, scene, camera } = useThree()

  useEffect(() => {
    if (!alPoderCapturar) return

    /**
     * Captura las CUATRO caras de la prenda en una sola imagen 2x2.
     *
     * Cuatro y no una porque quien recibe el pedido necesita ver la espalda y
     * los costados: un diseno con algo en la manga o en la nuca es
     * indistinguible de uno sin nada mirando solo el frente.
     *
     * Y una imagen compuesta en vez de cuatro archivos: cabe en la misma
     * columna vista_previa, se sube de una vez y en el panel se ven las cuatro
     * de un vistazo sin montar una galeria.
     *
     * Los angulos son absolutos, no relativos a como tenga el cliente girada
     * la camara: asi el frente es siempre el frente y las etiquetas no mienten.
     */
    alPoderCapturar(() => {
      try {
        const lienzo = gl.domElement
        const escala = Math.min(1, LADO_VISTA / Math.max(lienzo.width, lienzo.height))
        const ancho = Math.round(lienzo.width * escala)
        const alto = Math.round(lienzo.height * escala)

        const compuesto = document.createElement('canvas')
        compuesto.width = ancho * 2
        compuesto.height = alto * 2

        const ctx = compuesto.getContext('2d')
        if (!ctx) return null

        // El lienzo de WebGL es transparente; sin fondo, el PNG no se veria
        // sobre el blanco del panel.
        ctx.fillStyle = '#0b0b0b'
        ctx.fillRect(0, 0, compuesto.width, compuesto.height)

        const posicion = camera.position.clone()
        const cuaternion = camera.quaternion.clone()

        // Se conservan altura y distancia del cliente, pero no su angulo.
        const radio = Math.hypot(posicion.x, posicion.z) || 1.9

        for (let i = 0; i < 4; i++) {
          const angulo = (i * Math.PI) / 2
          camera.position.set(Math.sin(angulo) * radio, posicion.y, Math.cos(angulo) * radio)
          camera.lookAt(0, 0, 0)
          gl.render(scene, camera)

          const x = (i % 2) * ancho
          const y = Math.floor(i / 2) * alto
          ctx.drawImage(lienzo, x, y, ancho, alto)

          ctx.font = '600 11px ui-monospace, Menlo, monospace'
          ctx.fillStyle = 'rgba(255,255,255,.65)'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'
          ctx.fillText(VISTAS_CAPTURA[i], x + 10, y + 9)
          ctx.fillStyle = '#0b0b0b'
        }

        // Devolver la camara donde estaba y repintar, o el cliente veria la
        // prenda saltar al ultimo angulo capturado.
        camera.position.copy(posicion)
        camera.quaternion.copy(cuaternion)
        gl.render(scene, camera)

        return compuesto.toDataURL('image/png')
      } catch (error) {
        // Canvas "tainted": alguna imagen vino de un host sin CORS.
        console.error('[nyx] no se pudo capturar el visor', error)
        return null
      }
    })
  }, [gl, scene, camera, alPoderCapturar])

  return null
}

// ---------------------------------------------------------------------------
// Escena
// ---------------------------------------------------------------------------

export function VisorImpl({
  modelo,
  diseno,
  alPoderCapturar,
  alDiagnosticar,
}: PropsVisor) {
  return (
    <Canvas
      camera={{ position: [0, 0, 1.9], fov: 35 }}
      // preserveDrawingBuffer hace posible exportar el PNG.
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <directionalLight position={[-4, 2, -3]} intensity={0.45} />

      <LimiteDeError alFallar={(mensaje) => alDiagnosticar?.({ error: mensaje })}>
        <Suspense fallback={null}>
          <Prenda modelo={modelo} diseno={diseno} alDiagnosticar={alDiagnosticar} />
        </Suspense>
      </LimiteDeError>

      {/* En su propio Suspense: el preset descarga un HDR de un CDN externo y
          si tarda o falla, la prenda debe verse igual con las luces de arriba. */}
      <Suspense fallback={null}>
        <Environment preset="studio" />
      </Suspense>

      <Capturador alPoderCapturar={alPoderCapturar} />

      {/* Los límites van acordes al modelo YA normalizado (~1 unidad). Unos
          pensados para otra escala impedirían alejarse para ver la prenda. */}
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={0.6}
        maxDistance={5}
        target={[0, 0, 0]}
      />
    </Canvas>
  )
}

export default VisorImpl
