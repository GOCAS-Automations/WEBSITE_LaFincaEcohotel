# Referencia funcional — Proyecto La Maima

> Análisis de `C:\Users\cesar\OneDrive\Escritorio\FREELANCE\MAIMA\website` (2026-09-02).
> **Uso:** copiar patrones y lógica, JAMÁS el diseño. La Finca tiene su propia identidad (verde/natural, estilo iOS) y NO es bilingüe por ahora (solo español).

## Hallazgo principal

Casi todo está escrito a mano y funciona muy bien así. Solo 6 dependencias de producción: `next 15.5.x`, `react 19`, `@supabase/ssr`, `@supabase/supabase-js`, `resend` (import dinámico), `server-only`. Tailwind v4 sin config (tokens `@theme` en `globals.css`). **Sin** shadcn/Radix, sin date-fns, sin librería de calendario, sin Zod, sin ORM, sin tipos generados de Supabase. Vitest solo para módulos puros.

## Estructura

- Páginas públicas = cascarones de ~10 líneas que delegan en componentes de `src/components/pages/*`. (En Maima por bilingüismo; en La Finca igual conviene para mantener páginas delgadas.)
- `src/components/admin/` — ui.tsx (Card/Banner/INPUT_CLASS), action-form (useActionState + Banner + SubmitButton), submit-button (useFormStatus + confirm), flash (lee `?ok=`/`?error=`), chips-input, slug-fields, gallery-editor, image-field.
- `src/lib/` dividido en: supabase/ (4 clientes), admin/ (auth, validation, types, revalidate, storage-cleanup, availability), booking/ (actions, db, holds, guest, code, result, sweep, throttle), content.ts, pricing.ts, seo.ts, dates.ts, format.ts, occupancy.ts, whatsapp.ts, email/.

## Los 4 clientes de Supabase (patrón más valioso)

| Archivo | Clave | Cookies | Uso |
|---|---|---|---|
| `supabase/public.ts` | anon | ❌ | Sitio público → permite SSG + ISR |
| `supabase/server.ts` | anon | ✅ | Panel admin (sesión; render dinámico) |
| `supabase/client.ts` | anon | browser | Client Components |
| `supabase/admin.ts` | service_role | ❌ | Solo servidor + `import "server-only"` |

`public.ts` inyecta caché de Next en cada petición: `global.fetch` sobrescrito con `next: { tags: [PUBLIC_CONTENT_TAG], revalidate: 3600 }`. Eso hace funcionar `revalidateTag()` desde el panel. Páginas públicas: `export const revalidate = 3600` + `generateStaticParams` en `[slug]`.

## Auth del panel — 3 capas (replicar tal cual)

1. `src/middleware.ts` con `matcher` SOLO de `/admin/:path*` (el sitio público no paga middleware → ISR posible). `updateSession()` usa **`getUser()` (no `getSession()`)**, redirige a login con `?next=` validado por `safeAdminRedirect()` (anti open-redirect: solo rutas que empiecen por `/admin`, rechaza `//`).
2. `requireAdmin()` en layout del panel + **cada página + cada Server Action** ("el middleware es conveniencia de navegación, no frontera: una Server Action se invoca por POST directo").
3. RLS como última palabra. El panel NUNCA usa service_role (excepción: borrar huérfanos de Storage).

Login sin registro público; usuarios se crean en el Dashboard de Supabase. No revelar si el correo existe.

## Patrones CRUD del panel

- Un solo formulario crea/edita: si llega `id` en FormData → UPDATE; si no → INSERT + redirect a la ficha.
- Dos firmas de Server Action: formularios `(state, formData) => ActionState` con `useActionState` (`{status: 'idle'|'ok'|'error', message}`); botones sueltos `(formData)` → `redirect('?ok=...'|'?error=...')` pintado por `flash.tsx`.
- `runAction()` envuelve todo: convierte ValidationError en errorState y **re-lanza señales de control de Next** (`error.digest` empieza por `NEXT_REDIRECT` o es `NEXT_NOT_FOUND`) — olvidarlo rompe `redirect()` dentro de try/catch.
- Validadores manuales: requiredText, optionalText (vacío→null), requiredInt (limpia `.` `$`), checkbox, requiredDate, requiredEnum, requiredUuid, optionalEmail, stringList (JSON chips), galleryList.
- Traducir errores Postgres: `23505`→"ya existe…(slug)", `23503`→"hay reservas asociadas", `23P01`→"fechas se cruzan con otra reserva activa".
- Borrado defensivo: contar reservas con `{count:'exact', head:true}` antes del delete para explicar el motivo.
- Tras TODA mutación: `refreshAdmin()` + `revalidatePublicSite()`.

