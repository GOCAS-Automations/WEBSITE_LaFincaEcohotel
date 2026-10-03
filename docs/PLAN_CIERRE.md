# Plan de cierre — La Finca Eco Hotel

> **Guía única de lo que falta para terminar y lanzar.** Documento interno de GOCAS, actualizado el **sábado 3 de octubre de 2026**.
> El historial de lo ya hecho vive en `docs/MEMORIA.md` y no se repite aquí. Los documentos del cliente son `Checklist_Estado_Sitio_LaFinca.pdf`, `Preguntas_Finales_LaFinca.pdf` y `Manual_Panel_LaFinca.pdf`.

## Estado en una línea

El sitio está **publicado, visible en Google y enviando correos de verdad** en `lafincaecohotel.com`; lo que falta para lanzar comercialmente son **tres cosas y dos rondas de pruebas**: conectar el calendario de Google, cargar las llaves de producción de Bold y encender `PAGOS_ACTIVOS`.

---

## 1 · Lo que bloquea ahora mismo

En orden de urgencia.

### 1.1 🔴 Las llaves de producción de Bold — depende del **hotel**

La pasarela es **Bold** (del Banco de Bogotá, donde el hotel ya tiene cuenta). Está integrada y probada contra el sandbox real. Falta que el hotel **habilite las llaves de integración en su panel de Bold** y nos envíe las **dos de producción** (identidad y secreta, del mismo ambiente).

**Qué desbloquea:** cobrar en línea. Es el único punto que impide poner `PAGOS_ACTIVOS=1`, y mientras siga en `0` el sitio cierra por WhatsApp con el mismo desglose, pero **nadie puede confirmar una reserva pagando**.

### 1.2 🔴 La primera ronda de pruebas de punta a punta — depende de **Cesar**

`docs/GUIA_PRUEBAS.md` existe y nunca se ha recorrido completa con un navegador y sesión del panel. Dos cosas siguen sin comprobarse nunca en un navegador real: el botón **«Verificar pago con Bold»** de la ficha del panel y la pasada visual por la pasarela con las tarjetas de prueba.

**Qué desbloquea:** encender los pagos reales con tranquilidad. No se lanza sin esto.

### 1.3 🟠 El calendario de Google sigue **sin conectar** — depende del **hotel**

El código está completo y probado, incluido el soporte para **varios calendarios, uno por cabaña** (listo para los cinco subcalendarios que el hotel va a crear para su bot de WhatsApp). Lo único que falta es que el hotel **comparta su calendario «la finca»** con la cuenta de servicio:

```
lafinca-calendario@project-bdfd1411-9189-442d-84d.iam.gserviceaccount.com
```

con permiso **«Hacer cambios en eventos»** (no basta «Ver todos los detalles»: sin escritura, las reservas del panel no se apuntan).

**Ya no hay que pedirles el identificador del calendario.** En cuanto compartan, aparece solo en el panel (Reservas → «Ver los calendarios de Google», visible al propietario) y con `npm run calendario:verificar`.

**Qué desbloquea:** la disponibilidad real. Mientras no esté, lo que el equipo apunta a mano en Google **no bloquea el sitio**, y una noche ya vendida por WhatsApp se puede volver a vender en línea.

### 1.4 🟠 Renovar el dominio antes del **4 de noviembre de 2026** — depende de **Cesar**, con el acceso del **hotel**

El hosting viejo está cancelado y el dominio es lo único que lleva a la gente al sitio: **si vence, el hotel se queda sin web.** El acceso a Hostinger sigue sin llegar (lo tiene Amapola).

**Qué desbloquea:** la continuidad del sitio. No bloquea el lanzamiento, pero tiene fecha dura.

### 1.5 🟡 Nombres y correos del equipo del hotel — depende del **hotel**

Hoy en el panel solo existen la cuenta del hotel (`fincavillarreal@gmail.com`, propietario) y la temporal de pruebas (`panel@lafincaecohotel.com`, equipo).

**Qué desbloquea:** la entrega formal y el borrado del usuario de pruebas.

---

## 2 · Paso a paso de Cesar

