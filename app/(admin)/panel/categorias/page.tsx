import Image from 'next/image'
import { obtenerCategoriasPanel, type SubcategoriaPanel } from '@/lib/panel'
import {
  eliminarCategoria,
  eliminarSubcategoria,
  guardarCategoria,
  guardarFotoCategoria,
  guardarFotoSubcategoria,
  guardarSubcategoria,
  quitarFotoCategoria,
  quitarFotoSubcategoria,
} from '../acciones'
import SubirImagen from '@/componentes/panel/SubirImagen'
import SinDatos from '@/componentes/panel/SinDatos'
import Aviso from '@/componentes/panel/Aviso'
import c from '../catalogo/Catalogo.module.css'
import e from '../Panel.module.css'

export const metadata = { title: 'Categorías' }

interface Categoria {
  id: string
  slug: string
  nombreEs: string
  nombreEn: string | null
  imagen: string | null
  orden: number
  visible: boolean
}

/** El gris de las notas explicativas, repetido por toda esta pantalla. */
const NOTA = {
  font: '300 11.5px/1.6 var(--fuente-sans), sans-serif',
  color: '#8a8a8a',
} as const

function FormularioCategoria({ categoria }: { categoria?: Categoria }) {
  const prefijo = categoria?.id ?? 'nueva'

  return (
    <>
      {categoria ? (
        <div style={{ marginBottom: 20 }}>
          <div className={e.etiqueta} style={{ marginBottom: 10 }}>
            Foto de portada
          </div>
          <SubirImagen
            bucket="productos"
            accion={guardarFotoCategoria}
            campos={{ volver: '/panel/categorias', id: categoria.id }}
            urlActual={categoria.imagen}
            etiqueta="Se ve en la portada y en el catálogo"
            alQuitar={quitarFotoCategoria}
          />
        </div>
      ) : (
        <p style={{ margin: '0 0 18px', ...NOTA }}>
          Crea primero la categoría; después podrás subirle la foto.
        </p>
      )}

      <form action={guardarCategoria}>
      {categoria && <input type="hidden" name="id" value={categoria.id} />}

      <div className={e.rejillaCampos}>
        <div>
          <label className={e.etiqueta} htmlFor={`es-${prefijo}`}>
            Nombre en español
          </label>
          <input
            className={e.campo}
            id={`es-${prefijo}`}
            name="nombre_es"
            required
            maxLength={120}
            defaultValue={categoria?.nombreEs}
            placeholder="Termos y botellas"
          />
        </div>

        <div>
          <label className={e.etiqueta} htmlFor={`en-${prefijo}`}>
            Nombre en inglés
          </label>
          <input
            className={e.campo}
            id={`en-${prefijo}`}
            name="nombre_en"
            maxLength={120}
            defaultValue={categoria?.nombreEn ?? ''}
            placeholder="Tumblers & bottles"
          />
        </div>

        <div>
          <label className={e.etiqueta} htmlFor={`orden-${prefijo}`}>
            Orden en la web
          </label>
          <input
            className={e.campo}
            id={`orden-${prefijo}`}
            name="orden"
            type="number"
            min="0"
            defaultValue={categoria?.orden ?? 0}
          />
        </div>

        <div>
          <label className={e.etiqueta} htmlFor={`visible-${prefijo}`}>
            Visibilidad
          </label>
          <select
            className={e.select}
            id={`visible-${prefijo}`}
            name="visible"
            defaultValue={categoria?.visible === false ? 'false' : 'true'}
          >
            <option value="true">Se muestra en la web</option>
            <option value="false">Oculta</option>
          </select>
        </div>

        {/* La foto se cambia con el botón de arriba, que tiene su propio
            formulario. Viaja aquí oculta para que guardar el nombre no la
            borre: `guardarCategoria` escribe todos los campos a la vez, y un
            campo ausente llegaría vacío. */}
        <input type="hidden" name="imagen" defaultValue={categoria?.imagen ?? ''} />
      </div>

      <div className={e.acciones}>
        <button type="submit" className={e.boton}>
          {categoria ? 'Guardar cambios' : 'Crear categoría'}
        </button>
      </div>
      </form>
    </>
  )
}

/**
 * Una subcategoría: con qué se hace lo de esta categoría.
 *
 * Tiene foto y descripción propias porque en la web se enseña como una tarjeta
 * al abrir la categoría, antes de los productos. Es lo que contesta "¿qué
 * hacéis en gorras?" cuando la categoría todavía está vacía.
 */
