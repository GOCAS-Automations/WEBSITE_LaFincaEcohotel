# La Finca Eco Hotel — Plan de desarrollo del sitio web y motor de reservas

> **Documento de contexto y plan para Claude Code.**
> Guárdalo como `CLAUDE.md` en la raíz del repositorio para que se cargue como contexto permanente del proyecto.
>
> Proyecto: GOCAS Automations · Cliente: La Finca Eco Hotel (Cali, Colombia)
> Fecha: 28 de agosto de 2026 · Plazo: 15 días hábiles desde el anticipo
> Referencias comerciales: `PRO-LF-2026-03` (propuesta) y `COT-LF-2026-02` (cotización)

---

## 1. Qué estamos construyendo

Reemplazar el sitio actual de La Finca Eco Hotel (WordPress en Hostinger) por un sitio propio, moderno y autogestionable, con **motor de reservas y pagos en línea** — el equivalente a "su propio Booking", sin comisiones de OTA.

El proyecto tiene cinco entregables, todos vendidos y aprobados:

| # | Entregable | Contenido |
|---|---|---|
| 1 | Migración e infraestructura | Todo el contenido y el dominio pasan a Vercel + Supabase, sin que el sitio actual deje de estar en línea |
| 2 | Rediseño del sitio | Presentación moderna que conserva la esencia actual; página propia por alojamiento |
| 3 | Motor de reservas con pagos | Flujo tipo Airbnb/Booking + calendario central + pago con Wompi |
| 4 | Panel administrativo integral | 5 módulos: contenido, alojamientos, experiencias, adicionales, reservas |
| 5 | SEO completo y medición | SEO técnico y de contenido, datos estructurados, Google Business, Analytics + Search Console |

**Regla de oro del proyecto:** el equipo de La Finca no es técnico. Todo lo que vean —panel, correos, mensajes de error— debe estar en español claro, sin jerga.

---

## 2. El negocio, en concreto

Datos extraídos del sitio actual (`lafincaecohotel.com`). **Deben confirmarse con el cliente antes de darlos por definitivos**, pero sirven para modelar el sistema desde ya.

- **Qué es:** ecohotel de montaña, 45 minutos de Cali. Km 18 vía Cali–Buenaventura, Vereda Loma Alta, Valle del Cauca.
- **RNT:** 114565 (debe aparecer en el pie del sitio — es obligación legal para alojamientos en Colombia).
- **Alojamientos:** 5 cabañas (Cabaña 01 a 05), capacidad 2 personas cada una, cama doble, baño privado, vista a la montaña. Algunas con jacuzzi privado.
- **Zona húmeda:** jacuzzi y turco.
- **Instalaciones:** piscina, decks, senderos, restaurante (8:00–23:00), salón multifuncional hasta 30 personas, WiFi, parqueadero externo vigilado 24/7.
- **Experiencias actuales:** "Aniversario con Amor" y "Cumpleaños con Amor", $150.000 cada una.
- **Redes:** Instagram `@lafinca_cali`, Facebook `lafinca_cali`, TikTok `@lafincacali`. WhatsApp actual: `wa.link/99zgt4`.
- **Tono de marca:** naturaleza, neblina, aves, desconexión. Frases del sitio actual: *"Sumérgete en un bosque rodeado de neblina y aves"*, *"Paraíso escondido en el Valle del Cauca"*.

### 2.1 El modelo de tarifas — ojo con esto

La Finca **no cobra por cabaña, cobra por plan**. Hoy publican tres:

| Plan | Precio/noche | Incluye |
|---|---|---|
| Entre Semana | $350.000 | Jacuzzi 45 min, turco 45 min, bebida de bienvenida, desayuno |
| Estándar | $450.000 | Jacuzzi ilimitado, turco, estación de café, desayuno |
| Premium | $650.000 | Alimentación a la carta, vino, 2 sodas, servicios completos |

