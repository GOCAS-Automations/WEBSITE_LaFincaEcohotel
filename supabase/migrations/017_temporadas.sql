-- ============================================================================
-- 017 — Temporadas: tarifas para fechas concretas
--
-- El hotel pide poder cobrar distinto en unas fechas (la primera: «Temporada de
-- fin de año», del 1 de diciembre al 8 de enero, +15 % sobre la base) para una
-- cabaña o para todas, y crearlas, editarlas y borrarlas desde el panel.
--
-- ----------------------------------------------------------------------------
-- EL MODELO ELEGIDO: `temporadas` + filas de `tarifas` que cuelgan de ella
-- ----------------------------------------------------------------------------
-- `tarifas` se diseñó en la 001 con una `vigencia daterange` («null = tarifa
-- base todo el año») justo para esto, pero solo con esa columna faltaban dos
-- cosas: un NOMBRE que enseñar en el desglose («Temporada de fin de año») y una
-- forma de decir «todas las cabañas» sin repetir la temporada cinco veces. Si
-- cada fila de precio llevara sus propias fechas, una temporada de tres planes
-- serían tres copias de las fechas que el panel tendría que mantener iguales a
-- mano, y bastaría un fallo a medias para que Premium acabara el 8 de enero y
-- Estándar el 9.
--
-- Por eso:
--
--   · `temporadas` guarda el nombre, el alcance (`alojamiento_id`, null =
--     todas las cabañas) y las fechas (`noches`). ES LA ÚNICA FUENTE DE LAS
--     FECHAS: el panel solo las escribe aquí.
--   · Cada precio de la temporada es una fila de `tarifas` con `temporada_id`.
--     Su `vigencia` y su `temporada_alcance` son una COPIA atada por llave
--     foránea compuesta `(temporada_id, temporada_alcance, vigencia)` →
--     `temporadas (id, alcance, noches)` con `on update cascade`:
--       - nadie puede escribir en la fila unas fechas distintas de las de su
--         temporada (la llave lo rechaza), y
--       - cambiar las fechas o el alcance de la temporada las cambia en todas
--         sus filas dentro de la misma sentencia.
--     Es decir, la copia existe solo para que la exclusión de abajo pueda
--     mirar alcance, plan y fechas en una misma fila; no puede desincronizarse.
--   · `match full`: o las tres columnas son null (tarifa base) o las tres
--     tienen valor (tarifa de temporada). Ya no puede existir una `vigencia`
--     suelta sin temporada.
--
-- ----------------------------------------------------------------------------
-- SIN SOLAPES: exclusión con gist
-- ----------------------------------------------------------------------------
-- Dos temporadas del mismo alcance (dos de «todas», o dos de la misma cabaña)
-- no pueden fijar precio al MISMO plan en noches que se crucen. Lo garantiza
-- `tarifas_temporadas_sin_cruce` (alcance =, plan =, vigencia &&). Una de
-- cabaña concreta SÍ puede cruzarse con una de todas: gana la de la cabaña, y
-- esa precedencia la aplica `precioDeNoche()` (src/lib/reserva/cotizacion.ts).
--
-- La tarifa base sigue siendo única: `tarifas_base_unica` es `where vigencia is
-- null`, y las filas de temporada siempre llevan vigencia.
--
-- ----------------------------------------------------------------------------
-- COMPATIBLE CON EL CÓDIGO YA DESPLEGADO
-- ----------------------------------------------------------------------------
-- Todo es aditivo. El código anterior lee siempre `tarifas` con
-- `.is("vigencia", null)`, así que no ve las filas de temporada y sigue
-- cobrando la base hasta que se despliegue el código nuevo.
--
-- Las reservas no se tocan: guardan su total congelado (`subtotal_alojamiento`,
-- `total`, `monto_anticipo`, `reserva_extras.precio_unitario`) sin ninguna
-- referencia a `tarifas`. Crear, editar o borrar una temporada no recalcula
-- ninguna reserva hecha.
--
-- El Día de Calma queda fuera: su precio vive en `planes.precio_base`, no en
-- `tarifas`.
--
-- Idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

set search_path to public, extensions;

