# Claves del CMS — contrato entre el sitio público y el panel

> Este documento es el **contrato**. El panel administrativo (módulo 1,
> "Contenido del sitio") edita las filas de la tabla `contenido`; el sitio
> público las lee desde `src/lib/contenido.ts`. Si aquí no está, el sitio no lo
> pinta.
>
> Última revisión: 2026-09-16 · 22 claves.

---

## Cómo funciona

```sql
create table contenido (
  clave text primary key,          -- 'home.hero'
  valor jsonb not null,            -- el objeto documentado abajo
  actualizado_at timestamptz default now()
);
```

**Lectura (sitio público).** `src/lib/contenido.ts` trae **todas** las filas en
una sola consulta cacheada con `cache()` de React y superpone cada una sobre un
**respaldo escrito en código**. Reglas de esa fusión (`fusionar()`):

| Situación | Qué pasa |
|---|---|
| La fila no existe | Se usa el respaldo entero. **El sitio nunca se rompe.** |
| Un campo falta o es `null` | Se usa el del respaldo. |
| Un texto llega vacío o solo con espacios | Se usa el del respaldo (un hueco se lee peor que el texto viejo). |
| Un arreglo llega vacío | Se usa el del respaldo. Los arreglos se sustituyen **enteros**, nunca elemento a elemento. |
| Llega una clave que no está en el respaldo | **Se ignora.** El código manda sobre la forma del objeto. |
| Supabase no responde durante el build | Se usa el respaldo. El despliegue sale igual. |

**Consecuencia práctica para el panel:** guardar un objeto parcial es seguro,
pero **no** sirve para "borrar" un texto. Para dejar algo en blanco de verdad
hay que cambiar el respaldo en código, no la fila.

**Escritura (panel).** Al guardar hay que:

1. Leer la fila actual y **fusionarla** con lo editado (el jsonb puede tener
   claves que el formulario de ese momento no muestra).
2. Revalidar las dos cachés de Next — sin las dos, el cambio no se ve:

```ts
revalidateTag(ETIQUETA_CONTENIDO_PUBLICO);   // de src/lib/supabase/public.ts
revalidatePath("/");
revalidatePath("/alojamientos");
revalidatePath("/alojamientos/[slug]", "page");   // 2.º argumento SOLO en rutas dinámicas
revalidatePath("/sitemap.xml");
```

**Imágenes.** Todos los campos `imagen`, `imagen_movil` y `url` guardan una
**URL absoluta** (normalmente del bucket público `imagenes` de Supabase
Storage, pero se acepta cualquier URL externa). Todo campo de imagen viene
acompañado de su `alt`, que es **obligatorio**: sin él la foto no se publica
correctamente para lectores de pantalla ni para Google.

---

## Índice de claves

| Clave | Dónde se ve | Getter |
|---|---|---|
| `sitio.contacto` | Pie, contacto, WhatsApp, JSON-LD | `getContacto()` |
| `sitio.seo` | Metadatos de la portada y tarjeta social | `getSeoSitio()` |
| `home.hero` | Portada, primera pantalla | `getHero()` |
| `home.intro` | Portada, "Bienvenidos" | `getIntro()` |
| `home.cabanas` | Portada, encabezado de cabañas | `getSeccionCabanas()` |
| `home.planes` | Portada, encabezado de planes | `getSeccionPlanes()` |
| `home.experiencias` | Portada, encabezado de experiencias | `getSeccionExperiencias()` |
| `home.instagram` | Portada, tira de Instagram y reel | `getInstagram()` |
| `home.testimonios` | Portada, testimonios | `getTestimonios()` |
| `home.cta_final` | Portada, cierre | `getCtaFinal()` |
| `heroes.listados` | Cabecera de las 7 páginas internas | `getHeroesListados()` |
| `experiencias` | `/experiencias` | `getContenidoExperiencias()` |
| `faq` | `/faq` (y el JSON-LD `FAQPage`) | `getFaq()` |
| `lugar` | `/conocenos` | `getLugar()` |
| `conocenos.reconocimiento` | `/conocenos`, COP16 | `getReconocimiento()` |
| `galeria` | `/galeria` | `getGaleria()` |
| `reservar` | `/reservar` | `getReservar()` |
| `no_encontrado` | Página 404 | `getNoEncontrado()` |
| `legal.privacidad` | `/legal/privacidad` | `getDocumentoLegal("privacidad")` |
| `legal.terminos` | `/legal/terminos` | `getDocumentoLegal("terminos")` |
| `legal.datos` | `/legal/datos` | `getDocumentoLegal("datos")` |
| `legal.cancelacion` | `/legal/cancelacion` | `getDocumentoLegal("cancelacion")` |

