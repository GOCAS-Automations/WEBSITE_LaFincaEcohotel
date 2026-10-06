-- ============================================================================
-- 024 — La base impide reservar sobre un bloqueo o sobre una estadía completada
-- ============================================================================
--
-- HASTA AHORA la base solo impedía que dos reservas PENDIENTES o CONFIRMADAS de
-- la misma cabaña se cruzaran (`reservas_sin_solapamiento`, migración 001). Lo
-- demás lo comprobaba solo la aplicación (`buscarChoques`), antes de escribir:
--
--   · una reserva sobre un BLOQUEO (mantenimiento, uso de los dueños);
--   · una reserva sobre una estadía COMPLETADA.
--
-- Dos guardados simultáneos —o un script, o el editor de Supabase— podían
-- colarse entre la comprobación y la escritura.
--
-- 1) COMPLETADAS EN LA EXCLUSIÓN. El predicado de `reservas_sin_solapamiento`
--    pasa a ser `estado in ('pendiente','confirmada','completada')`. Es seguro:
--    una completada es una estadía que ya ocupó esas noches, y la aplicación ya
--    la contaba como ocupada (`ESTADOS_QUE_OCUPAN`). Se quita y se vuelve a
--    crear dentro de esta misma transacción: no hay un instante sin ella.
--
-- 2) RESERVAS Y BLOQUEOS, EN LOS DOS SENTIDOS. Una restricción EXCLUDE no puede
--    mirar dos tablas, así que van dos triggers `before`, cada uno con un
--    candado por cabaña (`pg_advisory_xact_lock(hashtext('cabana:' || id))`):
--    una reserva y un bloqueo de la misma cabaña que llegan a la vez se ponen
--    en fila y el segundo ve al primero. El error es el mismo SQLSTATE de la
--    exclusión (23P01), así que todo el código que ya lo traduce («esas fechas
--    se acaban de ocupar») sirve tal cual.
--
--      · `reservas`: al crear una reserva que ocupa (pendiente, confirmada o
--        completada) en una cabaña, o al cambiarle el estado, la cabaña o las
--        fechas, no puede pisar un bloqueo. Retocar otra cosa (notas, abonos,
--        el evento de Google) no comprueba nada.
--      · `bloqueos`: un bloqueo no puede pisar una reserva que ocupa. Una
--        solicitud `pendiente` con el hold vencido NO ocupa (misma regla que
--        `ocupaCalendario()` en la aplicación).
--
--    El orden de los candados es siempre el mismo —contador de códigos (019),
--    día (020), cabaña (este)— porque los triggers `before` se disparan por
--    orden alfabético: dos escrituras no pueden bloquearse entre sí.
--
-- LO QUE SIGUE SIN PODER HACER LA BASE: los eventos del calendario de Google
-- del hotel no están en Postgres. Ahí la aplicación lee Google justo antes de
-- escribir y, si no responde, no escribe (falla cerrado).
--
-- COMPATIBLE HACIA ATRÁS: hoy no hay ni reservas ni bloqueos que se crucen
-- (se comprueba abajo antes de tocar nada). El código desplegado ya hace estas
-- comprobaciones antes de escribir; solo verá el 23P01 en una carrera.
-- ============================================================================

set search_path to public, extensions;

-- Antes de nada: que no haya cruces que la regla nueva fuera a romper.
do $$
declare
  entre_reservas int;
  con_bloqueos int;
begin
  select count(*) into entre_reservas
    from reservas a
    join reservas b
      on a.id < b.id
     and a.alojamiento_id = b.alojamiento_id
     and a.estancia && b.estancia
   where a.estado in ('pendiente','confirmada','completada')
     and b.estado in ('pendiente','confirmada','completada');

  select count(*) into con_bloqueos
    from reservas r
    join bloqueos b
      on b.alojamiento_id = r.alojamiento_id
     and b.rango && r.estancia
   where r.estado in ('confirmada','completada')
      or (r.estado = 'pendiente' and (r.expira_at is null or r.expira_at > now()));

  if entre_reservas > 0 or con_bloqueos > 0 then
    raise exception
      'Hay % cruces entre reservas y % entre reservas y bloqueos. Resuélvelos antes de aplicar la migración 024.',
      entre_reservas, con_bloqueos;
  end if;