## Revalidación (doble caché — las dos hacen falta)

```ts
revalidateTag(PUBLIC_CONTENT_TAG);          // Data Cache
revalidatePath("/"); revalidatePath("/alojamientos");
revalidatePath("/alojamientos/[slug]", "page"); // 2º arg SOLO en patrones dinámicos
revalidatePath("/sitemap.xml"); revalidatePath("/_not-found");
```
Verificado en Next 15.5: para ruta estática pasar solo la ruta (con "page" no purga).

## Gestión de imágenes (subir desde PC O pegar URL — requisito de La Finca)

- Route handler de subida **bajo `/admin/api/gallery/upload`** (cubierto por el middleware). Flujo: `getUser()` → 401 | MIME whitelist (jpeg/png/webp/avif/gif) → 415 | máx 10MB → 413 | carpeta validada contra Set | nombre opaco `${carpeta}/${fecha}-${uuid8}.${ext}` | `upload(..., {cacheControl: "31536000", upsert: false})` → `{url, path}`.
- **Nunca se sobrescribe una foto, siempre ruta nueva** → URLs inmutables → `minimumCacheTTL` 31 días sin riesgo.
- `GalleryEditor` (cliente): estado local, viaja como JSON en `<input type="hidden">`. Subida múltiple secuencial, pegar URL externa, reordenar ↑/↓, la primera imagen = portada, alt inline, quitar. Si una tanda falla a medias conserva las subidas.
- `ImageField`: versión de una sola imagen para el CMS.
- Ambos usan `<img>` (no `next/image`) a propósito: URLs externas pegadas no están en remotePatterns.
- `storage-cleanup.ts`: best-effort, nunca lanza. `bucketPathFromUrl()` devuelve null si la URL no es del bucket propio (no borra externas). Recolecta TODOS los strings del jsonb referenciado y borra solo lo no referenciado, con service_role.

## CMS ligero (`site_content`)

Tabla `(key text PK, value jsonb, updated_at)`. Claves tipo `home_hero`, `home_about`, `contact`, `seo`, `listing_heroes`, `instagram_strip`, `not_found`. Lectura: getters envueltos en `cache()` de React + **fallbacks en código** (si Supabase no responde en build, el sitio publica con defaults en vez de romper el deploy). Escritura: `upsertContent` lee la fila y hace merge (el jsonb puede tener claves que el form no muestra), luego cleanup de imágenes huérfanas + revalidación. `toParagraphs()` parte textarea por línea en blanco. Token `{{alojamientos}}` + `fillCountTokensDeep()` para conteos dinámicos ("5 cabañas") con fuente única `getVisibleStayCount()`.
(La Finca: ignorar todo lo `*_en` / bilingüe.)

## Motor de reservas (fase posterior, pero el modelo de datos se define YA)

- Widget de 3 pasos en la misma tarjeta: `dates → form → success`. Disponibilidad vía `GET /api/availability/[slug]` (no-store) al montar; tarifas viajan prerenderizadas y el total se calcula en cliente **solo para mostrar** — el precio real siempre se recalcula en servidor.
- `createBookingRequest` orden estricto: honeypot → validar huésped → throttle → prepareStay (precio server-side) → **releaseExpiredHolds()** → rangeIsTaken → insert con código → correos en try/catch (nunca tumban una reserva creada).
- **Hold**: constraint EXCLUDE no puede leer `now()` (predicado inmutable) → un `pending` vencido sigue ocupando para el constraint. Solución: función SQL `release_expired_holds()` (UPDATE atómico a cancelled, anexa nota) llamada ANTES de toda creación/reactivación, pública o del panel. Maima usa hold de 48h (reserva sin pago); **La Finca pagará online → hold corto (~30 min según plan §4.1)**.
- `occupiesCalendar(row, now)` en UN solo módulo, usado por availability, iCal y panel ("si los tres no dicen lo mismo, la diferencia se llama sobreventa").
- Código de reserva dictable por teléfono (alfabeto sin 0/O/1/I/L); unicidad por reintento ante `23505`, no por SELECT previo.
- Carreras: el perdedor recibe `23P01` → mensaje amable, recarga calendario, vuelve a paso 1. Módulos `result.ts` y `guest.ts` devuelven **códigos de error, no texto**.
- Anti-abuso sin servicios externos: cookie httpOnly (5/hora, cooldown 20s) + Map en memoria por IP.
- iCal export RFC 5545 a mano (`/api/ical/[slug]`, un VEVENT por fila con UID estable, cero datos personales, cache 5 min). Import de feeds diseñado, no implementado.