Lo que **no** vive aquí: las cabañas, los planes, las tarifas y las
experiencias con precio son tablas propias (`alojamientos`, `planes`,
`tarifas`, `extras`, `imagenes`) y tienen su propio módulo en el panel. Los
textos legales **sí** viven aquí desde el 2026-09-16, en las cuatro claves
`legal.*`: hasta entonces estaban solo en código, y la decisión se revirtió a
petición de Cesar para que el cliente pueda corregirlos sin un despliegue.

---

## `sitio.contacto`

Alimenta el pie, la página de contacto, el botón flotante de WhatsApp y los
datos estructurados. **Es la fila más delicada del CMS:** si el `rnt` queda
vacío, el sitio incumple una obligación legal (por eso el código tiene
respaldo).

```jsonc
{
  "whatsapp": "573160476671",              // solo dígitos con indicativo, para wa.me
  "whatsapp_visible": "+57 316 047 6671",  // como se muestra en pantalla
  "mensaje_whatsapp": "¡Hola! …",          // texto prellenado del botón flotante
  "correo": "fincavillarrealcali@gmail.com",  // vacío = no se muestra (pie, contacto, JSON-LD)
  "direccion": "Km 18 vía Cali–Buenaventura, Vereda Loma Alta",
  "ciudad": "Cali",
  "region": "Valle del Cauca",
  "pais": "Colombia",
  "direccion_completa": "…",               // una sola línea: pie y JSON-LD
  "horario_restaurante": "8:00 a. m. – 11:00 p. m., todos los días",
  "rnt": "114565",                         // Registro Nacional de Turismo (obligatorio)
  "instagram": "https://www.instagram.com/lafinca_cali/",
  "instagram_usuario": "@lafinca_cali",
  "facebook": "https://www.facebook.com/…",
  "tiktok": "https://www.tiktok.com/@lafincacali",
  "tiktok_usuario": "@lafincacali",
  "mapa_url": "https://www.google.com/maps/search/?api=1&query=…&query_place_id=…",  // ficha en Maps
  "mapa_embed": "https://maps.google.com/maps?q=place_id:…&output=embed",            // iframe del mapa
  "mapa_como_llegar": "https://www.google.com/maps/dir/?api=1&origin=Cali…"          // botón "Cómo llegar"
}
```

Notas para el formulario del panel:

- `whatsapp` debe guardarse **normalizado a dígitos**. El sitio vuelve a
  limpiarlo por si acaso, pero el panel no debería permitir espacios ni signos.
- Una red social vacía **desaparece** del pie y de la página de contacto; no
  deja un icono roto.
- `mapa_embed` tiene que ser una URL de Google Maps en modo `output=embed`
  (no necesita clave de API). **Usa `q=place_id:…`, no una búsqueda por texto.**
  Con la cadena «La Finca Eco Hotel Km 18 vía Cali Buenaventura», Google leía
  «vía Cali Buenaventura» como un trayecto y pintaba la carretera al puerto
  entera en vez del hotel. El `place_id` del hotel es
  `ChIJeyNhUdivMI4Rk9zjFWJ_Hrk` y es el mismo que usan las reseñas.
