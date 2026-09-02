-- ============================================================================
-- 005 — Una foto no puede estar dos veces en la galería
--
-- POR QUÉ: `supabase/seed/002_contenido.sql` carga las galerías de las cabañas
-- y debe poder re-ejecutarse sin duplicar filas. Sin una restricción única no
-- hay `on conflict` posible y cada `npm run db:aplicar` añadiría 34 imágenes
-- más.
--
-- La unicidad va sobre `url` a secas, no sobre (alojamiento_id, url): la misma
-- foto en dos cabañas distintas sería un error de carga, no un caso válido.
--
-- Además se ordena la galería por (alojamiento, orden), que es como la leen
-- tanto el sitio como el futuro panel.
-- ============================================================================

set search_path to public, extensions;

create unique index if not exists imagenes_url_unica on imagenes (url);

create index if not exists imagenes_orden_idx
  on imagenes (alojamiento_id, orden);
