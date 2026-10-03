# Guía de pruebas — sitio público con Bold en modo pruebas

> Para recorrer `https://lafincaecohotel.com` de punta a punta antes de activar los pagos reales. Marca cada casilla y anota lo que falle con la URL y una captura.

## Antes de empezar

**Variables en Vercel (Production) y redesplegar después de ponerlas:**

| Variable | Valor | Para qué |
|---|---|---|
| `BOLD_IDENTITY_KEY` | la de **pruebas**, de tu `.env.local` | Firmar el checkout |
| `BOLD_PRIVATE_KEY` | la de **pruebas**, de tu `.env.local` | Firmar el checkout |
| `PAGOS_ACTIVOS` | `1` | Muestra el botón de pagar |
| `CRON_SECRET` | el que te di | Protege el cron |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_NOTIFY_TO`, `EMAIL_REPLY_TO` | ya puestas | Correos |

**No pongas `BOLD_MODO`.** Con las llaves de pruebas y sin esa variable, el checkout lleva a la pasarela de pruebas y la confirmación llega por reconciliación (consulta directa a Bold), que es la vía que funciona en sandbox.

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

- [ ] **Hospedaje entre semana**: elige lunes a jueves. Solo aparece Plan Entre Semana. Precio $350.000 por noche.
- [ ] **Fin de semana**: viernes a domingo. Puedes elegir Estándar ($480.000) o Premium ($680.000), y cambiar entre ellos **sin perder las fechas**.
- [ ] **Estadía mixta**: jueves → sábado. El desglose muestra una noche Entre Semana y las demás al plan elegido, con el total correcto.
- [ ] **Víspera de festivo**: elige la noche anterior a un festivo entre semana. Debe cobrarse como fin de semana.
- [ ] **Cabaña 02**: no debe ofrecerse para noches entre semana, y el sitio explica por qué.
- [ ] **Experiencias por noche** (paso 4): añade una a una noche concreta y comprueba que suma al total.
- [ ] **Anticipo** (paso 5): mueve el deslizante entre 50 % y 100 %; el monto en pesos cambia en vivo.
- [ ] **Día de Calma**: elige **una sola fecha sin salida**. Aparece el plan de día, $250.000, máximo 2 adultos y los cupos que quedan.
- [ ] **No se reserva para hoy**: abre el calendario y comprueba que **el día de hoy sale tachado** y no se puede pulsar (igual que los días que ya pasaron). El primer día elegible es **mañana**. Pruébalo también en el **Día de Calma** y en el calendario de la **portada**.
- [ ] Intenta reservar una fecha ya ocupada: debe avisar en español, sin errores técnicos.

## 3 · Pagos

- [ ] **Pago aprobado**: completa una reserva y paga con la tarjeta aprobada. Al volver, la página de confirmación muestra la reserva **confirmada** con su código.
- [ ] En el panel, esa reserva aparece confirmada con el monto pagado y el saldo pendiente.
- [ ] **Pago rechazado**: repite con la tarjeta de rechazo. La reserva queda pendiente y no se confirma.
- [ ] **Abandono**: inicia un pago y cierra la pestaña sin pagar. A los 30 minutos la fecha vuelve a estar libre.
- [ ] **Botón del panel**: en una reserva pendiente con pago, pulsa «Verificar pago con Bold» y comprueba que responde con el estado real.

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

## 6 · Limpieza (importante)

- [ ] Borra **todas** las reservas de prueba desde el panel, incluidas las de día.
- [ ] Borra los bloqueos de prueba.
- [ ] Deshaz los cambios de contenido que hiciste para probar.
- [ ] Borra las fotos de prueba que subiste.
- [ ] Avísame para verificar que la base quedó limpia.

## Qué reportar

De cada fallo: **en qué página**, **qué hiciste**, **qué esperabas** y **qué pasó**, con captura. Si es del motor de reservas, añade las fechas y la cabaña: casi siempre el detalle está ahí.

---

## Cuando terminen las pruebas

1. Quitar `PAGOS_ACTIVOS` o ponerlo en `0` hasta el lanzamiento real, para que nadie reserve gratis.
2. Cambiar las llaves de Bold por las de **producción**, registrar el webhook en `https://lafincaecohotel.com/api/pagos/bold/webhook` y habilitar las llaves de integración en su panel.
3. Volver a poner `PAGOS_ACTIVOS=1` y hacer **una compra real pequeña** con su reembolso.
4. Enviar el sitemap a Google Search Console.
5. Crear las cuentas reales del equipo y borrar el usuario de pruebas.