- `mapa_como_llegar` son las indicaciones **desde Cali**, no una búsqueda: sin
  `origin`, Google usa la ubicación de quien mira, que casi nunca está en Cali.
  Si se deja vacía, el botón cae a `mapa_url`.

---

## `sitio.seo`

```jsonc
{
  "titulo": "…",              // título de la portada, YA con la marca incluida
  "descripcion": "…",         // ~155 caracteres; se usa en portada y como respaldo
  "palabras_clave": ["ecohotel cerca de Cali", "…"],
  "imagen": {                 // tarjeta de WhatsApp / Facebook / X
    "url": "https://…",
    "alt": "…",
    "ancho": 1200,
    "alto": 630
  }
}
```

`ancho` y `alto` son solo una pista de proporción para los lectores de
OpenGraph; deben coincidir con el archivo real. Lo ideal es un recorte
dedicado 1200×630.

**`imagen` es la tarjeta de TODO el sitio, no solo de la portada** (desde el
2026-09-14). Antes `metadatosPagina()` era una función síncrona y solo la
portada leía esta clave: las otras doce páginas caían al respaldo escrito en
código, así que el hotel cambiaba la foto en el panel y la mitad del sitio
seguía compartiendo la vieja. Ahora la función es `async` y la lee siempre.

El orden de precedencia es:

1. **La foto que la página declare** — la de una cabaña en su ficha, la
   cabecera de `/galeria`, `/faq`… Esa manda y es lo correcto: compartir el
   enlace de la Cabaña 03 debe enseñar la Cabaña 03.
2. **Esta clave**, para todo lo demás (las cuatro páginas legales, `/contacto`,
   la portada…).
3. **`IMAGEN_SOCIAL`** en `src/lib/sitio.ts`, si la base no responde durante el
   build.

La tarjeta por defecto la compone `npm run imagenes:social` con el logotipo
oficial del diseñador sobre el hero de la portada. Ver `docs/MARCA.md` §4.

---

## `home.hero`

```jsonc
{
  "antetitulo": "Ecohotel en el Valle del Cauca",
  "titulo": "Sumérgete en un bosque rodeado de neblina y aves",
  "subtitulo": "…",
  "parrafo": "…",
  "cta_texto": "Reservar ahora",
  "cta_href": "/reservar",
  "cta_secundario_texto": "Descubre nuestro paraíso",
  "cta_secundario_href": "/conocenos",
  "imagen": "https://…",        // HORIZONTAL, para escritorio (ideal ≥1920×1080)
  "imagen_movil": "https://…",  // VERTICAL, para teléfono (ideal ≥1080×1920)
  "imagen_alt": "…"             // el mismo alt sirve para las dos
}
```

Las dos imágenes son dirección de arte real: la horizontal recortada a una
pantalla de teléfono pierde justo las cabañas. Si el panel solo permite subir
una, debe seguir guardando las dos claves (puede repetir la misma URL).

---

## `home.intro`

```jsonc
{
  "antetitulo": "Bienvenidos",
  "titulo": "Un bosque de niebla a 45 minutos de Cali",
  "parrafos": ["…", "…"],       // uno por párrafo; en el panel, un textarea por línea en blanco
  "imagen": "https://…",
  "imagen_alt": "…",
  "datos": [                     // 2 a 4 cifras destacadas
    { "valor": "45 min", "etiqueta": "desde Cali" },
    { "valor": "5", "etiqueta": "cabañas para dos" },
    { "valor": "18 °C", "etiqueta": "clima de montaña" }
  ]
}
```

---

## `home.cabanas`, `home.experiencias` — encabezados de sección

Misma forma para las dos:

```jsonc
{
  "antetitulo": "Alojamiento",
  "titulo": "Nuestras cabañas",
  "descripcion": "…",
  "cta_texto": "Ver todas las cabañas",
  "cta_href": "/alojamientos"
}
```

## `home.planes`

Igual que las anteriores **más** la nota legal de las tarifas y la foto de
fondo de las secciones oscuras:

```jsonc
{
  "antetitulo": "Planes y tarifas",
  "titulo": "Elige tu plan",
  "descripcion": "…",
  "nota": "Tarifas referenciales de temporada baja. Pueden variar en festivos y alta demanda. IVA incluido.",
  "imagen_fondo": "https://…",   // CAMPO NUEVO (sept. 2026)
  "cta_texto": "Reservar ahora",
  "cta_href": "/reservar"
}
```

**`imagen_fondo`** es la fotografía de bosque que se ve —bajo un velo de
petróleo, con bruma y el patrón de colibríes encima— detrás de la sección de
planes de la portada Y detrás del bloque de cierre de TODAS las páginas
internas. Antes esas zonas eran un verde plano. Cambiarla aquí las cambia
todas de golpe; conviene una foto cerrada y verde (con mucho cielo, el velo la
convierte en una mancha clara).

Los precios **no** se editan aquí: salen de la tabla `tarifas` y, para los
planes de día, de `planes.precio_base`.

---

## `home.esencia` — RETIRADA el 2026-09-15

La sección «Nuestra esencia» (la banda de verde claro con las tres fotos y las
frases del manual) **salió de la portada**: Cesar pidió acortarla y era la única
sección que no enseña el hotel, no da un precio y no lleva a reservar. Lo que
contaba es exactamente el trabajo de **«Sobre nosotros»** en `/conocenos`, que
sí se edita desde el panel (pantalla «Conócenos»).

La clave no la usaba ninguna otra página, así que salió del código
(`src/lib/contenido.ts`), del panel y de la tabla: el seed la borra
explícitamente (`delete from contenido where clave in ('home.esencia')`).
Ninguna de sus tres fotos quedó huérfana en el bucket —las tres seguían usándose
en la galería, en las instalaciones de Conócenos o en la ficha de la Cabaña 03—;
comprobado con `npm run imagenes:limpiar` (cero huérfanos).

## `home.instagram`

La tira de Instagram de la portada, **donde estaba la COP16**. Es lo último
antes del cierre.

```jsonc
{
  "antetitulo": "Instagram",
  "titulo": "La Finca, día a día",
  "descripcion": "…",
  "cta_texto": "Síguenos en Instagram",
  "reel_url": "https://www.instagram.com/reel/DbO8x0SxnFX/",   // permalink de la publicación
  "reel_alt": "…",                                             // qué se ve en el video
  "fotos": [                                                   // se muestran las 4 primeras
    { "url": "https://…", "alt": "…" }
  ]
}
```

- **Las fotos NO se traen de Instagram.** Son fotos del bucket. Un widget que
  lea el perfil de verdad exige una app de Meta y un token que caduca cada
  sesenta días: el día que caduque, la portada del hotel se queda con un hueco.
  Aquí las fotos son nuestras y lo único que enlaza al perfil es el `href`.
- **La primera foto es además el póster del reel.** Sale de este mismo arreglo
  para que, al cambiar las fotos desde el panel, el póster cambie con ellas.
- **El enlace del perfil y el arroba no están aquí**: salen de
  `sitio.contacto.instagram` e `instagram_usuario`.
- `reel_url` acepta cualquier forma del enlace que se copie desde la app
  (`/reel/…`, `/p/…`, `/tv/…`, con `?hl=es` o sin él). El sitio le quita los
  parámetros y le añade `embed/`. Si lo pegado **no** es una dirección de
  `instagram.com`, el reel no se pinta: un campo mal escrito no puede dejar un
  `<iframe>` apuntando a cualquier sitio.
- **El video no se descarga hasta que alguien lo toca.** Lo que se ve de entrada
  es la fotografía con un botón; al pulsarlo se inserta el `<iframe>` de
  Instagram. Con la portada recién abierta no hay ni una petición a
  `instagram.com` (verificado por CDP). Ver
  `src/components/sitio/reel-instagram.tsx`.

## `home.testimonios`

