-- ============================================================================
-- 009 — Día de Calma como reserva, extras por noche y anticipo 50/100
--
-- POR QUÉ: hasta ahora `reservas` solo sabía de una forma de vender —una
-- cabaña, un rango de noches— y de un único paquete de extras «por estadía».
-- Los datos del cliente (`docs/DATOS_CLIENTE.md`) piden tres cosas más:
--
--   1. **Día de Calma se reserva.** Es una visita de un día sin hospedaje,
--      con un **cupo de 10 personas por día** para todo el hotel. No ocupa
--      cabaña: dos personas de día y una pareja durmiendo en la Cabaña 03 el
--      mismo jueves conviven sin estorbarse.
--   2. **Las experiencias se eligen POR NOCHE.** Una estadía de tres noches
--      puede llevar Fondue el viernes y Aniversario con Amor el sábado. El
--      modelo anterior solo permitía «Fondue ×2» sin decir cuándo.
--   3. **El anticipo puede ser del 50 % o del 100 %.** El resto se paga a la
--      finca por link de pago antes de la llegada (§5 de `DATOS_CLIENTE.md`).
--
-- Y deja preparada —sin implementarla— la futura sincronización con el
-- **Google Calendar** que el hotel llena a mano desde WhatsApp: un origen
-- nuevo y un campo para el id del evento.
--
-- Idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

set search_path to public, extensions;

-- ----------------------------------------------------------------------------
-- RESERVAS — tipo, origen nuevo, referencia externa y anticipo
-- ----------------------------------------------------------------------------

-- `tipo` — qué se vendió:
--   'hospedaje' → noche(s) en una cabaña. `alojamiento_id` obligatorio.
--   'dia'       → Día de Calma. Sin cabaña, un solo día, sujeto al cupo.
-- El default 'hospedaje' es lo que corresponde a todo lo que ya existía.
alter table reservas
  add column if not exists tipo text not null default 'hospedaje';

do $$
begin
  alter table reservas add constraint reservas_tipo_valido
    check (tipo in ('hospedaje','dia'));
exception
  when duplicate_object then null;
end
$$;

-- Coherencia entre `tipo` y el resto de la fila:
--   · Hospedaje sin cabaña sería una reserva que no ocupa nada y que el
--     constraint anti-solapamiento ignoraría en silencio (los EXCLUDE no
--     comparan NULL). Se prohíbe.
--   · Una reserva de día es de UN día: `[fecha, fecha+1)`. Así el calendario
--     del panel, el cupo y las consultas de solape usan el mismo operador que
--     ya usa todo el modelo, sin una columna `fecha` paralela.
do $$
begin
  alter table reservas add constraint reservas_coherencia_tipo
    check (
      (tipo = 'hospedaje' and alojamiento_id is not null)
      or (
        tipo = 'dia'
        and alojamiento_id is null
        and upper(estancia) = lower(estancia) + 1
      )
    );
exception
  when duplicate_object then null;
end
$$;

comment on column reservas.tipo is
  'hospedaje = noches en una cabaña; dia = Día de Calma (sin cabaña, un solo día, con cupo).';

create index if not exists reservas_tipo_idx on reservas (tipo);

-- `origen` — se añade 'google_calendar' para la sincronización futura con el
-- Google Calendar «la finca», que el hotel llena a mano. Hoy NADA crea
-- filas con ese origen: el modelo queda listo, la integración es posterior.
alter table reservas drop constraint if exists reservas_origen_check;
alter table reservas add constraint reservas_origen_check
  check (origen in ('web','whatsapp','telefono','manual','google_calendar'));

-- `referencia_externa` — el id del evento en el sistema de donde vino la
-- reserva (hoy: el evento de Google Calendar). Único cuando existe, para que
-- una sincronización que se repita actualice en vez de duplicar.
alter table reservas
  add column if not exists referencia_externa text;

create unique index if not exists reservas_referencia_externa_unica
  on reservas (referencia_externa)
  where referencia_externa is not null;

comment on column reservas.referencia_externa is
  'Id del evento en el sistema de origen (p. ej. Google Calendar). NULL en las reservas propias.';

-- `porcentaje_anticipo` y `monto_anticipo` — cuánto se cobra por adelantado.
-- El hotel pide el 50 % para confirmar y deja pagar el 100 % a quien quiera
-- llegar sin nada pendiente. El monto se guarda además del porcentaje porque
-- es el número que se le prometió al huésped: recalcularlo después, con otras
-- tarifas, daría una cifra distinta a la que aceptó.
alter table reservas
  add column if not exists porcentaje_anticipo int not null default 50;

