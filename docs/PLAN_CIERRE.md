# Plan de cierre — La Finca Eco Hotel

> Actualizado el **miércoles 30 de septiembre de 2026, noche**. Objetivo: terminar el sitio esta semana.
> El documento del cliente es `Checklist_Estado_Sitio_LaFinca.pdf`.

## Dónde estamos

De las tres entregas que bloqueaban el lanzamiento, **ya llegaron dos**: los datos fiscales
(Raquel Lenis García · NIT 66830269-5) y la aprobación de los textos legales, con revisión
jurídica posterior pendiente. También llegó el correo de contacto del hotel.

**Queda una sola dependencia externa: las llaves de Bold.** Cesar ya tiene acceso a la cuenta;
falta que Bold termine la verificación de identidad. Las llaves de **pruebas** suelen estar
disponibles antes de esa verificación: si aparecen mañana, la integración se hace completa y el
día de la aprobación solo se cambian por las de producción.

## Estado del sitio

| Área | Estado |
|---|---|
| Sitio público (19 rutas), diseño e identidad | Listo |
| Panel de administración (contenido, cabañas, planes, experiencias, reservas, bloqueos, usuarios, legales) | Listo |
| Motor de reservas (fechas → cabaña → plan → experiencias por noche → anticipo 50–100 %) | Listo, cierra por WhatsApp |
| Día de Calma (cupo 10/día, 1–2 adultos) | Listo, cierra por WhatsApp |
| Base de datos, RLS y anti doble reserva | Listo y auditado |
| Seguridad (cookies, cabeceras, fuerza bruta, permisos, consentimiento Ley 1581) | Auditada y corregida |
| Latido anti-pausa de Supabase | Listo |
| Reseñas de Google guardadas en la base, 1 llamada/día (~30 al mes de 1.000 gratis) | Listo |
| Google Calendar (lectura y escritura) | Construido; falta el ID del calendario del hotel |
| Correos de confirmación (3 plantillas) | **Escritos y probados, dormidos** hasta tener Resend |
| Reservas que expiran a los 30 minutos | Listo |
| Redirecciones 301 del sitio viejo | Listas y verificadas |
| Datos fiscales, legales y correo de contacto | Aplicados en sitio, legales y datos estructurados |
| **Pagos con Bold** | **Pendiente — esperando llaves** |
| **Activar los correos** | **Pendiente — falta cuenta Resend + DNS** |
| **Dominio** | **Pendiente** |

Repositorio sincronizado con GitHub; la vista previa en Vercel está al día.

## Lo que falta

### Jueves 1 de octubre

**Cesar — por la mañana:**
- [ ] Confirmar si en el panel de Bold ya están las **llaves de pruebas**; pasarlas.
- [ ] Crear la cuenta de **Resend**, añadir el dominio y pegar en Hostinger los registros TXT/DKIM
      que entregue. No afecta al sitio ni al correo actual.
- [ ] **Vercel Pro** (20 USD/mes): habilita el rate limiting del firewall que pide la auditoría,
      libera el límite de optimización de imágenes y regulariza el uso comercial.
- [ ] **Supabase, 10 minutos**: protección de contraseñas filtradas, mínimo de 10 caracteres y
      segundo factor para la cuenta propietaria.
- [ ] **Hostinger**: renovar el dominio (vence el 4 de noviembre) y desactivar la renovación
      automática del plan de hosting, sin darlo de baja.
- [ ] Tope de cuota de Places (ver §Google Cloud más abajo). **Ya no urge**: desde el 2026-10-01 el
      sitio hace ~30 llamadas al mes contra 1.000 gratis, y el número no depende de la consola.

**GOCAS — con las llaves de Bold:**
- [ ] Integración de **Bold**: referencia única, **firma en el servidor**, checkout, retorno del
      huésped y **webhook con verificación de firma e idempotencia**. La reserva se confirma
      **solo por el webhook**, nunca por la redirección del navegador.
- [ ] Crear la reserva como `pendiente` con vencimiento de 30 minutos al iniciar el pago (la
      infraestructura ya existe) y liberarla si no se paga.
