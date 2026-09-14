-- ============================================================================
-- 008 — `contenido`: la COP16 deja de ser una fila de la portada
--
-- La sección «Somos COP16» se mudó de la portada a `/conocenos` el 2026-09-14
-- (petición de Cesar: un video de 2 min 49 s con locución no puede competir con
-- el camino a reservar en la única pantalla que todo el mundo ve). Con la
-- sección se muda su fila del CMS:
--
--   `home.reconocimiento`  →  `conocenos.reconocimiento`
--
-- POR QUÉ SE RENOMBRA Y NO SE DEJA COMO ESTABA
-- --------------------------------------------
-- El prefijo de la clave es lo único que dice en qué página se ve un bloque.
-- Una fila llamada `home.` que se pinta en `/conocenos` es una pista falsa que
-- dentro de seis meses cuesta media hora de búsqueda a quien venga detrás.
--
-- POR QUÉ UN `update` Y NO UN `insert` NUEVO
-- ------------------------------------------
-- Porque la fila puede traer texto que el hotel editó desde el panel. Insertar
-- la clave nueva y borrar la vieja habría devuelto la sección al texto de
-- respaldo del código y habría perdido, en silencio, cualquier corrección hecha
-- en producción. El `update` conserva el jsonb intacto: solo cambia la
-- etiqueta.
--
-- Idempotente: si ya se aplicó, el `where` no encuentra nada y no pasa nada.
-- Si por lo que sea existieran las DOS filas (alguien re-ejecutó el seed nuevo
-- antes de esta migración), se conserva la nueva —que es la que el sitio lee— y
-- se retira la vieja, que a partir de aquí no la lee nadie.
-- ============================================================================

set search_path to public, extensions;

update contenido
   set clave = 'conocenos.reconocimiento',
       actualizado_at = now()
 where clave = 'home.reconocimiento'
   and not exists (
         select 1 from contenido where clave = 'conocenos.reconocimiento'
       );

delete from contenido where clave = 'home.reconocimiento';
