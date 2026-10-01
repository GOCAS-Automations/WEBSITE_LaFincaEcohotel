# Plan de cierre — La Finca Eco Hotel

> Actualizado el **jueves 1 de octubre de 2026**. Documento de trabajo de GOCAS. El del cliente es `Checklist_Estado_Sitio_LaFinca.pdf`; las preguntas abiertas van en `Preguntas_Finales_LaFinca.pdf`.

## Dónde estamos

Las tres entregas que bloqueaban el lanzamiento ya llegaron: **datos fiscales** (Raquel Lenis García · NIT 66830269-5), **textos legales aprobados** y **llaves de prueba de Bold**. La cuenta de Bold sigue en verificación de identidad, así que los pagos se construyen y prueban en ambiente de pruebas; el día que Bold apruebe, solo se cambian las llaves.

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
| Correos de confirmación (3 plantillas) | Escritos y probados, **dormidos** hasta tener Resend |
| Reservas que expiran a los 30 minutos | Listo |
| Redirecciones 301 del sitio viejo | Listas y verificadas |
| Datos fiscales, legales y correo de contacto | Aplicados |
| Google Calendar (lectura y escritura) | Construido; falta el ID del calendario del hotel |
| **Pagos con Bold** | **Listo en ambiente de pruebas** — falta la pasada visual por la pasarela con las tarjetas de prueba (5 min en el navegador) y cambiar las llaves el día que Bold apruebe la cuenta |
| **Activar los correos** | **Pendiente — falta cuenta Resend + DNS** |
| **Dominio** | **Pendiente** |

---

# Paso a paso para Cesar

## 1 · Crear la cuenta de Resend y verificar el dominio (20 minutos)

Resend es el servicio que envía los correos de confirmación. El **plan gratuito es suficiente**: 3.000 correos al mes y 100 al día, contra un máximo realista de unos 450 al mes con cinco cabañas.

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

1. hPanel → **Domains** → `lafincaecohotel.com` → **renovar** (vence el **4 de noviembre de 2026**; sin esto se cae todo, nuevo y viejo).
2. hPanel → **Billing** o **Subscriptions** → el plan de **hosting** → **desactivar la renovación automática**. No lo canceles: el sitio viejo debe seguir en línea hasta el lanzamiento.
3. Opcional y recomendable para que el cliente revise en su propio dominio: crea el subdominio `nuevo.lafincaecohotel.com` y apúntalo a Vercel. En **Vercel → el proyecto → Settings → Domains** añade `nuevo.lafincaecohotel.com` y Vercel te dirá qué registro CNAME poner en Hostinger.

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

### Lo único que falta de Bold antes de producción

- [ ] **Una pasada visual por la pasarela de pruebas** (5 minutos, en el navegador): abrir
      `/reservar`, completar una reserva, pulsar «Pagar», y pagar con la tarjeta de prueba
      `4111 1111 1111 1111` (aprobado) y con `4970 1100 0000 0062` (rechazado). Al terminar,
      usar el botón **«Probar el webhook»** del comprobante apuntando a la URL del webhook.
      No se puede automatizar: el formulario de la tarjeta vive en el dominio de Bold.
- [ ] Registrar el webhook en el panel de Bold (Integraciones → Webhooks) con la URL del
      despliegue: `https://<dominio>/api/pagos/bold/webhook`.

## Cuando llegue la clave de Resend

- Configurar las variables y enviar de verdad las tres plantillas; revisarlas en Gmail y en móvil.

## Cierre técnico (viernes)

- Recorrido completo real: reservar → pagar → recibir el correo → ver la reserva en el panel → ver el evento en el calendario.
- Repaso de rendimiento y accesibilidad; revisión en un móvil de verdad.
- Crear las cuentas reales del panel y borrar el usuario de pruebas.
- Avisar al cliente de que está listo para revisión final.

## Día del lanzamiento (cuando Bold apruebe la cuenta)

1. Llaves de **producción** de Bold en Vercel; una compra real pequeña y su reembolso.
2. Cargar las reservas futuras ya confirmadas, o conectar el calendario con su ID.
3. Bajar el TTL del DNS unas horas antes.
4. Apuntar `lafincaecohotel.com` a Vercel; verificar certificado y redirecciones.
5. `SITIO_PUBLICADO=1` para quitar el `noindex`; enviar el sitemap a Google.
6. Verificar que el sitio viejo ya no responde.
7. Capacitación del equipo y entrega de credenciales.

---

# Pendiente del cliente

Todo esto está en `Preguntas_Finales_LaFinca.pdf`. Lo que condiciona el motor de reservas: las decisiones del **Día de Calma** (anticipo, cancelación, jacuzzi, hora límite) y las **reglas de tarifas** (estadías mixtas, mínimo de noches, cabaña 02 entre semana, temporada alta). Lo que no frena el lanzamiento: ID del calendario de Google, fotos de cámara, foto del fondue, video de COP16, logo vectorial y licencia de Intro.

# Riesgos

| Riesgo | Mitigación |
|---|---|
| La verificación de Bold se demora | Todo queda probado en sandbox; pasar a producción son minutos. Si urge lanzar, el sitio puede salir cobrando por WhatsApp y activar pagos después |
| El dominio vence el 4 de noviembre | Renovarlo esta semana |
| Reaplicar los seeds borraría ediciones del panel | Nunca ejecutar `npm run db:aplicar` sin comparar antes la base con el seed |
| Google entrega solo 5 reseñas y algunas son viejas | El criterio relaja la ventana a 24 meses antes de quedarse corto |
