-- ============================================================================
-- 018 — Solo las cuentas con rol del panel leen y escriben lo privado
--
-- ----------------------------------------------------------------------------
-- EL HUECO QUE CIERRA
-- ----------------------------------------------------------------------------
-- Hasta aquí las políticas de escritura (y las de lectura de lo privado) se
-- escribieron «para `authenticated`, usando `true`»: se suponía que toda sesión
-- de Supabase era del equipo del hotel, porque las cuentas solo se crean desde
-- /admin/usuarios. Pero una sesión solo prueba que alguien TIENE una cuenta, y
-- con el registro público de Supabase Auth encendido (`disable_signup: false`)
-- cualquiera puede crearse una con la clave anónima, que viaja en el JavaScript
-- del sitio. La auditoría del 05/10/2026 lo reprodujo: una cuenta recién
-- registrada, sin rol, leía y escribía reservas, pagos y bloqueos por la API
-- REST, sin pasar por el panel.
--
-- Ahora la condición es el ROL del JWT: `app_metadata.rol` en ('propietario',
-- 'equipo'). `app_metadata` solo lo escribe la clave de servicio (la Admin API,
-- que es lo que usa /admin/usuarios), así que una cuenta creada desde fuera no
-- lo trae ni se lo puede poner. `user_metadata`, en cambio, lo edita el propio
-- usuario con su token: NUNCA se lee el rol de ahí.
--
-- Así la base se defiende sola aunque alguien vuelva a encender el registro
-- público: la cuenta existiría, pero no vería ni tocaría nada que no vea ya el
-- visitante anónimo.
--
-- ----------------------------------------------------------------------------
-- QUÉ CAMBIA (y qué no)
-- ----------------------------------------------------------------------------
--   · Escritura del panel (`for all to authenticated`): de `true` a
--     `es_admin()` en alojamientos, planes, tarifas, extras, contenido,
--     imagenes, temporadas, reservas, reserva_extras, bloqueos y pagos.
--   · Lectura «extra» del panel dentro de las políticas públicas (ver lo
--     pausado, las tarifas viejas, las temporadas pasadas): de
--     `auth.role() = 'authenticated'` a `es_admin()`. La parte pública de esas
--     mismas políticas queda IDÉNTICA: el sitio sigue leyendo lo publicado.
--   · Storage (`storage.objects`): subir, reemplazar y borrar en los buckets
--     `imagenes` y `videos` exige además `es_admin()`. La lectura pública de
--     los dos buckets no cambia.
--   · `authenticated` pierde TRUNCATE, TRIGGER y REFERENCES en las tablas de
--     `public`, como ya se hizo con `anon` en la 011: TRUNCATE no pasa por RLS
--     y el panel no los usa. (La API REST no expone TRUNCATE, pero no hay por
--     qué dejarlo concedido.)
--   · No se tocan `cache_externo` ni `pagos_eventos`: no tienen políticas ni
--     privilegios para `anon` ni `authenticated` (solo `service_role`).
--   · `guardar_temporada()` y `liberar_reservas_vencidas()` son
--     `security invoker`: corren con las políticas de quien las llama, así que
--     una cuenta sin rol no escribe nada a través de ellas.
--
-- Idempotente (cada política se recrea con `drop policy if exists`) y
-- reversible: al final del archivo, comentado, está cómo deshacerla.
-- ============================================================================

set search_path to public, extensions;

