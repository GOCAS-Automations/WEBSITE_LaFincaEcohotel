# Memoria del proyecto — La Finca Eco Hotel

> Bitácora viva. Cada sesión de trabajo relevante se registra aquí: qué se hizo, decisiones y pendientes.
> Fechas en formato AAAA-MM-DD.

## Estado general

- **Fase actual:** 3 (motor de reservas) o 5 (panel), según lo que decida Cesar.
  Fases 0, 1 y **2 (sitio público) completadas** el 2026-09-02.
- **Decisión de alcance:** primero todo el sitio + panel administrativo; motor de reservas y pagos (Wompi) después.
- **Repo remoto:** https://github.com/GOCAS-Automations/WEBSITE_LaFincaEcohotel.git (push pendiente de confirmación de Cesar; luego se conecta a Vercel).

## Decisiones tomadas

| Fecha | Decisión |
|---|---|
| 2026-09-02 | Diseño moderno estilo iOS, full responsive, identidad verde/natural de La Finca. |
| 2026-09-02 | Imágenes base en bucket `imagenes` de Supabase Storage; el panel permitirá subir archivo o URL. |
| 2026-09-02 | Logo provisional: se extrae del Instagram `@lafinca_cali` mientras el cliente envía el oficial. |
| 2026-09-02 | Flujo de trabajo: Fable planea, agentes Opus/Sonnet ejecutan. |
| 2026-09-02 | Se añaden al §4 tres índices únicos que el plan no traía: `planes.nombre`, `extras.nombre` y una sola tarifa base (sin vigencia) por cabaña × plan. Permiten que el seed se re-ejecute sin duplicar y evitan catálogos incoherentes. |
| 2026-09-02 | `btree_gist` se instala en el esquema `extensions` (recomendación de Supabase), no en `public`. Las migraciones fijan `search_path to public, extensions`. |
| 2026-09-02 | El bucket `imagenes` se crea por SQL (`storage.buckets`) y no por la API, para que quede versionado en `supabase/migrations/003_storage.sql`. |
| 2026-09-02 | Se mantiene Next.js 15.5.25. `npm audit` reporta una vulnerabilidad de `postcss` heredada de Next; el único arreglo disponible es subir a Next 16, que no está en el alcance acordado. Afecta solo a la compilación, no al sitio publicado. Revisar cuando se planee el salto de versión. |
| 2026-09-02 | **Tipografía:** "Intro" (la del sitio actual) es comercial y su licencia está pendiente. Se sustituye por **Manrope** en titulares e **Inter** en cuerpo, vía `next/font`. El cambio a Intro está preparado en un solo archivo: `src/lib/fuentes.ts`. |
| 2026-09-02 | **Paleta:** el tono 600 de cada familia ES el color de marca sin retocar (petróleo `#027570`, oliva `#5e6033`, dorado `#9f6301`); el resto de la escala se generó alrededor. Fondo crema `#fefbf7`, nunca blanco puro, como en el sitio actual. |
| 2026-09-02 | **Los textos legales viven en código** (`src/lib/legal.ts`), no en el CMS: son documentos jurídicos y deben versionarse con fecha de revisión (`LEGAL_ACTUALIZADO`), no editarse sin historial desde un panel. |
| 2026-09-02 | **La página de contacto no lleva formulario.** El hotel no tiene hoy un buzón de correo publicado ni un destino verificado; un formulario que no llega a nadie es peor que no tenerlo. Se añade cuando el cliente confirme el correo. |
| 2026-09-02 | **Los testimonios se publican sin foto.** Las tres imágenes `sitio/testimonios/*` del bucket son retratos genéricos de archivo que no corresponden a las personas citadas. Se muestran las iniciales. |
| 2026-09-02 | El FAQ del sitio actual decía "6 cabañas" mientras el catálogo publica 5. Se reescribió la respuesta sin la cifra para que el sitio no se contradiga. **Pendiente de confirmar el número real.** |
| 2026-09-02 | `/reservar` lee `?cabana=` y `?plan=` desde el CLIENTE (dentro de un `<Suspense>`). Leerlos en el servidor habría vuelto dinámica la ruta y se habría perdido el prerenderizado. |

## Registro de sesiones

### 2026-09-02 — Arranque del proyecto
- Leído y adoptado `PLAN_DESARROLLO_LaFinca.md`.
- Creados `CLAUDE.md`, `docs/MEMORIA.md`; `.env.local` organizado (Supabase listo; Wompi y Resend como placeholders).
- Análisis del proyecto de referencia La Maima → `docs/REFERENCIA_MAIMA.md`.

### 2026-09-02 — Fase 0 (scaffold) y Fase 1 (base de datos) — completadas

