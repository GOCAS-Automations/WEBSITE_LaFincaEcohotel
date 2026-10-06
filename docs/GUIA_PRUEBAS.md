# Guía de pruebas — la definitiva antes del lanzamiento

> Al día con todo lo construido hasta el 2026-10-05: cabaña antes que fechas, calendario de Google conectado, tarifas diferenciales (antes «temporadas»), horarios nuevos y la víspera de festivos en viernes. Se recorre el sitio de punta a punta antes de activar los pagos reales: casi todo en `https://lafincaecohotel.com` y los pagos en `https://pruebas.lafincaecohotel.com`. Marca cada casilla y anota lo que falle con la URL y una captura.
>
> **Orden recomendado:** primera ronda con las secciones 1, 2, 5 y 6 en el sitio real; luego la segunda ronda, secciones 3 y 4, en la vista previa de pagos; al final, la limpieza (7). Mándame los fallos **todos juntos** al final de cada ronda.

## Antes de empezar

**Dos direcciones, y no son intercambiables:**

| Dónde | Qué se prueba ahí | Pagos |
|---|---|---|
| `https://lafincaecohotel.com` | Las secciones **1, 2, 4, 5, 6 y 7** | Apagados |
| `https://pruebas.lafincaecohotel.com` | **Solo la sección 3 (pagos)** | Encendidos, con la pasarela de pruebas |

`pruebas.lafincaecohotel.com` es la vista previa de la rama `pruebas-pagos`: el mismo sitio, la misma base de datos y el mismo panel, pero con las llaves de **pruebas** de Bold en su propio alcance. Ya está configurada; para la ronda de pagos solo hay que entrar por ahí. Se puso al día con `main` el 2026-10-05: **si después se sube algo nuevo a `main`, hay que volver a ponerla al día** antes de probar pagos, o se prueba código viejo.

Ahí el calendario de Google sale «sin configurar» y es normal: sus variables solo están en Production, así que las reservas de pago de prueba no se escriben en el calendario del hotel.

**Por qué la ronda de pagos no se hace en el sitio real:** con llaves de pruebas en Production, un huésped que entre a `/reservar` esa tarde podría «pagar» con una tarjeta de sandbox —que no cobra un peso— y quedarse con una reserva de verdad confirmada y una cabaña bloqueada.

**Variables en Vercel. Antes de empezar, comprobar que están así** (y redesplegar si se cambia alguna):

