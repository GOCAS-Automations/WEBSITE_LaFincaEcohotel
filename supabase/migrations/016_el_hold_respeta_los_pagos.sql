-- ============================================================================
-- 016 — El barrido de holds **nunca** cancela una reserva pagada
--
-- ---------------------------------------------------------------------------
-- EL FALLO QUE ESTO ARREGLA, CON NOMBRE Y APELLIDOS
-- ---------------------------------------------------------------------------
-- El 2026-10-01 se hicieron dos pagos de verdad en el ambiente de pruebas de
-- Bold. **No llegó ni un evento de webhook** —el sandbox no los envía solos y el
-- botón «Probar el webhook» de su panel solo guarda la URL—, así que nadie
-- confirmó nada. Treinta minutos después, `liberar_reservas_vencidas()` hizo su
-- trabajo: canceló `LF-2026-0001` y anotó «la solicitud caducó sin completar el
-- pago».
--
-- El pago existía. En producción eso es **un huésped que paga y se queda sin
-- reserva**, y es el único fallo verdaderamente inaceptable de un motor de
-- reservas: el huésped no se enterará hasta que llegue a la finca.
--
-- La respuesta tiene tres piezas y esta migración es la tercera:
--
--   1. `src/lib/pagos/reconciliar.ts` — le preguntamos nosotros a Bold (página
--      de retorno, cron diario y un botón del panel), con el mismo código de
--      escritura que el webhook.
--   2. El cron de `/api/salud` reconcilia **antes** de barrer.
--   3. Y aun así, **el barrido no puede ser el que cancele un pago cobrado.** Es
--      la última línea: si las dos primeras fallan, esta sigue en pie.
--
-- ---------------------------------------------------------------------------
-- LAS DOS EXCLUSIONES, Y POR QUÉ UNA ES ABSOLUTA Y LA OTRA NO
-- ---------------------------------------------------------------------------
-- **`APPROVED` → nunca se cancela. Sin plazo.** Si entró el dinero, la reserva
-- existe. Una reserva pagada no caduca ni a los treinta minutos ni a los treinta
-- días; lo que haya que hacer con ella (reubicar, devolver) lo decide una
-- persona, no un `UPDATE` de madrugada. Esta exclusión no tiene coste: una
-- reserva pagada tiene derecho a apartar sus noches.
--
-- **`PROCESSING` / `PENDING` → quince minutos de gracia desde la última vez que
-- la fila de `pagos` SE MOVIÓ** (`actualizado_at`, que mantiene el trigger
-- `pagos_tocar_actualizado`). Conviene ser exacto con lo que esto cubre y con lo
-- que no, porque una media medida sin documentar es peor que ninguna:
--
--   · **Sí cubre** el caso en que alguien acaba de comprobar el pago y Bold
--     respondió «todavía lo estoy decidiendo»: la reconciliación escribe ese
--     `PROCESSING`/`PENDING`, con lo que `actualizado_at` pasa a ser ahora, y la
--     reserva se queda quince minutos más en pie. Es la carrera real: el cobro
--     que se aprueba justo cuando el hold muere, con PSE —el huésped se va al
--     portal de su banco— como caso típico.
--   · **No cubre** el checkout abandonado del que nadie ha vuelto a saber: su
--     `actualizado_at` sigue siendo el de la creación, treinta minutos atrás, y
--     la reserva se cancela al vencer el hold **exactamente como antes**. Eso es
--     lo correcto y lo deseado: la inmensa mayoría de los `PROCESSING` que
--     mueren son abandonos, y esas noches tienen que volver al calendario.
--
-- Y por eso la gracia es de quince minutos y no de horas. El coste de alargarla
-- está en una rareza de la base que hay que tener presente:
--
--     `reservas_sin_solapamiento` es una restricción EXCLUDE y su predicado no
--     puede leer `now()`: para ella, una `pendiente` con el hold vencido **sigue
--     apartando las fechas**. El barrido es lo único que las devuelve al
--     calendario de verdad. Una reserva que no se cancela es, por tanto, unas
--     noches que `/api/disponibilidad` ofrece como libres (eso lo decide
--     `ocupaCalendario()` en memoria, y ahí el hold vencido no ocupa) pero que
--     rechazarían una reserva nueva al insertarla.
--
-- O sea: alargar la gracia protege pagos lentos y, a cambio, produce noches que
-- se ofrecen y no se pueden comprar. Quince minutos deja esa ventana en un cuarto
-- de hora y **confía el resto a la reconciliación**, que es la pieza que de verdad
-- recupera un pago aprobado: si una reserva pagada llegó a cancelarse, la
-- siguiente reconciliación la **resucita** (`aplicar-estado.ts`, `MOTIVO_RECUPERADA`).
--
-- ---------------------------------------------------------------------------
-- QUÉ **NO** CAMBIA
-- ---------------------------------------------------------------------------
--   · La regla de llamar a esta función ANTES de crear o reactivar cualquier
--     reserva sigue igual de obligatoria (ver la 013 y `docs/MEMORIA.md`).
--   · `expira_at is null` sigue significando «no vence», y todo lo que apunta el
--     equipo a mano desde el panel sigue naciendo así.
--   · El motivo se sigue ANEXANDO a `notas`, sin duplicar y sin pisar lo que
--     escribió el huésped. El texto tiene que seguir siendo idéntico a
--     `MOTIVO_VENCIDA` de `src/lib/reserva/holds.ts`; hay una prueba que lo vigila.
--
-- Idempotente.
-- ============================================================================

