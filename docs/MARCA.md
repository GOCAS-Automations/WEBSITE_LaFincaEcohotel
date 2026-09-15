# Marca — La Finca Eco Hotel

> Identificado a partir del logo (`assets/logo/`) y del CSS compilado del sitio actual (Divi / WordPress) el 2026-09-02.

## Logo

El sitio usa un isotipo (sin texto/wordmark): una silueta estilizada de un **ave en vuelo**, coherente con el texto del hero ("Sumérgete en un bosque rodeado de neblina y aves"). Se encontraron dos variantes de color del mismo trazo:

| Archivo | Uso en el sitio original | Color | Resolución |
|---|---|---|---|
| `assets/logo/LOGO-PRINCIPAL-21.webp` (+ `.png`) | Logo del header (WordPress `custom_logo`) en las páginas secundarias `/services`, `/about-us`, `/contact` | Verde oliva `#5e6033` | 513×513 px, WebP con transparencia |
| `assets/logo/ICONO-21-original.webp` (+ `.png`) | Favicon / site icon (fuente del recorte `cropped-ICONO-21-*.webp` usado en `<link rel="icon">`) | Verde azulado / petróleo `#027570` | 513×513 px, WebP con transparencia |
| `assets/logo/cropped-ICONO-21-270x270.webp` | Variante recortada cuadrada del favicon (tamaño 270×270 generado por WordPress) | `#027570` | 270×270 px |
| `assets/logo/instagram_profile_100.jpg` | Foto de perfil de Instagram @lafinca_cali (complemento) | Ave blanca sobre fondo sólido petróleo `#027570` | Solo 100×100 px — Instagram no entregó una versión de mayor resolución sin autenticación (ver Inventario) |

**Importante:** en la página de inicio (Home) actual **no se muestra ningún logo** — el header/menú de la home no tiene logo configurado; el logo solo aparece en las 3 páginas secundarias de relleno del tema. Esto es probablemente un descuido de la configuración del sitio actual, no una decisión de diseño. Vale la pena confirmarlo con el cliente para el nuevo sitio (lo más probable es que sí deba mostrarse el logo de forma consistente).

Ambas variantes de color parecen ser usos válidos de marca (un "modo oscuro sobre claro" en verde oliva para el header, y un "modo sólido/monocromo" en petróleo para favicon y redes sociales). Para el nuevo sitio se recomienda unificar en un solo color primario de marca y usar el otro como variante secundaria/alterna.

## Paleta de colores

Colores con evidencia de uso deliberado en el sitio (no defaults de WordPress ni de la librería de colores de Gutenberg):

| Color | Hex | Uso identificado |
|---|---|---|
| 🟢 Verde petróleo / teal oscuro | `#027570` | Color del isotipo (favicon), borde de submenús (`.nav li ul{border-color:#027570}`), fondo sólido de la foto de perfil de Instagram. **Candidato a color primario de marca.** |
| 🫒 Verde oliva | `#5e6033` | Color del isotipo usado como logo de header en páginas secundarias. **Candidato a color secundario / alterno del logo.** |
| 🟡 Dorado / mostaza | `#9f6301` | Resalta el precio de la tarifa "Premium" ($650.000) y el texto de un ítem del acordeón de precios. Color de acento puntual. |
| 🤍 Crema / blanco cálido | `#fefbf7` | Fondo de varias secciones (incluye la sección de testimonios) — usado en vez de blanco puro. |
| 🔵 Azul (posible default sin personalizar) | `#2ea3f2` | Color de enlaces (`a{color:#2ea3f2}`), color del ítem de menú activo, y fondo de respaldo detrás del banner principal. **Ojo:** este es el azul "Ocean Blue" que trae el tema Divi por defecto — no hay evidencia de que haya sido elegido intencionalmente como color de marca (no aparece en el logo ni se repite en otros elementos gráficos). Se recomienda confirmar con el cliente si debe conservarse o reemplazarse por un tono coherente con el verde del logo. |
| ⚫ Grises neutros | `#333`, `#555`, `#666`, `#ccc`, `#ddd`, `#eee` | Textos secundarios y bordes — grises estándar de UI, no distintivos de marca. |

