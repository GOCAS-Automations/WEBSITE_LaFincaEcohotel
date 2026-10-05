# Guía de pruebas — sitio público con Bold en modo pruebas

> Para recorrer el sitio de punta a punta antes de activar los pagos reales: lo demás en `https://lafincaecohotel.com`, los pagos en `https://pruebas.lafincaecohotel.com`. Marca cada casilla y anota lo que falle con la URL y una captura.

## Antes de empezar

**Dos direcciones, y no son intercambiables:**

| Dónde | Qué se prueba ahí | Pagos |
|---|---|---|
| `https://lafincaecohotel.com` | Las secciones **1, 2, 4, 5, 6 y 7** | Apagados |
| `https://pruebas.lafincaecohotel.com` | **Solo la sección 3 (pagos)** | Encendidos, con la pasarela de pruebas |

`pruebas.lafincaecohotel.com` es la vista previa de la rama `pruebas-pagos`: el mismo sitio, la misma base de datos y el mismo panel, pero con las llaves de **pruebas** de Bold en su propio alcance. Ya está configurada; para la ronda de pagos solo hay que entrar por ahí.

**Por qué la ronda de pagos no se hace en el sitio real:** con llaves de pruebas en Production, un huésped que entre a `/reservar` esa tarde podría «pagar» con una tarjeta de sandbox —que no cobra un peso— y quedarse con una reserva de verdad confirmada y una cabaña bloqueada.

**Variables en Vercel. Antes de empezar, comprobar que están así** (y redesplegar si se cambia alguna):

