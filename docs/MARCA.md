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