function FormularioSubcategoria({
  categoriaId,
  sub,
}: {
  categoriaId: string
  sub?: SubcategoriaPanel
}) {
  const prefijo = sub?.id ?? `nueva-${categoriaId}`

  return (
    <>
      {sub ? (
        <div style={{ marginBottom: 18 }}>
          <div className={e.etiqueta} style={{ marginBottom: 10 }}>
            Foto de la subcategoría
          </div>
          <SubirImagen
            bucket="productos"
            accion={guardarFotoSubcategoria}
            campos={{ volver: '/panel/categorias', id: sub.id }}
            urlActual={sub.imagen}
            etiqueta="Sale al abrir la categoría en la web"
            alQuitar={quitarFotoSubcategoria}
          />
        </div>
      ) : (
        <p style={{ margin: '0 0 16px', ...NOTA }}>
          Créala primero; después podrás subirle la foto.
        </p>
      )}

      <form action={guardarSubcategoria}>
        {sub ? (
          <input type="hidden" name="id" value={sub.id} />
        ) : (
          <input type="hidden" name="categoria_id" value={categoriaId} />
        )}

        <div className={e.rejillaCampos}>
          <div>
            <label className={e.etiqueta} htmlFor={`sub-es-${prefijo}`}>
              Nombre en español
            </label>
            <input
              className={e.campo}
              id={`sub-es-${prefijo}`}
              name="nombre_es"
              required
              maxLength={120}
              defaultValue={sub?.nombreEs}
              placeholder="Bordado"
            />
          </div>

          <div>
            <label className={e.etiqueta} htmlFor={`sub-en-${prefijo}`}>
              Nombre en inglés
            </label>
            <input
              className={e.campo}
              id={`sub-en-${prefijo}`}
              name="nombre_en"
              maxLength={120}
              defaultValue={sub?.nombreEn ?? ''}
              placeholder="Embroidery"
            />
          </div>

          <div className={e.completo}>
            <label className={e.etiqueta} htmlFor={`sub-des-${prefijo}`}>
              Descripción en español
            </label>
            <textarea
              className={e.area}
              id={`sub-des-${prefijo}`}
              name="descripcion_es"
              rows={2}
              maxLength={400}
              defaultValue={sub?.descripcionEs ?? ''}
              placeholder="Hilo cosido a la prenda. Aguanta lavados y no se despega."
            />
          </div>

          <div className={e.completo}>
            <label className={e.etiqueta} htmlFor={`sub-desen-${prefijo}`}>
              Descripción en inglés
            </label>
            <textarea
              className={e.area}
              id={`sub-desen-${prefijo}`}
              name="descripcion_en"
              rows={2}
              maxLength={400}
              defaultValue={sub?.descripcionEn ?? ''}
              placeholder="Thread stitched into the fabric. Survives washing and never peels."
            />
          </div>

          <div>
            <label className={e.etiqueta} htmlFor={`sub-orden-${prefijo}`}>
              Orden
            </label>
            <input
              className={e.campo}
              id={`sub-orden-${prefijo}`}
              name="orden"
              type="number"
              min="0"
              defaultValue={sub?.orden ?? 0}
            />
          </div>

          <div>
            <label className={e.etiqueta} htmlFor={`sub-visible-${prefijo}`}>
              Visibilidad
            </label>
            <select
              className={e.select}
              id={`sub-visible-${prefijo}`}
              name="visible"
              defaultValue={sub?.visible === false ? 'false' : 'true'}
            >
              <option value="true">Se muestra en la web</option>
              <option value="false">Oculta</option>
            </select>
          </div>

          {/* Igual que en la categoría: la foto se cambia con el botón de
              arriba, y viaja aquí oculta para que guardar el texto no la borre. */}
          <input type="hidden" name="imagen" defaultValue={sub?.imagen ?? ''} />
        </div>

        <div className={e.acciones}>
          <button type="submit" className={e.boton}>
            {sub ? 'Guardar subcategoría' : 'Crear subcategoría'}
          </button>
        </div>
      </form>

      {sub && (
        <form action={eliminarSubcategoria} style={{ marginTop: 14 }}>
          <input type="hidden" name="id" value={sub.id} />
          <button type="submit" className={e.botonTenue}>
            Eliminar subcategoría
          </button>
        </form>
      )}
    </>
  )
}

