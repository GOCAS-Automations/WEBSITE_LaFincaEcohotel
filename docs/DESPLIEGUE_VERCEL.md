# Despliegue en Vercel

Checklist paso a paso para publicar el sitio en Vercel **sin que Google lo
indexe todavía**: mientras el WordPress viejo siga siendo la web real de La
Finca, la URL de Vercel (temporal o de dominio) no puede competir por las
mismas búsquedas. Esta guía cubre el primer deploy, las variables de entorno
y —más adelante, cuando el cliente dé luz verde— el cambio de dominio.

## 1. Importar el repositorio

1. Entrar a Vercel con la cuenta del equipo **GOCAS** (no una cuenta personal:
   el proyecto debe quedar en el equipo, no en un usuario suelto).
2. **Add New → Project** → importar
   `https://github.com/GOCAS-Automations/WEBSITE_LaFincaEcohotel.git`.
3. **Framework Preset**: Vercel detecta *Next.js* solo. No tocar nada.
4. **Build Command** y **Output Directory**: dejar los que Vercel propone por
   defecto (`next build` / `.next`). No hay nada especial que configurar aquí.
5. Todavía NO pulsar “Deploy”: primero cargar las variables de entorno de la
   sección 2, porque sin `NEXT_PUBLIC_SUPABASE_URL` y su llave anónima el
   build falla al intentar leer el contenido del sitio.

## 2. Variables de entorno

Configurarlas en **Project Settings → Environment Variables**. La columna
“Entornos” dice en cuáles activarla (Production / Preview / Development); por
defecto, activarla en los tres salvo que se diga lo contrario.

