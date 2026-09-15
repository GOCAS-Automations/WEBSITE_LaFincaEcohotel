-- ============================================================================
-- SEED 001 — Datos iniciales de La Finca Eco Hotel
--
-- ORIGEN DE LOS DATOS: `docs/DATOS_CLIENTE.md`, consolidado el 2026-09-11 a
-- partir del material que envió el cliente (respuestas a requerimientos,
-- puntos pendientes, configuración del bot de ventas y manual de marca).
-- Ese archivo es la fuente de verdad: lo que no está ahí NO se inventa aquí,
-- se deja marcado con "TODO confirmar" (lista abierta en su §9).
--
-- Idempotente: se puede re-ejecutar; actualiza en vez de duplicar.
-- ============================================================================

set search_path to public, extensions;

-- ----------------------------------------------------------------------------
-- 5 CABAÑAS (§2 de DATOS_CLIENTE.md). Son cinco, no seis.
--
-- Todas comparten: capacidad máxima 2 personas (pensadas para parejas), cama
-- doble, baño privado, vista al bosque de niebla, estación de café y
-- aromáticas ilimitadas, WiFi, toallas, batas y cobijas térmicas, mininevera,
-- agua caliente, secador, amenities de baño y botiquín. Ninguna tiene TV: la
-- desconexión es intencional. Los jacuzzis son climatizados, con burbujas y
-- luces, en zona exterior.
--
-- `descripcion` lleva el detalle largo que lee el huésped en la ficha.
-- `amenidades` son etiquetas cortas para las pastillas de la interfaz: 3 a 6
-- por cabaña, con lo más distintivo primero. Lo que todas comparten no se
-- repite en las etiquetas, se cuenta una sola vez en el sitio.
-- ----------------------------------------------------------------------------
insert into alojamientos (nombre, slug, descripcion, capacidad, amenidades, orden, activo)
values
  ('Cabaña 01', 'cabana-01',
   'Cabaña de dos niveles: arriba la habitación con cama doble y baño privado; abajo la sala, la cocina, el comedor y un balcón con hamaca. Su jacuzzi es privado y exterior, con vista abierta a las montañas. Como todas, viene con estación de café y aromáticas ilimitadas, batas, toallas y cobijas térmicas, mininevera y WiFi. Sin televisor: aquí el plan es desconectarse.',
   2,
   array['Dos niveles','Jacuzzi privado con vista a las montañas','Cocina equipada','Balcón con hamaca','Cama doble','Baño privado'],
   1, true),

  ('Cabaña 02', 'cabana-02',
   'La más íntima: terraza con hamaca y un jacuzzi privado bajo un árbol, rodeado de bosque. No tiene cocina, así que la comida se disfruta en el restaurante o en la terraza. Cama doble, baño privado, estación de café y aromáticas ilimitadas, batas, toallas y cobijas térmicas, mininevera y WiFi. Sin televisor. Se reserva únicamente con el plan Estándar.',
   2,
   array['Jacuzzi privado bajo un árbol','Terraza con hamaca','Solo plan Estándar','Cama doble','Baño privado'],
   2, true),

  ('Cabaña 03', 'cabana-03',
   'Balcón con hamaca y comedor al aire libre, para desayunar mirando el bosque de niebla. Tiene cocina equipada, cama doble y baño privado. El jacuzzi es de uso privado por turnos: se coordina la hora con Nicolás, el anfitrión, y comparte la zona social con la Cabaña 04. Estación de café y aromáticas ilimitadas, batas, toallas y cobijas térmicas, mininevera y WiFi. Sin televisor.',
   2,
   array['Comedor en el balcón','Balcón con hamaca','Jacuzzi de uso privado por turnos','Cocina equipada','Cama doble'],
   3, true),

  ('Cabaña 04', 'cabana-04',
   'Gemela de la Cabaña 03: balcón con hamaca y comedor al aire libre, cocina equipada, cama doble y baño privado. El jacuzzi es de uso privado por turnos, coordinados con Nicolás, el anfitrión, y comparte la zona social con la Cabaña 03. Estación de café y aromáticas ilimitadas, batas, toallas y cobijas térmicas, mininevera y WiFi. Sin televisor.',
   2,
   array['Comedor en el balcón','Balcón con hamaca','Jacuzzi de uso privado por turnos','Cocina equipada','Cama doble'],
   4, true),

  ('Cabaña 05', 'cabana-05',
   'La única con chimenea, y la de la vista más panorámica. Tiene sala, comedor y cocina equipada, además de la habitación con cama doble y baño privado; no tiene balcón. Su jacuzzi es privado y exterior. Estación de café y aromáticas ilimitadas, batas, toallas y cobijas térmicas, mininevera y WiFi. Sin televisor.',
   2,
   array['Chimenea','Vista panorámica','Jacuzzi privado exterior','Sala y comedor','Cocina equipada','Cama doble'],
   5, true)
