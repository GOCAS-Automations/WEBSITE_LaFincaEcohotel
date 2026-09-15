# Memoria del proyecto — La Finca Eco Hotel

> Bitácora viva. Cada sesión de trabajo relevante se registra aquí: qué se hizo, decisiones y pendientes.
> Fechas en formato AAAA-MM-DD.

## Estado general

- **Fase actual:** 3 (motor de reservas). Fases 0, 1, **2 (sitio público)** y
  **5 (panel administrativo)** completadas el 2026-09-02. El **rediseño con los
  datos y las fotos reales del cliente** se completó el 2026-09-11, y la
  **segunda ronda de ajustes de Cesar**, el 2026-09-14. Ese mismo día, una
  **tercera ronda** (Instagram en la portada, la COP16 en Conócenos, heros a
  calidad 90) y una **cuarta**: el motor de precios noche a noche, el sitio sin
  el optimizador de imágenes de Vercel, la auditoría responsive y los logos
  oficiales del diseñador.
- Del motor de reservas ya existe la parte que no depende de la base: el
  calendario de festivos de Colombia, la regla plan ↔ noches y el calendario
  propio que apaga los días que el plan no cubre. Falta la disponibilidad real.
- **Decisión de alcance:** primero todo el sitio + panel administrativo; motor de reservas y pagos (Wompi) después.
- **Repo remoto:** https://github.com/GOCAS-Automations/WEBSITE_LaFincaEcohotel.git (push pendiente de confirmación de Cesar; luego se conecta a Vercel).
- ⚠️ **Existe un usuario temporal de pruebas del panel**
  (`panel@lafincaecohotel.com`). Se creó con la Admin API de Supabase solo para
  verificar el panel de punta a punta. **Hay que rotarlo o borrarlo al
  entregar**, y crear las cuentas reales del equipo del hotel.

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
| 2026-09-02 | **Tipografía:** "Intro" (la del sitio actual) es comercial y su licencia está pendiente. Se sustituye por **Manrope**, vía `next/font`. El cambio a Intro está preparado en un solo archivo: `src/lib/fuentes.ts`. |
| 2026-09-11 | **Una sola familia tipográfica**, como en el manual: Manrope también en el cuerpo (antes Inter). Menos peso y más fiel al sistema real de la marca. |
| 2026-09-02 | **Paleta:** el tono 600 de cada familia ES el color de marca sin retocar; el resto de la escala se generó alrededor. Fondo crema `#fefbf7`, nunca blanco puro. |
| 2026-09-11 | **La paleta oficial son TRES colores** (manual, pp. 8–9): petróleo `#027570`, oliva `#5E6033` y verde claro `#E8F4D9` (familia `brote`). El **dorado `#9f6301` se retiró del sitio público** —venía del WordPress viejo, no del manual— y queda definido solo para el panel. |
| 2026-09-11 | **El seed de contenido se genera desde el código** (`npm run seed:contenido`). Dos copias del mismo texto siempre divergen: ya había pasado con el horario del restaurante. |
| 2026-09-11 | **El patrón de colibríes es un PNG horneado, no una máscara CSS.** Con `mask-image` por duplicado costaba 3,6 s de Style & Layout en la portada (Lighthouse 42). Con el mosaico de fondo, 275 ms (Lighthouse 96). |
| 2026-09-14 | **Ninguna foto de menos de 1440 px de ancho puede ser un hero.** `next/image` no amplía (`withoutEnlargement: true`), así que el archivo llega a su tamaño real y es el NAVEGADOR el que lo estira. Tres cabeceras usaban fotos de 1086 y 941 px: por eso se veían borrosas. |
| 2026-09-14 | **Los heros salen de `drive/`, no de `web/`.** `web/` ya viene a calidad 82; volver a comprimir encima con `next/image` eran tres generaciones de pérdida. Las variantes de `web/heroes/` se cortan del original a 90 y se sirven a 90. |
| 2026-09-14 | **La COP16 se va de la portada a `/conocenos`,** y su clave del CMS se renombra con ella (`home.reconocimiento` → `conocenos.reconocimiento`). Un prefijo `home.` en un bloque que se pinta en otra página es una pista falsa. |
| 2026-09-14 | **El reel de Instagram se embebe con un `<iframe>` propio, no con `embed.js`,** y no se carga hasta que alguien lo pulsa. Cero peticiones a Meta al abrir la portada, y el marco lleva su proporción fija desde el primer pintado para que al pulsar no se mueva nada. |
| 2026-09-14 | **Las fotos de la tira de Instagram son del bucket, no del perfil.** Un widget real exige una app de Meta y un token que caduca cada sesenta días; el día que caduque, la portada del hotel se queda con un hueco. |
| 2026-09-14 | **`IMAGENES_SIN_OPTIMIZAR=1` apaga la optimización de imágenes sin tocar código.** Cuando se agota la cuota de Vercel, Image Optimization no degrada: devuelve un error y el sitio se queda sin fotos. |
| 2026-09-14 | **El sello de marca de las fotos está en las 53, y no se corta.** Ninguna forma del sitio toca la esquina superior derecha; donde el contenedor recorta se ancla con `object-position: right top`; y el hero de la portada usa variantes recortadas SIN sello. Ver `ZONA_FLAG` en `src/lib/fotos.ts`. |
| 2026-09-14 | **El corte orgánico se dibuja ENCIMA de la sección con foto, no antes de ella.** Rellenarlo con el color del vecino recorta la propia imagen; dibujarlo en la sección anterior dejaba una franja de color plano y, debajo, el borde recto de la fotografía. |
| 2026-09-14 | **El plan es una CONSECUENCIA de la noche, no una elección.** Cada noche se cobra con la tarifa de su fecha y las estadías mixtas se desglosan. La versión anterior prohibía las mixtas y apagaba días del calendario según el plan: plan y fechas se bloqueaban entre sí, que es el fallo que reportó Cesar. **Ninguna combinación de fechas está prohibida.** |
| 2026-09-14 | **El sitio se publica SIN transformaciones de imagen.** Cuando se agota la cuota de Vercel, Image Optimization no degrada: devuelve un error y la portada se queda con los huecos vacíos. `images.unoptimized` pasa a estar encendido por defecto y el `srcset` —y el AVIF, que también se perdía— los generamos en el despliegue (`npm run imagenes:variantes` + `<Foto>`). |
| 2026-09-14 | **`priority` de `next/image` emitía un `<link rel="preload">`,** y al escribir `<Foto>` se perdió sin que nada lo delatara: el LCP de la portada subió de 2,7 s a 4,1 s. Cualquier reemplazo de `next/image` tiene que emitirlo. |
| 2026-09-14 | **Chrome descarga una imagen en `display: none` si no es perezosa.** Dos `<img>` con `hidden`/`sm:block` no son dirección de arte: son dos descargas. Se hace con `<picture>` y `media`, que el navegador evalúa ANTES de pedir. |
| 2026-09-14 | **Un `sizes` que miente no ahorra peso: produce fotos blandas.** El de la galería decía `48vw` donde la mampostería pinta a `92vw` y el navegador elegía una variante de 480 px para estirarla a 654. |
| 2026-09-14 | **`metadata.icons` escrito a mano GANA a los iconos que Next descubre por convención.** El bloque del layout apuntaba al isotipo provisional de Instagram y seguía publicándolo con los archivos oficiales al lado sin usar. Se quitó. |
| 2026-09-14 | **`npm run build` con `npm run start` vivo produce una hoja de Tailwind de 2 kB.** El build reescribe `.next` bajo los pies del servidor. Una auditoría entera se corrió contra un sitio sin estilos y dio problemas que no existían. Matar los `node.exe` y borrar `.next` antes de compilar. |
| 2026-09-14 | **La regla plan ↔ noches sale de `planes.dias_aplica`, no del nombre del plan.** El nombre lo edita el cliente desde el panel: una regla escrita contra «Estándar» dejaría de aplicarse en silencio el día que lo renombre. |
| 2026-09-14 | **Los festivos se CALCULAN, no se copian.** Una tabla escrita a mano caduca cada 31 de diciembre. Y no siempre son 18: hay años de 17 (2025, 2030, 2038, 2041, 2052, 2057), cuando dos celebraciones caen en el mismo lunes. |
| 2026-09-14 | **El video de una sección nunca lleva `autoplay` a secas.** `autoplay` gana a `preload="metadata"` y descarga el clip entero en la carga inicial. Se arranca con `IntersectionObserver` (`VideoSeccion`). |
| 2026-09-11 | **Las fotos publicadas viven en `web/`, recortadas**, sin la franja de check-in que traen los archivos del Drive. Los originales intactos se conservan en `drive/` y la limpieza del bucket los protege. |
| 2026-09-02 | **Los textos legales viven en código** (`src/lib/legal.ts`), no en el CMS: son documentos jurídicos y deben versionarse con fecha de revisión (`LEGAL_ACTUALIZADO`), no editarse sin historial desde un panel. |
| 2026-09-02 | **La página de contacto no lleva formulario.** El hotel no tiene hoy un buzón de correo publicado ni un destino verificado; un formulario que no llega a nadie es peor que no tenerlo. Se añade cuando el cliente confirme el correo. |
| 2026-09-02 | **Los testimonios se publican sin foto.** Las tres imágenes `sitio/testimonios/*` del bucket son retratos genéricos de archivo que no corresponden a las personas citadas. Se muestran las iniciales. |
| 2026-09-02 | El FAQ del sitio actual decía "6 cabañas" mientras el catálogo publica 5. Se reescribió la respuesta sin la cifra para que el sitio no se contradiga. **Pendiente de confirmar el número real.** |
| 2026-09-02 | `/reservar` lee `?cabana=` y `?plan=` desde el CLIENTE (dentro de un `<Suspense>`). Leerlos en el servidor habría vuelto dinámica la ruta y se habría perdido el prerenderizado. |
| 2026-09-02 | **El `matcher` del middleware cubre solo `/admin`.** El sitio público no puede pagar el costo de leer cookies: perdería el prerenderizado y el ISR de sus 18 rutas. |
| 2026-09-02 | **El panel guarda "la cabaña" completa en un solo formulario**, aunque en la base viva en tres tablas (`alojamientos`, `imagenes`, `tarifas`). Para el cliente es una sola cosa; partirlo en tres pantallas sería fiel al esquema y ajeno a cómo piensa quien lo usa. La galería se reescribe entera en cada guardado (borrar + insertar en orden): las filas de `imagenes` cambian de `id`, pero conservan URL, texto alternativo y orden. |
| 2026-09-02 | **El valor del alojamiento de una reserva se autocalcula pero queda editable.** En la práctica se pacta un descuento o un festivo distinto, y un panel que no deje escribir el número real obliga a mentirle a la base. El TOTAL, en cambio, nunca se escribe a mano: es alojamiento + extras. |
| 2026-09-02 | **El código de reserva (`LF-2026-0001`) se asigna por reintento ante el error 23505**, no leyendo el último y sumando uno: entre la lectura y la escritura cabe otra reserva. Manda el índice único de `reservas.codigo`. |
| 2026-09-02 | **El módulo de contenido tiene un botón de guardar por bloque**, no uno para toda la pantalla. Con un solo formulario gigante, un campo mal puesto en la portada impediría guardar el pie de página. |
| 2026-09-02 | **Los estados `completada` cuentan como ocupados en el panel.** El constraint de la base solo cubre `pendiente`/`confirmada` (lo correcto: una estadía pasada no debe impedir escribir), pero el calendario y el buscador de choques sí las muestran, para no ofrecer como libre una noche que sí se usó. |
| 2026-09-02 | **La paleta se AMPLÍA, no se retoca.** Se añadieron dos familias nuevas (`bosque` y `niebla`) y no se cambió ni un tono de `petroleo`, `oliva`, `dorado` ni `crema`: esas cuatro las usa también el panel administrativo, y moverlas lo habría teñido entero. Verificado con `git diff`: cero cambios en los tokens viejos. |
| 2026-09-02 | **La atmósfera (neblina, colibríes, motas) es CSS y SVG puros.** Ni una librería nueva, ni un `requestAnimationFrame`: solo `transform` y `opacity`, que resuelve el compositor. Todo `aria-hidden` + `pointer-events: none`, y `prefers-reduced-motion` lo **apaga** (`animation: none`), no lo acelera. |
| 2026-09-02 | **Sin `will-change` en las capas de atmósfera.** La portada tiene 15 capas de bruma y 10 motas; declarar `will-change` en las 25 habría reservado 25 capas de composición permanentes en la GPU. Una animación de `transform` que ya corre la promueve el navegador sola. |
| 2026-09-02 | **La bruma va DEBAJO del degradado en heros y cierres.** Encima, su `mix-blend-screen` aclaraba justo la franja del titular y hundía el contraste por debajo de 4.5:1. Debajo, aclara la foto y el degradado la oscurece a ella también. |
| 2026-09-02 | **En fondo oscuro sólido, el botón `claro` (cristal blanco al 15 %) NO sirve:** se lee como deshabilitado. Se añadieron las variantes `crema` (relleno, ~10:1) y `contornoClaro`. El petróleo tampoco vale sobre `bosque-900`: 2,2:1, por debajo del 3:1 que pide la norma para el contorno de un control. |
| 2026-09-02 | **La galería NO añade un campo `destacada`.** El editor del panel guarda solo `url` y `alt`, así que una clave extra se perdería en el primer guardado. Qué foto sale grande lo decide su **posición** dentro de la página, documentado en `docs/CMS_CLAVES.md`. |
| 2026-09-02 | **La página de la galería vive en el estado del componente, no en la URL.** Meterla en la dirección obligaba a `useSearchParams` y a otro `<Suspense>` a cambio de nada: nadie comparte "la página 3 de la galería". |

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