-- ----------------------------------------------------------------------------
-- TEMPORADAS
-- ----------------------------------------------------------------------------
create table if not exists temporadas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  -- La cabaña a la que se limita. null = todas las cabañas.
  alojamiento_id uuid references alojamientos(id) on delete cascade,
  -- El alcance como valor NO nulo, para la llave compuesta y la exclusión: la
  -- cabaña, o el uuid nulo (todo ceros) cuando es de todas. Lo calcula Postgres.
  alcance uuid generated always as (
    coalesce(alojamiento_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) stored,
  -- Las noches que cubre, con la convención de todo el proyecto: [primera
  -- noche, día siguiente a la última). El panel pide «Primera noche» y «Última
  -- noche» (ambas incluidas) y suma un día a la última al guardar.
  noches daterange not null,
  creado_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now(),
  constraint temporadas_nombre_valido
    check (char_length(btrim(nombre)) between 1 and 80),
  constraint temporadas_noches_validas
    check (not isempty(noches) and not lower_inf(noches) and not upper_inf(noches)),
  -- Destino de la llave compuesta de `tarifas` (el id ya es único; esto solo
  -- permite atar las copias de alcance y fechas).
  constraint temporadas_llave_tarifas unique (id, alcance, noches)
);

comment on table temporadas is
  'Tarifas para fechas concretas. Sus precios son filas de tarifas con temporada_id.';
comment on column temporadas.alojamiento_id is
  'Cabaña a la que se limita la temporada. NULL = todas las cabañas.';
comment on column temporadas.noches is
  'Noches que cubre: [primera noche, día siguiente a la última).';

create index if not exists temporadas_noches_idx on temporadas using gist (noches);

do $$
begin
  create trigger temporadas_tocar_actualizado
    before update on temporadas
    for each row execute function tocar_actualizado_at();
exception
  when duplicate_object then null;
end
$$;

-- ----------------------------------------------------------------------------
-- TARIFAS: las filas de temporada
-- ----------------------------------------------------------------------------
alter table tarifas add column if not exists temporada_id uuid;
alter table tarifas add column if not exists temporada_alcance uuid;

comment on column tarifas.temporada_id is
  'NULL = tarifa base. Con valor, precio de esa temporada; vigencia y temporada_alcance son copia atada por llave.';

do $$
begin
  alter table tarifas add constraint tarifas_temporada_fk
    foreign key (temporada_id, temporada_alcance, vigencia)
    references temporadas (id, alcance, noches)
    match full
    on update cascade
    on delete cascade;
exception
  when duplicate_object then null;
end
$$;

-- Una tarifa base es de una cabaña; una de temporada no lleva cabaña propia (su
-- alcance es el de la temporada). Las dos llevan plan.
do $$
begin
  alter table tarifas add constraint tarifas_base_o_temporada
    check (
      plan_id is not null
      and (
        (temporada_id is null and alojamiento_id is not null)
        or (temporada_id is not null and alojamiento_id is null)
      )
    );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table tarifas add constraint tarifas_temporadas_sin_cruce
    exclude using gist (
      temporada_alcance with =,
      plan_id with =,
      vigencia with &&
    )
    where (temporada_id is not null);
exception
  when duplicate_object or duplicate_table then null;
end
$$;

create index if not exists tarifas_temporada_idx on tarifas (temporada_id);