| # | Qué | Cuánto |
|---|---|---|
| 1 | Pedirle al hotel las tres cosas de arriba (llaves de Bold, compartir el calendario, nombres y correos del equipo) en un solo mensaje | 10 min |
| 2 | Recorrer la **ronda 1** de `docs/GUIA_PRUEBAS.md` | 2–3 h |
| 3 | Renovar el dominio en Hostinger | 10 min |
| 4 | Pasar la cuenta de Vercel a **Pro** y activar el firewall | 10 min |
| 5 | Endurecer Supabase Auth | 10 min |
| 6 | Tope de gasto de Google Places | 5 min |
| 7 | **Día del lanzamiento:** la secuencia de Bold de la §5 | 1 h |
| 8 | Entrega al cliente (§6) | media tarde |

### Detalle de los que no son obvios

**2 · Ronda 1 de pruebas.** Ver §4. Lo importante: no dejar el sitio real con una pasarela que no cobra más tiempo del necesario.

**3 · Renovar el dominio.** hPanel → **Domains** → `lafincaecohotel.com` → renovar. Vence el **4 de noviembre de 2026**. Hace falta el acceso de Hostinger: si Amapola no lo manda, pedirle que renueve ella y lo confirme por captura. **Los DNS siguen administrándose ahí** (están los TXT de Resend), así que ese acceso también hace falta para el correo corporativo; los nameservers nunca se movieron.

**4 · Vercel Pro (20 USD/mes).** Habilita el rate limiting del firewall que pide la auditoría (P-1), libera el límite de optimización de imágenes y regulariza el uso comercial: el plan gratuito prohíbe alojar sitios de clientes.
1. `vercel.com` → equipo de GOCAS → **Settings → Billing → Upgrade to Pro**.
2. Proyecto `website-la-finca-ecohotel` → **Settings → Firewall** → **Rate Limiting**: 100 peticiones por minuto por IP sobre `/api/*`, y una regla sobre `/admin/login`.
3. **Settings → Spend Management**: tope mensual (p. ej. 40 USD) con aviso por correo.

**5 · Supabase Auth** (auditoría P-6; no se puede desde el código):
1. **Authentication → Policies / Providers → Email**: activar **Leaked password protection**.
2. Subir **Minimum password length** a **10** (es la que ya exige el panel).
3. Revisar los **Rate limits** del endpoint `/token`.
4. **Authentication → Multi-Factor**: habilitar MFA y activarlo para `fincavillarreal@gmail.com`.

**6 · Tope de Google Places.** Con el caché propio el consumo es de unas 30 llamadas al mes contra 1.000 gratuitas: es solo una red de seguridad. `console.cloud.google.com` → **Google Maps Platform → Quotas** → desplegable **Places API (New)** → cuota por día **20** (o 2 por minuto si solo existe la de minuto).

---

## 3 · Paso a paso de GOCAS

Lo que hago yo en cuanto cada cosa se desbloquee.

| Cuando llegue… | Lo que hago |
|---|---|
| El calendario compartido | `npm run calendario:verificar` para leer el identificador que aparezca · cargar `GOOGLE_CALENDAR_CREDENCIALES` (JSON en base64, una línea) y `GOOGLE_CALENDAR_ID` en **Vercel Production** · redesplegar · comprobar que el panel dice «Calendario del hotel: conectado» · recorrer la §6 de la guía de pruebas |
| Los cinco subcalendarios por cabaña | Ampliar `GOOGLE_CALENDAR_ID` a la lista con `=n` (`general@…, cab1@…=1, …`) y dejar `GOOGLE_CALENDAR_ESCRIBIR_EN` apuntando al general, para no duplicar eventos |
| Las llaves de producción de Bold | Cargarlas en **Production** y borrar `BOLD_MODO` de Production · registrar el webhook · encender `PAGOS_ACTIVOS=1` · redesplegar (ver §5, el orden importa) |
| Los hallazgos de la ronda 1 | Corregirlos y volver a correr lo que toque |
| Los nombres y correos del equipo | Crear las cuentas desde `/admin/usuarios` con rol **equipo** y borrar `panel@lafincaecohotel.com` |
| El visto bueno de lanzamiento | Enviar `https://lafincaecohotel.com/sitemap.xml` a Google Search Console |

