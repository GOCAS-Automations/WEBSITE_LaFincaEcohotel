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
  oficiales del diseñador. El **2026-09-15**, una **quinta ronda** sobre el sitio
  ya publicado en Vercel: la portada sin «Nuestra esencia» y con fotos en
  Experiencias, el pie sin la línea clara, el calendario por encima de todo, el
  desplegable de cabañas con el estilo del sitio, las ondas de sección
  redibujadas para el teléfono y los botones centrados a 390 px. Ese mismo día,
  una **sexta ronda**: la víspera de festivo como fin de semana, el Día de
  Calma para una o dos personas, el anticipo con deslizante de 50 a 100 %, el
  paso 4 sin solapes, los cinco pasos en la portada de `/reservar`, el video de
  la COP16 y la decoración del FAQ.
- **2026-09-15 · Fase 3, primera entrega del motor con datos reales:** el
  **Día de Calma ya es una reserva** (con su cupo de 10 personas por día), las
  **experiencias se eligen noche por noche**, el huésped elige con un
  deslizante **cuánto adelanta, de 50 a 100 %**, y el panel muestra el cupo del
  día bajo las cinco cabañas.
  Sigue sin haber pasarela: el botón final es WhatsApp, con la costura de Wompi
  marcada en el código.
- Del motor de reservas ya existe la parte que no depende de la base: el
  calendario de festivos de Colombia, la regla plan ↔ noches y el calendario
  propio que apaga los días que el plan no cubre. Falta la disponibilidad real.
- **Decisión de alcance:** primero todo el sitio + panel administrativo; motor de reservas y pagos (Wompi) después.
- **Repo remoto:** https://github.com/GOCAS-Automations/WEBSITE_LaFincaEcohotel.git (push pendiente de confirmación de Cesar; luego se conecta a Vercel).
- **2026-09-16 · Séptima ronda (la última antes de la revisión del cliente):**
  el **Día de Calma se reserva y se paga por el sitio**, con el mismo cierre y
  el mismo deslizante de anticipo que el hospedaje; el paso del plan lo ofrece
  con una tarjeta que conserva la fecha de llegada; existe la sección
  **`/admin/usuarios`** con los roles propietario y equipo; y los **cuatro
  documentos legales se editan desde el panel** (revierte la decisión del
  2026-09-02).
- **2026-09-30 · Auditoría de seguridad completa** antes del lanzamiento
  comercial: `docs/AUDITORIA_SEGURIDAD.md`. Sin hallazgos críticos; los cuatro
  altos (cookie de sesión abierta, cero cabeceras de seguridad, login sin freno
  de fuerza bruta y tablas futuras escribibles por anónimos) están corregidos y
  verificados, y el sitio ya pide **autorización expresa de datos personales**
  con constancia, como exige la Ley 1581 de 2012. En la misma ronda se añadió el
  **latido diario** que evita que Supabase pause la base. Lo que queda son ocho
  pendientes, casi todos de configuración o del cliente (§Pendientes del informe).
- **Cuentas del panel:** `fincavillarreal@gmail.com` es la cuenta del hotel
  (**propietario**) y `panel@lafincaecohotel.com`, la temporal de pruebas, quedó
  como **equipo**. Cesar decide si la borra desde `/admin/usuarios`: ya no hace
  falta entrar a Supabase para eso.

- **2026-10-01 · El sitio nuevo ES el sitio en producción.** `lafincaecohotel.com`
  apunta a Vercel y el hosting viejo quedó cancelado. Ese mismo día: se resolvió el
  **BTN-001** de Bold (las URLs de retorno tienen que ser `https://`), se corrigió
  `NEXT_PUBLIC_SITE_URL` —estaba en `http://localhost:3000` **en Vercel**, así que el
  sitio publicado se declaraba canónico en localhost— y nació **`PAGOS_ACTIVOS`**, el
  interruptor que impide que un huésped real pague en la pasarela de pruebas.
  ~~🔴 Pendiente que bloquea de verdad: `SITIO_PUBLICADO=1` en Vercel~~ —
  **resuelto esa misma noche**: comprobado el 2026-10-02,
  `https://lafincaecohotel.com/robots.txt` responde `Allow: /`. Queda enviar el
  sitemap a Search Console.