on conflict (slug) do update set
  nombre      = excluded.nombre,
  descripcion = excluded.descripcion,
  capacidad   = excluded.capacidad,
  amenidades  = excluded.amenidades,
  orden       = excluded.orden,
  activo      = excluded.activo;

-- ----------------------------------------------------------------------------
-- 4 PLANES (§3 de DATOS_CLIENTE.md). El precio cambia por PLAN, no por cabaña.
--
-- Tres de hospedaje (Entre Semana, Estándar, Premium) y uno de día
-- («Día de Calma»), que no incluye noche y por eso no tiene tarifa por cabaña
-- sino `precio_base`.
--
-- `dias_aplica` usa días ISO: 1 = lunes … 7 = domingo.
-- Nunca se usa la palabra «pasadía»: el cliente la rechaza expresamente.
-- ----------------------------------------------------------------------------
insert into planes (nombre, descripcion, incluye, tipo, dias_aplica, horario, precio_base, orden, activo)
values
  ('Entre Semana',
   'De lunes a jueves, cuando el bosque está más callado. Incluye hospedaje con tiempos definidos de jacuzzi y turco, y desayuno. Tiene un precio menor si viaja una sola persona.',
   array[
     'Hospedaje',
     '45 minutos de jacuzzi privado',
     '45 minutos de turco',
     'Bebida de bienvenida',
     'Fogata con masmelos',
     'Desayuno',
     'WiFi',
     'Zonas sociales: piscina, decks y senderos'
   ],
   'hospedaje', array[1,2,3,4], null, null,
   1, true),

  ('Estándar',
   'De viernes a domingo y festivos. Hospedaje con jacuzzi y turco sin tiempos contados, desayuno y uso libre de todas las zonas sociales.',
   array[
     'Hospedaje con jacuzzi',
     'Turco',
     'Estación de café y aromáticas ilimitadas',
     'Desayuno',
     'WiFi',
     'Uso libre de todas las zonas sociales'
   ],
   'hospedaje', array[5,6,7], null, null,
   2, true),

  ('Premium',
   'De viernes a domingo y festivos. Todo lo del plan Estándar más la alimentación a la carta del fin de semana. Con Premium, la cena se sirve en la cabaña si hay experiencia contratada.',
   array[
     'Todo lo del plan Estándar',
     'Alimentación a la carta: cena de llegada, desayuno y almuerzo de salida',
     '1 botella de vino',
     '2 sodas naturales',
     'Fogata con pinchos de masmelos'
   ],
   'hospedaje', array[5,6,7], null, null,
   3, true),

  ('Día de Calma',
   'Un día entero en La Finca, sin hospedaje: almuerzo a la carta, refrigerio y acceso a las zonas sociales. Para dos personas.',
   array[
     'Almuerzo a la carta',
     'Refrigerio: chocolate, aguapanela o café con queso',
     'Acceso a la piscina',
     'Turco',
     'Decks y senderos',
     'Salón social'
   ],
   'dia', null, '10:00 a. m. – 5:00 p. m.', 250000,
   4, true)
on conflict (nombre) do update set
  descripcion = excluded.descripcion,
  incluye     = excluded.incluye,
  tipo        = excluded.tipo,
  dias_aplica = excluded.dias_aplica,
  horario     = excluded.horario,
  precio_base = excluded.precio_base,
  orden       = excluded.orden,
  activo      = excluded.activo;

-- ----------------------------------------------------------------------------
-- TARIFAS BASE (§3 de DATOS_CLIENTE.md): un precio por cabaña × plan, sin
-- vigencia (aplican todo el año). Son tarifas referenciales de temporada baja,
-- IVA incluido; pueden variar en festivos y alta demanda.
--
-- QUÉ SIGNIFICA QUE EXISTA LA FILA: que esa cabaña se ofrece con ese plan.
-- Por eso la Cabaña 02, que según el cliente solo se vende con el plan
-- Estándar, tiene UNA sola fila; y por eso más abajo se borran explícitamente
-- las que pudo haber creado el seed provisional anterior.
--
-- El plan «Día de Calma» no genera filas aquí: no se reserva por cabaña, su
-- precio vive en `planes.precio_base`.
--
-- `dias_semana` se mantiene igual a `planes.dias_aplica` para que el motor de
-- reservas pueda leer la restricción desde la tarifa sin una segunda consulta.
-- La fuente de verdad es el plan.
-- ----------------------------------------------------------------------------
insert into tarifas (alojamiento_id, plan_id, precio_noche, precio_noche_1_persona, vigencia, dias_semana)
select
  a.id,
  p.id,
  case p.nombre
    when 'Entre Semana' then 350000
    when 'Estándar'     then 480000
    when 'Premium'      then 680000
  end,
  case p.nombre
    when 'Entre Semana' then 200000   -- único plan con precio para 1 persona
    else null
  end,
  null,                                -- tarifa base: aplica todo el año
  p.dias_aplica
