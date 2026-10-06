import type { NextConfig } from "next";

/**
 * Origen del bucket público de imágenes. Se deriva de la variable de entorno
 * para que un cambio de proyecto de Supabase no obligue a tocar este archivo.
 */
const origenSupabase = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "https://yyfuhytmoiehqmnrekkq.supabase.co",
);

/**
 * ===========================================================================
 * CABECERAS DE SEGURIDAD
 * ===========================================================================
 *
 * Auditoría del 2026-09-30: el sitio se servía SIN una sola cabecera de
 * seguridad (ver `docs/AUDITORIA_SEGURIDAD.md`). Estas son las que aplican a un
 * sitio de hotel con panel administrativo y, pronto, pagos.
 *
 * La lista de orígenes permitidos NO es genérica: sale de lo que el sitio carga
 * de verdad. Si mañana se añade un servicio externo (un chat, un píxel, una
 * pasarela), hay que declararlo aquí o el navegador lo bloqueará — y eso es
 * exactamente lo que se busca: que nadie pueda inyectar una petición a un
 * tercero desde el CMS ni desde una dependencia comprometida.
 */

/** El host del bucket de Supabase, del que salen TODAS las fotos y el video. */
const HOST_SUPABASE = origenSupabase.origin;

/**
 * Orígenes que pueden ir en un `<iframe>`:
 *   · `www.instagram.com` — el reel de la portada.
 *   · `maps.google.com` y `www.google.com` — el mapa de Conócenos y Contacto.
 *     Se admiten los dos porque Google sirve el embebido por ambos según cómo
 *     se copie el enlace, y `sitio.contacto.mapa_embed` lo edita el cliente.
 */
const MARCOS_PERMITIDOS = [
  "https://www.instagram.com",
  "https://maps.google.com",
  "https://www.google.com",
];

/**
 * El checkout de Bold. **Es el único host externo que añadió la fase de pagos.**
 *
 * De aquí sale `boldPaymentButton.js`, la librería oficial que construye la URL
 * de la pasarela a partir de la configuración ya firmada en el servidor
 * (`src/lib/pagos/bold.ts`). Se carga **solo cuando alguien pulsa «pagar»**, no
 * en cada visita a `/reservar` (ver `cargarBold()` en
 * `src/components/sitio/pago-en-linea.tsx`), pero la CSP se declara igual: el
 * navegador comprueba el origen en el momento de la carga, no en el del render.
 *
 * Va en `script-src` y **en ningún otro sitio**:
 *
 *   · NO en `frame-src`, porque esta integración usa el modo de **redirección**,
 *     no el `renderMode: 'embedded'`. Al pulsar, la librería hace
 *     `window.location.href = 'https://checkout.bold.co/btn?…'`: una navegación,
 *     no un iframe. El día que se quiera el checkout embebido —que sí monta un
 *     `<iframe>` en el `<body>`— habrá que añadir ese host a `frame-src`, y solo
 *     ese.
 *   · NO en `form-action`, porque la librería no envía ningún formulario.
 *     (Comprobado leyendo su código: dos `location.href` y ni un `.submit()`.)
 *   · NO en `style-src` ni en `font-src`. El botón con el diseño de Bold importa
 *     una fuente de Google desde dentro de su shadow DOM; este sitio **no usa
 *     ese botón**, usa la integración personalizada con su propio botón, así que
 *     esa hoja de estilo nunca se pide.
 *
 * Que un solo host externo entre y esté explicado es exactamente el valor que la
 * auditoría le atribuía a esta política (A-2): lo que sigue siendo imposible es
 * cargar un script de un dominio que nadie declaró aquí.
 */
const CHECKOUT_BOLD = "https://checkout.bold.co";

/**
 * En una vista previa de Vercel se inyecta la barra de herramientas
 * (`vercel.live`). No se permite en producción: allí no existe.
 */
const esVistaPrevia = process.env.VERCEL_ENV === "preview";
const enDesarrollo = process.env.NODE_ENV !== "production";

