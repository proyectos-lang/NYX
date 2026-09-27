-- ===========================================================================
-- NYX — las subcategorías como tabla propia
--
-- Cómo se usa:
--   1. Pégalo entero en el SQL Editor de Supabase y ejecútalo.
--   2. Entra en /panel/categorias: cada categoría tiene ahora su bloque de
--      subcategorías, con foto y descripción.
--   3. La tabla del final dice cuáles quedaron sin foto o sin texto.
--
-- SE PUEDE REPETIR. No duplica nada.
--
-- POR QUÉ CAMBIA
--
-- Las subcategorías eran un campo de texto con comas dentro de la categoría:
-- "Sublimación, Impresión DTF, Bordado". Servía para pintarlas y para filtrar,
-- pero no para darles foto ni descripción, que es lo que hace falta ahora.
--
-- Una lista separada por comas no puede tener una imagen por elemento. Así que
-- cada subcategoría pasa a ser una fila, y el campo viejo se convierte en
-- filas automáticamente: no hay que volver a escribir nada.
--
-- EL ENLACE CON LOS PRODUCTOS SIGUE SIENDO EL NOMBRE. productos.tecnica guarda
-- "Bordado" y la subcategoría se llama "Bordado". Es lo que permite que la
-- dirección se lea (?tecnica=Bordado) y que no haga falta tocar los productos.
-- La contrapartida: al renombrar una subcategoría desde el panel, los
-- productos que la usaban dejan de encontrarse hasta que se les cambie la
-- técnica. El panel lo avisa.
--
-- LAS COLUMNAS VIEJAS SE QUEDAN. categorias.tecnicas_es y tecnicas_en no se
-- borran, pero a partir de ahora nadie las lee: el código usa solo esta tabla.
-- Se dejan por si hay que volver a ejecutar la conversión, y se pueden borrar
-- más adelante cuando todo esté comprobado:
--
--     alter table nyx.categorias drop column tecnicas_es, drop column tecnicas_en;
-- ===========================================================================

set search_path to nyx, public;

-- ---------------------------------------------------------------------------
-- 1. La tabla
-- ---------------------------------------------------------------------------

create table if not exists nyx.subcategorias (
  id             uuid primary key default gen_random_uuid(),
  categoria_id   uuid not null references nyx.categorias (id) on delete cascade,
  nombre_es      text not null,
  nombre_en      text,
  descripcion_es text,
  descripcion_en text,
  imagen         text,
  orden          integer not null default 0,
  visible        boolean not null default true,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  -- Dos subcategorías con el mismo nombre dentro de una categoría serían dos
  -- filtros idénticos que devuelven lo mismo.
  unique (categoria_id, nombre_es)
);

create index if not exists subcategorias_categoria_idx
  on nyx.subcategorias (categoria_id, orden);

drop trigger if exists subcategorias_actualizado_en on nyx.subcategorias;
create trigger subcategorias_actualizado_en
  before update on nyx.subcategorias
  for each row execute function nyx.tocar_actualizado_en();

-- ---------------------------------------------------------------------------
-- 2. Quién puede verlas y quién tocarlas
--
-- Mismo criterio que las categorías: el público ve las visibles, el staff lo
-- gestiona todo. Sin esto la tabla queda cerrada y la web no vería ninguna.
-- ---------------------------------------------------------------------------

alter table nyx.subcategorias enable row level security;

drop policy if exists "subcategorias: lectura pública de las visibles" on nyx.subcategorias;
create policy "subcategorias: lectura pública de las visibles"
  on nyx.subcategorias for select
  using (visible or nyx.es_staff());

drop policy if exists "subcategorias: el staff gestiona" on nyx.subcategorias;
create policy "subcategorias: el staff gestiona"
  on nyx.subcategorias for all
  using (nyx.es_staff())
  with check (nyx.es_staff());

-- ---------------------------------------------------------------------------
-- 3. Convertir el campo de texto en filas
--
-- El nombre en inglés se empareja por POSICIÓN: la tercera de tecnicas_es con
-- la tercera de tecnicas_en. Es lo único que se puede hacer con dos listas
-- separadas por comas, y funciona porque se escribieron en el mismo orden.
-- Si alguna no cuadra, se corrige desde el panel.
-- ---------------------------------------------------------------------------

insert into nyx.subcategorias (categoria_id, nombre_es, nombre_en, orden)
select
  c.id,
  btrim(es.nombre),
  btrim(en.nombre),
  es.posicion
from nyx.categorias c
cross join lateral unnest(string_to_array(coalesce(c.tecnicas_es, ''), ','))
  with ordinality as es(nombre, posicion)
left join lateral (
  select nombre, posicion
  from unnest(string_to_array(coalesce(c.tecnicas_en, ''), ','))
    with ordinality as x(nombre, posicion)
) en on en.posicion = es.posicion
where btrim(es.nombre) <> ''
on conflict (categoria_id, nombre_es) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Qué falta
--
-- Las que salgan sin foto o sin texto se ven en la web solo con su nombre.
-- Se completan desde /panel/categorias.
-- ---------------------------------------------------------------------------

select c.nombre_es as "categoría",
       s.nombre_es as "subcategoría",
       coalesce(s.nombre_en, '—') as "en inglés",
       case when coalesce(btrim(s.imagen), '') = '' then 'FALTA' else 'ok' end as foto,
       case when coalesce(btrim(s.descripcion_es), '') = '' then 'FALTA' else 'ok' end as texto
from nyx.subcategorias s
join nyx.categorias c on c.id = s.categoria_id
order by c.orden, s.orden;