| Variable | ¿Secreta? | Entornos | Valor recomendado en el primer deploy |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | No | Production, Preview, Development | URL del proyecto de Supabase de La Finca (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No (es pública por diseño, pero no compartirla fuera de Vercel/Supabase) | Production, Preview, Development | Llave `anon` del mismo proyecto |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sí** | Production, Preview, Development | Llave `service_role` del proyecto. Nunca lleva `NEXT_PUBLIC_` — si algún día apareciera con ese prefijo, sería un error grave: quedaría expuesta en el navegador |
| `SUPABASE_DB_URL` | **Sí** | Production, Preview, Development (solo hace falta si algún Route Handler o script corre migraciones en runtime; si no, puede omitirse en Vercel y usarse solo en local) | Cadena de conexión directa a Postgres del proyecto |
| `NEXT_PUBLIC_SITE_URL` | No | Production, Preview, Development | **`https://lafincaecohotel.com`** — el dominio real ya apunta a Vercel (2026-10-01). Ver el apartado dedicado |
| `IMAGENES_SIN_OPTIMIZAR` | No | — | Ver el apartado dedicado más abajo — se deja **vacía** en el primer deploy |
| `SITIO_PUBLICADO` | No | Production, Preview, Development | **`0` o sin definir** hasta el lanzamiento — ver el apartado dedicado |
| `GOOGLE_PLACES_API_KEY` | **Sí** | Production, Preview, Development | Llave de la Places API (New) del proyecto de Google Cloud. Sin ella el bloque de reseñas simplemente no se publica: no bloquea el deploy |
| `GOOGLE_CALENDAR_CREDENCIALES` | **Sí** | Production, Preview, Development | JSON de la cuenta de servicio `lafinca-calendario@…` **en base64, en una sola línea** — ver el apartado dedicado más abajo |
| `GOOGLE_CALENDAR_ID` | No | Production, Preview, Development | **Vacía** hasta que el hotel comparta su calendario «la finca». Con la variable vacía, la integración no hace nada y el sitio funciona igual |
| `RESEND_API_KEY` | **Sí** | Production, Preview, Development | 🔴 **PENDIENTE EN VERCEL.** Ya está en `.env.local` y funciona; falta copiarla aquí. Sin ella, el sitio publicado no envía ni un correo — ver el apartado dedicado más abajo |
| `EMAIL_FROM` | No | Production, Preview, Development | 🔴 **PENDIENTE EN VERCEL.** `La Finca Eco Hotel <reservas@lafincaecohotel.com>` |
| `EMAIL_NOTIFY_TO` | No | Production, Preview, Development | 🔴 **PENDIENTE EN VERCEL.** `fincavillarrealcali@gmail.com` (admite varios separados por coma) |
| `EMAIL_REPLY_TO` | No | Production, Preview, Development | 🔴 **PENDIENTE EN VERCEL.** `fincavillarrealcali@gmail.com` — a dónde contesta el huésped: `reservas@` es solo una identidad de envío y no tiene buzón que nadie lea |
| `BOLD_IDENTITY_KEY` | No (es **pública** por diseño: Bold dice «no hay problema en que alguien pueda verla ya que sólo sirve para identificarte») | Production, Preview, Development | Llave de **identidad**. De **pruebas** en Preview y Development; de **producción** solo en Production — ver el apartado dedicado |
| `BOLD_PRIVATE_KEY` | **Sí. Solo servidor, jamás al navegador** | Production, Preview, Development | Llave **secreta** del mismo ambiente que la de identidad |
| `BOLD_MODO` | No | Preview, Development (**no** en Production) | `pruebas` mientras se usen las llaves de prueba. En Production se deja vacía o se borra — ver el apartado dedicado |
| `PAGOS_ACTIVOS` | No | Production, Preview, Development | **`0` o sin definir.** Es el **último interruptor del lanzamiento** y se enciende solo junto a las llaves de producción — ver el apartado dedicado |
| `BOLD_URL_RETORNO` | No | — | **Vacía.** Solo para depurar el retorno del pago desde local con un túnel https — ver el apartado dedicado |

### `BOLD_IDENTITY_KEY`, `BOLD_PRIVATE_KEY` y `BOLD_MODO`

La pasarela es el **Botón de pagos de Bold**, con integración personalizada (el
botón es nuestro y abre su checkout). Toda la lógica vive en
`src/lib/pagos/bold.ts`, que está marcado con `server-only`.

**Las dos llaves van siempre en pareja y del mismo ambiente.** Mezclar una de
pruebas con una de producción da un error en la pasarela, y la documentación de
Bold lo avisa explícitamente: «Asegúrate de que ambas llaves (de identidad y
secreta) correspondan al ambiente de pruebas. Verás un error si usas llaves de
ambientes distintos».

Dónde se sacan: **bold.co → Panel de comercios → Integraciones → «+ Activar
llaves»**. Ahí salen las cuatro (identidad y secreta, de pruebas y de
producción). Las de pruebas suelen estar disponibles **antes** de que Bold
termine de verificar la identidad del comercio; las de producción, después.

| Llave | ¿Secreta? | Qué hace |
|---|---|---|
| **Identidad** (`BOLD_IDENTITY_KEY`) | No | Identifica el comercio. Viaja al navegador dentro de la configuración del checkout —es inevitable, el checkout corre ahí— y autentica la API con la que el sitio consulta el estado de una transacción. |
| **Secreta** (`BOLD_PRIVATE_KEY`) | **Sí** | Firma el **hash de integridad** de cada venta (lo que impide cambiar el monto desde el navegador) y verifica la **firma de los eventos del webhook** (`x-bold-signature`). Sin esto, cualquiera confirmaría reservas gratis con un `curl`. |

**`BOLD_MODO=pruebas` solo en Preview y Development.** Existe por una rareza
documentada del sandbox: «En modo pruebas la firma usa una clave vacía, es decir
cuando se quiere verificar una transacción que se realizó con las llaves de
pruebas, el atributo donde va tu LLAVE_SECRETA no se ingresa, debe ir como un
String vacío». Como las llaves de prueba son indistinguibles a la vista de las de
producción, hay que decírselo al código.

> Hay una **red de seguridad**: en el despliegue de producción de Vercel
> (`VERCEL_ENV=production`) esta variable **se ignora** y siempre se usa la llave
> secreta de verdad. Olvidarse de quitarla no abre ningún agujero; como máximo,
> un webhook de pruebas rechazado.

**El webhook se registra en el panel de Bold**, no en Vercel: Integraciones →
Webhooks → «Configurar webhook», apuntando a

    https://lafincaecohotel.com/api/pagos/bold/webhook

Esa es **la URL definitiva**: el dominio real apunta a Vercel desde el
2026-10-01, así que ya no hay que esperar a nada para registrarla. Es lo único
que queda por hacer en el panel de Bold.

Se pueden registrar hasta cinco endpoints, y hay un «webhook de pruebas» aparte
(Integraciones → Webhooks → *webhooks de prueba*). Dos cosas que conviene saber
antes de probar:

- **En el ambiente de pruebas de botón/link de pago, Bold NO envía webhooks
  automáticos.** Hay que usar el botón **«Probar el webhook»** que aparece en el
  comprobante al terminar una compra simulada, pegando ahí la URL.
- **Bold reintenta hasta 5 veces** lo que no responda `200` (a los 15 min, 1 h,
  4 h, 8 h y 24 h). El endpoint es idempotente: el mismo evento dos veces no
  duplica nada ni reenvía correos.

**El día del lanzamiento**, cuando Bold apruebe la cuenta: cambiar las dos llaves
de Production por las de producción, borrar `BOLD_MODO` de Production si estaba,
registrar el webhook con el dominio real, y hacer **una compra real pequeña y su
reembolso** para comprobar el circuito completo con dinero de verdad.

**Sin las dos llaves el sitio no se rompe:** el motor de reservas cierra por
WhatsApp igual que antes de la fase de pagos (`boldConfigurado()` devuelve
`false` y el selector pinta el botón de WhatsApp como principal). Es deliberado.

### `PAGOS_ACTIVOS` — el último interruptor del lanzamiento

**Por defecto `0`.** Tener llaves de Bold no es poder cobrar, y desde que el
dominio real apunta a Vercel la diferencia importa: el sitio publicado es el del
hotel, y un huésped de verdad puede entrar a `/reservar` cualquier tarde. Con las
llaves de **pruebas** puestas pasaría por una pasarela que no cobra nada; y si un
evento de ese sandbox llegara al webhook, la reserva quedaría **confirmada sin
pago real** — una cabaña bloqueada por una venta que no existió.

Con `PAGOS_ACTIVOS` distinto de `1`:

- El sitio público **no muestra el botón de pagar**. El cierre es WhatsApp, con
  el mismo resumen y el mismo desglose noche a noche de siempre.
- `POST /api/reservar` responde **503** («Los pagos en línea no están habilitados
  todavía») y **no crea ninguna reserva**.
- El **webhook sigue funcionando**, porque hace falta para probarlo desde el
  panel de Bold. Lo que no hace es confirmar: si `BOLD_MODO=pruebas` y
  `VERCEL_ENV=production`, registra el evento, deja un error en el log y **no
  toca `pagos` ni `reservas`**.

Se pone en `1` **el día del lanzamiento y en el mismo movimiento** que las llaves
de producción. Nunca antes, y nunca con llaves de prueba. Hay que **redesplegar**
después de cambiarla: el sitio público es estático y el valor se hornea en el
build.

### `BOLD_URL_RETORNO`

Normalmente **vacía**. Existe por una regla de Bold que cuesta media tarde
descubrir: **las URLs de retorno tienen que ser `https://`**
(`data-redirection-url` y `data-origin-url` → «Valid HTTPS URL»). Una dirección
`http://localhost` hace que el checkout no abra y la pasarela muestre
«Something went wrong… **BTN-001**».

Por eso el servidor nunca manda el origen de la petición a secas: `origenParaBold()`
(`src/lib/pagos/origen.ts`) exige https y, en local, cae al dominio real. Como la
base de datos es la misma, el comprobante se ve igual al volver. Esta variable
solo hace falta para depurar ese retorno sin salir del equipo (un túnel de ngrok,
una vista previa de Vercel); si lo que trae no es https, se ignora.

### `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_NOTIFY_TO` y `EMAIL_REPLY_TO`

El sitio ya tiene escritos y probados sus **tres correos transaccionales**
(`src/lib/email/`): «recibimos tu solicitud» y «tu reserva está confirmada» al
huésped, y el aviso interno a la administración.

> ✅ **2026-10-02 — los correos están ACTIVOS en local.** La cuenta de Resend
> existe, `lafincaecohotel.com` está verificado y los tres correos se enviaron de
> verdad a `fincavillarrealcali@gmail.com`: llegaron a la **bandeja de entrada**
> (no a spam), con `dkim=pass`, `spf=pass` y `dmarc=pass`, el remitente «La Finca
> Eco Hotel», el `Reply-To` al Gmail del hotel y el logo del bucket cargando
> (HTTP 200, PNG de 6,4 kB).
>
> 🔴 **Lo que falta es copiar las cuatro variables a Vercel.** Mientras no estén
> ahí, el sitio publicado sigue sin enviar ni un correo: confirma la reserva y se
> calla. Los valores están en la tabla de arriba y en `.env.local`.
>
> Nota menor para después: el DMARC del dominio está en `p=NONE`. Entrega bien,
> pero subirlo a `p=quarantine` cuando lleve unas semanas enviando protege la
> marca contra suplantación. No bloquea nada.

**El modo dormido sigue siendo el contrato donde falte la clave.** Sin
`RESEND_API_KEY`, las funciones de envío no hacen nada y **no fallan**: registran
en el log de Vercel qué habrían enviado, a quién y con qué asunto, y devuelven
`{enviado:false, motivo:'no_configurado'}`. Es deliberado: estas funciones se
llaman desde el webhook de pagos y desde la reconciliación, y un fallo de correo
nunca puede tumbar una reserva que el huésped ya pagó. Verificado el 2026-10-02:
con las claves puestas, una reserva se confirmó y los correos salieron; sin
claves, se confirma igual.

Se pueden revisar sin clave, en el navegador:

    npm run correos:probar

deja los seis archivos (tres correos × HTML y texto plano, con sus variantes del
Día de Calma) en una carpeta temporal, con un `index.html` para abrirlos.

**Para encenderlos, en este orden:**

1. **Crear la cuenta en Resend** y añadir el dominio `lafincaecohotel.com`.
2. **Verificar el dominio**: Resend da tres o cuatro registros DNS (un TXT de
   verificación, el SPF y las claves DKIM) que hay que crear en **Hostinger**,
   donde vive el DNS. ⚠ **Sin dominio verificado no se puede enviar desde
   `@lafincaecohotel.com`**: Gmail y Outlook comprueban que el dominio autorice a
   Resend y, si no, marcan el correo como spam o lo rechazan.
   *Añadir estos registros no afecta al sitio ni al correo actual del hotel, así
   que se puede hacer hoy, antes del lanzamiento.* Si el hotel ya usa otro
   servicio de correo, hay que **fusionar** el SPF en un solo registro TXT y no
   crear un segundo: dos SPF invalidan los dos.
3. Crear la clave de API en Resend y ponerla en `RESEND_API_KEY`. *(Hecho.)*
4. Poner las otras tres. *(Hechas en `.env.local`; faltan en Vercel.)*
   - `EMAIL_FROM=La Finca Eco Hotel <reservas@lafincaecohotel.com>`
   - `EMAIL_NOTIFY_TO=fincavillarrealcali@gmail.com` — **admite varios separados
     por coma**, así que no hace falta crear una lista de distribución.
   - `EMAIL_REPLY_TO=fincavillarrealcali@gmail.com` — **a dónde contesta el
     huésped.** No es un adorno: `reservas@lafincaecohotel.com` es una identidad
     de envío de Resend y detrás **no hay un buzón que alguien lea**. Sin
     `Reply-To`, la respuesta del huésped («¿puedo llegar a las 9?») se pierde, y
     él cree que avisó. Si se deja vacía se usa el primero de `EMAIL_NOTIFY_TO`.
5. Redesplegar y probar de verdad:

       npm run correos:probar -- --enviar tu@correo.com

   (con `RESEND_API_KEY` en `.env.local`). Revisar los seis en el teléfono.

**Esto ya no lo bloquea el cliente.** Amapola confirmó el correo del hotel
(`fincavillarrealcali@gmail.com`) y el remitente quedó en
`reservas@lafincaecohotel.com`. Lo único pendiente es copiar las cuatro variables
a Vercel. Mientras no estén, el panel sigue avisando en pantalla —«Todavía no se
envían correos automáticos: avísale tú por WhatsApp»— para que el equipo no dé por
hecho que el huésped recibió su confirmación.

### `GOOGLE_CALENDAR_CREDENCIALES` y `GOOGLE_CALENDAR_ID`

El hotel lleva su disponibilidad real en un **Google Calendar llamado «la
finca»**. El sitio lo **lee** —para no ofrecer como libre una noche que ellos
ya apuntaron a mano— y **escribe** en él las reservas que se crean o se
confirman desde el panel.

`GOOGLE_CALENDAR_CREDENCIALES` es el JSON de la cuenta de servicio
`lafinca-calendario@project-bdfd1411-9189-442d-84d.iam.gserviceaccount.com`
codificado en base64 y pegado en una sola línea:

```bash
node -e "console.log(require('fs').readFileSync('lafinca-calendario.json').toString('base64'))"
```

Va en base64 porque la clave privada lleva saltos de línea y un `.env` de una
línea no los aguanta. **El archivo JSON original vive fuera del repositorio**
(carpeta `_Sensible/` del cliente) y nunca debe copiarse dentro del proyecto ni
subirse a Git.

`GOOGLE_CALENDAR_ID` es el identificador del calendario del hotel. **Hoy se
deja vacía**, porque falta que el hotel haga dos cosas:

1. Compartir su calendario «la finca» con el correo de la cuenta de servicio y
   darle el permiso **«Hacer cambios en eventos»** (no basta con «Ver todos los
   detalles»: sin escritura, las reservas del panel no se apuntan).
2. Pasarnos el **ID del calendario**: Google Calendar → el calendario «la
   finca» → Configuración → «Integrar calendario» → «ID del calendario».

Con las dos variables puestas, `npm run calendario:probar` verifica la
integración de punta a punta contra la API de Google (crea un calendario de
prueba propio de la cuenta de servicio, lo usa y lo borra; no toca el del
hotel). Sin ellas, el panel muestra «Calendario del hotel: sin configurar» y
todo lo demás sigue funcionando.

### `NEXT_PUBLIC_SITE_URL`

**Valor definitivo: `https://lafincaecohotel.com`** (sin barra final y **sin
`www`** — `www.lafincaecohotel.com` devuelve un 308 al apex, que es el dominio
principal del proyecto en Vercel).

⚠ **Esto ya mordió una vez.** El 2026-10-01, con el dominio real sirviendo el
sitio, la variable en Vercel seguía valiendo `http://localhost:3000` del
desarrollo, y el sitio publicado se declaraba canónico en localhost:

    <link rel="canonical" href="http://localhost:3000"/>
    <meta property="og:url" content="http://localhost:3000"/>

Nada falla a la vista —las páginas cargan igual— y mientras tanto cada canónica,
cada OpenGraph, el sitemap, el JSON-LD y los enlaces de los correos apuntan a una
dirección que no existe fuera del equipo de quien la configuró. Se corrigió ese
mismo día, y el respaldo en código (`src/lib/sitio.ts`) pasó a ser el dominio
real: si la variable volviera a faltar, lo que se publica es correcto.

**Hay que redesplegar después de cambiarla.** Lleva el prefijo `NEXT_PUBLIC_`:
su valor se hornea en el build, y editarla en el panel de Vercel no cambia nada
hasta el siguiente despliegue.

### `IMAGENES_SIN_OPTIMIZAR`

Es el interruptor de emergencia de la optimización de imágenes de Vercel: el
plan gratuito incluye un número limitado de transformaciones al mes, y si se
agotan las fotos dejan de servirse. Dejarla **vacía** en el primer deploy (la
optimización encendida es el estado normal); solo se pone en `1` si en algún
momento las imágenes empiezan a fallar por haber agotado la cuota, y hay que
redesplegar después de cambiarla.

### `SITIO_PUBLICADO`

Controla si el sitio se indexa o no. Con `0` o sin definir:

- `/robots.txt` bloquea el sitio completo (`Disallow: /`).
- Cada página se publica con `<meta name="robots" content="noindex, nofollow">`.

🔴 **Hoy esto es un problema abierto, no una precaución.** La variable existía
para proteger al WordPress viejo mientras era la web real; ese sitio **ya no
existe** (hosting cancelado) y el dominio apunta a Vercel. Mientras
`SITIO_PUBLICADO` no valga `1`, **el hotel está invisible en Google**: el sitio
nuevo se prohíbe a sí mismo y el viejo ya no responde.

**Para arreglarlo basta con esto**, y no hay nada más que tocar en el código:

1. Vercel → proyecto `website-la-finca-ecohotel` → **Settings → Environment
   Variables** → añadir `SITIO_PUBLICADO` con valor **`1`** (Production; de
   Preview conviene dejarla fuera, para que las vistas previas sigan sin
   indexarse).
2. **Redesplegar** (Deployments → ⋯ → Redeploy, o cualquier commit nuevo).
   `/robots.txt` y las metaetiquetas son estáticos: se hornean en el build.
3. Comprobar que `https://lafincaecohotel.com/robots.txt` ya **no** dice
   `Disallow: /` y que la portada ya no trae `noindex`.
4. Enviar `https://lafincaecohotel.com/sitemap.xml` desde Google Search Console.

No lo activa nadie por su cuenta: es una decisión de Cesar, y conviene tomarla
pronto — cada día con `noindex` es un día que el hotel no aparece en Google.

### `CRON_SECRET`

**Obligatoria antes del lanzamiento.** Es el secreto con el que se firma la
llamada del cron que mantiene despierta la base.

> ⚠ **Desde el 2026-10-02 el cron hace algo más importante que el latido:
> reconcilia los pagos.** `/api/salud` ejecuta cuatro tareas **en este orden**:
> el latido, **la reconciliación de los pagos no finales de las últimas 24 horas
> contra la API de Bold**, el barrido de reservas vencidas y el refresco de las
> reseñas. El orden no es cosmético: si el barrido corriera antes de la
> reconciliación, cancelaría una reserva cuyo pago está aprobado —pasó de verdad
> con `LF-2026-0001`—. **Si este cron no corre, un pago cuyo webhook no llegue
> puede tardar en confirmarse hasta que alguien abra la ficha en el panel.**
>
> La respuesta trae los conteos: `pagos_revisados`, `pagos_reconciliados`,
> `pagos_confirmados`, `pagos_descartados`, `pagos_sin_respuesta` y
> `pagos_requieren_atencion`. **El único que hay que vigilar es el último**:
> cuenta los pagos que Bold da por aprobados y que no se pudieron confirmar porque
> esas fechas ya se le asignaron a otra reserva. Eso lo resuelve una persona
> —reubicar o devolver—, y las referencias concretas quedan en los registros de
> Vercel con un `console.error`.

El plan gratuito de Supabase **pausa los proyectos con poca actividad al cabo de
siete días**, y un proyecto pausado deja el sitio sin contenido, sin fotos y sin
disponibilidad hasta que alguien entra al panel de Supabase a reactivarlo a mano.
Para evitarlo, `vercel.json` programa un cron que llama una vez al día a
`/api/salud`; ese handler hace **una** consulta trivial a Postgres con la clave
anónima (`select id from planes limit 1`) y el contador de inactividad vuelve a
cero.

Cómo se configura:

1. Generar un valor largo al azar:

       node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

2. En Vercel → **Project Settings → Environment Variables**, crear `CRON_SECRET`
   con ese valor, marcada para **Production** (y Preview si se quiere probar
   allí). No hace falta ponerla en `.env.local`: en desarrollo el endpoint
   funciona sin ella.
3. Redesplegar. Desde ese momento Vercel añade sola la cabecera
   `Authorization: Bearer <CRON_SECRET>` a las peticiones del cron, y
   `/api/salud` responde **401** a cualquiera que no la traiga.

Detalles del cron:

- **En el plan Hobby, Vercel ejecuta los cron una vez al día** y a una hora
  aproximada dentro de la ventana indicada (no al minuto exacto). Con siete días
  de margen antes de que Supabase pause, una ejecución diaria sobra.
- La programación está en `vercel.json` (`0 12 * * *`, mediodía UTC = 7 a.m. en
  Colombia). Se ve y se prueba a mano en Vercel → pestaña **Cron Jobs**.
- **Si se quita el cron o la ruta `/api/salud`**, la base se vuelve a pausar sola
  a los siete días de que nadie visite el sitio. Antes de quitarlo hay que haber
  pasado Supabase a un plan de pago (los planes pagos no pausan) o haber puesto
  otro latido en su lugar.

## 3. Verificación tras el primer deploy

Con la URL de Vercel ya asignada (`https://…vercel.app`), revisar:

- [ ] `https://…vercel.app/robots.txt` responde `User-Agent: *` /
      `Disallow: /` (sitio bloqueado por completo, como corresponde antes del
      lanzamiento).
- [ ] Las fotos cargan (vienen del bucket `imagenes` de Supabase Storage, no
      de `/public`).
- [ ] `/admin/login` responde y deja iniciar sesión.
- [ ] Las reseñas de Google aparecen en la página de inicio o en Conócenos;
      si `GOOGLE_PLACES_API_KEY` no está puesta, el sitio debe seguir
      funcionando igual (el bloque de reseñas cae al respaldo, no rompe nada).
- [ ] El log del build muestra las **19 rutas públicas** como estáticas
      (`○` o `●`), no dinámicas (`ƒ`): `/`, `/alojamientos`, las 5 fichas de
      `/alojamientos/[slug]`, `/conocenos`, `/contacto`, `/experiencias`,
      `/faq`, `/galeria`, `/reservar`, las 4 páginas de `/legal/*`,
      `/robots.txt` y `/sitemap.xml`. Las rutas de `/admin/*` sí son
      dinámicas (`ƒ`) — eso es lo esperado, no un error.
- [ ] `/sitemap.xml` y las etiquetas `<link rel="canonical">` apuntan a
      `https://lafincaecohotel.com`. **Es la comprobación que se saltó** y por la
      que el sitio estuvo publicado declarándose canónico en `http://localhost:3000`:
      mirar el HTML, no solo que la página cargue.

## 4. El dominio — HECHO el 2026-10-01

✅ `lafincaecohotel.com` **ya apunta a Vercel** y el hosting viejo de Hostinger se
canceló: **el sitio nuevo es el sitio en producción**. El apex es el dominio
principal y `www` devuelve un 308 hacia él.

Queda pendiente **solo el punto 4** de la lista (`SITIO_PUBLICADO=1`), que es una
decisión de Cesar. El procedimiento original se conserva abajo como referencia.

1. En **Hostinger** (donde vive el DNS del dominio hoy), crear/editar:
   - Un registro **A** del apex (`lafincaecohotel.com`) apuntando a la IP que
     indique Vercel en **Project Settings → Domains** al añadir el dominio.
   - Un registro **CNAME** de `www` apuntando a `cname.vercel-dns.com`.
2. Esperar la propagación del DNS (puede tardar desde minutos hasta unas
   horas) y confirmar en Vercel que el dominio queda validado y con el
   certificado SSL activo.
3. ✅ Cambiar `NEXT_PUBLIC_SITE_URL` a `https://lafincaecohotel.com` (hecho el
   2026-10-01).
4. ⬜ **Pendiente:** poner `SITIO_PUBLICADO` en `1`. Mientras no se haga, el
   hotel está invisible en Google (ver el apartado de esa variable).
5. Redesplegar.
6. Repetir la verificación de la sección 3, ahora contra el dominio real:
   `/robots.txt` ya NO debe decir `Disallow: /` (debe volver el
   `Allow: /` con las exclusiones de `/admin` y `/api/`), y las canónicas
   deben apuntar a `lafincaecohotel.com`.
7. **Redirecciones 301 del sitio viejo: ya están hechas** (`next.config.ts`,
   2026-09-30). El `wp-sitemap` del WordPress publicaba seis direcciones y las
   cinco que no son la portada redirigen:

   | Vieja | Nueva |
   |---|---|
   | `/services` | `/experiencias` |
   | `/about-us` | `/conocenos` |
   | `/contact` | `/contacto` |
   | `/hello-world` | `/` |
   | `/category/uncategorized` | `/` |

   Más `/el-lugar` → `/conocenos`, que es un cambio nuestro. Con barra final
   (`/services/`, que es como las publica el sitio viejo) son **dos saltos**:
   el 308 de normalización de Next y luego el 301. Es lo esperado y Google lo
   sigue sin problema. Comprobarlo el día del cambio:

       curl -sI https://lafincaecohotel.com/services | grep -i "^HTTP\|^location"

## 5. Seguridad antes de entregar

- [ ] Rotar o borrar el usuario de pruebas del panel
      (`panel@lafincaecohotel.com`) antes de entregarle el proyecto al
      cliente. Es una cuenta de desarrollo, no debe quedar activa en
      producción.
- [ ] `CRON_SECRET` creada en Vercel (sección 2) y el cron visible en la
      pestaña **Cron Jobs** del proyecto.
- [ ] Comprobar que las cabeceras de seguridad viajan en producción:

          curl -sI https://<dominio>/ | grep -i "content-security-policy\|strict-transport\|x-frame\|referrer\|permissions\|x-content-type"

      Deben aparecer las seis. Si falta la CSP, el despliegue no cogió
      `next.config.ts`.
- [ ] En **Supabase → Authentication → Policies/Protection**, activar
      «Leaked password protection» y subir el mínimo de contraseña. Y en
      **Auth → Rate limits**, revisar el límite de `/token`.
- [ ] Repasar `docs/AUDITORIA_SEGURIDAD.md`: la sección «Pendiente» lista lo que
      hay que decidir o configurar fuera del código.