### 2026-09-02 — Fase 5 (panel administrativo) — completada

**Autenticación en tres capas** (patrón portado de La Maima).

1. `src/middleware.ts` con `matcher` de `/admin` y `/admin/:path*` únicamente.
   `actualizarSesion()` (`src/lib/supabase/middleware.ts`) refresca las cookies
   y resuelve al usuario con **`getUser()`**, que valida el JWT contra el
   servidor de Auth; `getSession()` solo lee la cookie y no sirve para decidir.
   `destinoAdminSeguro()` filtra el `?next=`: solo rutas que empiecen por
   `/admin`, y rechaza `//host` y `/\host` (anti open-redirect).
2. `requireAdmin()` (`src/lib/admin/auth.ts`) en el layout del panel, en **cada
   página y en cada Server Action**. El middleware es conveniencia de
   navegación, no frontera: una Server Action se invoca por POST directo.
3. RLS como última palabra. El panel usa siempre el cliente con la sesión del
   administrador; `service_role` **solo** en la limpieza de huérfanos de
   Storage.

Login en `/admin/login` con `signInWithPassword`, sin registro público y sin
revelar si un correo existe. `/admin` entero marcado `noindex`.

**Fundamentos (`src/lib/admin/`).** `tipos.ts` (EstadoAccion + etiquetas en
español de estados y orígenes), `validacion.ts` (validadores que devuelven
mensajes en español; `enteroRequerido` limpia `.`, `$` y espacios, así que
"450.000" es válido; `ejecutarAccion()` convierte los errores de validación en
banner y **re-lanza las señales de Next** —digest `NEXT_REDIRECT` /
`NEXT_NOT_FOUND`—, sin lo cual un `redirect()` dentro de un `try` deja de
funcionar; traducción de 23505 / 23503 / 23P01), `fechas.ts` (aritmética sobre
texto ISO, sin husos horarios; rejilla de mes; `daterange`), `revalidar.ts`,
`disponibilidad.ts` (explica los choques en español en vez de mostrar el
23P01), `codigo-reserva.ts`, `limpieza-storage.ts`, `datos.ts`, `slug.ts`.

**Componentes (`src/components/admin/`).** `ui.tsx` con los tokens del sitio
(crema, petróleo, radios de 12–24 px), `FormularioAccion` (useActionState +
banner), `BotonEnviar` (useFormStatus + confirmación), `Aviso` (`?ok=`/`?error=`),
`Chips`, `CampoImagen`, `EditorGaleria`, `EditorLista` (fichas repetibles del
CMS) y `SelectorArchivo` (botón propio en español: el nativo lo rotula el
navegador y decía "Choose Files").

**Imágenes.** Route handler en `src/app/admin/api/galeria/subir/route.ts`, bajo
`/admin` para que lo cubra el middleware: `getUser()` → 401, MIME en lista
blanca → 415, 10 MB → 413, carpeta validada contra un `Set`, nombre opaco
`carpeta/AAAA-MM-DD-uuid8.ext`, `cacheControl` de un año y `upsert: false`.
Nunca se sobrescribe una foto: cada subida crea una ruta nueva, así que las
direcciones son inmutables. Se puede **subir del dispositivo o pegar una
dirección** (requisito del cliente). `limpieza-storage.ts` borra lo que ya no
referencia nadie —recorre `imagenes`, `extras.imagen_url` y todos los strings
del jsonb de `contenido`—, nunca toca una URL externa y nunca lanza.

**Los módulos.**

- **Reservas** (`/admin/reservas`) — abre en el calendario mensual: filas =
  cabañas, columnas = días, barras continuas por reserva y navegación de mes por
  URL (`?mes=2026-09`), así que es un componente de servidor sin estado que se
  pueda desincronizar. Debajo, listado con filtros por estado. Ficha con
  huésped, plan, extras, totales y pago. Alta manual con validación de
  disponibilidad y cálculo automático del subtotal.
- **Bloqueos** (`/admin/bloqueos`) — crear y quitar por cabaña + rango + motivo,
  visibles en el calendario en gris.
- **Cabañas** (`/admin/alojamientos`) — orden, pausar/mostrar, ficha con
  descripción, comodidades, galería y los tres precios por plan. Borrado
  defensivo: cuenta reservas antes y explica el motivo.
- **Experiencias** y **Adicionales** — la misma pantalla con distinto `tipo`
  de la tabla `extras`.
- **Contenido del sitio** (`/admin/contenido`) — nueve secciones que cubren las
  **18 claves** de `docs/CMS_CLAVES.md`. Cada guardado fusiona sobre el jsonb
  existente (nunca pisa claves que el formulario no muestra), limpia huérfanas
  y revalida las dos cachés.

**Pruebas end-to-end contra la base real** (Chrome por CDP, `npm run dev`):
entrada con el usuario de pruebas y vuelta al destino del `?next=`; alta de una
cabaña con foto subida desde el equipo y su borrado; borrado defensivo
rechazado por tener reservas; edición de un texto del CMS visible en la portada
en el acto; cambio de una comodidad visible en `/alojamientos/[slug]` (la
revalidación del patrón dinámico funciona); alta de una reserva manual con
extras (código `LF-2026-0001`, total correcto), cambio de estado y borrado;
bloqueo rechazado por cruzarse con la reserva —con el mensaje explicando con
qué choca— y bloqueo válido creado y quitado; alta y borrado de un adicional.
**La base quedó como estaba**: 5 alojamientos, 3 planes, 15 tarifas, 2 extras,
35 imágenes, 18 filas de contenido, 0 reservas, 0 bloqueos; y el bucket con sus
91 objetos (la foto de prueba la borró sola la limpieza de huérfanas).

**Revisión visual a 1440 px y 390 px.** Se corrigieron tres cosas: las noches
seguidas de una reserva se pintaban como cuadritos sueltos en vez de una barra;
en el celular los botones de las listas se montaban sobre el texto; y el campo
de orden se estiraba a todo el ancho (`CLASE_INPUT` trae `w-full` y una clase de
ancho escrita después no siempre gana: en Tailwind manda el orden del CSS
generado, no el del atributo — el ancho se fija ahora en un contenedor).

**Ojo con `npm run build` mientras corre `npm run dev`:** reescribe `.next` y el
servidor de desarrollo empieza a devolver 500 hasta que se reinicia.

### 2026-09-02 — Módulo de Planes tarifarios (`/admin/planes`)

Cerraba el pendiente de la Fase 5: los tres planes (Entre Semana, Estándar,
Premium) y lo que incluye cada uno solo se editaban por SQL directo. Se añadió
el sexto módulo del panel, siguiendo al pie de la letra el patrón de
`/admin/alojamientos` (el CRUD propio más parecido: su propia tabla, `orden` +
`activo`, sin tipo compartido como `extras`).

**Archivos nuevos.** `src/app/admin/(panel)/planes/{acciones.ts,
formulario-plan.tsx, page.tsx, [id]/page.tsx, nueva/page.tsx}` y
`obtenerPlan()` en `src/lib/admin/datos.ts` (`listarPlanes()` ya existía).
Lista con orden editable en bloque (igual que cabañas) y
mostrar/pausar/borrar por plan; ficha con nombre, descripción, "qué incluye"
(`Chips` sobre `incluye text[]`) y orden. Toda mutación llama a
`revalidarSitioPublico()` — los planes se pintan en la portada, en cada ficha
de cabaña y en `/reservar` (`TarjetaPlan`).

**Borrado defensivo con DOS conteos, no uno.** `tarifas.plan_id` tiene `ON
DELETE CASCADE` hacia `planes`: Postgres NO rechazaría borrar un plan con
precios cargados, sencillamente borraría esas tarifas en silencio. Por eso
`eliminarPlanAction` cuenta a mano tanto `reservas.plan_id` (sí bloquea en la
base, sin cascada) como `tarifas.plan_id` (no bloquea en la base, pero borraría
precios sin avisar) y explica el motivo en español en los dos casos,
recomendando pausar en vez de borrar.

**Un plan nuevo nace sin tarifas.** A propósito: asignar precio es una
decisión por cabaña, no algo que el alta de un plan deba inventar. El
formulario de alta muestra un aviso fijo explicándolo, y al crear el plan la
redirección a su ficha trae además un `?ok=` recordando entrar a cada cabaña a
ponerle precio.

Se añadió a `NAV_PANEL` (icono nuevo `capas`, entre Cabañas y Experiencias) y
al resumen de `/admin` (atajo "Planes tarifarios" junto a Cabañas, Bloqueos y
Contenido del sitio).

**Verificación.** `tsc --noEmit`, `npm run lint` y `npm run build` limpios.
Prueba de punta a punta contra la base real: Playwright headless (Chromium por
CDP) contra `npm run dev`, con sesión iniciada rotando temporalmente la
contraseña del usuario de pruebas del panel vía Admin API (no se conocía la
existente) y rotándola de nuevo a un valor aleatorio al terminar. Se editó la
descripción del plan Estándar, se confirmó el banner de éxito, se comprobó que
el texto de prueba aparecía en la portada pública, se revirtió al texto
original, se guardó de nuevo y se confirmó que la portada volvía a mostrar el
texto original. **La base quedó exactamente como estaba**: 3 planes (mismo
`orden` y misma descripción), 15 tarifas, 0 reservas, 5 alojamientos.

### 2026-09-02 — Evolución de diseño del sitio público

**Por qué.** Cesar revisó el sitio terminado y dio la retroalimentación clave:
funcionaba, pero había quedado *"muy cuadriculado, seguimos mucho el estilo de
La Maima"* —que era referencia **funcional**, nunca de diseño—. Faltaba lo que
hace único a este cliente: un ecohotel de montaña entre neblina, bosque y aves.
Esta sesión no toca lógica de negocio ni el panel: es dirección de arte.

