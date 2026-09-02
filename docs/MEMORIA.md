# Memoria del proyecto — La Finca Eco Hotel

> Bitácora viva. Cada sesión de trabajo relevante se registra aquí: qué se hizo, decisiones y pendientes.
> Fechas en formato AAAA-MM-DD.

## Estado general

- **Fase actual:** 0–2 (scaffold, base de datos, sitio público + panel administrativo).
- **Decisión de alcance:** primero todo el sitio + panel administrativo; motor de reservas y pagos (Wompi) después.
- **Repo remoto:** https://github.com/GOCAS-Automations/WEBSITE_LaFincaEcohotel.git (push pendiente de confirmación de Cesar; luego se conecta a Vercel).

## Decisiones tomadas

| Fecha | Decisión |
|---|---|
| 2026-09-02 | Diseño moderno estilo iOS, full responsive, identidad verde/natural de La Finca. |
| 2026-09-02 | Imágenes base en bucket `imagenes` de Supabase Storage; el panel permitirá subir archivo o URL. |
| 2026-09-02 | Logo provisional: se extrae del Instagram `@lafinca_cali` mientras el cliente envía el oficial. |
| 2026-09-02 | Flujo de trabajo: Fable planea, agentes Opus/Sonnet ejecutan. |

## Registro de sesiones

### 2026-09-02 — Arranque del proyecto
- Leído y adoptado `PLAN_DESARROLLO_LaFinca.md`.
- Creados `CLAUDE.md`, `docs/MEMORIA.md`; `.env.local` organizado (Supabase listo; Wompi y Resend como placeholders).
- Análisis del proyecto de referencia La Maima → `docs/REFERENCIA_MAIMA.md`.
- (continúa en esta sesión: scaffold, migraciones, sitio público, panel)

## Pendientes de contenido/credenciales (pedir según se necesiten)

- [ ] Logo oficial y manual de marca (provisional: Instagram).
- [ ] Fotos y videos en alta calidad (Drive del cliente).
- [ ] Tarifas confirmadas por cabaña × plan.
- [ ] Reglas de reserva: mín. noches, cancelación, check-in/out, mascotas, niños.
- [ ] Razón social y NIT.
- [ ] Correo emisor de confirmaciones + cuenta Resend.
- [ ] Usuarios del panel (nombres y correos).
- [ ] Accesos: Hostinger (dominio), Google Business, Analytics.
- [ ] Cuenta Wompi (documentos, llaves sandbox/producción).
- [ ] Decisión: pago total vs anticipo.