Colores descartados del análisis por ser parte de la paleta por defecto del editor de bloques de WordPress (Gutenberg), sin relación con la marca: `#cf2e2e`, `#9b51e0`, `#3ee5d5`, `#29c4a9`, `#7bdcb5`, `#00d084`, `#8ed1fc`, `#0693e3`, `#f78da7`, `#ff6900`, `#fcb900`, `#abb8c3`.

### Paleta recomendada para el nuevo sitio (sugerida, a validar con el cliente)
- Primario: `#027570` (verde petróleo, viene del propio isotipo)
- Secundario/alterno: `#5e6033` (verde oliva, la otra variante real del isotipo)
- Acento cálido: `#9f6301` (dorado, ya usado puntualmente para precios/detalles premium)
- Fondo neutro cálido: `#fefbf7`
- Texto oscuro: `#333333`

## Tipografías

El sitio usa una **fuente personalizada llamada "Intro"**, cargada como `@font-face` desde archivos `.otf` propios del cliente (no es una fuente de Google Fonts ni del sistema):

```
https://lafincaecohotel.com/wp-content/uploads/et-fonts/Intro-Light-Alt.otf
https://lafincaecohotel.com/wp-content/uploads/et-fonts/Intro-Book-Alt.otf
https://lafincaecohotel.com/wp-content/uploads/et-fonts/Intro-Regular-Alt.otf
https://lafincaecohotel.com/wp-content/uploads/et-fonts/Intro-Bold-Alt.otf
https://lafincaecohotel.com/wp-content/uploads/et-fonts/Intro-Black-Alt.otf
```

Pesos disponibles: **Light, Book, Regular, Bold, Black**. Familia declarada en CSS como `"Intro Light"`, `"Intro Book"`, `"Intro Regular"`, `"Intro Bold"`, `"Intro Black"` (cada peso registrado como una familia de fuente separada, típico de Divi con fuentes subidas manualmente), con fallback `Helvetica, Arial, Lucida, sans-serif`.

- **Header / menú de navegación:** `Intro Light`
- **Encabezados (Bold/Black) y textos destacados:** `Intro Bold` / `Intro Black` (según el módulo de Divi)
- **Cuerpo de texto (párrafos):** `Open Sans, Arial, sans-serif` (fuente por defecto de Divi, cargada desde Google Fonts — no parece haber sido reemplazada por una fuente de marca para el cuerpo del texto)

Los archivos `.otf` de "Intro" están hospedados en el propio WordPress; **no se descargaron** en este scraping (son archivos de fuente, no imágenes/contenido visual, y quedan fuera del alcance de "imágenes del sitio"), pero sus URLs quedan documentadas arriba por si se necesitan para replicar la tipografía exacta en el nuevo sitio. Nota: "Intro" es una fuente comercial (de  fontfabric); habría que verificar que el cliente tenga la licencia antes de reutilizarla en el nuevo sitio, o sustituirla por una alternativa de Google Fonts con look similar (p. ej. "Poppins" o "Montserrat" para los encabezados condensados/geométricos).

---

> ⚠️ **Todo lo de arriba es el análisis del sitio VIEJO** (el WordPress, 2026-09-02),
> hecho cuando no había ni manual de marca ni archivos del diseñador. Se conserva
> como historia: explica de dónde salieron el dorado `#9f6301` y el azul de Divi que
> el sitio nuevo retiró. **Lo que manda hoy es lo que viene a continuación** y §1 de
> `docs/DATOS_CLIENTE.md`.

# Los archivos de marca oficiales (2026-09-14)

> Qué archivo de marca es cada cosa, dónde vive y para qué se usa.
> La fuente de verdad del **diseño** es el manual `IV LA FINCA.pdf` y §1 de
> `docs/DATOS_CLIENTE.md`. Este documento es la fuente de verdad de los
> **archivos**.

## 1. Los logotipos oficiales

El diseñador (Santiago) entregó **seis variantes**, en PNG de 1080×1080 y en JPG
de 2250×2250, en
`EcoHotel - La Finca/Insumos/LOGOS LA FINCA/`.

**Se copiaron al repositorio solo los PNG**, que son los que tienen canal alfa;
los JPG son las mismas seis piezas con el fondo aplanado y no aportan nada que
el sitio pueda usar. Viven en `public/marca/oficial/`.

