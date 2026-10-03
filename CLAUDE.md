# La Finca Eco Hotel — Guía del proyecto

Sitio web + motor de reservas para La Finca Eco Hotel (Cali, Colombia). Cliente de GOCAS Automations.
**Plan completo:** `PLAN_DESARROLLO_LaFinca.md` (leerlo antes de tareas grandes). **Estado actual:** `docs/MEMORIA.md`.

## Flujo de trabajo (regla obligatoria)

- **Fable solo analiza y planea.** Toda ejecución (escribir código, correr migraciones, builds) se delega a agentes **Opus** (tareas complejas: arquitectura, motor de reservas, panel) o **Sonnet** (tareas medianas: páginas, componentes, scripts).
- **Dos velocidades, según el tamaño del cambio:**
  - **Cambio rápido** (texto, color, espaciado, una imagen, un enlace; ≤ 3 archivos, sin lógica nueva): lo hace Fable directamente o un agente **Sonnet**; verificación mínima (`tsc` + `build` + una captura de la zona tocada); un solo commit. Sin auditoría completa, sin Lighthouse. Cesar puede marcar el mensaje con «rápido».
  - **Ronda de diseño o funcionalidad** (varias secciones, motor de reservas, panel, modelo de datos): agente **Opus** con verificación completa (build, tests, capturas a 1440/390, panel con sesión, Lighthouse cuando toque rendimiento).
  - Varias tareas independientes se lanzan **en paralelo**; las que tocan los mismos archivos, en secuencia.
- Al terminar una sesión de trabajo relevante, actualizar `docs/MEMORIA.md` (qué se hizo, qué falta, decisiones tomadas).
- Outputs al usuario: sin ruido; respuestas + resumen de lo realizado al final.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres/Auth/Storage) + Vercel. Pagos: **Bold** (del Banco de Bogotá, donde el hotel ya tiene cuenta; Wompi quedó descartada). Correos: **Resend** con dominio verificado.

**Si el build falla con `Cannot read properties of undefined (reading 'call')`, no es el código:** es caché corrupta de `.next`, que OneDrive sincroniza. Borrar `.next` y volver a construir antes de sospechar del cambio.

## Reglas técnicas innegociables

1. Server Components por defecto; `"use client"` solo con interactividad real.
2. `SUPABASE_SERVICE_ROLE_KEY` jamás llega al navegador — solo en Route Handlers / servidor.
3. RLS activo en todas las tablas: lectura pública solo de lo publicado, escritura solo autenticada.
4. Precios en **enteros COP** (nunca float); formatear con `Intl.NumberFormat('es-CO')`.
5. Fechas de estadía como `date` en `America/Bogota`; rangos `[check_in, check_out)`.
6. **Todo texto visible en español claro** (UI, errores, correos). El cliente no es técnico.
7. Nada de credenciales en el repo; todo por variables de entorno.
8. Commits pequeños y descriptivos, **en español**.
9. RNT 114565 en el footer (obligación legal). Botón flotante de WhatsApp en todo el sitio.
10. Imágenes del sitio viven en Supabase Storage (bucket `imagenes`); desde el panel se puede subir archivo o pegar URL.
11. **Al reemplazar una imagen, borrar del bucket la que deja de usarse.** Nunca dejar huérfanos: tras cambiar referencias, listar lo no referenciado (dry-run primero, conservar `sitio/marca/`) y eliminarlo. Regla explícita de Cesar.

## Diseño

Moderno estilo iOS: mucho aire, radios 14–20px, sombras sutiles, jerarquía tipográfica clara, transiciones suaves, móvil primero. Identidad de La Finca: verdes/naturales, neblina, bosque, calidez. Un mensaje por pantalla; camino a reservar evidente.

## Estructura

- `src/app/(publico)/…` rutas públicas (ver §5 del plan) · `src/app/admin/…` panel · `src/app/api/…` route handlers
- `src/components/` UI compartida · `src/lib/` clientes supabase, utils, tipos
- `supabase/migrations/` SQL versionado · `supabase/seed/` datos iniciales · `scripts/` utilidades (ej. subir imágenes)
- `docs/` memoria y documentación interna

## Referencia funcional

El proyecto hermano La Maima (`C:\Users\cesar\OneDrive\Escritorio\FREELANCE\MAIMA\website`) tiene las mismas funcionalidades. Copiar **patrones y lógica**, jamás el diseño. Análisis en `docs/REFERENCIA_MAIMA.md`.

## Pendientes que bloquean (pedir a Cesar, no inventar)

Ver §12 del plan: tarifas confirmadas, políticas de reserva, fotos HQ, NIT, correo emisor, accesos (Hostinger, Wompi, Analytics). Lo no confirmado se marca `TODO` en código y en `docs/MEMORIA.md`.