**1. Paleta: de cuatro familias a seis.** Se añadieron `bosque` (verdes
profundos de bosque de niebla, 50→950) y `niebla` (grises verdosos). Las cuatro
originales quedaron intactas —lo usa el panel—. El sitio ahora **alterna
claro/oscuro**: la sección de planes de la portada y los cierres de todas las
páginas internas caen en `bosque-900`, y el dorado de los precios se lee como
joyería en vez de como una etiqueta más. Las superposiciones sobre fotografía
pasaron de gris neutro a verde bosque, que es lo que ata las fotos a la paleta.

**2. Atmósfera (`src/components/sitio/atmosfera.tsx`).** Cuatro piezas, todas de
servidor, todas decorativas:

- **`<Neblina>`** — tres elipses difusas a la deriva (54 s, 41 s y 67 s, con
  desfases negativos para que nunca vuelvan a sincronizarse). El difuminado sale
  del propio `radial-gradient`, no de un `filter: blur()`. Tres tonos: `clara`
  (sobre foto oscura), `bosque` (dentro del verde) y `verde` (sobre crema, donde
  el blanco sería invisible). Está en: los dos heros de la portada, todas las
  cabeceras de páginas internas, la sección de planes, naturaleza, testimonios,
  galería, experiencias, preguntas, contacto, el lugar y los cierres.
- **`<Colibri>`** — silueta de línea fina (cuerpo cerrado, pico largo, dos alas
  barridas y cola ahorquillada), en **tres sitios escogidos**: el hero de la
  portada, el borde de la sección de experiencias y `/el-lugar`. Flota 11–15 s
  sin trayectoria evidente; las alas "respiran" cada 3,6 s en vez de aletear
  —a los 50 golpes por segundo reales solo se vería un parpadeo desagradable—.
  Se dibujó y se corrigió mirando capturas: la primera versión parecía una
  golondrina gorda y la segunda un pez volador.
- **`<Motas>`** — cinco puntos de polen subiendo muy despacio. **Solo sobre
  fondo oscuro**: sobre crema no se ven, y subirles la opacidad para que se vean
  parece suciedad en la pantalla.
- **`<DivisorOrganico>`** — laderas y bancos de niebla entre secciones, con tres
  perfiles (`cresta`, `loma`, `bruma`). No son ondas seno: los puntos de control
  están descolocados a propósito para que no se lean como las "waves" de
  plantilla.

**3. Reservar, más protagonista.**

- El botón del nav pasó de `pequeno` a un tamaño propio (`nav`) y la barra
  creció de 64 a 72/80 px para que quepa sin apretar.
- **`<ModuloReserva>` en la portada**: cabaña (con "Cualquier cabaña" primero y
  por defecto), llegada, salida y botón. **Cabalga sobre el borde del hero**, que
  es a la vez el gesto que rompe la rejilla y lo que pone la acción en el primer
  visor. Es un `<form action="/reservar" method="get">` de verdad —funciona sin
  JavaScript— y con JavaScript se intercepta para omitir parámetros vacíos,
  avisar de un rango imposible y caer en el ancla del selector.
- **`/reservar` lee `?entrada=` y `?salida=`** además de `?cabana=` y `?plan=`,
  desde el cliente dentro del `<Suspense>` existente: **la ruta sigue estática**.
  Las fechas de la dirección se validan (formato real, no anterior a hoy, salida
  posterior a la llegada); lo que no pasa el filtro se ignora en silencio. El
  resumen muestra ahora llegada y salida en formato legible y ya iban en el
  mensaje de WhatsApp.

**4. Composición menos cuadriculada.** Divisores orgánicos entre secciones; el
módulo de reserva superpuesto al hero; foto en arco de medio punto en la
presentación; radios asimétricos en tarjetas de plan, experiencias, testimonios,
instalaciones y pasos; la foto de COP16 **sangra** fuera del contenedor por la
izquierda en escritorio; y las tarjetas de cabaña van escalonadas.

⚠️ **El escalón tenía una trampa:** una tarjeta con `h-full` **más** un margen
superior se sale de su celda por el alto del margen (en CSS Grid `height: 100%`
se resuelve contra el área de la celda y el margen se suma encima). El botón de
abajo se montaba sobre la tarjeta. Se compensa con `lg:pb-10` / `lg:pb-12` en la
lista.

**5. Galería rediseñada.** Mosaico editorial de **12 fotos por página** con
piezas de tamaños distintos y paginación. El patrón de doce **tesela exacto** en
los tres anchos (2 columnas = 8 filas, 3 = 6 filas, 4 = 6 filas), y la última
página —que casi nunca viene llena— usa un reparto calculado que también llena
todas las filas. El visor recorre **las 31 fotos**, no la página: al pasar de la
24 a la 25 la cuadrícula de atrás cambia sola de página y, al cerrar, el foco
vuelve a la miniatura correcta (probado). Sin campo nuevo en el CMS.

**6. WhatsApp flotante:** solo el ícono, sin la palabra "Escríbenos". El
`aria-label` en español se conserva.

**Verificación.** `tsc --noEmit`, `npm run lint` y `npm run build` limpios. **Las
18 rutas públicas siguen estáticas/SSG con ISR de una hora**; ninguna cayó a
render dinámico. Revisión visual real por CDP (Chrome, Playwright) a **1440 px y
390 px** de portada, listado, ficha, galería (las tres páginas), `/reservar` con
y sin parámetros, experiencias, el lugar, preguntas y contacto — **tres pasadas**
con corrección entre ellas. `prefers-reduced-motion` emulado y comprobado por
estilo calculado: todas las animaciones ambientales quedan en `animation: none`
y nada desaparece. **El panel no se rompió**: `/admin` no importa ni uno de los
componentes tocados y los siete tokens que usa resuelven a los mismos valores.

**Lo que se corrigió tras mirar las capturas** (y no antes): la bruma no se veía
en absoluto con las opacidades iniciales; luego, ya visible, lavaba el titular
del hero y hubo que meterla debajo del degradado; el colibrí necesitó tres
versiones; el botón de la tarjeta de plan destacada parecía deshabilitado; había
seis colibríes repartidos por el sitio y se bajaron a tres; y la última página de
la galería dejaba un agujero de tres celdas.

**Pendientes que deja esta sesión:** ver la lista de más abajo (fotos en alta
calidad y el recorte social siguen siendo el techo real de lo que se puede
lograr visualmente).

### 2026-09-02 — Pulido: FAB de WhatsApp sobre el módulo de reserva + revisión del panel con sesión

**1. El FAB tapaba el módulo de reserva en móvil.** El botón flotante ya se
apartaba del pie de página con un `IntersectionObserver`; se generalizó el
mismo patrón en `boton-whatsapp.tsx` para que observe **cualquier** elemento
marcado `data-fab-evitar` (no solo el `<footer>`) y se oculte mientras
cualquiera de ellos esté en el viewport. Se marcó el `<form>` de
`ModuloReserva` (portada) y, al verificar `/reservar`, se encontró el mismo
problema: quien llega por el ancla `#solicitud` (como hace el módulo de la
portada) aterriza con el FAB tapando el bloque de fechas de
`SelectorReserva`, así que se marcó también su columna de campos
(cabaña/plan/fechas, sin incluir el resumen). `prefers-reduced-motion` no
necesitó cambios: la regla global ya deja `transition-duration` en ~0 para
todo el sitio, así que el ocultamiento se mantiene sin animación.

Verificado por CDP (Playwright/Chromium headless contra `npm run dev`) a
390 px: el FAB queda `opacity:0` + `pointer-events:none` mientras el módulo
de la portada está en el fold inicial (se monta ahí por el `-mt-20` que lo
monta sobre el hero) y mientras la sección de fechas de `/reservar` está en
pantalla al llegar desde la portada; reaparece al alejarse de ambos y sigue
apartándose del pie. Comprobado también a 1440 px (mismo comportamiento,
inofensivo) y con `reducedMotion: reduce` emulado (oculta sin transición).

**2. Revisión visual del panel con sesión iniciada.** Con el usuario de
pruebas del panel, se recorrieron por CDP a 1440 px y 390 px: resumen,
reservas (calendario), cabañas (lista + ficha de la Cabaña 01), planes,
experiencias, adicionales y contenido. **Sin regresiones.** Confirma lo que
decía la sesión de diseño: el panel sigue usando solo `petroleo`/`crema`
(y `dorado` en algún acento), ninguno tocado por las familias nuevas
`bosque`/`niebla`. No se modificó ningún archivo del panel. No se guardó
ningún formulario ni se tocaron datos reales.

**Verificación.** `tsc --noEmit`, `npm run lint` y `npm run build` limpios
(el primer intento de build fell con una violación de acceso en Windows
porque el `npm run dev` anterior había quedado vivo —`TaskStop` no mata el
proceso hijo de `next dev` en Windows, hay que matarlo por PID—; al matar
los `node.exe` sueltos el build corrió limpio). Las rutas públicas siguen
`○`/`●` (estáticas/SSG, ISR de 1h); solo `/admin/*` es `ƒ` (dinámico),
como corresponde a rutas con sesión.

### 2026-09-08 — Documento de requerimientos para el cliente

Se consolidó en `docs/SOLICITUD_REQUERIMIENTOS.md` todo lo que falta pedirle a La
Finca: los pendientes del §12 del plan más los que dejaron las fases 2 y 5. **Se
excluyó a propósito todo lo de pagos** (cuenta Wompi, llaves, decisión de anticipo
vs pago total), por indicación de Cesar.

Son 24 puntos en 6 bloques: marca, fotos y video, accesos, datos legales, tarifas y
reglas, y seis preguntas de contenido. Cada punto lleva prioridad (bloquea la
publicación / antes de entregar / puede esperar) y una casilla de responsable.

Va dirigido a **Juan Camilo Mejía** (arquitecto anterior) para que indique a quién
pedirle cada cosa; los otros contactos son **Camilo** (accesos y Drive) y
**Santiago** (marca). También se publicó como página web compartible, con la misma
información y la asignación de responsable marcable.

### 2026-09-11 — Importadas las fotos oficiales nuevas desde Google Drive

Cesar compartió por Drive las fotos oficiales de las 5 cabañas y las zonas
comunes. Se creó `scripts/importar-fotos-drive.mjs` (fases `descargar` →
`optimizar` → `subir` → `manifiesto`, cada una re-ejecutable) y se corrió de
punta a punta.

- **53 imágenes** descargadas, optimizadas a WebP calidad 82 (máx. 2400 px de
  ancho, sin agrandar) y subidas al bucket `imagenes` bajo el prefijo nuevo
  **`drive/`**: `drive/cabana-01/…` … `drive/cabana-05/…` y
  `drive/zonas-comunes/…`. No se tocó nada de lo ya existente en el bucket.
- Conteo por carpeta: cabaña 1 → 7 (1 portada + 6 fotos), cabaña 2 → 6 (1+5),
  cabaña 3 → 12 (1+11), cabaña 4 → 12 (1+11), cabaña 5 → 7 (1+6), zonas
  comunes → 9 (1+8).
- **Peso:** los originales PNG pesaban 2–3 MB cada uno (dos de zonas comunes,
  22 MB y 20 MB); en WebP quedaron entre 73 KB y 1.5 MB — muy por debajo del
  límite de 10 MB del bucket (verificado por SQL contra `storage.objects`:
  máximo real 1.56 MB, cero objetos sobre el límite).
- **Clasificación foto/ficha:** las 6 imágenes "0. PORTADA …" (una por
  carpeta) son piezas gráficas de marketing —título "Cabaña N", lista "Cuenta
  con:" e iconos de amenidades sobre foto desenfocada— no fotografías. Se
  revisaron visualmente y se marcaron `tipo: "ficha"` en el manifiesto; el
  resto (`1.png` … `11.png`) son fotografías reales (confirmado revisando
  varias de distintas cabañas y de zonas comunes). Las fichas se subieron
  igual, solo quedan marcadas para que la galería del sitio no las mezcle con
  fotos.