```jsonc
{
  "antetitulo": "Testimonios",
  "titulo": "Lo que cuentan quienes ya vinieron",
  "items": [
    { "texto": "…", "autor": "Angela Buitrago Schonhobel" }
  ]
}
```

Son reseñas **reales** de huéspedes. No llevan foto a propósito: las tres
imágenes `sitio/testimonios/*` del bucket son retratos genéricos que no
corresponden a las personas citadas, y poner una cara de archivo junto a un
nombre real sería engañoso. El sitio muestra las iniciales.

## `home.cta_final`

```jsonc
{
  "titulo": "¿Necesitas más razones para reservar?",
  "texto": "…",
  "cta_texto": "Reservar ahora",
  "cta_href": "/reservar",
  "imagen": "https://…",      // banda a sangre, HORIZONTAL
  "imagen_alt": "…"
}
```

---

## `heroes.listados`

Un objeto por página interna. Las siete claves son fijas: si el panel manda una
que no está en esta lista, se ignora.

```jsonc
{
  "alojamientos": { "titulo": "…", "subtitulo": "…", "imagen": "https://…", "imagen_alt": "…" },
  "experiencias": { … },
  "conocenos":    { … },   // era "el_lugar" hasta el renombrado de la página
  "galeria":      { … },
  "faq":          { … },
  "contacto":     { … },
  "reservar":     { … }
}
```

El `titulo` de cada uno es el `<h1>` de esa página. Es una decisión de SEO, no
solo de diseño: cambiarlo cambia el encabezado principal que lee Google.

**La foto tiene que medir al menos 1440 px de ancho.** Un hero ocupa el ancho
entero de la ventana y `next/image` **no amplía**: si el archivo mide menos, se
envía a su tamaño real y es el navegador el que lo estira. Es exactamente lo que
se veía borroso hasta el 2026-09-14, cuando tres cabeceras usaban fotos de
1086 px y una de 941. Las siete apuntan ahora a `web/heroes/…`, cortadas del
original a calidad 90 con `npm run imagenes:hero`. Al pegar una foto desde el
panel, mirar sus medidas antes: por debajo de 1440 px se va a ver blanda, y no
hay ajuste que lo arregle.

---

## `experiencias`

Las experiencias **con precio** (Aniversario con Amor, Cumpleaños con Amor y
Fondue) viven en la tabla `extras` y se editan en su propio módulo. Esta fila
guarda el texto de entrada y las experiencias que hoy se ofrecen **sin precio
publicado**.

> **El fondue pasó de «adicional» a «experiencia» el 2026-09-15.** Es una
> celebración para dos con precio por estadía, igual que las otras dos, y como
> adicional no salía en la portada y caía en la lista de texto junto a la segunda
> mascota. Es un cambio de datos (`extras.tipo`), reversible desde el panel.
> **Del fondue no hay foto:** se publica con una de ambiente (el comedor para dos
> de la Cabaña 05) hasta que el hotel envíe una real.

```jsonc
{
  "intro": "…",
  "adicionales_titulo": "Otras experiencias",
  "adicionales_descripcion": "…",
  "adicionales": [
    {
      "nombre": "Picnic en el bosque",
      "descripcion": "…",
      "imagen": "https://…",
      "imagen_alt": "…"
    }
  ]
}
```

Si mañana el cliente les pone precio, lo correcto es **moverlas a `extras`** y
vaciar `adicionales`, no duplicarlas.

---

## `faq`

```jsonc
{
  "intro": "…",
  "items": [
    { "pregunta": "¿Dónde estamos ubicados?", "respuesta": "…" }
  ]
}
```

Esta fila alimenta a la vez la página `/faq` **y los datos estructurados
`FAQPage`** que lee Google. Por eso las respuestas deben ser texto plano y
completo (nada de "ver más arriba"): lo que se publique aquí puede aparecer tal
cual en el buscador.

---

## `lugar`

