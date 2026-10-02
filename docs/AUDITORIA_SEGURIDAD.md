# Auditoría de seguridad — La Finca Eco Hotel

> Hecha el **2026-09-30**, antes del lanzamiento comercial, sobre la rama `main`
> y contra la base de datos real de Supabase.
>
> **Todo se verificó contra `localhost`**, nunca contra el dominio de Vercel:
> auditar producción ya provocó un bloqueo del firewall por tráfico anómalo.
> Las pruebas de base de datos sí van contra la base real (es la única que hay),
> pero son de lectura y de permisos; las tres que escriben algo (una tabla de
> prueba, un intento de subida al bucket, un intento de crear una cuenta) se
> revirtieron y se comprobó que no quedó nada. Ver «Sin residuos» al final.
>
> Qué se auditó: acceso a datos en Supabase (RLS, GRANTs, funciones, Storage),
> panel y autenticación, superficie pública (`/api/**`, validación, XSS,
> cabeceras), secretos y dependencias, cumplimiento de la Ley 1581 de 2012 de
> protección de datos personales, y la costura preparada para la pasarela de pagos.

---

## Resumen

| Severidad | Hallazgos | Corregidos | Aceptados o pendientes |
|---|---|---|---|
| Crítico | 0 | — | — |
| Alto | 4 | 4 | 0 |
| Medio | 6 | 5 | 1 (M-6, mitigado) |
| Bajo | 6 | 3 | 3 (aceptados, con motivo) |

**Lo que estaba bien y conviene decir en voz alta**, porque es la mitad del
trabajo: las políticas RLS de las diez tablas son correctas y se probaron una
por una con la clave anónima (lectura, inserción, actualización y borrado);
`reservas`, `pagos`, `reserva_extras` y `bloqueos` son invisibles e inescribibles
desde fuera; las tres capas que protegen el panel funcionan, incluida la
separación entre `propietario` y `equipo` verificada en servidor con un usuario
real; no hay ni una credencial en el repositorio ni en el historial de git; la
clave de servicio no viaja al navegador; los dos endpoints públicos devuelven
solo agregados y no filtran ni un nombre de huésped; y no había datos de prueba
en la base.

**Lo que no estaba bien** se concentraba en tres sitios: la **cookie de sesión
del panel** (legible por JavaScript y válida 400 días), la **ausencia total de
cabeceras de seguridad**, y el **consentimiento de datos personales**, que la
política prometía y el sitio no pedía.

---

## Crítico

Ninguno.

---

## Alto

### A-1 · La cookie de sesión del panel era legible por JavaScript y duraba 400 días — CORREGIDO

**Evidencia.** Login real contra el build de producción en `localhost`, leyendo
la cabecera `Set-Cookie`:

```
sb-yyfuhytmoiehqmnrekkq-auth-token
  Path=/; Expires=Thu, 04 Nov 2027 ...; Max-Age=34560000; SameSite=lax
```

Sin `HttpOnly`, sin `Secure`, y 34 560 000 segundos = **400 días**.

**Por qué importa.** Esa cookie ES el panel: abre las reservas, los datos
personales de los huéspedes y la administración de cuentas. Sin `HttpOnly`,
cualquier XSS —propio o de una dependencia— la copia con una línea de
JavaScript. Y con 400 días de vida, un portátil olvidado sigue entrando más de
un año después.

El `httpOnly: false` viene de `@supabase/ssr` y en su contexto es deliberado:
`createBrowserClient()` necesita leer la cookie. **Este proyecto no crea ningún
cliente de navegador** (`crearClienteNavegador()` no lo importa ni un
componente: `grep -rn "crearClienteNavegador" src/` devuelve solo su propia
definición), así que no se pierde nada al cerrarla.

**Corregido** en `src/lib/supabase/opciones-cookie.ts`, aplicado en `server.ts` y
en el middleware. La duración hubo que recortarla al escribir la cookie, porque
la librería **ignora el `maxAge` de `cookieOptions`**: lo pisa a mano con su
constante (`node_modules/@supabase/ssr/dist/main/cookies.js`, líneas 233 y 464).
Se añadieron además las cabeceras anti-caché que la propia librería pide, para
que ninguna CDN pueda servir la sesión de una persona a otra.

**Verificado** tras el cambio:

```
Path=/; Expires=Fri, 30 Oct 2026 ...; Max-Age=2592000; Secure; HttpOnly; SameSite=lax
```

### A-2 · El sitio se servía sin una sola cabecera de seguridad — CORREGIDO

**Evidencia.** `curl -sI http://localhost:3112/` sobre el build de producción,
antes del cambio:

```
content-security-policy: (ausente)
strict-transport-security: (ausente)
x-content-type-options: (ausente)
referrer-policy: (ausente)
permissions-policy: (ausente)
x-frame-options: (ausente)
x-powered-by: Next.js
```

