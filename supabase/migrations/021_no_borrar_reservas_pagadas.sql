-- ============================================================================
-- 021 — Una reserva con un pago aprobado no se puede borrar
-- ============================================================================
--
-- EL FALLO. `pagos.reserva_id` es `on delete cascade` (migración 001): borrar
-- una reserva desde el panel borraba también sus pagos. Con un pago APROBADO
-- eso es borrar la única constancia de que el huésped pagó —la referencia, el
-- monto, el id de la transacción de Bold— y dejar al hotel sin con qué
-- devolverle el dinero o defenderse de un contracargo.
--
-- LA REGLA. Un trigger `before delete` en `reservas` lo impide si la reserva
-- tiene algún pago `APPROVED`, con un error propio (LF020) y el mensaje en
-- español. Lo que el panel ofrece en ese caso es CANCELAR, que conserva todo.
--
-- Por qué un trigger y no cambiar la llave a `on delete restrict`: con
-- `restrict` tampoco se podría borrar una reserva de prueba que solo tiene un
-- intento de pago rechazado o a medias, que es justo para lo que existe el
-- botón de borrar. Esos pagos sin dinero se siguen yendo en cascada.
--
-- El panel lo comprueba antes (`src/lib/admin/eliminar-reserva.ts`) para
-- explicarlo; esto es la red, y vale para cualquier camino (el código
-- desplegado hoy, un script, el editor de Supabase).
--
-- COMPATIBLE HACIA ATRÁS: hoy no hay ninguna reserva con pagos; el código
-- desplegado solo nota la diferencia si intenta borrar una pagada.
-- ============================================================================

set search_path to public, extensions;

create or replace function impedir_borrar_reserva_pagada()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1 from pagos p where p.reserva_id = old.id and p.estado = 'APPROVED'
  ) then
    raise exception
      using
        errcode = 'LF020',
        message = 'Esta reserva tiene un pago aprobado y no se puede borrar: se perdería el registro del dinero. Cancélala en su lugar.';
  end if;
  return old;
end;
$$;

comment on function impedir_borrar_reserva_pagada() is
  'Impide borrar una reserva con algún pago APPROVED (sus pagos se irían en cascada). Error LF020 con mensaje en español (migración 021).';

revoke all on function impedir_borrar_reserva_pagada() from public;
revoke all on function impedir_borrar_reserva_pagada() from anon;

drop trigger if exists reservas_no_borrar_pagadas on reservas;
create trigger reservas_no_borrar_pagadas
  before delete on reservas
  for each row execute function impedir_borrar_reserva_pagada();