| Variable | Production (el sitio real) | Preview (rama `pruebas-pagos`) |
|---|---|---|
| `BOLD_IDENTITY_KEY` | la de **producción** (o vacía hasta el lanzamiento) | la de **pruebas** |
| `BOLD_PRIVATE_KEY` | la de **producción** (o vacía hasta el lanzamiento) | la de **pruebas** |
| `PAGOS_ACTIVOS` | **`0`** (o borrada) hasta el lanzamiento | `1` |
| `BOLD_MODO` | **no debe existir** | `pruebas` |
| `CRON_SECRET` | el que te di | el mismo |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_NOTIFY_TO`, `EMAIL_REPLY_TO` | ya puestas | ya puestas |

Lo único que no puede pasar nunca es **llaves de pruebas con `PAGOS_ACTIVOS=1` en Production**. Si alguna vez quedan así, el sitio se defiende solo —no confirma ninguna reserva y deja el motivo en los registros—, pero entonces los pagos no se pueden probar: por eso se usa la vista previa.

**Tarjetas de prueba:** aprobada `4111 1111 1111 1111` · rechazada `4970 1100 0000 0062`. Fecha futura cualquiera, CVV cualquiera.

**Importante:** estas pruebas escriben en la base real. Usa fechas dentro de **tres meses o más** y borra todo al final (última sección).

---

## 1 · Sitio público

- [ ] La portada carga: hero con el módulo de reserva dentro, cabañas alineadas, reseñas de Google, Instagram con el reel.
- [ ] El menú flotante funciona y «Reservar» lleva a `/reservar`.
- [ ] `/alojamientos`: las cinco cabañas en zigzag, cada una con su rasgo distintivo y su precio.
- [ ] Ficha de una cabaña: galería que abre en grande y se cierra, amenidades, precios por plan.
- [ ] `/experiencias`: Aniversario, Cumpleaños y Fondue con foto y precio.
- [ ] `/conocenos`: las dos imágenes alineadas, el video de COP16, el mapa apuntando al hotel.
- [ ] `/galeria`: paginación, fotos sin recortar y sin repetidas.
- [ ] `/faq` y `/contacto`: el correo del hotel y el WhatsApp funcionan.
- [ ] Pie: RNT 114565, «Raquel Lenis García · NIT 66830269-5», enlaces legales.
- [ ] Los cuatro documentos de `/legal/` abren.
- [ ] **En el celular**: recorre lo mismo. Nada se solapa, el botón de WhatsApp no tapa el módulo de reserva, el calendario se usa con el dedo.

## 2 · Motor de reservas

El orden es **primero la cabaña, luego las fechas**. En `/reservar`, el paso 1 es «¿Dónde te quedas?» (las cinco cabañas y el Día de Calma) y el paso 2, «¿Cuándo?», el calendario.

- [ ] **Sin cabaña elegida**, el paso de fechas se ve atenuado, no se puede abrir y dice «Elige primero tu cabaña para ver sus fechas libres». Con el teclado (tabulador) no se llega a él.
- [ ] **Al elegir una cabaña, sus noches ocupadas salen tachadas y no se pueden elegir.** Prueba con una cabaña que tenga reservas en el calendario del hotel (por ejemplo, la 01 en octubre o noviembre).
- [ ] **Se puede llegar el mismo día en que otro huésped sale**: si una reserva ocupa las noches del 10 y el 11, el 12 está libre para llegar; y quien llega antes puede salir como tarde el 10.
- [ ] Con una llegada elegida justo antes de una noche ocupada, los días posteriores salen tachados y el calendario dice «como tarde, el …».
- [ ] **Fechas que llegan sin cabaña** (desde la portada sin elegir cabaña): se conservan; al elegir cabaña, si están libres se quedan y si no, se quitan con un aviso corto.
- [ ] En la **portada**, con una cabaña elegida en el módulo, el calendario tacha sus noches ocupadas; sin cabaña, solo los días en que no queda ninguna libre, y lo explica.
- [ ] **Hospedaje entre semana**: elige lunes a jueves. Solo aparece Plan Entre Semana. Precio $350.000 por noche.
- [ ] **Fin de semana**: viernes a domingo. Puedes elegir Estándar ($480.000) o Premium ($680.000), y cambiar entre ellos **sin perder las fechas**.
- [ ] **Estadía mixta**: jueves → sábado. El desglose muestra una noche Entre Semana y las demás al plan elegido, con el total correcto.
- [ ] **Víspera de festivo**: elige la noche anterior a un festivo entre semana. Debe cobrarse como fin de semana.
- [ ] **Cabaña 02**: su tarjeta dice «Solo noches de fin de semana o festivo»; al elegirla, las noches de lunes a jueves salen tachadas en el calendario, con la explicación escrita.
- [ ] **Experiencias por noche** (paso 4): añade una a una noche concreta y comprueba que suma al total.
- [ ] **Anticipo** (paso 5): mueve el deslizante entre 50 % y 100 %; el monto en pesos cambia en vivo.
- [ ] **Día de Calma**: en el paso 1 elige **Día de Calma**. El calendario pasa a pedir **un solo día** (sin salida) y tacha los días sin cupo. Aparece el plan de día, $250.000, máximo 2 adultos y los cupos que quedan.
- [ ] **No se reserva para hoy**: abre el calendario y comprueba que **el día de hoy sale tachado** y no se puede pulsar (igual que los días que ya pasaron). El primer día elegible es **mañana**. Pruébalo también en el **Día de Calma** y en el calendario de la **portada**.
- [ ] Intenta reservar una fecha ya ocupada (por ejemplo, entrando con `?cabana=…&entrada=…&salida=…` de unas noches ocupadas): debe avisar en español, sin errores técnicos.

## 3 · Pagos — **esta sección va en `pruebas.lafincaecohotel.com`**

> Toda esta sección, incluido el panel, se hace entrando por `https://pruebas.lafincaecohotel.com`. En el sitio real el botón de pagar no aparece, y es a propósito: en Production los pagos siguen apagados hasta el lanzamiento.

