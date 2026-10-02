# Plan de cierre — La Finca Eco Hotel

> Actualizado el **viernes 2 de octubre de 2026**. Documento de trabajo de GOCAS. El del cliente es `Checklist_Estado_Sitio_LaFinca.pdf`; las preguntas abiertas van en `Preguntas_Finales_LaFinca.pdf`.

## Dónde estamos

**El sitio nuevo ES el sitio en producción.** `lafincaecohotel.com` apunta a Vercel y el hosting viejo quedó cancelado. Eso cambia tres cosas de golpe y las tres están resueltas o identificadas aquí abajo: las direcciones absolutas tienen que ser las del dominio real (lo estaban mal: el sitio publicado se declaraba canónico en `localhost`), el cobro en línea necesita un interruptor propio para que nadie pague en una pasarela de pruebas, y **el `noindex` dejó de ser una precaución para convertirse en el problema**: el hotel no aparece en Google.

Las tres entregas que bloqueaban el lanzamiento ya llegaron: **datos fiscales** (Raquel Lenis García · NIT 66830269-5), **textos legales aprobados** y **llaves de prueba de Bold**. La cuenta de Bold sigue en verificación de identidad, así que los pagos se construyen y prueban en ambiente de pruebas; el día que Bold apruebe, solo se cambian las llaves.

## ✅ Resuelto: el hotel ya es visible en Google

`SITIO_PUBLICADO` no está en `1`, así que el sitio se publica con
`<meta name="robots" content="noindex, nofollow">` y un `robots.txt` que dice
`Disallow: /`. Esa variable existía para proteger al WordPress viejo mientras era
la web real; **ese sitio ya no existe**, y el nuevo se está prohibiendo a sí
mismo.

**Basta con esto** (no hay nada que tocar en el código, está todo preparado):

1. Vercel → `website-la-finca-ecohotel` → **Settings → Environment Variables** →
   `SITIO_PUBLICADO = 1` en **Production**.
2. **Redesplegar** (el valor se hornea en el build: editarlo sin redesplegar no
   cambia nada).
3. Comprobar que `/robots.txt` ya no dice `Disallow: /` y enviar
   `https://lafincaecohotel.com/sitemap.xml` a Google Search Console.

**Hecho el 1 de octubre por la noche.** Comprobado el 2 de octubre:
`https://lafincaecohotel.com/robots.txt` responde `Allow: /`. De este punto solo
queda **enviar el sitemap a Google Search Console**, que acelera el primer rastreo
pero no lo condiciona.

## 🔴 Lo más urgente ahora: los correos no salen del sitio publicado

Los tres correos **ya funcionan** —se enviaron de verdad a
`fincavillarrealcali@gmail.com` el 2 de octubre y llegaron a la bandeja de
entrada— pero solo desde el equipo de desarrollo: las variables están en
`.env.local` y **no en Vercel**. Mientras siga así, el sitio publicado confirma una
reserva y **se calla**: el huésped no recibe su código ni el hotel el aviso.

Son cuatro variables en Vercel → `website-la-finca-ecohotel` → **Settings →
Environment Variables** (Production y Preview), y **redesplegar**:

    RESEND_API_KEY   = (la que ya está en .env.local, empieza por re_)
    EMAIL_FROM       = La Finca Eco Hotel <reservas@lafincaecohotel.com>
    EMAIL_NOTIFY_TO  = fincavillarrealcali@gmail.com
    EMAIL_REPLY_TO   = fincavillarrealcali@gmail.com

La última no es un adorno: `reservas@lafincaecohotel.com` solo sirve para
**enviar**, no tiene buzón. Sin `Reply-To`, lo que conteste un huésped no llega a
nadie y él cree que avisó.

## Estado del sitio

