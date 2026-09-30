# Plan de cierre — La Finca Eco Hotel

> Escrito el **miércoles 30 de septiembre de 2026**. Objetivo: terminar el sitio esta semana.
> Documento de trabajo de GOCAS (el del cliente es `Checklist_Estado_Sitio_LaFinca.pdf`).

## Lectura honesta de la meta

**El sitio puede quedar técnicamente terminado esta semana.** Lo que **no** depende de nosotros es
el *lanzamiento con el dominio real*, porque exige tres entregas del cliente que nadie puede
acelerar desde el código: las **llaves de Bold**, la **razón social y el NIT**, y la **aprobación
de los textos legales**. Sin llaves de producción no se cobra; sin NIT los documentos legales no
identifican al responsable.

Por eso el plan separa dos cosas:

- **Terminar** (viernes 2 de octubre): todo el código escrito, probado y desplegado en la vista
  previa, con pagos funcionando en ambiente de pruebas y correos saliendo de verdad.
- **Lanzar** (cuando lleguen las tres entregas): cambiar llaves a producción, conectar el dominio
  y quitar el `noindex`. Es medio día de trabajo, no más.

## Estado actual

| Área | Estado |
|---|---|
| Sitio público (19 rutas), diseño e identidad | Listo |
| Panel de administración (contenido, cabañas, planes, experiencias, reservas, bloqueos, usuarios, legales) | Listo |
| Motor de reservas (fechas → cabaña → plan → experiencias por noche → anticipo) | Listo, cierra por WhatsApp |
| Día de Calma (cupo 10/día, 1–2 adultos) | Listo, cierra por WhatsApp |
| Base de datos, RLS y anti doble reserva | Listo y auditado |
| Google Calendar (lectura y escritura) | Construido; falta el ID del calendario del hotel |
| Seguridad | Auditada; 4 altos y 5 medios corregidos |
| Latido anti-pausa de Supabase | Listo |
| **Pagos** | **Pendiente** |
| Correos de confirmación | Escritos y probados; **dormidos** hasta que haya cuenta de Resend y correo del hotel |
| Reservas que expiran (holds de 30 min) | Listo y probado contra la base |
| Redirecciones 301 del sitio viejo | Listas y verificadas |
| **Dominio** | **Pendiente** (depende del DNS y de la decisión del cliente) |

## Ruta crítica

```
Llaves de prueba de Bold ──► Integración de pagos ──► Pruebas end-to-end ──┐
Correo del hotel + DNS ────► Correos con Resend ───────────────────────────┤
                                                                           ├──► LANZAMIENTO
Razón social y NIT ────────► Legales completos ────────────────────────────┤
Aprobación de legales ─────────────────────────────────────────────────────┘
```

## Paso a paso

### Hoy, miércoles 30 — lo que no depende de nadie

**Cesar (30 minutos en total):**
- [ ] `git push` (14 commits de la auditoría pendientes).
- [ ] **Pedir al cliente las tres entregas bloqueantes** (mensaje listo más abajo).
- [ ] **Vercel Pro** (20 USD/mes): habilita el rate limiting del firewall, quita el límite de
      optimización de imágenes y regulariza el uso comercial.
- [ ] **Supabase, 10 minutos de panel**: activar protección de contraseñas filtradas, subir el
      mínimo a 10 caracteres, valorar segundo factor para la cuenta propietaria.
- [ ] **Hostinger**: renovar el dominio (vence el 4 de noviembre) y desactivar la renovación
      automática del plan de hosting, sin darlo de baja.

**GOCAS (trabajo que ya se puede hacer sin esperar a nadie):**
- [x] **Correos con Resend** — hecho el 30/09. Tres plantillas (`src/lib/email/`): solicitud
      recibida y confirmación al huésped —con cómo llegar, horarios y qué llevar, y su variante
      del Día de Calma— y aviso a la administración con el enlace a la ficha del panel. Salen al
      crear y al **confirmar** desde el panel; `avisarPagoAprobado()` queda lista para el webhook.
      **Dormido** hasta que exista la clave: registra lo que habría enviado y nunca falla.
      `npm run correos:probar` los renderiza para revisarlos.
- [x] **Reservas que expiran** — hecho el 30/09. Migración 013 (`expira_at`, índice parcial y
      `liberar_reservas_vencidas`), `src/lib/reserva/holds.ts` con `MINUTOS_HOLD = 30` y
      `ocupaCalendario()` como única regla, barrido antes de toda escritura + cron + calendario del
      panel, y cuenta atrás a la vista en el panel. 16 comprobaciones contra la base real
      (`npm run db:probar-holds`), incluida la creación concurrente.
