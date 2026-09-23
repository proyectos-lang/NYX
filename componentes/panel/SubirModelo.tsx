'use client'

import { useRef, useState } from 'react'
import { crearClienteNavegador } from '@/lib/supabase/client'
import { guardarModelo3D } from '@/app/(admin)/panel/acciones'
import type { Mapeo } from '@/lib/estudio/tipos'
import e from '@/app/(admin)/panel/Panel.module.css'

/**
 * Subida y análisis de un modelo .glb.
 *
 * El análisis corre en el navegador, sobre el archivo que acaba de elegir la
 * persona y antes de subir nada. Es a propósito: three pesa demasiado para
 * cargarlo en el servidor por cada subida, el archivo ya está aquí, y sobre
 * todo así se ve EN EL MOMENTO si el .glb sirve —en vez de descubrirlo cuando
 * la prenda sale teñida de un color plano.
 *
 * three y GLTFLoader se importan dentro del manejador, no arriba: de otro modo
 * entrarían en el paquete de todo el panel, que no los necesita para nada más.
 */

interface Analisis {
  vertices: number
  triangulos: number
  proporcionDentro: number
  rangoU: string
  mapeoSugerido: Mapeo
  escala: number
  centro: { x: number; y: number; z: number }
  tamano: string
  materiales: string[]
}

const LIMITE = 50 * 1024 * 1024