- **Manifiesto nuevo:** `supabase/seed/imagenes-manifest-v2.json` (53
  entradas: `ruta_bucket`, `url_publica`, `seccion`, `tipo`, `orden`, `ancho`,
  `alto`, `relacion`, `bytes`, `archivo_original`, `id_drive`). No reemplaza
  a `imagenes-manifest.json` (el de las fotos ya integradas al CMS); queda
  como insumo para cuando se decida incorporar estas fotos a `contenido`/
  `imagenes` del sitio.
- **Verificación:** conteo SQL por carpeta contra `storage.objects` (53/53,
  máx. 1.56 MB) y 3 URLs públicas al azar responden `HTTP 200` con
  `content-type: image/webp` y el tamaño esperado.
- Los 48 IDs de Drive descargaron sin fallos; los dos archivos grandes de
  zonas comunes (>25 MB en Drive) necesitaron el fallback
  `drive.usercontent.google.com` porque Drive devolvía la página de
  confirmación de virus — funcionó a la primera.
- Nuevo script npm: `imagenes:importar-drive`. `sharp` pasó de dependencia
  transitiva de Next a **devDependency explícita** del proyecto.
- **Pendiente:** estas fotos nuevas aún no están conectadas a las páginas del
  sitio (siguen usando el manifiesto y las galerías ya cargadas en el CMS).
  Falta decidir con Cesar si reemplazan la galería actual de cada cabaña o se
  añaden, y si las fichas de portada se usan en alguna parte del sitio o solo
  quedan de referencia.

### 2026-09-11 — Rediseño con datos reales, fotos oficiales e identidad de marca

Sesión larga. Entró por fin el material definitivo del cliente —`docs/DATOS_CLIENTE.md`,
el manual `IV LA FINCA.pdf` y la carpeta `ACTUALIZADAS IMG` del Drive— y el sitio
se rehízo encima de él. Hasta ahora publicaba textos del WordPress viejo, precios
provisionales y fotos de 225×300 px.

#### Identidad: la paleta del manual, y son TRES colores

- **Fuera el dorado `#9f6301` del sitio público.** No está en el manual: salió
  del WordPress. Donde había dorado —precios, antetítulos, comillas de los
  testimonios, el subrayado del menú— ahora hay `brote` (el verde claro oficial
  `#E8F4D9`, familia nueva) sobre oscuro y `oliva`/`petróleo` sobre claro. La
  familia `dorado` sigue definida **solo para el panel `/admin`**.
- **Una sola tipografía.** El cuerpo iba en Inter y los titulares en Manrope.
  El manual usa Intro Alt para todo, así que la sustituta también: Manrope
  variable en las dos variables CSS. De paso se fueron 48 kB de fuente en
  prioridad máxima.
- **Fuera las «motas de luz»** (puntitos dorados flotando). No salían de ningún
  sitio y se leían como purpurina. En su lugar entraron las tres texturas que el
  manual sí tiene: el **resplandor** de luz en una esquina, el **patrón de
  colibríes** y la **rama botánica** de línea fina.
- **Fuera el colibrí dibujado a mano en SVG.** A tamaño real y con poca opacidad
  no se leía como un ave sino como un garabato, y no era el ave de la marca. El
  patrón se construye ahora con el PNG oficial del isotipo, sin redibujarlo.

#### Diseño

- **Navegación: cápsula flotante.** Separada de los tres bordes, esquinas de
  píldora, petróleo translúcido con desenfoque, y se compacta al desplazar
  (`capsula-nav.tsx`, el único cliente del encabezado). El rectángulo crema de
  lado a lado le ponía techo de oficina a la fotografía del hero.
- **Hero centrado con el módulo de reserva DENTRO.** Antes el módulo cabalgaba
  entre dos secciones; en el teléfono tapaba el pie del titular. Ahora es una
  columna centrada —antetítulo, titular, frase, módulo— y un enlace secundario
  discreto. El camino a reservar está en el primer visor sin desplazarse.
- **Las cinco cabañas en la portada, alineadas.** Se quitó el escalón de la
  tarjeta del medio: en cuanto una descripción tenía una línea más, se leía como
  un fallo de maquetación. Es un flex con `justify-center`, así que la última
  fila (dos tarjetas) queda centrada bajo las tres de arriba.
- **`/alojamientos` en zigzag**, filas alternas foto/texto con el rasgo
  distintivo de cada cabaña, su descripción entera y su precio. La alternancia va
  por prop explícita, no por `nth-child`: si el cliente desactiva una cabaña
  desde el panel, el ritmo no se rompe.
- **Las secciones oscuras son bosque de verdad**: fotografía de zonas comunes
  bajo un velo de petróleo al 92 %, con bruma a la deriva, resplandor y patrón
  encima (`FondoBosque`). Antes eran un verde plano. La foto se edita desde el
  panel (`home.planes.imagen_fondo`) y cambia a la vez la portada y el cierre de
  todas las páginas internas.
- **Galería en mampostería**, respetando la proporción original de cada foto.
  La rejilla de doce casillas anterior imponía su proporción con `object-cover`
  y se comía media imagen. Doce por página, sin una sola foto repetida (las
  gemelas 03 y 04 comparten escenas: en la galería general entra solo una).

#### Contenido: todo desde `docs/DATOS_CLIENTE.md`

- **Precios reales**: Entre Semana $350.000 / $200.000 una persona (lun–jue),
  Estándar $480.000 y Premium $680.000 (vie–dom y festivos), y el nuevo **Día de
  Calma** $250.000 (10 a. m. – 5 p. m., sin hospedaje). Nunca la palabra
  «pasadía».
- **Las cinco cabañas** con su rasgo distintivo real, amenidades y la regla de
  que la **02 solo se ofrece con el plan Estándar**.
- **Experiencias**: se borraron «Picnic en el bosque» y «Velada romántica» (no
  existen); entraron Fondue $25.000 y segunda mascota $50.000 como adicionales.
- **FAQ reescritas enteras** (17 preguntas). Las viejas tenían tres errores que
  costaban reservas: decían «6 cabañas», daban el restaurante de 8 a 23 h
  (es de 9 a 20 h y solo para huéspedes) y afirmaban que no había pasadía.
- **Políticas reales** en `src/lib/legal.ts`: sin reembolsos, un solo cambio de
  fecha con 3 días de anticipación, no-show = incumplimiento, anticipo del 50 %
  y saldo por link, sin datáfono ni efectivo. Check-out a la 1:00 p. m. (no al
  mediodía). **Siguen siendo borradores en la redacción**: las reglas de negocio
  ya son las del hotel, la revisión jurídica la debe aprobar Amapola.
- **Frases de marca literales** del manual en hero y esencia.

#### Fotos

- Las 47 fotos del Drive traían impresa en el pie la línea «Check-in: 3:00 pm |
  Check-out: 1:00 pm | www.lafincaecohotel.com» (vienen de un export de
  Instagram). En el sitio del propio hotel esa franja sobra y aparecía cincuenta
  veces. `npm run imagenes:recortar` genera en `web/` las mismas fotos sin ese
  15 % inferior; **los originales intactos se quedan en `drive/`** y el script de
  limpieza los protege.
- **Tarjeta social dedicada** de 1200×630 (`npm run imagenes:social`), compuesta
  con una foto oficial, el velo de petróleo, el isotipo en blanco y el wordmark.
  Antes se compartía el banner del hero declarado como 1200×630 sin serlo.
- **Limpieza del bucket** (regla 11 de `CLAUDE.md`): `npm run imagenes:limpiar`
  calcula lo referenciado en `contenido`, `imagenes` y `extras`, y borra lo que
  sobra. Se eliminaron **87 objetos (15,1 MB)**: todo el WordPress viejo, las dos
  experiencias retiradas y los retratos de archivo de los testimonios. Quedan
  **105 objetos (27 MB)**: `drive/` (53 originales), `web/` (47 publicadas),
  `sitio/marca/` y `sitio/social/`, más las dos fotos de experiencias que sí se
  usan. Dry-run por defecto; hace falta `--ejecutar`.

#### Reseñas de Google, en vivo

`src/lib/resenas-google.ts` lee la ficha del hotel con **Places API (New)**
(`place_id ChIJeyNhUdivMI4Rk9zjFWJ_Hrk`), cacheada un día, filtra ≥4★ y ordena
por fecha. Hoy: **4,7 ★ con 50 calificaciones** y 5 reseñas con foto, enlace al
perfil y la atribución que exigen los términos de Google. Si falla la API o falta
la clave, cae a los testimonios del CMS sin romper el build. El `aggregateRating`
del JSON-LD sale de la MISMA lectura, así que nunca promete algo que la página no
muestre.

#### Base de datos y panel (migración 006)

- `planes` gana `tipo` (`hospedaje`|`dia`), `dias_aplica`, `horario` y
  `precio_base`; `tarifas` gana `precio_noche_1_persona`.
- «Planes disponibles por cabaña» = existencia de la fila en `tarifas`. El panel
  tiene un interruptor por cabaña × plan que la crea o la borra.
- El panel edita todo lo nuevo en español claro. Verificado con sesión real.
- **`supabase/seed/002_contenido.sql` ahora se GENERA** (`npm run seed:contenido`)
  desde `RESPALDOS` de `src/lib/contenido.ts`. Eran 600 líneas de JSON
  transcritas a mano y ya habían divergido del código (el horario del
  restaurante). El código es la única fuente; el SQL es un artefacto.

#### Rendimiento

Lighthouse móvil subió de 42 a 96 en la portada. El culpable era el patrón de
colibríes hecho con `mask-image` por duplicado: **3,6 s de Style & Layout**.
Enmascarar superficies del tamaño de una sección hay que componerlo en cada
pintado. Ahora el tresbolillo va horneado en un PNG (`npm run marca:patron`) y se
repite como fondo. También se quitó `mix-blend-mode` del resplandor, se unificó
la tipografía y se dejó de preargar la foto de hero que el móvil no ve.

**Lighthouse móvil final:** portada 96 · ficha de cabaña 95 · galería 95 ·
alojamientos 95. Accesibilidad **100** en las cuatro, buenas prácticas 100,
SEO 100. (Escritorio: portada 97.)

#### Decisiones que conviene recordar

| Tema | Decisión |
|---|---|
| Watermark de las fotos | Se recorta el 15 % inferior en `web/`; los originales se conservan en `drive/`. La pegatina circular del logo en la esquina superior SÍ se conserva: es la marca del hotel y queda bien. |
| Galería general | Se arma a mano y no concatenando las cinco galerías: las cabañas 03 y 04 son gemelas y compartían escenas idénticas con distinta URL. |
| Portada de la cabaña 01 | La habitación, no el jacuzzi: la foto del jacuzzi de la 01 y la de la 02 son casi idénticas y juntas parecían la misma cabaña repetida. |
| `crema-600` | Se oscureció de `#7d7060` a `#726555`: el texto secundario no llegaba a 4,5:1 sobre niebla ni sobre el verde claro de marca. |
| Cápsula de navegación | 78 % de opacidad, no 55 %: al 55 % se veía preciosa sobre el hero y perdía contraste sobre las páginas que abren en blanco. |
| `aria-label` en los logos | Retirados. El nombre accesible sustituye al texto visible y no coincidía con él, así que la navegación por voz no encontraba el enlace. |

#### Pendientes que deja esta sesión

- [ ] **Pedir al cliente fotos SIN la franja de check-in**, o confirmar que el
      recorte del 15 % le parece bien. Hoy publicamos su material recortado.
- [ ] **Aprobación de los textos legales por Amapola.** Las reglas ya son las
      suyas; la redacción es nuestra.
- [ ] `GOOGLE_PLACES_API_KEY` hay que añadirla al proyecto de **Vercel**: en
      local está en `.env.local`, pero sin ella en producción las reseñas caen al
      respaldo del CMS.
- [ ] **El Día de Calma no encaja en el modelo de reservas.** `reservas.estancia`
      es un `daterange` por cabaña; un plan de día no ocupa ninguna. Hoy el panel
      obliga a poner cabaña y rango: funciona, pero es una muleta. Decidir cómo
      se modela (¿aforo por día?) antes de vender el plan en línea.