do $$
begin
  alter table reservas add constraint reservas_porcentaje_anticipo_valido
    check (porcentaje_anticipo in (50,100));
exception
  when duplicate_object then null;
end
$$;

alter table reservas
  add column if not exists monto_anticipo int;

do $$
begin
  alter table reservas add constraint reservas_monto_anticipo_positivo
    check (monto_anticipo is null or monto_anticipo >= 0);
exception
  when duplicate_object then null;
end
$$;

comment on column reservas.porcentaje_anticipo is
  'Qué parte del total se cobra por adelantado: 50 o 100. El resto se paga por link antes de llegar.';
comment on column reservas.monto_anticipo is
  'Anticipo en COP congelado al reservar. NULL en las reservas anteriores al cobro en línea.';

-- ----------------------------------------------------------------------------
-- CUPO DEL DÍA DE CALMA — 10 personas por día en todo el hotel
--
-- Va en la base y no solo en la aplicación por la misma razón que el
-- anti-solapamiento de las cabañas (§4.1 del plan): el panel no es el único
-- camino por el que entran reservas, y dos guardados simultáneos pueden pasar
-- la comprobación de la aplicación a la vez.
--
-- SI EL HOTEL CAMBIA EL CUPO hay que tocar DOS sitios: esta constante y
-- `CUPO_DIA_DE_CALMA` en `src/lib/reserva/dia-de-calma.ts`.
-- ----------------------------------------------------------------------------

create or replace function validar_cupo_dia_de_calma()
returns trigger
language plpgsql
-- `security definer`: el cupo tiene que contar TODAS las reservas del día,
-- también las que quien escribe no pueda leer por RLS. Con `search_path`
-- fijado, que es la precaución que exige un definer.
security definer
set search_path = public, pg_temp
as $$
declare
  cupo constant int := 10;
  ocupadas int;
  quedan int;
begin
  -- Solo mira las reservas de día que ocupan cupo. Una cancelada o completada
  -- no quita el sitio de nadie.
  if new.tipo <> 'dia' or new.estado not in ('pendiente','confirmada') then
    return new;
  end if;

  select coalesce(sum(r.num_personas), 0)
    into ocupadas
    from reservas r
   where r.tipo = 'dia'
     and r.estado in ('pendiente','confirmada')
     and r.id <> new.id
     and r.estancia && new.estancia;

  quedan := greatest(cupo - ocupadas, 0);

  if ocupadas + new.num_personas > cupo then
    raise exception
      using
        errcode = 'LF010',
        message = format(
          'El Día de Calma admite %s personas por día y para esa fecha ya hay %s. Quedan %s cupos.',
          cupo, ocupadas, quedan
        ),
        hint = 'Elige otra fecha o reduce el número de personas.';
  end if;

  return new;
end;
$$;

comment on function validar_cupo_dia_de_calma() is
  'Impide pasar del cupo diario del Día de Calma (10 personas). Error LF010 con mensaje en español.';

drop trigger if exists reservas_cupo_dia_de_calma on reservas;
create trigger reservas_cupo_dia_de_calma
  before insert or update on reservas
  for each row execute function validar_cupo_dia_de_calma();

-- ----------------------------------------------------------------------------
-- RESERVA_EXTRAS — una experiencia puede ir atada a UNA noche
--
-- `noche` es la fecha de check-in de la noche a la que se añade (la misma
-- forma de contar que usa `src/lib/reserva/noches.ts`). NULL = «para toda la
-- estadía», que es como quedan las reservas anteriores y como se apuntan los
-- adicionales que no pertenecen a una noche concreta (la segunda mascota).
--
-- La llave primaria pasa a ser un `id` propio porque una columna que puede ser
-- NULL no puede formar parte de una PK, y la unicidad real —«este extra, esta
-- noche, una sola vez»— se resuelve con un índice único `nulls not distinct`,
-- que trata dos NULL como iguales (Postgres 15+; aquí corre 17).
-- ----------------------------------------------------------------------------

alter table reserva_extras
  add column if not exists noche date;

alter table reserva_extras
  add column if not exists id uuid not null default gen_random_uuid();

alter table reserva_extras drop constraint if exists reserva_extras_pkey;

do $$
begin
  alter table reserva_extras add primary key (id);
exception
  when invalid_table_definition or duplicate_table or duplicate_object then null;
end
$$;

create unique index if not exists reserva_extras_unico
  on reserva_extras (reserva_id, extra_id, noche) nulls not distinct;

create index if not exists reserva_extras_reserva_idx
  on reserva_extras (reserva_id);

comment on column reserva_extras.noche is
  'Noche (fecha de check-in) a la que se añade el extra. NULL = para toda la estadía.';
