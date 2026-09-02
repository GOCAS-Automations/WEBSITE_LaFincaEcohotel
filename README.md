# La Finca Eco Hotel — Sitio web y motor de reservas

Sitio web con motor de reservas para **La Finca Eco Hotel** (Km 18 vía Cali–Buenaventura, Valle del Cauca). Proyecto de GOCAS Automations.

- **Plan completo:** `PLAN_DESARROLLO_LaFinca.md`
- **Guía de trabajo:** `CLAUDE.md`
- **Bitácora:** `docs/MEMORIA.md`

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage) · Vercel.
Pagos con Wompi y correos con Resend en fases posteriores.

## Cómo arrancar

```bash
npm install
cp .env.example .env.local   # y completar los valores
npm run dev                  # http://localhost:3000
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run lint` | ESLint |
| `npm run db:aplicar` | Aplica migraciones y datos iniciales a Supabase |
| `npm run db:verificar` | Muestra el estado de la base de datos sin modificarla |

## Estructura

```
src/app/(publico)/     Rutas públicas del sitio
src/app/admin/         Panel administrativo
src/app/api/           Route handlers (disponibilidad, reservas, webhook de Wompi)
src/components/        Componentes de interfaz compartidos
src/lib/supabase/      Clientes de Supabase (navegador, servidor, administrador)
src/lib/utils/         Utilidades (formato de precios y fechas)
src/lib/tipos/         Tipos del modelo de datos
supabase/migrations/   Esquema SQL versionado
supabase/seed/         Datos iniciales
scripts/               Utilidades de mantenimiento
docs/                  Memoria y documentación interna
```

## Base de datos

Las migraciones son idempotentes: `npm run db:aplicar` se puede correr las veces que haga falta.
El script lee `SUPABASE_DB_URL` de `.env.local` y se conecta directamente a Postgres.

Reglas que no se negocian:

- **RLS activo en todas las tablas.** El público solo lee lo activo o publicado; reservas, pagos y bloqueos no son públicos.
- **Sin dobles reservas.** Lo garantiza la base de datos con constraints de exclusión GiST, no solo la aplicación.
- **Precios en enteros COP**, fechas de estadía como `date` en `America/Bogota`, rangos `[check_in, check_out)`.

## Credenciales

Nada de llaves en el repositorio. `.env.local` está en `.gitignore`; `.env.example` documenta las variables necesarias.
`SUPABASE_SERVICE_ROLE_KEY` solo se usa en el servidor (`src/lib/supabase/admin.ts`, protegido con `server-only`).