-- ----------------------------------------------------------------------------
-- es_admin(): ¿el JWT de esta petición es de una cuenta del panel?
--
-- `stable`: dentro de una consulta da siempre lo mismo, y envuelta en
-- `(select …)` Postgres la evalúa una sola vez por consulta, no por fila.
-- `search_path` vacío: todo va calificado (`auth.jwt()`), así que nadie puede
-- colarle una función con el mismo nombre en otro esquema.
--
-- `security invoker` (y no `definer`) a propósito: solo lee el JWT de la propia
-- petición —`auth.jwt()`, que `anon` y `authenticated` ya pueden ejecutar— y no
-- toca ninguna tabla, así que no necesita privilegios del dueño. Una función
-- `security definer` en un esquema expuesto es, además, de lo que avisa el
-- asesor de seguridad de Supabase.
--
-- Sin JWT (conexión directa como `postgres`, tareas internas) devuelve false:
-- esas conexiones no pasan por RLS de todos modos.
-- ----------------------------------------------------------------------------
create or replace function public.es_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'rol') in ('propietario', 'equipo'),
    false
  );
$$;

comment on function public.es_admin() is
  'true si el JWT de la petición trae app_metadata.rol = propietario o equipo. Lo usan las políticas RLS del panel y de Storage (migración 018).';

revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Catálogo: alojamientos, planes, extras
-- ----------------------------------------------------------------------------
drop policy if exists "alojamientos lectura publica" on alojamientos;
create policy "alojamientos lectura publica" on alojamientos
  for select to anon, authenticated
  using (activo = true or (select public.es_admin()));

drop policy if exists "alojamientos escritura panel" on alojamientos;
create policy "alojamientos escritura panel" on alojamientos
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

drop policy if exists "planes lectura publica" on planes;
create policy "planes lectura publica" on planes
  for select to anon, authenticated
  using (activo = true or (select public.es_admin()));

drop policy if exists "planes escritura panel" on planes;
create policy "planes escritura panel" on planes
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

drop policy if exists "extras lectura publica" on extras;
create policy "extras lectura publica" on extras
  for select to anon, authenticated
  using (activo = true or (select public.es_admin()));

drop policy if exists "extras escritura panel" on extras;
create policy "extras escritura panel" on extras
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- ----------------------------------------------------------------------------
-- Tarifas y temporadas (la parte pública, igual que en la 017)
-- ----------------------------------------------------------------------------
drop policy if exists "tarifas lectura publica" on tarifas;
create policy "tarifas lectura publica" on tarifas
  for select to anon, authenticated
  using (
    (select public.es_admin())
    or (
      exists (select 1 from planes p where p.id = tarifas.plan_id and p.activo)
      and (
        (
          tarifas.temporada_id is null
          and exists (
            select 1 from alojamientos a
             where a.id = tarifas.alojamiento_id and a.activo
          )
        )
        or (
          tarifas.temporada_id is not null
          and upper(tarifas.vigencia) > (now() at time zone 'America/Bogota')::date
        )
      )
    )
  );

drop policy if exists "tarifas escritura panel" on tarifas;
create policy "tarifas escritura panel" on tarifas
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

drop policy if exists "temporadas lectura publica" on temporadas;
create policy "temporadas lectura publica" on temporadas
  for select to anon, authenticated
  using (
    (select public.es_admin())
    or upper(noches) > (now() at time zone 'America/Bogota')::date
  );

drop policy if exists "temporadas escritura panel" on temporadas;
create policy "temporadas escritura panel" on temporadas
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- ----------------------------------------------------------------------------
-- Contenido del sitio e imágenes
-- ----------------------------------------------------------------------------
-- "contenido lectura publica" (using true) no cambia: es el texto del sitio.
drop policy if exists "contenido escritura panel" on contenido;
create policy "contenido escritura panel" on contenido
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

drop policy if exists "imagenes lectura publica" on imagenes;
create policy "imagenes lectura publica" on imagenes
  for select to anon, authenticated
  using (
    (select public.es_admin())
    or alojamiento_id is null
    or exists (select 1 from alojamientos a where a.id = imagenes.alojamiento_id and a.activo)
  );

drop policy if exists "imagenes escritura panel" on imagenes;
create policy "imagenes escritura panel" on imagenes
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- ----------------------------------------------------------------------------
-- Lo privado: reservas, extras de reserva, bloqueos y pagos
-- (`anon` no tiene ni privilegios sobre ellas desde la 011)
-- ----------------------------------------------------------------------------
drop policy if exists "reservas solo panel" on reservas;
create policy "reservas solo panel" on reservas
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

