# Despliegue en Vercel

Checklist paso a paso para publicar el sitio en Vercel **sin que Google lo
indexe todavía**: mientras el WordPress viejo siga siendo la web real de La
Finca, la URL de Vercel (temporal o de dominio) no puede competir por las
mismas búsquedas. Esta guía cubre el primer deploy, las variables de entorno
y —más adelante, cuando el cliente dé luz verde— el cambio de dominio.

## 1. Importar el repositorio

1. Entrar a Vercel con la cuenta del equipo **GOCAS** (no una cuenta personal:
   el proyecto debe quedar en el equipo, no en un usuario suelto).
2. **Add New → Project** → importar
   `https://github.com/GOCAS-Automations/WEBSITE_LaFincaEcohotel.git`.
3. **Framework Preset**: Vercel detecta *Next.js* solo. No tocar nada.
4. **Build Command** y **Output Directory**: dejar los que Vercel propone por
   defecto (`next build` / `.next`). No hay nada especial que configurar aquí.
5. Todavía NO pulsar “Deploy”: primero cargar las variables de entorno de la
   sección 2, porque sin `NEXT_PUBLIC_SUPABASE_URL` y su llave anónima el
   build falla al intentar leer el contenido del sitio.

## 2. Variables de entorno

Configurarlas en **Project Settings → Environment Variables**. La columna
“Entornos” dice en cuáles activarla (Production / Preview / Development); por
defecto, activarla en los tres salvo que se diga lo contrario.