| Archivo del diseñador | Nombre en el repositorio | Qué es | Fondo |
|---|---|---|---|
| `LOGO LA FINCA-01.png` | `logo-vertical-petroleo.png` | Lockup completo (colibrí + «LA FINCA» + «Eco - Hotel»), **petróleo `#027570`** | Transparente |
| `LOGO LA FINCA-02.png` | `logo-vertical-crema-sobre-oliva.png` | Lockup completo en crema | Oliva `#5E6033`, sólido |
| `LOGO LA FINCA-03.png` | `logo-vertical-crema-sobre-petroleo.png` | Lockup completo en crema | Petróleo `#027570`, sólido |
| `LOGO LA FINCA-04.png` | `isotipo-oliva-sobre-verde.png` | Solo el colibrí, en oliva | Verde claro, sólido |
| `LOGO LA FINCA-05.png` | `isotipo-petroleo.png` | Solo el colibrí, **petróleo** | Transparente |
| `LOGO LA FINCA-06.png` | `isotipo-verde-sobre-oliva.png` | Solo el colibrí, en verde claro | Oliva, sólido |

### Lo que NO llegó, y hay que seguir pidiendo

- **No hay vectorial.** Ni SVG, ni AI, ni EPS. Todo lo que el sitio necesite a
  más de 1080 px hay que ampliarlo, y eso se nota. Sigue pendiente (§9 de
  `docs/DATOS_CLIENTE.md`).
- **No hay lockup horizontal.** Las seis variantes son apiladas (colibrí arriba,
  texto debajo). Donde hace falta ancho —la barra de navegación— se sigue usando
  la composición propia del sitio.
- **No hay versión en blanco puro sobre transparente.** Las dos claras (02 y 03)
  traen el fondo horneado. Cuando hace falta el logotipo claro sobre una
  fotografía, se **tiñe** la variante 01 con una máscara alfa: se pinta el color
  y se recorta con el PNG (`blend: "dest-in"`). Así la silueta y el suavizado de
  los bordes son exactamente los del archivo del diseñador —no se redibuja ni se
  deforma nada, que es justo lo que el manual prohíbe—, solo cambia el color.

## 2. Dónde se usa cada uno

| Superficie | Archivo | Generado por |
|---|---|---|
| Icono de pestaña y de escritorio (`/icon.png`, 512×512) | `isotipo-petroleo.png` | `npm run marca:iconos` |
| Icono de iOS (`/apple-icon.png`, 180×180) | `isotipo-petroleo.png` | `npm run marca:iconos` |
| `favicon.ico` (16, 32, 48 px) | `isotipo-petroleo.png` | `npm run marca:iconos` |
| Tarjeta al compartir el enlace (OpenGraph, 1200×630) | `logo-vertical-petroleo.png` teñido en crema | `npm run imagenes:social` |
| **Barra de navegación y pie** | `public/marca/icono.png` + wordmark propio | — (sin cambios) |

### Por qué el nav NO cambió

A Cesar le gusta como está. La cápsula de navegación usa `public/marca/icono.png`
—el isotipo provisional que se extrajo del Instagram del hotel— junto al wordmark
compuesto en HTML, y esa combinación funciona en horizontal, que es lo que la
barra necesita y lo que ninguna de las seis variantes oficiales ofrece.

Cuando llegue el **vectorial**, ese es el momento de rehacerlo: con un SVG se
puede componer el lockup horizontal a cualquier tamaño sin perder nitidez.

## 3. Los iconos del sitio

`npm run marca:iconos` (`scripts/generar-iconos.mjs`) genera los tres archivos.
Las decisiones, en corto —el porqué largo está en la cabecera del script—:

- **Ave en verde claro sobre un cuadrado de petróleo**, no el isotipo suelto. El
  colibrí en petróleo sobre el fondo blanco de una pestaña se lee como una
  mancha, y sobre un navegador en modo oscuro desaparece. Invertido es una
  **forma** reconocible en los dos temas, que es lo único que se le puede pedir
  a 16 píxeles. Es además la combinación que el manual usa sobre fondo oscuro.
- **El ave crece en los tamaños pequeños** (92 % del lienzo a 16 px frente al
  66 % a 512). Los trazos del colibrí son muy finos: manteniendo el margen, a
  16 px las alas se deshacen.
- Los tres archivos van en **`src/app/`**, no en `public/`. Next los descubre por
  el nombre y escribe él los `<link>` con su hash de versión. Tener además uno en
  `public/` sería garantizar que algún día alguien cambie el que no se usa.
