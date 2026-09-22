-- ===========================================================================
-- Crear el primer administrador del panel
--
-- ESTE ARCHIVO NO ES UNA MIGRACIÓN. Vive fuera de migrations/ a propósito: no
-- debe ejecutarse solo con `npm run db:push`, porque contiene una contraseña.
--
-- Cómo se usa:
--   1. Cambia CORREO y CLAVE en las dos líneas marcadas más abajo.
--   2. Pégalo entero en el SQL Editor de Supabase y ejecútalo.
--   3. Entra en /login con ese correo y esa clave.
--
-- Es idempotente: si lo vuelves a ejecutar, actualiza la contraseña del mismo
-- usuario en vez de fallar. Sirve también para recuperar el acceso si la
-- olvidas.
--
-- Hace tres cosas, porque el login comprueba tres:
--   · auth.users       el usuario y su contraseña
--   · auth.identities  el método de acceso por correo; sin esta fila, GoTrue
--                      encuentra el usuario pero rechaza el inicio de sesión
--   · nyx.perfiles     lo que de verdad da acceso al panel; sin ella el login
--                      es correcto pero es_staff() devuelve falso y se cierra
--                      la sesión con "Tu cuenta no tiene acceso al panel"
-- ===========================================================================

do $$
declare
  -- >>> CAMBIA ESTAS DOS LÍNEAS <<<
  v_email text := 'admin@nyx.ec';
  v_clave text := 'CambiaEstaClave2026';
  -- >>> ------------------------ <<<

  v_id uuid;
begin
  -- crypt() y gen_salt() son de pgcrypto, que en Supabase vive en `extensions`.
  -- Las tablas van siempre cualificadas, así que ampliar el search_path aquí
  -- no hace ambiguo nada.
  perform set_config('search_path', 'extensions, public', true);

  if length(v_clave) < 8 then
    raise exception 'La contraseña debe tener al menos 8 caracteres';
  end if;

  select id into v_id from auth.users where lower(email) = lower(v_email);

  -- --- 1. El usuario -------------------------------------------------------
  if v_id is null then
    v_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      -- Estas cuatro van a cadena vacía y no a NULL: algunas versiones de
      -- GoTrue fallan al leer un token nulo y el login se cae sin explicar por qué.
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_id,
      'authenticated',
      'authenticated',
      lower(v_email),
      crypt(v_clave, gen_salt('bf')),
      -- Confirmado de entrada: si no, Supabase espera que se confirme por
      -- correo y el acceso queda bloqueado.
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      '', '', '', ''
    );

    raise notice 'Usuario creado: %', v_email;
  else
    update auth.users
       set encrypted_password = crypt(v_clave, gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where id = v_id;

    raise notice 'El usuario ya existía: contraseña actualizada';
  end if;

  -- --- 2. La identidad de correo -------------------------------------------
  --
  -- La forma de auth.identities cambió entre versiones de Supabase (la columna
  -- provider_id se añadió después). Se detecta antes de insertar, y si aun así
  -- falla no se tumba el resto: el usuario y el perfil ya están hechos y el
  -- aviso dice qué revisar.
  begin
    if not exists (
      select 1 from auth.identities where user_id = v_id and provider = 'email'
    ) then
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

      raise notice 'Identidad de correo creada';
    end if;
  exception when others then
    raise warning 'No se pudo crear la identidad (%). Si el login falla, crea el usuario desde Authentication -> Users en el panel de Supabase.', sqlerrm;
  end;

  -- --- 3. El perfil --------------------------------------------------------
  --
  -- El trigger crear_perfil_al_registrar debería haberlo hecho solo, pero si no
  -- llegó a aplicarse (crear triggers sobre auth.users depende de permisos del
  -- proyecto), esto lo arregla. Y fuerza el rol a admin en cualquier caso.
  insert into nyx.perfiles (id, nombre, rol)
  values (v_id, split_part(lower(v_email), '@', 1), 'admin')
  on conflict (id) do update set rol = 'admin';

  raise notice 'Perfil de administrador listo. Ya puedes entrar en /login con %', v_email;
end;
$$;

-- ---------------------------------------------------------------------------
-- Comprobación: deben salir las tres columnas rellenas
-- ---------------------------------------------------------------------------

select
  u.email,
  u.email_confirmed_at is not null as correo_confirmado,
  i.provider                       as metodo_de_acceso,
  p.rol                            as rol_en_el_panel
from auth.users u
left join auth.identities i on i.user_id = u.id and i.provider = 'email'
left join nyx.perfiles    p on p.id = u.id
order by u.created_at desc;