export default function SubirModelo() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [analisis, setAnalisis] = useState<Analisis | null>(null)
  const [nombre, setNombre] = useState('')
  const [mapeo, setMapeo] = useState<Mapeo>('proyeccion')
  const [excluidos, setExcluidos] = useState<string[]>([])
  const [estado, setEstado] = useState<'inicial' | 'analizando' | 'subiendo'>('inicial')
  const [error, setError] = useState('')

  const formRef = useRef<HTMLFormElement>(null)
  const entrada = useRef<HTMLInputElement>(null)

  async function analizar(elegido: File) {
    setError('')
    setAnalisis(null)

    if (!elegido.name.toLowerCase().endsWith('.glb')) {
      setError(
        'Solo .glb. Un .gltf suelto necesita sus texturas y binarios aparte; exporta como GLB, que lo lleva todo dentro.'
      )
      return
    }
    if (elegido.size > LIMITE) {
      setError(`El archivo pesa ${(elegido.size / 1048576).toFixed(1)} MB y el límite son 50 MB.`)
      return
    }

    setArchivo(elegido)
    setNombre((n) => n || elegido.name.replace(/\.glb$/i, ''))
    setEstado('analizando')

    try {
      const [THREE, { GLTFLoader }, { analizarUV, medirModelo, esMalla }] = await Promise.all([
        import('three'),
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('@/lib/estudio/mapeo'),
      ])

      const datos = await elegido.arrayBuffer()
      const escena = await new Promise<import('three').Object3D>((resolver, rechazar) => {
        new GLTFLoader().parse(datos, '', (g) => resolver(g.scene), rechazar)
      })

      const uv = analizarUV(escena)
      const ajuste = medirModelo(escena)

      let vertices = 0
      let indices = 0
      const materiales = new Set<string>()

      escena.traverse((obj) => {
        if (!esMalla(obj)) return
        vertices += obj.geometry.attributes.position?.count ?? 0
        indices += obj.geometry.getIndex()?.count ?? obj.geometry.attributes.position?.count ?? 0
        for (const m of Array.isArray(obj.material) ? obj.material : [obj.material]) {
          if (m?.name) materiales.add(m.name)
        }
      })

      const caja = new THREE.Box3().setFromObject(escena)
      const tam = caja.getSize(new THREE.Vector3())

      setAnalisis({
        vertices,
        triangulos: Math.round(indices / 3),
        proporcionDentro: uv.proporcionDentro,
        rangoU: `${uv.rango.uMin.toFixed(1)} a ${uv.rango.uMax.toFixed(1)}`,
        mapeoSugerido: uv.mapeoSugerido,
        escala: ajuste.escala,
        centro: ajuste.centro,
        tamano: `${tam.x.toFixed(1)} × ${tam.y.toFixed(1)} × ${tam.z.toFixed(1)}`,
        materiales: [...materiales],
      })
      setMapeo(uv.mapeoSugerido)
      setEstado('inicial')
    } catch (err) {
      console.error('[nyx] no se pudo analizar el modelo', err)
      setError('No se pudo leer el archivo. ¿Seguro que es un .glb válido?')
      setEstado('inicial')
      setArchivo(null)
    }
  }

  async function subirYGuardar() {
    if (!archivo || !analisis) return

    setEstado('subiendo')
    setError('')

    try {
      const supabase = crearClienteNavegador()
      const ruta = `prendas/${crypto.randomUUID()}.glb`

      const { error: errorSubida } = await supabase.storage
        .from('modelos')
        // El navegador suele reportar el .glb sin tipo o como octet-stream;
        // se fija a mano para que el bucket no lo rechace y para que Vercel
        // lo sirva con la cabecera correcta.
        .upload(ruta, archivo, { contentType: 'model/gltf-binary' })

      if (errorSubida) throw errorSubida

      const { data } = supabase.storage.from('modelos').getPublicUrl(ruta)

      const campo = formRef.current?.elements.namedItem('archivo_url') as HTMLInputElement | null
      if (campo) campo.value = data.publicUrl

      formRef.current?.requestSubmit()
    } catch (err) {
      console.error('[nyx] no se pudo subir el modelo', err)
      setError(
        'No se pudo subir el archivo. Comprueba que el bucket "modelos" exista en Supabase y que tu usuario sea staff.'
      )
      setEstado('inicial')
    }
  }

  const uvSirven = analisis ? analisis.proporcionDentro >= 0.9 : false

  return (
    <div className={e.tarjeta} style={{ marginBottom: 22 }}>
      <div className={e.tarjetaPad}>
        <h2
          style={{
            margin: '0 0 6px',
            font: '400 19px/1.25 var(--fuente-serif), Georgia, serif',
            color: 'var(--negro)',
          }}
        >
          Subir un modelo
        </h2>
        <p
          style={{
            margin: '0 0 20px',
            font: '300 11.5px/1.7 var(--fuente-sans), sans-serif',
            color: '#8a8a8a',
          }}
        >
          Formato .glb, hasta 50 MB. Al elegirlo se analiza aquí mismo, antes de subir nada.
        </p>

        {error && (
          <div className={`${e.aviso} ${e.avisoError}`} role="alert">
            {error}
          </div>
        )}

        <input
          ref={entrada}
          type="file"
          accept=".glb,model/gltf-binary"
          hidden
          onChange={(ev) => {
            const elegido = ev.target.files?.[0]
            if (elegido) void analizar(elegido)
          }}
        />

        <button
          type="button"
          className={e.botonTenue}
          onClick={() => entrada.current?.click()}
          disabled={estado !== 'inicial'}
          style={{ width: '100%', padding: '18px' }}
        >
          {estado === 'analizando'
            ? 'Analizando…'
            : archivo
              ? `${archivo.name} · ${(archivo.size / 1048576).toFixed(1)} MB`
              : 'Elegir archivo .glb'}
        </button>

        {analisis && (
          <>
            {/* El diagnóstico va antes que el formulario a propósito: es lo que
                decide si el archivo sirve. */}
            <div
              style={{
                marginTop: 20,
                padding: 16,
                background: uvSirven ? '#dff3e4' : '#fbf0d6',
                border: `1px solid ${uvSirven ? 'rgba(10,92,43,.25)' : 'rgba(201,154,46,.4)'}`,
              }}
            >
              <div
                style={{
                  font: '600 9.5px/1 var(--fuente-sans), sans-serif',
                  letterSpacing: '.16em',
                  textTransform: 'uppercase',
                  color: uvSirven ? '#0a5c2b' : '#7a5a08',
                  marginBottom: 12,
                }}
              >
                {uvSirven ? 'El modelo viene bien desplegado' : 'Las UVs del archivo no sirven'}
              </div>
              <p
                style={{
                  margin: 0,
                  font: '300 12px/1.7 var(--fuente-sans), sans-serif',
                  color: uvSirven ? '#0a5c2b' : '#6a4e08',
                }}
              >
                {uvSirven ? (
                  <>
                    El {(analisis.proporcionDentro * 100).toFixed(1)}% de sus coordenadas cae en
                    el rango [0,1]. Aun así se regeneran por proyección: que el despliegue sea
                    coherente no significa que coincida con el reparto frente|espalda que
                    espera el estudio, y para un archivo de terceros no coincide nunca.
                    Respetar las del archivo solo funciona si el modelo se desplegó pensando en
                    esto.
                  </>
                ) : (
                  <>
                    Solo el {(analisis.proporcionDentro * 100).toFixed(1)}% cae en [0,1] — van de{' '}
                    {analisis.rangoU}. Están pensadas para una tela estampada que se repite, no
                    para colocar un diseño. Si se respetaran, un logo teñiría la prenda de un
                    color plano en vez de verse. Se regeneran por proyección.
                  </>
                )}
              </p>
            </div>

            <div className={e.rejillaCampos} style={{ marginTop: 20 }}>
              <div>
                <span className={e.etiqueta}>Geometría</span>
                <div style={{ font: '400 12.5px/1.6 var(--fuente-sans), sans-serif' }}>
                  {analisis.vertices.toLocaleString('es')} vértices ·{' '}
                  {analisis.triangulos.toLocaleString('es')} triángulos
                </div>
              </div>
              <div>
                <span className={e.etiqueta}>Tamaño del modelo</span>
                <div style={{ font: '400 12.5px/1.6 var(--fuente-sans), sans-serif' }}>
                  {analisis.tamano} unidades
                </div>
              </div>
            </div>

            <form ref={formRef} action={guardarModelo3D} style={{ marginTop: 20 }}>
              <input type="hidden" name="archivo_url" defaultValue="" />
              <input type="hidden" name="escala" value={analisis.escala} />
              <input type="hidden" name="centro_x" value={analisis.centro.x} />
              <input type="hidden" name="centro_y" value={analisis.centro.y} />
              <input type="hidden" name="centro_z" value={analisis.centro.z} />
              <input type="hidden" name="uv_proporcion" value={analisis.proporcionDentro} />
              <input type="hidden" name="uv_vertices" value={analisis.vertices} />
              <input type="hidden" name="materiales_excluidos" value={excluidos.join(',')} />

              <div className={e.rejillaCampos}>
                <div>
                  <label className={e.etiqueta} htmlFor="nombre-modelo">
                    Nombre de la prenda
                  </label>
                  <input
                    className={e.campo}
                    id="nombre-modelo"
                    name="nombre"
                    required
                    maxLength={120}
                    value={nombre}
                    onChange={(ev) => setNombre(ev.target.value)}
                    placeholder="Camisa manga larga"
                  />
                </div>

                <div>
                  <label className={e.etiqueta} htmlFor="mapeo-modelo">
                    Mapeo de la textura
                  </label>
                  <select
                    className={e.select}
                    id="mapeo-modelo"
                    name="mapeo"
                    value={mapeo}
                    onChange={(ev) => setMapeo(ev.target.value as Mapeo)}
                  >
                    <option value="proyeccion">
                      Regenerar por proyección{' '}
                      {analisis.mapeoSugerido === 'proyeccion' ? '(recomendado)' : ''}
                    </option>
                    <option value="original">
                      Respetar las del archivo{' '}
                      {analisis.mapeoSugerido === 'original' ? '(recomendado)' : ''}
                    </option>
                  </select>
                </div>
              </div>

              {analisis.materiales.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <span className={e.etiqueta}>
                    Partes que NO llevarán el diseño
                  </span>
                  <p
                    style={{
                      margin: '0 0 10px',
                      font: '300 11px/1.6 var(--fuente-sans), sans-serif',
                      color: '#8a8a8a',
                    }}
                  >
                    <strong>Deja todo sin marcar si toda la prenda va estampada.</strong> Marca
                    solo cremalleras, botones o cordones: esas partes conservarán su material
                    original y el diseño no las tocará.
                  </p>

                  {/* Marcarlos todos deja el modelo mudo: carga, se mapea y no
                      recibe el diseño en ninguna malla. Ha pasado, y sin aviso
                      era indistinguible de un fallo del visor. */}
                  {excluidos.length === analisis.materiales.length && (
                    <div className={`${e.aviso} ${e.avisoError}`} style={{ marginBottom: 12 }}>
                      Están marcadas <strong>todas</strong> las partes. Así la prenda no se
                      pintará en ningún sitio y el cliente no verá su diseño.
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {analisis.materiales.map((m) => (
                      <label
                        key={m}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          font: '400 12px/1.4 var(--fuente-sans), sans-serif',
                          color: '#5c5c5c',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={excluidos.includes(m)}
                          onChange={(ev) =>
                            setExcluidos((lista) =>
                              ev.target.checked ? [...lista, m] : lista.filter((x) => x !== m)
                            )
                          }
                        />
                        {m}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className={e.acciones}>
                <button
                  type="button"
                  className={e.boton}
                  onClick={() => void subirYGuardar()}
                  disabled={estado === 'subiendo' || !nombre.trim()}
                >
                  {estado === 'subiendo' ? 'Subiendo…' : 'Subir y guardar'}
                </button>
                <button
                  type="button"
                  className={e.botonTenue}
                  onClick={() => {
                    setArchivo(null)
                    setAnalisis(null)
                    setExcluidos([])
                    if (entrada.current) entrada.current.value = ''
                  }}
                >
                  Descartar
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