**Consecuencia de diseño:** el motor de reservas es `alojamiento × plan × fecha`, no un simple precio por noche. El huésped elige fechas → cabaña disponible → **plan** → extras → paga. El modelo de datos debe soportar esto desde el inicio (ver §4).

---

## 3. Stack y decisiones técnicas

- **Framework:** Next.js (App Router) + TypeScript.
- **Estilos:** Tailwind CSS.
- **Base de datos y auth:** Supabase (cuenta propia de La Finca — ya tenemos acceso). Postgres + Auth + Storage para las imágenes.
- **Hosting:** Vercel (cuenta de GOCAS). Plan de pago necesario por uso comercial.
- **Pagos:** Wompi (Bancolombia). Cuenta a nombre de La Finca — **el dinero nunca pasa por GOCAS**.
- **Correos transaccionales:** Resend (o el proveedor que se decida); plantillas propias en español.

### Reglas técnicas

1. **Server Components por defecto.** `"use client"` solo donde haya interactividad real (calendario, carrito de reserva, formularios del panel).
2. **Nunca exponer la `service_role` key de Supabase al cliente.** El navegador usa la clave pública (anon) con RLS; las operaciones privilegiadas van en Route Handlers del servidor.
3. **Row Level Security activo en todas las tablas** desde el primer día. Lectura pública solo de lo publicado; escritura solo autenticada.
4. **Precios en enteros (pesos colombianos), nunca en float.** Formatear con `Intl.NumberFormat('es-CO')`.
5. **Fechas en zona horaria de Colombia (`America/Bogota`).** Guardar `date` (no `timestamp`) para noches de estadía, para evitar corrimientos de día.
6. **Todo el texto de cara al usuario en español**, incluidos los mensajes de error.

---

## 4. Modelo de datos (Supabase)

Esquema propuesto. Ajústalo si algo no encaja, pero **conserva la lógica de disponibilidad y la prevención de doble reserva**.

```sql
-- Extensión necesaria para el constraint anti-solapamiento
create extension if not exists btree_gist;

-- ALOJAMIENTOS (las cabañas)
create table alojamientos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,                    -- "Cabaña 01"
  slug text unique not null,               -- "cabana-01"
  descripcion text,
  capacidad int not null default 2,
  amenidades text[],                       -- ['Jacuzzi privado','Vista a la montaña']
  orden int default 0,
  activo boolean default true,             -- pausar sin borrar
  created_at timestamptz default now()
);

-- PLANES TARIFARIOS (Entre Semana / Estándar / Premium)
create table planes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  incluye text[],                          -- lista de lo que incluye el plan
  orden int default 0,
  activo boolean default true
);

-- TARIFAS: precio por alojamiento + plan, con vigencia opcional (temporadas)
create table tarifas (
  id uuid primary key default gen_random_uuid(),
  alojamiento_id uuid references alojamientos(id) on delete cascade,
  plan_id uuid references planes(id) on delete cascade,
  precio_noche int not null,               -- COP, entero
  vigencia daterange,                      -- null = tarifa base todo el año
  dias_semana int[],                       -- opcional: [1,2,3,4] para tarifas entre semana
  created_at timestamptz default now()
);

-- EXPERIENCIAS y ADICIONALES (se venden junto a la reserva)
create table extras (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('experiencia','adicional')),
  nombre text not null,                    -- "Aniversario con Amor"
  descripcion text,
  precio int not null,                     -- 150000
  imagen_url text,
  activo boolean default true,
  orden int default 0
);

-- RESERVAS
create table reservas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,             -- "LF-2026-0042", legible para el huésped
  alojamiento_id uuid references alojamientos(id),
  plan_id uuid references planes(id),
  estancia daterange not null,             -- [check_in, check_out)
  huesped_nombre text not null,
  huesped_email text not null,
  huesped_telefono text not null,
  huesped_documento text,
  num_personas int default 2,
  notas text,
  subtotal_alojamiento int not null,
  subtotal_extras int default 0,
  total int not null,
  monto_pagado int default 0,              -- soporta pago parcial (anticipo)
  estado text not null default 'pendiente'
    check (estado in ('pendiente','confirmada','cancelada','completada')),
  origen text not null default 'web'
    check (origen in ('web','whatsapp','telefono','manual')),
  created_at timestamptz default now()
);

-- Extras de cada reserva
create table reserva_extras (
  reserva_id uuid references reservas(id) on delete cascade,
  extra_id uuid references extras(id),
  cantidad int default 1,
  precio_unitario int not null,            -- congelado al momento de reservar
  primary key (reserva_id, extra_id)
);

-- BLOQUEOS: mantenimiento, eventos privados, uso de los dueños
create table bloqueos (
  id uuid primary key default gen_random_uuid(),
  alojamiento_id uuid references alojamientos(id) on delete cascade,
  rango daterange not null,
  motivo text,
  created_at timestamptz default now()
);

-- PAGOS (transacciones de Wompi)
create table pagos (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid references reservas(id) on delete cascade,
  referencia text unique not null,         -- la que enviamos a Wompi
  transaccion_id text,                     -- id que devuelve Wompi
  monto int not null,
  estado text not null,                    -- PENDING / APPROVED / DECLINED / VOIDED / ERROR
  metodo text,                             -- CARD / PSE / NEQUI
  payload jsonb,                           -- respuesta cruda del webhook
  created_at timestamptz default now()
);

-- CONTENIDO DEL SITIO (CMS ligero para el módulo 1 del panel)
create table contenido (
  clave text primary key,                  -- 'home.hero.titulo'
  valor jsonb not null,
  actualizado_at timestamptz default now()
);

-- GALERÍA
create table imagenes (
  id uuid primary key default gen_random_uuid(),
  alojamiento_id uuid references alojamientos(id) on delete cascade,
  url text not null,
  alt text,                                -- obligatorio por accesibilidad y SEO
  orden int default 0
);
```