function politicaDeContenido(): string {
  const scripts = [
    "'self'",
    /*
      `'unsafe-inline'` ES NECESARIO Y NO ES UN DESCUIDO.

      Next inyecta en cada página scripts en línea (el arranque del runtime y
      los trozos de datos `self.__next_f.push(...)`). La forma limpia de
      permitirlos es un `nonce` por petición, y un `nonce` solo se puede emitir
      desde el middleware — que en este sitio corre ADREDE solo en `/admin`
      (ver `src/middleware.ts`): extenderlo a las rutas públicas las volvería
      dinámicas y el sitio perdería el prerenderizado y el ISR de una hora de
      sus 18 páginas. Entre una CSP con nonce y un sitio estático, se elige el
      sitio estático y se acepta `'unsafe-inline'` para los scripts propios.

      Lo que la política SÍ impide, y es la mitad del valor: que se cargue un
      script desde CUALQUIER host que no sea el nuestro. Un `<script src>` a un
      dominio ajeno inyectado por el CMS o por una dependencia no se ejecuta.
    */
    "'unsafe-inline'",
    /* La librería del checkout de Bold. Ver `CHECKOUT_BOLD` arriba. */
    CHECKOUT_BOLD,
    ...(esVistaPrevia ? ["https://vercel.live"] : []),
    /* `next dev` compila con `eval`. En producción nunca se permite. */
    ...(enDesarrollo ? ["'unsafe-eval'"] : []),
  ];

  const directivas: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scripts,
    /* Tailwind va en una hoja propia, pero `next/font` y algunos componentes
       emiten `<style>` en línea. */
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      HOST_SUPABASE,
      /* Avatares de quienes dejan reseñas en Google (único host de Places). */
      "https://lh3.googleusercontent.com",
    ],
    /* El video de la COP16 vive en el bucket `videos`. */
    "media-src": ["'self'", HOST_SUPABASE],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      HOST_SUPABASE,
      ...(esVistaPrevia ? ["https://vercel.live", "wss://vercel.live"] : []),
    ],
    "frame-src": ["'self'", ...MARCOS_PERMITIDOS],
    /* Nadie puede meter este sitio en un marco: ni el panel ni las páginas
       públicas. Evita el clickjacking sobre los botones del panel. */
    "frame-ancestors": ["'none'"],
    /* Un formulario solo puede enviarse a nosotros mismos: un formulario
       inyectado no puede mandar los datos del huésped a otro servidor. */
    "form-action": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
  };

  const texto = Object.entries(directivas)
    .map(([nombre, valores]) => `${nombre} ${valores.join(" ")}`)
    .join("; ");

  /* En producción, cualquier subrecurso `http://` se pide por `https://`. */
  return enDesarrollo ? texto : `${texto}; upgrade-insecure-requests`;
}

const CABECERAS_DE_SEGURIDAD = [
  { key: "Content-Security-Policy", value: politicaDeContenido() },
  /*
    HSTS SIN `includeSubDomains` NI `preload`, A PROPÓSITO.

    `includeSubDomains` obligaría a que TODOS los subdominios de
    lafincaecohotel.com se sirvan por HTTPS para siempre, y el correo y lo que
    quede en Hostinger no están verificados. `preload` es irreversible en
    meses. Un año de HSTS sobre el dominio principal es lo que se puede
    prometer hoy sin dejar al hotel sin correo; cuando se confirme que todos
    los subdominios son HTTPS, se añaden las dos.
  */
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  /* Para navegadores viejos que no entienden `frame-ancestors`. */
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    /* Nada de cámara, micrófono, ubicación ni sensores: el sitio no los usa.
       `payment=(self)` se deja abierto a nuestro propio origen porque la
       pasarela de la fase 4 puede necesitar la Payment Request API. */
    value: [
      "accelerometer=()",
      "autoplay=(self)",
      "camera=()",
      "display-capture=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "payment=(self)",
      "usb=()",
    ].join(", "),
  },
];