| Variable | Production (el sitio real) | Preview (rama `pruebas-pagos`) |
|---|---|---|
| `BOLD_IDENTITY_KEY` | la de **producción** (o vacía hasta el lanzamiento) | la de **pruebas** |
| `BOLD_PRIVATE_KEY` | la de **producción** (o vacía hasta el lanzamiento) | la de **pruebas** |
| `PAGOS_ACTIVOS` | **`0`** (o borrada) hasta el lanzamiento | `1` |
| `BOLD_MODO` | **no debe existir** | no hace falta (solo afecta a los avisos automáticos, que Bold no envía en modo de pruebas) |
| `CRON_SECRET` | puesta | — |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_NOTIFY_TO`, `EMAIL_REPLY_TO` | ya puestas | ya puestas |
| `GOOGLE_CALENDAR_CREDENCIALES`, `GOOGLE_CALENDAR_ID`, `GOOGLE_CALENDAR_ESCRIBIR_EN` | puestas (siete calendarios) | no hacen falta |

Lo único que no puede pasar nunca es **llaves de pruebas con `PAGOS_ACTIVOS=1` en Production**. Si alguna vez quedan así, el sitio se defiende solo —no confirma ninguna reserva y deja el motivo en los registros—, pero entonces los pagos no se pueden probar: por eso se usa la vista previa.

**Tarjetas de prueba:** aprobada `4111 1111 1111 1111` · rechazada `4970 1100 0000 0062`. Fecha futura cualquiera, CVV cualquiera.

**Importante:** estas pruebas escriben en la base real y en el calendario real del hotel. Borra todo al final (sección 7). **Qué fechas usar:**

| Para probar | Usa | Por qué |
|---|---|---|
| Precios normales, reservas, bloqueos | **febrero de 2027 en adelante** | Fuera de la temporada de fin de año y lejos de las reservas reales |
| Precios de la tarifa diferencial de fin de año y el 24 / 31 de diciembre | **diciembre de 2026** (solo mirar el desglose; si creas una reserva, bórrala) | Es donde está cargada la «Temporada de fin de año» |
| Que se vean tachadas las noches ocupadas | **octubre y noviembre de 2026, solo mirar** | Ahí están las reservas reales del calendario del hotel: no reserves encima |

---

## 1 · Sitio público

- [x] La portada carga: hero con el módulo de reserva dentro, cabañas alineadas, reseñas de Google, Instagram con el reel.
- [x] El menú flotante funciona y «Reservar» lleva a `/reservar`.
- [x] `/alojamientos`: las cinco cabañas en zigzag, cada una con su rasgo distintivo y su precio.
- [x] Ficha de una cabaña: galería que abre en grande y se cierra, amenidades, precios por plan, y la línea que avisa que del 1 de diciembre al 8 de enero aplican tarifas de temporada.
- [x] `/experiencias`: Aniversario, Cumpleaños y Fondue con foto y precio.
- [x] `/conocenos`: las dos imágenes alineadas, el video de COP16, el mapa apuntando al hotel.
- [x] `/galeria`: paginación, fotos sin recortar y sin repetidas.
- [x] `/faq` y `/contacto`: el correo del hotel y el WhatsApp funcionan.
- [x] Pie: RNT 114565, «Raquel Lenis García · NIT 66830269-5», enlaces legales.
- [x] Los cuatro documentos de `/legal/` abren.
- [x] **Horarios nuevos**: en `/faq` («¿A qué hora puedo llegar…?») y en los términos (sección 5) dice entrega de la cabaña a las 3:00 p. m. (15:00), **llegada hasta las 7:00 p. m.** (19:00) y **salida a las 12:00 m.** Los términos dicen «actualizado» el 5 de octubre de 2026; las otras tres páginas legales siguen con el 30 de septiembre, y es correcto.
- [x] **En el celular**: recorre lo mismo. Nada se solapa, el botón de WhatsApp no tapa el módulo de reserva, el calendario se usa con el dedo.

## 2 · Motor de reservas

El orden es **primero la cabaña, luego las fechas**. En `/reservar`, el paso 1 es «¿Dónde te quedas?» (las cinco cabañas y el Día de Calma) y el paso 2, «¿Cuándo?», el calendario.

- [x] **Sin cabaña elegida**, el paso de fechas se ve atenuado, no se puede abrir y dice «Elige primero tu cabaña para ver sus fechas libres». Con el teclado (tabulador) no se llega a él.
- [x] **Al elegir una cabaña, sus noches ocupadas salen tachadas y no se pueden elegir.** Prueba con una cabaña que tenga reservas en el calendario del hotel (por ejemplo, la 01 en octubre o noviembre).
- [x] **Se puede llegar el mismo día en que otro huésped sale**: si una reserva ocupa las noches del 10 y el 11, el 12 está libre para llegar; y quien llega antes puede salir como tarde el 10.
- [x] Con una llegada elegida justo antes de una noche ocupada, los días posteriores salen tachados y el calendario dice «como tarde, el …».
- [x] **Fechas que llegan sin cabaña** (desde la portada sin elegir cabaña): se conservan; al elegir cabaña, si están libres se quedan y si no, se quitan con un aviso corto.
- [x] En la **portada**, con una cabaña elegida en el módulo, el calendario tacha sus noches ocupadas; sin cabaña, solo los días en que no queda ninguna libre, y lo explica.
- [ ] **Selector de mes y año** (en `/reservar` y en la portada): toca el título del mes («Octubre de 2026») y se abre una rejilla con los doce meses y el año arriba. Toca, por ejemplo, marzo de 2027: el calendario salta a ese mes. Los meses que ya pasaron salen tachados, y no deja ir más allá de dos años; las flechas de mes se detienen en los mismos límites.
- [ ] Con el selector de meses abierto, la tecla **Escape** vuelve a los días sin cerrar el calendario; con el teclado, las flechas se mueven entre meses y Enter elige.
**Precios normales** (fechas de febrero de 2027 en adelante):

- [x] **Hospedaje entre semana**: elige lunes a jueves. Solo aparece Plan Entre Semana. Precio $350.000 por noche ($200.000 si viaja una sola persona).
- [x] **Fin de semana**: viernes a domingo. Puedes elegir Estándar ($480.000) o Premium ($680.000), y cambiar entre ellos **sin perder las fechas**.
- [x] **Estadía mixta**: jueves → sábado. El desglose muestra una noche Entre Semana y las demás al plan elegido, con el total correcto.
- [x] **Víspera de festivo**: el miércoles 24 de marzo de 2027 es la víspera del Jueves Santo. Esa noche debe cobrarse como fin de semana (Estándar o Premium), no como Entre Semana.

**Temporada de fin de año** (diciembre de 2026, Cabaña 01; solo mira el desglose):

- [x] **Martes 15 de diciembre** → Plan Entre Semana a **$402.500** por noche ($230.000 una sola persona), con «Temporada de fin de año» escrito debajo de la noche en el desglose. (No uses el martes 8: es festivo y se cobra como fin de semana; el lunes 7, su víspera, también.)
- [x] **Sábado 12 de diciembre** → Estándar **$552.000** y Premium **$782.000**.
- [x] **Del 30 de noviembre al 2 de diciembre** → dos noches distintas: la del 30 a $350.000 (sin nombre de temporada) y la del 1 a $402.500 (con nombre). Total **$752.500**.
- [x] **El 24 y el 31 de diciembre** (jueves, vísperas de Navidad y Año Nuevo, que caen en viernes) se cobran como **fin de semana**: $552.000 Estándar o $782.000 Premium, nunca $402.500.
- [x] Con la **Cabaña 02**, en diciembre se pueden elegir los lunes a jueves que son festivo o víspera —el **7, 8, 24 y 31**— y los demás lunes a jueves siguen tachados.
- [x] Una noche **después** del 8 de enero de 2027 vuelve al precio normal y sin nombre de temporada.
- [x] **Cabaña 02**: su tarjeta dice «Solo noches de fin de semana o festivo»; al elegirla, las noches de lunes a jueves salen tachadas en el calendario, con la explicación escrita.
- [x] **Experiencias por noche** (paso 4): añade una a una noche concreta y comprueba que suma al total.
- [x] **Anticipo** (paso 5): mueve el deslizante entre 50 % y 100 %; el monto en pesos cambia en vivo.
- [x] **Día de Calma**: en el paso 1 elige **Día de Calma**. El calendario pasa a pedir **un solo día** (sin salida) y tacha los días sin cupo. Aparece el plan de día, $250.000, máximo 2 adultos y los cupos que quedan.
- [x] **No se reserva para hoy**: abre el calendario y comprueba que **el día de hoy sale tachado** y no se puede pulsar (igual que los días que ya pasaron). El primer día elegible es **mañana**. Pruébalo también en el **Día de Calma** y en el calendario de la **portada**.
- [x] Intenta reservar una fecha ya ocupada (por ejemplo, entrando con `?cabana=…&entrada=…&salida=…` de unas noches ocupadas): debe avisar en español, sin errores técnicos.
- [ ] **El aviso de noches ocupadas no dice quién las tiene** (nuevo el 2026-10-05): si al pagar las noches se acaban de ocupar, el mensaje es «Esas noches ya no están disponibles en la Cabaña 03. Elige otras fechas o escríbenos por WhatsApp.», **sin** el nombre de otro huésped, ni el código de su reserva, ni el título del evento del calendario de Google. (En el panel, el mensaje sí sigue diciendo quién es.)

## 3 · Pagos — **esta sección va en `pruebas.lafincaecohotel.com`**

> Toda esta sección, incluido el panel, se hace entrando por `https://pruebas.lafincaecohotel.com`. En el sitio real el botón de pagar no aparece, y es a propósito: en Production los pagos siguen apagados hasta el lanzamiento.

