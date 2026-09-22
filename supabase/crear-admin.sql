-- ===========================================================================
-- Crear el primer administrador del panel
--
-- ESTE ARCHIVO NO ES UNA MIGRACIÓN. Vive fuera de migrations/ a propósito: no
-- debe ejecutarse solo con `npm run db:push`, porque contiene una contraseña.
--
-- Cómo se usa:
--   1. Cambia CORREO y CLAVE en las dos líneas marcadas más abajo.
--   2. Pégalo entero en el SQL Editor de Supabase y ejecútalo.
--   3. Mira la tabla que devuelve: la columna `diagnostico` dice si quedó bien.
--   4. Entra en /login con ese correo y esa clave.
--
-- IMPORTANTE: el esquema `nyx` tiene que estar aplicado antes. Si ejecutas
-- esto primero, el bloque falla entero y NO se crea nada — que es exactamente
-- lo que pasa cuando el login dice "correo o contraseña incorrectos" sin más
-- explicación.
--
-- Hace tres cosas, porque el acceso depende de tres:
--   · auth.users       el usuario y su contraseña
--   · auth.identities  el método de acceso por correo; sin esta fila, GoTrue
--                      encuentra el usuario pero rechaza el inicio de sesión
--   · nyx.perfiles     lo que da acceso al panel; sin ella el login es válido
--                      pero se cierra con "Tu cuenta no tiene acceso al panel"
--
-- Si el correo ya existía, se BORRA y se rehace desde cero. Es deliberado: un
-- usuario a medio crear de un intento anterior es la causa más común de que el
-- acceso falle, y repararlo por partes es más frágil que rehacerlo.
-- ===========================================================================

do $$
declare
  -- >>> CAMBIA ESTAS DOS LÍNEAS <<<
  v_email text := 'admin@nyx.ec';
  v_clave text := 'aHDoKzNjxV8cWg6w';
  -- >>> ------------------------ <<<

  v_id uuid := gen_random_uuid();
begin
  -- crypt() y gen_salt() son de pgcrypto, que en Supabase vive en `extensions`.
  -- Las tablas van siempre cualificadas, así que ampliar el search_path no
  -- hace ambiguo nada.
  perform set_config('search_path', 'extensions, public', true);

  if length(v_clave) < 8 then
    raise exception 'La contraseña debe tener al menos 8 caracteres';
  end if;

  -- Comprobación explícita y temprana: si falta el esquema, el mensaje lo dice
  -- en vez de fallar más abajo con un error de tabla inexistente.
  if to_regclass('nyx.perfiles') is null then
    raise exception
      'Falta la tabla nyx.perfiles. Aplica antes supabase/instalacion-completa.sql';
  end if;

  -- --- Borrón y cuenta nueva ------------------------------------------------
  -- El borrado arrastra identities y perfiles por las claves foráneas.
  delete from auth.users where lower(email) = lower(v_email);

  -- --- 1. El usuario --------------------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    -- Estas cuatro van a cadena vacía y no a NULL: algunas versiones de GoTrue
    -- fallan al leer un token nulo y el login se cae sin explicar por qué.
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_id,
    'authenticated',
    'authenticated',
    lower(v_email),
    -- Coste 10 explícito: es el que usa GoTrue. Por defecto gen_salt('bf')
    -- usa 6, que también valida, pero no hay razón para desviarse.
    crypt(v_clave, gen_salt('bf', 10)),
    -- Confirmado de entrada: si no, Supabase espera una confirmación por
    -- correo que nunca llega y el acceso queda bloqueado.
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '', '', '', ''
  );

  -- --- 2. La identidad de correo --------------------------------------------
  --
  -- Aquí NO se captura el error, al revés que en la versión anterior. Si esto
  -- falla, el bloque entero se deshace y ves la causa: es preferible a quedarte
  -- con un usuario que existe pero con el que no se puede entrar.
  --
  -- provider_id se añadió a auth.identities en versiones posteriores, así que
  -- se comprueba antes de insertar.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'identities'
      and column_name = 'provider_id'
  ) then
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id,
      jsonb_build_object('sub', v_id::text, 'email', lower(v_email)),
      'email', v_id::text, now(), now(), now()
    );
  else
    insert into auth.identities (
      id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id,
      jsonb_build_object('sub', v_id::text, 'email', lower(v_email)),
      'email', now(), now(), now()
    );
  end if;

  -- --- 3. El perfil ---------------------------------------------------------
  --
  -- El trigger crear_perfil_al_registrar debería haberlo hecho solo al insertar
  -- en auth.users, pero crear triggers sobre auth.users depende de permisos del
  -- proyecto y puede no haberse aplicado. Esto lo cubre y fuerza el rol.
  insert into nyx.perfiles (id, nombre, rol)
  values (v_id, split_part(lower(v_email), '@', 1), 'admin')
  on conflict (id) do update set rol = 'admin';
end;
$$;

-- ===========================================================================
-- Diagnóstico
--
-- Se devuelve como tabla y no con RAISE NOTICE: los avisos pasan
-- desapercibidos en el editor de Supabase, y ahí es donde se perdía la pista
-- de lo que había fallado.
-- ===========================================================================

select
  u.email,
  case
    when u.encrypted_password is null      then 'FALLA: sin contraseña'
    when left(u.encrypted_password, 3) <> '$2a'
                                           then 'FALLA: el cifrado no es bcrypt'
    when u.email_confirmed_at is null      then 'FALLA: correo sin confirmar'
    when i.provider is null                then 'FALLA: sin identidad de correo — GoTrue rechazará el acceso'
    when p.rol is null                     then 'FALLA: sin perfil — entrará pero el panel lo cerrará'
    when p.rol <> 'admin'                  then 'AVISO: el perfil es ' || p.rol || ', no admin'
    else                                        'LISTO: ya puedes entrar en /login'
  end                                      as diagnostico,
  u.email_confirmed_at is not null         as correo_confirmado,
  i.provider                               as identidad,
  p.rol                                    as rol_en_el_panel
from auth.users u
left join auth.identities i on i.user_id = u.id and i.provider = 'email'
left join nyx.perfiles    p on p.id = u.id
order by u.created_at desc;