**Proyecto Next.js.** Next.js 15.5.25 (App Router) + TypeScript + Tailwind CSS v4 +
ESLint, con `src/` y alias `@/*`. Estructura de carpetas según `CLAUDE.md`.
`npm run build` pasa limpio; `tsc --noEmit` y `eslint` también.

- `src/lib/supabase/`: `client.ts` (navegador, anon), `server.ts` (servidor con
  cookies, anon) y `admin.ts` (service_role, protegido con `server-only`).
- `src/lib/utils/formato.ts`: `formatearCOP` con `Intl.NumberFormat('es-CO')` y
  helpers de fechas en `America/Bogota` con rangos `[entrada, salida)`.
- `src/lib/tipos/basedatos.ts`: tipos de las diez tablas.
- `next.config.ts` con `remotePatterns` hacia `yyfuhytmoiehqmnrekkq.supabase.co`.
- `.env.example` documenta las variables; `.env.local` sigue fuera del repo.

**Base de datos remota — aplicada y verificada.** Las diez tablas del §4 existen,
todas con RLS activo. Cargados 5 alojamientos, 3 planes, 15 tarifas y 2
experiencias. El bucket `imagenes` existe y es público para lectura.

Pruebas hechas contra la base real (todas en transacción con rollback):

- Reserva solapada en la misma cabaña → rechazada por `reservas_sin_solapamiento`.
- Entrada el mismo día que la salida de otro huésped → permitida, como debe ser.
- Reserva `cancelada` solapada → permitida (el constraint solo cubre activas).
- Bloqueo solapado → rechazado por `bloqueos_sin_solapamiento`.
- Con la clave anon: se leen alojamientos, planes, tarifas y extras; `reservas`,
  `pagos`, `bloqueos` y `reserva_extras` responden 401. Escribir como anónimo falla.
- Storage: subida con service_role y lectura pública sin credenciales funcionan;
  la subida anónima es rechazada por RLS.

**Git.** Repositorio inicializado en `main` con el remoto de GOCAS configurado.
Siete commits. **Sin push** — pendiente de que Cesar lo autorice.

**Lo que sigue (Fase 2):** layout público con navegación, footer con RNT 114565 y
botón flotante de WhatsApp, home con buscador de fechas, listado y detalle de
alojamientos.

### 2026-09-02 — Fase 2 (sitio público) — completada

**Sistema de diseño.** Tokens Tailwind v4 en `@theme` (`src/app/globals.css`):
cuatro familias de color derivadas del isotipo, escala de neutros cálidos,
radios de 12 a 24 px, sombras de varias capas, foco visible global y la
micro-aparición al hacer scroll. Tipografía Manrope + Inter con `next/font`.
Piezas compartidas en `src/components/ui/` (`Boton`, `Seccion`,
`EncabezadoSeccion`, `Revelar`, `Galeria`).

**Infraestructura de contenido.**

- `src/lib/supabase/public.ts` — cliente anon sin cookies que inyecta
  `next: { tags, revalidate }` en cada consulta. Es lo que permite SSG/ISR y lo
  que hará funcionar `revalidateTag(ETIQUETA_CONTENIDO_PUBLICO)` desde el panel.
- `src/lib/contenido.ts` — CMS ligero: lee la tabla `contenido` entera en UNA
  consulta cacheada con `cache()` y la fusiona sobre respaldos escritos en
  código. Si Supabase no responde durante el build, el sitio se publica igual.
  **18 claves**, documentadas en `docs/CMS_CLAVES.md` (contrato del panel).
- `supabase/seed/002_contenido.sql` — pobla el CMS con los textos reales del
  sitio actual, las galerías de las cinco cabañas (35 fotos con `alt` propio),
  las descripciones de cada cabaña y el detalle de las dos experiencias.
  Idempotente. La migración `005` añade el índice único que lo hace posible.

**Conteos verificados en la base remota:** 18 filas en `contenido`, 35 en
`imagenes` (8 · 8 · 7 · 5 · 7), 5 alojamientos, 3 planes, 15 tarifas, 2 extras.

**Páginas (todas en `src/app/(publico)/`, delgadas, delegando en
`src/components/paginas/`).** Portada, `/alojamientos`, `/alojamientos/[slug]`
(las cinco con `generateStaticParams`), `/experiencias`, `/el-lugar`,
`/galeria`, `/faq`, `/contacto`, `/reservar`, los cuatro documentos legales y
la 404 propia. **Las 18 rutas se prerenderizan con ISR de una hora**; ninguna
cae a render dinámico.

**SEO.** `src/lib/seo.ts` compone canónica + OpenGraph + Twitter de una vez;
`src/lib/datos-estructurados.ts` arma `LodgingBusiness` en la portada,
`Accommodation` + `Product` con oferta en cada cabaña y `FAQPage` en las
preguntas, todo alimentado de la base. `sitemap.ts` con `lastmod` reales y
`robots.ts` bloqueando `/admin` y `/api`.