## Otros patrones a replicar

- **formatCOP a mano** (no Intl.NumberFormat) para que servidor y navegador coincidan → evita errores de hidratación. `"$350.000"`.
- **dates.ts sobre strings "YYYY-MM-DD"**: `todayInBogota()`, `addDays`, `nightsBetween`, `monthGrid`, `parseDateRange`/`toDateRangeLiteral` para `daterange` de Postgres.
- SEO: `pageMetadata()` arma canónica+OG+Twitter de una vez (la mezcla de metadata del App Router es superficial). JSON-LD `LodgingBusiness` + `Product` alimentado de la BD. Sitemap con `lastmod` reales desde `updated_at` (para una ficha: máx entre alojamiento y sus tarifas). Redirects 301 en `next.config.ts` (¡ganan a las rutas del App Router!).
- `next.config.ts` imágenes: `deviceSizes [390,640,768,1080,1280,1920]`, `imageSizes [64,128,256,384]`, `qualities [68,75,90]`, `minimumCacheTTL 31 días`, remotePatterns derivado de `NEXT_PUBLIC_SUPABASE_URL`.
- Emails Resend "listos pero dormidos": sin API key loguean y devuelven `{sent:false}` — **nunca lanzan** (se llamarán desde webhook de pago). Import dinámico.
- WhatsApp flotante: server component lee número editable del CMS + client component que **se aparta cuando el visitante llega al motor de reservas**. `whatsapp.ts` compone mensajes prellenados por contexto.
- Detalles BD: `set_updated_at()` con trigger por tabla; GRANTs explícitos + `alter default privileges` (RLS escrita pero inalcanzable sin GRANT — afecta hasta a service_role); una sola policy permisiva por (rol, acción); `(select auth.uid())` en subconsulta por rendimiento; FK de reservas `ON DELETE RESTRICT`; índice único parcial para booking_code.
- Tests Vitest solo de módulos puros (pricing, holds, code, guest, result, seo).

## Archivos de Maima para consultar al portar

| Objetivo | Archivos |
|---|---|
| Esquema y RLS | `supabase/schema.sql`, `supabase/migracion-oryon.sql` (§B storage) |
| Clientes Supabase + ISR | `src/lib/supabase/{public,server,client,admin,middleware}.ts` |
| Auth admin | `src/middleware.ts`, `src/lib/admin/auth.ts`, `src/app/admin/(panel)/layout.tsx` |
| CRUD | `src/app/admin/(panel)/alojamientos/actions.ts`, `src/lib/admin/{validation,types,revalidate}.ts` |
| Imágenes | `src/app/admin/api/gallery/upload/route.ts`, `src/components/admin/{gallery-editor,image-field}.tsx`, `src/lib/admin/storage-cleanup.ts` |
| CMS | `src/lib/content.ts`, `src/app/admin/(panel)/contenido/actions.ts` |
| Reservas | `src/lib/booking/*.ts`, `src/lib/occupancy.ts` |
| Precios | `src/lib/pricing.ts` |
| SEO | `src/lib/seo.ts`, `src/app/{sitemap,robots}.ts`, `next.config.ts` |

## Diferencias deliberadas de La Finca vs Maima

1. Solo español (sin `/en`, sin columnas `*_en`).
2. Modelo de tarifas distinto: `alojamiento × plan × fecha` (Entre Semana/Estándar/Premium), no por ocupación. Tablas `planes` y `tarifas` propias (plan §4).
3. Pago online con Wompi desde el inicio del motor → hold corto (~30 min) en vez de 48h.
4. Tablas y código de dominio en español (alojamientos, reservas, bloqueos…) según plan §4.
5. Extras/experiencias se venden DENTRO de la reserva (`reserva_extras`), no solo como página informativa.
6. Diseño propio iOS/verde — cero reutilización visual.