**Por qué importa.** Sin `X-Frame-Options`/`frame-ancestors`, cualquiera puede
meter el panel en un iframe invisible y hacer que un administrador pulse
«Eliminar reserva» creyendo que pulsa otra cosa (clickjacking). Sin CSP, un
script inyectado —por el CMS, por una dependencia comprometida— puede cargar
código de cualquier dominio y mandar los datos del huésped a donde quiera. Sin
`Referrer-Policy`, las direcciones del panel viajan a los sitios externos que se
abren desde él.

**Corregido** en `next.config.ts`, con `poweredByHeader: false` y seis cabeceras.
La CSP no es genérica: se escribió a partir de lo que el sitio carga de verdad,
comprobado en el HTML prerenderizado (`cat .next/server/app/*.html | grep -o
'https://[a-zA-Z0-9.-]*' | sort | uniq -c`), que da exactamente nueve hosts, todos
contemplados. Además:

- `frame-src` solo admite Instagram y los dos hosts de Google Maps.
- `form-action 'self'`: un formulario inyectado no puede enviar los datos del
  huésped a otro servidor.
- `/admin/*` lleva además `X-Robots-Tag: noindex, nofollow` y `Cache-Control:
  private, no-store`.

Dos decisiones que conviene conocer, y están explicadas en el archivo:

1. **`script-src` lleva `'unsafe-inline'`.** Next inyecta scripts en línea en
   cada página; la forma limpia de permitirlos es un `nonce` por petición, y un
   `nonce` exige middleware en las rutas públicas, lo que las volvería dinámicas
   y le costaría al sitio el prerenderizado y el ISR de sus 18 páginas. Se eligió
   el sitio estático. **Lo que la CSP sí impide, y es lo que más vale, es cargar
   un script desde un host ajeno.**
2. **HSTS va sin `includeSubDomains` ni `preload`.** `includeSubDomains`
   obligaría a que todos los subdominios de `lafincaecohotel.com` fueran HTTPS
   para siempre, y el correo y lo que quede en Hostinger no están verificados.
   Queda como pendiente P-4.

**Verificado:** las seis cabeceras salen en producción, `x-powered-by` ya no, y
el build sigue prerenderizando las 19 rutas públicas como estáticas (la CSP no
las volvió dinámicas).

### A-3 · El login no tenía ninguna protección contra fuerza bruta — CORREGIDO

**Evidencia.** 12 intentos de contraseña seguidos contra una cuenta real, en
5,4 segundos, todos con la misma respuesta y sin ningún freno.

**Por qué importa.** El límite de Supabase Auth no ayuda aquí: `signInWithPassword`
se llama **desde el servidor**, así que todos los intentos llegan a Supabase con
la IP de la función de Vercel. O el límite no salta nunca, o salta contra el hotel
entero.

**Corregido** en `src/app/admin/(auth)/login/acciones.ts`: diez intentos por
cuenta cada cinco minutos y treinta por IP cada quince. Quien acierta sale del
contador, así que equivocarse dos veces y entrar a la tercera no deja rastro.

La primera versión de este arreglo puso cinco intentos cada quince minutos y **se
probó que era peor que el problema**: dejaba al propietario sin entrar después de
ocho fallos, incluso escribiendo luego la contraseña correcta. Quien conozca su
correo podría dejarlo sin ver las reservas del día. Los números actuales curan la
ventana en cinco minutos y siguen dejando la fuerza bruta en 120 intentos por
hora contra una contraseña de diez caracteres como mínimo.

**Verificado** contra el build de producción, midiendo el tiempo de respuesta:
los diez primeros intentos tardan ~220 ms porque van a Supabase; del once en
adelante, ~20 ms, porque se cortan antes de salir. Dos fallos y la contraseña
correcta entran con su cookie. Además, once pruebas unitarias
(`src/lib/api/limite-peticiones.test.ts`) fijan los números y comprueban que la
ventana se cura sola.

### A-4 · Cualquier tabla futura de `public` nacía escribible por anónimos — CORREGIDO

**Evidencia.** `select defaclacl from pg_default_acl` devolvía, para el esquema
`public`:

```
{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=...,service_role=...}
```

`arwdDxtm` es **todo**: insert, select, update, delete, truncate, references,
trigger. Concedido por defecto a `anon` sobre cualquier tabla que se cree después.

**Por qué importa.** La migración `002_rls.sql` lo compensó a mano, tabla por
tabla, con `revoke`. Eso funciona para las diez tablas que existían y **falla en
silencio para la primera que se cree después**: la tabla de la pasarela de pagos,
la de consentimientos, la de correos enviados. Si quien la escribe olvida el
`revoke` —o el `enable row level security`— la tabla nace con inserción,
actualización y borrado abiertos a internet. Es el fallo más caro posible y
dependía de que nadie se olvidara, justo en la fase que viene (pagos).