- [ ] Abre `https://pruebas.lafincaecohotel.com/reservar`. **El botón de pagar aparece.** (Si no aparece, avísame: falta `PAGOS_ACTIVOS=1` en la vista previa.)
- [ ] Abre `https://lafincaecohotel.com/reservar` en otra pestaña: ahí el cierre tiene que seguir siendo **por WhatsApp**, sin botón de pagar. Es la comprobación de que el sitio real no está cobrando con una pasarela de pruebas.
- [ ] **Pago aprobado**: completa una reserva y paga con la tarjeta aprobada. Al volver, la página de confirmación muestra la reserva **confirmada** con su código.
- [ ] En el panel (`pruebas.lafincaecohotel.com/admin`), esa reserva aparece confirmada con el monto pagado y el saldo pendiente.
- [ ] **Pago rechazado**: repite con la tarjeta de rechazo. La reserva queda pendiente y no se confirma.
- [ ] **Abandono**: inicia un pago y cierra la pestaña sin pagar. A los 30 minutos la fecha vuelve a estar libre.
- [ ] **Botón del panel**: en una reserva pendiente con pago, pulsa «Verificar pago con Bold» y comprueba que responde con el estado real.

Las reservas que creaste aquí son reservas de verdad —la base de datos es la misma—, así que entran en la limpieza de la sección 7 igual que las demás.

## 4 · Correos

Tras el pago aprobado, revisa `fincavillarrealcali@gmail.com`:

- [ ] Llega el **aviso interno** con los datos del huésped y el enlace a la ficha del panel.
- [ ] Llega la **confirmación al huésped** (usa tu correo como huésped para verla): código, cabaña, fechas, desglose, total, anticipo, saldo, cómo llegar, horarios.
- [ ] Caen en **bandeja de entrada**, no en spam. El logo se ve. Al responder, la respuesta llega al Gmail del hotel.
- [ ] Ábrelos en el celular: se leen bien.

## 5 · Panel de administración

Entra en `lafincaecohotel.com/admin` con la cuenta propietaria.

- [ ] **Reservas**: el calendario mensual muestra las cinco cabañas y la fila de Día de Calma con sus cupos.
- [ ] Crea una **reserva manual** (como las de WhatsApp) y comprueba que bloquea el calendario.
- [ ] **El panel SÍ puede reservar para hoy**: crea una reserva manual con la fecha de entrada de **hoy** (es la que trae el formulario por defecto). Tiene que guardarse sin quejarse: la regla del día de antelación es solo del sitio público.
- [ ] Crea un **bloqueo** por mantenimiento y comprueba que esa fecha deja de ofrecerse en el sitio.
- [ ] **Contenido**: cambia un texto de la portada, guarda y verifícalo en el sitio.
- [ ] **Cabañas**: cambia una comodidad y un precio; compruébalo en la ficha pública.
- [ ] **Experiencias** y **Adicionales**: crea uno, verifícalo en el sitio y bórralo.
- [ ] **Planes**: edita el «qué incluye» de un plan.
- [ ] **Legales**: edita un párrafo y verifícalo en la página pública.
- [ ] **Usuarios**: crea una cuenta de equipo, entra con ella y comprueba que **no** ve la sección Usuarios. Bórrala.
- [ ] Sube una **foto nueva** desde el panel y comprueba que aparece en el sitio.

### Temporadas (tarifas por fechas)

Usa fechas a tres meses o más y una cabaña libre. La «Temporada de fin de año» ya está cargada:
**no la borres**; crea una de prueba y bórrala al terminar.

- [ ] **Temporadas** aparece en el menú. El listado muestra la «Temporada de fin de año» en
      **Próximas** (o **Activas ahora** si ya es diciembre), con «1 dic 2026 – 8 ene 2027 · 39 noches ·
      Todas las cabañas» y sus tres precios.
- [ ] Ábrela con **Editar**: al lado de cada uno de los cuatro precios dice **«+15 % sobre la base»**.
      No guardes nada.
- [ ] **Crear**: «Nueva temporada» → nombre «Prueba», primera y última noche en dos fechas futuras,
      «Solo la Cabaña 03», precio de Premium distinto del de la base → **Crear temporada**. Vuelve al
      listado con «Temporada «Prueba» creada» y aparece en Próximas como «Solo la Cabaña 03».
- [ ] **Verla en el motor**: en `/reservar`, Cabaña 03, esas fechas en fin de semana y plan Premium.
      Cada noche del desglose lleva debajo el nombre **«Prueba»** y el precio nuevo; el total cuadra.
      Una noche fuera del rango sale con el precio de siempre y sin nombre de temporada.