**Lo que tengo pendiente sin depender de nadie**

- [ ] **Hacer push de los cuatro commits locales de `main`** (el soporte de varios calendarios, el panel que los lista, el script `calendario:verificar` y la memoria). Hoy solo existen en el equipo de Cesar.
- [ ] Reescribir la §2 de `docs/DESPLIEGUE_VERCEL.md`: todavía marca las cuatro variables de Resend como «🔴 PENDIENTE EN VERCEL» y ya están puestas.
- [ ] Decidir con el hotel la **política de retención** de datos y escribir la tarea que la aplique (auditoría P-2: solicitudes no concretadas a los 6 meses, datos de reserva a los 5 años). Antes hay que confirmar los plazos contables con su contadora.
- [ ] `includeSubDomains` en HSTS cuando se confirme que todos los subdominios van por HTTPS, correo incluido (auditoría P-4). Hacerlo antes puede dejar al hotel sin correo.
- [ ] Subir el DMARC del dominio de `p=NONE` a `p=quarantine` cuando lleve unas semanas enviando. No bloquea nada.

---

## 4 · Las dos rondas de pruebas

El guion completo está en **`docs/GUIA_PRUEBAS.md`** (siete secciones, con las tarjetas de prueba, las variables que hay que poner antes y la limpieza final). No se duplica aquí: solo cuándo se corre cada ronda y qué cambia.

**Ronda 1 — con Bold en modo de pruebas, antes de encender nada.** Las siete secciones. La §6 (calendario de Google) se salta mientras el panel diga «sin configurar». Al terminar, `PAGOS_ACTIVOS` vuelve a `0` y se borra todo lo creado (§7 de la guía: escribe en la base real).

> ⚠ **Dónde correrla.** Las llaves de pruebas de Bold ya existen en la **preview de la rama `pruebas-pagos`**: correr la ronda ahí evita dejar el sitio real con una pasarela que no cobra. Si se hace sobre Production —como dice hoy la guía—, que sea una ventana corta y vigilada: con llaves de prueba y `PAGOS_ACTIVOS=1`, un huésped real que entre a `/reservar` esa tarde puede «pagar» en el sandbox. El webhook tiene una guarda para ese caso; **la reconciliación no la tiene**, así que la ventana corta no es un formalismo.

**Ronda 2 — con Bold en producción, el día del lanzamiento.** No se repite todo: solo la **§3 (pagos)** con una compra real pequeña y su reembolso, la **§4 (correos)** sobre esa compra, la **§6** si el calendario ya está conectado, y la **§7 (limpieza)**.

---

## 5 · Día del lanzamiento — la secuencia de Bold

**El orden importa.** Cada paso presupone el anterior.

1. **Llaves de producción en Vercel Production**: `BOLD_IDENTITY_KEY` y `BOLD_PRIVATE_KEY`, **las dos del mismo ambiente** (mezclarlas da error en la pasarela). Las de pruebas se quedan solo en la preview de `pruebas-pagos`.
2. **Borrar `BOLD_MODO` de Production** (o dejarla vacía). Si se queda en `pruebas`, el webhook registra el evento y **no confirma nada**, a propósito.
3. **Registrar el webhook en el panel de Bold** (Integraciones → Webhooks) y confirmar que las llaves de integración están habilitadas:

   ```
   https://lafincaecohotel.com/api/pagos/bold/webhook
   ```

   No es opcional aunque la confirmación no dependa de él: confirma en segundos en vez de esperar a que el huésped vuelva o a que corra el cron.
4. **`PAGOS_ACTIVOS=1`** — el último interruptor, **en el mismo movimiento** que las llaves de producción y nunca antes.
5. **Redesplegar.** El valor se hornea en el build: editarlo sin redesplegar no cambia nada. Esto aplica a los cuatro pasos anteriores.
6. **Una compra real pequeña**, con tarjeta propia: comprobar que la reserva queda **confirmada** con su código, que llegan los dos correos, y que en el panel aparece con el monto pagado y el saldo pendiente.
7. **Reembolsarla desde el panel de Bold** y **borrar la reserva de prueba** del panel del sitio.
8. **Enviar el sitemap** a Google Search Console.
9. **Cargar las reservas futuras ya confirmadas** que el hotel tenga apuntadas, o conectar el calendario para que entren solas.

