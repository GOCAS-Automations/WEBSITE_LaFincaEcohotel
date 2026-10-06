-- ============================================================================
-- 025 — Entrar al panel con usuario (no con correo): la búsqueda usuario → correo
-- ============================================================================
--
-- Supabase Auth exige un correo por cuenta y solo sabe iniciar sesión con él.
-- El «usuario» del panel (`admin`, `j-mejia`…) es una capa encima: vive en
-- `app_metadata.usuario` de cada cuenta —que solo escribe la clave de servicio,
-- igual que `app_metadata.rol`— y el login del servidor lo traduce al correo
-- antes de llamar a `signInWithPassword`.
--
-- Esta función es esa traducción. Decisiones:
--
--   · UNA SOLA FUENTE DE VERDAD. Se lee `auth.users.raw_app_meta_data` en vez de
--     llevar una tabla propia `usuario → id`: con una tabla habría dos sitios
--     que mantener sincronizados (crear, renombrar, borrar cuentas) y el día que
--     se desincronizaran alguien entraría con la cuenta equivocada o no entraría.
--
--   · SOLO `service_role`. Es `security definer` (lee `auth.users`, que ningún
--     rol de la API puede leer), así que darle EXECUTE a `anon` o a
--     `authenticated` la publicaría en `/rest/v1/rpc/` y cualquiera podría
--     preguntar «¿existe el usuario X y cuál es su correo?». Supabase da EXECUTE
--     a `anon` y `authenticated` por defecto a toda función nueva de `public`
--     (ALTER DEFAULT PRIVILEGES), por eso el REVOKE es explícito para los tres.
--
--   · FALLA CERRADO. Si dos cuentas tuvieran el mismo usuario (la aplicación lo
--     impide, pero `auth.users` no admite un índice único nuestro), devuelve
--     NULL: nadie entra por ese usuario hasta que se arregle, en vez de entrar
--     a la cuenta que salga primero.
--
--   · `search_path` vacío y nombres calificados: una función `security definer`
--     no debe resolver nombres en esquemas que otro pueda crear.
--
-- Compatible con el código desplegado (login por correo): solo AÑADE una
-- función; no toca tablas, políticas ni cuentas.
--
-- Cómo deshacerla: ver el final del archivo.
-- ============================================================================

create or replace function public.correo_de_usuario_panel(p_usuario text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when count(*) = 1 then min(u.email::text) end
    from auth.users u
   where u.raw_app_meta_data ->> 'usuario' = lower(btrim(p_usuario))
     and u.deleted_at is null;
$$;

comment on function public.correo_de_usuario_panel(text) is
  'Login del panel por usuario: devuelve el correo de la cuenta cuyo app_metadata.usuario coincide, o NULL. Solo service_role.';

revoke all on function public.correo_de_usuario_panel(text) from public;
revoke all on function public.correo_de_usuario_panel(text) from anon;
revoke all on function public.correo_de_usuario_panel(text) from authenticated;
grant execute on function public.correo_de_usuario_panel(text) to service_role;

-- ----------------------------------------------------------------------------
-- Deshacer (no se ejecuta):
--
--   drop function if exists public.correo_de_usuario_panel(text);
--
-- Antes de deshacerla, el login tiene que haber vuelto a entrar por correo:
-- sin esta función nadie entra por usuario.
-- ----------------------------------------------------------------------------
