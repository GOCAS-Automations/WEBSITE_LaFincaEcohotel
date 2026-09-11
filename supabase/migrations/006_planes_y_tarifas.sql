-- ============================================================================
-- 006 — Planes de día, días en que aplica cada plan y tarifa de 1 persona
--
-- POR QUÉ: el modelo de 001 asumía que TODO plan es una noche de hospedaje en
-- una cabaña, y que el precio siempre sale de `tarifas` (cabaña × plan). Los
-- datos reales del hotel (`docs/DATOS_CLIENTE.md`) rompen las dos suposiciones:
--
--   · «Día de Calma» se vende por día, sin hospedaje y sin cabaña: tiene
--     horario fijo y un precio único, no un precio por cabaña.
--   · Cada plan de hospedaje solo se puede reservar ciertos días de la semana
--     (Entre Semana de lunes a jueves; Estándar y Premium de viernes a domingo
--     y festivos). Antes esto vivía en `tarifas.dias_semana`, es decir repetido
--     en cada cabaña, cuando en realidad es una propiedad del plan.
--   · El plan Entre Semana tiene un precio distinto si viaja una sola persona.
--
-- Idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

set search_path to public, extensions;

-- ----------------------------------------------------------------------------
-- PLANES
-- ----------------------------------------------------------------------------

-- `tipo` — separa las dos formas de vender del hotel:
--   'hospedaje' → el huésped duerme en una cabaña; el precio sale de `tarifas`.
--   'dia'       → visita de día, sin cabaña ni noche; el precio sale de
--                 `precio_base` y la reserva no ocupa una cabaña completa.
-- El default 'hospedaje' es lo que corresponde a los planes que ya existían.
alter table planes
  add column if not exists tipo text not null default 'hospedaje';

do $$
begin
  alter table planes add constraint planes_tipo_valido
    check (tipo in ('hospedaje','dia'));
exception
  when duplicate_object then null;
end
$$;

-- `dias_aplica` — días ISO de la semana (1 = lunes … 7 = domingo) en los que
-- se puede reservar el plan. `null` significa «todos los días», que es el caso
-- de los planes de día. Vive en el plan, no en la tarifa, porque la regla es
-- del plan: Entre Semana es de lunes a jueves en las cinco cabañas.
alter table planes
  add column if not exists dias_aplica int[];

-- `horario` — franja horaria en texto («10:00 a. m. – 5:00 p. m.»), solo tiene
-- sentido en los planes de tipo 'dia'. Se guarda como texto, y no como dos
-- columnas `time`, a propósito: es un dato que el panel muestra tal cual y que
-- el cliente debe poder redactar como quiera. En los planes de hospedaje va
-- `null` (sus horarios son los de check-in/check-out del hotel).
alter table planes
  add column if not exists horario text;

-- `precio_base` — precio en pesos enteros de los planes que NO se reservan por
-- cabaña (hoy solo «Día de Calma»). En los planes de hospedaje es `null`:
-- su precio vive en `tarifas`, una fila por cabaña.
alter table planes
  add column if not exists precio_base int;

do $$
begin
  alter table planes add constraint planes_precio_base_positivo
    check (precio_base is null or precio_base >= 0);
exception
  when duplicate_object then null;
end
$$;

-- Coherencia entre `tipo` y las columnas que dependen de él: un plan de
-- hospedaje no puede traer horario ni precio propio (sería un precio fantasma
-- que compite con el de `tarifas`), y un plan de día sí necesita su precio.
-- Se valida en la base además de en el panel: el panel no es el único camino
-- por el que pueden entrar datos.
do $$
begin
  alter table planes add constraint planes_coherencia_tipo
    check (
      (tipo = 'hospedaje' and horario is null and precio_base is null)
      or (tipo = 'dia' and precio_base is not null)
    );
exception
  when duplicate_object then null;
end
$$;

comment on column planes.tipo is
  'hospedaje = noche en cabaña (precio en tarifas); dia = visita sin hospedaje (precio en precio_base).';
comment on column planes.dias_aplica is
  'Días ISO (1 = lunes … 7 = domingo) en que se puede reservar el plan. NULL = todos.';
comment on column planes.horario is
  'Franja horaria del plan de día, en texto. NULL en los planes de hospedaje.';
comment on column planes.precio_base is
  'Precio en COP de los planes que no se reservan por cabaña. NULL en los de hospedaje.';

-- ----------------------------------------------------------------------------
-- TARIFAS
-- ----------------------------------------------------------------------------

-- `precio_noche_1_persona` — precio por noche cuando viaja una sola persona.
-- Es opcional (`null` = no hay precio distinto y se cobra `precio_noche` sin
-- importar cuántos viajan). Hoy solo lo usa el plan Entre Semana: $200.000 en
-- vez de $350.000. No se modela como un plan aparte porque para el huésped es
-- el mismo plan con otra ocupación, no otra cosa que comprar.
alter table tarifas
  add column if not exists precio_noche_1_persona int;

do $$
begin
  alter table tarifas add constraint tarifas_precio_1_persona_positivo
    check (precio_noche_1_persona is null or precio_noche_1_persona >= 0);
exception
  when duplicate_object then null;
end
$$;

comment on column tarifas.precio_noche_1_persona is
  'Precio por noche para una sola persona, en COP. NULL = se cobra precio_noche siempre.';

-- ----------------------------------------------------------------------------
-- RLS
--
-- No hace falta tocar `002_rls.sql`: las políticas de `planes` y `tarifas` son
-- por tabla (lectura pública de lo activo, escritura autenticada), no por
-- columna, así que las columnas nuevas quedan cubiertas automáticamente.
-- Se deja constancia aquí para que nadie tenga que volver a comprobarlo.
-- ----------------------------------------------------------------------------
