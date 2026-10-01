-- ============================================================================
-- 014 — `cache_externo`: respuestas de terceros guardadas en la base
--
-- ---------------------------------------------------------------------------
-- EL PROBLEMA QUE RESUELVE
-- ---------------------------------------------------------------------------
-- Las reseñas de la ficha de Google se pedían a Places API con el caché de Next
-- (`next: { revalidate: 86400 }`). Sobre el papel es «una llamada al día»; en la
-- práctica NO es un número: la Data Cache de Next vive en cada instancia y en
-- cada región que Vercel levante, y cada una revalida por su cuenta. Un día con
-- tráfico desde dos regiones y tres instancias son tres o seis llamadas, no una.
-- Nadie puede decir cuántas se harán el mes que viene.
--
-- Eso dejó de ser un detalle contable cuando Google retiró el crédito universal
-- de Maps: las reseñas están en el tramo **más caro** de Place Details
-- (Enterprise + Atmosphere), con **1.000 llamadas gratis al mes** y 20 USD por
-- cada millar siguiente. Un número que no se puede predecir no se puede dejar
-- enchufado a una tarjeta de crédito.
--
-- ---------------------------------------------------------------------------
-- LA SALIDA: LA BASE ES LA FUENTE, GOOGLE ES EL REFRESCO
-- ---------------------------------------------------------------------------
-- El sitio deja de hablar con Google durante una visita. Lee esta tabla, y punto.
-- Quien habla con Google es el cron diario de `/api/salud` —el mismo que ya
-- mantiene despierta la base y barre las reservas vencidas—, **una vez al día**:
--
--     1 llamada/día × 30 días = 30 llamadas/mes   frente a 1.000 gratis
--
-- Es el 3 % de la cuota gratuita, y es un número **determinista**: no depende de
-- cuántas instancias levante Vercel ni de que alguien recuerde poner un tope de
-- cuota en la consola de Google Cloud (ese tope sigue siendo buena idea, pero ya
-- no es lo único que separa al hotel de una factura sorpresa).
--
-- La única llamada que puede salir fuera del cron es el **arranque en frío**: si
-- la tabla está vacía (base nueva, fila borrada a mano), la primera visita trae
-- los datos una vez y los guarda. Para que diez visitas simultáneas no hagan
-- diez llamadas, quien quiere llamar tiene que **ganar un turno** primero, y el
-- turno se gana con una escritura condicional en esta misma tabla (ver abajo).
--
-- ---------------------------------------------------------------------------
-- POR QUÉ UNA TABLA GENÉRICA Y NO `resenas_google`
-- ---------------------------------------------------------------------------
-- La forma del problema —«una respuesta de un tercero que hay que guardar y
-- refrescar cada tanto»— se va a repetir: el clima de la zona, la tasa de
-- cambio, el feed de Instagram. Una tabla `(clave, valor jsonb, actualizado_at)`
-- los absorbe a todos sin una migración por integración, igual que `contenido`
-- absorbe todas las secciones editables del sitio. El contrato de cada clave
-- vive en el código que la escribe, no en el esquema.
--
-- ---------------------------------------------------------------------------
-- CLAVES QUE USA EL SITIO HOY
-- ---------------------------------------------------------------------------
--   · `resenas_google`        El resumen ya cocinado: promedio, total de
--                             calificaciones, enlace a la ficha y las reseñas
--                             ya filtradas (4★ o más), ordenadas de más
--                             reciente a más antigua y recortadas a cinco.
--                             Se guarda cocinado y no crudo a propósito: el
--                             sitio no debería tener que repetir el filtrado en
--                             cada render, y si Google cambia su esquema el
--                             cambio se absorbe en `src/lib/resenas-google.ts`.
--   · `resenas_google:turno`  El turno del arranque en frío. Su `valor` no
--                             importa (`{}`); lo que importa es que **existir ya
--                             es la señal**. Quien consigue INSERTARLA es quien
--                             llama a Google; quien choca con la clave primaria
--                             no llama. Si el que ganó el turno se cayó sin
--                             guardar nada, su fila se queda vieja y otro la
--                             puede retomar pasados unos minutos con un UPDATE
--                             condicional sobre `actualizado_at`. Dos filas en
--                             vez de una columna `estado` porque así el candado
--                             y el dato no se pisan: el dato nunca está «medio
--                             escrito».
--
-- ---------------------------------------------------------------------------
-- PERMISOS: NADIE ENTRA, NI PARA LEER
-- ---------------------------------------------------------------------------
-- RLS activo y **sin ninguna política**. En Postgres eso no es un olvido: una
-- tabla con RLS y sin políticas no deja pasar a nadie que no se salte RLS. Y
-- quien se la salta es solo `service_role`, que es la clave que usan el cron y
-- el render del servidor.
--
-- El sitio lee estas reseñas **en el servidor** (la portada es un Server
-- Component), así que el navegador nunca necesita leer la tabla: no hay motivo
-- para conceder `select` a `anon`. Menos superficie, menos que auditar.
--
-- A `authenticated` tampoco: el panel no edita esta tabla. Lo que hay aquí no lo
-- escribe una persona, lo escribe el cron; dejarlo editable desde el panel sería
-- ofrecer un botón para desincronizar el sitio de Google.
--
-- El `revoke` explícito es obligatorio aunque la 011 ya endureció los privilegios
-- por defecto de `anon`: a `authenticated` la 011 NO lo tocó, y una tabla nueva
-- hereda de los `alter default privileges` de la plantilla de Supabase todos los
-- permisos para ese rol. Se dice en voz alta.
--
-- Idempotente: `if not exists`, `revoke` y `grant` se pueden repetir.
-- ============================================================================

set search_path to public, extensions;

-- ----------------------------------------------------------------------------
-- 1. La tabla
-- ----------------------------------------------------------------------------
create table if not exists cache_externo (
  clave          text primary key,
  valor          jsonb       not null,
  actualizado_at timestamptz not null default now()
);

comment on table cache_externo is
  'Respuestas de servicios externos guardadas para que el sitio no los llame en cada visita. Lo escribe el cron de /api/salud con service_role; el sitio solo lee. Claves actuales: resenas_google (el resumen cocinado) y resenas_google:turno (el candado del arranque en frío).';

comment on column cache_externo.valor is
  'La respuesta ya normalizada por el código que la guarda, nunca el JSON crudo del tercero.';

comment on column cache_externo.actualizado_at is
  'Cuándo se refrescó. El cron diario lo pisa en cada refresco con éxito; si Google falla NO se toca, porque lo guardado sigue siendo lo último bueno que se tuvo.';

-- ----------------------------------------------------------------------------
-- 2. RLS sin políticas = puerta cerrada para todo el mundo menos service_role
-- ----------------------------------------------------------------------------
alter table cache_externo enable row level security;

-- ----------------------------------------------------------------------------
-- 3. Privilegios de tabla, dichos en voz alta
-- ----------------------------------------------------------------------------
revoke all on cache_externo from anon;
revoke all on cache_externo from authenticated;

-- `service_role` ya los tiene por los valores por defecto del esquema, pero
-- repetirlo aquí deja la intención escrita en el mismo archivo que la tabla.
grant select, insert, update, delete on cache_externo to service_role;