- [ ] Abre `https://pruebas.lafincaecohotel.com/reservar`. **El botón de pagar aparece.** (Si no aparece, avísame: falta `PAGOS_ACTIVOS=1` en la vista previa.)
- [ ] Abre `https://lafincaecohotel.com/reservar` en otra pestaña: ahí el cierre tiene que seguir siendo **por WhatsApp**, sin botón de pagar. Es la comprobación de que el sitio real no está cobrando con una pasarela de pruebas.
- [ ] **Pago aprobado**: completa una reserva y paga con la tarjeta aprobada. Al volver, la página de confirmación muestra la reserva **confirmada** con su código.
- [ ] En el panel (`pruebas.lafincaecohotel.com/admin`), esa reserva aparece confirmada con el monto pagado y el saldo pendiente.
- [ ] **Pago rechazado**: repite con la tarjeta de rechazo. La reserva queda pendiente y no se confirma.
- [ ] **Abandono**: inicia un pago y cierra la pestaña sin pagar. A los 30 minutos la fecha vuelve a estar libre.
- [ ] **Botón del panel**: en una reserva pendiente con pago, pulsa «Verificar pago con Bold» y comprueba que responde con el estado real.
- [ ] **El monto cambió mientras pagaba**: deja `/reservar` abierto con una estadía de 2027 lista para pagar; en otra pestaña, en el panel, crea una tarifa diferencial de prueba para esa cabaña y esas fechas con otro precio. Vuelve y pulsa pagar: en vez de ir a Bold, debe mostrar el monto nuevo y preguntar «Sí, pagar $…» / «No, volver a revisar». Borra la tarifa de prueba.

