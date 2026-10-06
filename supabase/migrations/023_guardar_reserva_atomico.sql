-- ============================================================================
-- 023 — Una reserva y sus experiencias se guardan juntas o no se guarda nada
-- ============================================================================
--
-- EL FALLO. El panel guardaba la reserva con un `insert`/`update` y sus
-- experiencias (`reserva_extras`) con otras dos sentencias —borrar las viejas,
-- insertar las nuevas—, cada una en su propia transacción. Si fallaban las
-- experiencias, la reserva ya estaba escrita: el panel decía «error», el
-- equipo pulsaba «Guardar» otra vez y la reserva nueva CHOCABA CONSIGO MISMA
-- (sus propias noches ya estaban ocupadas por la primera). Al editar, un fallo
-- a medias dejaba una reserva sin las experiencias que el huésped pidió.
--
-- LA REGLA. `guardar_reserva(p_id, p_reserva, p_extras)` hace las tres cosas en
-- UNA función, que PostgREST ejecuta en UNA transacción: o queda todo, o no
-- queda nada. La usan el panel (alta y edición manual) y la web (la reserva
-- que se va a pagar con Bold).
--
--   · `p_id` NULL crea; con un id, edita (solo las columnas que vengan en
--     `p_reserva`) y reemplaza sus experiencias.
--   · `p_reserva` es la fila como JSON, SIN `codigo`: lo pone el trigger
--     `reservas_codigo_contador` (migración 019).
--   · `p_extras` es la lista de experiencias: `extra_id`, `cantidad`,
--     `precio_unitario`, `noche`.
--   · Devuelve `{ "id": …, "codigo": … }`.
--
-- PERMISOS. `security invoker`: corre con los permisos de quien llama, así que
-- las políticas RLS de `reservas` y `reserva_extras` (solo `es_admin()`, 018)
-- se aplican igual que antes. Además, dentro, una comprobación explícita: solo
-- el servidor (`service_role`) o una cuenta del panel con rol. Una cuenta con
-- sesión y sin rol recibe 42501 sin tocar nada. `anon` no la puede ejecutar.
--
-- Los errores de siempre siguen saliendo con su código (23P01 noches ocupadas,
-- LF010 cupo del Día de Calma, 23514 un dato fuera de regla…), que es lo que la
-- aplicación traduce al español.
--
-- COMPATIBLE HACIA ATRÁS: es una función nueva; el código desplegado hoy no la
-- usa y sigue escribiendo como siempre.
-- ============================================================================

set search_path to public, extensions;