---

## 6 · Entrega al cliente

- [ ] **Cuentas reales del equipo** en `/admin/usuarios`, rol **equipo**, una por persona. Las crea el propietario; no existe «restablecer contraseña por correo».
- [ ] **Borrar el usuario de pruebas** `panel@lafincaecohotel.com`. Es una cuenta de desarrollo y no debe quedar activa en producción (auditoría, §5 de `DESPLIEGUE_VERCEL.md`). Se borra desde el panel, no hace falta entrar a Supabase.
- [ ] **Reactivar la protección de las vistas previas** en Vercel (Settings → Deployment Protection), si se desactivó para que el cliente o las pruebas entraran a la preview de `pruebas-pagos`. Una preview abierta es el sitio entero con otra URL, y las de `pruebas-pagos` llevan llaves de Bold.
- [ ] **Entregar el manual del panel**: `EcoHotel - La Finca\Manual_Panel_LaFinca.pdf` (**DOC-LF-2026-05**, 19 hojas). Cubre el panel completo; no lleva contraseñas, que van en el DOC-LF-2026-03.
- [ ] **Capacitación del equipo** sobre el manual, con dos puntos que conviene decir en voz alta: que un evento de Google **cuyo título no identifique la cabaña bloquea las cinco** (es a propósito: ante la duda, no se vende), y que el saldo se cobra **por link de pago antes de la llegada** — en la finca no hay datáfono ni se maneja efectivo.
- [ ] **Explicarle a Amapola qué es el panel**: el administrador del sitio, donde se cambian textos, fotos, precios y reservas.
- [ ] **Entregar credenciales** y dejar constancia de quién tiene qué.
- [ ] Actualizar el `Checklist_Estado_Sitio_LaFinca.pdf` con el estado final.

---

## 7 · Pendiente del cliente

Todo esto está en `Preguntas_Finales_LaFinca.pdf` y en la §9 de `docs/DATOS_CLIENTE.md`.

**Bloquea** (lo de la §1, más estas dos):

| Qué | Quién | Por qué bloquea |
|---|---|---|
| Llaves de producción de Bold, habilitadas en su panel | Amapola | Sin ellas no se cobra en línea |
| Compartir el calendario «la finca» con la cuenta de servicio | el equipo del hotel | Sin ello la disponibilidad real no entra al sitio |
| Nombres y correos de quienes usarán el panel | Juan Camilo | Sin ellos no hay entrega ni se borra el usuario de pruebas |
| Acceso a Hostinger (o que renueven ellos el dominio) | Amapola | El dominio vence el 4 de noviembre |
| **Mínimo de noches en fines de semana y festivos** | Amapola | Hoy el motor permite una sola noche siempre; si hay mínimo, lo está vendiendo mal |

**No bloquea:**

- Política de cancelación del **Día de Calma**, y si se le puede añadir jacuzzi. (El anticipo del 50 % ya lo aplica el sitio y lo dice en pantalla; falta solo que lo ratifiquen.)
- **Revisión jurídica** de los cuatro textos legales. El cliente los aprobó el 2026-09-30 y se revisaron contra la Ley 1581 de 2012, pero no por un abogado (auditoría P-7).
- Redacción exacta de la regla de **solo adultos** para FAQ y términos.
- **Logo vectorial** (Santiago) y **licencia de la tipografía Intro** (Santiago). Mientras tanto van el de `public/marca/` y una tipografía equivalente.
- **Fotos de cámara** de cada cabaña identificadas por número, foto del fondue, video de la finca.
- Acceso a **Google Business Profile** y a **Google Analytics**.
- **Correo corporativo** del hotel. Hoy las confirmaciones salen de `reservas@lafincaecohotel.com`, que solo envía y no tiene buzón; lo que contesta el huésped va al Gmail del hotel por `Reply-To`.

