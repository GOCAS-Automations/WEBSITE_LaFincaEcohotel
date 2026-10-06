-- ============================================================================
-- 022 — Pedir un código de reserva suelto es solo cosa del servidor
-- ============================================================================
--
-- La 019 dejó `siguiente_codigo_reserva()` ejecutable por `authenticated`: con
-- la migración 018, una cuenta con sesión pero SIN rol del panel no lee nada,
-- pero sí podía llamar a esta función por la API y gastar números de código
-- (el contador no baja nunca).
--
-- Nadie la necesita con la sesión del usuario: el código lo pone el trigger
-- `reservas_codigo_contador`, cuya función es `security definer` y llama a
-- esta como su dueño, sin mirar los permisos de quien inserta. Así que se le
-- quita a `authenticated` y se deja solo a `service_role`.
--
-- Una cuenta sin rol que intente insertar una reserva tampoco gasta números:
-- la RLS de `reservas` la rechaza y la transacción entera —incluido el `+1` del
-- contador— se deshace.
-- ============================================================================

set search_path to public, extensions;

revoke all on function siguiente_codigo_reserva() from public;
revoke all on function siguiente_codigo_reserva() from anon;
revoke all on function siguiente_codigo_reserva() from authenticated;
grant execute on function siguiente_codigo_reserva() to service_role;

-- Las funciones de trigger no se pueden llamar sueltas, pero se cierran igual.
revoke all on function asignar_codigo_reserva() from authenticated;