### 4.1 La regla más importante: nada de dobles reservas

Esto **no** se resuelve solo con validación en la aplicación. Va en la base de datos:

```sql
-- Una cabaña no puede tener dos reservas activas que se solapen
alter table reservas add constraint reservas_sin_solapamiento
  exclude using gist (
    alojamiento_id with =,
    estancia with &&
  ) where (estado in ('pendiente','confirmada'));

-- Tampoco puede solaparse con un bloqueo (verificar en la lógica de disponibilidad)
alter table bloqueos add constraint bloqueos_sin_solapamiento
  exclude using gist (alojamiento_id with =, rango with &&);
```

Con `daterange` en formato `[check_in, check_out)` (inclusivo-exclusivo), la salida de un huésped y la entrada de otro **el mismo día** no se consideran solapamiento — que es justo el comportamiento hotelero correcto.

**Reservas pendientes:** una reserva `pendiente` bloquea el calendario mientras el huésped paga. Implementar una expiración (por ejemplo 30 minutos) que libere las pendientes no pagadas, con un cron de Vercel o una función programada de Supabase.

---

## 5. Sitio público — estructura de rutas

```
/                          Home: hero, cabañas destacadas, experiencias, buscador de fechas
/alojamientos              Listado de las 5 cabañas
/alojamientos/[slug]       Detalle: galería, amenidades, planes y tarifas, botón reservar
/experiencias              Experiencias y adicionales
/el-lugar                  Sobre nosotros, instalaciones, cómo llegar
/galeria                   Galería general
/reservar                  Motor de reservas (flujo de 4 pasos)
/reservar/confirmacion     Resultado del pago
/faq                       Preguntas frecuentes
/contacto                  Contacto + mapa + WhatsApp
/legal/privacidad          Política de privacidad
/legal/terminos            Términos y condiciones
/legal/datos               Tratamiento de datos (Ley 1581 de 2012)
/legal/cancelacion         Política de cancelación y reembolsos
```

**El botón de WhatsApp se mantiene en todo el sitio** (flotante). El motor de reservas es un canal adicional, no un reemplazo — esto se le prometió al cliente explícitamente.

---

## 6. Motor de reservas — el corazón del proyecto

