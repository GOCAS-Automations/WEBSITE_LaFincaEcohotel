-- ============================================================================
-- 015 — Pagos con Bold: idempotencia del webhook y rastro de cada intento
--
-- ---------------------------------------------------------------------------
-- LO QUE YA HABÍA, Y POR QUÉ NO ALCANZA
-- ---------------------------------------------------------------------------
-- `pagos` existe desde la migración 001 con la forma correcta: una fila por
-- intento de cobro, `referencia` única, `monto`, `estado`, `metodo` y el
-- `payload` crudo. Lo que falta es lo que convierte esa tabla en algo seguro
-- frente a un webhook que **se reintenta hasta cinco veces** (Bold: 15 min,
-- 1 h, 4 h, 8 h, 24 h) y que además «puede enviarte múltiples notificaciones
-- por una misma transacción (…) o confirmaciones de estado».
--
-- El requisito 4 de `docs/AUDITORIA_SEGURIDAD.md` lo dice sin rodeos: «El
-- webhook es idempotente. La misma transacción tiene que poder llegar dos veces
-- sin cobrar dos veces ni duplicar la reserva».
--
-- ---------------------------------------------------------------------------
-- LA IDEMPOTENCIA SE RESUELVE EN **DOS CAPAS**, NO EN UNA
-- ---------------------------------------------------------------------------
-- **Capa 1 — el identificador de la notificación (`pagos_eventos`).**
-- Cada notificación trae un `id` que Bold documenta como «UUID de la
-- notificación. Es única para cada notificación enviada». La tabla
-- `pagos_eventos` lo guarda como clave primaria, así que insertarlo con
-- `on conflict do nothing returning` es a la vez el registro del evento y el
-- candado: si no devuelve fila, ese evento exacto ya se procesó y el webhook
-- responde 200 sin hacer nada más. Una sola sentencia, atómica.
--
-- **Capa 2 — la transición de estado en `pagos`.**
-- La capa 1 no basta, y conviene decir por qué: la documentación dice que el
-- `id` es único **por notificación enviada**, no por transacción. Un reintento
-- podría traer un `id` nuevo del mismo pago, y entonces la capa 1 lo dejaría
-- pasar. La garantía de verdad es que los efectos —confirmar la reserva, mandar
-- los correos, crear el evento del calendario— ocurran **solo en la transición**
-- a aprobado:
--
--     update pagos set estado = 'APPROVED', …
--      where referencia = $1 and estado <> 'APPROVED'
--     returning id
--
-- Si no devuelve fila, ese pago ya estaba aprobado: no se reenvía ningún correo.
-- Es la misma técnica del turno de `cache_externo` (migración 014): una
-- escritura condicional en vez de un `select` y luego un `update`, porque entre
-- los dos cabe otra ejecución del webhook.
--
-- `pagos_eventos` no es, por tanto, solo un candado: es el **historial completo**
-- de lo que Bold ha dicho sobre cada referencia, con su cuerpo crudo. El día que
-- una reserva aparezca pagada y el hotel no lo entienda, eso es la prueba.
--
-- ---------------------------------------------------------------------------
-- NADA DE DATOS DE TARJETA
-- ---------------------------------------------------------------------------
-- Requisito 6 de la auditoría: «Nunca se guarda un dato de la tarjeta». El
-- checkout es de Bold y el sitio no ve ni un dígito. Lo que Bold sí manda en el
-- webhook es el PAN **enmascarado** (`451732******0019`), la franquicia y el
-- nombre del tarjetahabiente; eso viaja dentro de `payload`, que se guarda tal
-- cual porque es el soporte del cobro. Un PAN enmascarado no es un dato de
-- tarjeta en el sentido de PCI —no permite reconstruir nada— y la tabla no es
-- legible por nadie salvo `service_role`.
--
-- Idempotente.
-- ============================================================================

set search_path to public, extensions;

-- ----------------------------------------------------------------------------
-- 1. Columnas nuevas en `pagos`
-- ----------------------------------------------------------------------------
alter table pagos
  add column if not exists pasarela       text        not null default 'bold',
  add column if not exists evento_id      text,
  add column if not exists actualizado_at timestamptz not null default now(),
  add column if not exists procesado_at   timestamptz;

comment on column pagos.pasarela is
  'Qué pasarela procesó el cobro. Hoy siempre `bold`; la columna existe para que un cambio de proveedor no obligue a reinterpretar el historial.';

comment on column pagos.referencia is
  'La referencia única que viajó a Bold como `order-id` y que vuelve en `data.metadata.reference` del webhook. Formato `LF-AAAA-NNNN-<milisegundos>`: lleva el código de la reserva delante para que se lea en el panel de Bold, y la marca de tiempo detrás porque Bold pide no reutilizar identificadores de ventas ya pagadas (un segundo intento de pago de la misma reserva es otra fila).';

comment on column pagos.transaccion_id is
  'El `payment_id` que genera Bold (también viene como `subject` del evento). Es el identificador con el que el soporte de Bold localiza la transacción.';

comment on column pagos.estado is
  'Estado de Bold, tal cual: NO_TRANSACTION_FOUND, PROCESSING, PENDING, APPROVED, REJECTED, FAILED, VOIDED. El valor inicial que escribe el sitio al abrir el checkout es PROCESSING.';