| Área | Estado |
|---|---|
| Sitio público (19 rutas), diseño e identidad | Listo |
| Panel de administración (contenido, cabañas, planes, experiencias, reservas, bloqueos, usuarios, legales) | Listo |
| Motor de reservas (fechas → cabaña → plan → experiencias por noche → anticipo 50–100 %) | Listo |
| Día de Calma (cupo 10/día, 1–2 adultos) | Listo |
| Base de datos, RLS y anti doble reserva | Listo y auditado |
| Seguridad (cookies, cabeceras, fuerza bruta, permisos, consentimiento Ley 1581) | Auditada y corregida |
| Latido anti-pausa de Supabase | Listo |
| Reseñas de Google con caché propio (30 llamadas/mes) | Listo |
| Correos de confirmación (3 plantillas) | **Enviando de verdad** — probados contra Gmail el 2026-10-02 (bandeja de entrada, DKIM/SPF/DMARC en verde). 🔴 Faltan las cuatro variables en Vercel |
| **Confirmación sin depender del webhook** (reconciliación con la API de Bold) | **Lista y probada contra el sandbox real** — página de retorno, cron diario y botón del panel |
| Reservas que expiran a los 30 minutos | Listo |
| Redirecciones 301 del sitio viejo | Listas y verificadas |
| Datos fiscales, legales y correo de contacto | Aplicados |
| Google Calendar (lectura y escritura) | Construido; falta el ID del calendario del hotel |
| **Pagos con Bold** | **Checkout abriendo en pruebas** — el error BTN-001 está corregido (ver abajo). Falta pagar con las tarjetas de prueba (5 min en el navegador), registrar el webhook en el panel de Bold y cambiar las llaves el día que Bold apruebe la cuenta |
| Interruptor de pagos (`PAGOS_ACTIVOS`) | Listo — **apagado**, como debe estar hasta el lanzamiento |
| **Activar los correos** | **Hecho en local; falta copiar `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_NOTIFY_TO` y `EMAIL_REPLY_TO` a Vercel** |
| **Dominio** | **Listo** — `lafincaecohotel.com` apunta a Vercel, `www` redirige al apex, hosting viejo cancelado |
| **Indexación en Google** | **Resuelta** — `SITIO_PUBLICADO=1` está puesta y `https://lafincaecohotel.com/robots.txt` ya dice `Allow: /` (comprobado el 2026-10-02). Queda enviar el sitemap a Search Console |

---

# Paso a paso para Cesar

## 1 · ~~Crear la cuenta de Resend y verificar el dominio~~ — HECHO

Resend es el servicio que envía los correos de confirmación. El **plan gratuito es suficiente**: 3.000 correos al mes y 100 al día, contra un máximo realista de unos 450 al mes con cinco cabañas.

> ✅ **Hecho el 2 de octubre.** La cuenta existe, `lafincaecohotel.com` está
> verificado y los seis correos de prueba (tres plantillas + tres variantes de Día
> de Calma) llegaron a `fincavillarrealcali@gmail.com` **a la bandeja de entrada**,
> con `dkim=pass`, `spf=pass` y `dmarc=pass`. Lo único que queda es el bloque rojo
> de arriba: copiar las cuatro variables a Vercel.
>
> Detalle menor para dentro de unas semanas: el DMARC del dominio está en
> `p=NONE`. Entrega bien; subirlo a `p=quarantine` cuando lleve tiempo enviando
> protege la marca contra suplantación. No bloquea nada.
>
> Los pasos de abajo se dejan como registro de lo que se hizo.

1. Entra a `resend.com` → **Sign up** con tu correo de GOCAS (la cuenta la administramos nosotros; el hotel no la necesita).
2. En el menú lateral, **Domains** → **Add Domain** → escribe `lafincaecohotel.com` → **Add**.
3. Resend muestra una tabla con **tres registros DNS** (uno TXT de SPF, uno TXT de DKIM y uno de DMARC). Deja esa pestaña abierta.
4. En otra pestaña entra a **hPanel de Hostinger** → **Domains** → `lafincaecohotel.com` → **DNS / Nameservers**.
5. Por cada registro de Resend pulsa **Add Record** y copia exactamente: el **Type** (TXT), el **Name** (lo que diga Resend, por ejemplo `resend._domainkey`; si Hostinger pide el nombre sin el dominio, quita `.lafincaecohotel.com` del final), el **Value** completo, y TTL por defecto. Guarda cada uno.
6. Vuelve a Resend y pulsa **Verify DNS Records**. Suele tardar entre 5 y 30 minutos. Si falla, espera y reintenta: no hay que rehacer nada.
7. Cuando el dominio aparezca como **Verified**, ve a **API Keys** → **Create API Key** → nombre `la-finca-produccion`, permiso **Sending access** → copia la clave (empieza por `re_`; solo se muestra una vez).
8. Pásame la clave y yo configuro las tres variables (`RESEND_API_KEY`, `EMAIL_FROM=reservas@lafincaecohotel.com`, `EMAIL_NOTIFY_TO=fincavillarrealcali@gmail.com`) en local y en Vercel.