### Flujo del huésped

```
1. Elige fechas      → calendario con disponibilidad real
2. Elige alojamiento → cabañas libres en esas fechas, con fotos y desde-precio
3. Elige plan        → Entre Semana / Estándar / Premium, con lo que incluye cada uno
4. Suma extras       → experiencias y adicionales (opcional)
5. Datos y pago      → formulario + Wompi (tarjetas, PSE, Nequi)
6. Confirmación      → pantalla + correo automático; aviso a la administración
```

### Cómo calcular disponibilidad

Dado un rango `[entrada, salida)`, una cabaña está disponible si **no existe** ninguna reserva en estado `pendiente` o `confirmada` cuyo `estancia` se solape, **ni** ningún `bloqueo` que se solape. Implementar como función SQL o vista para no repetir la lógica en varios puntos.

### Detalles que el cliente espera

- **Un solo calendario central:** las reservas que entran por WhatsApp se registran manualmente desde el panel (`origen = 'whatsapp'`) y bloquean el calendario igual que las de la web.
- **Notificación inmediata** a la administración por cada reserva nueva (correo y/o WhatsApp).
- **Correo de confirmación** al huésped con código de reserva, fechas, cabaña, plan, extras, total y cómo llegar.
- **Pago total o anticipo:** el campo `monto_pagado` ya lo soporta. El porcentaje debe ser configurable desde el panel; **pendiente de que el cliente decida** (dejar 100% como valor inicial).

---

## 7. Integración con Wompi

> **Antes de implementar, consulta la documentación oficial vigente en `docs.wompi.co`.** Lo que sigue es el patrón general; los nombres exactos de campos y endpoints deben verificarse ahí.

Flujo recomendado (Web Checkout / Widget):

1. El servidor crea la reserva en estado `pendiente` y genera una **referencia única** (guardarla en `pagos.referencia`).
2. Se calcula la **firma de integridad** (SHA-256 sobre referencia + monto + moneda + secreto de integridad). **Siempre en el servidor** — el secreto jamás llega al navegador.
3. Se redirige al checkout de Wompi con el monto en **centavos** y la moneda `COP`.
4. Wompi devuelve al huésped a `/reservar/confirmacion`.
5. **La confirmación real llega por webhook**, no por la redirección. Implementar `POST /api/wompi/webhook`:
   - **Verificar la firma del evento** antes de confiar en él (esto no es opcional: sin verificación, cualquiera podría marcar reservas como pagadas).
   - Si el estado es `APPROVED` → `reservas.estado = 'confirmada'`, actualizar `monto_pagado`, disparar correos.
   - Si es `DECLINED`/`VOIDED`/`ERROR` → dejar la reserva `pendiente` para que expire, o marcarla `cancelada`.
   - El webhook debe ser **idempotente**: Wompi puede reintentar el mismo evento.
6. Guardar el `payload` completo en `pagos.payload` para auditoría.

**Ambiente de pruebas primero.** Wompi tiene sandbox; toda la integración se prueba ahí antes de tocar llaves de producción. Las llaves van en variables de entorno de Vercel, nunca en el repositorio.

---

## 8. Panel administrativo (`/admin`)

Autenticación con Supabase Auth (correo + contraseña). Todo en español, pensado para personas no técnicas.

| Módulo | Qué permite hacer |
|---|---|
| **1. Contenido del sitio** | Editar textos, fotos y secciones de las páginas públicas. Cambios visibles al instante. |
| **2. Alojamientos** | Crear, editar y pausar cabañas: galería, amenidades, capacidad, tarifas por plan y temporada. |
| **3. Experiencias** | Administrar experiencias con foto, precio y descripción. |
| **4. Adicionales** | Decoraciones, celebraciones y servicios extra que aparecen en el flujo de reserva. |
| **5. Reservas** | Calendario completo; ver cada reserva con datos del huésped y su pago; **crear reservas manuales** (las de WhatsApp); modificar fechas; bloquear días por mantenimiento. |

