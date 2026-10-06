-- ============================================================================
-- 020 — El cupo del Día de Calma aguanta dos reservas simultáneas, y una
--       reserva de día siempre dice cuántas personas son (1 o 2)
-- ============================================================================
--
-- FALLO 1: DOS RESERVAS A LA VEZ PASABAN DEL CUPO.
-- El trigger `validar_cupo_dia_de_calma` (migración 009) suma las personas del
-- día y compara con 10, pero SIN BLOQUEAR NADA. Con 9 personas apuntadas, dos
-- reservas de 1 que llegan a la vez suman cada una 9 —ninguna ve a la otra,
-- que aún no ha confirmado— y entran las dos: 11.
--
-- Ahora el trigger toma `pg_advisory_xact_lock(hashtext('dia:' || fecha))`
-- antes de sumar. La segunda reserva de esa fecha espera a que la primera
-- termine su transacción y entonces suma CON ella (en READ COMMITTED, cada
-- sentencia de una función volátil ve lo ya confirmado). Fechas distintas no
-- se esperan entre sí. El candado se suelta solo al terminar la transacción.
--
-- Va justo después de descartar lo que no gasta cupo (hospedaje, canceladas):
-- esas escrituras no tienen por qué esperar a nadie.
--
-- FALLO 2: `personas` QUE NO ERA UN NÚMERO SALTABA EL CUPO.
-- `/api/reservar` pasaba `Number(datos.personas)`: con un texto, `NaN`, que
-- llegaba a la base como NULL. `ocupadas + NULL > 10` es NULL —no es «cierto»—
-- y el trigger dejaba pasar la reserva; y el `check` de la 010
-- (`num_personas between 1 and 2`) también es NULL con NULL, que en un `check`
-- cuenta como cumplido. Ahora una reserva de día exige `num_personas` NO nulo
-- y entre 1 y 2. (El endpoint, además, responde 400 antes de llegar aquí.)
--
-- COMPATIBLE HACIA ATRÁS: el panel siempre manda `num_personas`; la web
-- desplegada solo choca si le llega basura, que es justo lo que se quiere
-- impedir. Las reservas de hospedaje no cambian.
-- ============================================================================

set search_path to public, extensions;

-- Antes de nada: ninguna reserva de día puede incumplir la regla nueva. Si la
-- hubiera, la migración se detiene con un mensaje claro en vez de fallar a
-- medias (y hay que revisarla a mano).
do $$
declare
  malas int;
begin
  select count(*) into malas
    from reservas
   where tipo = 'dia'
     and (num_personas is null or num_personas not between 1 and 2);
  if malas > 0 then
    raise exception
      'Hay % reservas de Día de Calma sin número de personas válido (1 o 2). Corrígelas antes de aplicar la migración 020.',
      malas;
  end if;
end
$$;

alter table reservas drop constraint if exists reservas_dia_maximo_dos_personas;
alter table reservas add constraint reservas_dia_maximo_dos_personas
  check (tipo <> 'dia' or (num_personas is not null and num_personas between 1 and 2));

comment on constraint reservas_dia_maximo_dos_personas on reservas is
  'Una reserva de Día de Calma es de 1 o 2 personas, y el dato es obligatorio: un NULL saltaba el cupo (migración 020).';

create or replace function validar_cupo_dia_de_calma()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cupo constant int := 10;
  ocupadas int;
  quedan int;
begin
  if new.tipo <> 'dia' or new.estado not in ('pendiente','confirmada') then
    return new;
  end if;

  -- Sin personas no hay cupo que comprobar: se rechaza aquí con un mensaje
  -- claro (el `check` de arriba lo rechazaría igual, después).
  if new.num_personas is null then
    raise exception
      using
        errcode = '23514',
        message = 'Una reserva de Día de Calma tiene que decir cuántas personas son: una o dos.';
  end if;

  -- El candado del día: dos reservas de la misma fecha se ponen en fila.
  perform pg_advisory_xact_lock(hashtext('dia:' || lower(new.estancia)::text));

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
  'Impide pasar del cupo diario del Día de Calma (10 personas). Toma un candado por fecha (pg_advisory_xact_lock) antes de sumar, así que dos reservas simultáneas no lo pasan (migración 020). Error LF010 con mensaje en español.';
