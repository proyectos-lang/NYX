# NYX

Sitio de sublimación y personalización + panel de administración.
Next.js 15 (App Router) sobre Supabase, desplegado en Vercel.

---

## Arranque rápido

```bash
npm install
npm run dev          # http://localhost:3000
```

**El sitio funciona sin Supabase.** Si no hay variables de entorno, la capa de
lectura devuelve los datos de demostración y lo avisa por consola. Sirve para
maquetar y revisar el diseño; el panel, en cambio, sí necesita base de datos.

---

## Qué hay

| Ruta | Qué es |
|---|---|
| `/` | Portada: categorías, destacados, trabajos, proceso, entrega inmediata, empresas, nosotros, FAQ |
| `/catalogo` | Catálogo con filtros por categoría, tipo y búsqueda |
| `/catalogo/[slug]` | Ficha de producto con galería y relacionados |
| `/cotizar` | Formulario de solicitud de cotización |
| `/estudio` | Estudio de diseño: color, textura, logos y visor 3D |
| `/login` | Acceso al panel |
| `/panel/…` | Pedidos, catálogo, categorías, contenido, preguntas, ajustes |
| `/maquetas` | Las maquetas originales, como referencia visual |

Las maquetas `.dc.html` viven en `public/` y siguen navegables, pero ya no son
la aplicación: son el documento de diseño del que salió todo lo demás.

---

## Estructura

```
app/
  (sitio)/            Sitio público (comparte cabecera y pie)
  panel/              Panel privado + acciones de escritura
  login/              Acceso y cierre de sesión
  layout.tsx          Raíz: fuentes y metadatos
  globals.css         Paleta, animaciones y utilidades

componentes/
  sitio/              Cabecera, pie, tarjeta de producto, FAQ, secciones
  panel/              Avisos y estados de error
  estudio/            Editor 2D, controles y puente al visor
    visor/            Implementacion 3D (three + fiber + drei)

scripts/              Comprobaciones que no necesitan navegador

lib/
  estudio/            Modelo de datos, compositor, mapeo de UVs e historial
  supabase/           Clientes de navegador, servidor y service_role
  consultas.ts        Lecturas del sitio público (con respaldo de demo)
  panel.ts            Lecturas del panel (sin respaldo: datos reales o error)
  demo.ts             Datos de demostración, copiados de las maquetas
  database.types.ts   Tipos de las tablas
  formato.ts          Precios, fechas, stock, slugs

supabase/
  migrations/         Esquema, RLS y buckets
  seed.sql            Datos de demostración para la base local

public/               Imágenes, y las maquetas originales
uploads/              Fotos fuente sin procesar (no se despliegan)
```

---

## Supabase

### 1. Crear el proyecto