**Corregido** en `supabase/migrations/011_privilegios_endurecidos.sql`: se
invierte la regla, `anon` no recibe nada por defecto, y lo que el público debe
leer se concede explícitamente tabla por tabla.

**Verificado** creando una tabla de prueba después de aplicar la migración:

```
has_table_privilege('anon','_prueba_auditoria', 'SELECT'|'INSERT'|'DELETE'|'TRUNCATE')
→ false | false | false | false
```

(la tabla se borró en la misma sesión).

> ⚠ **Consecuencia para la próxima migración:** una tabla nueva que deba leerse
> desde el sitio público necesita su `grant select on <tabla> to anon` a mano,
> además de su política RLS. Si el sitio deja de ver una tabla nueva, esto es el
> motivo. Es deliberado: se prefiere un `select` que falta a un `insert` que sobra.

---

## Medio

### M-1 · `anon` podía hacer `TRUNCATE`, y `TRUNCATE` no pasa por RLS — CORREGIDO

**Evidencia.** `has_table_privilege('anon','contenido','TRUNCATE')` → `true`.
Igual en `alojamientos`, `planes`, `tarifas`, `extras` e `imagenes`.

**Por qué importa.** Postgres aplica RLS a `select`, `insert`, `update` y
`delete`. **A `truncate` no.** Hoy no es explotable —PostgREST no expone
`truncate` y `anon` no puede ejecutar SQL libre ni crear objetos (`USAGE` sí,
`CREATE` no, verificado)— pero es un privilegio que, el día que exista una
función `security definer` descuidada o una ruta nueva, vacía el catálogo y el
contenido del sitio de un golpe y sin que RLS diga nada.

**Corregido** en la migración 011: `revoke truncate, trigger, references on all
tables in schema public from anon`. **Verificado:** `TRUNCATE` es `false` en las
diez tablas.

### M-2 · El mapa del CMS entraba sin validar en un `<iframe src>` público — CORREGIDO

**Evidencia.** `sitio.contacto.mapa_embed` se guardaba con `textoOpcional(...)`
—cualquier cadena— y se pintaba tal cual en `src/components/paginas/contacto.tsx`
y `conocenos.tsx`.

**Por qué importa.** Cualquier cuenta del panel, incluido el rol `equipo`, o
cualquiera que consiguiera una sesión, podía dejar en la página del hotel un
marco a un sitio ajeno: una pasarela de pago falsa con la marca de La Finca, un
formulario que pide la tarjeta, publicidad. El reel de Instagram ya se validaba
(`direccionEmbebido()`); el mapa se había quedado fuera.

**Corregido** con `src/lib/mapa-embebido.ts`, aplicado en los dos extremos: al
guardar (para que el cliente vea el «no» en el momento, con un mensaje que
explica de dónde copiar la dirección) y al pintar (porque es ahí donde se decide
qué entra en el iframe). Nueve pruebas escritas desde el ataque, incluidos
`javascript:`, `data:`, `http://` y `google.com.attacker.net`. La CSP lo cierra
por segunda vez con `frame-src`.

**Verificado:** el mapa real del hotel sigue pintándose en las dos páginas.

### M-3 · Los endpoints públicos no tenían freno de peticiones — CORREGIDO

**Evidencia.** 35 peticiones seguidas a `/api/disponibilidad`, todas atendidas.

**Por qué importa.** No es una fuga de datos: los dos endpoints están bien
diseñados y devuelven **solo agregados** (una lista de fechas ocupadas, sin
nombres ni códigos; un número de cupos). El riesgo es de disponibilidad y de
coste: `/api/disponibilidad` lee `reservas` y `bloqueos` con `service_role` y
**además llama al Google Calendar del hotel**, así que un script en bucle agota la
cuota de la API de Google y deja al hotel sin calendario justo el fin de semana
que más se vende. Y el cupo del Día de Calma, pedido día a día durante meses,
permitiría dibujar la ocupación del hotel.

**Corregido** con `src/lib/api/limite-peticiones.ts`: 30 peticiones/minuto para
disponibilidad, 60 para el cupo, 429 con `Retry-After` y un mensaje en español
que puede leer un huésped.

**Verificado:** el primer 429 llega en la petición 31, con `retry-after: 53`.

**Límite conocido**, documentado en el propio archivo: el contador vive en la
memoria de la instancia, así que con varias instancias vivas el tope efectivo se
multiplica y un despliegue lo reinicia. Es un freno contra el abuso de un script,
no una cerradura. La cerradura está en el pendiente P-1.

### M-4 · No había autorización expresa del titular ni prueba de ella — CORREGIDO

**Evidencia.** La política publicada decía: «al enviarnos una solicitud de
reserva por WhatsApp o al completar una reserva en el sitio, **aceptas esta
política**». El sitio no pedía ninguna casilla, y la tabla `reservas` no tenía
dónde guardar la autorización.