Las reservas que creaste aquí son reservas de verdad —la base de datos es la misma—, así que entran en la limpieza de la sección 7 igual que las demás.

## 4 · Correos

Tras el pago aprobado, revisa `fincavillarrealcali@gmail.com`:

- [ ] Llega el **aviso interno** con los datos del huésped y el enlace a la ficha del panel.
- [ ] Llega la **confirmación al huésped** (usa tu correo como huésped para verla): código, cabaña, fechas, desglose, total, anticipo, saldo, cómo llegar y horarios: entrega 3:00 p. m., **llegada hasta las 7:00 p. m.**, **salida 12:00 m.**
- [ ] Caen en **bandeja de entrada**, no en spam. El logo se ve. Al responder, la respuesta llega al Gmail del hotel.
- [ ] Ábrelos en el celular: se leen bien.

## 5 · Panel de administración

Entra en `lafincaecohotel.com/admin` con la cuenta propietaria.

- [x] **Reservas**: el calendario mensual muestra las cinco cabañas y la fila de Día de Calma con sus cupos.
- [x] Crea una **reserva manual** (como las de WhatsApp) y comprueba que bloquea el calendario.
- [x] **El panel SÍ puede reservar para hoy**: crea una reserva manual tocando **hoy** como llegada en el calendario del formulario. Tiene que guardarse sin quejarse: la regla del día de antelación es solo del sitio público.
- [x] Crea un **bloqueo** por mantenimiento y comprueba que esa fecha deja de ofrecerse en el sitio.
- [x] **Contenido**: cambia un texto de la portada, guarda y verifícalo en el sitio.
- [x] **Cabañas**: cambia una comodidad y un precio; compruébalo en la ficha pública.
- [x] **Experiencias** y **Adicionales**: crea uno, verifícalo en el sitio y bórralo.
- [x] **Planes**: edita el «qué incluye» de un plan.
- [x] **Legales**: edita un párrafo y verifícalo en la página pública.
- [x] **Usuarios**: crea una cuenta de equipo, entra con ella y comprueba que **no** ve la sección Usuarios. Bórrala.
- [x] Sube una **foto nueva** desde el panel y comprueba que aparece en el sitio.

### Reservas: el calendario del mes (nuevo el 2026-10-05)

