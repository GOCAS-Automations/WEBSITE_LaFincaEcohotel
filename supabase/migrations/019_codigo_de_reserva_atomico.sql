-- ============================================================================
-- 019 — El código de reserva sale de un contador por año, atómico
-- ============================================================================
--
-- EL FALLO. El código `LF-AAAA-NNNN` se calculaba CONTANDO las filas del año y
-- sumando uno (`src/lib/admin/codigo-reserva.ts`). Tras borrar reservas, el
-- conteo baja: el número que sale ya existe, los seis reintentos chocan con el
-- índice único y no se puede crear ninguna reserva más. Y si la que se borró era
-- la última, el código se REPITE: un huésped dicta «LF-2026-0007» y hay dos.
--
-- LA REGLA NUEVA. Un contador por año en `reservas_contador`, que se sube con un
-- `insert … on conflict do update … returning` —una sola sentencia, con el
-- candado de fila de Postgres—: dos reservas a la vez no pueden recibir el mismo
-- número, y borrar no hace bajar nada. Nunca se cuentan filas.
--
-- QUIÉN LO USA. Nadie tiene que pedirlo: el trigger `reservas_codigo_contador`
-- rellena `codigo` cuando la reserva llega sin él. El panel y la web insertan
-- sin código y leen el que devuelve la base (`select("id, codigo")`).
--
-- COMPATIBLE HACIA ATRÁS. El código desplegado hoy sigue mandando su propio
-- código: el trigger lo respeta y sube el contador hasta él, de modo que el
-- siguiente número que salga de aquí es siempre MAYOR que cualquier código
-- `LF-AAAA-NNNN` que exista. El año es el de Bogotá, como antes.
-- ============================================================================

set search_path to public, extensions;

create table if not exists reservas_contador (
  anio int primary key check (anio between 2000 and 9999),
  ultimo int not null default 0 check (ultimo >= 0)
);

comment on table reservas_contador is
  'Último número de reserva usado por año (LF-AAAA-NNNN). Lo sube siguiente_codigo_reserva(), y el trigger reservas_codigo_contador lo mantiene por encima de cualquier código insertado a mano. Nunca baja.';

-- Nadie lo lee ni lo escribe directamente: solo las funciones de aquí abajo
-- (security definer). RLS activo y sin políticas.
alter table reservas_contador enable row level security;
revoke all on reservas_contador from anon, authenticated;

-- El contador arranca en el número más alto que ya exista para cada año.
insert into reservas_contador (anio, ultimo)
select (s.m[1])::int, max((s.m[2])::int)
  from (
    select regexp_match(codigo, '^LF-(\d{4})-(\d{1,9})$') as m from reservas
  ) as s
 where s.m is not null
 group by 1
on conflict (anio) do update
  set ultimo = greatest(reservas_contador.ultimo, excluded.ultimo);

-- ----------------------------------------------------------------------------
-- El siguiente código del año en curso (Bogotá)
-- ----------------------------------------------------------------------------
create or replace function siguiente_codigo_reserva()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_anio int := extract(year from (now() at time zone 'America/Bogota'))::int;
  v_numero int;
begin
  insert into reservas_contador as c (anio, ultimo)
  values (v_anio, 1)
  on conflict (anio) do update set ultimo = c.ultimo + 1
  returning c.ultimo into v_numero;

  -- Cuatro cifras como mínimo; si algún año pasa de 9999, crece sin cortarse.
  return format(
    'LF-%s-%s',
    v_anio,
    lpad(v_numero::text, greatest(4, length(v_numero::text)), '0')
  );
end;
$$;

comment on function siguiente_codigo_reserva() is
  'Devuelve el siguiente código LF-AAAA-NNNN del año en curso (Bogotá) subiendo reservas_contador en una sola sentencia. Atómico: dos llamadas simultáneas nunca reciben el mismo número.';

revoke all on function siguiente_codigo_reserva() from public;
revoke all on function siguiente_codigo_reserva() from anon;
grant execute on function siguiente_codigo_reserva() to authenticated;
grant execute on function siguiente_codigo_reserva() to service_role;

-- ----------------------------------------------------------------------------
-- El trigger: pone el código si falta, y si viene puesto sube el contador
-- ----------------------------------------------------------------------------
create or replace function asignar_codigo_reserva()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m text[];
begin
  if new.codigo is null or btrim(new.codigo) = '' then
    new.codigo := siguiente_codigo_reserva();
    return new;
  end if;

  -- Un código escrito por otro camino (el código desplegado hoy, un script):
  -- el contador sube hasta él para que el siguiente no lo repita.
  m := regexp_match(new.codigo, '^LF-(\d{4})-(\d{1,9})$');
  if m is not null then
    insert into reservas_contador as c (anio, ultimo)
    values ((m[1])::int, (m[2])::int)
    on conflict (anio) do update set ultimo = greatest(c.ultimo, excluded.ultimo);
  end if;
  return new;
end;
$$;

revoke all on function asignar_codigo_reserva() from public;
revoke all on function asignar_codigo_reserva() from anon;

-- Se llama «reservas_codigo_…» para dispararse ANTES que
-- «reservas_cupo_dia_de_calma» (los BEFORE van por orden alfabético): así todas
-- las escrituras toman los candados en el mismo orden —contador, luego el día—
-- y dos reservas simultáneas no pueden bloquearse entre sí.
drop trigger if exists reservas_codigo_contador on reservas;
create trigger reservas_codigo_contador
  before insert on reservas
  for each row execute function asignar_codigo_reserva();