create or replace function guardar_reserva(
  p_id uuid,
  p_reserva jsonb,
  p_extras jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  d reservas%rowtype;
  v_id uuid;
  v_codigo text;
begin
  if not (current_user = 'service_role' or public.es_admin()) then
    raise exception
      using errcode = '42501',
            message = 'Tu cuenta no tiene permiso para guardar reservas.';
  end if;

  if p_reserva is null or jsonb_typeof(p_reserva) <> 'object' then
    raise exception
      using errcode = '22023', message = 'Faltan los datos de la reserva.';
  end if;
  if p_extras is not null and jsonb_typeof(p_extras) <> 'array' then
    raise exception
      using errcode = '22023', message = 'Las experiencias de la reserva no tienen el formato esperado.';
  end if;

  d := jsonb_populate_record(null::reservas, p_reserva);

  if p_id is null then
    insert into reservas (
      tipo, alojamiento_id, plan_id, estancia,
      huesped_nombre, huesped_email, huesped_telefono, huesped_documento,
      num_personas, notas,
      subtotal_alojamiento, subtotal_extras, total, monto_pagado,
      estado, origen, porcentaje_anticipo, monto_anticipo, expira_at,
      autorizacion_datos_canal, autorizacion_datos_en, autorizacion_datos_version
    )
    values (
      coalesce(d.tipo, 'hospedaje'), d.alojamiento_id, d.plan_id, d.estancia,
      d.huesped_nombre, coalesce(d.huesped_email, ''), d.huesped_telefono, d.huesped_documento,
      d.num_personas, d.notas,
      d.subtotal_alojamiento, coalesce(d.subtotal_extras, 0), d.total, coalesce(d.monto_pagado, 0),
      coalesce(d.estado, 'pendiente'), coalesce(d.origen, 'manual'),
      coalesce(d.porcentaje_anticipo, 50), d.monto_anticipo, d.expira_at,
      d.autorizacion_datos_canal, d.autorizacion_datos_en, d.autorizacion_datos_version
    )
    returning id, codigo into v_id, v_codigo;
  else
    -- Solo se tocan las columnas que vienen en el JSON.
    update reservas as r
       set tipo                       = case when p_reserva ? 'tipo' then d.tipo else r.tipo end,
           alojamiento_id             = case when p_reserva ? 'alojamiento_id' then d.alojamiento_id else r.alojamiento_id end,
           plan_id                    = case when p_reserva ? 'plan_id' then d.plan_id else r.plan_id end,
           estancia                   = case when p_reserva ? 'estancia' then d.estancia else r.estancia end,
           huesped_nombre             = case when p_reserva ? 'huesped_nombre' then d.huesped_nombre else r.huesped_nombre end,
           huesped_email              = case when p_reserva ? 'huesped_email' then coalesce(d.huesped_email, '') else r.huesped_email end,
           huesped_telefono           = case when p_reserva ? 'huesped_telefono' then d.huesped_telefono else r.huesped_telefono end,
           huesped_documento          = case when p_reserva ? 'huesped_documento' then d.huesped_documento else r.huesped_documento end,
           num_personas               = case when p_reserva ? 'num_personas' then d.num_personas else r.num_personas end,
           notas                      = case when p_reserva ? 'notas' then d.notas else r.notas end,
           subtotal_alojamiento       = case when p_reserva ? 'subtotal_alojamiento' then d.subtotal_alojamiento else r.subtotal_alojamiento end,
           subtotal_extras            = case when p_reserva ? 'subtotal_extras' then d.subtotal_extras else r.subtotal_extras end,
           total                      = case when p_reserva ? 'total' then d.total else r.total end,
           monto_pagado               = case when p_reserva ? 'monto_pagado' then d.monto_pagado else r.monto_pagado end,
           estado                     = case when p_reserva ? 'estado' then d.estado else r.estado end,
           origen                     = case when p_reserva ? 'origen' then d.origen else r.origen end,
           porcentaje_anticipo        = case when p_reserva ? 'porcentaje_anticipo' then d.porcentaje_anticipo else r.porcentaje_anticipo end,
           monto_anticipo             = case when p_reserva ? 'monto_anticipo' then d.monto_anticipo else r.monto_anticipo end,
           expira_at                  = case when p_reserva ? 'expira_at' then d.expira_at else r.expira_at end,
           autorizacion_datos_canal   = case when p_reserva ? 'autorizacion_datos_canal' then d.autorizacion_datos_canal else r.autorizacion_datos_canal end,
           autorizacion_datos_en      = case when p_reserva ? 'autorizacion_datos_en' then d.autorizacion_datos_en else r.autorizacion_datos_en end,
           autorizacion_datos_version = case when p_reserva ? 'autorizacion_datos_version' then d.autorizacion_datos_version else r.autorizacion_datos_version end
     where r.id = p_id
    returning r.id, r.codigo into v_id, v_codigo;

    if v_id is null then
      raise exception using errcode = 'P0002', message = 'Esa reserva ya no existe.';
    end if;

    delete from reserva_extras as e where e.reserva_id = v_id;
  end if;

  insert into reserva_extras (reserva_id, extra_id, cantidad, precio_unitario, noche)
  select v_id, x.extra_id, coalesce(x.cantidad, 1), x.precio_unitario, x.noche
    from jsonb_to_recordset(coalesce(p_extras, '[]'::jsonb))
      as x(extra_id uuid, cantidad int, precio_unitario int, noche date);

  return jsonb_build_object('id', v_id, 'codigo', v_codigo);
end;
$$;

comment on function guardar_reserva(uuid, jsonb, jsonb) is
  'Crea (p_id NULL) o edita una reserva y reemplaza sus experiencias en UNA transacción: o queda todo o nada (migración 023). El código lo pone el trigger. Solo service_role o una cuenta con es_admin(); RLS de quien llama (security invoker). Devuelve {id, codigo}.';

revoke all on function guardar_reserva(uuid, jsonb, jsonb) from public;
revoke all on function guardar_reserva(uuid, jsonb, jsonb) from anon;
grant execute on function guardar_reserva(uuid, jsonb, jsonb) to authenticated;
grant execute on function guardar_reserva(uuid, jsonb, jsonb) to service_role;