- [x] **Redirecciones 301** — hecho el 30/09. `/services` → `/experiencias`, `/about-us` →
      `/conocenos`, `/contact` → `/contacto`, y `/hello-world` y `/category/uncategorized` → `/`
      (las seis URLs que publica el `wp-sitemap` del sitio viejo). Verificadas con `curl -I` contra
      localhost; ninguna tapa una ruta existente.
- [ ] **Subdominio de preview** `nuevo.lafincaecohotel.com` apuntando a Vercel, para que el cliente
      revise en su propio dominio sin tocar el sitio actual. *(Necesita acceso al DNS de Hostinger.)*
- [ ] **Verificar el dominio en Resend** (registros TXT/SPF/DKIM en Hostinger): no afecta al sitio y
      permite que los correos salgan desde `reservas@lafincaecohotel.com`. *(Necesita la cuenta de
      Resend y el acceso a Hostinger; el código ya está listo y esperando la clave. Pasos en §2 de
      `docs/DESPLIEGUE_VERCEL.md`.)*

### Jueves 1 — pagos

- [ ] Integración de **Bold**: referencia única, **firma calculada en el servidor**, checkout,
      retorno del huésped y **webhook con verificación de firma e idempotencia**. La reserva se
      confirma **solo por el webhook**, nunca por la redirección del navegador.
- [ ] Persistir cada transacción en `pagos` con su respuesta cruda, para auditoría.
- [ ] Pruebas de extremo a extremo en sandbox: aprobado, rechazado, abandonado y evento duplicado.
- [ ] Anticipo: el huésped paga entre el 50 % y el 100 %; el saldo queda registrado como pendiente.
- [ ] Cumplir los diez requisitos de `docs/AUDITORIA_SEGURIDAD.md` para la pasarela.

### Viernes 2 — cierre técnico

- [ ] Prueba completa del recorrido real: reservar, pagar, recibir el correo, ver la reserva en el
      panel y el evento en el calendario.
- [ ] Repaso final de rendimiento y accesibilidad; revisión en móvil real.
- [ ] Crear las cuentas reales del panel y **borrar el usuario de pruebas**.
- [ ] Actualizar el checklist del cliente y avisar que está listo para revisión final.

### Día del lanzamiento (cuando lleguen las tres entregas)

1. [ ] Llaves de **producción** de Bold en Vercel; una compra real de prueba y su reembolso.
2. [ ] Razón social y NIT en el pie y en los legales; legales aprobados por Amapola.
3. [ ] Cargar las reservas futuras ya confirmadas (o conectar el calendario con su ID).
4. [ ] Bajar el TTL del DNS unas horas antes.
5. [ ] Apuntar `lafincaecohotel.com` a Vercel; verificar certificado y redirecciones.
6. [ ] `SITIO_PUBLICADO=1` para quitar el `noindex`; enviar el sitemap a Google.
7. [ ] Verificar que el sitio viejo ya no responde y que las redirecciones funcionan.
8. [ ] Capacitación del equipo y entrega de credenciales.

## Lo que hay que pedir hoy al cliente

**Bloqueante (sin esto no se lanza):**
1. **Llaves de Bold** del panel de su cuenta: primero las de **pruebas**, después las de
   producción. Confirmar que la cuenta está a nombre del hotel y con su cuenta bancaria.
2. **Razón social y NIT** (Raquel Lenis).
3. **Aprobación de los cuatro textos legales** (Amapola). Ya puede corregirlos ella misma desde el
   panel.
4. **Un correo del hotel** para las confirmaciones y como canal legal de datos personales; hoy
   `sitio.contacto.correo` está vacío y no debería ser solo un celular.

**Necesario pero no bloqueante:**
5. Decisiones del **Día de Calma**: si pide anticipo, política de cancelación, si incluye jacuzzi y
   hora límite de llegada.
6. **ID del calendario** de Google y compartirlo con `lafinca-calendario@project-bdfd1411-9189-442d-84d.iam.gserviceaccount.com`.
7. Confirmar cómo cobran las **estadías mixtas** (jueves→sábado).
8. **Fotos originales de cámara**, foto del fondue, video corto de COP16.
9. **Logo vectorial** e isotipo simplificado para el ícono (Santiago).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Las llaves de Bold no llegan esta semana | Se entrega todo lo demás terminado; los pagos se activan el día que lleguen (medio día de trabajo) |
| La cuenta de Bold no está verificada | Pedir hoy que confirmen el estado; la verificación puede tardar días |
| Los legales no se aprueban a tiempo | El sitio puede lanzarse con los borradores publicados y actualizarse después desde el panel, pero es decisión del cliente asumirlo |
| El dominio vence el 4 de noviembre | Renovarlo esta semana, no esperar |
