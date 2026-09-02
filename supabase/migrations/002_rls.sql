-- ============================================================================
-- 002 — Row Level Security en todas las tablas
--
-- Criterio (§3 regla 3 del plan):
--   · anon (visitantes del sitio)  → solo LEE lo publicado/activo.
--   · authenticated (el panel)     → lee y escribe todo.
--   · service_role                 → salta RLS por diseño (Route Handlers).
--
-- Las reservas, los pagos y los bloqueos NO tienen lectura pública: contienen
-- datos personales de los huéspedes.
-- Idempotente: cada política se recrea con drop policy if exists.
-- ============================================================================

set search_path to public, extensions;

alter table alojamientos    enable row level security;
alter table planes          enable row level security;
alter table tarifas         enable row level security;
alter table extras          enable row level security;
alter table reservas        enable row level security;
alter table reserva_extras  enable row level security;
alter table bloqueos        enable row level security;
alter table pagos           enable row level security;
alter table contenido       enable row level security;
alter table imagenes        enable row level security;

-- ----------------------------------------------------------------------------
-- ALOJAMIENTOS — público ve solo las cabañas activas
-- ----------------------------------------------------------------------------
drop policy if exists "alojamientos lectura publica" on alojamientos;
create policy "alojamientos lectura publica" on alojamientos
  for select to anon, authenticated
  using (activo = true or auth.role() = 'authenticated');

drop policy if exists "alojamientos escritura panel" on alojamientos;
create policy "alojamientos escritura panel" on alojamientos
  for all to authenticated
  using (true) with check (true);

-- ----------------------------------------------------------------------------
-- PLANES — público ve solo los planes activos
-- ----------------------------------------------------------------------------
drop policy if exists "planes lectura publica" on planes;
create policy "planes lectura publica" on planes
  for select to anon, authenticated
  using (activo = true or auth.role() = 'authenticated');

drop policy if exists "planes escritura panel" on planes;
create policy "planes escritura panel" on planes
  for all to authenticated
  using (true) with check (true);

-- ----------------------------------------------------------------------------
-- TARIFAS — público ve las tarifas de cabañas y planes activos
-- ----------------------------------------------------------------------------
drop policy if exists "tarifas lectura publica" on tarifas;
create policy "tarifas lectura publica" on tarifas
  for select to anon, authenticated
  using (
    auth.role() = 'authenticated'
    or (
      exists (select 1 from alojamientos a where a.id = tarifas.alojamiento_id and a.activo)
      and exists (select 1 from planes p where p.id = tarifas.plan_id and p.activo)
    )
  );

drop policy if exists "tarifas escritura panel" on tarifas;
create policy "tarifas escritura panel" on tarifas
  for all to authenticated
  using (true) with check (true);

-- ----------------------------------------------------------------------------
-- EXTRAS (experiencias y adicionales) — público ve solo los activos
-- ----------------------------------------------------------------------------
drop policy if exists "extras lectura publica" on extras;
create policy "extras lectura publica" on extras
  for select to anon, authenticated
  using (activo = true or auth.role() = 'authenticated');

drop policy if exists "extras escritura panel" on extras;
create policy "extras escritura panel" on extras
  for all to authenticated
  using (true) with check (true);

-- ----------------------------------------------------------------------------
-- CONTENIDO del sitio — todo lo guardado aquí es contenido publicado
-- ----------------------------------------------------------------------------
drop policy if exists "contenido lectura publica" on contenido;
create policy "contenido lectura publica" on contenido
  for select to anon, authenticated
  using (true);

drop policy if exists "contenido escritura panel" on contenido;
create policy "contenido escritura panel" on contenido
  for all to authenticated
  using (true) with check (true);

-- ----------------------------------------------------------------------------
-- IMÁGENES — público ve las de cabañas activas y las de la galería general
-- ----------------------------------------------------------------------------
drop policy if exists "imagenes lectura publica" on imagenes;
create policy "imagenes lectura publica" on imagenes
  for select to anon, authenticated
  using (
    auth.role() = 'authenticated'
    or alojamiento_id is null
    or exists (select 1 from alojamientos a where a.id = imagenes.alojamiento_id and a.activo)
  );

drop policy if exists "imagenes escritura panel" on imagenes;
create policy "imagenes escritura panel" on imagenes
  for all to authenticated
  using (true) with check (true);

-- ============================================================================
-- Tablas privadas: sin ninguna política para anon.
-- El motor de reservas escribe con service_role desde Route Handlers.
-- ============================================================================

drop policy if exists "reservas solo panel" on reservas;
create policy "reservas solo panel" on reservas
  for all to authenticated
  using (true) with check (true);

drop policy if exists "reserva_extras solo panel" on reserva_extras;
create policy "reserva_extras solo panel" on reserva_extras
  for all to authenticated
  using (true) with check (true);

drop policy if exists "bloqueos solo panel" on bloqueos;
create policy "bloqueos solo panel" on bloqueos
  for all to authenticated
  using (true) with check (true);

drop policy if exists "pagos solo panel" on pagos;
create policy "pagos solo panel" on pagos
  for all to authenticated
  using (true) with check (true);

-- Defensa en profundidad: además de RLS, se le quitan los permisos de tabla
-- al rol anónimo sobre los datos personales y financieros.
revoke all on reservas       from anon;
revoke all on reserva_extras from anon;
revoke all on bloqueos       from anon;
revoke all on pagos          from anon;

-- El público no debe poder modificar contenido ni catálogo, ni siquiera con
-- una política mal escrita en el futuro: solo conserva SELECT.
revoke insert, update, delete on alojamientos from anon;
revoke insert, update, delete on planes       from anon;
revoke insert, update, delete on tarifas      from anon;
revoke insert, update, delete on extras       from anon;
revoke insert, update, delete on contenido    from anon;
revoke insert, update, delete on imagenes     from anon;
