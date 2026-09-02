-- ============================================================================
-- 001 — Esquema inicial de La Finca Eco Hotel
-- Implementa el modelo de datos del §4 del plan de desarrollo.
-- Este archivo es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

create schema if not exists extensions;

-- Necesaria para los constraints anti-solapamiento (§4.1): permite combinar
-- igualdad de uuid con solapamiento de daterange dentro de un índice GiST.
create extension if not exists btree_gist with schema extensions;

set search_path to public, extensions;

-- ----------------------------------------------------------------------------
-- ALOJAMIENTOS (las cabañas)
-- ----------------------------------------------------------------------------
create table if not exists alojamientos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,                     -- "Cabaña 01"
  slug text unique not null,                -- "cabana-01"
  descripcion text,
  capacidad int not null default 2,
  amenidades text[],                        -- ['Jacuzzi privado','Vista a la montaña']
  orden int default 0,
  activo boolean default true,              -- pausar sin borrar
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- PLANES TARIFARIOS (Entre Semana / Estándar / Premium)
-- ----------------------------------------------------------------------------
create table if not exists planes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  incluye text[],                           -- lista de lo que incluye el plan
  orden int default 0,
  activo boolean default true
);

-- Añadido al §4: el nombre del plan identifica al plan de cara al huésped,
-- y permite que el seed sea re-ejecutable.
create unique index if not exists planes_nombre_unico on planes (nombre);

-- ----------------------------------------------------------------------------
-- TARIFAS: precio por alojamiento + plan, con vigencia opcional (temporadas)
-- ----------------------------------------------------------------------------
create table if not exists tarifas (
  id uuid primary key default gen_random_uuid(),
  alojamiento_id uuid references alojamientos(id) on delete cascade,
  plan_id uuid references planes(id) on delete cascade,
  precio_noche int not null,                -- COP, entero
  vigencia daterange,                       -- null = tarifa base todo el año
  dias_semana int[],                        -- opcional: [1,2,3,4] para entre semana
  created_at timestamptz default now()
);

-- Añadido al §4: una sola tarifa base (sin vigencia) por cabaña × plan.
create unique index if not exists tarifas_base_unica
  on tarifas (alojamiento_id, plan_id)
  where vigencia is null;

create index if not exists tarifas_alojamiento_idx on tarifas (alojamiento_id);
create index if not exists tarifas_plan_idx on tarifas (plan_id);

-- ----------------------------------------------------------------------------
-- EXPERIENCIAS y ADICIONALES (se venden junto a la reserva)
-- ----------------------------------------------------------------------------
create table if not exists extras (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('experiencia','adicional')),
  nombre text not null,                     -- "Aniversario con Amor"
  descripcion text,
  precio int not null,                      -- 150000
  imagen_url text,
  activo boolean default true,
  orden int default 0
);

-- Añadido al §4: evita duplicados y permite re-ejecutar el seed.
create unique index if not exists extras_nombre_unico on extras (nombre);

-- ----------------------------------------------------------------------------
-- RESERVAS
-- ----------------------------------------------------------------------------
create table if not exists reservas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,              -- "LF-2026-0042", legible para el huésped
  alojamiento_id uuid references alojamientos(id),
  plan_id uuid references planes(id),
  estancia daterange not null,              -- [check_in, check_out)
  huesped_nombre text not null,
  huesped_email text not null,
  huesped_telefono text not null,
  huesped_documento text,
  num_personas int default 2,
  notas text,
  subtotal_alojamiento int not null,
  subtotal_extras int default 0,
  total int not null,
  monto_pagado int default 0,               -- soporta pago parcial (anticipo)
  estado text not null default 'pendiente'
    check (estado in ('pendiente','confirmada','cancelada','completada')),
  origen text not null default 'web'
    check (origen in ('web','whatsapp','telefono','manual')),
  created_at timestamptz default now()
);

