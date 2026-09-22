/**
 * Junta las migraciones en un solo script re-ejecutable.
 *
 *     npm run sql:instalacion
 *
 * Para quien aplica el esquema pegandolo en el SQL Editor de Supabase en vez
 * de usar el CLI. Las migraciones estan pensadas para correr una vez en orden;
 * esto las vuelve idempotentes, que es lo que hace falta cuando alguien ya
 * ejecuto la mitad y no sabe cual.
 *
 * Las transformaciones son mecanicas a proposito -- se generan, no se
 * mantienen a mano, para que no se desincronicen de las migraciones:
 *
 *   create type        -> envuelto en DO ... exception when duplicate_object
 *   create table       -> create table if not exists
 *   create index       -> create index if not exists
 *   create sequence    -> create sequence if not exists
 *   create trigger     -> precedido de drop trigger if exists
 *   create policy      -> precedido de drop policy if exists
 *
 * Lo que ya era idempotente (create or replace function, on conflict do
 * nothing de los buckets, grants, enable row level security) se deja igual.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

const ORIGEN = 'supabase/migrations'
const DESTINO = 'supabase/instalacion-completa.sql'

function transformar(sql: string): string {
  let t = sql

  // --- Tipos: no hay "create type if not exists" en Postgres --------------
  t = t.replace(
    /^create type (nyx\.[a-z_0-9]+) as enum \(([\s\S]*?)\);$/gm,
    (_, nombre: string, valores: string) =>
      `do $tipo$\nbegin\n  create type ${nombre} as enum (${valores});\nexception when duplicate_object then null;\nend $tipo$;`
  )

  // --- Tablas, indices y secuencias ---------------------------------------
  //
  // El separador es \s+ y no un espacio: varios indices llevan espacios de
  // alineacion antes del "on" y con un solo espacio se quedaban sin
  // transformar, que es justo el tipo de fallo que solo aparece al
  // reejecutar el script.
  t = t.replace(/^create table (nyx\.)/gm, 'create table if not exists $1')
  t = t.replace(
    /^create (unique )?index ([a-z_0-9]+)(\s+on|\n)/gm,
    (_, unico: string | undefined, nombre: string, resto: string) =>
      `create ${unico ?? ''}index if not exists ${nombre}${resto}`
  )
  t = t.replace(/^create sequence (nyx\.)/gm, 'create sequence if not exists $1')

  // --- Triggers: hay que saber sobre que tabla cuelgan ---------------------
  t = t.replace(
    /^create trigger ([a-z_0-9]+)\n(\s+)(before|after) ([a-z ]+) on ([a-z_0-9.]+)/gm,
    (_, nombre: string, sangria: string, momento: string, evento: string, tabla: string) =>
      `drop trigger if exists ${nombre} on ${tabla};\ncreate trigger ${nombre}\n${sangria}${momento} ${evento} on ${tabla}`
  )

  // --- Politicas -----------------------------------------------------------
  t = t.replace(
    /^create policy ("[^"]+")\n(\s+)on ([a-z_0-9.]+)/gm,
    (_, nombre: string, sangria: string, tabla: string) =>
      `drop policy if exists ${nombre} on ${tabla};\ncreate policy ${nombre}\n${sangria}on ${tabla}`
  )

  return t
}

const archivos = readdirSync(ORIGEN)
  .filter((f) => f.endsWith('.sql'))
  .sort()

const cabecera = `-- ===========================================================================
-- NYX — instalacion completa del esquema
--
-- GENERADO. No editar a mano: sale de supabase/migrations/ con
--     npm run sql:instalacion
--
-- Como se usa:
--   1. Pega este archivo entero en el SQL Editor de Supabase y ejecutalo.
--   2. Anade "nyx" en Project Settings -> API -> Exposed schemas. Ese paso no
--      se puede hacer desde SQL, y sin el la API responde 404 a todo.
--   3. Crea tu usuario con supabase/crear-admin.sql.
--
-- Se puede ejecutar varias veces sin romper nada: si una tabla, tipo, indice,
-- trigger o politica ya existe, se salta o se reemplaza. Util cuando no se
-- sabe cuanto se aplico antes.
--
-- Lo que NO hace: borrar datos. Para empezar de cero, antes de esto:
--     drop schema if exists nyx cascade;
--
-- Contiene ${archivos.length} migraciones:
${archivos.map((f) => `--   · ${f}`).join('\n')}
-- ===========================================================================

`

const cuerpo = archivos
  .map((f) => {
    const sql = readFileSync(`${ORIGEN}/${f}`, 'utf8')
    return `\n-- ###########################################################################\n-- ${f}\n-- ###########################################################################\n\n${transformar(sql)}`
  })
  .join('\n')

writeFileSync(DESTINO, cabecera + cuerpo)

const lineas = (cabecera + cuerpo).split('\n').length
console.log(`\nEscrito ${DESTINO}`)
console.log(`  migraciones : ${archivos.length}`)
console.log(`  lineas      : ${lineas}\n`)