**Por qué importa.** La **Ley 1581 de 2012** (art. 9) exige autorización
**previa, expresa e informada**; «aceptas por usar el sitio» es consentimiento
tácito y no la cumple. El **Decreto 1074 de 2015** (art. 2.2.2.25.2.4, que
compiló el Decreto 1377 de 2013) obliga además a **conservar prueba** de la
autorización. La política prometía conservarla y no se conservaba: ante una queja
en la SIC, el hotel no podía demostrar nada, y quien responde es el hotel.

**Corregido, en cuatro piezas:**

1. **Casilla en el motor de reservas** (`selector-reserva.tsx`), justo antes del
   botón —la autorización tiene que ser previa a la entrega de los datos, y los
   datos se entregan al pulsar—. Arranca **desmarcada**, dice para qué son los
   datos y qué derechos hay, y enlaza la política en otra pestaña para que
   leerla no obligue a perder la reserva a medias. **El botón de enviar no
   funciona hasta que se marca**, y es un `<button disabled>` y no un enlace
   apagado, porque un enlace deshabilitado sigue siendo pulsable con el teclado.
2. **La constancia viaja en el mensaje de WhatsApp.** Mientras el cierre sea
   WhatsApp, la reserva la escribe después el equipo: si la aceptación no viaja
   en el mensaje, la prueba se pierde en el paso más frágil de todo el flujo, la
   memoria de quien atiende.
3. **Tres columnas en `reservas`** (migración 012): cuándo autorizó, qué versión
   del texto aceptó y por qué canal, con un `check` que impide una prueba a
   medias. La versión importa: la política se edita desde el panel, y dentro de
   un año el texto publicado no será el que el huésped leyó.
4. **El panel lo pregunta y lo muestra.** El formulario tiene el desplegable de
   canal —distingue una casilla del sitio de un «sí» dicho por teléfono, porque
   no valen lo mismo y disfrazar el segundo de lo primero sería peor que no
   registrar nada— y la ficha de la reserva lo pinta **siempre, también cuando
   falta**: la ausencia es lo que hay que ver de un vistazo.

Sin canal, las tres columnas quedan en `null`, que significa «no consta». Es
información útil: es la lista de reservas cuya autorización habría que conseguir.

**Nota importante encontrada por el camino:** los cuatro documentos legales viven
en el CMS, así que **editar `src/lib/legal.ts` no cambiaba nada de lo publicado**.
Antes de regenerar el seed se comparó cada una de las 22 filas de `contenido` con
el seed versionado: todas iguales, ninguna editada desde el panel, así que
aplicarlo no pisó trabajo del cliente. **Verificado** en `/legal/datos`: el texto
publicado ya dice «previa, expresa e informada», «una casilla —que nunca viene
marcada—» y los plazos de retención.

### M-5 · No había política de retención escrita — CORREGIDO

La política decía «el tiempo necesario», que no es un plazo. Ahora publica plazos
concretos (sección 8 de `/legal/datos`):

| Dato | Plazo |
|---|---|
| Solicitudes de reserva que no se concretan | 6 meses |
| Datos de una reserva cumplida | 5 años desde la salida (prescripción civil y comercial) |
| Documento de identidad del registro de huéspedes | lo que exija la norma turística y tributaria, y no más |
| Soportes contables y de pago | 10 años |
| Prueba de la autorización | mientras se conserven los datos a los que se refiere, y 2 años más |
| Conversaciones de WhatsApp con solicitudes | 2 años |

Cumplido el plazo, los datos se eliminan o se anonimizan. **Falta ejecutarla:**
hoy nada borra nada automáticamente. Ver pendiente P-2.

### M-6 · El bloqueo por cuenta del login puede usarse para dejar al hotel fuera — PENDIENTE (mitigado)

Es el precio de A-3 y no tiene solución limpia en el código de la aplicación:
cualquier freno por cuenta que impida probar contraseñas impide también entrar a
quien sabe la suya. Mitigado con una ventana que **se cura sola en cinco
minutos**, de modo que el peor caso es esperar. La solución completa está en el
pendiente P-1 (reglas de firewall, que distinguen al atacante por IP y
comportamiento sin castigar la cuenta).

---

## Bajo

### B-1 · `x-powered-by: Next.js` revelaba el framework — CORREGIDO
`poweredByHeader: false` en `next.config.ts`. Verificado: la cabecera ya no sale.

### B-2 · El login distinguía la cuenta «no confirmada» — CORREGIDO
Había una rama de mensaje propia para `email not confirmed`, que permitía
averiguar qué correos tienen cuenta. Ahora todos los fallos dan el mismo texto.
Una cuenta sin confirmar se ve en `/admin/usuarios`, que es donde corresponde.