**Revisión visual.** Se revisaron en Chrome (1440 px y 390 px) la portada, el
listado, la ficha, experiencias, el lugar, galería, preguntas, contacto,
reserva, un documento legal y la 404, además del visor de la galería (foco
atrapado y devuelto, teclas, bloqueo del fondo). Se corrigieron tres cosas: la
columna de miniaturas de la ficha no cuadraba con la foto grande, la etiqueta
"desde $…" se teñía sobre la madera anaranjada, y la micro-aparición podía
dejar contenido escondido si el `IntersectionObserver` no disparaba (ahora hay
un temporizador de seguridad de 3 s).

**Ojo con la caché de datos de Next.** El Data Cache sobrevive entre
compilaciones: después de cambiar contenido en la base hay que borrar
`.next/cache` en local, o llamar a `revalidateTag()` en producción. Si no, el
build reutiliza la respuesta vieja y el cambio no se ve.

## Pendientes de contenido/credenciales (pedir según se necesiten)

> Lo marcado como `TODO` en `supabase/seed/001_datos_iniciales.sql` sale del sitio
> público actual, no del cliente. Cuando confirme, se corrige el seed y se vuelve
> a correr `npm run db:aplicar` (es idempotente: actualiza, no duplica).

### Pendientes que dejó la Fase 2 (revisar con el cliente)

- [ ] **Aprobar los cuatro documentos legales.** Están publicados como
      **borradores** (`src/lib/legal.ts`): privacidad, términos, tratamiento de
      datos (Ley 1581 de 2012) y cancelación. Las cifras de la política de
      cancelación —15 / 7 días, 100 % / 50 % / sin reembolso— son una
      **propuesta nuestra**, no una decisión del cliente. Falta también la
      razón social y el NIT, hoy sustituidos por el RNT.
- [ ] **¿Cuántas cabañas son?** El FAQ del sitio actual dice 6; el catálogo,
      5. Se publicó la respuesta sin la cifra.
- [ ] **Toallas con marca "Finca Villarreal"** en las fotos oficiales de la
      Cabaña 01, la Cabaña 05 y la zona húmeda (`cabana-1-06`, `cabana-2-08`,
      `cabana-4-03`, `cabana-5-07`, `lugar/zona-humeda-la-finca-24`,
      `galeria/49`). Puede ser un nombre anterior o una propiedad hermana:
      confirmar antes del lanzamiento. Ninguna de esas fotos se usa como
      portada.
- [ ] **Descripciones de las cabañas**: redactadas a partir de las fotos
      oficiales, describiendo solo lo que se ve. Pendientes de validación.
- [ ] **Fotos en alta calidad.** Diez de las 31 de la galería vienen del
      WordPress a 225×300 px y se ven blandas; la pieza de COP16 mide 601×340.
      Falta además un recorte 1200×630 dedicado para la tarjeta social.
- [ ] **Precio de "Picnic en el bosque" y "Velada romántica".** Hoy se muestran
      sin tarifa, con un "consultar". Cuando el cliente los confirme, pasan a
      la tabla `extras` y se vacía `experiencias.adicionales` del CMS.
- [ ] **Horas de check-in/check-out** (`SITIO.estadia`): hoy 15:00 / 12:00, que
      es lo habitual del sector, no un dato del hotel. Aparecen en los términos
      y en los datos estructurados.
- [ ] **`NEXT_PUBLIC_SITE_URL` en Vercel.** Sin ella, el sitio publicado se
      declara canónico en `localhost` (canónicas, OpenGraph, sitemap y robots).
- [ ] Correo de contacto: mientras no exista, `/contacto` no lleva formulario.
- [ ] Licencia de la fuente "Intro" (ver `src/lib/fuentes.ts`).
- [ ] Redirecciones 301 desde las URLs del WordPress actual (`/services`,
      `/about-us`, `/contact`) — van en `next.config.ts` en la fase de SEO.

### Pendientes de contenido y credenciales (de fases anteriores)

- [ ] Logo oficial y manual de marca (provisional: Instagram).
- [ ] Qué cabañas tienen jacuzzi privado (hoy asignado provisionalmente a la 01 y la 02).
- [ ] Descripciones reales de cada cabaña.
- [ ] Fotos y videos en alta calidad (Drive del cliente).
- [ ] Tarifas confirmadas por cabaña × plan.
- [ ] Reglas de reserva: mín. noches, cancelación, check-in/out, mascotas, niños.
- [ ] Razón social y NIT.
- [ ] Correo emisor de confirmaciones + cuenta Resend.
- [ ] Usuarios del panel (nombres y correos).
- [ ] Accesos: Hostinger (dominio), Google Business, Analytics.
- [ ] Cuenta Wompi (documentos, llaves sandbox/producción).
- [ ] Decisión: pago total vs anticipo.