En [supabase.com](https://supabase.com), y de *Project Settings → API* copia la
URL del proyecto y la clave **anon** (en el panel nuevo, *publishable*). Luego:

```bash
cp .env.example .env.local
```

Con estas dos basta para que funcione todo lo que hay hoy:

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

El prefijo `NEXT_PUBLIC_` es obligatorio: sin él el navegador no las ve y fallan
la sesión del panel y la subida del logo del cliente.

`SUPABASE_SERVICE_ROLE_KEY` **no hace falta todavía**. `crearClienteAdmin()`
existe pero no la llama nadie. Se salta todas las políticas RLS, así que
cárgala cuando haya algo que la necesite y nunca con prefijo `NEXT_PUBLIC_`.

### 2. Aplicar el esquema

Todo vive en el esquema **`nyx`**, no en `public`.

```bash
npm run db:link
npm run db:push
```

En local, con Docker Desktop:

```bash
npm run db:start
npm run db:reset     # recrea la base y carga supabase/seed.sql
```

### 3. Exponer el esquema en la API

**Este paso no se puede hacer desde SQL y sin él no funciona nada.** Supabase
solo publica en su API los esquemas que tenga en la lista, y por defecto son
`public` y `graphql_public`. Si `nyx` no está ahí, PostgREST responde 404 a
todas las consultas por muchos permisos que tengan las tablas.

En el panel: *Project Settings → API → Exposed schemas*, añade `nyx`.

En local ya está resuelto: `supabase/config.toml` lo incluye en `schemas` y en
`extra_search_path`.

Lo que sí hace el SQL son los permisos (`grant usage on schema nyx…`, al final
de la primera migración). Supabase los concede solo en `public`, así que en un
esquema propio hay que darlos a mano. Conceder `all` a `anon` parece excesivo y
no lo es: sin el `grant`, Postgres corta antes de evaluar las políticas RLS y
ni siquiera llegarían a consultarse. Quien decide de verdad son las políticas.

### 4. Crear el primer administrador

Registra el usuario desde *Authentication → Users* en Supabase. El trigger
`crear_perfil_al_registrar` le crea el perfil con rol `editor`. Para el primer
administrador, en el SQL Editor:

```sql
update nyx.perfiles set rol = 'admin' where id = (
  select id from auth.users where email = 'tu@correo.com'
);
```

Sin fila en `perfiles` no se entra al panel, aunque la contraseña sea correcta.

### 5. Regenerar los tipos

```bash
npm run db:types
```

Los tipos de `lib/database.types.ts` están escritos a mano. No se usan como
genérico del cliente de Supabase: el parser de cadenas de `.select()` necesita
los metadatos que produce el generador y contra un tipo a mano deduce `never`.
Cuando el archivo esté generado se puede volver a poner
`createServerClient<Database>(...)` y quitar las declaraciones locales de
`lib/consultas.ts`.

---

## Cómo está modelado

Todas las tablas viven en el esquema `nyx`. El nombre está en minúscula a
propósito: Postgres pliega a minúsculas los identificadores sin comillas, así
que un esquema `"NYX"` obligaría a entrecomillarlo en cada consulta, política y
función. La constante está en `lib/supabase/esquema.ts`, y los tres clientes la
pasan como `db: { schema }`.

- **Catálogo** — `categorias`, `productos`, `producto_fotos`. El campo `visible`
  es el interruptor del panel.
- **Pedidos** — `clientes`, `pedidos`, `pedido_items`, `pedido_archivos`,
  `pedido_eventos`. Un "pedido" es una solicitud de cotización. Las referencias
  `NYX-P-0149`, `0150`… se generan solas y `pedido_eventos` guarda el historial
  de estados.
- **Contenido** — `contenido_bloques`, `contenido_campos`, `contenido_media`,
  `faq`, en español e inglés.
- **Ajustes** — clave/valor en JSON. El flag `publico` separa lo que ve la web
  del correo interno de avisos.

### Seguridad

RLS en todas las tablas, con dos reglas: el público **solo lee** lo marcado como
visible y nunca ve clientes ni pedidos; el staff (usuario con fila en
`perfiles`) lee y escribe todo.

La única escritura anónima es la función `crear_solicitud()`. Valida la entrada
y decide ella qué campos se fijan: el cliente no elige el estado del pedido, ni
la referencia, ni el precio. El formulario de cotización la llama por RPC.

El logo del cliente sube **directo del navegador** al bucket privado `pedidos`,
dentro de `entrantes/`. Es a propósito: pasar 20 MB por una Server Action
obligaría a subir el límite de body y el archivo viajaría dos veces. El servidor
solo recibe la ruta, y como `pedido_archivos` es tabla solo-staff, la fila la
inserta `crear_solicitud()`.

Las acciones del panel no comprueban permisos por su cuenta: escriben con la
sesión del usuario y deja decidir a RLS. Si alguien llegara sin ser staff, la
escritura falla en la base de datos y no en una comprobación que se pueda
olvidar.

---

## Estudio de diseño 3D

En `/estudio` el cliente arma un diseño —color base, textura en mosaico y
logotipos que coloca con el ratón— y lo ve aplicado sobre un modelo `.glb` que
puede girar.

Tres piezas separadas:

| Pieza | Dónde | Qué hace |
|---|---|---|
| Compositor | `lib/estudio/compositor.ts` | Pinta el diseño en un canvas 2D. Sin React y sin three |
| Visor 3D | `componentes/estudio/visor/` | Toma ese canvas como textura del modelo |
| Editor 2D | `componentes/estudio/Editor2D.tsx` | Donde se arrastran los logos, sobre el mismo canvas |

El compositor va aparte **a propósito**: lo usan el editor y el visor, y si cada
uno pintara por su cuenta, la previsualización 2D y el 3D acabarían mostrando
cosas distintas.

### Las UVs de los `.glb` no sirven

Es lo menos evidente de todo el sistema. Los modelos de prenda suelen traer UVs
pensadas para una tela estampada que se repite, no para colocar un diseño: es
normal encontrar rangos de -387 a 298 sin que un solo vértice caiga en [0,1].

El síntoma es desconcertante: **un logo tiñe toda la prenda de un color plano**
en vez de aparecer como imagen, porque cada punto de la malla muestrea un píxel
distinto del canvas y el logo acaba promediado.

Por eso `aplicarMapeo()` ignora las UVs del archivo y las regenera con una
proyección planar frontal, mandando cada cara a su mitad de un atlas
frente|espalda. La espalda se refleja en U: sin eso, un texto sale al revés.

`analizarUV()` decide cuál usar contando qué porcentaje cae en [0,1]. Conviene
ejecutarlo **al subir el modelo** y guardar la decisión en `modelos_3d`, junto
con la escala y el centro: así el usuario sabe en el momento si su archivo
sirve, en vez de descubrirlo al ver el resultado.

### Dependencias fijadas

`react` y `react-dom` están **clavados a 19.2.8 sin caret**, no por capricho:
`@react-three/fiber@9` exige `react >=19 <19.3`, y con `^19.2.8` npm volvería a
instalar 19.3 y rompería el visor sin avisar. Al actualizar React hay que mirar
antes el peer de fiber.

### CORS

Las imágenes del estudio se cargan con `crossOrigin="anonymous"`. Si el host no
responde con CORS, el canvas queda "tainted" y tanto la textura del modelo como
la exportación a PNG dejan de funcionar. Por eso el bucket `disenos` es público
y no se usan URLs firmadas.

### Comprobaciones

```bash
npm run verificar        # mapeo de UVs + normalizador e historial
```

Corren en Node, sin navegador ni GPU. Cubren lo que no se puede mirar a ojo:
que las UVs regeneradas caigan todas en rango y en su mitad del atlas, que la
espalda quede reflejada, que la escala normalice a ~1 unidad, que un diseño
guardado con campos de menos no reviente el editor y que arrastrar un logo no
llene el historial.

---

## Vercel

```bash
npm run deploy       # vista previa
npm run deploy:prod  # producción
npm run env:pull     # trae las variables a .env.local
```

Vercel autodetecta Next: no hace falta `vercel.json`. Las cabeceras y las rutas
cortas están en `next.config.ts`. Lo normal es conectar el repositorio de GitHub
desde el panel de Vercel para que cada `push` despliegue solo.

**Las variables de entorno hay que cargarlas también en Vercel**
(*Project Settings → Environment Variables*), en Production y Preview. Sin
ellas el sitio despliega igual, pero sirviendo datos de demostración.

---

## Git

```bash
git remote add origin https://github.com/USUARIO/nyx.git
git push -u origin main
```

La identidad de Git está puesta solo para este repositorio. Para cambiarla:

```bash
git config user.name "Tu nombre"
git config user.email "tu@correo.com"
```

---

## Lo que todavía no está

- **Subir imágenes desde el panel.** Los campos de foto de producto y de
  categoría aceptan una ruta o URL, pero no hay selector de archivo. Los buckets
  (`productos`, `contenido`) y sus políticas ya existen.
- **Enviar los correos de aviso.** La pantalla de ajustes guarda los
  destinatarios y las preferencias; falta quien los mande.
- **Enlaces compartidos.** Las tablas `enlaces_compartidos` y
  `enlace_productos` están creadas, pero la pantalla del panel no.
- **Versión en inglés del sitio.** La base guarda todo en dos idiomas y el panel
  los edita, pero el sitio público solo sirve español.
- **Modelos 3D.** El esquema y el visor estan listos, pero no hay ningun .glb
  cargado ni pantalla en el panel para subirlos: hay que insertar la fila en
  `nyx.modelos_3d` a mano. El analizador (`analizarUV`, `medirModelo`) existe y
  esta comprobado, pero todavia no hay interfaz que lo ejecute al subir.
- **El visor 3D no se ha probado con un modelo real.** Sin .glb no hay forma de
  confirmar que la prenda se ve como debe; la matematica del mapeo si esta
  comprobada en `npm run verificar`.
- **Guardar el diseno.** Las funciones `guardar_diseno()` y `leer_diseno()`
  estan en la migracion, pero el estudio todavia no las llama.
- **ESLint.** `next lint` quedó obsoleto en Next 15.5 y no se ha migrado a la
  CLI de ESLint. `npm run typecheck` y `npm run build` sí comprueban tipos.