- **2026-10-02 · Un pago no puede perderse.** Se descubrió que a
  `/api/pagos/bold/webhook` habían llegado **cero eventos** pese a dos pagos reales
  en el sandbox, y que por eso `LF-2026-0001` se canceló sola al vencer su hold **con
  el pago hecho**. El webhook deja de ser la única vía: nace la **reconciliación**
  (`src/lib/pagos/reconciliar.ts`), que le pregunta a la API de Bold con nuestra llave
  desde la **página de retorno**, el **cron diario** —antes de barrer las vencidas— y
  un botón **«Verificar pago con Bold»** en el panel; comparte la escritura con el
  webhook (`src/lib/pagos/aplicar-estado.ts`) para que no puedan divergir. La
  migración **016** prohíbe en SQL cancelar por vencimiento una reserva con pago
  aprobado. Ese mismo día se **encendieron los correos** (Resend verificado, los tres
  enviados de verdad a `fincavillarrealcali@gmail.com`, con `Reply-To` al Gmail del
  hotel).
  🔴 **Pendiente que bloquea: las cuatro variables de correo en Vercel**
  (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_NOTIFY_TO`, `EMAIL_REPLY_TO`). Sin ellas el
  sitio publicado confirma la reserva y **no avisa a nadie**.

- **2026-10-03 · Primero la cabaña, luego las fechas.** `/reservar` pregunta «¿Dónde
  te quedas?» (cinco cabañas y el Día de Calma) y después «¿Cuándo?», y el calendario
  **tacha las noches ocupadas** de la cabaña elegida con la semántica `[llegada,
  salida)`: no se llega en noche ocupada, la salida no la salta, se puede llegar el
  día en que otro sale. La portada hace lo mismo (sin cabaña, solo las noches sin
  ninguna libre). Reglas puras en `src/lib/reserva/elegibilidad-calendario.ts`;
  detalle en el registro de esa noche.

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
| 2026-09-15 | **Un borde de 1 px más claro que el fondo ES la línea blanca.** El pie llevaba `border-t border-petroleo-800/40` sobre `bg-petroleo-900`. Y el `-mb-px` de `CorteOrganico` no lo tapaba: la sección que contiene la onda tiene `overflow-hidden` y ese píxel de solape se recorta. |
| 2026-09-15 | **Un `z-index` alto dentro de un `isolate` no sirve para salir de él.** El calendario iba con `z-50` dentro del hero, que es un contexto propio; la sección siguiente, `relative` con `z-auto`, se pintaba encima por orden del documento. El hero pasa a `z-30`. |
| 2026-09-15 | **Las ondas de sección se REDIBUJAN para el teléfono, no se escalan.** `preserveAspectRatio="none"` comprime el perfil de 1440 a 390 y lo convierte en una cenefa. `PERFILES_MOVIL` tiene una sola ondulación y se elige por CSS, no con una media query en JavaScript. |
| 2026-09-15 | **El fondue pasa a `extras.tipo = 'experiencia'`.** Es una celebración para dos con precio por estadía, igual que Aniversario y Cumpleaños. El cambio va en los datos y no en el código: ninguna regla se escribe contra el nombre del extra, que el cliente puede renombrar desde el panel. |
| 2026-09-15 | **«Nuestra esencia» sale de la portada y su clave del CMS con ella.** Una clave que ya no lee nadie se queda viva en la tabla para siempre: el seed la borra en un bloque «CLAVES RETIRADAS». |
| 2026-09-02 | **La galería NO añade un campo `destacada`.** El editor del panel guarda solo `url` y `alt`, así que una clave extra se perdería en el primer guardado. Qué foto sale grande lo decide su **posición** dentro de la página, documentado en `docs/CMS_CLAVES.md`. |
| 2026-09-02 | **La página de la galería vive en el estado del componente, no en la URL.** Meterla en la dirección obligaba a `useSearchParams` y a otro `<Suspense>` a cambio de nada: nadie comparte "la página 3 de la galería". |
| 2026-09-15 | **El Día de Calma se reserva como una reserva más**, con `reservas.tipo` ('hospedaje' \| 'dia') en vez de una tabla aparte: comparte código, calendario y ficha, y el `daterange` `[fecha, fecha+1)` deja que las consultas de solape sigan siendo las mismas. Sin cabaña (`alojamiento_id` nulo), así que **no bloquea ninguna**: el constraint EXCLUDE ignora los nulos. |
| 2026-09-15 | **El cupo de 10 personas por día vive en un trigger de la base** (`validar_cupo_dia_de_calma`, error `LF010` con mensaje en español), no solo en la aplicación: el panel no es el único camino de entrada y dos guardados simultáneos pasarían la comprobación de la app a la vez. La app comprueba antes para poder explicarlo mejor. |
| 2026-09-15 | **`reserva_extras` gana `noche`** y cambia su PK por un `id` propio (una columna que puede ser nula no puede ser PK). La unicidad real —«este extra, esta noche, una vez»— es un índice único `nulls not distinct`. `noche = null` significa «para toda la estadía» y es lo que quedó en las filas anteriores. |
| 2026-09-15 | **El anticipo se guarda congelado** (`porcentaje_anticipo` + `monto_anticipo`) y no se recalcula: es la cifra que se le prometió al huésped. El saldo siempre es `total − anticipo`, para que las dos cifras sumen exacto. |
| 2026-09-15 | **Elegir una sola fecha, sin salida, es la puerta al Día de Calma.** El calendario ofrece «Vengo solo ese día, sin dormir» en cuanto hay llegada, y se vuelve con «Prefiero quedarme a dormir». Nunca se usa la palabra «pasadía». |
| 2026-09-15 | **El cupo que queda se consulta a un endpoint propio** (`/api/dia-de-calma/cupo`), que lee con `service_role` y devuelve **solo el número agregado**: `reservas` no tiene lectura pública y no debe tenerla. |
| 2026-09-15 | **El Día de Calma se vende para UNA O DOS personas.** El cliente cerró el asunto: no existe la «persona adicional» que el hotel nunca tarifó, y quien venga en grupo hace varias reservas. El cupo de 10 por día sigue siendo el de toda la finca, que es otro límite. Siguen sin confirmar el anticipo, la cancelación y el jacuzzi de ese plan, y de esos el sitio no da ninguna cifra. |
| 2026-09-15 | **La víspera de un festivo se cobra como fin de semana** (`CONTAR_VISPERA = true`). Lo confirmó el cliente: la casa se llena igual la noche anterior a un festivo. Y la clasificación de las noches se quedó en UN solo sitio —`src/lib/reserva/noches.ts`—: `festivos-colombia.ts` tenía una segunda copia con su propio interruptor, y dos constantes para la misma decisión acaban diciendo cosas distintas. |
| 2026-09-15 | **El anticipo pasa de dos botones a un rango de 50 a 100 %**, con un `<input type="range"> de verdad. El nativo trae rol `slider`, flechas, Inicio/Fin y arrastre táctil; reimplementarlo con divs cuesta cien líneas y se pierde todo eso. Solo se le cambia la piel. El paso es de 5 puntos: un «63 %» no le dice nada a nadie. |
| 2026-09-15 | **Un `<legend>` dentro de una tarjeta con fondo SE SALE de ella.** El navegador saca el `legend` del flujo y lo pinta sobre el borde superior del `fieldset`: con `p-4`, fondo y `ring`, el título de cada noche del paso 4 quedaba montado en el filo —y a 390 px, fuera—. Las tarjetas de noche agrupan ahora con `role="group"` + `aria-labelledby`, que se anuncia igual y maqueta como un div. |
| 2026-09-15 | **La curva grande del video de la COP16 abre ARRIBA A LA DERECHA.** La regla de no tocar esa esquina protege el sello de marca de las FOTOGRAFÍAS del bucket; el clip de la COP16 es video y su póster es un fotograma propio, sin sello. La regla sigue viva para todo lo que sí es una foto (ver `ZONA_FLAG` en `src/lib/fotos.ts`). |
| 2026-09-15 | **La Finca NO publica en Airbnb ni en Booking**, y el calendario del hotel es un **Google Calendar llamado «la finca»**. Se retiró del sitio y de los documentos toda mención a esas plataformas y al nombre del bot (Whatsfy): la sincronización pendiente es la de ese calendario, y nada más. |
| 2026-09-15 | **La sincronización con el Google Calendar del hotel no se implementa todavía**, pero el modelo la espera: `origen = 'google_calendar'` y `referencia_externa` (único cuando existe). |

| 2026-09-16 | **El Día de Calma termina en el MISMO cierre que el hospedaje**: total, deslizante de anticipo de 50 a 100 % y una sola costura de Wompi (`pagoActual`). Dos cierres distintos habrían significado dos cobros que mantener. Como el hotel no ha confirmado si el día pide el mismo mínimo del 50 %, se aplica esa regla —la única publicada— y **se dice en pantalla**, en vez de dejar el cierre a medias. |
| 2026-09-16 | **Los textos legales vuelven al CMS** (`legal.privacidad`, `legal.terminos`, `legal.datos`, `legal.cancelacion`), revirtiendo la decisión del 2026-09-02: el sitio entra a revisión legal con Amapola y cada vuelta era, si no, un despliegue. Se conserva el respaldo en código y la acción impide dejar un documento sin secciones. **Consecuencia:** los datos de contacto dentro del texto legal ya no se interpolan de `sitio.contacto`; si el hotel cambia de número hay que corregir los cuatro documentos. |
| 2026-09-16 | **Las viñetas de los documentos legales son un párrafo con una convención**: si todas sus líneas empiezan por «- », se pinta como lista. Un editor de bloques habría sido más fiel al modelo y mucho peor de usar; así el documento entero se edita con cajas de texto normales y no se perdió ni una viñeta. |
| 2026-09-16 | **El rol del panel vive en `app_metadata`**, que solo escribe la Admin API —`user_metadata` sí lo edita su dueño— y viaja dentro del JWT ya validado por `getUser()`. Quien no traiga un rol reconocido entra como `equipo`, el menos privilegiado. |
| 2026-09-16 | **Esconder el enlace de Usuarios es cortesía, no seguridad.** El «no» lo dicen la página —que comprueba el rol ANTES de leer nada, así que no se filtra ni un correo— y cada Server Action, porque un POST directo no pasa por ninguna pantalla. |
| 2026-09-30 | **La cookie de sesión del panel es `httpOnly`.** Ningún componente usa `crearClienteNavegador()`, así que nada en el navegador necesita leer el token; dejarlo legible solo añadía una forma de perder el panel ante un XSS. Si algún día hace falta un cliente de navegador con sesión, hay que quitarlo a conciencia en `src/lib/supabase/opciones-cookie.ts`. **`@supabase/ssr` ignora el `maxAge` de `cookieOptions`:** la duración se recorta al escribir la cookie. |
| 2026-09-30 | **La CSP acepta `'unsafe-inline'` en `script-src` y no se va a arreglar con un `nonce`.** Un `nonce` exige middleware en las rutas públicas, y eso las volvería dinámicas: el sitio perdería el prerenderizado y el ISR de sus 18 páginas. Se elige el sitio estático; lo que la CSP sí impide es cargar un script de un host ajeno. HSTS va **sin `includeSubDomains` ni `preload`** hasta confirmar que todos los subdominios del hotel son HTTPS. |
| 2026-09-30 | **En `public`, `anon` no recibe nada por defecto.** Se invirtieron los `alter default privileges` de Supabase, que concedían TODO al rol anónimo sobre cualquier tabla futura. **Una tabla nueva que deba leerse desde el sitio público necesita su `grant select … to anon` a mano**, además de su política RLS. Se prefiere un `select` que falta a un `insert` que sobra. |
| 2026-09-30 | **El freno del login usa una ventana corta (10 intentos / 5 min por cuenta) y no una larga.** Cualquier bloqueo por cuenta se puede volver contra el hotel: quien conozca el correo del dueño puede dejarlo sin ver las reservas del día. La ventana se cura sola, y 120 intentos por hora contra una contraseña de 10 caracteres no llegan a ninguna parte. |
| 2026-09-30 | **La autorización de datos se pide con una casilla sin premarcar y se guarda con fecha, versión y canal.** La Ley 1581 exige autorización previa, expresa e informada, y el Decreto 1074 obliga a conservar prueba. Sin canal, las tres columnas quedan en `null`: «no consta» es la verdad y además es la lista de reservas cuya autorización habría que conseguir. |
| 2026-09-30 | **Editar `src/lib/legal.ts` NO cambia lo publicado:** los cuatro documentos viven en el CMS. Hay que regenerar el seed y aplicarlo, y **antes comparar las filas de `contenido` con el seed versionado**, porque en cuanto el cliente edite un texto desde el panel, aplicar el seed se lo borraría. |
| 2026-09-30 | **Existe un latido diario (`/api/salud` + cron de `vercel.json`) porque el plan gratuito de Supabase pausa los proyectos inactivos a los siete días.** Si se quita, la base se vuelve a pausar sola y el sitio se queda sin contenido ni fotos. Antes de quitarlo: plan de pago de Supabase u otro latido. |
| 2026-09-30 | ⚠ **TODA creación o reactivación de reserva llama antes a `liberarReservasVencidas()`.** `reservas_sin_solapamiento` es una restricción EXCLUDE y su predicado tiene que ser inmutable: **no puede llamar a `now()`**. Para ella, una `pendiente` con el hold vencido sigue apartando las fechas y rechazaría una reserva nueva sobre unas noches que en realidad están libres. Sin el barrido previo, el motor empieza a rechazar reservas que sí caben. Ya está en `guardarReservaAction`, `cambiarEstadoReservaAction`, el calendario del panel y el cron de `/api/salud`; **cualquier camino nuevo que escriba en `reservas` tiene que hacerlo también** (el primero será el webhook de pagos). |
| 2026-09-30 | **`ocupaCalendario()` (`src/lib/reserva/holds.ts`) es el ÚNICO sitio donde se decide si una reserva ocupa fechas.** La usan `/api/disponibilidad`, `/api/dia-de-calma/cupo`, `buscarChoques()`, el calendario del panel y el conteo del cupo. Filtrar solo por `estado` —como se hacía— sobrevendería en cuanto existan holds: apartaría noches que una solicitud caducada dejó libres. Si dos consumidores dejaran de usarla, la diferencia entre ellos se llamaría sobreventa. |
| 2026-09-30 | **El hold son 30 minutos y `expira_at is null` significa «no vence».** Lo que el equipo apunta a mano desde el panel **nunca** vence: detrás hay una conversación por WhatsApp o una llamada, no un checkout abandonado. Por eso el formulario del panel escribe `expira_at: null` siempre, y confirmar o cambiar el estado desde el panel también lo borra: una decisión que tomó una persona del hotel no puede caducar sola. |
| 2026-09-30 | **El barrido ANEXA el motivo a `notas`, no lo sobrescribe.** Ahí está lo que escribió el huésped (una alergia, una hora de llegada), y perderlo por una tarea automática sería destruir información del cliente para dejar una etiqueta técnica. La función no duplica la nota si ya la encuentra, y esa comprobación es **por contenido**: `MOTIVO_VENCIDA` (en `holds.ts`) y el `default` de la migración 013 tienen que ser el mismo texto — hay una prueba que lo vigila. |
| 2026-09-30 | **Los correos están «listos pero dormidos», y eso no es provisionalidad: es el contrato.** Sin `RESEND_API_KEY` registran lo que habrían enviado y devuelven `{enviado:false}`; **nunca lanzan**. Se llaman desde el webhook de pagos, donde un `throw` sería desastroso: el huésped ya pagó y la reserva ya está creada. Un fallo de correo no puede impedir guardar ni confirmar una reserva, y el panel lo dice en pantalla («Todavía no se envían correos automáticos: avísale tú por WhatsApp») para que el equipo no dé por hecho que el huésped ya sabe. |
| 2026-09-30 | **Los correos NO reparten el subtotal entre las noches para fingir un desglose.** La fila de `reservas` guarda un único `plan_id` y un subtotal; el desglose real noche a noche lo tiene `cotizar()`, y las plantillas lo aceptan por `noches` cuando quien envía lo trae. Sin él pintan una sola línea con el plan y el número de noches, que es verdad. Un número inventado en un correo de cobro es peor que un número menos detallado. |
| 2026-09-30 | **El logo de los correos es un PNG del bucket (`sitio/marca/icono-correo.png`), no el WebP del sitio.** Outlook de escritorio no pinta WebP: dejaría un cuadro roto en la cabecera de cada correo. Y la cabecera repite el nombre **en texto**, porque casi todos los clientes bloquean las imágenes hasta que el lector las pide. |
| 2026-10-01 | ⚠ **Bold solo acepta URLs de retorno `https://`, y eso incluye a `localhost`.** Es la causa del BTN-001: `data-redirection-url` y `data-origin-url` piden «Valid HTTPS URL» y con `http://` la pasarela ni se abre. Las URLs se construyen con `origenParaBold()` y `configuracionCheckout()` **lanza con un mensaje legible** si no son https, porque el error de Bold no dice cuál es el atributo: lo dice la consola del navegador, y solo si alguien la mira. |
| 2026-10-01 | **El código no da por hecho que `NEXT_PUBLIC_SITE_URL` esté bien puesta.** Estuvo valiendo `http://localhost:3000` en Vercel y el sitio publicado se declaró canónico en localhost durante semanas sin que nada fallara a la vista. El respaldo en `src/lib/sitio.ts` es ahora el dominio real —el **apex**, sin `www`, que es el principal en Vercel— y las URLs de Bold tienen además su propio último recurso https. |
| 2026-10-01 | **Las 301 del sitio viejo NO se retiran al desaparecer el sitio viejo.** Justo al revés: mientras existía, él mismo respondía esas direcciones; ahora las sirve este sitio y son lo único que separa de un 404 a quien llegue desde un resultado de Google. Google tarda meses en dejar de pedirlas. |
| 2026-10-01 | **Tener llaves de Bold no es poder cobrar: `PAGOS_ACTIVOS` es un interruptor aparte y nace en `0`.** Con el dominio real sirviendo el sitio, unas llaves de pruebas significan un huésped real pasando por una pasarela que no cobra; y un evento de ese sandbox confirmaría la reserva **sin pago**. Es lo último que se enciende, y se enciende junto a las llaves de producción. |
| 2026-10-01 | **El webhook usa `ambienteDeclarado()`, no `modoBold()`, para decidir si puede confirmar.** `modoBold()` devuelve `produccion` a propósito cuando `VERCEL_ENV=production`, para no firmar nunca con la llave vacía; aquí hace falta lo contrario, saber qué llaves dice la configuración que hay. Pruebas declaradas + producción = evento registrado y **cero cambios** en `pagos` y `reservas`. |
| 2026-09-30 | **Las redirecciones de `next.config` GANAN a las rutas del App Router**, así que una `source` que coincida con una página existente la deja inalcanzable sin ningún aviso en el build. Con barra final son dos saltos (308 de normalización + 301) y se acepta: quitarlos exigiría `skipTrailingSlashRedirect: true`, que dejaría cada página del sitio accesible con y sin barra —contenido duplicado— a cambio de ahorrar un salto que Google sigue sin problema. |
| 2026-10-02 | ⚠ **El webhook NO puede ser la única vía de confirmación.** Se hicieron pagos reales en el sandbox de Bold y llegaron **cero** eventos: `LF-2026-0001` se canceló sola al vencer su hold con el pago hecho. En producción eso es un huésped que paga y se queda sin reserva. Nace la **reconciliación** (`src/lib/pagos/reconciliar.ts`): le preguntamos nosotros a la API de Bold con nuestra llave desde la página de retorno, el cron diario y un botón del panel. |
| 2026-10-02 | **La transición vive en UN solo módulo, `src/lib/pagos/aplicar-estado.ts`.** Dos caminos que escriben una confirmación de pago tienen que escribir lo mismo hasta la última columna, y la única forma de garantizarlo es que sea literalmente el mismo código. Lo único que los distingue es `diferir`: el webhook manda correos y calendario a `after()` porque Bold exige responder en dos segundos; la reconciliación los espera, porque quien la llamó quiere saber si el correo salió. |
| 2026-10-02 | **Preguntarle a la API de Bold NO contradice el requisito 2 de la auditoría.** Lo que ese requisito prohíbe es creerle a la URL del navegador (`?bold-tx-status=approved` lo escribe cualquiera). Consultar la transacción con nuestra llave de identidad es la misma fuente de verdad que ya exige su requisito 5. De la URL solo se toma la **referencia**, que no es una afirmación sino una pregunta. |
| 2026-10-02 | **La reconciliación no pregunta por un pago que ya está en un estado final y coherente.** Se lee la base primero: así reconciliar dos veces no cuesta ni una llamada de red, una referencia inventada no convierte el sitio en un ariete contra la API de Bold, y una página recargada cien veces no escribe nada. Consecuencia aceptada: **una anulación posterior (`VOIDED`) solo llega por webhook**, no por reconciliación. |
| 2026-10-02 | ⚠ **Una reserva con un pago aprobado NO se cancela nunca por vencimiento** (migración 016). Y los `PROCESSING`/`PENDING` tienen 15 minutos de gracia desde su `actualizado_at`, no desde su creación: así se protege al cobro que alguien acaba de comprobar sin proteger al checkout abandonado, que tiene que liberar sus noches. La gracia es corta porque `reservas_sin_solapamiento` no puede leer `now()`: una `pendiente` sin cancelar sigue apartando fechas, y alargarla produciría noches que se ofrecen y no se pueden comprar. |
| 2026-10-02 | **En el cron, reconciliar va ANTES de barrer.** Si el barrido corriera primero cancelaría una reserva cuyo pago está aprobado y habría que resucitarla después, con el riesgo de que entretanto alguien comprara esas noches. Invertir las dos llamadas de `/api/salud` reintroduce el fallo que todo esto arregla. |
| 2026-10-02 | **Si una reserva pagada llegó a cancelarse, la reconciliación la RESUCITA** y lo deja anotado en `notas` (anexado, nunca sobrescrito). El único desenlace que no se puede resolver con código es el 23P01: pago aprobado y fechas ya vendidas a otro. Eso se reporta con todas las letras —`pagos_requieren_atencion` en `/api/salud` y un mensaje en el panel— porque son dos personas y una cabaña. |
| 2026-10-02 | **Los correos llevan `Reply-To` al Gmail del hotel (`EMAIL_REPLY_TO`).** `reservas@lafincaecohotel.com` es una identidad de ENVÍO de Resend: detrás no hay buzón que nadie lea. Sin `Reply-To`, la respuesta del huésped («¿puedo llegar a las 9?») se pierde y él cree que avisó. Un correo perdido de un huésped es peor que un correo que no se envió. |
| 2026-10-02 | **Por el sitio no se reserva para hoy: la llegada más temprana es mañana** (`DIAS_MINIMOS_ANTELACION = 1` en `src/lib/reserva/noches.ts`). Vale para hospedaje y Día de Calma. El calendario solo es ayuda visual; quien decide es el servidor (`cotizarEnServidor()` y `/api/reservar`), con el «hoy» de `America/Bogota`. |
| 2026-10-02 | ⚠ **La antelación mínima es una regla del SITIO PÚBLICO, nunca del panel.** El equipo del hotel tiene que poder registrar una reserva de hoy —las de WhatsApp a última hora, con el huésped ya en camino— y bloquear el día en curso. Por eso el alta manual no pasa por `cotizarEnServidor()` y su formulario sigue trayendo hoy por defecto. Aplicarle la constante del público le costaría al hotel las reservas de última hora. |
| 2026-10-03 | ⚠ **`calendarList.list` NO dice a qué calendarios tiene acceso una cuenta de servicio.** Devuelve sus *suscripciones*, no sus *permisos*: compartir un calendario con ella concede la ACL, pero nadie «acepta» la invitación —una cuenta de servicio no tiene interfaz donde hacerlo—, así que su `calendarList` se queda **vacía** aunque lea los siete calendarios del hotel sin un fallo. El diagnóstico del panel dependía de esa lista y decía «no veo ningún calendario» con todo funcionando. **La verdad es `events.list`**, que además trae el nombre (`summary`) y el permiso real (`accessRole`) en la misma respuesta. `calendarList` solo sirve para descubrir identificadores que nadie nos ha dado, y su silencio no prueba nada. |
| 2026-10-03 | **De los siete calendarios del hotel, solo UNO está compartido con permiso de escritura** («Reservas Finca Villarreal - Sitio Web», `65f3342a…`, `writer`); el general y los cinco por cabaña van en `reader`. Es la configuración correcta, pero hace real una distinción que antes era teórica: si ese permiso se cayera, cada reserva del panel se quedaría sin apuntar y nadie se enteraría. Por eso el sitio lo comprueba y lo avisa en la franja de estado del panel («No puede apuntar reservas»), sin esperar a la primera reserva perdida. |
| 2026-10-05 | **Las temporadas son una tabla `temporadas` con sus precios como filas de `tarifas`, y las fechas viven en UN sitio.** La fila de precio lleva copia de alcance y fechas solo para que la exclusión gist (alcance, plan, noches) funcione, y esa copia está atada por llave compuesta `match full` + `on update cascade`: no puede desincronizarse. Se descartó usar solo `tarifas.vigencia` (sin nombre ni «todas las cabañas», y una copia de las fechas por plan) y una tabla de precios aparte (habría que reimplementar la exclusión con un trigger). |
| 2026-10-05 | ⚠ **`precioDeNoche()` (`src/lib/reserva/cotizacion.ts`) es la ÚNICA función que pone precio a una noche.** Precedencia: temporada de la cabaña > de todas > base, plan por plan. La temporada cambia el precio, nunca el plan; y se cuelga solo de tarifas base existentes, así que no puede habilitar un plan que la cabaña no tiene. La usan el motor, `/api/reservar`, las tarjetas de `/reservar` y la reserva manual del panel. |
| 2026-10-05 | **Check-out a las 12:00 m. y hora límite de llegada a las 7:00 p. m.** (confirmado por el hotel). Se escribe «12:00 m.» o «mediodía», nunca «12:00 p. m.». Fuente única en código: `SITIO.estadia` (24 h para el JSON-LD y `texto` para el huésped). |

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



### 2026-09-15 — Quinta ronda: la portada más corta, el pie sin costura y el calendario por encima

Nueve encargos de Cesar sobre el sitio ya publicado
(`website-la-finca-ecohotel.vercel.app`). Ninguno es de arquitectura: son cosas
que se ven, más dos textos que ya no describían lo que el visitante encuentra.

#### La «línea blanca» del pie era una clase, no un hueco subpíxel

El pie llevaba `border-t border-petroleo-800/40` sobre `bg-petroleo-900`: una
fila de píxeles de `#084a48` al 40 % sobre `#0a3c3b`, es decir **más clara que
el propio pie**, justo en la costura con el corte orgánico de arriba. Medida con
CDP: `rgb(9,66,64)` contra `rgb(10,60,59)` del resto.

Y no la tapaba el `-mb-px` que `CorteOrganico` trae para esto: **la sección que
contiene la onda tiene `overflow-hidden`, así que ese píxel de solape se
recorta**. Se quitó el borde —un pie oscuro pegado a una onda del mismo color no
necesita separador—, se le puso `-mt-px` al pie y los dos `<svg>` del divisor
van con `shape-rendering="geometricPrecision"`. Verificado píxel a píxel a 1440
y 390 px en portada, `/conocenos`, `/reservar` y `/alojamientos`: una sola tinta
en las diez filas alrededor de la costura.

#### El calendario lo tapaba la sección siguiente, y era un contexto de apilamiento

El panel del calendario cuelga del campo con `absolute z-50`, pero ese 50 se
cuenta **dentro del contexto que crea el `isolate` del hero**. La sección de
«Bienvenidos» es `relative` con `z-index: auto`, así que se pinta después por
orden del documento y se comía el calendario de la mitad hacia abajo.
Comprobado con `elementFromPoint` contra el sitio publicado: a 1440×700 el punto
medio del panel lo ocupaba `bg-crema-50 … seccion-diferida`, y el punto bajo, la
propia fotografía de la sección.

El hero pasa a `z-30`. Queda por encima de todo lo que viene detrás y por debajo
de la cápsula del nav (`z-50` fija) y del botón de WhatsApp (`z-40`), que es el
orden correcto. Verificado a 1440×700, 1440×900 y 1024×700: el panel entero
responde. En móvil la hoja va de y=182 a y=678 con el nav acabando en 76: ni el
nav ni el FAB la tocan, y tocar fuera sigue cerrándola.

#### La portada, una sección más corta

- **Fuera «Nuestra esencia»** (la banda de verde claro con las tres fotos y las
  frases del manual). Era la única sección que no enseña el hotel, no da un
  precio y no lleva a reservar; lo que contaba es el trabajo de «Sobre nosotros»
  en `/conocenos`. La clave `home.esencia` salió con ella del código, del panel y
  de `docs/CMS_CLAVES.md` —no la usaba ninguna otra página— y el seed la borra de
  la tabla (bloque nuevo «CLAVES RETIRADAS»). **Cero huérfanos en el bucket**:
  sus tres fotos seguían usándose en la galería, en las instalaciones de
  Conócenos y en la ficha de la Cabaña 03 (`npm run imagenes:limpiar`).
- La costura crema → blanco que hacían las dos ondas de esa banda la cose ahora
  un banco de niebla en el borde superior de la sección de Instagram.
- **Experiencias con foto.** Eran dos tarjetas de puro texto con un icono de
  hoja, en una portada donde todo lo demás son fotografías. Ahora son **tres**,
  cada una con su imagen, alineadas arriba y abajo (`items-stretch` + foto
  `aspect-4/3` con `shrink-0` y cuerpo `flex-1`) y con la regla del sello:
  `CLASE_FOTO_CON_FLAG` y la curva grande en la esquina superior IZQUIERDA.

#### El fondue es una experiencia, no un adicional

Cesar pidió «una foto por experiencia (Aniversario, Cumpleaños, Fondue)» y el
fondue no salía: estaba en `extras` con `tipo = 'adicional'`, así que caía en la
lista de texto de `/experiencias` junto a la segunda mascota y no aparecía en la
portada. Es una celebración para dos con precio por estadía, igual que las otras
dos, así que **el cambio se hizo en los datos** (`extras.tipo`), no en el código:
es reversible desde el panel y no hay ninguna regla escrita contra el nombre
«Fondue».

⚠️ **Del fondue no existe foto.** Ni en el Drive ni en el sitio viejo. Se publica
con una de **ambiente** —el comedor para dos de la Cabaña 05 frente al
ventanal—, anotado en `FOTOS_EXPERIENCIAS` (`src/lib/fotos.ts`), en el seed y en
`docs/CMS_CLAVES.md`. **Pedírsela a Juan Camilo.** Aniversario y Cumpleaños sí
llevan su foto real.

#### «Sobre nosotros»: dos fotos cuadradas con el texto

La columna derecha llevaba una sola foto con proporción fija y acababa mucho
antes que la de texto. Ahora son dos apiladas en una columna `h-full` con
`grow-[1.45]` y `grow` sobre base cero: el alto lo fija la columna de al lado.
Medido: **desfase 0 px arriba y 0 px abajo a 1024, 1440 y 1920**; a 768 y 390 se
apilan y recuperan su proporción.

⚠️ **La segunda foto TIENE que ser apaisada.** La primera elegida fue la fachada
de la Cabaña 03 (1086×1231) y en una caja ancha y baja se quedó en una franja de
pared blanca. Entró el jacuzzi de la Cabaña 01 (1448×923), cuya franja superior
—montañas, nubes y guadua— es justo lo que cuenta el texto de al lado. Las zonas
comunes no servían: las ocho salen más abajo, en las instalaciones. Clave nueva
del CMS: `lugar.imagen_secundaria` + `imagen_secundaria_alt`, con su campo en el
panel. Vacía, el bloque vuelve a una sola foto y sigue alineado.

#### Los tres pasos de `/reservar` no describían el flujo

Decían «1. Elige tu cabaña · 2. Elige tu plan · 3. Confirmamos y reservas con el
50 %», que es el flujo de antes del motor de precios noche a noche. El selector
pregunta **fechas → cabaña → plan**, y el plan solo si la estadía tiene noches de
fin de semana o festivos. Reescritos los tres pasos y la entrada; el remate del
50 % queda al final del paso 3, porque como cuarto paso mentía: en pantalla no
hay cuarto paso. Actualizados el respaldo, el seed y **la fila real de la base**
(la del CMS gana sobre el código). De paso, el cierre de `/experiencias` decía
«elige primero la cabaña y el plan» y ahora dice fechas.

#### El desplegable de cabañas

Sin `appearance-none` el navegador dibuja su propio control —rectángulo gris de
esquinas rectas— al lado de un campo de fechas con radio de 12 px y borde crema.
Ahora lleva la piel del sitio (radio, borde, alto de 49 px exactamente igual que
el campo de fechas, icono de cabaña a la izquierda y chevron propio en SVG a la
derecha) y **sigue siendo un `<select>` nativo**: es lo que abre la rueda a
pantalla completa en un teléfono y lo que cualquier lector de pantalla ya sabe
anunciar. El chevron va en un `<span>` hermano con `pointer-events-none`.

Se retiró además **«Sin intermediarios ni comisiones»** (única aparición en todo
el repo, en el contador de noches del módulo). Sin fechas, ese hueco queda vacío.

#### Las ondas en el teléfono

`preserveAspectRatio="none"` estira el perfil al ancho del visor: a 1440 px las
cuatro o cinco crestas de `cresta` se leen como una ladera; a 390 px el mismo
dibujo se comprime a menos de un tercio y queda un rizado de cenefa. **La
solución no es escalar, es dibujar otro perfil**: `PERFILES_MOVIL` en un
`viewBox` de 480 —mismo alto de 120, así que la amplitud relativa se conserva—
con **una sola ondulación** cada uno y la cresta descolocada. Se eligen por CSS
(`sm:hidden` / `hidden sm:block`), no con una media query en JavaScript, que
daría un primer pintado con el perfil equivocado. Verificado: a 390 px los cinco
cortes de la portada y los dos de `/conocenos` pintan solo el `viewBox` de 480.

#### Botones centrados a 390 px

Auditoría por CDP en once páginas buscando botones no centrados en su bloque.
Corregidos:

| Dónde | Antes | Ahora |
|---|---|---|
| Portada · «Síguenos en Instagram» | `items-start` | centrado; desde `sm`, a la izquierda |
| Portada · «Reservar ahora» del cierre | bloque `items-start` | bloque centrado con `text-center`; desde `sm`, a la izquierda |
| `/conocenos` · «Reservar ahora» (COP16) | `self-start` | `self-center sm:self-start` |
| `/conocenos` · «Cómo llegar» + «Ver la ficha» | fila pegada a la izquierda | `justify-center sm:justify-start` |
| `/alojamientos` · «Ver la cabaña» | `ml-auto`: saltaba de línea y quedaba solo contra el borde derecho | `w-full justify-center sm:ml-auto sm:w-auto` |

El «Conócenos» de «Nuestra esencia» también salía en la lista; desapareció con la
sección. Tras la pasada no queda ningún botón descolgado a 390 px.

#### Verificación

- `tsc --noEmit`, `npm run lint` y `npm run build` limpios. **62 pruebas en
  verde.** Las rutas públicas siguen estáticas con ISR de una hora.
- CDP a **1440 y 390 px** de las nueve páginas públicas: **cero desbordes
  horizontales y cero errores de consola**. Más el calendario abierto a tres
  alturas de ventana, el módulo de reserva, la costura del pie en cuatro páginas
  y los siete cortes orgánicos a 390 px.
- **Panel con sesión real** (contraseña del usuario de pruebas rotada para la
  comprobación y rotada de nuevo a un valor aleatorio al terminar):
  `/admin/contenido`, «Portada» —ya sin el bloque «Naturaleza»—, «Conócenos»
  —con el campo nuevo de segunda foto—, «Página de reserva», «Página de
  experiencias» y el módulo de Experiencias, que ahora lista **3**. Todo 200,
  **cero errores de consola**.
- **Bucket sin huérfanos**: `npm run imagenes:limpiar` da 0 objetos y 0 MB. No se
  subió ni se borró una sola imagen: las fotos nuevas de Experiencias y de
  Conócenos ya estaban publicadas y tienen sus variantes en `v/`.

#### Lo que queda anotado

- **Falta una foto real del fondue** (hoy, una de ambiente).
- La hoja del calendario en móvil **no se ancla al borde inferior de la pantalla**
  aunque el código diga `fixed … bottom-3`: el `backdrop-blur-xl` del módulo de
  reserva crea bloque contenedor para los descendientes `fixed`, así que la hoja
  se posiciona respecto al formulario. Se ve entera, nadie la tapa y tocar fuera
  la cierra, así que se deja; si algún día hace falta la hoja inferior de verdad,
  el arreglo es sacar el desenfoque a una capa de fondo o portar el panel a
  `document.body`.

### 2026-09-15 — Visor de galería, fotos de Salón/Restaurante y verificación del reel

Tres encargos sueltos (bug prioritario + dos retoques de contenido), en paralelo
con la ronda del motor de reservas de otro agente — solo se tocó
`src/components/ui/galeria.tsx`, `src/lib/contenido.ts`,
`src/components/paginas/conocenos.tsx` y el módulo de contenido del panel.

- **El visor de fotos (cabañas y `/galeria`) tenía DOS bugs distintos**, los
  dos por dejar `next/image` por `<Foto>`/`<img>`:
  1. `max-h-full`/`max-w-full` (porcentajes) sobre un hijo de un contenedor
     `flex-1` no resolvían de forma fiable: la foto se desbordaba por arriba y
     por abajo en escritorio y quedaba diminuta en el teléfono. Arreglado con
     límites en `vh`/`vw` (relativos al viewport, no al contenedor).
  2. **El de verdad grave, y solo en `/galeria`:** casi toda sección del sitio
     usa `<Seccion diferida>` (`content-visibility: auto` por defecto), y esa
     propiedad —parte de la especificación de `contain`, no un bug de
     Chrome— convierte a la sección en el CONTENEDOR DE POSICIONAMIENTO de
     cualquier descendiente `position: fixed`. El visor dejaba de anclarse a
     la ventana y pasaba a ocupar el alto de TODA la sección (miles de
     píxeles): la foto se pintaba muy por debajo de lo visible, en la
     práctica invisible. Es la MISMA familia de bug que ya dejó anotada la
     ronda anterior sobre la hoja del calendario (`backdrop-blur` en vez de
     `content-visibility`) — mismo síntoma, mismo arreglo: sacar el diálogo
     a un portal (`createPortal` a `document.body`). La ficha de cabaña no lo
     sufría (su galería no vive en una sección diferida), pero el portal la
     deja igual de blindada. **Vale la pena revisar si otros `position: fixed`
     del sitio —el propio calendario, algún modal futuro— conviene portarlos
     también en vez de confiar en que su sección no sea `diferida`.**
  - Verificado en Chrome headless (Playwright + Chrome del sistema, este
    entorno no tenía navegador de agente) a 1440×900 y 390×844, fotos
    horizontales y verticales, flechas de teclado y Escape.
- **Instalaciones de Conócenos:** Salón multifuncional pasa a usar la foto que
  tenía Restaurante (el deck techado con el comedor de vidrio), encuadrada con
  un `imagen_posicion: "center bottom"` **nuevo campo opcional** en
  `Instalacion` (documentado en `docs/CMS_CLAVES.md`, editable desde el panel)
  para enseñar la mesa y las sillas en vez del techo de guadua — de paso saca
  de cuadro el sello de marca en vez de cortarlo. Restaurante pasa a usar la
  foto del hero de la portada (el corredor techado, ya recortada sin sello).
  Cambiado en el CÓDIGO (respaldo) y en la **fila real de Supabase** vía el
  panel con sesión, porque `lugar` ya tenía fila propia y el respaldo solo
  aplica si la fila falta. `npm run imagenes:limpiar`: 0 huérfanos — las dos
  fotos siguen usándose en la galería general y en el cierre de página
  (`FOTO.atardecer`).
- **El campo del reel de Instagram ya existía** (`home.instagram.reel_url`,
  con `direccionEmbebido()`, ayuda en español, documentado en
  `docs/CMS_CLAVES.md` desde una ronda anterior) — no hubo que añadirlo, solo
  probarlo: guardado con sesión real a un enlace de prueba, verificado que
  cambia en la portada, y restaurado al valor original
  (`https://www.instagram.com/reel/DbO8x0SxnFX/`).
- `tsc`, `eslint`, `next build` y el bucket, en verde. No se corrió Lighthouse
  (no tocaba rendimiento) ni la batería completa de capturas de las nueve
  páginas — verificación acotada a lo que cambió, como pide una ronda con
  varios encargos sueltos en paralelo con otro agente.

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
- [ ] **Leer el Google Calendar «la finca»** para la disponibilidad real: es el
      calendario donde el equipo anota hoy a mano lo que llega por WhatsApp. El
      modelo ya lo espera (`origen = google_calendar` + `referencia_externa`);
      falta la integración. La Finca **no publica en Airbnb ni en Booking**, así
      que no hace falta exportar iCal.

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


## 2026-09-15 · Fase 3 — Día de Calma, experiencias por noche y anticipo

Encargo de Cesar con datos nuevos del cliente: el **Día de Calma tiene un cupo
de 10 personas por día**, y el calendario general se cruzará algún día con el
**Google Calendar** que el equipo llena a mano desde WhatsApp.

### El modelo (migración 009)

| Cambio | Para qué |
|---|---|
| `reservas.tipo` ('hospedaje' \| 'dia') | Las dos formas de vender, en la misma tabla. |
| `reservas_coherencia_tipo` | Un hospedaje **siempre** tiene cabaña; un día **nunca** la tiene y dura `[fecha, fecha+1)`. |
| Trigger `reservas_cupo_dia_de_calma` | Rechaza la persona 11 de un día con un mensaje en español y el SQLSTATE propio `LF010`. |
| `reserva_extras.noche` + PK nueva + índice `nulls not distinct` | El mismo extra en varias noches; `null` = toda la estadía. |
| `porcentaje_anticipo` (50 \| 100) y `monto_anticipo` | Cuánto se paga al reservar, congelado. |
| `origen = 'google_calendar'` y `referencia_externa` única | La costura para la sincronización futura. **No implementada.** |

`npm run db:probar` (nuevo) verifica **18 reglas contra la base real** dentro de
una transacción que termina en `rollback`: el cupo (incluido al editar y al
cancelar), que un día no puede durar dos, que una reserva de día **no bloquea
cabañas** y que dos hospedajes que se cruzan sí siguen chocando, la unicidad de
los extras por noche y el anticipo.

### El motor público

- **Una sola fecha, sin salida → Día de Calma.** El calendario ofrece «Vengo
  solo ese día, sin dormir»; el módulo cambia de modo, explica el horario
  (10:00 a. m. – 5:00 p. m.), lo que incluye y que **no hay hospedaje**, y
  enseña **«Quedan N cupos para ese día»** consultando `/api/dia-de-calma/cupo`.
  Solo deja elegir hasta ese número de personas. Se vuelve con «Prefiero
  quedarme a dormir». Nunca aparece la palabra «pasadía».
- **Paso 4 — experiencias por noche.** Una sección por noche de la estadía, con
  cantidad, y un bloque «Para toda la estadía» para los adicionales. El resumen
  las agrupa igual y el mensaje de WhatsApp las lleva con su fecha.
- **Paso 5 — anticipo.** 50 % o 100 %, con el monto de cada opción a la vista y
  la explicación del link de pago. El botón sigue llevando a WhatsApp: la
  costura de la pasarela está marcada con `AQUÍ VA EL COBRO DE WOMPI`.

### El panel

- El calendario del mes tiene una **fila «Día de Calma»** bajo las cinco
  cabañas: `4/10` por día, con el color subiendo según se llena, y su entrada
  en la leyenda.
- El **alta manual** pregunta primero qué se vendió. En modo día desaparecen la
  cabaña y la salida, el plan se limita a los de día, se ve el cupo («0 de 10
  cupos ya ocupados ese día») y el aviso sale **antes** de intentar guardar.
- La **ficha** distingue las dos: sin cabaña, con el día, las personas sobre el
  cupo, las experiencias agrupadas por noche y el anticipo elegido.

### Verificación

- `tsc --noEmit`, `eslint` y **91 pruebas** en verde (29 nuevas: desglose con
  extras por noche, anticipo que siempre suma el total, cupo y cotización del
  día sin inventar precios).
- `npm run db:probar`: 18 comprobaciones contra la base, con `rollback`.
- **CDP contra localhost** a 1440 y 390 px: `/reservar` en los dos modos (Día de
  Calma con cupo y hospedaje con los cinco pasos), sin desbordes horizontales y
  **sin un solo error de consola**; el mensaje de WhatsApp sale completo, con el
  desglose noche a noche, las experiencias con su fecha y el anticipo.
- **Panel con sesión real**: se creó un Día de Calma de prueba de 4 personas, se
  comprobó que un segundo de 8 se rechaza («…ya hay 4. Quedan 6 cupos»), se vio
  la fila del calendario en `4/10` y **se borró la reserva**: la base queda con
  **0 reservas**, como estaba.

### Lo que queda anotado

- **Falta que Amapola confirme**: si el Día de Calma pide anticipo, su política
  de cancelación y si se puede añadir jacuzzi. Mientras tanto el sitio no
  muestra ninguna cifra de eso. (El valor por persona adicional dejó de hacer
  falta el 2026-09-15: el plan es para una o dos personas.)
- **La sincronización con Google Calendar no está hecha**: solo el modelo.
- El `npm run build` de esta sesión no pudo terminar en la máquina (se quedó sin
  memoria con otro agente compilando en paralelo); `tsc`, `eslint` y el `next
  dev` sí corrieron limpios. **Conviene repetir el build antes de desplegar.**

### 2026-09-15 — Sexta ronda: decisiones nuevas del cliente y pulido de `/reservar`

Ronda corta pero que toca el motor. Cesar trajo cuatro decisiones cerradas del
hotel y cinco arreglos del sitio.

#### Lo que decidió el cliente

- **La víspera de un festivo cuenta como fin de semana.** `CONTAR_VISPERA` pasa
  de `false` a `true` en `src/lib/reserva/noches.ts` y deja de ser un `TODO`. De
  esa constante viven el calendario, el desglose, el total y el mensaje de
  WhatsApp, así que el cambio es de una línea. De paso se borró la **copia**
  que vivía en `src/lib/festivos-colombia.ts` (`tipoDeNoche`, `TipoDeNoche`,
  `etiquetaTipoDeNoche` y su propio `VISPERA_CUENTA_COMO_FIN_DE_SEMANA`): era
  código muerto —solo lo usaba su propia prueba— y un segundo interruptor para
  la misma regla. Ese módulo ahora dice qué días son festivos y nada más.
- **El Día de Calma es para una o dos personas.** Desaparece la pregunta por la
  «persona adicional» (`MAX_PERSONAS_POR_RESERVA_DIA = 2`). El **cupo de 10 por
  día sigue intacto**: es el de toda la finca y lo llenan varias reservas. Son
  dos límites distintos y el sitio lo dice así: «Cada solicitud es para una o
  dos personas, y la finca recibe máximo 10 personas por día».
- **La Finca no publica en Airbnb ni en Booking.** Se retiraron las tres
  menciones que quedaban (`docs/SOLICITUD_REQUERIMIENTOS.md`, el pendiente de
  iCal de esta memoria y la pregunta abierta de `DATOS_CLIENTE.md`).
- **El calendario del hotel es un Google Calendar llamado «la finca»**, que
  nuestro sistema **leerá** para la disponibilidad real. Sigue sin implementarse
  —el modelo ya lo espera— y el nombre del bot (Whatsfy) desaparece de los
  textos: no era el calendario, era quien anotaba en él.

#### Los cambios del sitio

1. **Paso 4 sin solapes.** Cada noche era un `<fieldset>` con su `<legend>`
   dentro de una tarjeta con fondo, `p-4` y `ring`. El navegador saca el
   `legend` del flujo y lo pinta **sobre el borde superior** del fieldset: el
   título quedaba montado en el filo de la tarjeta y, con dos líneas a 390 px,
   fuera de ella. Ahora son `<div role="group" aria-labelledby>` con un `<p>`
   dentro: el lector de pantalla anuncia el grupo igual y el motor de
   maquetación lo trata como un div cualquiera.
2. **Paso 5: el anticipo es un deslizante de 50 a 100 %**, de cinco en cinco,
   con el porcentaje y el monto en COP en vivo y `aria-valuetext` («75 por
   ciento, $1.342.500 ahora»), que es lo que hace falta oír; «75» a secas no
   dice nada. Es un `<input type="range">` de verdad —teclado, Inicio/Fin,
   arrastre táctil, rol `slider` gratis— repintado con la marca
   (`.deslizante-marca` en `globals.css`; el relleno del carril es un degradado
   con el corte en la variable `--recorrido`, así no hay que tocar el DOM al
   arrastrar). `total.ts` gana `ANTICIPO_MINIMO/MAXIMO`, `PASO_ANTICIPO`,
   `normalizarPorcentajeAnticipo()` y `escalaDeAnticipo()`; el tipo
   `PorcentajeAnticipo` deja de ser la unión `50 | 100`. **Migración 010**:
   el check pasa a `between 50 and 100` (es una ampliación, ninguna fila
   existente deja de valer) y se añade
   `reservas_dia_maximo_dos_personas`. El panel transcribe el porcentaje
   pactado con un desplegable de la misma escala —allí se anota una cifra ya
   decidida, y un desplegable se rellena antes con el teclado—.
3. **La primera sección de `/reservar` explica los CINCO pasos**, no tres:
   faltaban las experiencias por noche y cuánto se paga hoy, que es justo lo
   último que alguien quiere saber antes de pulsar. Para que la sección no
   creciera de alto, las tarjetas van en **dos columnas** y más densas (`p-4`,
   círculo de 1.75rem, texto de 13 px) y los títulos perdieron el número: la
   tarjeta ya lleva su círculo numerado y «1» junto a «1. Tus fechas» se leía
   como un once. La quinta, impar, ocupa las dos columnas.
4. **El video de la COP16 redondea la esquina superior derecha**, no la
   inferior izquierda. La regla de no tocar esa esquina protege el sello de
   marca de las **fotografías** del bucket; aquí es un video y su póster es un
   fotograma propio, sin sello.
5. **El FAQ lleva las cuatro texturas del manual**: rama botánica en los **dos**
   laterales (dos por lado, a distinta altura y escala, una en espejo — una
   sola por borde se leía como una calcomanía), patrón de colibríes al 40 % de
   su opacidad ya baja, un par de colibríes sueltos y el resplandor de luz. Todo
   por debajo del contenido y escondido bajo `lg`: en el teléfono el ancho es
   del texto. Las tarjetas del acordeón siguen en blanco sólido, así que el
   contraste del texto no cambia ni un punto.

Además se ajustaron los textos que prometían «anticipo del 50 %» a secas
(`src/lib/legal.ts`, la pregunta de pagos del FAQ y §5 de `DATOS_CLIENTE.md`):
ahora el 50 % es el **mínimo** y el huésped puede adelantar más.

#### Verificación

- `tsc --noEmit`, `eslint` (solo la advertencia preexistente de
  `scripts/importar-fotos-drive.mjs`) y **96 pruebas** en verde: siete nuevas
  del deslizante —la escala de cinco en cinco, el redondeo al peso con
  `anticipo + saldo === total`, y que **nada de lo que sale de
  `normalizarPorcentajeAnticipo()` puede ser rechazado por el check de la
  base**— más las de la víspera y las del tope de dos personas del día.
- `npm run build` limpio; las 18 rutas públicas siguen estáticas con ISR de 1 h.
- `npm run db:aplicar`: migración 010 aplicada y seed de contenido recargado
  (los cinco pasos viven en el CMS, así que sin recargarlo el sitio seguía
  pintando tres).
- **Capturas contra `localhost:3000`** (nunca contra Vercel) a **1440 y 390 px**
  de `/reservar` vacío, con estadía de cuatro noches y en modo Día de Calma,
  `/conocenos` y `/faq`, con un **detector de solapes** que compara los
  rectángulos de todo el contenido no posicionado: **cero solapes** en las cinco
  páginas y los dos anchos. (El detector marca como solape el contenido de un
  `<details>` cerrado —Chrome le da rectángulo— y la cápsula flotante del nav;
  los dos casos están filtrados o comprobados a mano en la captura.)
- El deslizante, probado **con el teclado**: cinco flechas derecha → 75 % y
  `$1.342.500`; tecla Fin → 100 % y el mensaje de WhatsApp dice «Quiero pagar el
  100 % ahora: $1.790.000».
- **La base quedó sin datos de prueba**: no se creó ninguna reserva.

### 2026-09-16 — Séptima ronda: el Día de Calma se paga por el sitio, usuarios del panel y legales editables

Última ronda antes de la revisión del cliente. Tres encargos de Cesar y uno que
llegó a mitad de camino.

#### 1. El Día de Calma se reserva y se paga como el hospedaje

Hasta hoy el modo de día terminaba en «el anticipo te lo confirmamos por
WhatsApp»: dos cierres distintos para el mismo hotel y, el día que entre Wompi,
dos cobros que cablear. Ahora recorre **el mismo cierre**:

- Resumen con el total ($250.000 para una o dos personas), pasado por el mismo
  `resumenDePago()` que una estadía.
- **Paso de anticipo con el deslizante de 50 a 100 %**, con el mismo componente
  (`DeslizanteAnticipo`), que solo cambia la etiqueta del total: «Total del día»
  en vez de «Total de la estadía».
- El mismo botón final, y **una sola costura de Wompi**: el enlace lee
  `pagoActual`, que es el resumen del modo en curso. Cuando existan las llaves,
  el cobro se escribe una vez y sirve para los dos tipos.
- **Adicionales «para el día»**: sin noches no hay experiencias por noche, pero
  los adicionales sí caben y viajan con `noche = null`, exactamente como los de
  «toda la estadía» en el hospedaje (migración 009). La segunda mascota aparece
  ahora también en el Día de Calma.
- El mensaje de WhatsApp del día llegó a la par: enumera los adicionales y dice
  cuánto quiere adelantar y cuánto queda.
- `porcentaje_anticipo` y `monto_anticipo` ya se persistían igual en las
  reservas `tipo = 'dia'` del panel (la acción los calcula fuera de la rama de
  `esDia`); se verificó y se dejó anotado.

El porcentaje mínimo del Día de Calma **sigue sin confirmar**. Se aplica la
regla del hospedaje —50 %— porque es la única que el hotel ha publicado, y se
dice en pantalla en vez de dejar el cierre a medias. El `TODO` está en
`src/lib/reserva/dia-de-calma.ts` y en §3 y §9 de `docs/DATOS_CLIENTE.md`.

#### 2. El paso del plan menciona el Día de Calma

Tarjeta discreta al final del paso 3, con el horario y el precio, y un botón que
**cambia al modo de día conservando la fecha de llegada** como el día elegido
(«Verlo para el 16 de oct de 2026»). Nunca la palabra «pasadía».

El paso del plan solo existe si la estadía toca fin de semana o festivo, así que
la misma tarjeta se pinta suelta —en el mismo sitio del flujo— cuando ese paso
no aparece. Si no, quien eligiera de lunes a jueves nunca se enteraría de que el
plan de día existe.

#### 3. Usuarios del panel

Nueva sección **`/admin/usuarios`**, con dos roles: **propietario** (todo el
panel más las cuentas) y **equipo** (todo el panel menos Usuarios). La pantalla
explica en una frase qué puede hacer cada uno.

- Cuentas creadas con la Admin API: **`fincavillarreal@gmail.com`**
  (`rol: 'propietario'`, `email_confirm: true`) y la de pruebas
  `panel@lafincaecohotel.com`, que pasó a `rol: 'equipo'` **sin tocarle la
  contraseña**.
- Funciones: listar (correo, rol, último acceso, fecha de creación), crear
  (correo + contraseña temporal de mínimo 10 caracteres + rol), cambiar de rol,
  restablecer contraseña y eliminar.
- Reglas, **en el servidor**: nadie se elimina a sí mismo ni se cambia su propio
  rol, y siempre queda al menos un propietario (ni quitándole el rol ni
  eliminándolo). Correos validados y normalizados a minúsculas. Los errores de
  Supabase se traducen al español («Ya hay una cuenta con ese correo…»).
- Tres puertas, como el resto del panel: la navegación no le pinta el enlace al
  `equipo` (comodidad), la página comprueba el rol **antes de leer nada**
  —quien no es propietario no recibe ni un correo en la carga útil— y cada
  Server Action lo vuelve a comprobar, porque un POST directo no pasa por
  ninguna pantalla.
- `service_role` **solo** dentro de Server Actions: `src/lib/admin/usuarios.ts`
  empieza por `import "server-only"`, y el tipo `UsuarioPanel` vive en
  `src/lib/admin/tipos.ts` para que el componente de cliente no tenga ni que
  rozar ese módulo.

#### 4. Los cuatro documentos legales pasan al CMS (revierte una decisión)

**Se revierte la decisión del 2026-09-02** («los textos legales viven en código,
no en el CMS: son documentos jurídicos y deben versionarse con fecha de
revisión, no editarse sin historial desde un panel»). Lo pidió Cesar el
2026-09-16, y el motivo es bueno: el sitio entra a revisión legal con Amapola y
cada vuelta de esa revisión era, si no, un cambio de código y un despliegue.

Lo que se conserva de la decisión anterior es lo que la hacía valiosa: **el
texto de `src/lib/legal.ts` sigue siendo el valor por defecto**. Si la fila no
existe, o alguien la vacía, el sitio publica ese texto; el CMS superpone, nunca
sustituye a la nada. Y una sección vacía no se guarda: la acción rechaza dejar
un documento legal sin secciones.

- Cuatro claves nuevas: `legal.privacidad`, `legal.terminos`, `legal.datos`,
  `legal.cancelacion`, cada una con `titulo`, `entrada`, `descripcion`,
  `actualizado` y `secciones: [{ titulo, parrafos[] }]`. Documentadas en
  `docs/CMS_CLAVES.md` (22 claves).
- En el panel, un bloque **«Documentos legales»** dentro de Contenido del sitio,
  con un editor por documento: añadir, quitar y reordenar secciones, y una caja
  de texto por sección con los párrafos separados por línea en blanco. Un botón
  de guardar por documento, como el resto del módulo.
- Las páginas siguen **estáticas con ISR de 1 hora** y se revalidan al guardar
  (se añadieron las cuatro rutas a `revalidarSitioPublico()`).
- ⚠ Los datos de contacto que aparecen **dentro** del texto legal quedan
  congelados: antes se interpolaban desde `sitio.contacto` y ahora son texto
  plano. Si el hotel cambia de número o de dirección hay que corregir también
  los cuatro documentos. Está avisado en la propia pantalla del panel y en
  `docs/CMS_CLAVES.md`.
- El seed se regeneró con `npm run seed:contenido` y sigue siendo idempotente.

#### Decisiones nuevas

| Fecha | Decisión |
|---|---|
| 2026-09-16 | **El Día de Calma termina en el mismo cierre que el hospedaje**, con una sola costura de Wompi (`pagoActual`). Dos cierres distintos habrían significado dos cobros que mantener. El mínimo del 50 % se aplica al día porque es la única regla que el hotel ha publicado, y se dice en pantalla en vez de callar. |
| 2026-09-16 | **Las listas de viñetas de los documentos legales son un párrafo con una convención**: si todas sus líneas empiezan por «- », se pinta como lista. Un editor de bloques («párrafo» / «lista») habría sido más fiel al modelo y mucho peor de usar; con esto el documento entero se edita con cajas de texto normales y no se perdió ni una viñeta de las cuatro páginas. |
| 2026-09-16 | **Los textos legales vuelven al CMS** (revierte la decisión del 2026-09-02). Motivo: la revisión legal con Amapola. Se conserva el respaldo en código y la acción impide dejar un documento sin secciones. |
| 2026-09-16 | **El rol del panel vive en `app_metadata`, no en una tabla.** Solo lo escribe la Admin API —`user_metadata` sí lo edita su dueño— y viaja dentro del JWT ya validado por `getUser()`, así que leerlo no cuesta una consulta más en cada navegación. |
| 2026-09-16 | **Quien no tiene un rol reconocido entra como `equipo`**, el menos privilegiado. Un valor inesperado no puede abrir una puerta. |
| 2026-09-16 | **Esconder el enlace de Usuarios es cortesía, no seguridad.** El «no» lo dicen la página (que comprueba el rol antes de leer nada) y cada Server Action. Un POST directo no pasa por ninguna pantalla. |
| 2026-09-16 | **Sin fila en la base, el formulario del panel arranca con el respaldo** y no en blanco. Antes devolvía `{}`: el sitio público sí enseñaba su texto y el panel no, y quien entrara a editar habría creído que el contenido se perdió. |

#### Verificación

- `tsc --noEmit` y `eslint` limpios (sigue solo la advertencia preexistente de
  `scripts/importar-fotos-drive.mjs`).
- **104 pruebas en verde**: ocho nuevas del cierre del Día de Calma —el total
  por el mismo `resumenDePago()`, `anticipo + saldo === total` en cinco
  porcentajes, los adicionales agrupados con `noche = null`, el 50 % como mínimo
  también aquí, el 100 % sin saldo, el mensaje de WhatsApp con total y anticipo,
  los adicionales enumerados sin hablar de noches, y que sin tarifa publicada no
  se inventa ningún anticipo—.
- `npm run build` limpio; las rutas públicas siguen estáticas y las cuatro
  `/legal/*` conservan su ISR de 1 h.
- **Capturas contra `localhost:3000`** (nunca contra Vercel) a **1440 y 390 px**:
  `/reservar` con la tarjeta del paso del plan, `/reservar` en modo Día de Calma
  con el deslizante y el cierre completo, y `/admin/usuarios`.
- **Prueba real de extremo a extremo**: entrada como `fincavillarreal@gmail.com`
  → creación de una cuenta `equipo` de prueba → restablecimiento de su
  contraseña → entrada con ella (el `equipo` **no ve** el enlace de Usuarios y,
  entrando por la URL, recibe «No tienes permiso» **sin que se filtre ni un
  correo**) → vuelta como propietario y eliminación. En la propia cuenta no
  aparece el botón de eliminar ni se deja cambiar el rol.
- **Legales**: se guardó un párrafo de prueba en la primera sección de la
  política de privacidad desde el panel, se comprobó que el sitio lo mostraba al
  instante (revalidación) conservando sus 14 viñetas y sus 7 secciones, y se
  restauró el texto original.
- **La base quedó sin datos de prueba**: la cuenta de prueba eliminada, cero
  reservas creadas, y solo dos usuarios (`fincavillarreal@gmail.com` propietario
  y `panel@lafincaecohotel.com` equipo).

### 2026-09-16 — Google Calendar: el calendario del hotel entra en la disponibilidad

El hotel lleva su disponibilidad real en un Google Calendar llamado **«la
finca»**, donde el equipo anota a mano lo que llega por WhatsApp. Hasta hoy el
sitio no lo sabía: el modelo lo esperaba (`reservas.origen = 'google_calendar'`,
`reservas.referencia_externa` con índice único) pero no había integración. Ya la
hay, y funciona en las dos direcciones.

#### 1. El cliente de Google, sin librerías

`src/lib/google/calendario.ts` (`server-only`) habla con Calendar v3 a pelo:
firma un JWT **RS256** con `node:crypto`, lo cambia por un token en
`oauth2.googleapis.com/token` —guardado en memoria hasta un minuto antes de
caducar, con la petición compartida para que diez consultas no pidan diez
tokens— y llama a la API con `fetch`. El paquete `googleapis` habría traído
decenas de megas del catálogo entero de Google para usar tres llamadas; esto
son setenta líneas que se leen enteras y no pesan en el arranque en frío.

**Ninguna función lanza.** Todas devuelven `{ ok }` o un motivo
(`no_configurado` / `error`) con el mensaje ya escrito en español para el panel:
un 403 dice «hay que compartir el calendario con la cuenta de servicio y darle
Hacer cambios en eventos», no «Forbidden». Si Google se cae, el sitio no se
entera.

#### 2. Leer: de sus eventos a ocupación por cabaña

`src/lib/reserva/calendario-externo.ts` es **puro** —ni red ni base— y por eso
se puede probar. Las reglas son adivinanzas sobre cómo escribe el hotel sus
eventos, así que están escritas para cambiarse en una línea:

- Título con «cabaña», «cabana» o «cab» + un número del **1 al 5** → esa cabaña
  («Cabaña 03», «cab. 2», «CABANA #4», «Cabañas 4 — Ana»).
- **Sin cabaña reconocible → bloquea las cinco.** Conservador a propósito:
  preferimos decirle «no hay sitio» a quien sí cabía antes que vender dos veces
  la misma noche. Lo mismo si el número no existe en la base.
- Eventos **cancelados** y los que **creó el propio sitio** (marca
  `extendedProperties.private.origen = 'lafinca-web'`), fuera. Sin esto una
  reserva chocaría consigo misma.
- Todo el día → `[inicio, fin)` tal cual, que Google ya da el fin exclusivo. Con
  hora → días de Bogotá; un 14:00 del 12 a un 11:00 del 15 son las noches 12, 13
  y 14. Una visita de 10:00 a 17:00 del mismo día ocupa ese día entero.

`ocupacion-externa.ts` le pone **caché de cinco minutos**, y la clave no es el
rango pedido sino **meses completos**: si fuera el rango exacto no acertaría
casi nunca, porque cada reserva pregunta por fechas distintas. Un error de
Google se cachea solo un minuto.

#### 3. Dónde se nota

- **Panel**: `buscarChoques` suma esta tercera fuente a reservas y bloqueos, y
  la explica en español («Cabaña 2 · Marta» en el calendario del hotel, del
  10 – 13 sep). El calendario del mes gana una **capa rayada «Google
  Calendar»**, pintada *debajo* de lo nuestro —si una noche está en las dos,
  manda la que tiene nombre, código y teléfono— y con su entrada en la leyenda.
  Arriba, un indicador **«Calendario del hotel: conectado / sin configurar /
  con problemas»** con la hora de la última lectura y un botón **«Actualizar
  ahora»** que tira la caché.
- **Sitio público**: `/api/disponibilidad` devuelve qué noches están ocupadas
  por cabaña sumando las tres fuentes, y **solo eso**: ni nombres, ni códigos,
  ni de qué fuente viene cada día (misma rendija que `/api/dia-de-calma/cupo`).
  El selector de `/reservar` lo usa para decir «Esas noches están libres en
  Cabaña 03» o «3 de 5 cabañas libres en esas fechas». **Informa, no bloquea**:
  no deshabilita nada ni cambia lo que el visitante eligió, y el calendario de
  fechas sigue sin apagar ningún día.

#### 4. Escribir

Al crear, confirmar o cancelar una reserva desde el panel se crea, actualiza o
borra su evento («Cabaña 03 · Juan Pérez · Estándar», o «Día de Calma · 2 pers.
· Ana»), con código, teléfono y total en la descripción, y el id guardado en
`referencia_externa`. Son eventos **de todo el día** a propósito: una reserva no
es «de las 14:00 a las 11:00», es un juego de noches, y así el rango es
exactamente el mismo `[entrada, salida)` de Postgres.

Es **best-effort**: la reserva ya está escrita cuando se llama al calendario, y
un fallo solo añade un aviso amable al mensaje de éxito. La verdad vive en
Postgres con sus restricciones EXCLUDE; Google es la comodidad del equipo.

#### 5. Lo único que falta, y lo tiene el hotel

`GOOGLE_CALENDAR_ID` está **vacía**. Para encenderlo, el hotel tiene que:

1. **Compartir** el calendario «la finca» con
   `lafinca-calendario@project-bdfd1411-9189-442d-84d.iam.gserviceaccount.com`
   con permiso **«Hacer cambios en eventos»** (con «Ver todos los detalles» solo
   se podría leer).
2. Pasarnos el **ID del calendario** (Configuración → Integrar calendario).

Mientras tanto el panel dice «sin configurar» y no se pierde nada. La credencial
(`GOOGLE_CALENDAR_CREDENCIALES`, el JSON en base64) vive solo en `.env.local` y
en Vercel; el JSON original está **fuera del repositorio**.

#### Decisiones nuevas

| Fecha | Decisión |
|---|---|
| 2026-09-16 | **Un evento sin cabaña reconocible bloquea las cinco.** No sabemos cómo escribe el hotel sus eventos; el error caro es el otro (vender dos veces una noche), no el de pedirle que confirme por WhatsApp. |
| 2026-09-16 | **Nada de `googleapis`.** Tres llamadas REST y una firma RS256 no justifican decenas de megas en cada arranque en frío de Vercel. |
| 2026-09-16 | **El calendario nunca puede tumbar una pantalla ni impedir un guardado.** Todas las funciones devuelven un resultado, ninguna lanza, y la sincronización va siempre DESPUÉS de escribir en la base. |
| 2026-09-16 | **Los eventos que creamos son de todo el día.** Una reserva es un juego de noches, no un rango de horas; así el evento y el `daterange` de Postgres son el mismo rango y no hay hora que malinterpretar. |
| 2026-09-16 | **Caché por meses completos, no por el rango pedido.** Con la clave exacta la caché no acertaría nunca: cada reserva pregunta por fechas distintas. |
| 2026-09-16 | **El sitio público informa de la disponibilidad, no la impone.** El calendario de fechas sigue sin apagar días: la última palabra la tiene el hotel al confirmar. |

#### Verificación

- `tsc --noEmit` y `eslint` limpios (sigue solo la advertencia preexistente de
  `scripts/importar-fotos-drive.mjs`). `npm run build` limpio: `/reservar` sigue
  estática y `/api/disponibilidad` es dinámica, como debe.
- **129 pruebas en verde**, 25 nuevas: las formas de escribir una cabaña y las
  que NO lo son («Reserva 3 personas» no habla de la cabaña 3), el fin exclusivo
  de los eventos de todo el día, las horas de Bogotá (incluida una escrita en
  UTC y la medianoche, que es donde se cuela el error de un día), los eventos
  cancelados y los propios, y el emparejamiento con los nombres de la base.
- **`npm run calendario:probar` contra la API real de Google: 14/14.** Crea un
  calendario de la cuenta de servicio, mete tres eventos como los escribiría el
  hotel, comprueba la ocupación resultante, crea/actualiza/borra un evento
  nuestro y **borra el calendario al final**. Se verificó además que no queda
  ninguno: la lista de calendarios de la cuenta de servicio está vacía.
- **Prueba de punta a punta contra `localhost`** (nunca contra Vercel), con un
  calendario de prueba conectado de verdad en `GOOGLE_CALENDAR_ID`:
  `/api/disponibilidad` devolvió «Cabaña 2 · Marta» ocupando **solo** la cabaña
  02 y «Mantenimiento general» ocupando **las cinco**, con
  `calendario_hotel: "conectado"`. El panel, con sesión real de
  `fincavillarreal@gmail.com`, pintó la capa rayada con sus dos eventos, la
  pastilla verde «Conectado», «Conectado con el calendario del hotel: 2 eventos
  ocupan fechas», la hora de la última consulta y el botón «Actualizar ahora».
- **Escritura probada contra la base real**: se creó una reserva, se sincronizó
  (evento «Cabaña 03 · Prueba Calendario · Entre Semana», `origen=lafinca-web`,
  con el id de la reserva), se guardó `referencia_externa`, se canceló (el
  evento desapareció y la referencia quedó en `null`) y se borró la fila.
- **Sin restos**: la base quedó con **cero reservas**, la cuenta de servicio sin
  ningún calendario, y `GOOGLE_CALENDAR_ID` de vuelta a vacío.
- ⚠️ **No hay capturas de pantalla**: esta sesión no tenía navegador ni
  herramienta de captura disponible. La verificación del panel se hizo sobre el
  **HTML servido por `localhost`** con una sesión real del propietario, que
  contiene los textos, la leyenda y las franjas de la capa de Google.

### 2026-09-30 — Auditoría de seguridad completa antes del lanzamiento

Informe con toda la evidencia en **`docs/AUDITORIA_SEGURIDAD.md`**. Resumen: 0
hallazgos críticos, 4 altos (todos corregidos), 6 medios (5 corregidos) y 6 bajos.
Todo se verificó contra `localhost`; las pruebas de base de datos van contra la
base real porque es la única que hay, y no dejaron residuos.

**Lo que estaba bien** y conviene no volver a tocar: las políticas RLS de las diez
tablas se probaron una por una con la clave anónima (SELECT, INSERT, UPDATE y
DELETE) y son correctas — `reservas`, `pagos`, `reserva_extras` y `bloqueos` son
invisibles e inescribibles desde fuera, y los catálogos solo muestran lo activo.
Las tres capas del panel funcionan, incluida la separación `propietario` / `equipo`
probada **en servidor** con la cuenta de equipo real contra las cinco Server
Actions de `/admin/usuarios`. No hay credenciales en el repo ni en el historial de
git, la clave de servicio no aparece en ningún archivo de `.next`, y los dos
endpoints públicos devuelven solo agregados.

**Lo corregido:**

1. **La cookie de sesión del panel era legible por JavaScript y duraba 400 días.**
   Ahora `httpOnly`, `secure` en producción y 30 días. Ojo con esto:
   `@supabase/ssr` **ignora el `maxAge` de `cookieOptions`** (lo pisa a mano en
   `cookies.js`), así que se recorta al escribir la cookie —solo hacia abajo y
   solo si es positivo, porque la librería usa `maxAge` negativo para borrarla al
   cerrar sesión—. Verificado en el `Set-Cookie` real.
2. **No había ninguna cabecera de seguridad.** Se añadieron seis en
   `next.config.ts` más `poweredByHeader: false`. La CSP se escribió a partir de
   los nueve hosts que el sitio carga de verdad (comprobados en el HTML
   prerenderizado). Lleva `'unsafe-inline'` en `script-src` **a propósito**: la
   alternativa es un `nonce`, que exigiría middleware en las rutas públicas y
   costaría el prerenderizado de las 18 páginas. El build confirma que las 19
   rutas públicas siguen estáticas.
3. **El login no tenía freno de fuerza bruta** (12 intentos en 5,4 s). Ahora 10
   por cuenta cada 5 min y 30 por IP cada 15. **La primera versión fue peor que el
   problema**: con 5 intentos cada 15 min, quien conozca el correo del dueño lo
   deja sin ver las reservas del día. La ventana corta es deliberada: se cura sola.
4. **Cualquier tabla futura de `public` nacía escribible por anónimos** (los
   `alter default privileges` de Supabase conceden todo a `anon`), y `anon` tenía
   `TRUNCATE`, que **no pasa por RLS**. Migración `011`. Verificado creando una
   tabla de prueba: `anon` no tiene ni `select`. ⚠️ **Consecuencia para la próxima
   migración:** una tabla nueva que deba leerse desde el sitio público necesita su
   `grant select … to anon` a mano, además de su política RLS.
5. **El `mapa_embed` del CMS entraba sin validar en un `<iframe src>` público**, así
   que una cuenta de `equipo` podía dejar un marco a una pasarela falsa en la
   página del hotel. Validado en los dos extremos (`src/lib/mapa-embebido.ts`) y
   cerrado otra vez por la CSP.
6. **Consentimiento de datos (Ley 1581 de 2012).** La política decía que
   autorizabas «por usar el sitio» —consentimiento tácito, que no vale— y prometía
   conservar prueba de la autorización sin conservarla. Ahora: casilla obligatoria
   sin premarcar antes del botón, con enlace a la política; la constancia viaja en
   el mensaje de WhatsApp; tres columnas en `reservas` (migración `012`) con
   cuándo, qué versión y por qué canal; y el panel lo pregunta y lo muestra
   siempre, también cuando falta. Se publicó además una **política de retención con
   plazos concretos**.
7. **Freno de peticiones** en `/api/disponibilidad` (30/min) y
   `/api/dia-de-calma/cupo` (60/min), que consultan con `service_role` y llaman al
   Google Calendar.

**Descubrimiento importante que afecta a cualquier cambio legal futuro:** los
cuatro documentos legales viven en el CMS, así que **editar `src/lib/legal.ts` NO
cambia lo publicado**. Hay que regenerar el seed (`npm run seed:contenido`) y
aplicarlo (`npm run db:aplicar`). Antes de hacerlo se comparó cada una de las 22
filas de `contenido` con el seed versionado —todas iguales, ninguna editada desde
el panel— para no pisar trabajo del cliente. **Repetir esa comparación la próxima
vez**, porque en cuanto Amapola edite un texto desde el panel, aplicar el seed se
lo borraría.

**Latido para que Supabase no pause la base** (encargo aparte de la misma ronda):
el plan gratuito pausa los proyectos con poca actividad a los siete días, y un
proyecto pausado deja el sitio sin contenido, sin fotos y sin disponibilidad.
`src/app/api/salud/route.ts` hace **una** consulta trivial con la clave anónima
—nunca `service_role`— y devuelve `{ok, base, hora}` sin filtrar nada del error;
`vercel.json` programa el cron diario (en Hobby, Vercel lo ejecuta una vez al día
y a hora aproximada). Si existe `CRON_SECRET` se exige la cabecera que Vercel
manda sola, y en todo caso hay freno de peticiones. **Si se quita el cron o la
ruta, la base se vuelve a pausar sola a los siete días**: antes hay que pasar
Supabase a un plan de pago (los pagos no pausan) o poner otro latido. La variable
está documentada en `.env.example` y en `docs/DESPLIEGUE_VERCEL.md` con el paso de
crearla en Vercel.

**Verificación:** `tsc` y `eslint` en verde (queda el aviso previo de
`scripts/importar-fotos-drive.mjs`), `npm run build` con las 19 rutas públicas
estáticas y **149 pruebas en verde** (20 nuevas: 9 del validador del mapa, 11 del
freno de peticiones). `vitest.config.ts` ahora resuelve `server-only` al módulo
vacío que usa Next en el servidor; sin eso no se puede probar ningún módulo
marcado como solo-servidor.

**Pendientes que necesitan decisión o al cliente** (detalle en §Pendientes del
informe): reglas de Rate Limiting del firewall de Vercel (P-1, es configuración);
ejecutar de verdad la política de retención con una tarea programada, tras
confirmar los plazos contables (P-2); honeypot y freno en el endpoint de reserva
cuando entre Wompi (P-3); ampliar HSTS a subdominios cuando se confirme que todos
son HTTPS (P-4); **razón social, NIT y sobre todo un correo de notificaciones**,
porque `sitio.contacto.correo` está vacío y el canal para ejercer los derechos del
titular no debería depender de un solo móvil (P-5); activar en Supabase la
protección de contraseñas filtradas, subir el mínimo a 10 y valorar MFA para el
propietario (P-6); revisión jurídica de Amapola (P-7); y un registro de auditoría
del panel cuando haya más de dos cuentas (P-8).

**Requisitos de seguridad para la pasarela**, documentados en el informe para que
no se dejen para después: el precio **siempre** se recalcula en servidor; la
reserva se confirma **solo por webhook**, nunca por la redirección del navegador;
el webhook verifica firma, es idempotente y consulta el estado real contra Wompi;
y no entra ni un dato de tarjeta en la base.

**Sin residuos:** `reservas` 0, `pagos` 0, `bloqueos` 0, las dos cuentas de auth
correctas y ninguna intrusa, sin tablas ni claves de prueba, sin objetos de prueba
en los buckets.

### 2026-09-30 — Correos, reservas que expiran y redirecciones del sitio viejo

Bloque «Hoy, miércoles 30 — GOCAS» de `docs/PLAN_CIERRE.md`: lo que se podía
terminar sin esperar ninguna entrega del cliente.

**1. Tres correos transaccionales con Resend (`src/lib/email/`).** Tres capas:
`plantillas.ts` es **puro** (redacta asunto, HTML y texto plano, sin red ni
claves), `send.ts` habla con Resend y es `server-only`, y `avisos.ts` lee la
reserva de la base y dispara lo que toque. **Ni `send.ts` ni `avisos.ts` lanzan
nunca**, porque los va a llamar el webhook de pagos.

- **Solicitud recibida** (huésped): código, detalle noche por noche, experiencias
  con su noche, total, anticipo y saldo, y qué sigue. Dice explícitamente que
  **todavía no está confirmada**.
- **Reserva confirmada** (huésped): lo anterior más cómo llegar (Km 18, Vereda
  Loma Alta, parqueadero externo), check-in 3:00 p. m., check-out 1:00 p. m.,
  llegada desde la 1:00 p. m., qué llevar (ropa abrigada, vestido de baño) y
  Nicolás como anfitrión. El **Día de Calma tiene su propia variante**: sin
  check-in ni check-out, de 10:00 a. m. a 5:00 p. m. y sin hospedaje.
- **Aviso a la administración**: huésped, teléfono con enlace de WhatsApp, total,
  anticipo, saldo, origen, notas y **el enlace directo a la ficha del panel**.
  Destinatarios desde `EMAIL_NOTIFY_TO`, que admite varios separados por coma.

HTML de correo de verdad: tablas anidadas, estilos en línea, 600 px, cabecera en
verde claro con el isotipo en petróleo y pie en petróleo. Se revisaron los seis
(tres correos × las dos variantes) en captura a 700 y a 390 px, y **también en
texto plano**, que es lo que ven los clientes que bloquean HTML.

Se disparan: al crear una reserva desde el panel (`pendiente` → solicitud +
aviso interno; `confirmada` → confirmación), y al **confirmar** una reserva, sea
desde el botón de la ficha o guardando el formulario con otro estado. Solo si
antes no estaba confirmada: pulsar dos veces no manda dos correos. Para la
pasarela queda escrita y documentada `avisarPagoAprobado()`, que manda la
confirmación al huésped y el aviso interno con el método y el id de transacción;
**el webhook solo tiene que llamarla**.

`npm run correos:probar` renderiza los seis a HTML y texto en una carpeta
temporal (con índice) y, si hay clave, los envía de verdad. Importa el mismo
`plantillas.ts` que corre en producción, no una copia.

**2. Reservas que expiran (migración 013).** `reservas.expira_at timestamptz`,
índice parcial sobre las pendientes con vencimiento, y
`liberar_reservas_vencidas(motivo text)` — `security invoker`, `search_path`
fijo, permisos solo a `authenticated` y `service_role`, un solo `UPDATE` atómico
que cancela y **anexa** el motivo a `notas`.

`src/lib/reserva/holds.ts` (puro, 29 pruebas) tiene `MINUTOS_HOLD = 30`,
`calcularVencimiento`, `estaVencida`, `minutosRestantes`, `vencePronto`,
`cuentaAtras` y **`ocupaCalendario()`, que es la regla del motor y está en un
solo sitio**. Ya la usan `/api/disponibilidad`, `/api/dia-de-calma/cupo`,
`buscarChoques()`, el calendario del panel y el conteo del cupo del día.

El barrido (`liberar-vencidas.ts`, `server-only`) corre antes de **toda**
escritura de reserva, al entrar al calendario del panel y en el cron diario de
`/api/salud` (que ahora devuelve `reservas_liberadas`). En el panel, las
pendientes que vencen muestran la cuenta atrás en el listado y un aviso
explicándolo en la ficha, destacadas cuando les quedan menos de diez minutos.

`npm run db:probar-holds` (16 comprobaciones contra la base real): que la
restricción EXCLUDE bloquea aunque el hold esté vencido —la razón de que haya
que barrer—, que el barrido cancela solo lo que debe y conserva la nota del
huésped, que es idempotente, que después del barrido esas fechas se pueden
reservar, que una cancelada no bloquea, que no toca ni una confirmada con
`expira_at` heredado ni una pendiente sin vencimiento, y **la creación
concurrente con dos conexiones de verdad**: una gana, la otra recibe el 23P01 y
ese 23P01 se traduce a español. La base queda en cero reservas.

**3. Redirecciones 301 del sitio viejo (`next.config.ts`).** El `wp-sitemap` del
WordPress publica seis URLs; las cinco que no son la portada redirigen:
`/services` → `/experiencias`, `/about-us` → `/conocenos`, `/contact` →
`/contacto`, y `/hello-world` y `/category/uncategorized` → `/`. Verificadas una
a una con `curl -I` contra `localhost`, y comprobado que ninguna tapa una ruta
del App Router (los cuatro destinos siguen respondiendo 200).

**Verificación.** `tsc`, `eslint` y `build` limpios; 178 pruebas en verde (29
nuevas de holds); **las rutas públicas siguen estáticas** con ISR de una hora.
Panel con sesión real (`fincavillarreal@gmail.com`, Playwright): la cuenta atrás
aparece en el listado y en la ficha, confirmar deja la reserva `confirmada` con
`expira_at` en null y sin tocar las notas, el banner dice «Todavía no se envían
correos automáticos: avísale tú por WhatsApp», y el log del servidor registra el
correo dormido con destinatario y asunto. **La base quedó sin datos de prueba: 0
reservas.**

**Lo único que falta para encender los correos** no es código: la cuenta de
Resend, los registros DNS del dominio en Hostinger y **qué correo del hotel** se
usa como remitente y como destinatario del aviso (Amapola). Documentado en
`.env.example` y en §2 de `docs/DESPLIEGUE_VERCEL.md`.

---

## Sesión 2026-09-30 — Datos fiscales y correo de contacto

El cliente entregó: titular **Raquel Lenis García (persona natural)**, **NIT 66830269-5**
(la razón social es su nombre) y el correo de contacto **`fincavillarrealcali@gmail.com`**.
Los textos legales quedaron **aprobados por el cliente, con revisión posterior pendiente**.
Registrado en `docs/DATOS_CLIENTE.md` §7.

**Base vs. seed.** Antes de tocar nada se comparó la fila real de las cinco claves
(`sitio.contacto`, `legal.privacidad|terminos|datos|cancelacion`) con `002_contenido.sql`:
**las cinco eran idénticas, sin ediciones hechas desde el panel.** Por eso se actualizaron
ambos: el código (`SITIO`, `legal.ts`) → `npm run seed:contenido` → y en la base, una
transacción puntual con `UPDATE ... WHERE clave = ... AND valor = <valor anterior>` solo sobre
esas cinco claves (no se ejecutó `db:aplicar`). Verificado después: base = seed, las cinco IGUAL.

**Cambios.** `SITIO.responsable` (nombre y NIT) y `SITIO.contacto.correo` en `src/lib/sitio.ts`;
los cuatro textos legales identifican al titular con «persona natural · NIT 66830269-5 · RNT»,
y el correo es el canal para ejercer derechos de datos personales (Ley 1581 de 2012); el pie
muestra el correo y «Raquel Lenis García · NIT 66830269-5 · RNT 114565»; `/contacto` muestra el
correo (ya lo soportaba) y la misma línea legal; el JSON-LD `LodgingBusiness` añade `email`,
`legalName` y `taxID`. `LEGAL_ACTUALIZADO` ya era 2026-09-30.

**Pendiente.** Revisión jurídica de los textos. Sigue abierto el correo **emisor** de Resend
y el destinatario del aviso interno (¿se usa este mismo correo?) — decisión de Cesar/Amapola.

---

## Sesión 2026-10-01 — Las reseñas de Google dejan de depender del caché de Next

**El problema.** La portada pedía la ficha de Google con `next: { revalidate: 86400 }`. Sobre el
papel, una llamada al día; en la práctica, **el número no existía**: la Data Cache de Next vive por
instancia y por región, así que con tres instancias en dos regiones podían ser seis llamadas el
mismo día, y al día siguiente dos. Google retiró el crédito universal de Maps y las reseñas están
en el tramo más caro de Place Details: **1.000 llamadas gratis al mes y 20 USD por millar después**.
Un número que no se puede presupuestar no puede quedar enchufado a una tarjeta.

**La salida: la base manda, Google solo refresca.**

- **Migración `014_cache_externo.sql`** — tabla genérica `cache_externo(clave text primary key,
  valor jsonb, actualizado_at timestamptz)`. **RLS activo y sin ninguna política**: en Postgres eso
  no deja pasar a nadie salvo a quien se salta RLS, que es `service_role`. `revoke all` explícito
  para `anon` **y para `authenticated`** (la 011 endureció los defaults de `anon`, pero no los de
  `authenticated`: una tabla nueva los habría heredado todos). El sitio lee en el servidor, así que
  no hace falta lectura anónima. Genérica y no `resenas_google` porque la forma del problema se
  repetirá (clima, tasa de cambio, Instagram), igual que `contenido` absorbe todas las secciones.
- **Dos claves.** `resenas_google` guarda el resumen **ya cocinado** (promedio, total, enlace a la
  ficha y las reseñas elegidas con el criterio vigente: ver «Criterio de selección» al final)
  y `resenas_google:turno` es el candado del arranque en frío. El candado es una fila aparte y no
  una columna `estado` para que el dato nunca esté «a medio escribir».
- **`src/lib/cache-externo.ts`** — `leerCache`, `guardarCache` y `tomarTurno`. Ninguna lanza.
- **Antiestampida.** Con la tabla vacía, «si no hay dato llámalo» serían diez llamadas de pago si
  entran diez visitas en el mismo segundo. El turno se gana con **una sola sentencia atómica**:
  `insert … on conflict do nothing returning` (en supabase-js, `upsert` con
  `ignoreDuplicates: true` + `.select()`). Si devuelve fila, el turno es mío y llamo; si no, **no
  llamo**. Un turno que nadie cerró (red caída a mitad) se puede retomar a los **10 minutos** con
  `update … where actualizado_at < límite returning`, también una sola sentencia.
- **`src/lib/resenas-google.ts`** — `getResenasGoogle()` mantiene su firma
  (`Promise<ResumenGoogle | null>`), así que **la portada, el componente y el `aggregateRating` del
  JSON-LD no se tocaron**. Ahora lee de la base; la única llamada que puede salir de un render es el
  arranque en frío. Nuevo `refrescarResenasGoogle()` para el cron. Se extrajo
  `normalizarRespuestaGoogle()` (las reglas: 4★+, más reciente primero, tope 5) y se añadió
  `normalizarResumenGuardado()`, que **revalida lo que sale del `jsonb`**: es nuestro dato, pero
  `jsonb` devuelve `unknown` y una fila vieja o editada a mano no puede tumbar la portada.
- **Dos cortes de tiempo, no uno.** Medido contra `places.googleapis.com`, el handshake TLS de una
  conexión nueva se puede ir a nueve segundos. El cron espera **10 s** (corre sin nadie delante); el
  arranque en frío, **4 s** (hay una persona con la portada en blanco: mejor caer a los testimonios
  del CMS, que es instantáneo). `/api/salud` declara `maxDuration = 30`.
- **`/api/salud`** — el cron diario que ya mantenía despierta la base y barría reservas vencidas
  ahora hace también el refresco, y lo informa: `resenas_refrescadas` y `resenas_guardadas`. Cuando
  refresca de verdad llama a `revalidatePath("/")`, para que una reseña nueva no espere hasta una
  hora más por el ISR. Solo `/`, que es la única página con reseñas.
- **Contador de la factura.** `consultarPlacesApi()` deja un `console.info` con el motivo
  (`cron-diario` / `arranque-en-frio`). Buscar «llamada a Places API» en los registros de Vercel da
  el número exacto de llamadas del mes sin entrar a la consola de Google.

**La trampa que apareció en la prueba (y por qué la lectura NO se cachea).** La primera versión leía
la tabla con `next: { revalidate: 3600, tags }`. En el arranque en frío, la lectura que ocurre
**antes** de guardar devuelve «no hay fila» y **Next cachea ese vacío una hora**: la primera visita
traía las reseñas y las guardaba, y la segunda seguía viendo el hueco cacheado, así que la portada
mostraba los testimonios del CMS y el `aggregateRating` desaparecía del JSON-LD. El mismo vacío se
colaba en el `build` desde `.next/cache/fetch-cache`. La lectura quedó **sin opciones de caché**: las
páginas públicas ya son estáticas con ISR de una hora, así que solo se lee cuando la página se
regenera, y un `select` por clave primaria no es lo que hay que racionar. Verificado que `/` sigue
saliendo `○ (Static) · Revalidate 1h` y que su HTML prerenderizado trae el `aggregateRating`.

**Cuentas.** 1 llamada/día × 30 días = **~30 llamadas al mes contra 1.000 gratis** (3 % de la cuota),
y el número no depende de Vercel ni de la consola de Google. Si se quita el cron el sitio no se
rompe: se queda con lo último guardado indefinidamente; lo que se pierde es ver las reseñas nuevas.

**Degradación.** Si Google falla —cuota, red, clave revocada, respuesta rara— **no se toca nada**: la
fila anterior se queda con su `actualizado_at` sin mover y el visitante ve exactamente lo mismo que
ayer. Solo si nunca hubo datos se cae a los testimonios del CMS. Ningún error visible.

**Migración aplicada a la base real** con un script puntual (**no** `npm run db:aplicar`, que
reaplicaría los seeds y borraría ediciones del panel). Verificado por SQL: la tabla existe, RLS
activo, **0 políticas**, `anon` y `authenticated` sin `select/insert/update/delete/truncate`,
`service_role` con todo. `reservas` 0, `contenido` 22 y `alojamientos` 5 sin tocar.

**Verificación.** `tsc`, `eslint` y `build` limpios; **197 pruebas en verde (19 nuevas)**, entre ellas
las que cuentan llamadas a `fetch`: caché lleno = 0 llamadas, arranque en frío con turno = 1 y se
guarda, arranque en frío sin turno = 0, fila corrupta = se trata como vacío. Prueba real contra
`localhost` desde la tabla vacía:

| Qué | Resultado |
|---|---|
| 3 visitas seguidas a la portada | **1 sola** llamada a Places (la primera); las tres muestran `ratingValue 4.8 / reviewCount 52` y los autores de Google |
| `GET /api/salud` | `resenas_refrescadas: true`, `resenas_guardadas: 5`; `actualizado_at` avanza (16:53:57 → 16:54:12) |
| `GET /api/salud` con la clave de Google rota | `resenas_refrescadas: false`; `actualizado_at` **sin moverse**; la portada sigue con 4,8 y 52 |
| `build` | `/` sigue `○ (Static) · 1h`; el HTML prerenderizado trae el `aggregateRating` |

La base quedó con las dos filas legítimas (`resenas_google` con 5 reseñas reales y su candado) y sin
datos de prueba.

**Lo mismo se aplicó en La Maima** (proyecto hermano, repositorio y Supabase aparte), con sus
nombres en inglés: `external_cache`, `src/lib/external-cache.ts`, cron diario propio y además el
latido anti-pausa de Supabase, que allí no existía.

## Criterio de selección de reseñas de Google (ajuste posterior)

**Pedido de Cesar:** publicar «las 5 mejores del último año». **Implementado** en `seleccionarResenas()`
(`src/lib/resenas-google.ts`): solo 4★+; publicadas en los últimos 12 meses; orden por puntuación
descendente y, a igual puntuación, la más reciente primero; máximo 5. Si tras filtrar quedan menos de 3,
la ventana sube a 24 meses; si aun así hay menos de 3, se usan las mejores disponibles sin filtro de
fecha (la sección nunca queda casi vacía).

**LIMITACIÓN (no prometer al cliente lo que la API no permite):** Google Places API (New) entrega como
máximo 5 reseñas por lugar, elegidas por Google («más relevantes»), y la API clásica con
`reviews_sort=newest` está deshabilitada en esta cuenta (`REQUEST_DENIED`). No podemos elegir entre todas
las reseñas del hotel: solo filtramos y ordenamos esas 5, así que si alguna tiene más de un año se
publican menos de 5.

**Diagnóstico:** la fila `resenas_google` guarda `seleccion` (`devueltas`, `aprobadas`, `ventanaMeses`);
el cron `/api/salud` devuelve `resenas_devueltas` y `resenas_ventana_meses` y deja en los registros
«selección: Google devolvió N, pasaron el filtro M, ventana X meses». Estado al 2026-10-01: Google
devolvió 5, pasaron 4, ventana de 12 meses (4 publicadas, de hace 2 a 8 meses). `aggregateRating`
(4,8 / 52) no cambia.

---

## Sesión 2026-10-01 (tarde) — Pagos en línea con Bold

Llegaron las **llaves de pruebas de Bold** y la pasarela quedó cableada de punta a punta en
ambiente de pruebas. La cuenta del hotel sigue en verificación de identidad, así que todo lo
que hay aquí es sandbox; el día que Bold apruebe, **solo se cambian las dos llaves**.

### Qué dice la documentación de Bold (y qué no)

Todo lo implementado sale de cuatro páginas de `developers.bold.co`, consultadas el 2026-10-01
(«Last updated on September 28, 2026»). Se deja escrito porque **son dos firmas distintas y es
el error más fácil de cometer**:

| | Qué firma | Algoritmo | Qué se firma |
|---|---|---|---|
| **Hash de integridad** | lo que mandamos al abrir el checkout | `SHA256` hex | `{Identificador}{Monto}{Divisa}{LlaveSecreta}` concatenado, sin separadores. «El orden de esta información es crucial» |
| **Firma del webhook** | lo que Bold manda a nuestro endpoint | `HMAC-SHA256` hex, cabecera `x-bold-signature` | el **Base64 del cuerpo crudo**, no el cuerpo |

Lo demás que fija el contrato:

- **El monto va en PESOS enteros, no en centavos.** «Si deseas cobrar $95.000 COP, deberás
  ingresar: 95000». Mínimo **$1.000 COP**. Es lo contrario de Wompi, que era lo que estaba
  reservado en `.env.example`; por eso `aCentavos()` **no** se usa aquí.
- **`order-id`**: alfanumérico más `-` y `_`, **máximo 60 caracteres**, y Bold pide no
  reutilizar identificadores de ventas ya pagadas. La referencia es
  `LF-AAAA-NNNN-<milisegundos>`: el código delante para que se lea en el panel de Bold, la
  marca de tiempo detrás para que un segundo intento de pago sea su propia fila en `pagos`.
- **La referencia vuelve en `data.metadata.reference`.** Literal para esta integración:
  «Botón de pagos → valor del atributo `order-id`». Es lo que une el evento con nuestra fila.
- **Estados**: en proceso `PROCESSING` y `PENDING` (solo PSE); finales `APPROVED`, `REJECTED`,
  `FAILED`, `VOIDED`; y `NO_TRANSACTION_FOUND` cuando la venta no tiene ningún intento.
- **Consulta de estado**: `GET https://payments.api.bold.co/v2/payment-voucher/<referencia>`
  con `Authorization: x-api-key <llave_de_identidad>` (la de identidad, **no** la secreta).
  Solo sirve para Botón de pagos, no para link de pago.
- **Reintentos del webhook**: hasta 5, a los 15 min, 1 h, 4 h, 8 h y 24 h, sobre cualquier
  respuesta que no sea `200`, y con un tope de **2 segundos** para responder.
- **`expiration-date` va en NANOSEGUNDOS** desde la época Unix (milisegundos × 1e6).

**Tres cosas que la documentación deja ambiguas o incómodas**, y cómo se resolvieron:

1. **Qué llave firma el webhook.** Una página de Bold dice «Llave de identidad» y otra, la
   canónica del webhook, «la **llave secreta**». Manda la segunda: sus cinco ejemplos de
   código usan `secret_key`.
2. **En modo pruebas la firma usa la llave VACÍA.** Literal: «el atributo donde va tu
   LLAVE_SECRETA no se ingresa, debe ir como un String vacío». O sea que **en sandbox
   cualquiera puede firmar un evento**. De ahí `BOLD_MODO`, y de ahí que el webhook, además
   de la firma, **vuelva a consultar el estado contra la API** antes de dar nada por pagado.
   `BOLD_MODO=pruebas` **se ignora** cuando `VERCEL_ENV=production`: olvidarse de quitarlo no
   abre un agujero.
3. **En sandbox Bold NO envía webhooks automáticos** para botón/link de pago. Hay que usar el
   botón «Probar el webhook» del comprobante. Y las referencias de prueba **se borran a las
   12 horas**.

### Lo que se escribió

- **`src/lib/pagos/bold.ts`** (`server-only`) — el contrato entero: las dos firmas (puras, con
  la llave por parámetro, para poder probarlas contra el ejemplo oficial), la referencia, los
  estados, la lectura del evento, la configuración del checkout y la consulta de estado. **Es
  el único archivo que toca la llave secreta.**
- **`src/lib/pagos/cotizar-en-servidor.ts`** — el requisito 1 de la auditoría hecho código: del
  navegador llegan **decisiones**, nunca cifras, y el precio se recalcula aquí con las **mismas
  funciones puras** (`nochesDe`, `cotizar`, `resumenDePago`, `cotizarDiaDeCalma`) sobre las
  tarifas recién leídas con `service_role` (sin la Data Cache de Next: cobrar la tarifa de hace
  una hora no es lo mismo que mirarla). Si el cuerpo trae un `total`, no se lee.
- **`src/lib/pagos/crear-reserva.ts`** — los seis pasos en orden: recalcular →
  `liberar_reservas_vencidas` → disponibilidad → reserva `pendiente` con `expira_at` a 30 min →
  fila en `pagos` → checkout firmado. Si algo falla después de crear la reserva, **se suelta**
  (`cancelada` con el motivo): mejor una fila cancelada que una cabaña bloqueada media hora por
  un error nuestro.
- **`src/lib/pagos/transiciones.ts`** — la idempotencia como función pura y probada.
- **`POST /api/reservar`** — primer endpoint público que **escribe** en la base, así que trae lo
  que la auditoría dejó en su pendiente P-3: **honeypot** (`companiaWeb`, con respuesta 200 falsa
  para no educar al bot) y **freno de 6 peticiones/minuto por IP**. Y la autorización de datos es
  una puerta: sin ella la reserva ni se intenta.
- **`POST /api/pagos/bold/webhook`** — firma primero, cuerpo después; idempotente; guarda el
  payload; y según el estado confirma, cancela o deja vencer. Los correos y el Google Calendar
  van en `after()` para responder dentro de los 2 segundos de Bold.
- **`/reservar/confirmacion`** — lee la referencia, **consulta el estado real** y muestra cuatro
  caras: aprobado, pendiente de confirmación, rechazado y **caducado**. Nunca confirma nada.
- **Panel** — la ficha muestra estado del pago, abonado, saldo, referencia, identificador de Bold
  y método, con **todos** los intentos (es lo que contesta un «me cobraron dos veces»); el listado
  distingue pagadas de pendientes con una segunda pastilla.
- **Migración `015_pagos_bold.sql`**, aplicada a la base real con un script puntual (**no**
  `db:aplicar`, que reaplicaría los seeds). Añade a `pagos` las columnas `pasarela`, `evento_id`,
  `actualizado_at` y `procesado_at`, y crea `pagos_eventos` con RLS y **cero políticas**: solo
  `service_role` entra. El `revoke` a `authenticated` es explícito porque la 011 endureció los
  defaults de `anon` pero no los de `authenticated` (es el aviso del hallazgo A-4 para «la
  primera tabla que se cree después», y esta lo es). A `pagos` **no** se le toca el permiso de
  `authenticated`: la ficha del panel lo lee con la sesión del panel.

### La idempotencia, en dos capas, y por qué una no basta

1. **El `id` de la notificación** es la clave primaria de `pagos_eventos`, así que
   `insert … on conflict do nothing returning` es a la vez el registro y el candado.
2. **La transición de estado**: `update pagos set … where referencia = $1 and estado <> $2`.
   Hace falta porque Bold documenta el `id` como único **por notificación enviada**, no por
   transacción: un reintento podría traer otro `id` del mismo pago.

Y una regla que no es obvia y está probada: **de `APPROVED` no se sale hacia atrás**. El rechazo
del *primer* intento puede llegar reintentado 24 horas después de que el segundo fuera aprobado;
sin esa regla, ese evento tardío cancelaría una reserva pagada y nadie lo notaría hasta que el
huésped llegara a la finca. La única salida legítima de un pago aprobado es `VOID_APPROVED`, que
sí cancela **y descuenta el dinero anulado de `monto_pagado`**: dejar «abonado $362.500» en una
reserva anulada haría creer al equipo que conserva un anticipo que se devolvió.

### Decisiones de diseño que conviene conocer

- **Modo redirección, no checkout embebido.** La librería de Bold hace
  `window.location.href = https://checkout.bold.co/btn?…`. Por eso la CSP solo necesita ese host
  en **`script-src`**: ni `frame-src` (no hay iframe) ni `form-action` (no hay formulario;
  comprobado leyendo su código). El día que se quiera el checkout embebido habrá que añadirlo a
  `frame-src`.
- **El script de Bold se carga al pulsar, no en cada visita.** `/reservar` la abre mucha gente
  solo para mirar precios; el que paga espera unas décimas y el que mira no paga una petición a
  un dominio externo. Verificado: la llave secreta **no aparece en ningún archivo de `.next`**,
  y la de identidad tampoco (viaja solo en la respuesta del endpoint, en tiempo de petición).
- **Datos del huésped como último paso.** Nombre, correo y celular se piden **después** del
  anticipo: pedirlos al principio es la forma más rápida de perder a quien estaba mirando. No se
  pide documento (hallazgo B-3: el registro de huéspedes lo exige en el check-in, no al reservar).
- **Ningún correo al crear la solicitud.** El huésped está mirando la pasarela; un «la tenemos»
  treinta segundos antes de que el pago falle es ruido. El correo sale **cuando el webhook aprueba**.
- **WhatsApp sigue visible** como alternativa secundaria. Y sin las llaves de Bold el sitio cierra
  por WhatsApp exactamente como antes: `boldConfigurado()` devuelve `false` y nada se rompe.
- **`REJECTED` y `FAILED` no cancelan la reserva.** El huésped sigue dentro de su media hora y lo
  normal tras una tarjeta rechazada es intentarlo con otra; cancelarla le quitaría las fechas que
  está a punto de pagar. El barrido la recoge sola a los 30 minutos.

### Las pruebas (contra `localhost:3112`, build de producción, sandbox de Bold)

| Escenario | Resultado |
|---|---|
| **Aprobado** | reserva `confirmada`, `monto_pagado` 362 500 de 725 000, `expira_at` a `null`, método «Tarjeta», `transaccion_id` guardado, autorización `web` + versión del texto. **Un solo correo** (anotado en el registro: Resend sigue dormido) |
| **Rechazado** | pago `REJECTED`, reserva **sigue `pendiente`** con su `expira_at`: se deja vencer sola |
| **Abandonado** | con el hold vivo, `/api/disponibilidad` da las dos noches ocupadas; con el hold vencido las da libres **antes** del barrido (la regla se aplica en memoria), y `liberar_reservas_vencidas()` la cancela anexando el motivo **sin borrar lo que escribió el huésped** |
| **Evento duplicado** | mismo `id` → «evento repetido» (capa 1); mismo pago con **otro** `id` → «sin cambios» (capa 2). `monto_pagado` y `procesado_at` sin moverse, **cero correos nuevos** |
| **Firma inválida** | las cuatro variantes dan **401** y no escriben nada: firma inventada, sin cabecera, cuerpo alterado con la firma del original, y firmado con la llave de producción estando en modo pruebas |
| **Anulación** | `VOID_APPROVED` → reserva `cancelada`, `monto_pagado` a 0, motivo anexado; repetirla → «sin cambios» |
| **Rechazo tardío** | `SALE_REJECTED` sobre un pago ya `APPROVED` → «sin cambios», la reserva confirmada no se toca |
| **El total del navegador** | se mandó `total: 1` en el cuerpo: se cobró **362 500**. Un extra inexistente se ignora y no se cobra |
| **Doble reserva** | la segunda sobre fechas solapadas → **409** con el choque explicado en español |
| **Honeypot** | `companiaWeb` lleno → `200 {ok:true, ignorado:true}` y **nada** en la base |
| **Freno de peticiones** | el 7.º intento en el minuto → **429** con `retry-after` |
| **Firma de integridad** | recalculada aparte con la llave secreta: **coincide**. Y la llave **no viaja** en la respuesta |
| **Tiempo de respuesta del webhook** | 693–1 330 ms, por debajo del tope de 2 s de Bold |
| **Página de retorno** | aprobado → «Tu reserva está confirmada»; rechazado → «El pago no se completó»; en proceso → «Estamos confirmando tu pago»; caducada → «Esa solicitud ya caducó»; y `?bold-order-id=NO-EXISTE&bold-tx-status=approved` → «No encontramos esa reserva», **sin decir confirmada en ningún momento** |
| **Panel** | la ficha pinta los intentos con su referencia e identificador de Bold; el listado, las pastillas «Pagada / Anticipo pagado / Pago rechazado / Pago en curso / Sin cobro». Ni un número de tarjeta, ni un CVV, ni el PAN enmascarado del payload |

**Lo único que no se pudo automatizar**, y queda anotado: **completar el pago en la pasarela de
Bold con las tarjetas de prueba** (`4111 1111 1111 1111` aprobado, `4970 1100 0000 0062`
rechazado). El formulario de la tarjeta vive en el dominio de Bold y hace falta un navegador. Lo
que sí se verificó sin navegador: la librería **oficial** de Bold, ejecutada en un DOM mínimo con
nuestra configuración firmada, construye la URL `https://checkout.bold.co/btn?…` y esa URL
responde **200** con la pasarela («Completa tu compra con el link de pago Bold»). Son cinco
minutos de ratón para Cesar; está en `docs/PLAN_CIERRE.md`.

**Sin residuos.** Al terminar: `reservas` 0, `pagos` 0, `pagos_eventos` 0, `reserva_extras` 0,
`bloqueos` 0; `contenido` 22, `alojamientos` 5 y `cache_externo` 2 intactos; dos cuentas de auth.
Las ocho reservas de prueba (`prueba.bold@lafinca.test`) se borraron.

### Verificación

`tsc` y `eslint` limpios (queda el aviso previo de `scripts/importar-fotos-drive.mjs`);
`build` correcto y **las 19 rutas públicas siguen estáticas** —`/reservar` sigue `○ … 1h`—;
**269 pruebas en verde, 72 nuevas** (47 de `bold.test.ts` y 25 de `transiciones.test.ts`):
la firma de integridad contra el ejemplo literal de la documentación, la del webhook contra sus
cinco ejemplos, la referencia, el anticipo en pesos y no en centavos, los estados, la lectura del
evento y de la API, y la idempotencia con sus dos reglas.

### Qué falta para producción

1. La pasada visual por la pasarela de pruebas (5 min, navegador) y registrar el webhook en el
   panel de Bold. Ver `docs/PLAN_CIERRE.md`.
2. El día que Bold apruebe la cuenta: cambiar las dos llaves por las de producción en Vercel,
   borrar `BOLD_MODO` de Production, y hacer **una compra real pequeña y su reembolso**.
3. `RESEND_API_KEY`: hoy el correo de confirmación del pago se escribe en el registro del
   servidor en vez de enviarse. El webhook ya lo llama; no hay que tocar código.

### 2026-10-01 (tarde) — El dominio real, el BTN-001 y el interruptor de pagos

**El cambio de contexto:** `lafincaecohotel.com` ya apunta a Vercel y el hosting
viejo se canceló. **El sitio nuevo es el sitio en producción**, y eso convierte
tres cosas que eran «pendientes de lanzamiento» en problemas de hoy.

#### 1. El BTN-001 de Bold: la causa exacta

El botón «Reservar y pagar» abría la pasarela y Bold devolvía su pantalla
genérica: *«Something went wrong… BTN-001»*. Su documentación dice que BTN-001
son «atributos de configuración incorrectos» y que el detalle está en la consola
del navegador. Se reprodujo con Chrome por CDP sobre una página de diagnóstico
aislada —sin tocar la base— y la consola lo dijo literal:

```
Bold Payment Button: 'http://localhost:3000/reservar/confirmacion?ref=…'
is not a valid value for the 'data-redirection-url' attribute.
```

**La causa: Bold solo acepta URLs de retorno `https://`.** Su tabla de atributos
lo pide para `data-redirection-url` y `data-origin-url` («Valid HTTPS URL») y es
literal: no hay excepción para desarrollo, ni siquiera para `localhost` (sí la
hay para la forma del host —«para pruebas locales no usar 127.0.0.1, en vez debe
usar localhost»— pero el esquema tiene que ser https igual). El sitio construía
esas dos URLs desde el origen de la petición, que en local es `http://`.

Lo que **no** era: las llaves, el monto, la firma ni la referencia. Se
descartaron una por una con tres variantes del mismo checkout, cambiando un solo
atributo cada vez. Con la URL en https el checkout abre; con todo lo demás igual
y la URL en http, BTN-001.

**Las llaves están bien y son del mismo ambiente** (las dos de pruebas): la
secreta tiene 22 caracteres, igual que el ejemplo de la documentación de Bold
(`kgfq2nN0o52XqnuXZWIN2F`), y la de identidad 43, el formato de sus llaves
públicas. Si fueran de ambientes distintos el error sería **BTN-000** («llave de
identidad incorrecta»), no BTN-001. **Bold no exige registrar el dominio ni la
URL de retorno en su panel**: lo único que se registra ahí es el webhook.

**La corrección** es `origenParaBold()` (`src/lib/pagos/origen.ts`): devuelve
siempre un origen https —`BOLD_URL_RETORNO` si está puesta, el origen de la
petición si ya es https, y si no el dominio real— y `configuracionCheckout()`
**lanza con un mensaje legible** si alguna de las dos URLs no es https, en vez de
dejar que el fallo aparezca como una pantalla roja de Bold. En local eso
significa volver al dominio real tras pagar, y funciona: **la base de datos es la
misma**, así que la página de retorno encuentra la referencia y pinta el
comprobante correcto.

**Comprobado en el navegador** (Chrome por CDP, `/reservar` en local con
`PAGOS_ACTIVOS=1`): el checkout abre en `checkout.bold.co/payment/BTN_…` con
«Test mode · La Finca Eco Hotel · LF-2026-0002 · Cabaña 01 · 2 noches ·
$350,000 COP» y sus métodos de pago. **Sin BTN-001.**

#### 2. El dominio real

- `NEXT_PUBLIC_SITE_URL` **estaba en `http://localhost:3000` en Vercel**, y el
  sitio publicado llevaba semanas sirviendo `<link rel="canonical"
  href="http://localhost:3000">` y el mismo `og:url`. Corregida a
  `https://lafincaecohotel.com` en Vercel y en `.env.local`. **Es el apex, sin
  `www`:** `www.lafincaecohotel.com` devuelve un 308 al apex, que es el dominio
  principal del proyecto. El respaldo en código (`src/lib/sitio.ts`) pasó de
  `https://www.…` al apex, para que un despliegue sin la variable publique lo
  correcto.
- Verificado en el build: canónicas, `sitemap.xml` y JSON-LD salen con el dominio
  real, y las **19 rutas públicas siguen estáticas**.
- **Las 301 del sitio viejo se quedan.** Que el WordPress ya no exista no las
  vuelve innecesarias: las vuelve imprescindibles, porque ahora las sirve este
  sitio y son lo único que separa de un 404 a quien llegue desde un resultado de
  Google todavía indexado. Comprobadas contra el build: `/about-us`, `/contact`,
  `/hello-world`, `/category/uncategorized` y `/el-lugar` devuelven 301, y
  `/services/` la cadena 308 → 301 ya documentada.
- `docs/DESPLIEGUE_VERCEL.md` deja la URL definitiva del webhook de Bold:
  `https://lafincaecohotel.com/api/pagos/bold/webhook`.

#### 3. `PAGOS_ACTIVOS`: el interruptor del negocio

Con el dominio real vivo y Bold en pruebas, un huésped de verdad podía entrar a
`/reservar` y pasar por una pasarela que no cobra nada; y si un evento de ese
sandbox llegara al webhook, la reserva quedaría **confirmada sin pago real**.
Nace `PAGOS_ACTIVOS`, **por defecto `0`**:

- El sitio público **no pinta el botón de pagar** y cierra por WhatsApp con el
  mismo resumen y el mismo desglose noche a noche (`pagoEnLineaDisponible()`).
- `POST /api/reservar` responde 503 y **no crea ninguna reserva**.
- El webhook sigue vivo —hace falta para probarlo desde el panel de Bold— pero si
  `BOLD_MODO=pruebas` y `VERCEL_ENV=production` registra el evento, deja un error
  en el log y **no toca `pagos` ni `reservas`**.

#### 4. El sitio está invisible en Google

`SITIO_PUBLICADO` no está en `1`, así que el sitio se publica con `noindex,
nofollow` y `robots.txt` con `Disallow: /`. Esa variable protegía al WordPress
viejo; **ya no hay WordPress viejo**. No se activó desde aquí (es decisión de
Cesar) y queda documentado en `docs/PLAN_CIERRE.md` y en
`docs/DESPLIEGUE_VERCEL.md` que basta con poner la variable en `1` en Vercel y
**redesplegar** —el valor se hornea en el build—.

### Verificación

`tsc` y `eslint` limpios (queda el aviso previo de
`scripts/importar-fotos-drive.mjs`); `build` correcto con las **19 rutas públicas
estáticas**; **272 pruebas en verde**, 3 nuevas sobre las URLs de retorno.
Comprobado en el navegador a 1440 y 390: con `PAGOS_ACTIVOS=0` no hay botón de
pago y el cierre por WhatsApp sale con el desglose completo; con `1`, el checkout
de Bold abre. `POST /api/reservar` con el interruptor apagado: 503.

**Sin residuos.** Se borraron las dos reservas de prueba del día (`LF-2026-0001`,
la que produjo el BTN-001, y `LF-2026-0002`, la del checkout que sí abrió) con
sus pagos y extras. Al terminar: `reservas` 0, `pagos` 0, `pagos_eventos` 0,
`reserva_extras` 0, `bloqueos` 0; catálogo intacto (5 cabañas, 4 planes, 13
tarifas, 4 extras, 22 filas de contenido, 39 imágenes).

### 2026-10-02 — Un pago no puede perderse: reconciliación con Bold y correos encendidos

#### El problema, que no era de pruebas

En el sandbox de Bold se hicieron pagos **de verdad** y a `/api/pagos/bold/webhook`
llegaron **cero eventos**: `pagos_eventos` estaba vacía. El botón «Probar el
webhook» del panel de Bold solo guarda la URL y no dispara nada, y en pruebas Bold
tampoco los envía solos. Resultado: `LF-2026-0001` **se canceló sola** al vencer su
hold de 30 minutos, con el pago hecho.

Eso en producción es **un huésped que paga y se queda sin reserva**, y no se
entera hasta que llega a la finca. Un webhook que no llega no avisa de que no
llegó, así que la conclusión no fue «arreglar el webhook» sino **que el webhook
deje de ser la única vía de confirmación**.

#### La reconciliación

- **`src/lib/pagos/aplicar-estado.ts`** (nuevo) — la transición, extraída del
  webhook: `pagos` + `reservas` + correos + Google Calendar. **El webhook y la
  reconciliación la comparten**, que es la única forma de garantizar que no
  divergen. Lo único que las distingue es el parámetro `diferir`: el webhook pasa
  `after()` porque Bold exige responder en dos segundos; la reconciliación espera.
  Exporta además `repararReservaSinConfirmar()` para el estado incoherente (pago
  `APPROVED` y reserva sin confirmar), que `decidirAccionDePago` no puede arreglar
  —y no debe: ahí está la regla que impide los correos duplicados—.
- **`src/lib/pagos/reconciliar.ts`** (nuevo) — `reconciliarPago(referencia)`
  pregunta a `GET payments.api.bold.co/v2/payment-voucher/<ref>` con la llave de
  identidad y aplica lo que diga; `reconciliarPagosPendientes()` hace la pasada
  del cron. Enganchada en **tres** puntos:
  1. **La página de retorno** `/reservar/confirmacion` reconcilia **antes de
     pintar**. Es el caso corriente: el huésped vuelve de pagar y ve su reserva
     confirmada sin que exista ningún webhook.
  2. **El cron** (`/api/salud`) reconcilia los pagos no finales de las últimas 24
     horas **antes** de liberar las vencidas, e informa (`pagos_revisados`,
     `pagos_reconciliados`, `pagos_confirmados`, `pagos_requieren_atencion`).
  3. **El panel**: botón **«Verificar pago con Bold»** en la tarjeta de pago de la
     ficha, visible solo cuando hay algo que verificar.
- **Migración 016** — `liberar_reservas_vencidas` **nunca** cancela una reserva con
  un pago `APPROVED`, y da 15 minutos de gracia a los `PROCESSING`/`PENDING`
  movidos hace poco.

#### Qué devolvió Bold para las dos reservas de prueba

La reconciliación corrió contra el sandbox real. **Bold devolvió `APPROVED` para
las dos**, con `payment_method: CREDIT_CARD` y las transacciones `T_8YO0FOXI6J`
(`LF-2026-0001`, $250.000 de anticipo sobre $500.000) y `T_N689TJBUXK`
(`LF-2026-0002`, Día de Calma, $125.000 sobre $250.000). Las dos quedaron
`confirmada` con `expira_at` en nulo y sus correos enviados — **sin un solo evento
de webhook en la base**. Una de ellas estaba a dos minutos de que el hold la
cancelara.

Las referencias del día anterior ya no se pueden consultar: el sandbox las archiva
a las pocas horas y responden **404 «La referencia … no fue encontrada»**. Es la
razón por la que la ventana del cron son 24 horas y no «todas».

#### Los correos, encendidos

`EMAIL_FROM=La Finca Eco Hotel <reservas@lafincaecohotel.com>`,
`EMAIL_NOTIFY_TO=fincavillarrealcali@gmail.com` y el nuevo
**`EMAIL_REPLY_TO=fincavillarrealcali@gmail.com`**. Los tres correos (y sus tres
variantes de Día de Calma) se enviaron de verdad: llegaron a la **bandeja de
entrada**, no a spam, con `dkim=pass`, `spf=pass`, `dmarc=pass`, remitente «La
Finca Eco Hotel», `Reply-To` al Gmail del hotel y el logo del bucket cargando
(HTTP 200, PNG de 6,4 kB). 🔴 **Faltan las cuatro variables en Vercel**: sin ellas
el sitio publicado confirma la reserva y se calla.

#### Verificación

`tsc`, `eslint` (solo el aviso previo de `scripts/importar-fotos-drive.mjs`) y
`build` limpios; **288 pruebas en verde**, 16 nuevas sobre la reconciliación
(aprobado, rechazado, anulado, en proceso, sin respuesta, idempotencia, correos no
duplicados, resurrección, fechas ocupadas y la carrera webhook ↔ reconciliación).

Contra la base real y el sandbox real, en localhost: el cron confirmó las dos
reservas; la migración 016 comprobada en sus tres casos (pago aprobado → 0
liberadas; en proceso reciente → 0; en proceso de hace 2 h → 1, con la nota del
huésped conservada); la página de retorno **resucitó** una reserva que el barrido
había cancelado, dejando las tres notas encadenadas; y repetir página y cron no
cambió ni un `procesado_at` ni envió un correo más.

**Sin residuos.** Al terminar: `reservas` 0, `pagos` 0, `pagos_eventos` 0,
`reserva_extras` 0, `bloqueos` 0; catálogo intacto (5 cabañas, 4 planes, 13
tarifas, 4 extras, 22 filas de contenido, 39 imágenes).

#### Lo que NO se pudo verificar

El botón del panel no se pulsó en un navegador con sesión (no se tenía la
contraseña del panel). Llama a `reconciliarPago()`, que sí está probada de punta a
punta por los otros dos caminos y por las 16 pruebas.

---

### 2026-10-02 (tarde) — Por el sitio ya no se reserva para hoy

Petición del cliente, con el sitio **en producción y en pruebas activas**: nadie
puede reservar desde el sitio público para el mismo día. La fecha de llegada más
temprana que se puede elegir es **mañana**, y vale igual para el hospedaje y para
el **Día de Calma**.

#### Dónde quedó la regla

**Una sola constante**, en el módulo puro de fechas del motor:

```ts
// src/lib/reserva/noches.ts
export const DIAS_MINIMOS_ANTELACION: number = 1;
export function primeraLlegadaReservable(hoy: FechaISO): FechaISO;
export function validarAntelacion(entrada, hoy): { valido } | { valido, motivo };
```

Ponerla en `2` o `3` endurece la regla en el calendario, en el recálculo del
servidor y en el endpoint **a la vez**, y además cambia los textos: los mensajes
(`MOTIVO_SIN_ANTELACION`, `MENSAJE_SIN_ANTELACION`, `TEXTO_ANTELACION`) se derivan
de la constante, así que no hay ningún «mañana» escrito a mano en la interfaz.

Quién la usa:

- **El calendario** (`src/components/sitio/calendario-fechas.tsx`) gana una prop
  `minima`, que por defecto es `hoy`. Los días entre `hoy` y `minima` salen
  apagados con el motivo **«no se puede reservar para hoy»** —distinto del «ya
  pasó» de siempre, que se conserva—. `minima` también mueve el foco inicial, el
  tope del botón «mes anterior» y el recorrido con flechas: un `<button disabled>`
  no puede recibir foco, y sin eso las flechas lo habrían perdido al llegar a hoy.
- **El sitio público** (`modulo-reserva.tsx` y `selector-reserva.tsx`) calcula
  `primeraLlegadaReservable(hoy)` y la pasa. También se endurece la llegada que
  llega por la URL: un `?entrada=` de hoy o de ayer —de un enlace viejo de
  WhatsApp— ya no se acepta.
- **El servidor, que es quien manda**: `cotizarEnServidor()` (antes de separar
  hospedaje y Día de Calma, así que cubre los dos) y, antes de leer siquiera la
  base, `/api/reservar`.

#### El panel NO cambia, y es deliberado

El equipo del hotel **sí** tiene que poder registrar una reserva de hoy: son las
que entran por WhatsApp a última hora, con el huésped ya en camino. El alta manual
(`src/app/admin/(panel)/reservas/acciones.ts`) y los bloqueos no pasan por
`cotizarEnServidor()` ni por `/api/reservar`, así que la regla no los toca; el
formulario del panel sigue trayendo **hoy** como fecha de entrada por defecto.
Queda un comentario largo en los dos extremos —la constante y la acción del
panel— explicando por qué, porque es justo el tipo de asimetría que alguien
«arregla» sin saber que cuesta reservas.

#### El reloj es el de Bogotá

`hoyEnBogota()` (`src/lib/utils/formato.ts`) acepta ahora un `ahora` opcional para
poder probarlo. Se usa en `/api/reservar` y en `cotizarEnServidor()`, que antes
restaba cinco horas a mano. A las **23:00 de Bogotá** sigue siendo el mismo día y
«mañana» sigue siendo mañana; a las 00:01 el corte ya se ha movido.

⚠ **Ventana conocida, sin regresión:** `/` y `/reservar` son estáticas con
`revalidate` de una hora, así que el `hoy` que viaja al calendario puede quedarse
viejo hasta 60 minutos después de medianoche. En esa ventana el calendario podría
ofrecer el día de hoy; el servidor lo rechaza igual, que es exactamente para lo
que está. El mismo desfase ya existía con los días «ya pasó».

#### Textos

- **FAQ nueva en el CMS**: «¿Puedo reservar para el mismo día?» → «Por el sitio,
  no: las reservas en línea —de hospedaje y de Día de Calma— son a partir del día
  siguiente… Si quieres venir hoy mismo, escríbenos por WhatsApp». Sustituye lo
  que decía el documento del bot («depende de la disponibilidad»). Se añadió al
  respaldo de `src/lib/contenido.ts`, se regeneró `supabase/seed/002_contenido.sql`
  con `npm run seed:contenido` y se escribió la fila `faq` de `contenido`.
  **Antes de escribir se comparó la fila real con el seed**: era idéntica (nadie la
  había tocado desde el panel), así que la actualización solo añade la pregunta
  nueva; de 17 a 18. No se corrió `npm run db:aplicar`.
- Ayuda del calendario: «Elige el día de llegada, **desde mañana en adelante**…
  Para llegar hoy mismo, escríbenos por WhatsApp».
- Paso 1 de `/reservar`: «Elige llegada y salida, desde mañana en adelante…» (antes
  decía «No hay fechas prohibidas», que ya no es exacto).
- Revisados y **dejados como están**: «te confirmamos disponibilidad el mismo día»
  de `/reservar`, fichas de cabaña, `/alojamientos` y `/contacto` — hablan de la
  rapidez de la respuesta, no de reservar para hoy. Los correos no prometen nada
  sobre fechas de llegada. Los términos legales tampoco prometían el mismo día, así
  que no se tocaron: si el cliente quiere la regla en el documento de términos,
  es un cambio aparte (arrastra la fila legal del CMS y la versión `LEGAL_ACTUALIZADO`).

#### Verificación

`tsc`, `eslint` (solo el aviso previo de `scripts/importar-fotos-drive.mjs`) y
`build` limpios. **304 pruebas en verde**, 16 nuevas en
`src/lib/reserva/antelacion.test.ts`: hoy rechazado, mañana aceptado, el corte
cruzando fin de mes y año bisiesto, el Día de Calma con el mismo corte que el
hospedaje, y el cambio de día **a las 23:00 y a las 00:01 de Bogotá**.

Contra `localhost:3000`, con peticiones directas al endpoint:

| Petición | Respuesta |
|---|---|
| Hospedaje con llegada **hoy** | 400 · «Las reservas por el sitio son a partir de mañana…» |
| Hospedaje con llegada **ayer** | 400 · «Esa fecha ya pasó. Las reservas por el sitio…» |
| **Día de Calma** para hoy | 400 · el mismo mensaje |
| Hospedaje para **mañana** | pasa el filtro de fechas y falla en el siguiente control (cabaña inexistente), sin escribir nada |

Capturas del calendario abierto a **1440** y **390**: hoy (viernes 2 de octubre)
tachado y sin pulsar, primer día elegible el sábado 3, flecha de mes anterior
deshabilitada. El `aria-label` del día de hoy dice «viernes, 2 de octubre — no se
puede reservar para hoy». Comprobado igual en el calendario de la **portada**.

**Sin residuos:** `reservas` 0, `pagos` 0, `reserva_extras` 0, `bloqueos` 0. Lo
único que cambió en la base es la fila `faq` de `contenido`.

#### Lo que NO se pudo verificar

El alta manual del panel no se ejecutó en un navegador con sesión (no se tiene la
contraseña). Que siga aceptando hoy está comprobado por código: su acción no
importa nada de la antelación, su única validación de fechas es que la salida sea
posterior a la entrada (más cupo y choques), y el formulario trae **hoy** como
entrada por defecto. Queda la casilla correspondiente en `docs/GUIA_PRUEBAS.md`.

### 2026-10-03 — El sitio ya lee varios calendarios de Google, uno por cabaña

**Por qué.** El hotel confirmó dos cosas. La primera, que en su calendario
general los eventos **sí** llevan el nombre de la cabaña en el título: la lectura
por título que ya estaba escrita sirve tal cual. La segunda, que van a crear
**cinco subcalendarios, uno por cabaña**, bajo el mismo Gmail, para un bot de
WhatsApp que funciona aparte. El sitio queda preparado para eso ahora, sin
esperar a que existan.

#### El formato de la variable

`GOOGLE_CALENDAR_ID` pasa de ser un identificador a ser una **lista**. Separador:
coma (los espacios y los saltos de línea también valen). Detrás de cada
identificador puede ir `=n` con el número de cabaña:

```
GOOGLE_CALENDAR_ID=general@group.calendar.google.com
GOOGLE_CALENDAR_ID=general@group.calendar.google.com, cab1@…=1, cab2@…=2
```

- **Sin `=n`** → calendario general: se lee el título de cada evento. Si nombra
  una cabaña, ocupa esa; si no, bloquea las cinco. Es la regla de siempre.
- **Con `=n`** (1 a 5) → todos los eventos de ese calendario ocupan **esa**
  cabaña, sin mirar el título. Así el equipo puede apuntar «Ana Pérez» a secas en
  el subcalendario de la Cabaña 3. Se entiende también `=cabaña 3`, `=cabana-03`
  y `=cab. 3`.
- Un solo identificador —el formato anterior— sigue funcionando igual.

**Nada de esto puede apagar la disponibilidad.** Un mapeo que no se entiende
(`=9`, `=cocina`) se degrada a calendario general, que bloquea más y no menos, y
queda como aviso en el panel. Un identificador repetido se cuenta una vez. La
decisión está en `src/lib/reserva/calendarios-config.ts`, que es puro y está
probado.

#### Ante un error de lectura, lo mismo que ya pasaba

Los calendarios se consultan **en paralelo** y la ocupación se une. Si uno falla y
otro responde, se usa lo que llegó y el fallo sale como aviso: es la coherencia
con el comportamiento que ya existía para un solo calendario —un error de lectura
devolvía ocupación vacía y no bloqueaba nada—, porque la fuente de verdad es
Postgres y Google solo puede **añadir** ocupación, nunca quitarla. Una lectura
incompleta se cachea un minuto en vez de cinco.

**El doble conteo no existe**: lo que sale son franjas, y unir dos franjas
idénticas ocupa exactamente las mismas noches que una. Si el mismo evento está en
el general y en el subcalendario de su cabaña, la copia idéntica se descarta (para
no ver dos barras en el panel) y, cuando los títulos difieren, las dos franjas
siguen apuntando a la misma cabaña y a las mismas noches. Hay test de las dos
cosas.

#### Se escribe en un solo calendario

Las reservas del panel se apuntan en **uno**: el primero de la lista, o el de
`GOOGLE_CALENDAR_ESCRIBIR_EN` (variable nueva, opcional). Si se escribiera en el
general y además en el de la cabaña, el equipo vería cada reserva dos veces y
habría que mantener dos eventos por reserva. Crear, actualizar y borrar pasan por
la misma función, así que las tres operaciones caen siempre donde se creó el
evento. Contrapartida documentada: `reservas.referencia_externa` guarda el id del
evento pero no su calendario, así que cambiar esa variable con reservas ya
apuntadas deja huérfanos los eventos viejos. Es una decisión de puesta en marcha.

#### El panel lo explica solo

En **Reservas**, debajo del estado del calendario, el **propietario** tiene un
desplegable «Ver los calendarios de Google» con: el correo de la cuenta de
servicio al que hay que invitar, los calendarios configurados (identificador
completo copiable, a qué cabaña van, cuál recibe las reservas, y aviso en rojo si
el sitio no lo ve) y **los calendarios que la cuenta ya ve pero nadie ha
configurado**. Eso último es lo que nos ahorra pedirle el identificador al hotel:
en cuanto compartan el calendario, aparece ahí y se copia. Va detrás de un
`Suspense` para no retrasar el calendario del mes, y se cachea cinco minutos (el
botón «Actualizar ahora» tira esa caché también). Los avisos de configuración y
los calendarios que fallaron salen como lista ámbar, y la pastilla pasa a
«Conectado a medias».

#### Scripts

- `npm run calendario:verificar` (**nuevo**, solo lee): si la credencial carga,
  el correo de la cuenta, cómo quedó entendida la variable con sus avisos, dónde
  se escribe y qué calendarios ve de verdad la cuenta, marcando configurados y
  sin configurar. No imprime ningún secreto. Es el script del día que el hotel
  comparta el calendario.
- `npm run calendario:probar` (el de antes, escribe en un calendario de prueba
  propio y lo borra): sigue pasando, 14/14.

#### Verificación

`npx tsc --noEmit` limpio · `npm test` **326 pruebas en verde**, 22 nuevas (14 del
parseo de la configuración y 8 de la unión de ocupaciones) · `npm run build` sin errores
· `npm run calendario:probar` 14/14 contra la API real · `calendario:verificar`
probado con configuraciones válidas e inválidas.

#### Lo que falta (de Cesar, no del código)

1. Que el hotel comparta el calendario «la finca» con
   `lafinca-calendario@project-bdfd1411-9189-442d-84d.iam.gserviceaccount.com`
   con permiso **«Hacer cambios en eventos»**.
2. Poner `GOOGLE_CALENDAR_ID` (y `GOOGLE_CALENDAR_ESCRIBIR_EN` si hace falta) en
   Vercel **Production**. `.env.local` sigue con la variable vacía a propósito.

---

### 2026-10-03 · Documentos del cliente: manual del panel y correcciones

#### Manual del panel — DOC-LF-2026-05

Nuevo entregable para el equipo del hotel, en el sistema de documentos v2 de GOCAS:
`EcoHotel - La Finca\html\Manual_Panel_LaFinca.html` → `Manual_Panel_LaFinca.pdf`.
**19 hojas / 19 páginas**, la más alta 1073 px. Cubre entrar al panel, el calendario
mensual con la fila del Día de Calma, los cuatro estados de una reserva, el alta manual
de las reservas de WhatsApp, la regla plan↔noche, pagos, bloqueos, el calendario de
Google, contenido y fotos, cabañas, planes, experiencias, legales, usuarios, qué hacer
si algo falla y una hoja de referencia rápida. Sin contraseñas: remite al DOC-LF-2026-03.

Dos matices que el código obligó a redactar con precisión: no existe «restablecer
contraseña por correo» (solo el propietario, desde Usuarios), y la sección del
calendario advierte que **un evento cuyo título no identifique la cabaña bloquea las
cinco**, que es la única regla que el equipo tiene que respetar al escribir eventos.

#### Wompi → Bold en los documentos ya entregados

`Checklist_Estado_Sitio_LaFinca.html` (6 menciones) y `Requerimientos_LaFinca.html`
(4) seguían diciendo Wompi. Corregido frase por frase, no con buscar-y-reemplazar:
al hotel ya no se le piden documentos para abrir una pasarela —Bold es del Banco de
Bogotá, donde ya tiene cuenta— sino que habilite las llaves de integración y envíe las
de producción. El estado de los pagos pasó de POR HACER a EN CURSO.

#### Dos afirmaciones que habían quedado desactualizadas

- **Requerimientos 8.3** (anticipo): era pregunta CLAVE, ya es decisión cerrada.
  Deslizante del 50 % —mínimo que confirma— al 100 %. **El saldo se cobra por link de
  pago antes de la llegada**: en la finca no hay datáfono ni se maneja efectivo
  (§5 de `DATOS_CLIENTE.md`). Conviene no volver a escribir «se paga en el hotel».
- **Checklist, acceso a Hostinger**: dejó de ser bloqueante. El dominio apunta a Vercel
  desde el 2026-10-01 y el hosting viejo se canceló. Pero **los DNS siguen
  administrándose en Hostinger** (ahí están los TXT de Resend), así que el acceso sigue
  haciendo falta para el correo corporativo y para renovar el dominio: pendiente útil,
  no bloqueante. Ningún documento registra que los nameservers se hayan movido.

#### Vercel

`PAGOS_ACTIVOS=0` en Production, para que nadie cierre una reserva sin pagar hasta el
lanzamiento. A Production solo le faltan `GOOGLE_CALENDAR_CREDENCIALES` y
`GOOGLE_CALENDAR_ID`; las llaves de Bold siguen solo en la preview de `pruebas-pagos`.

### 2026-10-03 (tarde) — Los siete calendarios del hotel ya están conectados, y el diagnóstico dejó de mentir

**Lo que pasó.** El hotel compartió **siete** calendarios con la cuenta de
servicio `lafinca-calendario@…`: el general («Reservas Finca Villarreal»), los
cinco por cabaña y uno nuevo y vacío, «Reservas Finca Villarreal - Sitio Web»,
que es el único con «Hacer cambios en eventos». Se configuraron los siete en
`GOOGLE_CALENDAR_ID` (los de cabaña con su `=1`…`=5`) y
`GOOGLE_CALENDAR_ESCRIBIR_EN` apuntando al de escritura.

`npm run calendario:verificar` parseaba la configuración perfectamente pero
decía **«Calendarios que la cuenta del sitio ve de verdad: ninguno todavía»** y
avisaba de que los siete estaban configurados y no los veía. Era un **falso
negativo**: los siete se leen sin un solo fallo.

#### La causa

`listarCalendarios()` usaba `calendarList.list`, que devuelve los calendarios a
los que la cuenta está **suscrita**, no aquellos sobre los que tiene **permiso**.
Compartir un calendario con una cuenta de servicio concede la ACL; la
suscripción nunca aparece, porque no hay nadie que acepte una invitación. El
acceso real va por `events.list`, que funciona con el permiso aunque
`calendarList` esté vacía.

Comprobado calendario por calendario con `listarEventos`: **los siete responden**.
`calendarList.list` devuelve cero entradas al mismo tiempo.

#### Qué se cambió

- **`src/lib/google/calendario.ts`** — `listarEventos` pasa a ser un envoltorio de
  **`leerCalendario()`**, que devuelve también el `summary` y el `accessRole` que
  Google ya incluía en esa misma respuesta (gratis, sin una llamada más). Nuevo
  **`comprobarCalendario(id)`**: la comprobación de acceso, con `maxResults=1` y
  `fields=summary,accessRole`, así que no baja ni un evento. Y
  `accesoPermiteEscribir()`, que es `owner` o `writer` y nada más.
- **`src/lib/reserva/diagnostico-calendarios.ts`** (nuevo, **puro**) — arma el
  diagnóstico a partir de las comprobaciones ya hechas. Puro a propósito: la
  lógica vivía pegada a la llamada de red y por eso no había ninguna prueba que
  hubiera cazado el falso negativo. 16 pruebas nuevas en
  `diagnostico-calendarios.test.ts`, la primera de ellas la regresión: un
  calendario que responde sale accesible **aunque la lista de suscripciones venga
  vacía**.
- **`src/lib/reserva/ocupacion-externa.ts`** — `diagnosticoDelCalendario()`
  comprueba en paralelo cada calendario configurado (y el de escritura, aunque
  esté fuera de la lista). `calendarList` se sigue llamando, pero solo para
  **descubrir** identificadores; ya no decide nada. Un diagnóstico con algo roto
  se cachea un minuto en vez de cinco.
- **El aviso grave.** `LecturaCalendario` gana `escrituraSinPermiso`. Como el
  permiso viene en la respuesta de la lectura normal, el sitio se entera sin
  llamadas extra: si el calendario de escritura resulta estar en solo lectura, la
  franja de estado del panel saca una pastilla roja **«No puede apuntar
  reservas»** y el aviso explica el arreglo. Es grave porque todo se lee bien y,
  sin embargo, ninguna reserva del panel llega al calendario del hotel.
- **El panel** (`diagnostico-calendario.tsx`) se reorganiza en dos bloques que
  ahora son cosas distintas de verdad: **«Aquí se apuntan las reservas del
  panel»** (uno) y **«Calendarios que el sitio solo consulta»** (los demás). Cada
  uno con su nombre en Google, su permiso en español y si responde.
- **`scripts/verificar-calendarios.mjs`** — misma estructura, y termina con código
  de salida 1 si algún calendario no responde o si el de escritura no puede
  escribir.

#### Qué hay dentro de los calendarios (próximos 60 días, 2026-10-03 → 12-02)

| Calendario | Permiso | Eventos |
| --- | --- | --- |
| Reservas Finca Villarreal - Sitio Web (escritura) | `writer` | 0 |
| Reservas Finca Villarreal (general) | `reader` | **48** |
| Cabañas 1 a 5 | `reader` | 0 cada uno |

**Los 48 títulos del general nombran su cabaña**, los 48: «Javier Coral cabaña 5»,
«Diego Camargo bono regalo cabaña 3», «Jhon Hernández (B.R. Atarnan O.) cabaña 2»,
«Ximena Rojas Cabaña 2»… Pasados por las reglas reales del sitio, los 48 salen
como `cabana_reconocida` y **ninguno** como `sin_cabana`. Es decir: **cero
bloqueos falsos hoy**. No hay eventos de «Mantenimiento», «Cumpleaños» ni nada
que no sea una reserva.

**Los cinco calendarios por cabaña están vacíos**, así que el general no duplica
nada: es la única fuente de ocupación. Conviene dejarlo en la lista. Cuando el bot
de WhatsApp empiece a llenar los de cabaña habrá que mirar si el general repite lo
mismo (la unión ya descarta el evento duplicado por id, pero dos eventos distintos
para la misma reserva no se reconocen entre sí).

#### Lo que hay que vigilar, y es decisión del cliente

El riesgo sigue vivo: **un evento del general cuyo título no nombre la cabaña
bloquea las cinco**. Hoy no hay ninguno, pero nada se lo impide al equipo. Hay que
pedirle al hotel que **todo** lo que apunte en el general lleve la cabaña en el
título, incluidos los eventos que no son reservas (mantenimiento, visitas,
cumpleaños). La alternativa —dejar de leer el general en cuanto los de cabaña
estén poblados— es la decisión que tocará tomar con el cliente.

#### Verificación

`npx tsc --noEmit` limpio · `npm test` **352 pruebas en verde** (336 + 16 nuevas) ·
`npm run build` sin errores · `eslint` limpio sobre lo tocado ·
`npm run calendario:verificar` ahora imprime «7 de 7 calendarios configurados
responden. ✓ La integración con el calendario del hotel está sana».

**No se escribió, editó ni borró ningún evento en los calendarios del cliente.**
Todo fue lectura; el permiso de escritura se confirmó por el `accessRole` que
devuelve Google (`writer`), sin crear ningún evento de prueba.

### 2026-10-03 (noche) — Primero la cabaña, luego las fechas, y el calendario tacha lo ocupado

Pedido del cliente: el motor pedía **fechas → cabaña** y el calendario no sabía nada de
ocupación; se elegían fechas a ciegas y después un aviso decía «esas noches ya están
ocupadas». Ahora que el sitio lee el Google Calendar del hotel (48 reservas reales), el
orden se invierte y el calendario **tacha** lo que no se puede elegir.

#### Qué cambió

- **`/reservar`, pasos nuevos:** 1 «¿Dónde te quedas?» —las cinco cabañas y el **Día de
  Calma** al mismo nivel, en el mismo grupo de radios— y 2 «¿Cuándo?», el calendario.
  Plan, experiencias por noche, anticipo y datos no cambian de lógica; solo se
  renumeran. Sin cabaña elegida, el paso 2 se ve **atenuado** dentro de un
  `<fieldset disabled>` (fuera del tabulador, sin trucos de `tabIndex`) con la frase
  «Elige primero tu cabaña para ver sus fechas libres» a contraste normal.
- **Fechas que llegan sin cabaña** (`?entrada=&salida=` desde la portada) se guardan;
  al elegir cabaña —o al cambiar de una a otra, o al pasar al Día de Calma— se
  comprueban con las mismas reglas del calendario en cuanto su mes está cargado. Si no
  valen, se quitan con un aviso corto («Quitamos tus fechas (…): no están libres en la
  Cabaña 01…»). Con cabaña elegida, cada tarjeta dice además «Libre / Ocupada en tus
  fechas» usando la consulta que ya hacía el resumen.
- **El calendario** (`calendario-fechas.tsx`) recibe `nochesOcupadas`,
  `tiposDeNocheOfrecidos` (regla de la 02), `diasSinCupo`, `cargandoOcupacion`, `nota`
  y `alCambiarMes`. Los días apagados llevan **`aria-disabled` + motivo en el
  `aria-label`** («domingo, 4 de octubre — ocupado: esa noche ya está reservada») en vez
  de `disabled`: un botón deshabilitado no recibe foco, y con las flechas el foco se
  perdía. Los ocupados se pintan tachados sobre fondo crema (`crema-600` sobre
  `crema-200`, 4,7:1), distintos de un día pasado. Leyenda «Tachado: …» bajo la
  rejilla cuando hay algo tachado y no hay nota.
- **Reglas puras** en `src/lib/reserva/elegibilidad-calendario.ts` (46 pruebas):
  `bloqueoDeCabana`, `bloqueoComun`, `topeDeSalida`, `evaluadorDeDias`,
  `validarFechas`, `diasSinCupo`, `ventanaPorCargar`, `repartirPorMes`,
  `tiposOfrecidosDe`. `MAXIMO_DIAS_DISPONIBILIDAD = 92` vive ahí y el endpoint lo
  importa (Next no deja exportar constantes desde un `route.ts`).
- **Carga:** `useOcupacion` (`src/components/sitio/usar-ocupacion.ts`), compartido por
  la portada y `/reservar`. Pide el mes visible y el siguiente en **una** consulta
  (≤ 62 días), guarda por mes con caducidad de 5 minutos y reintenta un mes fallido a
  los 30 s. **Decisión explícita contra el encargo:** se pidió «al cambiar de cabaña,
  se vuelve a cargar; cabañas distintas no comparten caché». `/api/disponibilidad`
  devuelve las cinco cabañas en cada respuesta y cuesta lo mismo pedir una que cinco,
  así que la caché es por mes y dentro guarda las noches **de cada cabaña por
  separado**: cambiar de cabaña no vuelve a preguntar (ahorra freno de peticiones y
  cuota de Google) y nunca se mezclan las noches de una con las de otra.
- **`/api/disponibilidad`** devuelve además `dia: { "AAAA-MM-DD": personas }` (solo
  fechas con alguien) con la misma suma que `/api/dia-de-calma/cupo`: una consulta más
  en el mismo `Promise.all`. Con eso el calendario del Día de Calma tacha los días sin
  cupo.
- **Portada** (`modulo-reserva.tsx`): con cabaña, sus noches; sin cabaña, solo las
  noches en que **las cinco** están bloqueadas, con la nota «Tachamos solo los días sin
  ninguna cabaña libre. Al elegir cabaña verás sus fechas exactas». La ocupación se
  pide al abrir el calendario o elegir cabaña, nunca al cargar la portada. Cambiar de
  cabaña con fechas puestas las comprueba y, si no valen, las quita con aviso en la
  línea de estado. `inicio.tsx` pasa `tipos` (de `tiposOfrecidosDe`) para la 02.
- **Panel en dos columnas en la portada desde `lg`**: abierto hacia arriba solo
  quedaban ~500 px y en una columna pasaba de 600 —«Borrar fechas» y «Listo» se
  escondían—. Textos a la izquierda, rejilla a la derecha: ~400 px. En el teléfono y
  en `/reservar`, la columna de siempre.
- **FAB de WhatsApp**: solo buscaba `data-fab-evitar` al montarse, y el selector de
  `/reservar` se pinta después (Suspense), así que en el teléfono tapaba «Listo» del
  calendario. Ahora un `MutationObserver` observa los que aparecen y suelta los que
  desaparecen; la hoja del calendario lleva el atributo.
- **Textos:** respaldo de `reservar` (entrada «Empieza por tu cabaña…», pasos «Tu
  cabaña» y «Tus fechas» primero), seed regenerado, frase de `/experiencias`,
  `CMS_CLAVES.md` y el bloque 2 de `GUIA_PRUEBAS.md` (dos casillas nuevas). El FAQ y
  `CONTENIDO_ACTUAL.md` no describían el orden: sin cambios.
- **Base real:** `scripts/actualizar-pasos-reservar.mjs` (simula por defecto,
  `--ejecutar` escribe) solo reemplaza `intro` y `pasos` si son exactamente el texto
  anterior del seed. Se corrió **después del push**: los dos campos coincidían con el
  seed anterior y quedaron actualizados; la segunda pasada dice «ya está al día».

#### La semántica elegida (rangos `[llegada, salida)`)

- Un día cuya **noche** está ocupada no es llegada.
- Un día es salida si **todas** las noches entre la llegada y ese día están libres: la
  salida más tardía es la primera noche bloqueada tras la llegada (`topeDeSalida`), y
  todo lo posterior se tacha mientras se elige la salida, con la frase «Como tarde, el
  17 de oct: esa noche ya no está libre».
- Se puede **llegar el día en que otro sale** y **salir el día en que otro llega**.
- «Bloqueada» incluye las noches que la cabaña **no vende**: la 02 (solo Estándar)
  tacha sus lunes a jueves no festivos, con explicación en la tarjeta («Solo noches de
  fin de semana o festivo»), en el panel y bajo el calendario. Sale de sus tarifas, no
  de su nombre.
- La antelación sigue igual: hoy no se reserva; un día ocupado se distingue de uno
  apagado por antelación.
- **Es experiencia de uso, no seguridad**: el aviso «informa, no bloquea» del resumen
  se queda como red (consulta el rango exacto al elegirlo), `/api/reservar` vuelve a
  comprobar y la restricción de exclusión de Postgres tiene la última palabra.

#### Verificación

`npx tsc --noEmit` limpio · `npm test` **398 en verde** (352 + 46) · `next build` sin
errores (en una copia aislada del proyecto: en la carpeta real había tres `next dev`
de otras sesiones en los puertos 3000–3002 compartiendo `.next`, y un build ahí los
habría roto) · eslint limpio sobre lo tocado. Capturas con Chrome headless contra
`next start` en `localhost:3107`, a 1440 y 390: `/reservar` sin cabaña, Cabaña 01 en
octubre y noviembre (4, 10, 11, 17, 24 / 1, 2, 14, 21 tachados), llegada el 12 con
tope el 17, fechas descartadas al elegir cabaña, Cabaña 02, Día de Calma y la portada
con y sin cabaña. Comprobado en el DOM: 0 celdas con `disabled`, motivo en cada
`aria-label`, el paso 2 sin cabaña con 0 controles enfocables.

#### Lo que quedó fuera

- La ocupación se carga para los meses que se miran: una estadía que salte a un mes
  no cargado cuenta esas noches como libres (las comprueban el aviso y el servidor).
- En modo Día de Calma el botón sigue diciendo «Borrar fechas» (es una sola).
- La hoja del calendario de la portada en el teléfono sigue posicionándose respecto
  del formulario (el `backdrop-blur` del módulo crea un bloque contenedor para
  `fixed`): se ve bien a 390, pero no es la hoja inferior que describe el código.

### 2026-10-05 — Temporadas (tarifas por fechas) y los horarios nuevos

Pedido del hotel: crear, editar y borrar tarifas para fechas concretas desde el panel, para una
cabaña o para todas, y dejar cargada la de fin de año. A mitad de ronda, Cesar confirmó el rango y
pidió cambiar los horarios (abajo).

#### El modelo (migración 017, aplicada a la base real antes del push)

- **`temporadas`**: `nombre`, `alojamiento_id` (null = todas las cabañas), `noches daterange`
  `[primera noche, última + 1)` y `alcance` (columna generada: la cabaña o el uuid nulo). Es la
  **única fuente de las fechas**.
- **Precios = filas de `tarifas`** con `temporada_id`. Su `vigencia` y `temporada_alcance` son
  copia atada por llave compuesta `(temporada_id, temporada_alcance, vigencia)` → `temporadas (id,
  alcance, noches)` `match full on update cascade on delete cascade`: escribir otras fechas en la
  fila lo rechaza la llave, y mover la temporada las mueve todas. `match full` impide además una
  `vigencia` suelta sin temporada. `tarifas_base_o_temporada`: la base lleva cabaña y no temporada;
  la de temporada, al revés. Ensayada en una transacción deshecha contra la base real (cascada por
  la columna generada, llave, exclusión, RLS de `anon`) antes de aplicarla.
- **Sin solapes**: `tarifas_temporadas_sin_cruce` = `exclude using gist (temporada_alcance with =,
  plan_id with =, vigencia with &&) where temporada_id is not null`. Dos de todas, o dos de la misma
  cabaña, no pueden fijar precio al mismo plan en noches cruzadas; una de cabaña sí convive con una
  de todas. El panel hace antes la misma comprobación (`crucesDeTemporada`) para nombrar la
  temporada con la que choca; la exclusión queda de red, traducida al mismo mensaje.
- **`guardar_temporada()`** (`security invoker`, solo `authenticated` y `service_role`) escribe
  temporada y precios en una transacción: primero quita los planes que salen, luego mueve fechas,
  luego escribe precios.
- **RLS**: `temporadas` y las filas de temporada de `tarifas` se leen en público solo si no han
  terminado (`upper(noches) > hoy en Bogotá`); escritura solo autenticada. `grant select` a `anon`
  explícito (lección de la 011) y sin `truncate` para `authenticated`.
- **Compatible hacia atrás**: todo el código anterior lee `tarifas` con `.is("vigencia", null)`, así
  que el despliegue viejo siguió cobrando la base hasta el push. La unicidad de la base
  (`tarifas_base_unica … where vigencia is null`) no cambia.
- **Las reservas hechas no se recalculan**: `reservas.subtotal_alojamiento`, `total`,
  `monto_anticipo` y `reserva_extras.precio_unitario` son enteros congelados sin referencia a
  `tarifas`, no hay triggers que los recalculen, y el formulario del panel abre una reserva
  existente con su valor guardado (`subtotalTocado = Boolean(reserva)`).

#### Una sola función de precio

`precioDeNoche(tarifa, fecha, adultos)` en `cotizacion.ts`. Caminos que cotizaban y ahora pasan por
ella: `cotizar()` (motor y `/api/reservar` vía `cotizarEnServidor`, que lee las temporadas de esa
cabaña que tocan la estadía con `service_role` y, si no puede leerlas, **no cobra**), `precioParaLista`
de las tarjetas de cabaña (tenía su propio `precioDe`), las tarjetas de plan (`rangoDePrecios`) y
el **formulario de reserva manual** (era `precio base × noches`; ahora suma noche por noche y, de
paso, respeta el precio de una persona). Único toque en `src/lib/pagos/`: `cotizar-en-servidor.ts`
lee y cuelga las temporadas; Bold no se tocó. Las temporadas se cuelgan solo de tarifas base
existentes (`temporadasDeTarifa`), así que la 02 sigue sin Entre Semana aunque la de todas lo tenga.

Día de Calma: **fuera**. Su precio vive en `planes.precio_base`, no en `tarifas`.

#### Panel — sección «Temporadas» (`/admin/temporadas`, `requireAdmin()` como los precios base)

Listado en «Activas ahora», «Próximas» y «Pasadas»; formulario con «Nombre de la temporada»,
«Primera noche», «Última noche», «¿A qué cabañas aplica?» y por plan «Precio por noche (2 personas)»
y «Precio si viaja una sola persona», cada uno con «Base: $… · +15 % sobre la base». Aviso en vivo
de cruces (rojo) y de quién manda cuando convive con una de otro alcance (azul). Botones «Nueva
temporada», «Crear temporada», «Guardar cambios», «Cancelar», «Editar», «Borrar» y «Borrar
temporada», con confirmación que dice que las reservas hechas no cambian. La ficha de cada cabaña
dice qué temporadas la afectan. Borrar un plan con precios de temporada se bloquea con un mensaje.

#### Sitio público

Desglose noche por noche con el nombre de la temporada bajo cada noche afectada; tarjetas de plan
con «$480.000 a $552.000 por noche» y «Según la noche…» cuando las noches no cuestan lo mismo; ficha
de cabaña con «Del 1 de diciembre al 8 de enero aplican tarifas de temporada; al reservar ves el
precio exacto de cada noche». Listados, «desde» y JSON-LD siguen con la base. El mensaje de
WhatsApp nombra la temporada.

#### Datos

`scripts/cargar-temporada-fin-de-ano.mjs` (simula por defecto, `--ejecutar` escribe): la primera
ejecución la creó; la segunda dijo «Ya está al día». **Rango 1 dic 2026 – 8 ene 2027 para los tres
planes, confirmado por el hotel el 2026-10-05** (ya no es supuesto).

#### Horarios nuevos (confirmados el 2026-10-05, todo el año, todos los planes de hospedaje)

Check-in 3:00 p. m. (igual) · **hora límite de llegada 7:00 p. m.** (nueva) · **check-out 12:00 m.**
(antes 1:00 p. m.). Desde la 1:00 p. m. zonas sociales y el Día de Calma: igual. Cambiado en
`SITIO.estadia` (`checkOut: "12:00"`, `llegadaHasta: "19:00"` y `texto`), JSON-LD (`checkoutTime`
sale de ahí), correo de confirmación (`LLEGADA`, ahora con la hora límite junto al check-in, en HTML
y en texto), página de confirmación del pago, respaldo de la FAQ y de los términos, seed, y en la
base con `scripts/actualizar-horarios.mjs`: la respuesta de la FAQ «¿A qué hora puedo llegar…?» y,
en **Términos §5, solo la hora** («la salida es hasta las 13:00.» → «… hasta las 12:00 m.»). La
fecha «actualizado» de los términos (2026-09-30) no se tocó. Los eventos de Google Calendar no
llevan horarios. De paso: el correo y la página de confirmación del pago escribían «p. m..» (la
hora ya termina en punto); corregido.

⚠ **Caché de datos tras un cambio hecho por script**: la FAQ y los términos se leen con la Data
Cache de Next (etiqueta `contenido-publico`, una hora), que sobrevive a un build nuevo. En local,
tras correr el script, `/faq` siguió con el texto viejo hasta que un guardado del panel llamó a
`revalidarSitioPublico()`. En producción pasa lo mismo: o se espera la hora, o se guarda cualquier
cosa en el panel (por ejemplo, «Guardar cambios» en la temporada, sin tocar nada).

#### Verificación

`tsc` limpio · `npm test` 443 en verde (398 + 45) · `next build` sin errores · eslint limpio en lo
tocado. Capturas con Chrome headless contra `next start` en `localhost:3117`, a 1440 y 390: panel
(listado, edición con los cuatro «+15 %», ficha de la Cabaña 01), `/reservar` Cabaña 01 entre semana
y fin de semana de diciembre (Estándar y Premium), el cruce 30 nov → 2 dic, el rango en las
tarjetas, la Cabaña 02 en diciembre y la ficha pública. Recorrido real del panel contra la base:
crear una temporada de prueba de la Cabaña 03, verla en el motor (manda sobre la de todas), cruce
rechazado con su mensaje, regla de una persona, editar y borrar (base limpia al terminar). Sesión con
el usuario de pruebas rotando su contraseña por la Admin API y rotándola de nuevo al terminar.

#### Hallazgo que queda anotado (no se tocó)

`esVisperaDeFestivo()` (`noches.ts`) solo cuenta la víspera si el festivo cae de lunes a jueves:
con un festivo en **viernes** (25 dic 2026, 1 ene 2027) el jueves anterior se cobra como entre
semana. El comentario dice que se excluyen los festivos de sábado y domingo, así que parece un
`<= 4` que debía ser `<= 5`. Cambia precios: decidirlo con Cesar.

### 2026-10-05 (tarde) — El panel sin scroll lateral, el calendario del mes rehecho, el Resumen con Google y la reserva manual con el calendario del sitio

Pedido de Cesar tras probar el panel. Seis cosas; las seis hechas.

#### 1. La página del panel se iba 700 px a la derecha

**Causa real:** en el calendario de `/admin/reservas` cada barra llevaba un `<span class="sr-only">`
(texto para lector de pantalla), que es `position: absolute`. El contenedor con `overflow-x: auto`
**no estaba posicionado**, así que esos spans tomaban como bloque contenedor un antepasado de fuera,
escapaban del recorte y ensanchaban el documento: `scrollWidth` 2112 en una ventana de 1440 (y 1808
en una de 320). La tabla en sí sí estaba recortada. Arreglo: el contenedor que se desplaza lleva
`relative` (comentado en `calendario.tsx`). Medido en todas las páginas del panel a 320, 390, 768,
1024, 1440 y 1920 (abajo). **Regla para lo que venga:** todo contenedor con `overflow-*: auto` que
tenga dentro algo `absolute` (incluido `sr-only`) lleva `relative`.

#### 2. El calendario del mes (`/admin/reservas`)

- Reglas en **`src/lib/admin/calendario-mes.ts`** (puro, 16 pruebas): una ranura por noche y cabaña;
  Google debajo, bloqueos encima y reservas de la base arriba; los eventos sin cabaña van primero para
  que uno con cabaña mande sobre ellos; las noches seguidas de lo mismo se juntan en **una barra** con
  su inicio, sus noches y si continúa antes o después del mes. En la barra de un evento de Google no se
  repite la cabaña (`sinCabanaEnTitulo`: «Diana Montoya cabaña 1» → «Diana Montoya»); el título
  completo va en el detalle.
- **Escritorio:** rejilla CSS, **todas las columnas iguales** (`minmax(5rem, 1fr)`; 4,25rem en el
  celular). Ojo: con `min-width: max-content` cada columna crecía hasta el nombre más largo; el ancho
  va explícito (`max(100%, cabaña + n × día)`). Barras de dos líneas, columna de cabañas y cabecera de
  días `sticky` dentro del contenedor (alto máximo 78vh), fines de semana y festivos en `crema-100`
  (festivo con punto), hoy en `petroleo-50` con el número en círculo. Colores en
  `estilos-calendario.ts`: reservas de la base en color lleno por estado, **Google rayado con borde
  punteado**, **Google sin cabaña rayado con borde ámbar** («ocupa todas»), bloqueo con candado.
  Leyenda abajo. Fila del Día de Calma con «4/10».
- **Navegación** (`navegacion-mes.tsx`, cliente): flechas, el título abre el **selector de mes y
  año** (`RejillaMeses`) y botón **Hoy**. Límites del panel: enero de hace 2 años a diciembre de dentro
  de 2 (`limitesDelPanel`); flechas y selector los respetan. Conserva el filtro `?estado=`.
- **Celular** (`vistas-calendario.tsx`): **agenda por día** por defecto —tira de días con «3/5»
  cabañas ocupadas y, debajo, las cinco cabañas de ese día (quién duerme, quién llega, quién sale por
  la mañana) y el cupo del Día de Calma—, con «Mes completo» para la cuadrícula. **Por qué:** cinco
  filas × 31 columnas no se leen a 390 px, y la pregunta que llega por WhatsApp es de un día.

#### 3. El Resumen cuenta también Google

`src/lib/admin/estadisticas.ts` (puro, 12 pruebas) + `src/app/admin/(panel)/page.tsx`. Una sola
lectura de Google (`ocupacionDelCalendario`) para el mes y los próximos 7 días. Muestra: en casa esta
noche, llegan hoy (y salen), llegan esta semana, ocupación del mes (noches ocupadas / noches que se
podían vender: sin bloqueos ni las noches que la cabaña no ofrece —la 02 cuenta 16 en octubre—, por
cabaña y total), reservas del mes por origen (sitio web / panel / calendario del hotel, por **llegada**
en el mes) e **ingresos aparte, solo de la base**, dicho en la tarjeta. **Sin doble conteo:** los
eventos con `origen = lafinca-web` ya llegan descartados; el mismo evento en dos calendarios se une;
un evento de Google con la misma cabaña y fechas exactas que una reserva de la base se cuenta como la
de la base; las noches se cuentan con un conjunto por cabaña. **Un evento sin cabaña** cuenta como una
reserva «sin cabaña», sale en las llegadas y queda **fuera** del porcentaje (lo dice). Si Google falla
o no está conectado: cuenta la base y lo avisa en una línea.

Datos reales del 2026-10-05: 2 en casa, 2 llegan hoy, 10 en la semana, ocupación de octubre 28 %
(39 de 140 noches), 36 reservas del calendario del hotel con llegada en octubre.

#### 4. La reserva manual con el calendario del sitio

- `formulario-reserva.tsx` usa **`CalendarioFechas`** con `elegibilidad-calendario.ts`. **Primero la
  cabaña** (una nueva empieza sin cabaña y el calendario va en `<fieldset disabled>`), luego las
  fechas. Sin `minima`: **el panel reserva para hoy**. Al editar una estadía que ya empezó, el «hoy»
  del calendario es su llegada (para poder conservarla). La 02 tacha lunes a jueves (`tiposOfrecidosDe`
  sobre sus tarifas); el Día de Calma pasa el calendario a `diaUnico` y tacha los días sin cupo.
  Cambiar de cabaña con fechas puestas no las borra: si chocan, aviso rojo debajo.
- **`/admin/api/ocupacion`** (nuevo, comprueba sesión): noches ocupadas de UNA cabaña (también
  pausada) y cupo del Día de Calma, **sin la reserva que se edita** (`excluir`). Reglas en
  `src/lib/admin/ocupacion-panel.ts` (puro, 10 pruebas): `ocupaCalendario` + bloqueos +
  `franjasQueChocan` (la misma regla del servidor). Hook `usar-ocupacion-panel.ts` (mes visible y el
  siguiente, caché 5 min por cabaña).
- **Servidor:** `buscarChoques` ya sumaba los eventos de Google y cualquier choque bloqueaba; no había
  un aviso aparte que convertir. Lo nuevo: `describirChoquesEnCabana()` («Esas noches ya están ocupadas
  en la Cabaña 03 por «Alvaro Pacheco cabaña 3» (calendario del hotel), del lun 05/10/2026 al mar
  06/10/2026. Si es la misma reserva, ya está apuntada en el calendario de Google del hotel: no hace
  falta registrarla otra vez…»), usado al guardar y al cambiar de estado; y si Google no respondió, el
  mensaje de éxito avisa (`calendarioSinLeer`, de la caché). `describirChoques` (el del sitio y los
  bloqueos) no cambió. 5 pruebas con un doble de Google.
- **Arreglo colateral, todo el panel:** React 19 **reinicia un `<form action>` al terminar la acción
  aunque falle**. Tras un rechazo se vaciaban nombre y teléfono y el desplegable de cabaña volvía en
  pantalla a la 01 mientras su estado seguía en la 03 (el siguiente envío habría mandado la 01).
  `FormularioAccion` ahora despacha a mano desde `onSubmit` (sin reinicio), reinicia solo si salió bien
  y trae el aviso a la vista; `BotonEnviar` lee el «enviando» por contexto.

#### 5. Selector de mes y año en `calendario-fechas.tsx`

El título del mes es un botón que abre `src/components/ui/rejilla-meses.tsx` (doce meses, año con
flechas, tabulación itinerante, `aria-disabled` con motivo, Escape vuelve a los días sin cerrar el
calendario). Límites en `src/lib/utils/selector-mes.ts` (10 pruebas): del mes de la primera fecha
elegible a **24 meses** (`MESES_VISIBLES_CALENDARIO`). **Antes las flechas no tenían tope hacia
delante**; ahora flechas, teclado (RePág/AvPág) y selector paran en el mismo sitio. Funciona en la
portada, `/reservar` y el panel. De paso, la ayuda del Día de Calma ya no dice «desde mañana» cuando
no hay antelación (panel).

#### 6. «Temporadas» → «Tarifas diferenciales»

Lo hizo un agente Sonnet en paralelo (commits `1d86dbd`, `381c12e`): menú, títulos, botones («Nueva
tarifa diferencial», «Crear tarifa diferencial», «Borrar tarifa diferencial»), mensajes, avisos de
cruce, ficha de cabaña y el bloqueo al borrar un plan. Ruta `/admin/tarifas-diferenciales` con
redirección permanente desde `/admin/temporadas/:path*` (`next.config.ts`). Tablas e identificadores
siguen siendo `temporadas` (comentado). Recuadro «Cómo se aplican» reescrito con un ejemplo de fin de
año. El huésped sigue viendo «temporada».

#### Fechas `dd/mm/aaaa`

Lo nuevo ya las escribe así (`fechaNumerica`, `fechaConDia` → «lun 05/10/2026», `rangoConDias` en
`src/lib/admin/fechas.ts`). El barrido del resto lo hace otra ronda.

#### Verificación

`tsc` limpio · `npm test` **496 en verde** (444 + 52) · `next build` sin errores (en un worktree de git
fuera de OneDrive, con el mismo commit) · eslint limpio en lo tocado. Capturas con Chrome headless
contra `localhost:3127` (dev y luego `next start`), a 1440 y 390: calendario de octubre con los 36
eventos reales, selector de mes, agenda del celular, Resumen, reserva manual con noches tachadas
(Cabaña 03 y 02), rechazo del servidor por «Alvaro Pacheco cabaña 3» (sin escribir nada en la base ni
en Google), Tarifas diferenciales y el selector en `/reservar`. Sesión con el usuario de pruebas
rotando su contraseña por la Admin API y rotándola de nuevo al terminar. **No se creó ninguna reserva,
bloqueo ni tarifa**: la exclusión de la propia reserva al editar está cubierta por pruebas, no por un
recorrido real (crear una reserva de prueba habría escrito en el calendario de Google del hotel).

**Medición de `scrollWidth`** (`next start`, con sesión): las **31 páginas del panel** (Resumen,
Reservas en octubre de 2026, Nueva reserva, Bloqueos, Cabañas y su ficha y alta, Planes, Tarifas
diferenciales con su alta y edición, Experiencias, Adicionales, Contenido y sus diez secciones,
Usuarios) más la redirección de `/admin/temporadas`, a 320, 390, 768, 1024, 1440 y 1920: **192 de
192 con `scrollWidth <= innerWidth`** (el máximo es exactamente el ancho de la ventana en cada caso).
Antes: Reservas daba 2112 a 1440 y 1808 a 320. La primera pasada encontró un segundo culpable de 8 px
a 320 en la misma página —el texto del recuadro «Calendario del hotel», apretado a 24 px junto a la
pastilla—; ahora baja a su propia línea.

#### Hallazgos que quedan anotados (no se tocaron)

1. **Un evento de Google sin cabaña bloquea las cinco**, y ya hay uno real: «Cristian Arcila plan
   día» (4 de octubre, general). Parece un Día de Calma apuntado en el calendario de cabañas. Dejó
   el domingo 4 sin ninguna cabaña libre en el sitio. Pedir al hotel que no apunte los Días de Calma
   ahí o que les ponga otra marca; o decidir una regla («plan día» no ocupa cabaña).
2. **`/api/reservar` devuelve al navegador `describirChoques()`**, que lleva nombre del huésped,
   código de reserva o título del evento de Google: cualquiera que haga un POST a mano sobre unas
   fechas ocupadas lee quién las tiene. Está en `src/lib/pagos/crear-reserva.ts` (fuera de esta
   ronda): el sitio debería responder un texto genérico («esas fechas acaban de ocuparse»).
3. La agenda del celular no ve la salida de una estadía cuya última noche fue la del mes anterior: el
   día 1 no dice «sale por la mañana».

### 2026-10-05 (noche) — Fechas `dd/mm/aaaa` en todo el sitio, la fuga de `/api/reservar` y el «plan día»

Tres encargos de Cesar. Los dos hallazgos 1 y 2 de la entrada anterior quedan resueltos.

#### 1. Fechas siempre `dd/mm/aaaa`

- **Una sola fuente:** `src/lib/utils/formato.ts` → `formatearFecha` («05/10/2026») y
  `formatearFechaConDia` («lun 05/10/2026»), y lo que se arma con ellas: `formatearRango`
  («01/12/2026 al 08/01/2027»), `formatearRangoConDias`, `formatearEstadia`, `formatearFechaHora`
  («05/10/2026, 14:35», hora de Bogotá) y `leerFechaNumerica` (lo que se escribe a mano: `05/10/2026`,
  `5/10/2026`, `05102026`; nunca mm/dd). Una fecha plana se corta como texto (sin `Date`, sin desfase
  de un día en ninguna zona); un instante se lleva al día de Bogotá. 120 llamadas en 22 archivos.
- Desaparecen `formatearFechaCorta` y los formateadores propios de `admin/fechas.ts` (`fechaCorta`,
  `fechaLarga`, `rangoCorto`, `fechaHora`, `fechaNumerica`, `fechaConDia`, `rangoConDias`), el
  `toLocaleDateString` de la autorización de datos y los dos `Intl.DateTimeFormat` de
  `calendario-fechas.tsx` (el lector de pantalla oye «sábado 19/09/2026»).
- **Regla para lo que venga:** fecha para personas → `formatearFecha`/`formatearFechaConDia`. Nombre
  de mes solo en cabeceras de calendario y selector de mes (`mesEnPalabras`, `tituloMes`). ISO para
  máquinas (base, URL, JSON-LD, sitemap, `datetime`, parámetros de las API).
- Cubre también: la línea de tarifas de la ficha («Del 01/12/2026 al 08/01/2027 aplican tarifas de
  temporada…», ya siempre con año), la descripción del cobro en Bold, la versión de la política en el
  WhatsApp y la **descripción de los eventos que el sitio escribe en Google**, que ahora dice
  «Llegada: mar 15/12/2026 · Salida: vie 18/12/2026 (3 noches)» (Google pinta un evento de todo el día
  hasta la víspera de la salida).
- **`SelectorFecha`** (`src/components/admin/selector-fecha.tsx`) reemplaza los cinco
  `<input type="date">` del panel (bloqueos ×2, tarifas diferenciales ×2, fecha de actualización de las
  páginas legales), que con el navegador en inglés salían en mm/dd/yyyy. Campo de texto `dd/mm/aaaa` +
  calendario del mismo estilo que el de reservar (con selector de mes y año); al formulario viaja la
  ISO en un campo oculto; lo escrito a medias o fuera de rango bloquea el envío con `setCustomValidity`
  en español. Es de UN día: «Primera noche / Última noche» siguen siendo noches incluidas (la última
  puede ser igual a la primera). No se usó `CalendarioFechas` porque habla de llegada y salida.

#### 2. `/api/reservar` ya no dice quién tiene las noches

Con noches ocupadas devolvía `describirChoques()` (nombre del otro huésped, código de su reserva o
título del evento de Google): con un POST a mano se sabía quién se aloja cuándo (Ley 1581). Ahora
responde `mensajeNochesOcupadasParaHuesped()` («Esas noches ya no están disponibles en la Cabaña 03.
Elige otras fechas o escríbenos por WhatsApp.») y el detalle va a `console.warn` del servidor. El
panel sigue con el detalle (`describirChoquesEnCabana`, `describirChoques` en bloqueos). Prueba del
Route Handler entero (`src/lib/pagos/respuesta-publica.test.ts`; Vitest tiene ahora el alias `@/`).
Revisadas también: `/api/disponibilidad` y `/api/dia-de-calma/cupo` (solo cabaña, fechas y conteos),
la confirmación de pago (código, fechas, cabaña e importes de la propia reserva, por una referencia de
Bold que lleva la marca de tiempo en milisegundos; ni nombre, ni correo, ni teléfono), el WhatsApp
(solo los datos que escribe el propio huésped) y el webhook (responde textos fijos tras validar la
firma). El mensaje del trigger del cupo (`LF010`) solo trae cifras.

#### 3. Regla 2b: un «plan día» del calendario general no ocupa cabaña

**Manual interno:** un evento de Google **sin cabaña reconocible** cuyo título dice «plan día», «plan
de día», «día de calma», «dia de calma», «pasadía» o «pasadia» (sin mirar mayúsculas ni tildes) es un
Día de Calma: **no bloquea ninguna cabaña** y **gasta 2 cupos** del Día de Calma ese día. Si nombra
una cabaña o viene del subcalendario de una cabaña, sigue ocupando esa cabaña; sin cabaña ni señal,
sigue bloqueando las cinco.

- Vive en `calendario-externo.ts` (`esTituloDeDiaDeCalma`, `leerEventos`, `lecturaDeVariosCalendarios`,
  `personasDeDiaDeCalmaPorFecha`, `PERSONAS_POR_EVENTO_DIA_DE_CALMA = 2`). Los Días de Calma van en
  una lista **aparte** (`LecturaCalendario.diasDeCalma`), no en `ocupacion`: así ningún código que lea
  `cabana === null` como «ocupa todas» los cuenta por descuido.
- Suman al cupo en `/api/disponibilidad` (`dia`), `/api/dia-de-calma/cupo`, `cotizarEnServidor`, la
  reserva manual del panel (el aviso nombra el evento), `/admin/api/ocupacion`, la fila del Día de
  Calma del calendario del mes (borde punteado y el título en el detalle), la agenda del celular y el
  Resumen (como Día de Calma de 2 personas, ya no como «evento sin cabaña»). Leyenda, diagnóstico e
  indicador de conexión lo explican. **El trigger de la base no ve Google**: el límite con los «plan
  día» lo ponen el sitio y el panel.
- Datos reales tras el cambio: el 04/10/2026 quedan libres las Cabañas 02 a 05 (la 01 tiene su propia
  reserva) y el Día de Calma marca 2/10. El indicador dice «35 eventos ocupan fechas; 1 evento es de
  Día de Calma».

#### Verificación

`tsc` limpio · `npm test` **523 en verde** (496 + 27) · `next build` sin errores en un worktree fuera
de OneDrive (borrado al terminar) · eslint limpio en lo tocado. Capturas con Chrome headless contra
`localhost:3191` (`next start`), a 1440 y 390: desglose de `/reservar` con 15–18/12/2026, calendario
abierto, ficha de la Cabaña 03 con la línea de tarifas, `/legal/terminos`, y en el panel —con un
usuario **temporal** creado por la Admin API y **borrado** al terminar (no se usó
`panel@lafincaecohotel.com`)— el selector en Bloqueos y en Tarifas diferenciales (escribir
`1/12/2026` → `01/12/2026`; una última noche anterior a la primera se rechaza en español) y el
calendario de octubre con el «plan día» en la fila del Día de Calma. Correos renderizados con
`scripts/probar-correos.mjs`.

**Ojo con ese script:** con `RESEND_API_KEY` y `EMAIL_NOTIFY_TO` en `.env.local` **envía** los seis
correos de prueba aunque no se pase `--enviar`. El 05/10/2026 hacia las 20:45 llegaron seis correos
«[PRUEBA] …» (reservas de ejemplo de octubre de 2026) a `fincavillarrealcali@gmail.com`. Para solo
renderizar, correrlo sin `RESEND_API_KEY` en el entorno.

#### Pendiente

- El hallazgo 3 de la entrada anterior (la agenda del celular no ve la salida de una estadía cuya
  última noche fue la del mes anterior) sigue abierto.
- Las API públicas responden «Escribe las fechas en formato AAAA-MM-DD.» a un parámetro mal formado:
  es el formato de la URL, no una fecha para leer; se dejó así.

### 2026-10-05 (noche) — Seguridad: una cuenta sin rol ya no entra al panel ni lee la base

**El hallazgo.** Con el registro público de Supabase Auth abierto (`disable_signup: false`) y la clave
anónima en el JavaScript del sitio, cualquiera podía crearse una cuenta y: entrar al panel (a una
cuenta sin rol se la trataba como «equipo») y leer y escribir reservas, pagos y bloqueos por la API
REST (las políticas eran `to authenticated using (true)`). Reproducido con una cuenta temporal sin
rol: insertó, leyó y borró un bloqueo. No hubo intrusos: las únicas cuentas eran las 2 reales, las dos
con rol. Cesar apaga el registro público en Supabase, pero el código y la base ya no dependen de eso.

- **Panel:** el rol se lee **solo** de `app_metadata.rol` (lo escribe únicamente la clave de servicio;
  `user_metadata` lo edita el propio usuario y no se mira nunca). Se quitó `ROL_POR_DEFECTO`:
  `rolDeMetadatos()` devuelve `null` sin rol válido. El middleware, `requireAdmin()` y el login
  tratan una sesión sin rol como sin sesión: la cierran (cookies vaciadas en la misma respuesta) y
  llevan a `/admin/login?motivo=sin-acceso` con «Esta cuenta no tiene acceso al panel…». Las rutas
  de `/admin/api` usan `leerSesionDelPanel()` y responden 403. Usuarios muestra una cuenta sin rol
  como «Sin acceso al panel» y deja asignarle uno.
- **Base — migración `018_solo_roles_validos.sql`** (aplicada a la base real tras ensayarla en una
  transacción deshecha): función `es_admin()` (`stable`, `security invoker`, `search_path` vacío)
  que mira `app_metadata.rol` del JWT. Escritura de las 11 tablas del panel (alojamientos, planes,
  tarifas, extras, contenido, imagenes, temporadas, reservas, reserva_extras, bloqueos, pagos) y la
  lectura extra del panel dentro de las políticas públicas pasan de `true`/`auth.role()` a
  `es_admin()`. Storage: subir/reemplazar/borrar en `imagenes` y `videos` exige `es_admin()`. La
  lectura pública no cambia. `authenticated` pierde TRUNCATE/TRIGGER/REFERENCES. Cómo deshacerla:
  al final del propio archivo, comentado.
- ⚠️ **Regla para las próximas migraciones:** una tabla o un bucket nuevo que escriba el panel lleva
  `using ((select public.es_admin())) with check ((select public.es_admin()))`, nunca `true` ni
  `auth.role() = 'authenticated'`. Y una función `security definer` que el panel llame con su
  sesión tiene que comprobar `es_admin()` dentro, porque se salta RLS.
- **`/api/salud`** falla cerrado: en producción sin `CRON_SECRET` responde 503 y lo deja en el
  registro; en local y previews sigue abierto (`src/lib/api/secreto-cron.ts`).
- **Correos:** los registros de Vercel ya no llevan destinatario ni asunto (el del aviso interno
  tiene el nombre del huésped): solo tipo de correo, código de la reserva y si salió.

**Pruebas en la base real**, con dos cuentas temporales creadas por la Admin API (una sin rol —con
`user_metadata.rol = propietario` para probar que se ignora— y una `equipo`), borradas al terminar:
antes de la 018 la cuenta sin rol leía `reservas` (HTTP 200; `anon` recibe 401) e insertaba y
borraba bloqueos; después no ve un bloqueo existente (0 filas; `equipo` lo ve), no inserta en
`bloqueos` ni `temporadas` (42501), no actualiza ni borra lo de otro (0 filas), no sube a `imagenes`
ni a `videos` y no borra una imagen ajena. `equipo` lee todo, crea/edita/borra un bloqueo y sube y
borra una imagen (también por `/admin/api/galeria/subir`). `guardar_temporada()` ensayada: funciona
con las dos cuentas reales y la `equipo`, rechazada sin rol. Contra `localhost` (`next start`): la
cuenta sin rol va a `/admin/login?motivo=sin-acceso` desde `/admin`, `/admin/reservas`,
`/admin/usuarios` y `/admin/api/…`, sin bucle en el login; por el formulario real (Chrome headless)
se queda en el login con el aviso y sin cookie; `equipo` entra al panel. Sin restos: 0 bloqueos y 0
archivos de prueba. Quedan las 2 cuentas reales.

**Verificación.** `tsc` limpio · `npm test` 623 en verde (25 nuevas: `auth.test.ts`,
`middleware.test.ts`, `secreto-cron.test.ts`) · `next build` sin errores en un worktree fuera de
OneDrive (borrado al terminar).

#### Pendiente

- Cesar: desactivar el registro público en Supabase (Authentication → Sign In / Providers → «Allow
  new users to sign up»). Ya no es lo único que protege, pero sobra tenerlo abierto.
- `siguiente_codigo_reserva()` (migración 019) es `security definer` y la puede ejecutar cualquier
  `authenticated`: una cuenta sin rol podría gastar números de código de reserva (no lee ni escribe
  datos). Añadirle `if not public.es_admin() then raise …` o quitarle el `grant` a `authenticated`.