end
$$;

-- ----------------------------------------------------------------------------
-- 1) Las completadas, dentro de la exclusión
-- ----------------------------------------------------------------------------
alter table reservas drop constraint if exists reservas_sin_solapamiento;
alter table reservas add constraint reservas_sin_solapamiento
  exclude using gist (
    alojamiento_id with =,
    estancia with &&
  ) where (estado in ('pendiente','confirmada','completada'));

comment on constraint reservas_sin_solapamiento on reservas is
  'Dos reservas que ocupan (pendiente, confirmada o completada) no se cruzan en la misma cabaña. Completada entra desde la migración 024.';

-- ----------------------------------------------------------------------------
-- 2a) Una reserva no pisa un bloqueo
-- ----------------------------------------------------------------------------
create or replace function reserva_no_pisa_bloqueo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  motivo_bloqueo text;
begin
  if new.alojamiento_id is null
     or new.estado not in ('pendiente','confirmada','completada') then
    return new;
  end if;

  -- Retocar algo que no son las noches no comprueba nada.
  if tg_op = 'UPDATE'
     and new.estado is not distinct from old.estado
     and new.alojamiento_id is not distinct from old.alojamiento_id
     and new.estancia is not distinct from old.estancia then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('cabana:' || new.alojamiento_id::text));

  select coalesce(nullif(btrim(b.motivo), ''), 'bloqueo')
    into motivo_bloqueo
    from bloqueos b
   where b.alojamiento_id = new.alojamiento_id
     and b.rango && new.estancia
   limit 1;

  if found then
    raise exception
      using errcode = 'exclusion_violation',
            message = format(
              'Esas noches están bloqueadas en esa cabaña (%s). Elige otras fechas u otra cabaña.',
              motivo_bloqueo
            );
  end if;

  return new;
end;
$$;

revoke all on function reserva_no_pisa_bloqueo() from public;
revoke all on function reserva_no_pisa_bloqueo() from anon;
revoke all on function reserva_no_pisa_bloqueo() from authenticated;

drop trigger if exists reservas_no_pisan_bloqueos on reservas;
create trigger reservas_no_pisan_bloqueos
  before insert or update on reservas
  for each row execute function reserva_no_pisa_bloqueo();

-- ----------------------------------------------------------------------------
-- 2b) Un bloqueo no pisa una reserva que ocupa
-- ----------------------------------------------------------------------------
create or replace function bloqueo_no_pisa_reserva()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.alojamiento_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.alojamiento_id is not distinct from old.alojamiento_id
     and new.rango is not distinct from old.rango then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('cabana:' || new.alojamiento_id::text));

  if exists (
    select 1
      from reservas r
     where r.alojamiento_id = new.alojamiento_id
       and r.estancia && new.rango
       and (
         r.estado in ('confirmada','completada')
         or (r.estado = 'pendiente' and (r.expira_at is null or r.expira_at > now()))
       )
  ) then
    raise exception
      using errcode = 'exclusion_violation',
            message = 'Esas noches ya tienen una reserva en esa cabaña: no se pueden bloquear. Cancela o mueve la reserva primero.';
  end if;

  return new;
end;
$$;

revoke all on function bloqueo_no_pisa_reserva() from public;
revoke all on function bloqueo_no_pisa_reserva() from anon;
revoke all on function bloqueo_no_pisa_reserva() from authenticated;

drop trigger if exists bloqueos_no_pisan_reservas on bloqueos;
create trigger bloqueos_no_pisan_reservas
  before insert or update on bloqueos
  for each row execute function bloqueo_no_pisa_reserva();