**Importante:** no se puede enviar desde `@gmail.com` — por eso el remitente es `reservas@lafincaecohotel.com`, con responder-a apuntando al Gmail del hotel. Añadir estos registros **no afecta** al sitio actual ni a ningún correo existente.

## 2 · Pasar la cuenta de Vercel a Pro (5 minutos)

Esto habilita el rate limiting del firewall que pide la auditoría, libera el límite de optimización de imágenes y regulariza el uso comercial (el plan gratuito prohíbe alojar sitios de clientes).

1. `vercel.com` → selector de equipo arriba a la izquierda → el equipo de GOCAS → **Settings** → **Billing**.
2. **Upgrade to Pro** → 20 USD al mes (incluye un asiento y 20 USD de crédito de uso).
3. Dentro del proyecto `website-la-finca-ecohotel` → **Settings** → **Firewall** → activa **Rate Limiting** y crea una regla básica: 100 peticiones por minuto por IP sobre `/api/*`.
4. En **Settings** → **Spend Management**, fija un tope mensual (por ejemplo 40 USD) con aviso por correo, para que nunca haya una sorpresa.

## 3 · Endurecer Supabase (10 minutos)

1. `supabase.com` → proyecto de La Finca → **Authentication** → **Policies** (o **Providers → Email**).
2. Activa **Leaked password protection** (rechaza contraseñas filtradas en brechas conocidas).
3. Sube **Minimum password length** a **10**.
4. En **Authentication → Multi-Factor**, habilita MFA y actívalo para la cuenta `fincavillarreal@gmail.com`.

## 4 · Hostinger: dominio y hosting (10 minutos)

1. hPanel → **Domains** → `lafincaecohotel.com` → **renovar** (vence el **4 de noviembre de 2026**). ⚠ Ahora es crítico: el hosting viejo está cancelado y el dominio es lo único que lleva a la gente al sitio. Si vence, el hotel se queda sin web.
2. ~~Desactivar la renovación automática del hosting~~ — hecho: el plan está cancelado y el WordPress ya no responde.
3. ~~Subdominio `nuevo.lafincaecohotel.com`~~ — ya no hace falta: el cliente revisa en su propio dominio, que es el sitio nuevo.

## 5 · Tope de gasto de Google Places (5 minutos, ya no urgente)

Con el caché propio el consumo es de unas 30 llamadas al mes contra 1.000 gratuitas, así que esto es solo una red de seguridad.

1. `console.cloud.google.com` → buscador superior → **Google Maps Platform** → menú izquierdo **Quotas**.
2. Desplegable **«All Google Maps APIs»** → **Places API (New)**.
3. Edita la cuota por día y pon **20**. Si solo aparece cuota por minuto, pon **2 per minute**.

---

# Trabajo de GOCAS

## Hecho hoy

- [x] Integración de **Bold** en ambiente de pruebas: referencia única, **firma de
      integridad calculada en el servidor**, checkout abierto con la librería oficial,
      **webhook con firma verificada e idempotente en dos capas**, reserva confirmada
      **solo por webhook**, y página de retorno que **consulta el estado real por API**
      en vez de creerle a la URL. Migración `015_pagos_bold.sql` aplicada.
- [x] Pruebas de los cuatro escenarios contra `localhost`: **aprobado**, **rechazado**,
      **abandonado** (la reserva vence sola y libera la fecha) y **evento duplicado**
      (no duplica ni reenvía correos). Más: firma inválida rechazada con 401, anulación,
      evento de rechazo tardío sobre un pago ya aprobado, doble reserva, honeypot y
      freno de peticiones. Detalle en `docs/MEMORIA.md`.
- [x] El saldo pendiente queda registrado y se refleja en el panel y en el correo.
- Reseñas: las **5 mejores del último año**.

## Hecho el 1 de octubre (tarde)

- [x] **BTN-001 resuelto.** La pasarela devolvía «Something went wrong… BTN-001» y la
      causa no eran las llaves ni el monto: **Bold solo acepta URLs de retorno con
      `https://`**, y en local el sitio le mandaba `http://localhost:3000/…`. El detalle
      estaba en la consola del navegador, literal: *«'http://localhost:3000/reservar/confirmacion?ref=…'
      is not a valid value for the 'data-redirection-url' attribute»*. Ahora las URLs de
      retorno se construyen siempre en https (`origenParaBold()`), el servidor **falla con
      un mensaje legible** si alguna no lo es, y hay pruebas que lo vigilan. Comprobado en
      el navegador: el checkout de Bold abre con el resumen correcto («Test mode ·
      La Finca Eco Hotel · 2 noches · $350.000 COP»).