```jsonc
{
  "antetitulo": "Sobre nosotros",
  "titulo": "…",
  "parrafos": ["…"],
  "imagen": "https://…",            // la de ARRIBA de la columna derecha
  "imagen_alt": "…",
  "imagen_secundaria": "https://…", // la de ABAJO (sept. 2026). Vacía = una sola foto
  "imagen_secundaria_alt": "…",

  "instalaciones_titulo": "Instalaciones",
  "instalaciones_descripcion": "…",
  "instalaciones": [
    {
      "nombre": "Zona húmeda",
      "descripcion": "…",
      "imagen": "https://…",
      "imagen_alt": "…",
      "imagen_posicion": "center bottom"   // opcional, ver más abajo
    }
  ],

  "llegar_titulo": "Cómo llegar",
  "llegar_parrafos": ["…"],
  "llegar_indicaciones": ["Km 18, vía Cali–Buenaventura…", "…"]   // lista con viñetas
}
```

**Las dos fotos de «Sobre nosotros» tienen que ser APAISADAS.** Desde el
2026-09-15 la columna de la derecha lleva dos, apiladas, y entre las dos ocupan
exactamente el alto del texto de al lado (comprobado a 1024, 1440 y 1920 px: cero
desfase arriba y abajo). Eso deja dos cajas anchas y bajas: una foto vertical
metida ahí se queda en una franja. Si `imagen_secundaria` va vacía, el bloque
vuelve a pintar una sola foto y sigue alineado.

El mapa embebido de esta página **no** se configura aquí: sale de
`sitio.contacto.mapa_embed`, para que exista en un solo sitio.

**`instalaciones[].imagen_posicion` es opcional** (campo nuevo, 2026-09-15):
`object-position` del recorte en la tarjeta, que es 4:3. Sin ella la foto
queda centrada, que es lo correcto casi siempre. Se añadió porque el Salón
multifuncional usa la foto del deck comedor —vertical, 2400×2720— y un
recorte centrado dejaba media tarjeta de techo de guadua; `"center bottom"`
sube el encuadre para enseñar la mesa y las sillas. De paso saca de cuadro el
sello de marca —vive en la esquina superior derecha de toda foto del hotel—
en vez de cortarlo a la mitad. Valores válidos: cualquier `object-position`
de CSS (`"center"`, `"center top"`, `"20% 80%"`…).

---

## `conocenos.reconocimiento`

**Se ve en `/conocenos`, no en la portada.** Estuvo en la portada hasta el
2026-09-14: un video de 2 min 49 s con locución no puede competir con el camino
a reservar en la única pantalla que todo el mundo ve. La clave se renombró con
la sección (migración `008`, que hace `update` sobre la fila existente para no
perder lo que el hotel hubiera editado desde el panel).

En el panel se edita en **«Conócenos»**, debajo del bloque de la historia.

```jsonc
{
  "antetitulo": "Reconocimientos",
  "titulo": "Somos COP16",
  "parrafos": ["…", "…"],
  "imagen": "https://…",       // PÓSTER del video (o la foto, si no hay video)
  "imagen_alt": "…",
  "video": "https://…/videos/sitio/cop16-la-finca.mp4",   // opcional
  "cta_texto": "Reservar ahora",
  "cta_href": "/reservar"
}
```

- `video` es la novedad de esta fila. Si trae una dirección, la sección pinta un
  `<video>` que arranca solo, silenciado y en bucle, con controles para subir el
  volumen —el clip de COP16 es una persona hablando, no un plano de ambiente—.
  Si va vacía, se pinta `imagen` como siempre.
- Los videos viven en un bucket aparte, `videos` (migración 007): mp4 y webm,
  hasta 60 MB. El campo del panel es de texto y NO sube archivos; la subida se
  hace con `npm run video:cop16 -- --origen <ruta> --subir` o desde Supabase.
- `imagen` deja de ser decorativa cuando hay video: es lo que se ve mientras el
  navegador decide si lo descarga, y en móvil (con `preload="metadata"`) puede
  ser lo único que se vea.