- [ ] **La página no se desplaza hacia los lados**, ni en el computador ni en el celular: lo que no cabe (el mes completo) se desplaza dentro de su recuadro, y la columna de las cabañas y la fila de los días se quedan fijas al desplazarlo.
- [ ] **Todos los días miden lo mismo**, tengan o no reservas, y cada estadía es **una barra** con el nombre del huésped a lo largo de sus noches. Sábados, domingos y festivos tienen un tono suave; **hoy** va marcado.
- [ ] La leyenda de abajo distingue las **reservas del sitio y del panel** (color lleno según el estado: confirmada, pendiente, completada) de los **eventos del calendario del hotel** (rayados) y de los **eventos que no dicen qué cabaña** (rayados con borde ámbar: ocupan todas). Pasar el ratón por una barra dice quién es, de dónde viene y sus fechas.
- [ ] La fila del **Día de Calma** muestra los cupos tomados de cada día («4/10»).
- [ ] **Selector de mes y año**: toca «Octubre 2026» y elige otro mes o año; el botón **Hoy** vuelve al mes actual. Las flechas siguen funcionando.
- [ ] **En el celular** se abre **Por día**: una tira con los días del mes (cada uno dice cuántas cabañas tiene ocupadas) y, debajo, las cinco cabañas de ese día con quién duerme, quién llega, quién sale por la mañana y el cupo del Día de Calma. **Mes completo** muestra la cuadrícula.

### Resumen (nuevo el 2026-10-05)

- [ ] El Resumen cuenta **también** las reservas del calendario de Google del hotel: «En casa esta noche», «Llegan hoy», «Llegan esta semana» y la ocupación del mes ya no salen en cero.
- [ ] **Hoy** y **Próximos siete días** listan nombre, cabaña, noches y de dónde viene cada reserva (estado si es del sitio o del panel; «Calendario del hotel» si es de Google).
- [ ] **Ocupación del mes**: una barra por cabaña con «% · noches ocupadas / noches que se podían vender» y el total. La Cabaña 02 cuenta solo sus noches de fin de semana o festivo.
- [ ] **Reservas del mes** por origen (Sitio web, Panel, Calendario del hotel) e **Ingresos del mes**, que dicen claro que solo suman las reservas del sitio y del panel.
- [ ] Una reserva del panel **no se cuenta dos veces** aunque también esté en el calendario de Google (crea una manual y comprueba que el total de «Reservas del mes» sube en uno; bórrala después).

### Reserva manual con el calendario del sitio (nuevo el 2026-10-05)

- [ ] **Primero la cabaña**: en «Nueva reserva», sin cabaña elegida el calendario está apagado y dice «Elige primero la cabaña para ver sus fechas libres».
- [ ] Con una cabaña elegida, el calendario es **el mismo del sitio** y **tacha** sus noches ocupadas: reservas, bloqueos y eventos del calendario de Google del hotel. Se puede elegir **hoy**.
- [ ] La **Cabaña 02** tacha sus noches de lunes a jueves y lo explica dentro del calendario.
- [ ] **Día de Calma**: el tipo «Día de Calma» cambia el calendario a un solo día y tacha los días sin cupo.
- [ ] **Al editar** una reserva, sus propias noches **no** salen tachadas: se pueden conservar o alargar sus fechas.
- [ ] Elige fechas libres en una cabaña y cambia a otra que las tenga ocupadas: sale un aviso rojo debajo del calendario.
- [ ] **El servidor no deja duplicar una reserva de Google**: si aun así se pulsa «Crear reserva» sobre noches que el hotel tiene en su calendario de Google, no se guarda y el mensaje dice la cabaña y el evento, por ejemplo «Esas noches ya están ocupadas en la Cabaña 03 por «Alvaro Pacheco cabaña 3» (calendario del hotel)…». **Lo escrito no se borra** (nombre, teléfono, cabaña).

### Tarifas diferenciales (antes «Temporadas»)

Usa fechas a tres meses o más y una cabaña libre. La «Temporada de fin de año» ya está cargada:
**no la borres**; crea una de prueba y bórrala al terminar.