### B-3 · El documento de identidad se pedía sin necesidad — CORREGIDO (minimización)
El sitio público **no lo pide** (comprobado: el formulario del motor de reservas
no tiene ese campo), lo cual es correcto. En el panel se conserva porque el
registro de huéspedes de un prestador turístico lo exige **en el check-in**, y
ahora lo dice el propio campo («déjalo vacío hasta que la persona llegue») y un
comentario en la columna de la base, para que nadie lo sume al formulario público
«porque el campo ya existe».

### B-4 · `npm audit`: 5 vulnerabilidades, ninguna en el sitio publicado — ACEPTADO
```
5 vulnerabilidades: 2 high, 3 moderate
· postcss (high)          ← dependencia de next; solo corre al compilar
· brace-expansion (high)  ← herramientas de desarrollo
· vitest/@vitest/mocker   ← solo pruebas
```
`npm audit --omit=dev` deja dos, las de `postcss`, y son de **tiempo de
compilación**: tratan de leer CSS o `sourceMappingURL` de un atacante, y el CSS
del sitio es nuestro. El único arreglo es subir a **Next 16**, un cambio mayor
fuera del alcance acordado. Es la misma conclusión que ya estaba en
`docs/MEMORIA.md` del 2026-09-02, ahora con la comprobación de que ninguna afecta
al servidor desplegado. **Revisar cuando se planee el salto a Next 16.**

### B-5 · Registros con posible detalle de datos personales — ACEPTADO, vigilar
Ningún `console.log` imprime datos de huéspedes a propósito. Los 30 y pico
`console.error` del proyecto registran mensajes de error. El único con riesgo
indirecto es `src/lib/admin/validacion.ts:457`, que volca el objeto de error
completo: un error de clave duplicada de Postgres puede traer el valor que la
provocó (por ejemplo un correo) dentro de `details`. Pasa solo en un error
inesperado del panel y va a los registros de Vercel, no al navegador. Se deja
anotado; si se activa un servicio externo de registros, conviene revisarlo antes.

### B-6 · El listado del bucket es público — ACEPTADO
`anon` puede **listar** los objetos de `imagenes` y `videos` (los dos buckets son
públicos por diseño: las fotos se sirven en el sitio). Eso permite enumerar las
rutas de todas las fotos, incluidas las que no estén publicadas en ninguna
página. No hay nada sensible en esos buckets y cerrar el listado obligaría a
rehacer la limpieza de huérfanos. Queda dicho para que nadie suba ahí un archivo
que no deba ser público. **La subida sí está cerrada**, verificado: con la clave
anónima, tanto `imagenes` como `videos` responden `403 new row violates row-level
security policy`, incluso enviando un MIME de la lista blanca.

---

## Lo que se comprobó y estaba bien

### Acceso a datos (Supabase)

**RLS activo en las diez tablas**, con políticas correctas
(`alojamientos`, `planes`, `tarifas`, `extras`, `contenido`, `imagenes`,
`reservas`, `reserva_extras`, `bloqueos`, `pagos`).

**Probado de verdad con la clave anónima**, no leído: las cuatro operaciones
sobre las diez tablas. Resultado (`42501` = permiso denegado):

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `reservas`, `reserva_extras`, `bloqueos`, `pagos` | 401 | 401 | 401 | 401 |
| `alojamientos`, `planes`, `tarifas`, `extras`, `contenido`, `imagenes` | 200 | 401 | 401 | 401 |

Un detalle que casi produce un falso negativo y conviene dejar escrito: un
`PATCH` con cuerpo vacío devuelve `200 []` porque PostgREST no llega a tocar la
tabla. **Hubo que repetir la prueba con un cuerpo real** (`{"nombre":"HACKEADO"}`)
para ver el `401`, y se comprobó después que el contenido seguía intacto.

**Los catálogos solo muestran lo activo:** consultar `?activo=is.false` en
`alojamientos`, `planes` y `extras` con la clave anónima devuelve `[]` en los tres.

**Funciones y triggers.** Solo hay dos funciones en `public`. `tocar_actualizado_at`
no es `security definer`. `validar_cupo_dia_de_calma` **sí lo es, y está bien
hecha**: `set search_path = public, pg_temp`, que es la forma correcta, y además
`anon` no tiene `CREATE` en ningún esquema (verificado), así que no puede plantar
un objeto que la función acabe resolviendo. Ninguna de las dos está expuesta como
RPC: `POST /rest/v1/rpc/…` devuelve `404` para ambas.

**Storage.** Los buckets `imagenes` (10 MB; jpeg, png, webp, avif) y `videos`
(60 MB; mp4, webm) tienen lectura pública y escritura solo para `authenticated`.
La subida desde el panel pasa por un Route Handler que verifica la sesión con
`getUser()`, valida el MIME contra una lista blanca, comprueba el tamaño y genera
un nombre opaco. Correcto.