- [ ] **La tarifa de una persona no llega al cálculo del panel:** `mapaDeTarifas`
      solo devuelve `precio_noche`, así que el subtotal sugerido usa el precio de
      dos aunque `num_personas` sea 1.
- [ ] `tarifas.dias_semana` duplica `planes.dias_aplica`. Se mantiene sincronizado
      por el seed; conviene eliminarla en una 007 cuando exista el motor.
- [ ] Sigue abierto: mínimo de noches en fines de semana y festivos; razón social
      y NIT; logo vectorial y licencia de Intro.

#### `TODO` sin respaldo del cliente que se dejaron marcados

Ninguno en el texto publicado: todo lo que se ve en el sitio sale de
`docs/DATOS_CLIENTE.md` o de `docs/CONTENIDO_ACTUAL.md`. Lo no confirmado (mínimo
de noches, NIT, fotos definitivas) está anotado como `TODO` en
`supabase/seed/001_datos_iniciales.sql` y en `src/lib/sitio.ts`, y **no se
publica en ninguna página**.

### 2026-09-14 — Ajustes de la segunda ronda

Cesar revisó el sitio rediseñado y dio diecinueve puntos de detalle fino. Esta
sesión los cierra todos. No es una sesión de arquitectura: es de píxeles, de
reglas de negocio que faltaban y de tres cosas que estaban mal y se veían.

#### El sello de marca de las fotos («flag»)

Las 53 fotos del Drive llevan pegado en el **borde superior derecho** un sello
blanco con el isotipo y el wordmark. Se midió una por una
(`npm run imagenes:flag`) y se anotó en los dos manifiestos un campo `flag` con
su caja. **Están TODAS**: no existía la opción de «elegir una foto sin sello».
La caja, en fracciones del archivo publicado, va de `x = 0,71` a `x = 1` y de
`y = 0` a `y = 0,22`; `ZONA_FLAG` en `src/lib/fotos.ts` la redondea hacia fuera.

El sello no molesta; lo que molestaba era **cortarlo**. Tres reglas:

1. **Ninguna forma toca la esquina superior derecha.** El arco de «Bienvenidos»
   (`rounded-t-[13rem]`) partía el logo por la mitad: ahora la curva grande abre
   arriba a la IZQUIERDA y se responde con otra abajo a la derecha. Lo mismo en
   la tercera foto de «Nuestra esencia», que tenía `rounded-tr-[4rem]`.
2. **`object-position: right top`** (`CLASE_FOTO_CON_FLAG`) donde el contenedor
   recorta: así la esquina se ve entera o no se ve, nunca a medias.
3. **El hero de la portada va sin sello.** Es la única superficie donde la foto
   se ve a pantalla completa, a dos dedos del logotipo real de la barra, y ahí
   el sello se leía como una marca de agua de banco de imágenes. Se conserva la
   misma foto y se cambia el ENCUADRE (`npm run imagenes:hero`): en escritorio
   se va la franja superior y queda un panorámico 2400×1180 con el techo, las
   jardineras, el bebedero de colibríes y el valle; en móvil no se puede
   recortar por arriba —el techo de guadua ES la foto— así que se va la franja
   derecha y queda un vertical 1750×2720.

**Portada de la Cabaña 04.** Era la única de las cinco sin sello a la vista: su
foto de portada era vertical y, metida en la caja 16/10 de la tarjeta y del
zigzag, perdía justo esa franja. Ahora abre con su rincón de café, que es
apaisada como las otras cuatro. De paso deja de abrir con el mismo balcón con
hamaca que su gemela, la 03.

#### Mapa de uso de las fotos

La ducha del bosque (`zonas-comunes/04`) salía en **cinco** sitios. Ahora en
dos. El reparto quedó así:

| Foto | Dónde estaba | Dónde está |
|---|---|---|
| `zonas-comunes/02` corredor | hero escritorio + galería | galería (el hero usa su variante sin sello) |
| `zonas-comunes/01` deck techado | hero móvil + hero de Contacto + galería | «Nuestra esencia» + galería |
| `zonas-comunes/04` ducha | esencia + hero de FAQ + COP16 + Conócenos + galería | Conócenos + galería |
| `zonas-comunes/08` fogata | esencia + Conócenos + galería | **hero de Contacto** + Conócenos + galería |
| `cabana-03/10` comedor del balcón | solo en la ficha de la 03 | + «Nuestra esencia» |
| `cabana-01/03` balcón con hamaca | ficha + galería | + **hero de FAQ** |
| `cabana-04/09` rincón de café | galería | **portada de la Cabaña 04** + galería |

El hero de Contacto era el deck techado y, recortado a una banda de cabecera,
no se veía más que el techo de guadua: una superficie marrón sin nada que
mirar. La fogata de noche cuenta en una imagen para qué se le escribe al hotel.

#### Los cortes entre secciones (el fallo visual que más se notaba)

`DivisorOrganico` dibujaba la onda DENTRO de la sección anterior, rellena con el
color de la siguiente. Con un color plano al otro lado funciona. Con una FOTO
—la sección de planes, todos los cierres— el resultado era el que Cesar
describió: una franja de verde plano con forma de ladera y, pegado a ella, el
borde RECTO de la fotografía.

**`CorteOrganico`** le da la vuelta: la sección con foto empieza donde tiene que
empezar y la onda se dibuja ENCIMA, rellena con el color del vecino. La imagen
queda recortada por la forma y se ve hasta el filo de la onda. Es el mismo
resultado que un `clip-path` sin sus dos costes: no crea un contexto de recorte
que obligue a recomponer la sección en cada pintado, y el alto va en píxeles
fijos en vez de escalar con el alto de la sección (con
`clipPathUnits="objectBoundingBox"` una sección alta se lleva una ola gigante y
una corta, un rizo). Está aplicado en los dos extremos de la sección de planes,
del cierre de la portada y del cierre compartido de las páginas internas —
incluido el corte hacia el pie de página, que antes era una línea recta.

⚠️ **Trampa de Tailwind que costó una captura:** el posicionamiento NO puede ir
en el `className` del divisor. `DivisorOrganico` ya trae `relative` escrito, y
en Tailwind gana la clase que el CSS generado escriba después, no la que se
ponga al final del atributo: `position: relative` se emite después de
`absolute`. Las dos ondas salieron dentro del contenedor de lectura, a media
sección. El `absolute` vive ahora en un envoltorio.

#### Portada

- **Tarjetas de plan compactas.** Con `gap-2.5`, `text-sm` y `leading-relaxed`,
  los ocho puntos de «Entre Semana» estiraban la tarjeta hasta que las cuatro no
  cabían en una pantalla y había que desplazarse para ver el botón de reservar.
  La lista es una enumeración de servicios, no un texto de lectura: se lee mejor
  apretada.
- **La sección COP16 lleva VIDEO**, el mismo clip que el hotel publicaba en esa
  sección de su sitio anterior. Ver más abajo.
- **Las reseñas subieron al tercer lugar**, justo después de «Bienvenidos».
  Estaban al final: quien llega desde Instagram tenía que atravesar la página
  entera antes de encontrar una sola prueba de que el lugar es lo que dice ser.
  La confianza va antes del precio.
- **Reseñas en rejilla alineada.** Eran columnas CSS (`columns-3`) y se leían
  como un mosaico: tarjetas de altos distintos y la última columna a media
  asta. Ahora todas miden lo mismo —texto recortado a cinco líneas, cabecera
  fija, botón abajo— y las cinco se reparten 3 + 2 centradas.
- **«Leer más» en TODAS y de verdad.** Antes era un `<details>` que solo
  aparecía en reseñas de más de 300 caracteres y que, al abrirse, descuadraba la
  fila. Ahora abre un `<dialog>` nativo (`LectorResena`): el foco queda atrapado
  dentro, Escape cierra, al cerrar el foco VUELVE al botón y la tarjeta nunca
  cambia de alto.
- **Se retiró** el aviso «En La Finca no hay datáfono… Muy pronto vas a poder
  reservar y pagar en línea» de `reservar.nota` y del seed. La clave se conserva
  vacía para avisos puntuales del hotel.

#### El video de COP16

Origen: el sitio anterior (WordPress), sección de reconocimiento. H.264
848×480 a 30 fps, 2 min 49 s, 12,1 MB. **No existe versión en 1080p**: el
material es vertical de Instagram reescalado; subirlo a 1080 añadiría peso sin
añadir detalle. Recomprimido con ffmpeg en dos pasadas a 24 fps → **7,5 MB**,
con el audio intacto porque el clip TIENE LOCUCIÓN (es una persona hablando, no
un plano de ambiente). Por eso lleva `controls` aunque arranque silenciado.

Migración **007**: bucket público `videos`, mp4 y webm, 60 MB por archivo. Va
aparte del de imágenes porque su lista blanca de tipos es otra, su límite es
seis veces mayor y la limpieza de huérfanos recorre referencias de fotos.

⚠️ **`autoplay` gana a `preload="metadata"`.** Con el `<video autoplay>` de la
primera versión, el clip se descargaba ENTERO al abrir la portada —3,3 MB, con
el video siete pantallas más abajo— y Lighthouse móvil cayó de 96 a 82.
`VideoSeccion` lo arranca con un `IntersectionObserver` y nace con
`preload="none"`: no pide un byte hasta que se acerca. Respeta
`prefers-reduced-motion` (no arranca solo) y sin JavaScript se ve el póster con
sus controles.

#### Páginas

- **«El lugar» → «Conócenos»** (`/conocenos`), con **301** en `next.config.ts`.
  Actualizados nav, pie, sitemap, migas, JSON-LD, enlaces internos, la clave
  `heroes.listados.el_lugar` → `conocenos` y el panel.
- **El mapa mostraba la carretera a Buenaventura.** La búsqueda era la cadena
  «La Finca Eco Hotel Km 18 vía Cali Buenaventura» y Google leía «vía Cali
  Buenaventura» como un TRAYECTO. El iframe va ahora por coordenadas con
  etiqueta. Ojo: el embed gratuito **no entiende `q=place_id:…`** —se probó y
  devolvía el mapamundi—; eso es del Embed API, que exige clave y facturación.
  De paso se corrigieron las coordenadas de `SITIO.geo`, que eran una
  estimación a mano y caían a más de un kilómetro del hotel; las nuevas salen
  de la propia ficha. Y «Cómo llegar» abre indicaciones **desde Cali**.
- **Galería en filas justificadas.** La mampostería con `columns` no recortaba
  nada pero terminaba en escalera. Ahora cada fila tiene un alto común y los
  anchos salen de la relación de aspecto: `flex-grow: r` + `aspect-ratio: r`
  hace que, por aritmética, todas las de la fila acaben con el mismo alto. Las
  filas se agrupan en `repartirEnFilas()` —de tres en tres, y si sobra UNA se
  rehacen las dos últimas como 2 + 2— en vez de dejar que las corte
  `flex-wrap`, que en la tercera página dejaba una foto estirada a todo el
  ancho y cuatro veces más alta que las de arriba. La galería pasa de 32 a
  **36 fotos**: tres páginas llenas de doce, sin una repetida.
- **Preguntas frecuentes** pasa del crema plano al verde claro de marca
  (`brote-50`), con la rama botánica en dos esquinas y tres colibríes muy
  tenues. Era la página más pobre del sitio.
- **`/reservar`** gana una fotografía junto a los tres pasos, el verde de marca
  y —en el paso del plan— tarjetas con los días en que aplica cada plan, el
  precio, lo que incluye y un enlace a la sección de planes de la portada. Los
  precios ya no dicen «Consultar»: salen del mínimo del catálogo.
- **`/alojamientos`**: el mosaico de colibríes (`PatronColibri`, que repite el
  isotipo cada 320 px) se leía como una cuadrícula de logotipos en una página de
  cinco pantallas. Lo sustituyen **cinco aves colocadas a mano**, sin dos a la
  misma altura ni del mismo tamaño (`ColibriesSueltos`).