- [ ] Guardar cada transacción en `pagos` con su respuesta cruda.
- [ ] Anticipo entre 50 % y 100 %; el saldo queda registrado como pendiente de cobro en la finca.
- [ ] Cumplir los diez requisitos de seguridad de `docs/AUDITORIA_SEGURIDAD.md`.
- [ ] Pruebas en sandbox: aprobado, rechazado, abandonado y evento duplicado.

**GOCAS — con la cuenta de Resend:**
- [ ] `RESEND_API_KEY`, `EMAIL_FROM=reservas@lafincaecohotel.com`,
      `EMAIL_NOTIFY_TO=fincavillarrealcali@gmail.com`, con responder-a al mismo Gmail.
- [ ] Envío real de las tres plantillas y revisión en Gmail y en móvil.

### Viernes 2 de octubre — cierre técnico

- [ ] Recorrido completo real: reservar → pagar → recibir el correo → ver la reserva en el panel →
      ver el evento en el calendario.
- [ ] Repaso de rendimiento y accesibilidad; revisión en un móvil de verdad.
- [ ] Crear las cuentas reales del panel y **borrar el usuario de pruebas**.
- [ ] Actualizar el checklist del cliente y avisar que está listo para revisión final.

### Día del lanzamiento (cuando Bold apruebe la cuenta)

1. [ ] Llaves de **producción** de Bold en Vercel; una compra real pequeña y su reembolso.
2. [ ] Cargar las reservas futuras ya confirmadas, o conectar el calendario con su ID.
3. [ ] Bajar el TTL del DNS unas horas antes.
4. [ ] Apuntar `lafincaecohotel.com` a Vercel; verificar certificado y redirecciones.
5. [ ] `SITIO_PUBLICADO=1` para quitar el `noindex`; enviar el sitemap a Google.
6. [ ] Verificar que el sitio viejo ya no responde.
7. [ ] Capacitación del equipo y entrega de credenciales.

## Pendiente del cliente (no bloquea el lanzamiento)

- Decisiones del **Día de Calma**: si pide anticipo, política de cancelación, si incluye jacuzzi y
  hora límite de llegada.
- **ID del calendario** de Google y compartirlo con
  `lafinca-calendario@project-bdfd1411-9189-442d-84d.iam.gserviceaccount.com`.
- Confirmar cómo cobran las **estadías mixtas** (jueves→sábado).
- **Fotos originales de cámara**, foto del fondue, video corto de COP16.
- **Logo vectorial** e isotipo simplificado para el ícono (Santiago).
- **Revisión jurídica** de los cuatro textos legales (ya aprobados para publicar).

## Google Cloud: tope de gasto de Places

La ruta no está en «APIs & Services», sino en el panel propio de Maps:

1. `console.cloud.google.com` → barra de búsqueda → **Google Maps Platform**.
2. Menú de la izquierda → **Quotas**.
3. Desplegable superior **«All Google Maps APIs»** → elegir **Places API (New)**.
4. Localizar la fila de cuota por día y editarla (icono de lápiz) → **20** → *Submit request*.
5. Si la API solo expone cuota **por minuto**, poner **2 por minuto**: acota los picos, aunque no
   fija el techo mensual.

**Hecho el 2026-10-01 (ya no depende de la consola).** Las reseñas se guardan en la base
(`cache_externo`, migración 014) y se refrescan **una sola vez al día** desde el cron de
`/api/salud`. El sitio lee de la base y **no llama a Google durante una visita**: el número de
llamadas es exactamente **~30 al mes contra 1.000 gratis** (3 % de la cuota), y es determinista —
antes dependía de cuántas instancias y regiones levantara Vercel con el `revalidate` de Next.

El tope de cuota de la consola sigue siendo buena idea como segundo cinturón, pero ya no es lo
único que separa al hotel de una factura sorpresa. Si se pone, **20 al día** deja holgura de sobra
para el refresco diario más alguna prueba a mano.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Bold no entrega llaves de prueba hasta aprobar la cuenta | Se entrega todo lo demás terminado; la integración son unas horas el día que lleguen |
| La verificación de Bold se demora | El sitio puede lanzarse cobrando por WhatsApp como hoy y activar los pagos después, si el cliente lo acepta |
| El dominio vence el 4 de noviembre | Renovarlo esta semana |
| Reaplicar los seeds borraría ediciones del panel | Nunca ejecutar `npm run db:aplicar` sin comparar antes la base con el seed |