drop policy if exists "reserva_extras solo panel" on reserva_extras;
create policy "reserva_extras solo panel" on reserva_extras
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

drop policy if exists "bloqueos solo panel" on bloqueos;
create policy "bloqueos solo panel" on bloqueos
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

drop policy if exists "pagos solo panel" on pagos;
create policy "pagos solo panel" on pagos
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- ----------------------------------------------------------------------------
-- Storage: buckets `imagenes` y `videos`
-- La lectura pública ("… lectura publica") no cambia.
-- ----------------------------------------------------------------------------
drop policy if exists "imagenes subida panel" on storage.objects;
create policy "imagenes subida panel" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imagenes' and (select public.es_admin()));

drop policy if exists "imagenes actualizacion panel" on storage.objects;
create policy "imagenes actualizacion panel" on storage.objects
  for update to authenticated
  using (bucket_id = 'imagenes' and (select public.es_admin()))
  with check (bucket_id = 'imagenes' and (select public.es_admin()));

drop policy if exists "imagenes borrado panel" on storage.objects;
create policy "imagenes borrado panel" on storage.objects
  for delete to authenticated
  using (bucket_id = 'imagenes' and (select public.es_admin()));

drop policy if exists "videos subida panel" on storage.objects;
create policy "videos subida panel" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'videos' and (select public.es_admin()));

drop policy if exists "videos actualizacion panel" on storage.objects;
create policy "videos actualizacion panel" on storage.objects
  for update to authenticated
  using (bucket_id = 'videos' and (select public.es_admin()))
  with check (bucket_id = 'videos' and (select public.es_admin()));

drop policy if exists "videos borrado panel" on storage.objects;
create policy "videos borrado panel" on storage.objects
  for delete to authenticated
  using (bucket_id = 'videos' and (select public.es_admin()));

-- ----------------------------------------------------------------------------
-- Privilegios que RLS no frena
-- ----------------------------------------------------------------------------
revoke truncate, trigger, references on all tables in schema public from authenticated;

-- ============================================================================
-- CÓMO DESHACERLA (no se ejecuta: está comentado)
--
-- Vuelve exactamente al estado de la 017. Solo tiene sentido si es_admin()
-- diera un falso negativo con una cuenta real; antes de eso, revisar que la
-- cuenta tenga `app_metadata.rol` (desde /admin/usuarios).
--
--   begin;
--   -- 1. Las escrituras vuelven a `true` (repetir para cada tabla):
--   --    alojamientos, planes, extras, tarifas, temporadas, contenido,
--   --    imagenes ("… escritura panel") y reservas, reserva_extras,
--   --    bloqueos, pagos ("… solo panel").
--   alter policy "reservas solo panel" on reservas
--     using (true) with check (true);
--   -- 2. Las lecturas del panel vuelven a `auth.role() = 'authenticated'`:
--   alter policy "alojamientos lectura publica" on alojamientos
--     using (activo = true or auth.role() = 'authenticated');
--   --    (igual en planes y extras; en tarifas, temporadas e imagenes se
--   --    cambia `(select public.es_admin())` por
--   --    `auth.role() = 'authenticated'` en su expresión de la 002/017.)
--   -- 3. Storage: quitar `and (select public.es_admin())` de las seis
--   --    políticas "imagenes|videos subida|actualizacion|borrado panel".
--   alter policy "imagenes subida panel" on storage.objects
--     with check (bucket_id = 'imagenes');
--   -- 4. Privilegios:
--   grant truncate, trigger, references on all tables in schema public to authenticated;
--   -- 5. Solo cuando ninguna política la use ya:
--   drop function public.es_admin();
--   commit;
-- ============================================================================