**Prioridad de UX del panel:** el módulo 5 (Reservas) es el que se usa a diario. Debe abrir en una vista de calendario mensual clara, con las 5 cabañas visibles de un vistazo.

---

## 9. SEO y medición

- Metadatos por página con la Metadata API de Next.js; `sitemap.xml` y `robots.txt` generados.
- **Datos estructurados JSON-LD** de tipo `Hotel`/`LodgingBusiness` en el home, y `Room`/`Product` en cada cabaña — con dirección, precios y fotos.
- Palabras clave objetivo: *ecohotel cerca de Cali*, *cabañas con jacuzzi Valle del Cauca*, *hotel Km 18 vía Buenaventura*, *pasadía cerca de Cali*.
- Imágenes con `next/image`, formatos modernos, `alt` obligatorio.
- Core Web Vitals en verde: sin librerías pesadas innecesarias.
- Google Analytics 4 + Search Console configurados; Google Business Profile enlazado.
- **Preservar las URLs del sitio actual** o hacer redirecciones 301 donde cambien, para no perder el posicionamiento ya ganado.

---

## 10. Diseño

- **Conservar la esencia actual:** fotografía existente, tonos verdes/naturales, calidez. No es un rediseño de marca, es una mejor presentación.
- **Estilo iOS:** mucho aire, esquinas suaves (radios de 14–20 px), sombras casi imperceptibles, jerarquía tipográfica clara, transiciones sutiles. Nada que parpadee o gire.
- **Un mensaje por pantalla.** El cliente pidió explícitamente sitios que "vayan al grano".
- **Móvil primero:** la mayoría de los huéspedes llegan desde el celular vía redes y WhatsApp.
- **Camino a la reserva evidente desde la primera pantalla** (referencia que le gustó al cliente: `hotelboutiquedonpepe.com`, por lo directo que es para reservar).
- Accesibilidad: contraste suficiente, foco visible, navegación por teclado en el flujo de reserva.

---

## 11. Plan de trabajo por fases

### Fase 0 — Preparación
- [ ] Crear repositorio y proyecto Next.js + TypeScript + Tailwind.
- [ ] Conectar el proyecto de Supabase de La Finca; configurar variables de entorno.
- [ ] Desplegar en Vercel bajo una URL temporal (`lafinca-preview.vercel.app`). **El dominio se cambia al final.**
- [ ] Extraer del WordPress actual: todos los textos, las fotos en máxima calidad y la estructura de páginas.

### Fase 1 — Base de datos y contenido
- [ ] Migraciones con el esquema de §4, incluidos los constraints anti-solapamiento.
- [ ] Políticas RLS en todas las tablas.
- [ ] Cargar datos iniciales: 5 cabañas, 3 planes, tarifas, 2 experiencias.
- [ ] Subir imágenes a Supabase Storage.

### Fase 2 — Sitio público
- [ ] Layout, navegación, footer (con RNT 114565 y redes), botón flotante de WhatsApp.
- [ ] Home con hero y buscador de fechas.
- [ ] Listado y páginas de detalle por alojamiento.
- [ ] Experiencias, el lugar, galería, FAQ, contacto.
- [ ] Páginas legales (borradores que el cliente aprueba).

### Fase 3 — Motor de reservas
- [ ] Lógica de disponibilidad (función SQL + capa de servicio).
- [ ] Calendario con fechas ocupadas deshabilitadas.
- [ ] Flujo de 4 pasos con resumen de precio en vivo.
- [ ] Creación de reserva `pendiente` + expiración automática.

### Fase 4 — Pagos
- [ ] Integración de Wompi en **sandbox**.
- [ ] Webhook con verificación de firma e idempotencia.
- [ ] Correos: confirmación al huésped y aviso a la administración.
- [ ] Pruebas de extremo a extremo: aprobado, rechazado, abandonado, evento duplicado.

### Fase 5 — Panel administrativo
- [ ] Login y protección de rutas.
- [ ] Módulo de reservas (calendario, reserva manual, bloqueos) — **el más importante**.
- [ ] Módulos de alojamientos, experiencias y adicionales.
- [ ] Módulo de contenido del sitio.