#### Ritmo vertical

El aire entre secciones ya lo decidía `ESPACIOS`; el aire DENTRO de una sección
se decidía a ojo: `mt-10`, `mt-12` y `mt-14` para la misma relación. Ahora es
`RITMO` en `seccion.tsx`, tres medidas y ninguna más.

⚠️ **El `<legend>` queda fuera del flujo flex del `<fieldset>`.** Es parte del
borde del fieldset, no un hijo normal, así que el `gap-4` del contenedor no lo
separaba de la primera tarjeta: «1. Elige tu cabaña» quedaba pegado a la Cabaña
01. Cada `legend` lleva ahora su propio `mb-4`.

#### Motor de reservas: la regla plan ↔ noches

**`src/lib/festivos-colombia.ts`** — módulo PURO, sin una importación del
proyecto. Calcula los festivos de Colombia (Ley 51 de 1983, «Ley Emiliani»)
desde el domingo de Pascua por el algoritmo de Butcher: seis fijos, dos de
Semana Santa que no se trasladan y diez que se corren al lunes siguiente si no
caen ya en lunes. Se calcula, no se copia una lista: una tabla escrita a mano
caduca cada 31 de diciembre.

Verificado contra los calendarios oficiales de **2026** (1 y 12 ene, 23 mar,
2 y 3 abr, 1 y 18 may, 8, 15 y 29 jun, 20 jul, 7 y 17 ago, 12 oct, 2 y 16 nov,
8 y 25 dic) y **2027** (1 y 11 ene, 22, 25 y 26 mar, 1 y 10 may, 31 may, 7 jun,
5 y 20 jul, 7 y 16 ago, 18 oct, 1 y 15 nov, 8 y 25 dic), escritos a mano en la
prueba: una prueba que compare la función consigo misma pasa siempre.

**Hallazgo:** no siempre son 18. En **2025** fueron 17 porque el Sagrado Corazón
y San Pedro y San Pablo cayeron los dos en el lunes 30 de junio. Vuelve a pasar
en 2030, 2038, 2041, 2052 y 2057. Las entradas se fusionan en una sola con los
dos nombres. **17 pruebas en Vitest** (`npm test`), que entra al proyecto en
esta sesión solo para la lógica pura de `src/lib`.

**`src/lib/reglas-reserva.ts`** aplica la regla del hotel. La restricción de
cada plan sale de `planes.dias_aplica` y `planes.tipo`, **no del nombre**: el
nombre lo edita el cliente desde el panel, y una regla escrita contra «Estándar»
dejaría de aplicarse en silencio el día que lo renombre.

**`CalendarioFechas`** sustituye a los `input type="date"`. El campo nativo no
sabe deshabilitar días sueltos —solo entiende `min`, `max` y `step`— y la
alternativa era dejar elegir un sábado y rechazarlo después, que no es validar
sino tender una trampa. Es una `<table role="grid">` con tabulación itinerante
(flechas, Inicio/Fin, RePág/AvPág), Escape, foco devuelto al botón y
`aria-label` que dicen POR QUÉ un día está apagado. En móvil es una hoja
inferior, no un desplegable: colgado del campo se salía de la pantalla.

Verificado por CDP: con el plan Entre Semana solo quedan activos lunes a
jueves; elegido el lunes 14 de septiembre, las salidas posibles son 15, 16, 17
y **18** —el viernes, porque la última noche sigue siendo la del jueves— y el
sábado 19 ya está apagado. En `/reservar`, además, los planes incompatibles con
unas fechas ya elegidas se apagan y explican el motivo.

**Estancias mixtas** (jueves→sábado) no se venden en línea: el hotel no ha
decidido cómo se cobran. El mensaje lo dice en español y manda a WhatsApp.

#### Menores de edad

No se permiten, en ninguna cabaña. Corregidos la pregunta frecuente, los
términos (§5 y §7 de `src/lib/legal.ts`), el selector de huéspedes del motor
—uno o dos ADULTOS, en vez de un campo numérico libre— y la etiqueta del panel.
Ni una mención de bebés, cunas ni sillas altas queda en el sitio.

#### Verificación

- `tsc --noEmit`, `npm run lint` y `npm run build` limpios. **17 pruebas en
  verde.** Las 19 rutas públicas siguen estáticas/SSG con ISR de una hora;
  `/conocenos` entre ellas.
- Revisión por CDP a 1440 y 390 px de portada, `/alojamientos`, ficha de la
  Cabaña 04, `/galeria` (las tres páginas), `/conocenos`, `/faq`, `/contacto`,
  `/reservar` y el calendario abierto en los dos anchos.
- **Lighthouse móvil** (build de producción, mediana de cinco pasadas):
  portada **94–95** de rendimiento (venía de 82 con el video autoplay), galería
  **95**, `/alojamientos` 91, `/reservar` 92. Escritorio: 100/100/100/100.
- **Panel con sesión real**: las doce pantallas responden 200, sin errores de
  consola; el campo «Video (opcional)» trae la dirección correcta, el de «Cómo
  llegar» también, la sección se llama «Conócenos» y el campo de personas dice
  «Cuántos adultos».
- **Bucket**: 108 objetos en `imagenes` (28,9 MB) y 1 en `videos` (7,5 MB).
  `npm run imagenes:limpiar` da **cero huérfanos**: las dos fotos que dejaron de
  ser hero siguen usándose en la galería y en «Nuestra esencia», así que no
  había nada que borrar.

#### Lo que NO convence y hay que mirar

- **El clip de COP16 es un plano hablado de 2 min 49 s.** Silenciado y en bucle
  —que es como se pidió— no comunica nada: se ve a alguien mover los labios. Se
  le dejaron controles para poder oírlo, pero lo que de verdad hace falta es
  **un corte de 20–30 segundos solo de imágenes** (bosque, colibríes, cabañas),
  o publicarlo con sonido a la espera de un clic. Preguntar a Juan Camilo si
  existe el material en bruto.
- **Lighthouse móvil marca 96 en accesibilidad** en la portada, por contraste.
  Es un artefacto de la micro-aparición: axe muestrea la página mientras medio
  sitio está a mitad del fundido y mide los colores mezclados con el fondo
  (`#248783` es exactamente `#027570` al 86,6 %). En escritorio, donde la
  animación termina antes de que axe corra, da **100** y el contraste pasa. En
  reposo todos los pares medidos superan 5:1.
- **La galería en móvil va a una foto por fila.** Con el alto objetivo actual,
  dos apaisadas no caben en 390 px. Se ve bien —una foto grande por pantalla—
  pero la página se hace larga: doce fotos son 5.700 px.
- **El calendario todavía no consulta disponibilidad.** Apaga días por la regla
  del plan, no por ocupación: eso llega con el motor.

### 2026-09-14 — Tercera ronda: Instagram en la portada, COP16 en Conócenos y heros nítidos

Tres encargos de Cesar: mover la COP16 y poner Instagram en su lugar, arreglar
los heros que se veían borrosos y dejar un interruptor para cuando se agote la
cuota de imágenes de Vercel.

#### Por qué los heros se veían borrosos (y no era solo el `quality`)

Eran tres causas sumadas, y la principal no tiene arreglo por código:

1. **El material es pequeño.** Las 53 fotos del Drive son exportaciones de
   Instagram: la mayoría mide **1448 px de ancho**, tres de las que estaban en
   heros medían **1086** y la de Contacto, **941**. Un hero ocupa el ancho de la
   ventana: 1440 px en escritorio.
2. **`next/image` NO amplía.** Su `sharp.resize()` lleva
   `withoutEnlargement: true` (comprobado en
   `node_modules/next/dist/server/image-optimizer.js`), así que devuelve el
   archivo a su tamaño real y **es el navegador quien lo estira**. Una foto de
   941 px se estiraba un 53 % sin que nada en el HTML lo delatara.
3. **Triple compresión.** `web/` se genera de `drive/` a `webp({ quality: 82 })`
   y encima `next/image` recomprimía a 75 —y a **68** en el hero de la portada,
   que se había bajado para ahorrar 50 kB—. Tres generaciones de pérdida sobre
   un WebP que ya venía comprimido de Instagram.

**Qué se hizo.** `npm run imagenes:hero` (ahora `scripts/generar-heros.mjs`,
que sustituye a `generar-hero-sin-flag.mjs`) genera las **nueve** variantes en
`web/heroes/`, cortadas del original de `drive/` con `webp({ quality: 90 })` y
**sin un solo `resize()`**: si un día hiciera falta un hero más grande que su
origen, la respuesta es pedir los archivos de cámara, no interpolar píxeles que
no existen. En el sitio van con `quality={90}`, `sizes="100vw"` y `priority`.

**Regla nueva, escrita en `fotos.ts` y en `CMS_CLAVES.md`: ninguna foto de menos
de 1440 px de ancho puede ser un hero.** Tres páginas cambiaron de foto por eso.

| Página | Antes (origen) | Después (origen) | Ancho de origen |
|---|---|---|---|
| Portada, escritorio | `zonas-comunes/02`, q82 → next q68 | `heroes/portada-escritorio`, q90 → next q90 | 2400 (igual) |
| Portada, móvil | `zonas-comunes/01`, q82 → next q68 | `heroes/portada-movil`, q90 → next q90 | 1750 (igual) |
| `/alojamientos` | `cabana-03/02` | `heroes/alojamientos` (misma foto) | 1448 |
| `/experiencias` | `cabana-05/05` chimenea | `heroes/experiencias` ← `cabana-02/05` jacuzzi bajo el árbol | 1448 |
| `/conocenos` | `zonas-comunes/06` piscina | `heroes/conocenos` ← `zonas-comunes/05` panorámica | **1086 → 1536** |
| `/galeria` | `zonas-comunes/07` | `heroes/galeria` (misma foto) | 1448 |
| `/faq` | `cabana-01/03` balcón | `heroes/faq` ← `cabana-02/04` terraza con hamaca | **1086 → 1448** |
| `/contacto` | `zonas-comunes/08` fogata | `heroes/contacto` ← `cabana-05/05` chimenea | **941 → 1448** |
| `/reservar` | `cabana-01/01` | `heroes/reservar` (misma foto) | 1448 |

La foto de la portada **no cambió** —le gusta a Cesar—; cambió de dónde sale el
archivo y con qué calidad. Y el hero de `/conocenos` no es la panorámica entera
sino una banda de 1536×1000 recortada sobre las cabañas: la foto es muy vertical
(1536×2048) y servirla completa era descargar tres veces los píxeles que se ven.

Las **tres fotos que salieron de los heros no se perdieron**: la fogata, el
balcón con hamaca y la piscina son ahora tres de las cuatro de la tira de
Instagram, donde sus 941–1086 px sobran de largo.

`lugar.imagen` («Sobre nosotros») pasa de la panorámica —que subió al hero de esa
misma página— al **corredor techado** (`zonas-comunes/02`, 2400 px), para que la
misma foto no saliera dos veces en la misma pantalla.

⚠️ **Comparado a 1:1 el tubo completo** (bucket → `next/image` → navegador,
simulado con sharp sobre los mismos recortes): con el material viejo el follaje
se deshacía; con el nuevo se ven las hojas. No era una impresión de Cesar.

#### La COP16 se muda a `/conocenos`

Era la octava sección de la portada: un clip de 2 min 49 s **con locución** en la
única página cuyo trabajo es llevar a reservar sin desplazarse. Ahora vive en
`/conocenos`, entre «Sobre nosotros» y las instalaciones, que es el orden en que
alguien se hace las preguntas. Fondo `brote` (el verde claro del manual) y no
blanco: entre la sección crema de arriba y la blanca de abajo, un blanco más
habría fundido las tres en una sola mancha.