- [x] **Las llaves de Bold son las dos de pruebas**, del mismo ambiente (ver abajo).
- [x] **Dominio real aplicado**: `NEXT_PUBLIC_SITE_URL` corregida en Vercel y en local.
- [x] **Interruptor `PAGOS_ACTIVOS`**, apagado por defecto.

### Lo único que falta de Bold antes de producción

- [ ] **Una pasada visual por la pasarela de pruebas** (5 minutos, en el navegador): abrir
      `/reservar` **en local** (`npm run dev`, con `PAGOS_ACTIVOS=1`, que es como queda el
      `.env.local`), completar una reserva, pulsar «Pagar», y pagar con la tarjeta de prueba
      `4111 1111 1111 1111` (aprobado) y con `4970 1100 0000 0062` (rechazado). Al terminar,
      usar el botón **«Probar el webhook»** del comprobante apuntando a la URL del webhook.
      No se puede automatizar: el formulario de la tarjeta vive en el dominio de Bold.
      Al terminar el pago el navegador vuelve a **`lafincaecohotel.com`**, no a localhost:
      Bold exige https en el retorno y la base de datos es la misma, así que el comprobante
      se ve igual. Las reservas de prueba hay que borrarlas del panel después.
- [ ] **Registrar el webhook en el panel de Bold** (Integraciones → Webhooks →
      «Configurar webhook»), ahora que la URL ya es definitiva:

          https://lafincaecohotel.com/api/pagos/bold/webhook

## Hecho el 2 de octubre

### 🔴 El hallazgo del día: **llegaron cero webhooks de Bold**

Los pagos del sandbox se hicieron de verdad y a `/api/pagos/bold/webhook` **no
llegó ni un evento**: la tabla `pagos_eventos` estaba vacía. El botón «Probar el
webhook» del panel de Bold solo guarda la URL y no dispara nada, y en pruebas Bold
tampoco los manda solos. Consecuencia real: `LF-2026-0001` **se canceló sola** al
vencer su hold de 30 minutos **con el pago hecho**.

Eso en producción es **un huésped que paga y se queda sin reserva**, y no se entera
hasta que llega a la finca. No era un problema de pruebas: es el peor fallo posible
de un motor de reservas.

### La solución: el webhook deja de ser la única vía

- [x] **Reconciliación con la API de Bold.** Le preguntamos nosotros por la
      referencia (`GET payments.api.bold.co/v2/payment-voucher/<ref>` con la llave
      de identidad) y aplicamos lo que responda. Enganchada en **tres** puntos: **la
      página de retorno** (al volver de pagar, antes de pintar), **el cron diario**
      (los pagos sin resolver de las últimas 24 h, **antes** de liberar las
      vencidas) y **un botón «Verificar pago con Bold» en la ficha del panel**, para
      cuando un huésped llame diciendo «yo pagué».
- [x] **El webhook y la reconciliación comparten la escritura** (un solo módulo),
      así que no pueden divergir. Idempotentes: reconciliar dos veces, o reconciliar
      algo que el webhook ya confirmó, no escribe nada y no reenvía ningún correo.
- [x] **Una reserva con un pago aprobado no se cancela nunca por vencimiento**
      (migración 016), y si alguna llegó a cancelarse, la reconciliación la
      **resucita** dejando constancia en sus notas.
- [x] **Probado contra el sandbox real**: Bold devolvió `APPROVED` para las dos
      reservas de prueba (transacciones `T_8YO0FOXI6J` y `T_N689TJBUXK`, tarjeta de
      crédito) y las dos quedaron confirmadas con sus correos enviados, **sin un solo
      webhook**. Una de ellas estaba a dos minutos de que el hold la cancelara.
- [x] 16 pruebas nuevas (288 en total): aprobado, rechazado, anulado, en proceso, sin
      respuesta, idempotencia, correos no duplicados, resurrección, fechas ya
      vendidas y la carrera webhook ↔ reconciliación.

### Correos

- [x] **Los tres correos salen de verdad.** Variables puestas en local, dominio
      verificado en Resend, enviados a `fincavillarrealcali@gmail.com`: bandeja de
      entrada, `dkim=pass`, `spf=pass`, `dmarc=pass`, remitente «La Finca Eco
      Hotel», logo del bucket cargando.
