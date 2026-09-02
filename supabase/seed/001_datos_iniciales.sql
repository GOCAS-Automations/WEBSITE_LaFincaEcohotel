-- ============================================================================
-- SEED 001 — Datos iniciales de La Finca Eco Hotel
--
-- ORIGEN DE LOS DATOS: sitio público actual (lafincaecohotel.com), §2 del plan.
-- NO están confirmados por el cliente. Todo lo marcado con "TODO confirmar"
-- debe validarse antes de salir a producción (§12 del plan).
--
-- Idempotente: se puede re-ejecutar; actualiza en vez de duplicar.
-- ============================================================================

set search_path to public, extensions;

-- ----------------------------------------------------------------------------
-- 5 CABAÑAS (Cabaña 01 a 05), capacidad 2 personas cada una.
-- TODO confirmar con cliente: descripciones reales, cuáles tienen jacuzzi
-- privado y si alguna admite más de 2 personas.
-- ----------------------------------------------------------------------------
insert into alojamientos (nombre, slug, descripcion, capacidad, amenidades, orden, activo)
values
  ('Cabaña 01', 'cabana-01',
   'Cabaña para dos con cama doble, baño privado y vista a la montaña. TODO: descripción definitiva pendiente del cliente.',
   2,
   -- TODO confirmar: jacuzzi privado asignado de forma provisional
   array['Cama doble','Baño privado','Vista a la montaña','WiFi','Jacuzzi privado'],
   1, true),

  ('Cabaña 02', 'cabana-02',
   'Cabaña para dos con cama doble, baño privado y vista a la montaña. TODO: descripción definitiva pendiente del cliente.',
   2,
   -- TODO confirmar: jacuzzi privado asignado de forma provisional
   array['Cama doble','Baño privado','Vista a la montaña','WiFi','Jacuzzi privado'],
   2, true),

  ('Cabaña 03', 'cabana-03',
   'Cabaña para dos con cama doble, baño privado y vista a la montaña. TODO: descripción definitiva pendiente del cliente.',
   2,
   array['Cama doble','Baño privado','Vista a la montaña','WiFi'],
   3, true),

  ('Cabaña 04', 'cabana-04',
   'Cabaña para dos con cama doble, baño privado y vista a la montaña. TODO: descripción definitiva pendiente del cliente.',
   2,
   array['Cama doble','Baño privado','Vista a la montaña','WiFi'],
   4, true),

  ('Cabaña 05', 'cabana-05',
   'Cabaña para dos con cama doble, baño privado y vista a la montaña. TODO: descripción definitiva pendiente del cliente.',
   2,
   array['Cama doble','Baño privado','Vista a la montaña','WiFi'],
   5, true)
on conflict (slug) do update set
  nombre      = excluded.nombre,
  descripcion = excluded.descripcion,
  capacidad   = excluded.capacidad,
  amenidades  = excluded.amenidades,
  orden       = excluded.orden,
  activo      = excluded.activo;

-- ----------------------------------------------------------------------------
-- 3 PLANES TARIFARIOS (§2.1). La Finca cobra por plan, no por cabaña.
-- Precios tomados del sitio actual. TODO confirmar con cliente.
-- ----------------------------------------------------------------------------
insert into planes (nombre, descripcion, incluye, orden, activo)
values
  ('Entre Semana',
   'Plan de lunes a jueves, con acceso a la zona húmeda por tiempo definido.',
   array['Jacuzzi 45 minutos','Turco 45 minutos','Bebida de bienvenida','Desayuno'],
   1, true),

  ('Estándar',
   'Plan con zona húmeda sin límite de tiempo y estación de café.',
   array['Jacuzzi ilimitado','Turco','Estación de café','Desayuno'],
   2, true),

  ('Premium',
   'Plan completo con alimentación a la carta y todos los servicios incluidos.',
   array['Alimentación a la carta','Vino','2 sodas','Servicios completos'],
   3, true)
on conflict (nombre) do update set
  descripcion = excluded.descripcion,
  incluye     = excluded.incluye,
  orden       = excluded.orden,
  activo      = excluded.activo;

-- ----------------------------------------------------------------------------
-- TARIFAS BASE: 5 cabañas × 3 planes = 15 tarifas, sin vigencia (todo el año).
--
-- TODO confirmar con cliente: hoy todas las cabañas tienen el mismo precio
-- porque el sitio actual publica un precio por plan, no por cabaña. Cuando
-- lleguen las tarifas reales, basta con actualizar `precio_noche` por cabaña,
-- y añadir filas con `vigencia` para las temporadas.
--
-- El plan "Entre Semana" solo aplica de lunes a jueves → dias_semana [1,2,3,4]
-- (1 = lunes … 7 = domingo, día ISO).
-- ----------------------------------------------------------------------------
insert into tarifas (alojamiento_id, plan_id, precio_noche, vigencia, dias_semana)
select
  a.id,
  p.id,
  case p.nombre
    when 'Entre Semana' then 350000
    when 'Estándar'     then 450000
    when 'Premium'      then 650000
  end,
  null,                                     -- tarifa base: aplica todo el año
  case p.nombre
    when 'Entre Semana' then array[1,2,3,4]
    else null
  end
from alojamientos a
cross join planes p
where a.slug in ('cabana-01','cabana-02','cabana-03','cabana-04','cabana-05')
  and p.nombre in ('Entre Semana','Estándar','Premium')
on conflict (alojamiento_id, plan_id) where vigencia is null do update set
  precio_noche = excluded.precio_noche,
  dias_semana  = excluded.dias_semana;

-- ----------------------------------------------------------------------------
-- EXPERIENCIAS (§2). Las dos que publica el sitio actual, $150.000 cada una.
-- TODO confirmar con cliente: lista definitiva de experiencias y adicionales
-- (decoraciones, celebraciones, servicios extra) con sus precios y fotos.
-- ----------------------------------------------------------------------------
insert into extras (tipo, nombre, descripcion, precio, imagen_url, activo, orden)
values
  ('experiencia', 'Aniversario con Amor',
   'Decoración especial y detalles para celebrar un aniversario en la cabaña. TODO: descripción definitiva pendiente del cliente.',
   150000, null, true, 1),

  ('experiencia', 'Cumpleaños con Amor',
   'Decoración especial y detalles para celebrar un cumpleaños en la cabaña. TODO: descripción definitiva pendiente del cliente.',
   150000, null, true, 2)
on conflict (nombre) do update set
  tipo        = excluded.tipo,
  descripcion = excluded.descripcion,
  precio      = excluded.precio,
  activo      = excluded.activo,
  orden       = excluded.orden;