- [x] **Tarifas diferenciales** aparece en el menú (en `/admin/tarifas-diferenciales`). El listado muestra la «Temporada de fin de año» en
      **Próximas** (o **Activas ahora** si ya es diciembre), con «01/12/2026 al 08/01/2027 · 39 noches ·
      Todas las cabañas» y sus tres precios.
- [x] Ábrela con **Editar**: al lado de cada uno de los cuatro precios dice **«+15 % sobre la base»**.
      No guardes nada.
- [x] **Crear**: «Nueva tarifa diferencial» → nombre «Prueba», primera y última noche en dos fechas futuras,
      «Solo la Cabaña 03», precio de Premium distinto del de la base → **Crear tarifa diferencial**. Vuelve al
      listado con «Tarifa diferencial «Prueba» creada» y aparece en Próximas como «Solo la Cabaña 03».
- [x] **Verla en el motor**: en `/reservar`, Cabaña 03, esas fechas en fin de semana y plan Premium.
      Cada noche del desglose lleva debajo el nombre **«Prueba»** y el precio nuevo; el total cuadra.
      Una noche fuera del rango sale con el precio de siempre y sin nombre de temporada.
- [x] **Cruce rechazado**: «Nueva tarifa diferencial» para **todas las cabañas** del 20 al 27 de diciembre con
      precio de Estándar. Antes de guardar aparece el aviso rojo «Se cruza con «Temporada de fin de
      año»…», y al guardar sale el mismo mensaje y no se crea nada.
- [x] **Una persona**: «Nueva tarifa diferencial» con precio de Entre Semana solo para dos personas → no deja
      guardar y explica que hacen falta los dos precios o ninguno.
- [x] **Editar**: cambia el precio de «Prueba», guarda («Cambios guardados…») y recarga `/reservar`:
      el desglose muestra el precio nuevo.
- [x] **Borrar**: en la ficha de «Prueba», **Borrar tarifa diferencial** → la confirmación dice que las
      reservas ya hechas no cambian → acepta. En `/reservar` esas noches vuelven al precio base.
- [x] La ficha de una cabaña en el panel (Cabañas → Cabaña 01) dice debajo de los precios
      «Tarifas diferenciales que cambian estos precios: «Temporada de fin de año»…».
- [x] La Cabaña 02 sigue sin ofrecerse entre semana en diciembre (sus lunes a jueves salen tachados).
- [ ] La dirección vieja `/admin/temporadas` lleva sola a `/admin/tarifas-diferenciales`.
- [ ] El recuadro **«Cómo se aplican»** se entiende sin ayuda: para qué sirven, que el tipo de noche sigue decidiendo el plan, que «Primera noche» y «Última noche» son noches y las dos cuentan, qué pasa con un plan en blanco, quién gana entre una de cabaña y una de todas, y que las reservas hechas no cambian. Trae un ejemplo.

### Fechas siempre en dd/mm/aaaa (nuevo el 2026-10-05)

- [ ] **Todas las fechas se leen como `05/10/2026`**, nunca al estilo de EE. UU.: en `/reservar` (botón de fechas, desglose «mar 15/12/2026», resumen), en la ficha de una cabaña («Del 01/12/2026 al 08/01/2027 aplican tarifas de temporada…»), en la confirmación de pago, en «Última actualización» de las páginas legales, en el correo al huésped y al hotel, en el mensaje de WhatsApp y en el panel (listados, fichas, Resumen, calendario, bloqueos, tarifas diferenciales, usuarios). Solo los títulos de mes («octubre de 2026») llevan el nombre del mes. En **Bloqueos**, **Tarifas diferenciales** y la **fecha de actualización** de las páginas legales, la fecha se escribe a mano (`05/10/2026`, `5/10/2026` o `05102026`) o se toca en el calendario del icono, **también con el navegador en inglés**; una fecha imposible o fuera de rango no deja guardar y lo explica.

### Mi cuenta, páginas de error y precios (nuevo el 2026-10-05)