**La clave del CMS se renombró con la sección**: `home.reconocimiento` →
`conocenos.reconocimiento`. La **migración 008** lo hace con un `update` sobre la
fila existente, no con `insert` + `delete`: la fila puede traer texto que el
hotel editó desde el panel, y recrearla lo habría devuelto al respaldo del código
en silencio. En el panel, el bloque «Reconocimientos» se mudó de la pantalla
«Portada» a la de «Conócenos».

#### Instagram en la portada

Patrón de **La Maima** (`src/components/home/instagram-reel.tsx` y `meet-us.tsx`),
diseño de La Finca: fotos propias del bucket enlazadas al perfil, más el reel
cargado bajo demanda. Clave nueva **`home.instagram`**, editable desde el panel;
el enlace del perfil y el arroba **no** viven ahí, salen de `sitio.contacto`.

- **Cero peticiones a Meta antes del clic.** Verificado por CDP interceptando
  todo lo que huela a `instagram.com` / `cdninstagram` / `facebook`: **0** con la
  portada abierta y recorrida entera; **44** después de pulsar. Lo que se pinta
  de entrada es una fachada con una foto del bucket.
- **`<iframe>` a `.../embed/`, no `embed.js`.** El embebido «oficial» es un
  `<blockquote>` más un script de Instagram que acaba inyectando este mismo
  iframe. `https://www.instagram.com/reel/DbO8x0SxnFX/embed/` responde **200 sin
  `X-Frame-Options` y sin `frame-ancestors`** (comprobado con `curl -I` y
  renderizado en Chrome), así que se puede embeber directo.
- **Clic y no `IntersectionObserver`.** Al entrar en pantalla también sería
  barato, pero lo pagaría todo el que pasa de largo —casi todo el mundo— y
  metería el iframe después del primer pintado.
- **Desplazamiento de diseño cero.** El marco lleva `aspect-[88/165]` desde el
  primer pintado: es la altura exacta que ocupa la tarjeta del embebido a 352 px
  de ancho, medida en Chrome. Al pulsar, el iframe cae en el hueco que ya ocupaba
  la foto y no se mueve un píxel. CLS medido: **0,002**.
- **Dos redes por si Meta lo bloquea algún día.** Un iframe de otro origen no se
  puede inspeccionar: si dejara de renderizar, la caja se quedaría en blanco sin
  avisar. Hay un temporizador de 8 s que vuelve a la fachada con un aviso, y el
  enlace «Ver el reel en Instagram» está **siempre** debajo del marco.
- `direccionEmbebido()` valida el permalink: solo `https://` de `instagram.com`
  con camino `/reel|reels|p|tv/<id>`, y **descarta los parámetros** del enlace
  que se copia de la app (`?hl=es`, `?igsh=…`, que es un identificador de quien
  comparte y no tiene por qué viajar). Si lo pegado en el panel no es de
  Instagram, la sección se pinta sin reel: un campo mal escrito no puede acabar
  en un `<iframe>` apuntando a cualquier sitio.
- Las cuatro fotos van en cuadrado con `object-right-top`, y el póster del reel
  también: el marco es mucho más alto que ancho y recorta por los lados, justo
  donde vive el sello de marca. Centrado, quedaba partido por el borde.

**No hizo falta tocar ninguna `Content-Security-Policy`**: el proyecto no define
cabeceras de seguridad (no hay `headers()` en `next.config.ts` ni middleware que
las ponga). Tampoco `remotePatterns`: el reel entra por un `<iframe>`, no por
`next/image`. Si algún día se añade una CSP —y convendría—, necesitará
`frame-src https://www.instagram.com`.

#### Interruptor de la cuota de imágenes de Vercel

`images.unoptimized = process.env.IMAGENES_SIN_OPTIMIZAR === "1"` en
`next.config.ts`, documentado en `.env.example`. El plan gratuito de Vercel trae
un número limitado de transformaciones de Image Optimization al mes y, cuando se
agota, **no sirve la foto sin optimizar: devuelve un error** y el sitio se queda
con los huecos de las imágenes vacíos. Con la variable en `1` y un redespliegue,
`next/image` apunta directo al bucket.

Verificado: con `IMAGENES_SIN_OPTIMIZAR=1` el build pasa y en `/`, `/conocenos` y
`/faq` **no aparece ni una ruta `/_next/image`**; el `src` es la URL del bucket
tal cual. Sin la variable, vuelven las `srcset` de `/_next/image` con `q=90` en
los heros.

⚠️ **En ese modo se sirven los archivos del bucket tal cual**, y el hero móvil
pesa 1,2 MB. Es un interruptor de emergencia, no un modo de operación: mientras
esté encendido, el rendimiento en móvil se resiente.

#### Verificación

- `tsc --noEmit`, `npm run lint` y `npm run build` limpios. **17 pruebas en
  verde.** Las 19 rutas públicas siguen estáticas con ISR de una hora.
- Capturas por CDP a **1440 y 390 px** de la portada, `/conocenos` y las siete
  páginas con cabecera; más la sección de Instagram antes y después de pulsar el
  reel, en los dos anchos. El embebido **renderiza** en los dos.
- **Lighthouse móvil de la portada**, cinco pasadas contra el build de
  producción: 80 · 95 · 95 · 95 · 82 → **mediana 95**. Las dos bajas son la
  primera petición de cada variante nueva de imagen, que el optimizador genera en
  ese momento (LCP 5,0 s y 4,8 s frente a 2,9 s en caliente); en Vercel eso pasa
  una vez por variante y por despliegue. Accesibilidad 96, el mismo
  `color-contrast` de siempre (artefacto de la micro-aparición, ver la ronda
  anterior). Prácticas recomendadas 100, SEO 100.
- **Panel con sesión real**: la pantalla «Portada» ya no tiene el bloque de
  Reconocimientos y sí el de Instagram (con el enlace del reel y el editor de
  fotos); la de «Conócenos» tiene el de la COP16 con su video. Se **guardó de
  verdad** en las dos —«Guardado. El sitio ya muestra el cambio.»— y después se
  restauró el seed. Las siete cabeceras apuntan a `web/heroes/…`. Sin errores de
  consola.
- **Bucket**: 115 objetos. Se borraron los dos heros viejos que dejaron de usarse
  (`web/zonas-comunes/hero-escritorio.webp` y `hero-movil.webp`, 1,6 MB) y
  `npm run imagenes:limpiar` vuelve a dar **cero huérfanos** (regla 11).

#### Lo que sigue limitado por el material

- **Ninguna foto del hotel pasa de 2400 px, y solo dos llegan.** Los heros de
  `/alojamientos`, `/experiencias`, `/galeria`, `/faq`, `/contacto` y
  `/reservar` van con **1448 px** de origen: justo para una pantalla de 1440 a
  1×, **corto para una pantalla retina o un monitor de 1920**, donde el navegador
  vuelve a estirar. Se ve bien, no perfecto. Para que lo estuviera hacen falta
  los **archivos de cámara** de esas fotos; las que hay son exportaciones de
  Instagram. **Pedírselos a Juan Camilo.**
- Las fichas de cabaña y la galería no tienen este problema: ahí las fotos se ven
  a media columna o menos y 1086 px sobran.
- Sigue en pie lo de la ronda anterior: **el clip de COP16 es un plano hablado de
  2 min 49 s**. Movido a `/conocenos` molesta menos, pero sigue haciendo falta un
  corte de 20–30 s solo de imágenes.

### 2026-09-14 — Cuarta ronda: el motor de reservas, las imágenes sin Vercel y la marca oficial

Ronda larga. Seis encargos de Cesar más uno que entró a mitad de camino (los
logos del diseñador). Lo que la resume: **el plan de una noche lo decide la
fecha de esa noche, y nada más**; y **el sitio deja de depender del optimizador
de imágenes de Vercel**.

#### El bug: las fechas y el plan se bloqueaban entre sí

Cesar reportó que al elegir ciertas fechas ya no se podía cambiar de plan. No
era un fallo de interfaz sino del modelo: `src/lib/reglas-reserva.ts` prohibía
las estadías **mixtas** —jueves→sábado mezcla una noche entre semana con dos de
fin de semana— y el calendario apagaba los días que el plan elegido no cubría.
Plan y fechas se cerraban la puerta el uno al otro.

El modelo real (§3 de `docs/DATOS_CLIENTE.md`, reescrito con Cesar ese mismo
día) es el contrario: **el plan es una consecuencia de la noche**. Cada noche se
cobra con la tarifa que le toca a su fecha, las mixtas se permiten y se
desglosan.

Se retiró `reglas-reserva.ts` entero y entró `src/lib/reserva/`:

- **`noches.ts`** — trocea `[entrada, salida)` en noches y clasifica cada una
  (`entre_semana` / `fin_de_semana`, con los festivos de Colombia). No tiene ni
  una función que diga «no»: solo clasifica. La **víspera** de un festivo entre
  semana queda tras `CONTAR_VISPERA = false`, marcada `TODO` hasta que Amapola
  confirme; la prueba deja escrito el comportamiento en los dos mundos, así que
  cambiar la constante no rompe la suite en silencio.
- **`cotizacion.ts`** — aplica a cada noche su tarifa y devuelve el desglose más
  el total. Una cabaña es elegible solo si tiene tarifa para **todos** los tipos
  de noche de la estancia, y el motivo va escrito en español.

**45 pruebas nuevas** (62 en total, todas en verde) con el catálogo y los
precios reales del cliente.

#### Cómo quedó el flujo

`/reservar` cambió de orden: **fechas → cabañas elegibles → Estándar o Premium
(solo si hay noches de fin de semana) → desglose noche por noche con el total**.
Verificado por CDP contra el build de producción:

| Caso | Resultado |
|---|---|
| jue 1 oct → sáb 3 oct, Cabaña 01 | 1 Entre Semana $350.000 + 1 Estándar $480.000 = **$830.000** |
| jue → dom (3 noches) | 1 + 2 = **$1.310.000** con Estándar · **$1.710.000** con Premium |
| Cambiar Estándar ↔ Premium | El resumen de fechas queda **idéntico**; solo cambian las líneas de fin de semana |
| Cabaña 02 con noches entre semana | **Fuera de la lista**, con el motivo: «La Cabaña 02 no se ofrece para noches entre semana» |
| Cabaña 02, fin de semana puro | Vuelve; Premium sale deshabilitado *para esa cabaña* y lo explica, **sin tocar las fechas** |
| Calendario con `?plan=Entre Semana` | 42 celdas, 14 apagadas, y el único motivo es **«ya pasó»**. 24 resaltadas como preferencia, todas pulsables |

El mensaje de WhatsApp lleva ahora el desglose completo, una línea por noche y
el total, con saltos de línea reales.

#### Sin transformaciones de imagen (decisión de Cesar)

`images.unoptimized` pasa a estar encendido **por defecto**
(`IMAGENES_SIN_OPTIMIZAR !== "0"`). El motivo es el de siempre: cuando se agota
la cuota de Vercel, Image Optimization **no degrada**, devuelve un error y el
sitio del hotel se queda con los huecos de las fotos vacíos.

El precio de apagarlo era perder el `srcset` —el hero móvil eran 1,2 MB para un
teléfono de 390 px— y, como se descubrió midiendo, **también el AVIF**, que es
lo que `/_next/image` servía a todo navegador que lo aceptara. Así que ambas
cosas se generan ahora nosotros:

- **`npm run imagenes:variantes`** (`scripts/generar-variantes.mjs`) deja en el
  bucket (`v/…`) las variantes por ancho de cada foto publicada, en WebP y en
  AVIF. Dos escaleras: heros hasta 2400 px, fotos hasta 1200.
- **`<Foto>`** (`src/components/ui/foto.tsx`) sustituye a `next/image` en todo
  el sitio público. Mismo API —`fill`, `sizes`, `priority`, `className`—, más
  `fuentes` para dirección de arte de verdad.