-- ----------------------------------------------------------------------------
-- GUARDAR UNA TEMPORADA DE UNA VEZ
-- ----------------------------------------------------------------------------
-- Crear o editar una temporada toca dos tablas. Si se hiciera con varias
-- llamadas desde el panel, un fallo a medias dejaría la temporada con las
-- fechas nuevas y los precios viejos. Esta función lo hace en UNA transacción.
--
-- `p_precios` es una lista JSON de {plan_id, precio_noche,
-- precio_noche_1_persona}; los planes que no vengan se quitan de la temporada
-- (en esas fechas usan la base). El orden importa: primero se quitan los planes
-- que salen, después se mueven las fechas (la cascada) y al final se escriben
-- los precios; así quitar un plan nunca choca contra la exclusión por culpa de
-- una fila que de todos modos iba a borrarse.
--
-- `security invoker`: la llama el panel con su sesión y RLS sigue aplicando.
create or replace function guardar_temporada(
  p_id uuid,
  p_nombre text,
  p_alojamiento_id uuid,
  p_primera_noche date,
  p_ultima_noche date,
  p_precios jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid := p_id;
  v_alcance uuid;
  v_noches daterange;
  v_planes uuid[];
begin
  if p_primera_noche is null or p_ultima_noche is null then
    raise exception 'Faltan las fechas de la temporada.' using errcode = '22023';
  end if;
  if p_ultima_noche < p_primera_noche then
    raise exception 'La última noche no puede ser anterior a la primera.'
      using errcode = '22023';
  end if;
  if p_precios is null or jsonb_typeof(p_precios) <> 'array'
     or jsonb_array_length(p_precios) = 0 then
    raise exception 'La temporada necesita el precio de al menos un plan.'
      using errcode = '22023';
  end if;

  v_noches := daterange(p_primera_noche, p_ultima_noche + 1, '[)');

  select array_agg((e ->> 'plan_id')::uuid)
    into v_planes
    from jsonb_array_elements(p_precios) e;

  if v_id is null then
    insert into temporadas (nombre, alojamiento_id, noches)
    values (btrim(p_nombre), p_alojamiento_id, v_noches)
    returning id, alcance into v_id, v_alcance;
  else
    delete from tarifas
     where temporada_id = v_id
       and not (plan_id = any (v_planes));

    update temporadas
       set nombre = btrim(p_nombre),
           alojamiento_id = p_alojamiento_id,
           noches = v_noches
     where id = v_id
    returning alcance into v_alcance;

    if not found then
      raise exception 'Esa temporada ya no existe.' using errcode = 'P0002';
    end if;
  end if;

  update tarifas t
     set precio_noche = (e ->> 'precio_noche')::int,
         precio_noche_1_persona = (e ->> 'precio_noche_1_persona')::int
    from jsonb_array_elements(p_precios) e
   where t.temporada_id = v_id
     and t.plan_id = (e ->> 'plan_id')::uuid;

  insert into tarifas (
    plan_id, precio_noche, precio_noche_1_persona,
    temporada_id, temporada_alcance, vigencia
  )
  select (e ->> 'plan_id')::uuid,
         (e ->> 'precio_noche')::int,
         (e ->> 'precio_noche_1_persona')::int,
         v_id, v_alcance, v_noches
    from jsonb_array_elements(p_precios) e
   where not exists (
     select 1 from tarifas t
      where t.temporada_id = v_id
        and t.plan_id = (e ->> 'plan_id')::uuid
   );

  return v_id;
end
$$;

revoke all on function guardar_temporada(uuid, text, uuid, date, date, jsonb) from public;
revoke all on function guardar_temporada(uuid, text, uuid, date, date, jsonb) from anon;
grant execute on function guardar_temporada(uuid, text, uuid, date, date, jsonb) to authenticated;
grant execute on function guardar_temporada(uuid, text, uuid, date, date, jsonb) to service_role;

-- ----------------------------------------------------------------------------
-- RLS Y PRIVILEGIOS
-- ----------------------------------------------------------------------------
-- Igual que el resto del catálogo: el público lee solo lo que hace falta para
-- cotizar (temporadas que no han terminado) y solo el panel escribe.
alter table temporadas enable row level security;

-- La 011 dejó a `anon` sin nada por defecto: la lectura se concede a mano.
revoke all on temporadas from anon;
grant select on temporadas to anon;
-- `truncate` no pasa por RLS: el panel no lo necesita.
revoke truncate, references, trigger on temporadas from authenticated;
grant select, insert, update, delete on temporadas to authenticated;
grant select, insert, update, delete on temporadas to service_role;

drop policy if exists "temporadas lectura publica" on temporadas;
create policy "temporadas lectura publica" on temporadas
  for select to anon, authenticated
  using (
    auth.role() = 'authenticated'
    or upper(noches) > (now() at time zone 'America/Bogota')::date
  );

drop policy if exists "temporadas escritura panel" on temporadas;
create policy "temporadas escritura panel" on temporadas
  for all to authenticated
  using (true) with check (true);

-- La lectura pública de `tarifas` se amplía a las filas de temporada (que no
-- llevan cabaña propia, así que la condición de la 002 las escondía). Para las
-- filas base no cambia nada.
drop policy if exists "tarifas lectura publica" on tarifas;
create policy "tarifas lectura publica" on tarifas
  for select to anon, authenticated
  using (
    auth.role() = 'authenticated'
    or (
      exists (select 1 from planes p where p.id = tarifas.plan_id and p.activo)
      and (
        (
          tarifas.temporada_id is null
          and exists (
            select 1 from alojamientos a
             where a.id = tarifas.alojamiento_id and a.activo
          )
        )
        or (
          tarifas.temporada_id is not null
          and upper(tarifas.vigencia) > (now() at time zone 'America/Bogota')::date
        )
      )
    )
  );

-- Que la API (PostgREST) vea la tabla y las columnas nuevas sin esperar.
notify pgrst, 'reload schema';