- [ ] **Cambiar mi contraseña**: entra con una cuenta de **equipo** (créala en Usuarios con una contraseña temporal). Arriba a la derecha aparece **«Mi cuenta»**, en el celular y en el computador. Ábrelo: dice el correo y el rol, y debajo está **«Cambiar mi contraseña»** (actual, nueva y repetida). Prueba tres veces: con la actual equivocada dice «La contraseña actual no es correcta»; con la repetida distinta, «La contraseña nueva y la repetida no son iguales»; bien escrita, «Listo: tu contraseña quedó cambiada» y **sigues dentro**. Sal y entra con la nueva. Borra la cuenta al terminar.
- [ ] **Página de error del panel**: abre `/admin/prueba-de-error` (falla a propósito). Debe salir **«No se pudo cargar esta pantalla»** en español, con el menú del panel a la vista, el botón **Reintentar**, «Ir al resumen» y los pasos «Si sigue sin cargar». Nada en inglés ni pantalla en blanco.
- [ ] **No encontrado dentro del panel**: abre `/admin/reservas/no-es-uuid` y `/admin/xyz`. Sale **«Eso no está en el panel»** con el menú y los botones «Ver las reservas» e «Ir al resumen», no la página 404 del sitio.
- [ ] **Precios sin centavos**: en una cabaña, escribe un precio como `552.000,50` y guarda: dice «Escribe el precio sin centavos…» y no cambia nada. `552.000` y `552000` sí guardan $552.000. Un precio de noche en `0` no deja guardar. Vuelve a dejar el precio como estaba.
- [ ] **Valor sugerido de la reserva manual**: «Nueva reserva», una cabaña, de **jueves a sábado**, plan **Entre Semana**. Debajo del valor dice «Como lo cobraría el sitio: 1 × $350.000 (Entre Semana) + 1 × $480.000 (Estándar)…»; el total es el mismo que da `/reservar` con esas fechas. Escribe otro valor a mano: aparece un **aviso ámbar** con el botón «Usar $…». No guardes la reserva.
- [ ] **Agenda del celular**: en Reservas → «Por día», un día en que un huésped sale y otro llega en la misma cabaña muestra **dos líneas**, «Sale por la mañana: …» y «Llega hoy: …», cada una con su nombre. El **día 1** de un mes dice quién sale esa mañana aunque haya llegado el mes anterior.

## 6 · Calendario de Google

Conectado desde el 2026-10-05 con los siete calendarios del hotel. El sitio **escribe** solo en
«Reservas Finca Villarreal - Sitio Web» y **lee** ese, el general «Reservas Finca Villarreal» y los
cinco de cabaña. Usa fechas de febrero de 2027 en adelante y borra los eventos de prueba en cuanto
termines: esos calendarios los usa el hotel y los leerá el bot.

- [x] En el panel, en Reservas, el recuadro del calendario dice **conectado** y, al desplegar el
      detalle, lista los siete calendarios respondiendo: uno «donde se apuntan las reservas» y seis
      que solo se consultan.

- [x] **Del panel a Google:** crea una reserva manual en el panel y ábrela luego
      en Google Calendar, en **«Reservas Finca Villarreal - Sitio Web»**. Tiene que
      aparecer el evento, con la cabaña y el nombre del huésped en el título, en
      los días correctos (el día de salida **no** se ocupa).
- [x] Cambia las fechas de esa reserva en el panel: el mismo evento se mueve en
      Google, no se crea otro.
- [x] Cancela la reserva en el panel: el evento **desaparece** de Google.
- [x] **De Google al sitio (calendario general):** crea a mano, en el calendario
      **«Reservas Finca Villarreal»**, un evento llamado «Cabaña 3 — prueba» para un
      fin de semana libre. En el panel, pulsa
      «Actualizar ahora» en el recuadro del calendario del hotel. Esas noches
      tienen que salir ocupadas **solo en la Cabaña 3**, y en el sitio público la
      Cabaña 3 deja de ofrecerse para esas fechas (las otras cuatro siguen
      libres).
