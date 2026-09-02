-- ============================================================================
-- 003 — Storage: bucket `imagenes`
--
-- Todas las fotos del sitio viven aquí (regla 10 de CLAUDE.md). Desde el panel
-- se puede subir un archivo o pegar una URL.
--   · Lectura: pública (las imágenes se sirven en el sitio).
--   · Escritura: solo authenticated (el panel) y service_role (scripts).
-- Idempotente.
-- ============================================================================

set search_path to public, extensions;

insert into storage.buckets (id, name, public)
values ('imagenes', 'imagenes', true)
on conflict (id) do update set public = true;

-- ----------------------------------------------------------------------------
-- Políticas sobre storage.objects acotadas al bucket `imagenes`
-- ----------------------------------------------------------------------------
drop policy if exists "imagenes lectura publica" on storage.objects;
create policy "imagenes lectura publica" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'imagenes');

drop policy if exists "imagenes subida panel" on storage.objects;
create policy "imagenes subida panel" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imagenes');

drop policy if exists "imagenes actualizacion panel" on storage.objects;
create policy "imagenes actualizacion panel" on storage.objects
  for update to authenticated
  using (bucket_id = 'imagenes')
  with check (bucket_id = 'imagenes');

drop policy if exists "imagenes borrado panel" on storage.objects;
create policy "imagenes borrado panel" on storage.objects
  for delete to authenticated
  using (bucket_id = 'imagenes');