create index if not exists reservas_alojamiento_idx on reservas (alojamiento_id);
create index if not exists reservas_estado_idx on reservas (estado);
create index if not exists reservas_estancia_idx on reservas using gist (estancia);

-- ----------------------------------------------------------------------------
-- Extras de cada reserva
-- ----------------------------------------------------------------------------
create table if not exists reserva_extras (
  reserva_id uuid references reservas(id) on delete cascade,
  extra_id uuid references extras(id),
  cantidad int default 1,
  precio_unitario int not null,             -- congelado al momento de reservar
  primary key (reserva_id, extra_id)
);

-- ----------------------------------------------------------------------------
-- BLOQUEOS: mantenimiento, eventos privados, uso de los dueños
-- ----------------------------------------------------------------------------
create table if not exists bloqueos (
  id uuid primary key default gen_random_uuid(),
  alojamiento_id uuid references alojamientos(id) on delete cascade,
  rango daterange not null,
  motivo text,
  created_at timestamptz default now()
);

create index if not exists bloqueos_alojamiento_idx on bloqueos (alojamiento_id);

-- ----------------------------------------------------------------------------
-- PAGOS (transacciones de Wompi)
-- ----------------------------------------------------------------------------
create table if not exists pagos (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid references reservas(id) on delete cascade,
  referencia text unique not null,          -- la que enviamos a Wompi
  transaccion_id text,                      -- id que devuelve Wompi
  monto int not null,
  estado text not null,                     -- PENDING / APPROVED / DECLINED / VOIDED / ERROR
  metodo text,                              -- CARD / PSE / NEQUI
  payload jsonb,                            -- respuesta cruda del webhook
  created_at timestamptz default now()
);

create index if not exists pagos_reserva_idx on pagos (reserva_id);

-- ----------------------------------------------------------------------------
-- CONTENIDO DEL SITIO (CMS ligero para el módulo 1 del panel)
-- ----------------------------------------------------------------------------
create table if not exists contenido (
  clave text primary key,                   -- 'home.hero.titulo'
  valor jsonb not null,
  actualizado_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- GALERÍA
-- ----------------------------------------------------------------------------
create table if not exists imagenes (
  id uuid primary key default gen_random_uuid(),
  alojamiento_id uuid references alojamientos(id) on delete cascade,
  url text not null,
  alt text,                                 -- obligatorio por accesibilidad y SEO
  orden int default 0
);

create index if not exists imagenes_alojamiento_idx on imagenes (alojamiento_id);

-- ============================================================================
-- §4.1 — La regla más importante: nada de dobles reservas.
-- Se resuelve en la base de datos, no solo en la aplicación.
-- ============================================================================

-- Una cabaña no puede tener dos reservas activas que se solapen.
-- Con daterange [check_in, check_out) la salida de un huésped y la entrada de
-- otro el mismo día NO se consideran solapamiento (comportamiento hotelero).
do $$
begin
  alter table reservas add constraint reservas_sin_solapamiento
    exclude using gist (
      alojamiento_id with =,
      estancia with &&
    ) where (estado in ('pendiente','confirmada'));
exception
  when duplicate_table or duplicate_object then null;
end
$$;

-- Tampoco pueden solaparse dos bloqueos de la misma cabaña.
do $$
begin
  alter table bloqueos add constraint bloqueos_sin_solapamiento
    exclude using gist (alojamiento_id with =, rango with &&);
exception
  when duplicate_table or duplicate_object then null;
end
$$;

-- ----------------------------------------------------------------------------
-- Mantener `contenido.actualizado_at` al día (lo usa el panel).
-- ----------------------------------------------------------------------------
create or replace function tocar_actualizado_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.actualizado_at = now();
  return new;
end;
$$;

drop trigger if exists contenido_actualizado_at on contenido;
create trigger contenido_actualizado_at
  before update on contenido
  for each row execute function tocar_actualizado_at();