- **`metadata.icons` NO se declara en `src/app/layout.tsx`.** Un `icons` escrito
  a mano reemplaza a los que Next descubre por convención; el bloque que había
  allí apuntaba al isotipo provisional y ganaba a los archivos oficiales.

⚠️ **A 16 px el colibrí sigue siendo una mancha.** Es el límite del dibujo, no
del script: un ave de línea fina no cabe en 16 píxeles. A 32 y 48 se lee bien, y
esos son los tamaños que usan hoy Chrome, Firefox y Safari. Si algún día importa,
lo que hace falta es un **isotipo simplificado para tamaños pequeños**, y eso lo
tiene que dibujar Santiago.

## 4. La tarjeta al compartir el enlace (OpenGraph)

`npm run imagenes:social` (`scripts/generar-imagen-social.mjs`) compone
1200×630 con:

1. **El hero de escritorio de la portada** (`web/heroes/portada-escritorio.webp`)
   — el corredor techado abierto al valle. Se elige porque **ya viene sin el
   sello de marca**: las 53 fotos del Drive llevan pegada una pegatina circular
   con el isotipo en la esquina superior derecha, y en una tarjeta social eso
   sale como una mancha al lado del logotipo. (Se vio en la primera prueba con
   `web/zonas-comunes/02.webp`, la foto que se usaba antes.) Y mide 2400×1180,
   casi la proporción exacta de la tarjeta.
2. **Velo de petróleo en degradado**, más denso abajo, y un resplandor en la
   esquina superior derecha: es lo que mete la fotografía en la paleta del
   manual y le da contraste al logotipo.
3. **El logotipo oficial completo** (variante 01) teñido en crema. Sustituye al
   wordmark que se componía a mano en SVG con una tipografía de sistema.
4. Una línea con la ubicación, esa sí en tipografía de sistema: no es marca, es
   un pie de foto.

**Ruta en el bucket:** `sitio/social/tarjeta-og-marca-oficial-1200x630.webp`.

Cambió de nombre al entrar el logotipo oficial. No es un descuido: en el bucket
de La Finca **ninguna imagen se sobrescribe** —una URL siempre devuelve el mismo
archivo, y por eso se sirven con un año de caché—, así que una tarjeta distinta
es una ruta distinta. Se pudo hacer justo ahora porque el sitio todavía no está
publicado (`SITIO_PUBLICADO=0`) y nadie ha compartido aún el enlace: no hay
ninguna previsualización cacheada en WhatsApp o Facebook que se quede mostrando
la vieja. **De aquí en adelante, esta dirección se queda quieta.** La anterior
(`tarjeta-og-1200x630.webp`) se borró del bucket.

### Se edita desde el panel

La tarjeta vive en el CMS, en la clave **`sitio.seo`** → «Imagen al compartir el
enlace» (panel → Contenido del sitio → Sitio). El campo es un `CampoImagen`: se
puede **subir un archivo o pegar una dirección**. El valor de
`IMAGEN_SOCIAL` en `src/lib/sitio.ts` es solo el **respaldo** —lo que se publica
si la base no responde durante el build— y el valor con el que nace la fila del
seed.

⚠️ **Hasta esta ronda, esa edición solo afectaba a la portada.** `metadatosPagina()`
era una función síncrona y las otras doce páginas caían al respaldo escrito en
código: el hotel podía cambiar la imagen y ver que el enlace de la portada se
actualizaba mientras el de `/alojamientos` seguía mostrando la vieja. Ahora la
función es `async` y lee `getSeoSitio()`, que va envuelto en el `cache()` de
React y no cuesta una consulta más.

**El orden de precedencia es:** la foto que la página declare (la de una cabaña,
la cabecera de una sección) → la del panel → el respaldo del código.

## 5. Colores, para no tener que buscarlos

| Nombre | Hex | Dónde |
|---|---|---|
| Petróleo | `#027570` | PANTONE 3272 C · `petroleo-600`, `theme_color` del manifiesto, fondo de los iconos |
| Oliva | `#5E6033` | PANTONE 7763 C · `oliva-600` |
| Verde claro | `#E8F4D9` | `brote-100` · el ave de los iconos, la banda de «Nuestra esencia» |
| Crema de fondo | `#fefbf7` | `crema-50` · `background_color` del manifiesto |

**No hay dorado en la paleta oficial.** El `#9F6301` salió del WordPress viejo y
solo queda definido para el panel `/admin`.
