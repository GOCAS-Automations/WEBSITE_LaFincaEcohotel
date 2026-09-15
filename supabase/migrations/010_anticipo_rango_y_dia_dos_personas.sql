-- ============================================================================
-- 010 — El anticipo pasa a ser un RANGO (50–100 %) y el Día de Calma, para dos
--
-- Dos decisiones del cliente del 2026-09-15:
--
--   1. **El anticipo ya no es 50 % o 100 %**, sino cualquier porcentaje entre
--      los dos: el huésped lo elige con un control deslizante de cinco en
--      cinco. El 50 % sigue siendo el mínimo que confirma la reserva (§5 de
--      `docs/DATOS_CLIENTE.md`) y el resto se paga por link antes de llegar.
--      El `check (porcentaje_anticipo in (50,100))` de la 009 se sustituye por
--      `between 50 and 100`: es una AMPLIACIÓN, así que ninguna fila existente
--      deja de ser válida.
--
--   2. **El Día de Calma se vende para una o dos personas.** El cupo de 10
--      personas por día sigue siendo el de toda la finca —lo llenan varias
--      reservas distintas—; lo que desaparece es la «persona adicional», que
--      el hotel nunca llegó a tarifar.
--
-- Idempotente: se puede ejecutar dos veces seguidas sin efecto.
-- ============================================================================

set search_path to public, extensions;

-- ----------------------------------------------------------------------------
-- 1. Anticipo: de dos valores sueltos a un rango
-- ----------------------------------------------------------------------------

alter table reservas
  drop constraint if exists reservas_porcentaje_anticipo_valido;

do $$
begin
  alter table reservas add constraint reservas_porcentaje_anticipo_valido
    check (porcentaje_anticipo between 50 and 100);
exception
  when duplicate_object then null;
end
$$;

comment on column reservas.porcentaje_anticipo is
  'Qué parte del total se cobra por adelantado: un entero entre 50 y 100. El resto se paga por link antes de llegar.';

-- ----------------------------------------------------------------------------
-- 2. Día de Calma: una o dos personas por reserva
-- ----------------------------------------------------------------------------
--
-- La regla solo aplica al tipo `dia`: una reserva de hospedaje sigue con su
-- propia validación de capacidad por cabaña. Si alguna fila vieja de día
-- tuviera más de dos personas, el constraint no se crea y la migración avisa
-- en vez de abortar: es un dato que hay que revisar a mano, no una razón para
-- dejar la base a medio migrar.

do $$
begin
  alter table reservas add constraint reservas_dia_maximo_dos_personas
    check (tipo <> 'dia' or num_personas between 1 and 2);
exception
  when duplicate_object then null;
  when check_violation then
    raise notice 'Hay reservas de Día de Calma con más de dos personas: revísalas antes de crear reservas_dia_maximo_dos_personas.';
end
$$;

comment on column reservas.num_personas is
  'Personas de la reserva. En el Día de Calma, 1 o 2; el cupo de 10 por día es de toda la finca y lo llenan varias reservas.';