- [ ] **Cruce rechazado**: «Nueva temporada» para **todas las cabañas** del 20 al 27 de diciembre con
      precio de Estándar. Antes de guardar aparece el aviso rojo «Se cruza con «Temporada de fin de
      año»…», y al guardar sale el mismo mensaje y no se crea nada.
- [ ] **Una persona**: «Nueva temporada» con precio de Entre Semana solo para dos personas → no deja
      guardar y explica que hacen falta los dos precios o ninguno.
- [ ] **Editar**: cambia el precio de «Prueba», guarda («Cambios guardados…») y recarga `/reservar`:
      el desglose muestra el precio nuevo.
- [ ] **Borrar**: en la ficha de «Prueba», **Borrar temporada** → la confirmación dice que las
      reservas ya hechas no cambian → acepta. En `/reservar` esas noches vuelven al precio base.
- [ ] La ficha de una cabaña en el panel (Cabañas → Cabaña 01) dice debajo de los precios
      «Temporadas que cambian estos precios: «Temporada de fin de año»…».
- [ ] La Cabaña 02 sigue sin ofrecerse entre semana en diciembre (sus lunes a jueves salen tachados).

## 6 · Calendario de Google (solo si ya está conectado)

Esta sección se hace **solo si el panel dice «Calendario del hotel: conectado»**.
Mientras diga «sin configurar», sáltala: significa que todavía no se ha
compartido el calendario con el sitio.

- [ ] **Del panel a Google:** crea una reserva manual en el panel y ábrela luego
      en Google Calendar. Tiene que aparecer el evento, con la cabaña y el
      nombre del huésped en el título, en los días correctos (el día de salida
      **no** se ocupa).
- [ ] Cambia las fechas de esa reserva en el panel: el mismo evento se mueve en
      Google, no se crea otro.
- [ ] Cancela la reserva en el panel: el evento **desaparece** de Google.
- [ ] **De Google al sitio:** crea a mano en Google un evento llamado
      «Cabaña 3 — prueba» para un fin de semana libre. En el panel, pulsa
      «Actualizar ahora» en el recuadro del calendario del hotel. Esas noches
      tienen que salir ocupadas **solo en la Cabaña 3**, y en el sitio público la
      Cabaña 3 deja de ofrecerse para esas fechas (las otras cuatro siguen
      libres).
- [ ] **Un evento sin cabaña bloquea las cinco:** crea otro evento a mano
      llamado «Reunión» (sin nombrar ninguna cabaña) en un día libre. Tras
      «Actualizar ahora», ese día tiene que salir ocupado en **las cinco**
      cabañas, en el panel y en el sitio. Es a propósito: ante la duda, no se
      vende.
- [ ] Borra de Google los dos eventos de prueba y pulsa «Actualizar ahora»: las
      fechas vuelven a estar libres.

## 7 · Limpieza (importante)

- [ ] Borra **todas** las reservas de prueba desde el panel, incluidas las de día.
- [ ] Borra los bloqueos de prueba.
- [ ] Borra del calendario de Google los eventos de prueba que creaste a mano.
- [ ] Deshaz los cambios de contenido que hiciste para probar.
- [ ] Borra las fotos de prueba que subiste.
- [ ] Avísame para verificar que la base quedó limpia.

## Qué reportar

De cada fallo: **en qué página**, **qué hiciste**, **qué esperabas** y **qué pasó**, con captura. Si es del motor de reservas, añade las fechas y la cabaña: casi siempre el detalle está ahí.

---

## Cuando terminen las pruebas

1. Comprobar que Production sigue con `PAGOS_ACTIVOS=0` y **sin** `BOLD_MODO`: las llaves de pruebas se quedan solo en la vista previa.
2. Poner en Production las llaves de Bold de **producción**, registrar el webhook en `https://lafincaecohotel.com/api/pagos/bold/webhook` y habilitar las llaves de integración en su panel.
3. Recién entonces poner `PAGOS_ACTIVOS=1` en Production y hacer **una compra real pequeña** con su reembolso.
4. Enviar el sitemap a Google Search Console.
5. Crear las cuentas reales del equipo y borrar el usuario de pruebas.