---

## `galeria`

```jsonc
{
  "intro": "…",
  "imagenes": [
    { "url": "https://…", "alt": "…", "ancho": 1448, "alto": 923 }
  ]
}
```

`ancho` y `alto` son **opcionales y nuevos** (sept. 2026): son las medidas en
píxeles del archivo original. Con ellas, el mosaico respeta la proporción real
de cada foto en vez de recortarla a una casilla, y el navegador reserva el
hueco exacto antes de descargarla. Una foto pegada a mano desde el panel puede
no traerlas: en ese caso se asume 4:3.

**La forma del jsonb NO cambió** con el rediseño de `/galeria`: sigue siendo
`url` + `alt`, sin campos nuevos. El editor de galerías del panel (el mismo
`EditorGaleria` de las cabañas) guarda exactamente estas dos claves, así que no
hay nada que tocar allí.

### Cómo se destaca una foto (sin campo `destacada`)

La página muestra **12 fotos por página** en un mosaico de piezas de distintos
tamaños. Qué foto sale grande **depende de su posición dentro de su página**, no
de una marca en la base. El patrón se repite igual en cada página completa:

| Posición en la página | Cómo se ve en escritorio |
|---|---|
| 1.ª | **Grande** (doble de ancho y de alto) |
| 2.ª | Alta (doble de alto) |
| 5.ª y 6.ª | Anchas (doble de ancho) |
| 7.ª | Alta |
| 8.ª | **Grande** |
| 11.ª y 12.ª | Anchas |
| 3.ª, 4.ª, 9.ª, 10.ª | Normales |

Consecuencia práctica para quien edita: **para destacar una foto, súbela a la
1.ª o la 8.ª posición de su página** (posiciones 1, 8, 13, 20, 25 y 32 del
arreglo completo). Y conviene seguir poniendo primero las de mayor resolución:
son las que se muestran grandes y una imagen pequeña estirada se ve blanda.

Se descartó a propósito añadir un campo `destacada`: el editor del panel guarda
solo `url` y `alt`, así que una clave extra se habría perdido en el primer
guardado —el sitio mostraría una foto destacada hasta que alguien tocara la
galería y entonces dejaría de estarlo, sin explicación—. El orden, en cambio, sí
lo controla el panel y ya se entiende.

La **última página casi nunca viene llena** (31 fotos = 12 + 12 + 7). Ahí no se
usa el patrón: el mosaico reparte las piezas que queden para que llenen todas
las filas, sin huecos. No hay que hacer nada especial al editar.

---

## `reservar`

Página puente mientras no exista el motor de reservas.

```jsonc
{
  "intro": "Empieza por tu cabaña: …",
  "pasos": [
    { "titulo": "Tu cabaña",          "texto": "…" },
    { "titulo": "Tus fechas",         "texto": "…" },
    { "titulo": "Tu plan",            "texto": "…" },
    { "titulo": "Tus experiencias",   "texto": "…" },
    { "titulo": "Cuánto pagas ahora", "texto": "…" }
  ],
  "nota": ""
}
```

La forma de la clave **no cambió**: sigue siendo `intro`, una lista de `pasos`
con `titulo` y `texto`, y `nota`. El título va **sin número**: la tarjeta ya pinta
su círculo numerado.

**Los pasos tienen que describir el flujo REAL del selector.** Desde el
**2026-10-03** es **cabaña → fechas → plan → experiencias → cuánto se paga**: la
cabaña va primero porque la disponibilidad es de cada cabaña y el calendario
tacha las noches ocupadas de la elegida (antes era fechas → cabaña y se elegía a
ciegas). El primer paso nombra también el **Día de Calma**, que se elige ahí
mismo, al nivel de las cabañas. El plan solo se pregunta si la estadía incluye
noches de fin de semana o festivos; entre semana sale solo de la fecha.

