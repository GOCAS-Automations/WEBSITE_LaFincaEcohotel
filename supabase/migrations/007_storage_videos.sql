-- ============================================================================
-- 007 — Storage: bucket `videos`
--
-- La sección «Somos COP16» de la portada pasa de una fotografía a un video: el
-- mismo clip que el hotel publicó en el sitio anterior. Un video no cabe en el
-- bucket `imagenes` —su lista blanca de MIME solo admite fotos y su límite es
-- de 10 MB— y tampoco debe: mezclarlos rompería la limpieza de huérfanos, que
-- recorre las referencias de imágenes.
--
--   · Lectura: pública (el video se sirve en el sitio).
--   · Escritura: solo authenticated (el panel) y service_role (scripts).
--   · MIME: solo mp4 y webm. Nada de .mov ni .avi: pesan cuatro veces más y no
--     los reproduce Safari en iOS sin recodificar.
--   · Límite: 60 MB por archivo. El clip publicado pesa mucho menos (ver
--     `scripts/subir-video-cop16.mjs`), pero el margen permite que el cliente
--     suba desde el panel un video sin recomprimir sin recibir un error seco.
--
-- Idempotente.
-- ============================================================================

set search_path to public, extensions;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'videos',
  'videos',
  true,
  62914560, -- 60 MB
  array['video/mp4', 'video/webm']
)
on conflict (id) do update
   set public = true,
       file_size_limit = excluded.file_size_limit,
       allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- Políticas sobre storage.objects acotadas al bucket `videos`
-- ----------------------------------------------------------------------------
drop policy if exists "videos lectura publica" on storage.objects;
create policy "videos lectura publica" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'videos');

drop policy if exists "videos subida panel" on storage.objects;
create policy "videos subida panel" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'videos');

drop policy if exists "videos actualizacion panel" on storage.objects;
create policy "videos actualizacion panel" on storage.objects
  for update to authenticated
  using (bucket_id = 'videos')
  with check (bucket_id = 'videos');

drop policy if exists "videos borrado panel" on storage.objects;
create policy "videos borrado panel" on storage.objects
  for delete to authenticated
  using (bucket_id = 'videos');