**La clave de servicio no llega al navegador.** Buscada por su valor literal en
todo `.next`: cero coincidencias. Igual `GOOGLE_PLACES_API_KEY` y el contenido de
`GOOGLE_CALENDAR_CREDENCIALES` (en el bundle del servidor aparece el *nombre* de
la variable, que es lo normal, no su valor). `admin.ts` está marcado con
`server-only` y solo lo importan dos Route Handlers y dos módulos de servidor.

### Panel y autenticación

**Las tres capas funcionan.** Probado contra el build de producción:

- Sin cookie, `/admin`, `/admin/reservas`, `/admin/usuarios`,
  `/admin/reservas/nueva` y `/admin/api/galeria/subir` responden `307` al login,
  también por `POST`.
- `requireAdmin()` está en **todas** las Server Actions del panel. Las 19
  acciones de contenido pasan por un único `guardarContenido()` que lo llama; las
  demás lo llaman directamente. No se encontró ni una acción sin verificación.
- El Route Handler de subida responde `401` sin sesión.

**`/admin/usuarios` está cerrada en servidor, no escondiendo el enlace.** Probado
con la cuenta `equipo` real (`panel@lafincaecohotel.com`):

- La página responde `200` con el aviso de falta de permiso y **no filtra ni un
  correo**: la comprobación va antes de leer, así que la lista no llega a entrar
  en la carga útil que Next manda al navegador.
- Las **cinco** Server Actions de esa página, invocadas por `POST` directo con la
  cookie de `equipo`, se rechazan: tres devuelven el mensaje de falta de permiso
  y `eliminarUsuarioAction` redirige sin hacer nada (la quinta del grupo es el
  cierre de sesión del layout).
- **No se creó ninguna cuenta**: la lista, vista luego como `propietario`, sigue
  con las dos cuentas de siempre.
- El `propietario` sí ve y administra la sección.

*(Detalle metodológico: la primera pasada de esta prueba pareció dar un resultado
distinto porque la primera acción probada era el cierre de sesión, que invalidaba
la cookie para las cuatro siguientes. Se repitió con una sesión nueva por intento.)*

**Contraseñas.** El panel exige un mínimo de 10 caracteres, más que los 6 de
Supabase por defecto, y corta en 72 bytes (el límite de bcrypt) en vez de dejar
que se pierda silenciosamente parte de lo escrito.

**Mensajes del login.** No distinguen «ese correo no existe» de «la contraseña
está mal». Ver B-2 para la rama que sí distinguía y se quitó.

**Open redirect.** `destinoAdminSeguro()` rechaza destinos externos, `//host` y
`/\host`. Correcto.

### Superficie pública

**`/api/disponibilidad`.** Valida el formato de las dos fechas, exige un rango
positivo y lo topa en 92 días. Devuelve solo `{slug, nombre, ocupado: [fechas]}`:
ni nombres de huéspedes, ni códigos, ni motivos, ni de cuál de las tres fuentes
viene cada día. Probado con `desde` mayor que `hasta`, con un año entero, sin
parámetros y con `2026-10-01' or 1=1--`: los cuatro dan `400`.

**`/api/dia-de-calma/cupo`.** Valida la fecha y devuelve un solo número agregado.
`2026-13-45` da `400`.

**Inyección.** No hay SQL construido a mano en ninguna parte: todo pasa por el
cliente de Supabase con parámetros. Las entradas del panel se leen con los
validadores de `src/lib/admin/validacion.ts`, que tipan, acotan longitud y
rechazan enumeraciones fuera de lista y UUID mal formados.

**XSS.** Los tres `dangerouslySetInnerHTML` del proyecto son JSON-LD y pasan por
`serializarJsonLd()`, que escapa `<` a `<` y por tanto impide cerrar el
`<script>`. Ningún otro punto inserta HTML del CMS. Se buscó además contenido
sospechoso ya guardado en la base (`valor::text ~* '<script|<iframe|javascript:|onerror='`):
ninguna fila.

**El honeypot del formulario de reservas no aplica todavía:** el motor no envía
nada a un servidor propio, compone un mensaje de WhatsApp. Cuando entre la
pasarela habrá que añadirlo; está en P-3.

### Secretos y dependencias

- **`.env*` está ignorado** (`.gitignore`) salvo `.env.example`, y `.env.example`
  es el único `.env` que ha existido en el historial.
- **Historial de git limpio.** Buscado en **todos** los commits:
  `git grep -I -nE "eyJhbGciOiJ|sb_secret_|sb_publishable_|AIza[0-9A-Za-z_-]{30,}|-----BEGIN (RSA )?PRIVATE KEY-----" $(git rev-list --all)`
  → sin coincidencias.
- **`_Sensible/` no está trackeado** (0 archivos de los 245 del repo).

### Datos de prueba

`reservas` = 0, `pagos` = 0, `bloqueos` = 0, dos cuentas de auth y las dos
correctas, sin tablas ni claves de contenido de prueba, sin objetos de prueba en
los buckets. Nada que limpiar antes de entregar, salvo la cuenta temporal
`panel@lafincaecohotel.com`, que ya estaba anotada en `docs/DESPLIEGUE_VERCEL.md`.