### Fase 6 — SEO y pulido
- [ ] Metadatos, sitemap, JSON-LD, redirecciones 301.
- [ ] Analytics y Search Console.
- [ ] Auditoría de rendimiento y accesibilidad.
- [ ] Revisión responsive en móvil real.

### Fase 7 — Lanzamiento
- [ ] Cargar reservas futuras ya confirmadas que estén en WhatsApp.
- [ ] Cambiar llaves de Wompi a producción.
- [ ] Apuntar `lafincaecohotel.com` a Vercel (requiere acceso a Hostinger).
- [ ] Verificar que el sitio anterior quede fuera y las redirecciones funcionen.
- [ ] Capacitación del equipo + entrega de credenciales.

---

## 12. Datos pendientes del cliente

No bloquean el arranque, pero sí la entrega. Usar valores provisionales claramente marcados como `TODO` mientras llegan:

- Tarifas por cabaña confirmadas (hoy solo tenemos los 3 planes generales del sitio).
- Reglas de reserva: mínimo de noches, política de cancelación, horas de check-in/check-out, mascotas, niños.
- Fotos y videos en alta calidad (carpeta de Drive).
- Lista definitiva de experiencias y adicionales con precios.
- Razón social y NIT del hotel.
- Correo desde el que salen las confirmaciones.
- Usuarios del panel (nombre y correo).
- Accesos: dominio en **Hostinger**, Google Business Profile, Analytics.
- Cuenta bancaria y documentos para abrir Wompi.
- Decisión: ¿pago total o anticipo al reservar?

**Contactos del cliente:** ya disponibles — pedírselos a Cesar antes de empezar a resolver dudas de contenido.

---

## 13. Reglas para trabajar en este proyecto

1. **No tocar el sitio actual.** Sigue en producción hasta el último día. Todo el desarrollo va en la URL temporal de Vercel.
2. **Verificar antes de asumir.** Los datos de §2 salieron del sitio público, no de la boca del cliente. Marcar como `TODO` lo que no esté confirmado en vez de inventar.
3. **Nada de credenciales en el repositorio.** Ni llaves de Wompi, ni `service_role`, ni contraseñas. Todo en variables de entorno.
4. **Commits pequeños y descriptivos, en español.**
5. **Probar el flujo de reserva completo después de cada cambio que lo toque.** Es la pieza que genera ingresos: si se rompe, el cliente pierde dinero real.
6. **Cuando una decisión de producto no esté clara, preguntar a Cesar** en vez de elegir por el cliente. Ejemplos típicos: política de cancelación, qué pasa si un pago queda a medias, cómo se maneja un no-show.
7. **Español claro en todo lo visible.** Si un mensaje de error necesita explicación técnica, está mal escrito.

---

## 14. Criterios de aceptación

El proyecto está listo para entregar cuando:

- [ ] Un huésped puede reservar y pagar de principio a fin desde el celular, sin ayuda.
- [ ] La reserva pagada bloquea el calendario automáticamente y llega el correo de confirmación.
- [ ] Dos personas no pueden reservar la misma cabaña en fechas que se solapen (probado con peticiones concurrentes).
- [ ] La administración puede crear una reserva manual de WhatsApp y esta bloquea el calendario igual.
- [ ] El equipo puede cambiar una tarifa, una foto y un texto desde el panel, sin ayuda técnica.
- [ ] El sitio carga rápido en móvil y pasa Core Web Vitals.
- [ ] Google ve el sitio correctamente: sitemap, metadatos y datos estructurados de hotel válidos.
- [ ] `lafincaecohotel.com` apunta al sitio nuevo, con las redirecciones del sitio viejo funcionando.
- [ ] El RNT 114565 aparece en el pie de página.
- [ ] El botón de WhatsApp sigue disponible en todo el sitio.

---

*GOCAS Automations · Cesar Castaño · cesarxemiliox@gmail.com*