El cambio de orden se llevó a la base con `scripts/actualizar-pasos-reservar.mjs`,
que solo reemplaza `intro` y `pasos` si siguen siendo exactamente el texto
anterior del seed: si el hotel los editó desde el panel, no los toca y lo dice.

Historia: antes del 2026-09-15 eran tres pasos «cabaña → plan → confirmamos»;
el remate «Confirmamos y reservas con el 50 %» como cuarto paso mentía, porque en
la pantalla no había un cuarto paso.

`nota` va **vacía**. Contenía «En La Finca no hay datáfono ni manejamos efectivo,
y nunca pedimos datos de tarjeta por WhatsApp. Muy pronto vas a poder reservar y
pagar en línea desde esta misma página», y Cesar pidió retirarla: la primera
mitad ya está en las preguntas frecuentes y en los términos, y la segunda
prometía una fecha que nadie ha fijado. El campo se conserva para que el hotel
pueda publicar un aviso puntual desde el panel; vacío, el bloque no se pinta.

---

## `no_encontrado`

```jsonc
{
  "titulo": "Esta página se perdió en la neblina",
  "mensaje": "…",
  "cta_texto": "Volver al inicio",
  "cta_href": "/",
  "imagen": "https://…",
  "imagen_alt": "…"
}
```

Al editarla hay que revalidar también `/_not-found`:

```ts
revalidatePath("/_not-found");
```

---

## `legal.privacidad`, `legal.terminos`, `legal.datos`, `legal.cancelacion`

Los cuatro documentos legales. Tienen **exactamente la misma forma** y un solo
editor en el panel (Contenido del sitio → «Documentos legales»).

```jsonc
{
  "titulo": "Política de privacidad",
  "entrada": "Cómo tratamos la información de quienes visitan este sitio…",
  "descripcion": "Resumen para Google. No se ve en la página.",
  "actualizado": "2026-09-11",           // AAAA-MM-DD, se publica bajo el título
  "secciones": [
    {
      "titulo": "1. Quiénes somos",
      "parrafos": [
        "La Finca Eco Hotel (RNT 114565) es el responsable de…",
        "- Primer punto de una lista\n- Segundo punto\n- Tercero"
      ]
    }
  ]
}
```

**Las listas de viñetas son un párrafo con una convención.** Un párrafo cuyas
líneas empiezan TODAS por `- ` (y tiene más de una línea) se pinta como lista de
viñetas; cualquier otro, como párrafo. Así el documento entero se edita con
cajas de texto normales —una sección, una caja, párrafos separados por línea en
blanco— sin un editor de bloques. La regla vive en `esLista()` e
`itemsDeLista()`, en `src/lib/legal.ts`.

Notas:

- La **ruta** de cada documento no se edita: es la dirección del sitio y vive en
  `RUTA_LEGAL` (`src/lib/legal.ts`).
- El **texto por defecto** —el que publica el sitio si la fila no existe o queda
  vacía— también está en `src/lib/legal.ts`, y de ahí sale el seed.
- El responsable (Raquel Lenis García · NIT 66830269-5) y el correo también están en texto plano dentro de estos documentos; el pie y el JSON-LD los leen de `SITIO.responsable` (`src/lib/sitio.ts`), no del CMS.
- ⚠ El número de WhatsApp y la dirección que aparecen **dentro** del texto legal
  son texto plano. Antes se interpolaban desde `sitio.contacto`; al pasar el
  texto al CMS dejaron de estar ligados. Si el hotel cambia de número, hay que
  corregir también estos cuatro documentos.
- Al guardar se revalidan las cuatro rutas `/legal/*` (`revalidarSitioPublico()`).

---

## Añadir una clave nueva

1. Definir el tipo y el respaldo en `src/lib/contenido.ts`.
2. Añadir la clave al arreglo `CLAVES_CONTENIDO` y crear su getter con `cache()`.
3. Regenerar el seed con `npm run seed:contenido` (el SQL NO se edita a mano).
4. **Documentarla aquí.** Una clave sin documentar es una clave que el panel no
   va a poder editar.