### RNT y datos del responsable

El **RNT 114565** aparece en el pie de todas las páginas y dentro de los
documentos legales, como exige la norma. El responsable del tratamiento se
identifica con nombre, domicilio y canal de atención. **Falta la razón social y
el NIT**, que el cliente no ha entregado; el propio documento lo dice en vez de
inventarlo, y está en los pendientes del plan. Ver P-5.

---

## Pagos: requisitos que la integración tendrá que cumplir

La costura marcada en el código está bien puesta —un solo punto para los dos
modos (hospedaje y Día de Calma), con el desglose, el total y el anticipo ya
calculados— y hoy no tiene agujeros porque todavía no cobra nada. Estos son los
requisitos que el día de la integración **no** se pueden dejar para después:

1. **El precio se recalcula SIEMPRE en el servidor.** El importe que se le manda
   a Wompi no puede salir de lo que envíe el navegador. Hoy el total lo calcula
   el cliente (`cotizar()`, `resumenDePago()`) para poder enseñarlo sin latencia;
   el mismo cálculo tiene que repetirse en el servidor con las tarifas de la base
   antes de crear el cobro, y si no coincide, gana el servidor.
2. **La reserva se confirma SOLO por webhook**, nunca por la redirección del
   navegador. La vuelta del checkout es una pista para el huésped, no un hecho:
   se puede falsificar escribiendo la URL.

   > ⚠ **Nota al día, 2026-10-02 — este requisito se precisó, no se relajó.**
   > La letra («solo por webhook») resultó ser una regla peligrosa por sí misma:
   > en el ambiente de pruebas se hicieron dos pagos reales en el sandbox de Bold
   > y llegaron **cero** eventos de webhook, de modo que una reserva pagada
   > (`LF-2026-0001`) se canceló sola al vencer su hold. En producción eso es **un
   > huésped que paga y se queda sin reserva**, que es un riesgo mayor que el que
   > este requisito pretendía evitar.
   >
   > Lo que el requisito prohíbe —y sigue prohibido— es **creerle a la URL**:
   > `?bold-tx-status=approved` lo escribe cualquiera y se ignora por completo. Lo
   > que ahora existe además del webhook es la **reconciliación**
   > (`src/lib/pagos/reconciliar.ts`): le preguntamos nosotros a la API de Bold
   > con nuestra llave de identidad —la misma fuente de verdad que exige el
   > requisito 5— desde la página de retorno, desde el cron diario y desde un
   > botón del panel. De la URL solo se toma la **referencia**, que no es una
   > afirmación sino una pregunta.
   >
   > Las dos vías comparten la escritura (`src/lib/pagos/aplicar-estado.ts`) para
   > que no puedan divergir, y la idempotencia está probada
   > (`src/lib/pagos/reconciliar.test.ts`). Y la migración **016** añade la regla
   > que faltaba en la base: **una reserva con un pago aprobado no se cancela
   > nunca por vencimiento.**
3. **El webhook verifica la firma** de Wompi (`WOMPI_EVENTS_SECRET`) antes de
   mirar el cuerpo, y **rechaza** lo que no la traiga. Sin esto, cualquiera
   confirma reservas gratis con un `curl`.
4. **El webhook es idempotente.** Wompi reintenta: la misma transacción tiene que
   poder llegar dos veces sin cobrar dos veces ni duplicar la reserva. La clave
   natural es la referencia de la transacción, con restricción única en `pagos`.
5. **El webhook no confía en el estado que le mandan**: consulta la transacción
   contra la API de Wompi con su propia clave antes de dar una reserva por pagada.
6. **Nunca se guarda un dato de la tarjeta.** El checkout es de Wompi; en la base
   solo entra la referencia, el monto y el estado. La política de privacidad ya lo
   dice, y tiene que seguir siendo verdad.
7. **Las claves de Wompi van en variables de entorno** y la privada jamás en un
   componente de cliente. Están ya reservadas y comentadas en `.env.example`.
8. **La CSP habrá que ampliarla** con el host del checkout de Wompi (`frame-src`
   si va en iframe, o nada si es una redirección) — y solo con ese.
9. **El formulario necesitará honeypot y freno de peticiones** en el endpoint que
   cree la reserva: ahí sí habrá escritura en la base desde el público.
10. **La casilla de autorización de datos ya existe**; al crear la reserva desde
    el servidor hay que escribir las tres columnas `autorizacion_datos_*` con
    canal `web`, en vez de dejarlas en `null`.

---

## Pendientes