const nextConfig: NextConfig = {
  /**
   * Fuera `x-powered-by: Next.js`. No es un agujero, pero regala la versión del
   * framework a cualquiera que quiera buscarle un fallo conocido.
   */
  poweredByHeader: false,

  async headers() {
    return [
      /* Todas las rutas, incluidas las estáticas y las imágenes. */
      { source: "/:path*", headers: CABECERAS_DE_SEGURIDAD },
      {
        /* El panel no se indexa ni se guarda en ninguna caché compartida. */
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },

  images: {
    /**
     * SIN TRANSFORMACIONES DE IMAGEN. ES EL MODO NORMAL, NO UNA EMERGENCIA.
     *
     * Decisión de Cesar (2026-09-14). El plan de Vercel incluye un número
     * limitado de «transformaciones» de Image Optimization al mes y, cuando se
     * agota, Vercel **no sirve la foto sin optimizar: devuelve un error**. El
     * sitio del hotel se queda con los huecos de las imágenes vacíos, y es un
     * fallo total de la portada por una cuota, no por un error de código.
     * Depender de un servicio que falla así en el camino crítico de un sitio
     * cuyo producto ES la fotografía no compensa.
     *
     * Antes esto era un interruptor de emergencia apagado por defecto. Ahora es
     * al revés: **la optimización está apagada salvo que alguien escriba
     * `IMAGENES_SIN_OPTIMIZAR=0`**, y esa variable solo existe para poder
     * comparar los dos modos.
     *
     * EL PESO LO CONTROLAMOS NOSOTROS. Sin `/_next/image` no hay `srcset`
     * automático, así que lo generamos en el despliegue:
     * `npm run imagenes:variantes` deja en el bucket (`web/v/…`) las variantes
     * por ancho de cada foto, y `<Foto>` (`src/components/ui/foto.tsx`) arma el
     * `srcset` con los `sizes` reales de cada uso. El navegador elige el
     * peldaño exactamente igual que antes; la diferencia es que los archivos ya
     * existen y Vercel no transforma nada.
     */
    unoptimized: process.env.IMAGENES_SIN_OPTIMIZAR !== "0",
    remotePatterns: [
      {
        // Imágenes servidas desde Supabase Storage (bucket `imagenes`)
        protocol: "https",
        hostname: origenSupabase.hostname,
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Fotos de perfil de quienes dejan reseñas en Google. Es el único host
        // desde el que Places API sirve esos avatares; `src/lib/resenas-google.ts`
        // descarta cualquier otra URL para que nunca llegue aquí un host no
        // declarado (que haría fallar `next/image` en tiempo de ejecución).
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
    /**
     * Anchos que Next puede generar. La lista por defecto trae ocho tamaños y
     * empieza en 640: aquí se recorta a los que el sitio usa de verdad y se
     * añade 390 (el ancho lógico de un iPhone actual), porque la mayoría de
     * los huéspedes llega desde el celular por redes y WhatsApp.
     */
    deviceSizes: [390, 640, 768, 1080, 1280, 1920],
    /** Tamaños para imágenes pequeñas (miniaturas de galería, avatares). */
    imageSizes: [64, 128, 256, 384],
    /**
     * Calidades permitidas. Next 15 exige declararlas: cualquier `quality`
     * fuera de esta lista falla en tiempo de compilación en vez de generar
     * silenciosamente una variante más.
     */
    qualities: [68, 75, 90],
    /**
     * 31 días de caché. Es seguro porque las fotos del bucket NUNCA se
     * sobrescriben: al subir una nueva se crea una ruta nueva, así que una URL
     * siempre devuelve la misma imagen.
     */
    minimumCacheTTL: 60 * 60 * 24 * 31,
  },

  /**
   * ==========================================================================
   * REDIRECCIONES PERMANENTES (301)
   * ==========================================================================
   *
   * Dos grupos, por dos motivos distintos:
   *
   * **1. Direcciones propias que cambiaron de nombre.** `/el-lugar` existió y
   * se indexó: la página se llama ahora «Conócenos» y vive en `/conocenos`.
   *
   * **2. Las URLs del WordPress que estuvo en producción hasta el 2026-10-01.**
   * ⚠ **Que el sitio viejo ya no exista no las vuelve innecesarias: las vuelve
   * imprescindibles.** Mientras estaba en línea, él mismo respondía esas
   * direcciones; ahora las sirve este sitio, y lo único que separa a quien llega
   * desde un resultado de Google de un 404 son estas reglas. Google tarda
   * semanas o meses en dejar de pedirlas, así que se quedan. El sitio viejo era
   * casi un *one-page*, y su `wp-sitemap` publicaba exactamente seis direcciones:
   * `/`, `/services/`, `/about-us/`, `/contact/`, `/hello-world/` y
   * `/category/uncategorized/`. Las tres primeras son páginas del tema Divi sin
   * personalizar (textos en inglés, dirección de Los Ángeles, teléfono
   * ficticio) y las dos últimas son los restos de la instalación de WordPress,
   * pero **siguen indexadas**: sin estos 301 cada una devolvería un 404 y se
   * perdería la autoridad que hayan acumulado. Se llevan a la página nueva que
   * les corresponde por intención,
   * no por parecido de nombre.
   *
   * ⚠ **Las redirecciones de `next.config` GANAN a las rutas del App Router.**
   * Una `source` que coincida con una página existente la deja inalcanzable, sin
   * ningún aviso en el build. Ninguna de las de aquí lo hace —`/services`,
   * `/about-us`, `/contact`, `/hello-world` y `/category/...` no existen como
   * rutas, y los destinos (`/experiencias`, `/conocenos`, `/contacto`, `/`) sí—,
   * y eso se comprobó con `curl -I` contra localhost, ruta por ruta.
   *
   * **Sobre la barra final: el sitio viejo publicaba sus URLs con barra
   * (`/services/`) y eso son DOS saltos, a propósito.** Next normaliza la barra
   * final ANTES de mirar estas reglas, así que `/services/` devuelve primero un
   * 308 a `/services` y ese un 301 a `/experiencias`. Declarar también
   * `source: "/services/"` no lo evita —la normalización va antes y nunca se
   * llega a esa regla, se comprobó con `curl`— y la única forma de quitar el
   * salto sería `skipTrailingSlashRedirect: true`, que apagaría la
   * normalización de TODO el sitio y dejaría cada página accesible con y sin
   * barra: contenido duplicado a cambio de ahorrar un salto que Google sigue
   * sin problema. Se queda la cadena 308 → 301.
   *
   * Se fija `statusCode: 301` a mano. `permanent: true` habría devuelto un
   * **308**, que para Google significa exactamente lo mismo y además conserva
   * el método HTTP; pero el 301 es el código que entiende cualquier
   * herramienta de SEO sin discusión y aquí solo hay peticiones GET, así que
   * no se gana nada con el 308 y sí se pierde claridad.
   */
  async redirects() {
    const permanentes: { de: string; a: string }[] = [
      /* Nuestra propia página renombrada. */
      { de: "/el-lugar", a: "/conocenos" },

      /*
        El panel: la sección «Temporadas» pasó a llamarse «Tarifas
        diferenciales» (2026-10-05). Quien tenga la dirección vieja en favoritos,
        en un correo o en el manual llega a la nueva. El comodín `:path*` cubre
        `/admin/temporadas`, `/admin/temporadas/nueva` y
        `/admin/temporadas/<id>` (comprobado con path-to-regexp: la subruta es
        opcional). La redirección corre antes que el middleware, pero la
        dirección nueva sigue protegida por él: sin sesión, el panel manda al
        inicio de sesión como siempre.
      */
      {
        de: "/admin/temporadas/:path*",
        a: "/admin/tarifas-diferenciales/:path*",
      },

      /*
        WordPress → sitio nuevo.

        `/services` → `/experiencias`: en el sitio viejo esa página iba a
        contener los servicios del hotel. Lo que el hotel vende como «servicios»
        son hoy las experiencias (aniversario, cumpleaños, fondue), así que es
        ahí donde aterriza quien venía buscando eso.

        `/about-us` → `/conocenos` y `/contact` → `/contacto` son la misma
        página en español.
      */
      { de: "/services", a: "/experiencias" },
      { de: "/about-us", a: "/conocenos" },
      { de: "/contact", a: "/contacto" },

      /*
        Los restos de la instalación de WordPress. `hello-world` es la entrada
        de ejemplo que crea WordPress solo, y `category/uncategorized` su
        archivo: no tienen equivalente porque no tenían contenido. Van a la
        portada, que es lo único honesto — un 404 sería peor para quien llega
        desde un resultado de Google que todavía las muestre.
      */
      { de: "/hello-world", a: "/" },
      { de: "/category/uncategorized", a: "/" },
    ];

    return permanentes.map(({ de, a }) => ({
      source: de,
      destination: a,
      statusCode: 301 as const,
    }));
  },
};

export default nextConfig;