---

## 8 · Riesgos

| Riesgo | Mitigación |
|---|---|
| **El dominio vence el 4 de noviembre** | Renovarlo esta semana. Ahora tumba el sitio de verdad, no el viejo |
| **El calendario de Google no se conecta y se vende dos veces la misma noche** | Mientras el panel diga «sin configurar», el equipo tiene que registrar en el panel **toda** reserva de WhatsApp. Está en el manual |
| La verificación de Bold o las llaves se demoran | El sitio ya está en línea y cierra por WhatsApp con el mismo desglose, con `PAGOS_ACTIVOS=0`. Encenderlo son minutos y no toca código |
| Un huésped real paga en la pasarela de pruebas | Imposible con `PAGOS_ACTIVOS=0`. El riesgo aparece **solo durante la ronda 1 si se corre sobre Production** — ver el aviso de la §4 |
| Un huésped paga y su reserva no se confirma | Pasó en pruebas (cero webhooks de Bold). Hoy hay **tres** vías independientes —webhook, página de retorno y cron diario— y el barrido no puede cancelar una reserva con pago aprobado. El único caso que todavía pide una persona es «pago aprobado y fechas ya vendidas a otro»: sale en `pagos_requieren_atencion` y con un mensaje claro en el panel |
| Las pruebas escriben en la base real | Fechas a tres meses o más y la limpieza de la §7 de la guía, sin saltársela |
| Reaplicar los seeds borraría ediciones del panel | Nunca ejecutar `npm run db:aplicar` sin comparar antes la base con el seed |
| Cambiar `GOOGLE_CALENDAR_ESCRIBIR_EN` con reservas ya apuntadas | Deja eventos huérfanos: `reservas.referencia_externa` guarda el id del evento, no su calendario. Es una decisión de puesta en marcha, no de operación |
| Los cuatro commits de `main` solo existen en un equipo | Hacer push |

---

## 9 · Ya resuelto — no volver aquí

El detalle de cada uno está en `docs/MEMORIA.md`.

| Asunto | |
|---|---|
| Sitio público (19 rutas), diseño e identidad | Listo |
| Panel de administración completo, legales editables, usuarios con roles | Listo |
| Motor de reservas: fechas → cabaña → plan → experiencias por noche → anticipo 50–100 % | Listo |
| Día de Calma: se reserva y se paga por el sitio, cupo 10/día, 1–2 adultos | Listo |
| Por el sitio público no se reserva para hoy; el panel sí puede | Listo |
| Base de datos, RLS y anti doble reserva | Auditado |
| Seguridad: cookies, cabeceras, fuerza bruta, permisos, consentimiento Ley 1581 | Auditada y corregida |
| Latido anti-pausa de Supabase y cron diario | Listo |
| Reseñas de Google con caché propio (~30 llamadas/mes) | Listo |
| Los tres correos salen de verdad, con las cuatro variables en Vercel | Listo |
| Confirmación de pago sin depender del webhook (reconciliación con Bold en tres puntos) | Listo y probado contra el sandbox real |
| Reservas que expiran a los 30 minutos sin cancelar nunca un pago aprobado | Listo |
| `lafincaecohotel.com` en Vercel, `www` → apex, hosting viejo cancelado, 301 del sitio viejo | Hecho el 2026-10-01 |
| Indexación: `SITIO_PUBLICADO=1`, `robots.txt` dice `Allow: /` | Hecho el 2026-10-01 |
| `NEXT_PUBLIC_SITE_URL` con el dominio real (estaba en `localhost` en Vercel) | Corregido |
| Error BTN-001 de Bold (las URLs de retorno tienen que ser `https://`) | Corregido |
| Datos fiscales (Raquel Lenis García · NIT 66830269-5), legales aprobados y correo de contacto | Aplicados |
| Código del calendario de Google, incluidos varios calendarios por cabaña y los scripts de verificación | Listo — falta solo que lo compartan (§1.3) |
| Manual del panel DOC-LF-2026-05 y los documentos del cliente corregidos de Wompi a Bold | Entregables al día |