### P-1 · Freno de peticiones en la capa de red — decide Cesar
Los frenos añadidos viven en la memoria de cada instancia: sirven contra un
script, no contra un ataque distribuido, y son la mitigación parcial de M-6. La
solución dura es una **regla de Rate Limiting del firewall de Vercel** sobre
`/admin/login` y `/api/*` (incluida en los planes Pro; en Hobby hay reglas
básicas). Alternativa sin cambiar de plan: un contador compartido (Upstash Redis),
que añade una dependencia y un servicio más. **Recomendación:** activar las reglas
del firewall el día del lanzamiento; es configuración, no código.

### P-2 · Ejecutar la política de retención — decide Cesar, necesita confirmación del cliente
Los plazos ya están publicados, pero **nada los aplica todavía**. Hace falta una
tarea programada (el cron de Vercel ya existe para el latido) que borre o
anonimice lo vencido: solicitudes no concretadas a los 6 meses, datos de reserva a
los 5 años. Antes de escribirla hay que confirmar con el hotel los plazos
contables reales con su contadora, porque un borrado prematuro de un soporte
contable es un problema distinto y peor.

### P-3 · Anti-abuso del formulario cuando entre la pasarela — al hacer la fase 4
Honeypot y freno por IP en el endpoint que cree la reserva. Hoy no aplica porque
el motor no escribe nada: compone un mensaje de WhatsApp.

### P-4 · Ampliar HSTS — necesita confirmación del cliente
Añadir `includeSubDomains` y, más adelante, `preload`, **cuando se confirme que
todos los subdominios de `lafincaecohotel.com` se sirven por HTTPS** (correo
incluido). Hacerlo antes puede dejar al hotel sin correo, y `preload` es
irreversible en meses.

### P-5 · Razón social y NIT en los documentos legales — lo tiene que dar el cliente
Pendiente desde antes de esta auditoría (Raquel Lenis). Mientras no lleguen, el
prestador se identifica con su RNT y los documentos lo dicen. También falta el
**correo de notificaciones** para ejercer los derechos del titular (Amapola):
hoy `sitio.contacto.correo` está **vacío**, así que el canal de atención de la
política se apoya solo en el WhatsApp. Un canal de atención que la ley exige no
debería depender de un solo número de móvil: **conviene un correo antes del
lanzamiento.**

### P-6 · Protecciones de Supabase Auth — 10 minutos en el panel de Supabase
No se pueden ver ni cambiar desde el código ni desde SQL (la configuración de
GoTrue no vive en la base: `auth.config` no existe). Hay que entrar a
**Supabase → Authentication** y:
- activar **Leaked password protection** (comprueba la contraseña contra las
  filtraciones conocidas de HaveIBeenPwned);
- subir la **longitud mínima de contraseña** a 10, para que coincida con la que ya
  exige el panel;
- revisar los **Rate limits** del endpoint `/token`;
- valorar **MFA** para la cuenta `propietario`, que es la que administra cuentas.

### P-7 · Revisión jurídica de los cuatro documentos — la tiene que hacer el cliente
Esta auditoría revisó los textos **contra la Ley 1581 de 2012 y el Decreto 1074
de 2015** y corrigió lo que incumplía, pero **no es una revisión de abogado**.
Sigue pendiente la aprobación de Amapola, ya anotada en `docs/MEMORIA.md`.

### P-8 · Registro de auditoría del panel — sugerencia, no hallazgo
Hoy no queda rastro de quién cambió qué: si mañana desaparece una reserva, no hay
forma de saber qué cuenta la borró. Con dos cuentas es asumible; cuando el hotel
tenga cuatro o cinco personas en el panel, conviene una tabla `auditoria` con
usuario, acción, tabla y fecha, escrita desde las Server Actions.

---

## Cómo reproducir las pruebas

Las pruebas de esta auditoría se hicieron con scripts de un solo uso en el
directorio temporal de la sesión, no versionados (leen `.env.local`, que nunca
entra al repositorio). Lo que sí queda en el proyecto:

- `npm test` — 149 pruebas, incluidas las 9 del validador del mapa embebido y las
  11 del freno de peticiones.
- `npm run db:verificar` — estado de RLS y de las restricciones de la base.
- `npx tsc --noEmit` y `npm run lint` — en verde (queda un aviso previo de
  variable sin usar en `scripts/importar-fotos-drive.mjs`).
- `npm run build` — las 19 rutas públicas siguen siendo estáticas.
- Cabeceras, contra `localhost` y **nunca contra producción**:

      npm run build && npm run start
      curl -sI http://localhost:3000/ | grep -i "content-security-policy\|strict-transport\|x-frame\|referrer\|permissions\|x-content-type"

---

## Sin residuos

Se comprobó al terminar: `reservas` 0, `pagos` 0, `bloqueos` 0; las dos cuentas
de auth correctas y ninguna cuenta intrusa; sin tablas ni claves de contenido de
prueba; sin objetos de prueba en `imagenes` ni en `videos`. La tabla
`_prueba_auditoria` usada para verificar A-4 se borró en la misma sesión. Los
intentos de escritura con la clave anónima fueron todos rechazados por la base,
así que no dejaron nada.