| | Antes | Después |
|---|---|---|
| Hero móvil de la portada (412 px, dpr 2,625) | 1216 kB | **225 kB** (AVIF 1120) |
| Peor relación descargado / pintado | sin `srcset`: hasta 4× | **1,20×** |
| Lighthouse móvil portada (mediana de 5) | 87 | **92** (dos pasadas en 97–98) |

#### Cuatro cosas que solo se vieron midiendo

1. **`priority` de `next/image` emitía un `<link rel="preload">`** y al escribir
   `<Foto>` se perdió: el LCP de la portada subió de 2,7 s a 4,1 s sin que nada
   en el HTML lo delatara. `<Foto>` lo emite ahora (React 19 iza los `<link>` a
   la cabecera solo).
2. **Chrome descarga una imagen en `display: none` si no es perezosa.** El hero
   de escritorio y el de móvil eran dos `<img>` con `hidden`/`sm:block`, así que
   el escritorio se bajaba el vertical de 1,2 MB para no pintarlo nunca. Ahora
   es un `<picture>` con `media`: el navegador evalúa antes de pedir.
3. **El `sizes` de la galería mentía.** Decía `48vw` donde la mampostería pinta
   a `92vw` en el teléfono: el navegador elegía la variante de 480 px y la
   estiraba a 654. Un `sizes` que miente no ahorra peso, produce fotos blandas.
4. **El peldaño de 1120 px no es redondo a propósito.** El teléfono de
   referencia de Lighthouse es 412 px a densidad 2,625: pide 1081. Con un
   peldaño en 1080 se queda cinco píxeles corto y el navegador salta al
   siguiente, que pesa el doble.

#### Portada y `/reservar`: alineaciones y tres secciones que se distinguían

- En `/reservar`, la foto de la primera sección tenía proporción fija mientras
  la columna de los tres pasos crecía con su texto. Ahora la fila es
  `items-stretch` y el alto de la foto lo fija la columna de al lado.
- En «Nuestra esencia», las dos fotos de abajo iban escalonadas (`mt-8`): se
  leía como un fallo de maquetación. Comparten fila y `h-full`.
- **Experiencias → Nuestra esencia → Instagram** se leían como una sola masa
  blanca y ni siquiera compartían el mismo blanco (dos `#ffffff` y una crema).
  Ahora: crema con la rama botánica asomando por la izquierda, la **banda del
  verde oficial `#E8F4D9`** con sus dos ondas orgánicas, y blanco con el patrón
  de colibríes. Tres tonos, ninguno estridente. Las tarjetas de experiencias
  pasaron a blanco para no desaparecer sobre el crema.

#### Auditoría responsive: cero desbordes

Las once páginas públicas a **360, 390, 430, 768 y 1024 px**, con CDP contra el
build de producción. `document.documentElement.scrollWidth <= innerWidth` en las
**55 combinaciones**. Lo que se corrigió, por archivo:

| Dónde | Qué medía | Qué se hizo |
|---|---|---|
| `ui/boton.tsx` | «Reservar» del nav: 104×43 | `min-h-11` en la base, no en cada tamaño |
| `sitio/menu-movil.tsx` | Botón del menú: 40×40 | `size-11` |
| `sitio/nav-escritorio.tsx` | Enlaces del nav: 38 px de alto | `min-h-11` |
| `sitio/encabezado.tsx` | Enlace del logo: 36 px | `min-h-11` |
| `ui/galeria.tsx` | Paginación y flechas: 40×40 | `size-11` |
| `sitio/calendario-fechas.tsx` | Celdas 36 px; flechas de mes 32×32 | Celdas a 44 px (`p-px` en móvil para ganar los dos últimos), flechas `size-11` |
| `sitio/hero-pagina.tsx`, `paginas/alojamiento.tsx`, `alojamientos.tsx`, `legal.tsx` | Migas de pan: 16 px de alto | `inline-flex min-h-11 items-center` |
| `sitio/lector-resena.tsx`, `resenas-google.tsx`, `reel-instagram.tsx`, `pie.tsx`, `paginas/inicio.tsx` | Enlaces de acción en línea: 20 px | Igual |
| `paginas/inicio.tsx` (antetítulo del hero), `sitio/modulo-reserva.tsx` (etiquetas), `sitio/tarjeta-plan.tsx` (insignia) | Texto de 10,9–11,2 px | A 12 px |

Queda a propósito: **el «Eco · Hotel» del logotipo a 8,8 px**. Es parte del
lockup de marca, no texto para leer, y agrandarlo rompería la proporción.
Las migas de pan miden 44 px de alto pero 29 de ancho: es texto de navegación,
pasa el mínimo AA (24×24) y forzar 44 de ancho a la palabra «Inicio» pediría un
relleno que se leería como un botón.

#### Los logos oficiales (encargo que entró a mitad de ronda)

Llegaron las seis variantes del diseñador: PNG de 1080×1080 y JPG de 2250×2250,
**sin vectorial**. Se copian los PNG a `public/marca/oficial/` y el mapeo queda
en **`docs/MARCA.md`** (que se conserva entero: lo anterior era el análisis del
WordPress viejo y explica de dónde salió el dorado retirado).

| Variante | Qué es |
|---|---|
| 01 | Lockup completo en petróleo, **transparente** |
| 02 / 03 | Lockup completo en crema, con fondo oliva / petróleo horneado |
| 04 / 06 | Isotipo en oliva / verde claro, con fondo horneado |
| 05 | Isotipo en petróleo, **transparente** |

- **Iconos del sitio** (`npm run marca:iconos`): `icon.png` 512, `apple-icon.png`
  180 y `favicon.ico` 16/32/48, desde la variante 05. Van en `src/app/` y se
  **quitó el `metadata.icons` del layout**, que apuntaba al isotipo provisional
  de Instagram y ganaba a los oficiales por convención.
  El ave va en **verde claro sobre petróleo**: en petróleo sobre el blanco de
  una pestaña se lee como una mancha, y en modo oscuro desaparece. El ave crece
  en los tamaños pequeños (92 % del lienzo a 16 px frente al 66 % a 512).
- **Manifiesto web** nuevo (`src/app/manifest.ts`), con el petróleo como
  `theme_color` y `display: "browser"` —el sitio se lee como un sitio—.
- **Tarjeta de OpenGraph** rehecha con la variante 01 teñida en crema sobre el
  hero de la portada. Ruta nueva en el bucket; la anterior se borró.

#### `metadatosPagina()` pasa a ser `async`, y eso arregló un fallo real

La tarjeta al compartir se edita desde el panel (`sitio.seo`), pero **solo la
portada la leía**: las otras doce páginas caían al respaldo escrito en código.
El hotel podía cambiar la imagen y ver que el enlace de la portada se
actualizaba mientras el de `/alojamientos` seguía mostrando la vieja, sin
ninguna pista de por qué. Ahora la función lee `getSeoSitio()` —envuelto en el
`cache()` de React, así que no cuesta una consulta más— y el orden es: foto
propia de la página → panel → respaldo.

#### Verificación

- `tsc --noEmit`, `npm run lint` y `npm run build` limpios. **62 pruebas en
  verde.** Las 19 rutas públicas siguen estáticas con ISR de una hora.
- **Lighthouse móvil** (build de producción, mediana de cinco pasadas): portada
  **92** de rendimiento, accesibilidad **100** (subió de 96: las correcciones
  táctiles y de tamaño de letra), prácticas recomendadas 100.
- **Panel con sesión real**: las trece pantallas responden 200, **sin un solo
  error de consola**, y el campo «Imagen al compartir el enlace» muestra la
  tarjeta nueva con previsualización y permite subir archivo.
- **Bucket sin huérfanos.** `npm run imagenes:limpiar` da cero. Por el camino se
  borraron 788 objetos: dos generaciones de variantes mal ubicadas de la propia
  sesión (ver abajo) y la tarjeta OG anterior.

#### Dos tropiezos que conviene no repetir

1. **`npm run build` con `npm run start` vivo produce un CSS de 2 kB.** El build
   reescribe `.next` bajo los pies del servidor y la hoja de Tailwind sale
   vacía. Una auditoría entera se hizo contra un sitio sin estilos y dio
   «desbordes» y «botones de 17 px» que no existían. En Windows hay que matar
   los `node.exe` por PID y borrar `.next` antes de compilar.
2. **Las variantes vivieron un rato en `web/v/`.** Con ese prefijo, el filtro de
   fuentes del generador —que solo miraba el principio de la ruta— las dio por
   fotos y generó variantes **de las variantes**. Ahora viven en `v/` con la
   ruta de origen entera (`v/web/cabana-01/01-640.webp`), el filtro mira el
   prefijo en cualquier punto, y `limpiar-bucket.mjs` hace el camino inverso:
   una foto que sale del sitio se lleva sus peldaños con ella.

#### Lo que no convence

- **El `favicon.ico` de 16 px sigue siendo una mancha.** Es el límite del
  dibujo, no del script: un colibrí de línea fina no cabe en 16 píxeles. A 32 y
  48 se lee bien, y son los que usan hoy Chrome, Firefox y Safari. Si importa,
  hace falta un **isotipo simplificado para tamaños pequeños**, y lo tiene que
  dibujar Santiago.
- **Sigue sin haber vectorial ni lockup horizontal.** Por eso el logo del nav no
  cambió —a Cesar le gusta como está y ninguna de las seis variantes es
  horizontal—. Cuando llegue el SVG, ese es el momento de rehacerlo.
- **`/galeria`, `/alojamientos` y `/reservar` se quedan en 82–91 de
  rendimiento** en Lighthouse móvil. Su LCP no es la cabecera sino la primera
  foto grande de la página. Se les generó AVIF también; queda medir si basta.
- **El calendario sigue sin consultar disponibilidad.** Apaga el pasado y nada
  más: la ocupación real llega con la parte del motor que toca la base.
- **`TODO` abierto del cliente:** si la víspera de un festivo entre semana se
  cobra como fin de semana, y si el hotel cobra las estadías mixtas tal como las
  desglosa el motor. Las dos preguntas son para Amapola.


## Pendientes de contenido/credenciales (pedir según se necesiten)

> Lo marcado como `TODO` en `supabase/seed/001_datos_iniciales.sql` sale del sitio
> público actual, no del cliente. Cuando confirme, se corrige el seed y se vuelve
> a correr `npm run db:aplicar` (es idempotente: actualiza, no duplica).

### Pendientes que dejó la Fase 5 (panel)

- [ ] **Rotar el usuario de pruebas** `panel@lafincaecohotel.com` y crear las
      cuentas reales del equipo (ver arriba).
- [ ] **Pagos: la ficha de reserva muestra el abono pero no registra
      transacciones.** La tabla `pagos` está creada y vacía; se llenará desde el
      webhook de Wompi en la fase de pagos.
- [ ] **Sin correos al huésped.** Al confirmar una reserva desde el panel no
      sale ningún correo: falta Resend y el correo emisor. El código está
      preparado para añadirlo sin tocar la lógica de reservas.
- [ ] **No hay historial de cambios.** Si alguien borra una reserva o vacía un
      texto del CMS, no queda rastro. Para el volumen de La Finca es
      razonable; conviene decirlo en la capacitación.
- [ ] **Exportar el calendario (iCal)** para sincronizar con Airbnb o Booking:
      diseñado en el análisis de La Maima, no implementado aquí.

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
- [ ] **Usuarios del panel (nombres y correos).** Hoy solo existe el usuario
      temporal de pruebas `panel@lafincaecohotel.com`, creado con la Admin API
      de Supabase. **Rotarlo o borrarlo al entregar.** Las cuentas nuevas se
      crean desde el panel de Supabase (Authentication → Users, con "Auto
      Confirm User"): el sitio no tiene registro público a propósito.
- [ ] Accesos: Hostinger (dominio), Google Business, Analytics.
- [ ] Cuenta Wompi (documentos, llaves sandbox/producción).
- [ ] Decisión: pago total vs anticipo.
