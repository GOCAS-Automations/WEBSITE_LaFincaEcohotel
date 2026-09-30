-- ============================================================================
-- 012 — Prueba de la autorización de tratamiento de datos (Ley 1581 de 2012)
--
-- La **Ley 1581 de 2012** (art. 9) exige autorización **previa, expresa e
-- informada** del titular para tratar sus datos personales, y el **Decreto 1074
-- de 2015** (art. 2.2.2.25.2.4, que compiló el Decreto 1377 de 2013) obliga al
-- responsable a **conservar prueba de esa autorización**.
--
-- La política de datos del sitio ya dice que se conserva esa prueba. Hasta esta
-- migración, no se conservaba: no había dónde. Una reserva se guardaba con el
-- nombre, el correo y el teléfono del huésped y ni una marca de cuándo había
-- autorizado, ni de qué texto había aceptado. Ante una queja en la SIC, el hotel
-- no podía demostrar nada — y quien responde es el hotel, no el desarrollador.
--
-- Tres columnas, porque la prueba son tres cosas:
--
--   · `autorizacion_datos_en`      CUÁNDO la dio.
--   · `autorizacion_datos_version` QUÉ TEXTO aceptó. Sin esto la prueba no
--     sirve: la política se edita desde el panel, y dentro de un año el texto
--     publicado no será el que el huésped leyó. La versión es la fecha de
--     revisión del documento (`LEGAL_ACTUALIZADO` en `src/lib/sitio.ts`).
--   · `autorizacion_datos_canal`   POR DÓNDE. No es lo mismo una casilla marcada
--     en el sitio que una reserva que el equipo apuntó a mano tras una llamada:
--     en el segundo caso la autorización es verbal y la prueba es más débil, y
--     eso tiene que quedar registrado como lo que es, no disfrazado de casilla.
--
-- Las tres son NULL para las reservas anteriores y para las que el panel cree
-- sin marcar nada: `null` significa «no consta», que es la verdad, y es
-- distinto de una fecha inventada.
--
-- Idempotente.
-- ============================================================================

set search_path to public, extensions;

alter table reservas
  add column if not exists autorizacion_datos_en timestamptz,
  add column if not exists autorizacion_datos_version text,
  add column if not exists autorizacion_datos_canal text;

-- Canales posibles. `web` es la casilla del motor de reservas; `whatsapp`, la
-- solicitud que llega por ese canal con la casilla ya marcada en el sitio;
-- `telefono` y `presencial`, lo que el equipo recoge de viva voz; `panel`, la
-- reserva que se crea a mano sin constancia del canal.
do $$
begin
  alter table reservas
    add constraint reservas_autorizacion_canal_check
    check (
      autorizacion_datos_canal is null
      or autorizacion_datos_canal in ('web','whatsapp','telefono','presencial','panel')
    );
exception when duplicate_object then null;
end $$;

-- Coherencia: si consta el canal, tiene que constar la fecha, y al revés. Una
-- prueba a medias no es una prueba.
do $$
begin
  alter table reservas
    add constraint reservas_autorizacion_completa_check
    check (
      (autorizacion_datos_en is null and autorizacion_datos_canal is null)
      or (autorizacion_datos_en is not null and autorizacion_datos_canal is not null)
    );
exception when duplicate_object then null;
end $$;

comment on column reservas.autorizacion_datos_en is
  'Cuándo autorizó el titular el tratamiento de sus datos (Ley 1581 de 2012, art. 9). NULL = no consta.';
comment on column reservas.autorizacion_datos_version is
  'Fecha de revisión del texto de la política que el titular aceptó (LEGAL_ACTUALIZADO).';
comment on column reservas.autorizacion_datos_canal is
  'Por dónde se obtuvo la autorización: web, whatsapp, telefono, presencial o panel.';

-- ----------------------------------------------------------------------------
-- Minimización: el documento de identidad
-- ----------------------------------------------------------------------------
-- `huesped_documento` se conserva porque el registro de huéspedes de un
-- prestador de servicios turísticos lo exige en el momento del check-in, no
-- antes. **El sitio público NO lo pide** y no debe pedirlo: para reservar no
-- hace falta. Queda anotado en la columna para que nadie lo añada al formulario
-- del motor de reservas «porque el campo ya existe».
comment on column reservas.huesped_documento is
  'Documento de identidad. Se diligencia en el CHECK-IN desde el panel, por la obligación de registro de huéspedes. El sitio público NUNCA lo pide: no hace falta para reservar (principio de minimización, Ley 1581 de 2012).';
