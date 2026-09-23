import Image from 'next/image'
import { obtenerCategoriasPanel } from '@/lib/panel'
import {
  eliminarCategoria,
  guardarCategoria,
  guardarFotoCategoria,
  quitarFotoCategoria,
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
        <p
          style={{
            margin: '0 0 18px',
            font: '300 11.5px/1.6 var(--fuente-sans), sans-serif',
            color: '#8a8a8a',
          }}
        >
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
            Nombre en español e inglés, foto de portada y orden en el que aparecen en la web.
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
                  </div>
                </div>

                <span className={c.celda}>{cat.productos} productos</span>
                <span className={c.celda}>Orden {cat.orden}</span>
                <span className={c.celda}>{cat.visible ? 'Visible' : 'Oculta'}</span>
              </div>

              <details>
                <summary className={c.filaEditar}>Editar categoría</summary>
                <div className={c.editorCuerpo}>
                  <FormularioCategoria categoria={cat} />

                  <form action={eliminarCategoria} style={{ marginTop: 20 }}>
                    <input type="hidden" name="id" value={cat.id} />
                    <button type="submit" className={e.botonPeligro}>
                      Eliminar categoría
                    </button>
                    <p
                      style={{
                        marginTop: 10,
                        font: '300 11px/1.6 var(--fuente-sans), sans-serif',
                        color: '#8a8a8a',
                      }}
                    >
                      Los {cat.productos} productos no se borran: quedan sin categoría.
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
