import Image from 'next/image'
import { obtenerCategoriasPanel, obtenerProductosPanel } from '@/lib/panel'
import { ETIQUETA_TIPO } from '@/lib/database.types'
import { precio, stock as textoStock } from '@/lib/formato'
import { alternarVisibilidad, eliminarProducto, guardarProducto } from '../acciones'
import SinDatos from '@/componentes/panel/SinDatos'
import Aviso from '@/componentes/panel/Aviso'
import c from './Catalogo.module.css'
import e from '../Panel.module.css'

export const metadata = { title: 'Catálogo' }

interface CategoriaOpcion {
  id: string
  nombreEs: string
}

/** Mismo formulario para crear y para editar: cambia solo si lleva id. */
function FormularioProducto({
  categorias,
  producto,
}: {
  categorias: CategoriaOpcion[]
  producto?: {
    id: string
    sku: string
    nombre: string
    categoriaId: string | null
    precio: number | null
    tipo: string
    stock: number | null
    bajoPedido: boolean
  }
}) {
  const prefijo = producto?.id ?? 'nuevo'

  return (
    <form action={guardarProducto}>
      {producto && <input type="hidden" name="id" value={producto.id} />}

      <div className={e.rejillaCampos}>
        <div>
          <label className={e.etiqueta} htmlFor={`nombre-${prefijo}`}>
            Nombre
          </label>
          <input
            className={e.campo}
            id={`nombre-${prefijo}`}
            name="nombre"
            required
            maxLength={160}
            defaultValue={producto?.nombre}
            placeholder="Termo Signature 750 ml"
          />
        </div>

        <div>
          <label className={e.etiqueta} htmlFor={`sku-${prefijo}`}>
            Código (SKU)
          </label>
          <input
            className={e.campo}
            id={`sku-${prefijo}`}
            name="sku"
            maxLength={40}
            defaultValue={producto?.sku}
            placeholder="NYX-009"
            // El SKU identifica el producto en los pedidos ya registrados:
            // cambiarlo rompería esa correspondencia.
            readOnly={Boolean(producto)}
            style={producto ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          />
        </div>

        <div>
          <label className={e.etiqueta} htmlFor={`categoria-${prefijo}`}>
            Categoría
          </label>
          <select
            className={e.select}
            id={`categoria-${prefijo}`}
            name="categoria_id"
            defaultValue={producto?.categoriaId ?? ''}
          >
            <option value="">Sin categoría</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombreEs}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={e.etiqueta} htmlFor={`tipo-${prefijo}`}>
            Tipo
          </label>
          <select
            className={e.select}
            id={`tipo-${prefijo}`}
            name="tipo"
            defaultValue={producto?.tipo ?? 'personalizable'}
          >
            <option value="personalizable">Personalizable</option>
            <option value="entrega_inmediata">Entrega inmediata</option>
          </select>
        </div>

        <div>
          <label className={e.etiqueta} htmlFor={`precio-${prefijo}`}>
            Precio referencial (USD)
          </label>
          <input
            className={e.campo}
            id={`precio-${prefijo}`}
            name="precio"
            type="number"
            step="0.01"
            min="0"
            defaultValue={producto?.precio ?? ''}
          />
        </div>

        <div>
          <label className={e.etiqueta} htmlFor={`stock-${prefijo}`}>
            Stock
          </label>
          <input
            className={e.campo}
            id={`stock-${prefijo}`}
            name="stock"
            type="number"
            min="0"
            defaultValue={producto?.stock ?? ''}
            placeholder="Vacío = consultar"
          />
        </div>

        <div className={e.completo}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              font: '400 12.5px/1.4 var(--fuente-sans), sans-serif',
              color: '#5c5c5c',
            }}
          >
            <input
              type="checkbox"
              name="bajo_pedido"
              defaultChecked={producto?.bajoPedido}
            />
            Se fabrica bajo pedido (sin stock fijo)
          </label>
        </div>

        <div className={e.completo}>
          <label className={e.etiqueta} htmlFor={`descripcion-${prefijo}`}>
            Descripción para la web
          </label>
          <textarea
            className={e.area}
            id={`descripcion-${prefijo}`}
            name="descripcion"
            maxLength={1200}
          />
        </div>
      </div>

      <div className={e.acciones}>
        <button type="submit" className={e.boton}>
          {producto ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    </form>
  )
}