set search_path to public, extensions;

-- ----------------------------------------------------------------------------
-- 1. Un índice para que la exclusión no cueste nada
-- ----------------------------------------------------------------------------
-- El `not exists` de abajo pregunta «¿tiene esta reserva algún pago en tal
-- estado?». `pagos_reserva_fecha_idx` ordena por fecha y serviría, pero este
-- lleva el estado dentro y resuelve la pregunta sin tocar la tabla. Pesa lo que
-- pesan los pagos, que son muchos menos que las reservas.
create index if not exists pagos_reserva_estado_idx
  on pagos (reserva_id, estado);

-- ----------------------------------------------------------------------------
-- 2. El barrido, con las dos exclusiones
-- ----------------------------------------------------------------------------
create or replace function liberar_reservas_vencidas(
  motivo text default 'Reserva vencida: la solicitud caducó sin completar el pago.'
)
returns integer
language sql
security invoker
set search_path = public, pg_temp
as $$
  with liberadas as (
    update reservas r
       set estado = 'cancelada',
           notas = case
             -- Sin notas previas: el motivo es la nota.
             when r.notas is null or btrim(r.notas) = '' then motivo
             -- Ya estaba anotado (una re-ejecución): no se duplica.
             when position(motivo in r.notas) > 0 then r.notas
             -- Lo que escribió el huésped se conserva y el motivo va detrás.
             else r.notas || chr(10) || motivo
           end
     where r.estado = 'pendiente'
       and r.expira_at is not null
       and r.expira_at <= now()
       -- ⚠ LA EXCLUSIÓN. Ver el comentario largo de la cabecera.
       and not exists (
         select 1
           from pagos p
          where p.reserva_id = r.id
            and (
              -- Entró el dinero: esta reserva no caduca nunca.
              p.estado = 'APPROVED'
              -- O está decidiéndose ahora mismo: quince minutos de gracia.
              or (
                p.estado in ('PROCESSING', 'PENDING')
                and p.actualizado_at > now() - interval '15 minutes'
              )
            )
       )
    returning 1
  )
  select count(*)::int from liberadas;
$$;

comment on function liberar_reservas_vencidas(text) is
  'Cancela de una sola sentencia las reservas `pendiente` cuyo hold venció y anexa el motivo a `notas`. Devuelve cuántas cayeron. NUNCA toca una reserva con un pago `APPROVED`, ni una con un pago `PROCESSING`/`PENDING` movido en los últimos 15 minutos: un pago cobrado no puede perderse por un vencimiento (migración 016). Hay que llamarla ANTES de crear o reactivar cualquier reserva: la restricción EXCLUDE no puede leer now().';

-- Permisos: se repiten porque `create or replace function` los conserva, pero
-- dejarlos escritos hace que esta migración siga siendo correcta si algún día se
-- aplica sobre una base donde la 013 no corrió.
revoke all on function liberar_reservas_vencidas(text) from public;
revoke all on function liberar_reservas_vencidas(text) from anon;
grant execute on function liberar_reservas_vencidas(text) to authenticated;
grant execute on function liberar_reservas_vencidas(text) to service_role;
