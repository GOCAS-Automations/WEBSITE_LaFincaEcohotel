-- ============================================================================
-- 004 — Storage: límites del bucket `imagenes`
--
-- Restringe el bucket a los formatos de imagen usados en el sitio y a un
-- tamaño máximo por archivo, para evitar subidas accidentales de tipos o
-- pesos no previstos desde el panel o los scripts de carga.
-- Idempotente.
-- ============================================================================

set search_path to public, extensions;

update storage.buckets
   set file_size_limit = 10485760, -- 10 MB
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
 where id = 'imagenes';