comment on column pagos.payload is
  'Cuerpo completo del último evento (o de la última consulta a la API) tal como llegó. Es el soporte del cobro. Puede contener el PAN ENMASCARADO que manda Bold; nunca un número de tarjeta completo ni un CVV, que el sitio no recibe.';

comment on column pagos.evento_id is
  'El `id` de la última notificación de Bold que se aplicó a esta fila. El historial completo está en `pagos_eventos`.';

comment on column pagos.procesado_at is
  'Cuándo este pago se convirtió en una confirmación de reserva (correos y calendario incluidos). NULL = todavía no se ha actuado sobre él. Es la marca que hace visible, de un vistazo, si un pago aprobado se quedó sin confirmar su reserva.';

-- `pagos.estado` no lleva `check`: los estados los define Bold y una lista
-- cerrada aquí haría que un estado nuevo suyo rompiera el webhook con un 23514
-- en vez de guardarse para que alguien lo mire. La normalización vive en
-- `src/lib/pagos/bold.ts` (`normalizarEstadoBold`), que sí tiene lista cerrada
-- pero degrada a `DESCONOCIDO` en vez de fallar.

-- Buscar un pago por su `transaccion_id` es lo que hace el equipo cuando el
-- soporte de Bold le da ese número y nada más.
create index if not exists pagos_transaccion_idx on pagos (transaccion_id)
  where transaccion_id is not null;

-- El listado del panel necesita el último pago de cada reserva.
create index if not exists pagos_reserva_fecha_idx on pagos (reserva_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 2. El historial de notificaciones
-- ----------------------------------------------------------------------------
create table if not exists pagos_eventos (
  -- El `id` de la notificación de Bold ES la clave primaria: eso es lo que
  -- convierte el `insert … on conflict do nothing` en el candado de la capa 1.
  id          text primary key,
  referencia  text,
  tipo        text,
  payload     jsonb       not null,
  recibido_at timestamptz not null default now()
);

comment on table pagos_eventos is
  'Cada notificación de webhook que Bold ha enviado, con su cuerpo crudo. Su clave primaria es el `id` de la notificación: insertarla con `on conflict do nothing returning` descarta de una sola sentencia los reenvíos de Bold (que reintenta hasta cinco veces). Nadie la lee desde el sitio ni desde el panel: es el soporte y la pista para auditar un cobro.';

comment on column pagos_eventos.referencia is
  'Nuestra referencia (`data.metadata.reference`), para poder cruzar el evento con su fila de `pagos`. Puede ser NULL si Bold manda un evento sin referencia (pasa en los pagos por datáfono, que este sitio no usa).';

comment on column pagos_eventos.tipo is
  'SALE_APPROVED, SALE_REJECTED, VOID_APPROVED o VOID_REJECTED.';

create index if not exists pagos_eventos_referencia_idx on pagos_eventos (referencia);

-- ----------------------------------------------------------------------------
-- 3. Permisos: nadie entra, ni para leer
-- ----------------------------------------------------------------------------
-- Mismo criterio que `cache_externo` (migración 014) y que `pagos` desde la 002:
-- RLS activo y **sin ninguna política**. En Postgres eso no deja pasar a nadie
-- salvo a quien se salta RLS, que es `service_role`.
--
-- El `revoke` explícito a `authenticated` NO es redundante: la 011 endureció los
-- privilegios por defecto de `anon`, pero no los de `authenticated`, así que una
-- tabla nueva los hereda todos de la plantilla de Supabase. Es exactamente el
-- aviso que dejó el hallazgo A-4 de la auditoría para «la primera tabla que se
-- cree después», y esta lo es.
--
-- Esto aplica SOLO a `pagos_eventos`: nadie lo lee desde el panel ni desde el
-- sitio, lo escribe y lo consulta el webhook con `service_role`.
alter table pagos_eventos enable row level security;

revoke all on pagos_eventos from anon;
revoke all on pagos_eventos from authenticated;
grant select, insert, update, delete on pagos_eventos to service_role;

-- ⚠ `pagos` NO se toca aquí, y conviene que quede escrito por qué:
-- la migración 002 le puso RLS y la política «pagos solo panel» **para
-- `authenticated`**, porque la ficha de la reserva del panel muestra el estado
-- del cobro. Revocarle los privilegios a `authenticated` dejaría esa tarjeta
-- vacía sin ningún error visible. Lo que sí sigue cerrado desde la 002 es `anon`
-- (`revoke all on pagos from anon`), que es lo que importa: los datos
-- financieros no son públicos.
alter table pagos enable row level security;
revoke all on pagos from anon;
grant select, insert, update, delete on pagos to service_role;

-- ----------------------------------------------------------------------------
-- 4. `actualizado_at` se mantiene solo
-- ----------------------------------------------------------------------------
-- `tocar_actualizado_at()` ya existe (migración 001) y no es `security definer`.
do $$
begin
  create trigger pagos_tocar_actualizado
    before update on pagos
    for each row execute function tocar_actualizado_at();
exception
  when duplicate_object then null;
end $$;