- [x] **De Google al sitio (calendario de una cabaña):** crea en el calendario
      **«Cabaña 4»** un evento con cualquier título, por ejemplo «Prueba», en otro fin
      de semana libre. Tras «Actualizar ahora», esas noches salen ocupadas **solo en
      la Cabaña 4**: en los calendarios de cabaña no hace falta escribir la cabaña en
      el título.
- [x] **Un evento sin cabaña bloquea las cinco:** crea en el calendario general
      **«Reservas Finca Villarreal»** otro evento llamado «Reunión» (sin nombrar
      ninguna cabaña) en un día libre. Tras
      «Actualizar ahora», ese día tiene que salir ocupado en **las cinco**
      cabañas, en el panel y en el sitio. Es a propósito: ante la duda, no se
      vende.
- [x] Borra de Google los tres eventos de prueba y pulsa «Actualizar ahora»: las
      fechas vuelven a estar libres.
- [ ] **Un «plan día» no bloquea cabañas** (nuevo el 2026-10-05): un evento del calendario
      general que no nombra cabaña y dice «plan día», «plan de día», «día de calma» o
      «pasadía» (como «Cristian Arcila plan día», del 04/10/2026) **no ocupa ninguna
      cabaña** y **gasta 2 cupos del Día de Calma** ese día: en el panel sale en la fila
      del Día de Calma con borde punteado («2/10») y no en las cabañas; en el sitio las
      cinco cabañas siguen libres ese día y al Día de Calma le quedan 8 cupos. Si el
      evento nombra una cabaña («Cabaña 3 plan día») ocupa esa cabaña, y uno sin cabaña
      ni «plan día» («Reunión») sigue bloqueando las cinco.

## 7 · Limpieza (importante)

- [x] Borra **todas** las reservas de prueba desde el panel, incluidas las de día.
- [x] Borra los bloqueos de prueba.
- [x] Borra las tarifas diferenciales de prueba. **La «Temporada de fin de año» se queda.**
- [x] Borra del calendario de Google los eventos de prueba que creaste a mano, y comprueba que en «Reservas Finca Villarreal - Sitio Web» no quedó ningún evento de las reservas de prueba.
- [x] Deshaz los cambios de contenido, de precios de cabaña y de planes que hiciste para probar.
- [x] Borra las fotos de prueba que subiste.
- [x] Avísame para verificar que la base, el bucket de imágenes y el calendario quedaron limpios.

## Qué reportar

De cada fallo: **en qué página**, **qué hiciste**, **qué esperabas** y **qué pasó**, con captura. Si es del motor de reservas, añade las fechas y la cabaña: casi siempre el detalle está ahí.

---

## Cuando terminen las pruebas: el lanzamiento

El sitio ya está publicado e indexado. Lo que falta para el lanzamiento completo es **cobrar en línea** y entregarle el panel al equipo. En este orden:

1. Comprobar que Production sigue con `PAGOS_ACTIVOS=0` y **sin** `BOLD_MODO`: las llaves de pruebas se quedan solo en la vista previa.
2. En el panel de Bold, **habilitar las llaves de integración** (sin esto Bold no envía avisos automáticos) y copiar las dos llaves de **producción**.
3. Ponerlas en Production (`BOLD_IDENTITY_KEY`, `BOLD_PRIVATE_KEY`) y registrar en Bold el aviso automático en `https://lafincaecohotel.com/api/pagos/bold/webhook`.
4. Recién entonces poner `PAGOS_ACTIVOS=1` en Production, redesplegar y hacer **una compra real pequeña** con su reembolso: es la única prueba de que el dinero llega a la cuenta del hotel.
5. Crear las cuentas reales del equipo desde el panel y borrar `panel@lafincaecohotel.com`.
6. Volver a activar la protección de los despliegues de vista previa en Vercel.
7. Entregar el manual del panel (DOC-LF-2026-05, versión del 5 de octubre) y hacer la sesión con quien gestionará las reservas.
8. **Renovar el dominio antes del 4 de noviembre de 2026** (en Hostinger; la clave la tiene Amapola). Si vence, el hotel se queda sin web.