function Subcategorias({ categoria }: { categoria: { id: string; subcategorias: SubcategoriaPanel[] } }) {
  return (
    <div style={{ marginTop: 26, paddingTop: 22, borderTop: '1px solid rgba(0,0,0,.08)' }}>
      <div className={e.etiqueta} style={{ marginBottom: 6 }}>
        Subcategorías
      </div>
      <p style={{ margin: '0 0 16px', ...NOTA }}>
        Con qué se hace lo de esta categoría: sublimación, DTF, bordado, grabado láser…
        En la web salen como tarjetas con su foto y su texto al abrir la categoría, y al
        pulsar una se filtran los productos hechos con esa técnica.
        <br />
        <strong style={{ color: '#6d6d6d' }}>Ojo al cambiar un nombre:</strong> es el
        nombre lo que une la subcategoría con sus productos. Si aquí pone «Bordado» y lo
        cambias a «Bordado premium», los productos que decían «Bordado» dejan de salir al
        filtrar hasta que les cambies la técnica en Catálogo.
      </p>

      {categoria.subcategorias.length === 0 ? (
        <p style={{ margin: '0 0 14px', ...NOTA }}>
          Esta categoría todavía no tiene subcategorías.
        </p>
      ) : (
        <div className={c.tabla} style={{ marginBottom: 14 }}>
          {categoria.subcategorias.map((sub) => (
            <div key={sub.id}>
              <div className={c.fila}>
                <div className={c.miniatura}>
                  {sub.imagen && <Image src={sub.imagen} alt="" fill sizes="52px" />}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div className={c.nombre}>{sub.nombreEs}</div>
                  <div className={c.meta}>
                    {sub.nombreEn ?? 'sin traducción'}
                    {sub.descripcionEs ? '' : ' · sin descripción'}
                    {sub.imagen ? '' : ' · sin foto'}
                  </div>
                </div>

                <span className={c.celda}>Orden {sub.orden}</span>
                <span className={c.celda}>{sub.visible ? 'Visible' : 'Oculta'}</span>
              </div>

              <details>
                <summary className={c.filaEditar}>Editar subcategoría</summary>
                <div className={c.editorCuerpo}>
                  <FormularioSubcategoria categoriaId={categoria.id} sub={sub} />
                </div>
              </details>
            </div>
          ))}
        </div>
      )}

      <details className={c.nuevo}>
        <summary className={c.nuevoResumen}>+ Nueva subcategoría</summary>
        <div
          className={c.editorCuerpo}
          style={{ marginTop: 12, border: '1px solid rgba(0,0,0,.08)' }}
        >
          <FormularioSubcategoria categoriaId={categoria.id} />
        </div>
      </details>
    </div>
  )
}

export default async function CategoriasPanel({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string; error?: string }>
}) {
  const { aviso, error: errorUrl } = await searchParams

  let categorias

  try {
    categorias = await obtenerCategoriasPanel()
  } catch (error) {
    return <SinDatos error={error} />
  }

  return (
    <>
      <Aviso aviso={aviso} error={errorUrl} />

      <div className={e.cabeceraPantalla}>
        <div>
          <span className={e.antetituloPantalla}>Catálogo</span>
          <h1 className={e.tituloPantalla}>Categorías</h1>
          <p className={e.pistaPantalla}>
            Nombre en español e inglés, foto de portada, orden en el que aparecen en la
            web y las subcategorías de cada una con su propia foto y descripción.
          </p>
        </div>
      </div>

      <details className={c.nuevo}>
        <summary className={c.nuevoResumen}>+ Nueva categoría</summary>
        <div className={c.editorCuerpo} style={{ marginTop: 12, border: '1px solid rgba(0,0,0,.08)' }}>
          <FormularioCategoria />
        </div>
      </details>

      {categorias.length === 0 ? (
        <div className={e.vacio}>
          Todavía no hay categorías. Crea la primera para poder clasificar los productos.
        </div>
      ) : (
        <div className={c.tabla}>
          {categorias.map((cat) => (
            <div key={cat.id}>
              <div className={c.fila}>
                <div className={c.miniatura}>
                  {cat.imagen && <Image src={cat.imagen} alt="" fill sizes="52px" />}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div className={c.nombre}>{cat.nombreEs}</div>
                  <div className={c.meta}>
                    {cat.nombreEn ?? 'sin traducción'} · {cat.slug}
                    {cat.subcategorias.length > 0 && (
                      <> · {cat.subcategorias.map((s) => s.nombreEs).join(', ')}</>
                    )}
                  </div>
                </div>

                <span className={c.celda}>{cat.productos} productos</span>
                <span className={c.celda}>Orden {cat.orden}</span>
                <span className={c.celda}>{cat.visible ? 'Visible' : 'Oculta'}</span>
              </div>

              <details>
                <summary className={c.filaEditar}>
                  Editar categoría y subcategorías
                </summary>
                <div className={c.editorCuerpo}>
                  <FormularioCategoria categoria={cat} />

                  <Subcategorias categoria={cat} />

                  <form action={eliminarCategoria} style={{ marginTop: 26 }}>
                    <input type="hidden" name="id" value={cat.id} />
                    <button type="submit" className={e.botonPeligro}>
                      Eliminar categoría
                    </button>
                    <p style={{ marginTop: 10, ...NOTA, fontSize: 11 }}>
                      Los {cat.productos} productos no se borran: quedan sin categoría.
                      Sus {cat.subcategorias.length} subcategorías sí desaparecen.
                    </p>
                  </form>
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