from alojamientos a
cross join planes p
where a.slug in ('cabana-01','cabana-02','cabana-03','cabana-04','cabana-05')
  and p.nombre in ('Entre Semana','Estándar','Premium')
  -- La Cabaña 02 solo se ofrece con el plan Estándar.
  and not (a.slug = 'cabana-02' and p.nombre in ('Entre Semana','Premium'))
on conflict (alojamiento_id, plan_id) where vigencia is null do update set
  precio_noche           = excluded.precio_noche,
  precio_noche_1_persona = excluded.precio_noche_1_persona,
  dias_semana            = excluded.dias_semana;

-- Limpieza: el seed anterior le puso a la Cabaña 02 los tres planes. Se borran
-- los dos que el cliente NO vende en esa cabaña. Idempotente: si no existen,
-- no pasa nada.
delete from tarifas t
using alojamientos a, planes p
where t.alojamiento_id = a.id
  and t.plan_id = p.id
  and a.slug = 'cabana-02'
  and p.nombre in ('Entre Semana','Premium');

-- Limpieza: «Día de Calma» no se reserva por cabaña. Si alguna vez se le
-- creó una tarifa por error, se retira.
delete from tarifas t
using planes p
where t.plan_id = p.id
  and p.tipo = 'dia';

-- ----------------------------------------------------------------------------
-- EXPERIENCIAS Y ADICIONALES (§4 de DATOS_CLIENTE.md).
-- El valor es por estadía y se suma al plan.
-- ----------------------------------------------------------------------------
insert into extras (tipo, nombre, descripcion, precio, imagen_url, activo, orden)
values
  ('experiencia', 'Aniversario con Amor',
   'Torta para dos con topper de aniversario y vela, botella de vino, tres fotos instantáneas y, a elegir, arreglo floral o fondue de frutas.',
   150000, null, true, 1),

  ('experiencia', 'Cumpleaños con Amor',
   'Torta para dos con topper de cumpleaños y vela, botella de vino, tres fotos instantáneas y, a elegir, arreglo floral o fondue de frutas.',
   150000, null, true, 2),

  -- El fondue es una EXPERIENCIA, no un adicional (2026-09-15). Es una
  -- celebración para dos con precio por estadía, igual que Aniversario y
  -- Cumpleaños, y así lo nombra el cliente en §4 de docs/DATOS_CLIENTE.md.
  -- Como «adicional» caía en la lista de texto de /experiencias junto a la
  -- segunda mascota y no salía en la portada. La foto se la pone el bloque
  -- de FOTOS DE LAS EXPERIENCIAS de 002_contenido.sql: es una foto de
  -- AMBIENTE (el comedor para dos de la Cabaña 05), porque del plato no hay
  -- ninguna imagen ni en el Drive ni en el sitio viejo.
  ('experiencia', 'Fondue',
   'Fondue de frutas y chocolate para dos.',
   25000, null, true, 3),

  ('adicional', 'Segunda mascota',
   'Las mascotas son bienvenidas en todas las áreas. La primera no tiene costo; este valor es por la segunda mascota.',
   50000, null, true, 4)
on conflict (nombre) do update set
  tipo        = excluded.tipo,
  descripcion = excluded.descripcion,
  precio      = excluded.precio,
  activo      = excluded.activo,
  orden       = excluded.orden;

-- «Picnic en el bosque» y «Velada romántica» venían del sitio viejo y NO
-- existen en el material del hotel (§4 de DATOS_CLIENTE.md: «Quitar del
-- sitio»). Se borran de la base. No se tocan los que ya estén asociados a una
-- reserva: ahí el dato es historial y borrarlo rompería la reserva.
delete from extras e
where e.nombre in ('Picnic en el bosque', 'Velada romántica')
  and not exists (
    select 1 from reserva_extras re where re.extra_id = e.id
  );

-- ----------------------------------------------------------------------------
-- TODO confirmar (siguen abiertos, §9 de DATOS_CLIENTE.md):
--   · ¿Aplica un mínimo de noches en fines de semana o festivos?
--   · Razón social y NIT (Raquel Lenis) — hacen falta para la facturación.
--   · Fotos en alta calidad definitivas por cabaña.
-- Nada de eso se inventa aquí.
-- ----------------------------------------------------------------------------