| Variable | ¿Secreta? | Entornos | Valor recomendado en el primer deploy |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | No | Production, Preview, Development | URL del proyecto de Supabase de La Finca (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No (es pública por diseño, pero no compartirla fuera de Vercel/Supabase) | Production, Preview, Development | Llave `anon` del mismo proyecto |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sí** | Production, Preview, Development | Llave `service_role` del proyecto. Nunca lleva `NEXT_PUBLIC_` — si algún día apareciera con ese prefijo, sería un error grave: quedaría expuesta en el navegador |
| `SUPABASE_DB_URL` | **Sí** | Production, Preview, Development (solo hace falta si algún Route Handler o script corre migraciones en runtime; si no, puede omitirse en Vercel y usarse solo en local) | Cadena de conexión directa a Postgres del proyecto |
| `NEXT_PUBLIC_SITE_URL` | No | Production, Preview, Development | Ver el apartado dedicado más abajo — en el primer deploy se deja **vacía** |
| `IMAGENES_SIN_OPTIMIZAR` | No | — | Ver el apartado dedicado más abajo — se deja **vacía** en el primer deploy |
| `SITIO_PUBLICADO` | No | Production, Preview, Development | **`0` o sin definir** hasta el lanzamiento — ver el apartado dedicado |
| `GOOGLE_PLACES_API_KEY` | **Sí** | Production, Preview, Development | Llave de la Places API (New) del proyecto de Google Cloud. Sin ella el bloque de reseñas simplemente no se publica: no bloquea el deploy |

Las de Wompi y Resend (comentadas en `.env.example`) son de fases
posteriores: no hace falta crearlas todavía.

### `NEXT_PUBLIC_SITE_URL`

En el primer deploy **todavía no se conoce la URL final**, porque Vercel la
asigna al crear el proyecto. El procedimiento es:

1. Desplegar con `NEXT_PUBLIC_SITE_URL` vacía (el código cae a
   `https://www.lafincaecohotel.com` por defecto, que no es la URL real pero
   no rompe el build).
2. Copiar la URL que Vercel asignó al proyecto (algo como
   `website-la-finca-ecohotel.vercel.app`, visible en el dashboard del
   proyecto).
3. Editar la variable con esa URL completa (`https://…vercel.app`, **sin**
   barra final) y volver a desplegar (**Deployments → ⋯ → Redeploy**, o hacer
   un commit nuevo).

Cuando más adelante se conecte el dominio propio, esta variable cambia a
`https://lafincaecohotel.com` (ver la sección 4).

### `IMAGENES_SIN_OPTIMIZAR`

Es el interruptor de emergencia de la optimización de imágenes de Vercel: el
plan gratuito incluye un número limitado de transformaciones al mes, y si se
agotan las fotos dejan de servirse. Dejarla **vacía** en el primer deploy (la
optimización encendida es el estado normal); solo se pone en `1` si en algún
momento las imágenes empiezan a fallar por haber agotado la cuota, y hay que
redesplegar después de cambiarla.

### `SITIO_PUBLICADO`

Controla si el sitio se indexa o no. Con `0` o sin definir (el valor por
defecto, pensado para durar todo el desarrollo, el primer deploy y todo el
tiempo que el WordPress viejo siga siendo la web real):

- `/robots.txt` bloquea el sitio completo (`Disallow: /`).
- Cada página se publica con `<meta name="robots" content="noindex, nofollow">`.

Se cambia a `1` **el mismo día** que el dominio apunte a Vercel y el
WordPress deje de estar en producción (sección 4) — nunca antes. **Advertencia:**
dejarla en `0` (o sin definir) después del lanzamiento significa que Google
nunca va a indexar el sitio, aunque el dominio ya esté conectado y todo lo
demás funcione.

## 3. Verificación tras el primer deploy

Con la URL de Vercel ya asignada (`https://…vercel.app`), revisar:

- [ ] `https://…vercel.app/robots.txt` responde `User-Agent: *` /
      `Disallow: /` (sitio bloqueado por completo, como corresponde antes del
      lanzamiento).
- [ ] Las fotos cargan (vienen del bucket `imagenes` de Supabase Storage, no
      de `/public`).
- [ ] `/admin/login` responde y deja iniciar sesión.
- [ ] Las reseñas de Google aparecen en la página de inicio o en Conócenos;
      si `GOOGLE_PLACES_API_KEY` no está puesta, el sitio debe seguir
      funcionando igual (el bloque de reseñas cae al respaldo, no rompe nada).
- [ ] El log del build muestra las **19 rutas públicas** como estáticas
      (`○` o `●`), no dinámicas (`ƒ`): `/`, `/alojamientos`, las 5 fichas de
      `/alojamientos/[slug]`, `/conocenos`, `/contacto`, `/experiencias`,
      `/faq`, `/galeria`, `/reservar`, las 4 páginas de `/legal/*`,
      `/robots.txt` y `/sitemap.xml`. Las rutas de `/admin/*` sí son
      dinámicas (`ƒ`) — eso es lo esperado, no un error.
- [ ] `/sitemap.xml` y las etiquetas `<link rel="canonical">` de las páginas
      apuntan a la URL de Vercel recién configurada (`NEXT_PUBLIC_SITE_URL`),
      no a `localhost` ni a `lafincaecohotel.com` todavía.

## 4. Cuando llegue el momento de conectar el dominio

Este paso es **futuro**: se ejecuta el día que el cliente confirme el
lanzamiento, no antes.

1. En **Hostinger** (donde vive el DNS del dominio hoy), crear/editar:
   - Un registro **A** del apex (`lafincaecohotel.com`) apuntando a la IP que
     indique Vercel en **Project Settings → Domains** al añadir el dominio.
   - Un registro **CNAME** de `www` apuntando a `cname.vercel-dns.com`.
2. Esperar la propagación del DNS (puede tardar desde minutos hasta unas
   horas) y confirmar en Vercel que el dominio queda validado y con el
   certificado SSL activo.
3. Cambiar `NEXT_PUBLIC_SITE_URL` a `https://lafincaecohotel.com`.
4. Cambiar `SITIO_PUBLICADO` a `1`.
5. Redesplegar.
6. Repetir la verificación de la sección 3, ahora contra el dominio real:
   `/robots.txt` ya NO debe decir `Disallow: /` (debe volver el
   `Allow: /` con las exclusiones de `/admin` y `/api/`), y las canónicas
   deben apuntar a `lafincaecohotel.com`.
7. **Pendiente sin resolver todavía:** las redirecciones 301 desde las URLs
   del WordPress viejo hacia las nuevas rutas del sitio. Está anotado como
   pendiente en `docs/MEMORIA.md`; hay que resolverlo antes o el mismo día
   del cambio de DNS, no después, para no perder el posicionamiento que ya
   tienen las URLs viejas.

## 5. Seguridad antes de entregar

- [ ] Rotar o borrar el usuario de pruebas del panel
      (`panel@lafincaecohotel.com`) antes de entregarle el proyecto al
      cliente. Es una cuenta de desarrollo, no debe quedar activa en
      producción.