export default async function CatalogoPanel({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string; error?: string }>
}) {
  const { aviso, error: errorUrl } = await searchParams

  let productos
  let categorias

  try {
    ;[productos, categorias] = await Promise.all([
      obtenerProductosPanel(),
      obtenerCategoriasPanel(),
    ])
  } catch (error) {
    return <SinDatos error={error} />
  }

  const opciones = categorias.map((cat) => ({ id: cat.id, nombreEs: cat.nombreEs }))

  return (
    <>
      <Aviso aviso={aviso} error={errorUrl} />

      <div className={e.cabeceraPantalla}>
        <div>
          <span className={e.antetituloPantalla}>Catálogo</span>
          <h1 className={e.tituloPantalla}>Productos y precios</h1>
          <p className={e.pistaPantalla}>
            Edita nombre, categoría, precio, tipo y stock. El interruptor controla si el
            producto se ve en la web.
          </p>
        </div>
      </div>

      <details className={c.nuevo}>
        <summary className={c.nuevoResumen}>+ Nuevo producto</summary>
        <div className={c.editorCuerpo} style={{ marginTop: 12, borderTop: '1px solid rgba(0,0,0,.08)' }}>
          <FormularioProducto categorias={opciones} />
        </div>
      </details>

      {productos.length === 0 ? (
        <div className={e.vacio}>
          Todavía no hay productos. Crea el primero o carga los de demostración con{' '}
          <code>npm run db:reset</code>.
        </div>
      ) : (
        <div className={c.tabla}>
          <div className={c.encabezado}>
            <span />
            <span>Producto</span>
            <span>Categoría</span>
            <span>Precio</span>
            <span>Tipo</span>
            <span>Stock</span>
            <span style={{ textAlign: 'right' }}>Visible</span>
          </div>

          {productos.map((prod) => (
            <div key={prod.id}>
              <div className={c.fila}>
                <div className={c.miniatura}>
                  {prod.foto && <Image src={prod.foto} alt="" fill sizes="52px" />}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div className={c.nombre}>{prod.nombre}</div>
                  <div className={c.meta}>{prod.sku}</div>
                </div>

                <span className={c.celda}>{prod.categoria}</span>
                <span className={c.precio}>{precio(prod.precio)}</span>
                <span className={c.celda}>{ETIQUETA_TIPO[prod.tipo]}</span>
                <span className={c.celda}>{textoStock(prod.stock, prod.bajoPedido)}</span>

                <div className={c.acciones}>
                  <form action={alternarVisibilidad}>
                    <input type="hidden" name="id" value={prod.id} />
                    <input type="hidden" name="visible" value={String(!prod.visible)} />
                    <button
                      type="submit"
                      className={`${c.interruptor} ${
                        prod.visible ? c.interruptorEncendido : c.interruptorApagado
                      }`}
                      aria-label={
                        prod.visible
                          ? `Ocultar ${prod.nombre} de la web`
                          : `Mostrar ${prod.nombre} en la web`
                      }
                      aria-pressed={prod.visible}
                    >
                      <span className={c.perilla} />
                    </button>
                  </form>
                </div>
              </div>

              {/* El editor es hermano de la fila, no hijo, para ocupar todo el
                  ancho. <details> nativo: se despliega sin JavaScript. */}
              <details>
                <summary className={c.filaEditar}>Editar ficha</summary>
                <div className={c.editorCuerpo}>
                  <FormularioProducto categorias={opciones} producto={prod} />

                  <form action={eliminarProducto} style={{ marginTop: 20 }}>
                    <input type="hidden" name="id" value={prod.id} />
                    <button type="submit" className={e.botonPeligro}>
                      Eliminar producto
                    </button>
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
