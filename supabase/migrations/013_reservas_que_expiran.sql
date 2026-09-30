-- ============================================================================
-- 013 — Reservas que expiran (el «hold» del motor de reservas)
--
-- ---------------------------------------------------------------------------
-- EL PROBLEMA QUE RESUELVE
-- ---------------------------------------------------------------------------
-- Hoy el motor público cierra por WhatsApp y no crea nada: no hay reservas sin
-- pagar. Cuando entre la pasarela (jueves), sí las habrá, y aparece una
-- contradicción que no se puede dejar sin resolver:
--
--   · Si la reserva nace SIN ocupar el calendario, dos personas pueden pagar
--     la misma noche mientras cada una está en la pantalla de la pasarela.
--   · Si nace ocupando el calendario PARA SIEMPRE, quien abre el checkout y
--     cierra el navegador deja la cabaña bloqueada hasta que alguien se dé
--     cuenta a mano.
--
-- La salida es el hold: la reserva nace `pendiente` con `expira_at = ahora +
-- 30 minutos`. Mientras no venza, ocupa. Cuando vence, deja de ocupar y se
-- cancela sola. `expira_at is null` significa «no vence»: es lo que llevan las
-- confirmadas, las completadas y todas las que el equipo apunta a mano desde el
-- panel, que no caducan por definición.
--
-- ---------------------------------------------------------------------------
-- POR QUÉ HACE FALTA UNA FUNCIÓN, Y POR QUÉ HAY QUE LLAMARLA ANTES DE ESCRIBIR
-- ---------------------------------------------------------------------------
-- `reservas_sin_solapamiento` es una restricción EXCLUDE, y su predicado
-- (`where estado in ('pendiente','confirmada')`) tiene que ser INMUTABLE: no
-- puede llamar a `now()`. Para la restricción, un hold vencido sigue siendo una
-- `pendiente` que ocupa sitio, y rechazaría una reserva nueva sobre unas fechas
-- que en realidad están libres.
--
-- De ahí la regla que no se puede olvidar, documentada también en
-- `docs/MEMORIA.md`:
--
--   **Toda creación o reactivación de reserva —la del sitio público y la del
--   panel— llama antes a `liberar_reservas_vencidas()`.**
--
-- Los caminos de solo lectura (disponibilidad, calendario, listados) NO
-- escriben durante un render: aplican `ocupaCalendario()`
-- (`src/lib/reserva/holds.ts`) en memoria y dan la misma respuesta.
--
-- ---------------------------------------------------------------------------
-- UN SOLO `UPDATE`, Y EL MOTIVO SE **ANEXA** A LAS NOTAS
-- ---------------------------------------------------------------------------
-- El barrido es exactamente lo que tiene que ser atómico: entre un `select` y
-- un `update` hechos por separado cabe otra transacción. Y el motivo se añade
-- al final de `notas` en vez de sobrescribirlas: ahí está lo que escribió el
-- huésped («llegamos tarde», una alergia), y perderlo por un barrido
-- automático sería destruir información del cliente para dejar una etiqueta
-- técnica.
--
-- Idempotente.
-- ============================================================================

set search_path to public, extensions;

-- ----------------------------------------------------------------------------
-- 1. La columna
-- ----------------------------------------------------------------------------
alter table reservas
  add column if not exists expira_at timestamptz;

comment on column reservas.expira_at is
  'Momento en que una reserva `pendiente` deja de apartar las fechas. NULL = no vence (confirmadas, completadas y todo lo que apunta el equipo a mano).';

-- ----------------------------------------------------------------------------
-- 2. Índice PARCIAL: solo las pendientes con vencimiento
-- ----------------------------------------------------------------------------
-- El barrido pregunta siempre por lo mismo —«pendientes cuyo `expira_at` ya
-- pasó»— y esas son un puñado de filas dentro de una tabla que crecerá con
-- años de historial. Un índice sobre toda la columna indexaría miles de NULL
-- que nadie consulta; el parcial pesa lo que pesan las solicitudes vivas.
create index if not exists reservas_pendientes_vencimiento_idx
  on reservas (expira_at)
  where estado = 'pendiente' and expira_at is not null;

-- ----------------------------------------------------------------------------
-- 3. El barrido
-- ----------------------------------------------------------------------------
-- `security invoker` a propósito: quien la llama es el panel (rol
-- `authenticated`, con RLS a favor por la política «reservas solo panel») o el
-- servidor con `service_role`. Una `security definer` aquí sería un permiso de
-- escritura sobre `reservas` regalado a cualquiera que pueda invocar la
-- función, y no hace ninguna falta.
--
-- `search_path` fijo para que no dependa de quién la llame ni de lo que ese
-- rol tenga configurado.
create or replace function liberar_reservas_vencidas(
  motivo text default 'Reserva vencida: la solicitud caducó sin completar el pago.'
)
returns integer
language sql
security invoker
set search_path = public, pg_temp
as $$
  with liberadas as (
    update reservas
       set estado = 'cancelada',
           notas = case
             -- Sin notas previas: el motivo es la nota.
             when notas is null or btrim(notas) = '' then motivo
             -- Ya estaba anotado (una re-ejecución): no se duplica.
             when position(motivo in notas) > 0 then notas
             -- Lo que escribió el huésped se conserva y el motivo va detrás.
             else notas || chr(10) || motivo
           end
     where estado = 'pendiente'
       and expira_at is not null
       and expira_at <= now()
    returning 1
  )
  select count(*)::int from liberadas;
$$;

comment on function liberar_reservas_vencidas(text) is
  'Cancela de una sola sentencia las reservas `pendiente` cuyo hold venció y anexa el motivo a `notas`. Devuelve cuántas cayeron. Hay que llamarla ANTES de crear o reactivar cualquier reserva: la restricción EXCLUDE no puede leer now().';

-- Permisos: nadie por defecto, y solo el panel y el servidor.
-- El rol anónimo no tiene —ni tendrá— nada que hacer aquí: cancelar reservas
-- en masa no es una operación pública.
revoke all on function liberar_reservas_vencidas(text) from public;
revoke all on function liberar_reservas_vencidas(text) from anon;
grant execute on function liberar_reservas_vencidas(text) to authenticated;
grant execute on function liberar_reservas_vencidas(text) to service_role;