- [x] **`EMAIL_REPLY_TO` nueva**: lo que conteste el huésped va al Gmail del hotel.
      `reservas@lafincaecohotel.com` solo sirve para enviar, no tiene buzón.
- [ ] 🔴 **Copiar las cuatro variables de correo a Vercel y redesplegar** (ver el
      bloque rojo del principio). Es lo único que falta para que el sitio publicado
      envíe.

### Lo que queda sin comprobar

- [ ] El botón del panel no se pulsó en un navegador con sesión (no se tenía la
      contraseña del panel). Llama a la misma función que la página de retorno y el
      cron, las dos probadas de punta a punta contra el sandbox real.
- [ ] **Registrar el webhook en el panel de Bold** sigue pendiente, y ahora se sabe
      que **no basta**: aunque se registre, en pruebas no llegan eventos. Con la
      reconciliación, dejarlo sin registrar ya no cuesta una reserva; pero en
      producción hay que registrarlo igual, porque confirma en segundos en vez de
      esperar a que el huésped vuelva o a que corra el cron.

## Cierre técnico (viernes)

- Recorrido completo real: reservar → pagar → recibir el correo → ver la reserva en el panel → ver el evento en el calendario.
- Repaso de rendimiento y accesibilidad; revisión en un móvil de verdad.
- Crear las cuentas reales del panel y borrar el usuario de pruebas.
- Avisar al cliente de que está listo para revisión final.

## Día del lanzamiento (cuando Bold apruebe la cuenta)

1. Llaves de **producción** de Bold en Vercel (las dos, del **mismo** ambiente) y borrar
   `BOLD_MODO` de Production.
2. **`PAGOS_ACTIVOS=1`** — el último interruptor, y va **en el mismo movimiento** que las
   llaves de producción, nunca antes. Redesplegar.
3. Una compra real pequeña y su reembolso.
4. Cargar las reservas futuras ya confirmadas, o conectar el calendario con su ID.
5. Capacitación del equipo y entrega de credenciales.

~~Bajar el TTL del DNS, apuntar el dominio a Vercel y verificar que el sitio viejo ya no
responde~~ — hecho el 2026-10-01. `SITIO_PUBLICADO=1` ya no es parte del lanzamiento: es
urgente **hoy** (ver el primer apartado).

---

# Pendiente del cliente

Todo esto está en `Preguntas_Finales_LaFinca.pdf`. Lo que condiciona el motor de reservas: las decisiones del **Día de Calma** (anticipo, cancelación, jacuzzi, hora límite) y las **reglas de tarifas** (estadías mixtas, mínimo de noches, cabaña 02 entre semana, temporada alta). Lo que no frena el lanzamiento: ID del calendario de Google, fotos de cámara, foto del fondue, video de COP16, logo vectorial y licencia de Intro.

# Riesgos

| Riesgo | Mitigación |
|---|---|
| La verificación de Bold se demora | Todo queda probado en sandbox; pasar a producción son minutos. **Es justo lo que está pasando y por eso el sitio sale con `PAGOS_ACTIVOS=0`:** cierra por WhatsApp, con el mismo desglose, y los pagos se encienden después sin tocar código |
| Un huésped real paga en la pasarela de pruebas | Imposible con `PAGOS_ACTIVOS=0`: el botón no se pinta y el endpoint responde 503. Y si un evento del sandbox llegara al webhook en producción, no confirma nada y lo deja en el log |
| ~~El sitio sigue con `noindex`~~ | Resuelto el 1 de octubre: `robots.txt` ya dice `Allow: /` |
| **Un huésped paga y su reserva no se confirma** | Era real y ya pasó en pruebas (cero webhooks). Ahora hay **tres** vías independientes de confirmación —webhook, página de retorno y cron diario— y el barrido no puede cancelar una reserva con pago aprobado. El único caso que todavía pide una persona es «pago aprobado y fechas ya vendidas a otro»: sale en `pagos_requieren_atencion` del cron y con un mensaje claro en el panel |
| **El sitio publicado no envía correos** | Las cuatro variables de Resend están en local y faltan en Vercel. Es el primer punto de este documento |
| El dominio vence el 4 de noviembre | Renovarlo esta semana. **Ahora tumba el sitio de verdad**, no solo el viejo |
| Reaplicar los seeds borraría ediciones del panel | Nunca ejecutar `npm run db:aplicar` sin comparar antes la base con el seed |
| Google entrega solo 5 reseñas y algunas son viejas | El criterio relaja la ventana a 24 meses antes de quedarse corto |
