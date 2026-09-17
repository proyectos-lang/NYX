# NYX

Sitio de sublimación y personalización + panel de administración.

Ahora mismo el repositorio contiene **maquetas interactivas** (prototipos que ya
se pueden navegar) y la **infraestructura preparada** para convertirlas en un
sitio real: control de versiones, despliegue en Vercel y base de datos en
Supabase.

---

## Estado actual

| Pieza | Estado |
|---|---|
| Maquetas del sitio y del panel | Funcionando, con datos de demostración escritos dentro del HTML |
| Repositorio Git | Listo |
| Despliegue en Vercel | Configurado, pendiente de conectar el proyecto |
| Esquema de base de datos | Escrito, **pendiente de aplicar** a un proyecto de Supabase |
| Conexión maquetas ↔ Supabase | **No existe todavía** — es el siguiente paso |

Las maquetas siguen mostrando datos fijos. Que el esquema esté escrito no
significa que la web ya lea de la base: falta la capa de aplicación.

---

## Estructura

```
NYX Web.dc.html        Sitio público — portada, catálogo, proceso, empresas, FAQ, cotización
NYX Web v2.dc.html     Sitio público, propuesta visual alternativa
NYX Panel.dc.html      Panel privado — pedidos, catálogo, categorías, contenido, ajustes
support.js             Runtime de las maquetas (generado; no editar a mano)
index.html             Índice interno que enlaza las tres maquetas

assets/                Imágenes y vídeo que usan las maquetas
uploads/               Fotos originales sin procesar (no se despliegan)

supabase/
  config.toml          Configuración del CLI de Supabase
  migrations/          Esquema, políticas RLS y buckets de Storage
  seed.sql             Datos de demostración para la base local

vercel.json            Configuración del despliegue estático
.env.example           Plantilla de variables de entorno
```

Los tres `.dc.html` se enlazan entre sí por nombre de archivo, así que
**renombrarlos rompe la navegación** entre maquetas.

---

## Requisitos

- Node.js 20 o superior (hay 24 instalado)
- Docker Desktop — **solo** si quieres levantar Supabase en local.
  Sin Docker puedes trabajar igual contra el proyecto de Supabase en la nube.

```bash
npm install
```

Esto instala los CLI de Vercel y Supabase dentro del proyecto. No hace falta
instalarlos globalmente: todos los comandos van por `npm run`.

---

## Git

El repositorio ya está inicializado, con rama `main` y un primer commit.

La identidad de Git está puesta **solo para este repositorio**. Si el nombre que
aparece en los commits no es el que quieres:

```bash
git config user.name "Tu nombre"
git config user.email "tu@correo.com"
```

Para subirlo a GitHub (hace falta crear el repositorio vacío allí primero):

```bash
git remote add origin https://github.com/USUARIO/nyx.git
git push -u origin main
```

Qué **no** entra nunca en Git, por si acaso: `.env` y `.env.local` (claves
reales), `node_modules/`, `.vercel/` y `.thumbnail` (miniatura que regenera el
editor de diseño en cada guardado).

---

## Vercel

El despliegue es estático: no hay paso de compilación, Vercel sirve los archivos
tal cual.

```bash
npm run dev          # servidor local en http://localhost:3000
npm run deploy       # despliegue de vista previa
npm run deploy:prod  # despliegue a producción
```

La primera vez, `vercel` pedirá iniciar sesión y vincular la carpeta con un
proyecto. Después de vincularlo, lo habitual es conectar el repositorio de
GitHub desde el panel de Vercel para que cada `push` despliegue solo.

Rutas cortas configuradas en `vercel.json`:

| Ruta | Muestra |
|---|---|
| `/` | Índice con las tres maquetas |
| `/web` | Sitio público |
| `/v2` | Sitio público v2 |
| `/panel` | Panel de administración |

> **Antes de lanzar el sitio real:** `vercel.json` manda hoy una cabecera
> `X-Robots-Tag: noindex, nofollow` a **todas** las rutas, para que Google no
> indexe una maqueta con datos inventados. Hay que quitarla cuando el sitio
> definitivo salga a producción.

Las variables de entorno se cargan en Vercel desde
*Project Settings → Environment Variables*, y se traen a local con:

```bash
npm run env:pull     # escribe .env.local
```

---

## Supabase

### 1. Crear el proyecto

En [supabase.com](https://supabase.com) crea un proyecto y copia de
*Project Settings → Data API*:

- la **URL** del proyecto,
- la clave **anon / publishable** (pública, la puede ver el navegador),
- la clave **service role** (secreta, **solo servidor**).

Cópialas a `.env.local`:

```bash
cp .env.example .env.local
```

### 2. Aplicar el esquema

```bash
npm run db:link      # vincula esta carpeta con el proyecto de la nube
npm run db:push      # aplica las migraciones de supabase/migrations/
```

Si prefieres trabajar en local (necesita Docker Desktop):

```bash
npm run db:start     # levanta Postgres, Auth y Storage en contenedores
npm run db:reset     # recrea la base y carga supabase/seed.sql
```

### 3. Crear el primer usuario del panel

Auth crea la fila en `perfiles` automáticamente al registrar un usuario, pero
con rol `editor`. Para el primer administrador, tras registrarlo desde el panel
de Supabase, ejecuta en el SQL Editor:

```sql
update public.perfiles set rol = 'admin' where id = (
  select id from auth.users where email = 'tu@correo.com'
);
```

### Cómo está modelado

Las tablas replican lo que hoy está simulado dentro de las maquetas:

- **Catálogo** — `categorias`, `productos`, `producto_fotos`, `categoria_fotos`.
  El campo `visible` de `productos` es el interruptor que sale en el panel.
- **Pedidos** — `clientes`, `pedidos`, `pedido_items`, `pedido_archivos`,
  `pedido_eventos`. Un "pedido" es lo que en la web es una solicitud de
  cotización. Las referencias `NYX-P-0149`, `0150`… se generan solas.
  `pedido_eventos` guarda el historial de cambios de estado.
- **Contenido** — `contenido_bloques`, `contenido_campos`, `contenido_media`,
  `faq`. Cada bloque de la web es fijo; lo editable son sus textos y su media,
  en español e inglés.
- **Ajustes** — `ajustes`, clave/valor en JSON. El flag `publico` separa lo que
  ve la web (teléfono del pie de página) de lo que solo ve el panel (a qué
  correos llegan los avisos).
- **Enlaces compartidos** — `enlaces_compartidos`, `enlace_productos`, para la
  función del panel que genera un enlace temporal con una selección de
  productos.

### Seguridad

RLS activo en todas las tablas, con dos reglas:

- **El público solo lee** lo marcado como visible: catálogo, contenido, FAQ y
  los ajustes públicos. Nunca ve clientes ni pedidos.
- **El staff** (cualquier usuario con fila en `perfiles`) lee y escribe todo.

La única escritura anónima permitida es la función `crear_solicitud()`, que es
la que debe usar el formulario de cotización. Valida la entrada y decide ella
qué campos se fijan: el cliente no puede elegir el estado del pedido, ni la
referencia, ni el precio.

```js
const { data: referencia, error } = await supabase.rpc('crear_solicitud', {
  p_nombre: 'Distribuidora Andes',
  p_email: 'compras@andes.ec',
  p_telefono: '+593 99 812 4410',
  p_items: [{ producto_id: '…', cantidad: 50, especificaciones: 'negro · logo frontal' }],
  p_fecha_requerida: '2026-09-24',
  p_metodo_entrega: 'envio_nacional',
  p_observaciones: 'Empaque individual con etiqueta.'
})
// referencia -> 'NYX-P-0149'
```

Buckets de Storage: `productos` y `contenido` son públicos (solo el staff sube);
`pedidos` es privado y admite subida anónima únicamente dentro de
`entrantes/`, con límite de 20 MB y lista cerrada de tipos de archivo.

---

## Siguiente paso

Las maquetas son HTML estático que monta React desde un CDN; no tienen forma de
consumir Supabase de manera razonable. Para que el catálogo, la bandeja de
pedidos y el contenido salgan de la base de datos, el paso siguiente es
reconstruir las maquetas como aplicación real —Next.js encaja bien con Vercel y
Supabase— conservando el diseño tal como está.

Hasta entonces, los `.dc.html` siguen siendo la referencia visual.
