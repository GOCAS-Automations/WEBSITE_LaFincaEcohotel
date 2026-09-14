# Claves del CMS — contrato entre el sitio público y el panel

> Este documento es el **contrato**. El panel administrativo (módulo 1,
> "Contenido del sitio") edita las filas de la tabla `contenido`; el sitio
> público las lee desde `src/lib/contenido.ts`. Si aquí no está, el sitio no lo
> pinta.
>
> Última revisión: 2026-09-02 · 18 claves.

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
| `home.esencia` | Portada, naturaleza | `getEsencia()` |
| `home.reconocimiento` | Portada, COP16 | `getReconocimiento()` |
| `home.testimonios` | Portada, testimonios | `getTestimonios()` |
| `home.cta_final` | Portada, cierre | `getCtaFinal()` |
| `heroes.listados` | Cabecera de las 7 páginas internas | `getHeroesListados()` |
| `experiencias` | `/experiencias` | `getContenidoExperiencias()` |
| `faq` | `/faq` (y el JSON-LD `FAQPage`) | `getFaq()` |
| `lugar` | `/conocenos` | `getLugar()` |
| `galeria` | `/galeria` | `getGaleria()` |
| `reservar` | `/reservar` | `getReservar()` |
| `no_encontrado` | Página 404 | `getNoEncontrado()` |

Lo que **no** vive aquí: las cabañas, los planes, las tarifas y las
experiencias con precio son tablas propias (`alojamientos`, `planes`,
`tarifas`, `extras`, `imagenes`) y tienen su propio módulo en el panel. Los
textos legales viven en código (`src/components/paginas/legal.tsx`), porque son
documentos, no contenido de marketing.

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
  "correo": "",                            // vacío = no se muestra
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

## `home.esencia`

```jsonc
{
  "antetitulo": "Naturaleza",
  "titulo": "Encontramos un bosque de neblina",
  "parrafos": ["…", "…"],
  "imagenes": [                       // exactamente 3 se ven bien; con menos, la fila se recompone
    { "url": "https://…", "alt": "…", "ancho": 1448, "alto": 923 }
  ]
}
```

## `home.reconocimiento`

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

---

## `experiencias`

Las experiencias **con precio** (Aniversario y Cumpleaños con Amor) viven en la
tabla `extras` y se editan en su propio módulo. Esta fila guarda el texto de
entrada y las experiencias que hoy se ofrecen **sin precio publicado**.

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
  "imagen": "https://…",
  "imagen_alt": "…",

  "instalaciones_titulo": "Instalaciones",
  "instalaciones_descripcion": "…",
  "instalaciones": [
    {
      "nombre": "Zona húmeda",
      "descripcion": "…",
      "imagen": "https://…",
      "imagen_alt": "…"
    }
  ],

  "llegar_titulo": "Cómo llegar",
  "llegar_parrafos": ["…"],
  "llegar_indicaciones": ["Km 18, vía Cali–Buenaventura…", "…"]   // lista con viñetas
}
```

El mapa embebido de esta página **no** se configura aquí: sale de
`sitio.contacto.mapa_embed`, para que exista en un solo sitio.

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
  "intro": "…",
  "pasos": [
    { "titulo": "1. Elige tu cabaña", "texto": "…" }
  ],
  "nota": ""
}
```

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

## Añadir una clave nueva

1. Definir el tipo y el respaldo en `src/lib/contenido.ts`.
2. Añadir la clave al arreglo `CLAVES_CONTENIDO` y crear su getter con `cache()`.
3. Añadir la fila a `supabase/seed/002_contenido.sql` (con `on conflict do update`).
4. **Documentarla aquí.** Una clave sin documentar es una clave que el panel no
   va a poder editar.
