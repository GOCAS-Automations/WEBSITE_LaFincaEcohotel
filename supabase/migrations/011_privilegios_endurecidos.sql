-- ============================================================================
-- 011 — Privilegios de tabla endurecidos para el rol anónimo
--
-- Sale de la auditoría de seguridad del 2026-09-30
-- (`docs/AUDITORIA_SEGURIDAD.md`). Las políticas RLS de la 002 están bien y se
-- probaron una por una con la clave anon: `reservas`, `pagos`, `reserva_extras`
-- y `bloqueos` no se leen ni se escriben desde fuera. Lo que esta migración
-- arregla son dos agujeros que están DEBAJO de RLS.
--
-- ----------------------------------------------------------------------------
-- 1. TRUNCATE NO PASA POR RLS
-- ----------------------------------------------------------------------------
-- Postgres aplica RLS a select/insert/update/delete. **A `truncate` no.** Y el
-- rol `anon` tenía TRUNCATE (y TRIGGER y REFERENCES) sobre `alojamientos`,
-- `planes`, `tarifas`, `extras`, `contenido` e `imagenes`, heredado de los
-- `alter default privileges` que trae un proyecto de Supabase recién creado:
--
--   select has_table_privilege('anon','contenido','TRUNCATE');  -- era true
--
-- Hoy no es explotable —PostgREST no expone `truncate` y `anon` no puede
-- ejecutar SQL libre— pero es un privilegio que, el día que exista cualquier
-- función `security definer` descuidada o una ruta nueva, vacía el catálogo y
-- el contenido del sitio de un golpe y sin que RLS diga nada. No hay ningún
-- motivo para que el visitante de un hotel lo tenga.
--
-- ----------------------------------------------------------------------------
-- 2. LA PRÓXIMA TABLA NACÍA ESCRIBIBLE POR CUALQUIERA
-- ----------------------------------------------------------------------------
-- Los `alter default privileges` por defecto conceden `arwdDxtm` (es decir
-- TODO: insert, select, update, delete, truncate, references, trigger) a `anon`
-- sobre **cualquier tabla futura** del esquema `public`:
--
--   select defaclacl from pg_default_acl;
--   -- {postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,…}
--
-- La 002 lo compensó a mano, tabla por tabla, con `revoke`. Eso funciona para
-- las diez tablas que existían y falla en silencio para la primera que se cree
-- después: la tabla de la pasarela de pagos, la de consentimientos, la de
-- correos enviados. Si quien la escribe olvida el `revoke` —o el `enable row
-- level security`— la tabla nace con INSERT, UPDATE y DELETE abiertos a
-- internet. Es el fallo más caro posible y depende de que nadie se olvide.
--
-- Aquí se invierte la regla: **por defecto, `anon` no recibe nada**. Lo que el
-- público debe poder leer se concede explícitamente.
--
-- ⚠ CONSECUENCIA PARA QUIEN ESCRIBA LA PRÓXIMA MIGRACIÓN: una tabla nueva que
-- deba leerse desde el sitio público necesita su `grant select` a mano, además
-- de su política RLS. Si el sitio deja de ver una tabla nueva, esto es el
-- motivo. Es deliberado: se prefiere un `select` que falta a un `insert` que
-- sobra.
--
-- No toca a `authenticated` (el panel escribe con ese rol) ni a `service_role`.
-- Idempotente: `revoke` y `grant` se pueden repetir.
-- ============================================================================

set search_path to public, extensions;

-- ----------------------------------------------------------------------------
-- 1. El rol anónimo pierde TRUNCATE, TRIGGER y REFERENCES en todo `public`
-- ----------------------------------------------------------------------------
revoke truncate, trigger, references on all tables in schema public from anon;

-- Y también sobre las secuencias y funciones que no necesita.
revoke all on all sequences in schema public from anon;

-- ----------------------------------------------------------------------------
-- 2. Las tablas futuras de `public` no le conceden nada a `anon`
-- ----------------------------------------------------------------------------
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- Los mismos valores por defecto existen a nombre de `supabase_admin`, que es
-- quien crea las tablas cuando se usa el editor SQL del panel de Supabase. Se
-- intenta también para ese rol; si el rol conectado no tiene permiso para
-- cambiarlos, la migración NO falla: se avisa y se sigue, porque lo importante
-- (las tablas que crea `postgres`, que es quien corre `npm run db:aplicar`) ya
-- quedó cubierto arriba.
do $$
begin
  execute 'alter default privileges for role supabase_admin in schema public revoke all on tables from anon';
  execute 'alter default privileges for role supabase_admin in schema public revoke all on sequences from anon';
exception when insufficient_privilege or undefined_object then
  raise notice 'No se pudieron cambiar los privilegios por defecto de supabase_admin (hace falta ese rol). Las tablas creadas desde el editor SQL de Supabase seguirán naciendo con permisos para anon: revócalos a mano.';
end $$;

-- ----------------------------------------------------------------------------
-- 3. Lo que el público SÍ debe leer, concedido explícitamente
-- ----------------------------------------------------------------------------
-- Hasta ahora estas seis tablas dependían del `grant` implícito de los valores
-- por defecto. Ahora se dice en voz alta, para que el día que alguien revise
-- los permisos vea la intención y no un residuo de la plantilla de Supabase.
-- La lectura sigue filtrada por las políticas de la 002: solo lo activo.
grant select on alojamientos to anon;
grant select on planes       to anon;
grant select on tarifas      to anon;
grant select on extras       to anon;
grant select on contenido    to anon;
grant select on imagenes     to anon;

-- Y se vuelve a dejar claro que de los datos personales y financieros no tiene
-- nada (ya estaba en la 002; repetirlo aquí lo hace evidente en un solo
-- archivo, y es idempotente).
revoke all on reservas       from anon;
revoke all on reserva_extras from anon;
revoke all on bloqueos       from anon;
revoke all on pagos          from anon;
