/**
 * Tipografía del sitio — PUNTO ÚNICO DE CAMBIO.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO ESTÁ "INTRO"
 * ---------------------------------------------------------------------------
 * El sitio actual (WordPress/Divi) usa la familia comercial **Intro**
 * (Fontfabric), cargada como `@font-face` desde archivos `.otf` subidos al
 * propio WordPress. Es una fuente de pago y todavía no tenemos constancia de
 * que el cliente tenga licencia para usarla en el sitio nuevo
 * (ver `docs/MARCA.md`). Mientras tanto se usa una sustituta de Google Fonts.
 *
 * CÓMO SE CAMBIA A "INTRO" CUANDO LLEGUE LA LICENCIA
 * --------------------------------------------------
 * 1. Copiar los archivos de la fuente (idealmente `.woff2`) a
 *    `src/app/fuentes/` — por ejemplo `Intro-Book.woff2`, `Intro-Bold.woff2`.
 * 2. En ESTE archivo, sustituir el bloque de `fuenteTitulos` por:
 *
 *        import localFont from "next/font/local";
 *
 *        export const fuenteTitulos = localFont({
 *          src: [
 *            { path: "../app/fuentes/Intro-Book.woff2",  weight: "400", style: "normal" },
 *            { path: "../app/fuentes/Intro-Bold.woff2",  weight: "700", style: "normal" },
 *            { path: "../app/fuentes/Intro-Black.woff2", weight: "900", style: "normal" },
 *          ],
 *          variable: "--fuente-titulos",
 *          display: "swap",
 *        });
 *
 * 3. No hay que tocar nada más: `globals.css` lee `--fuente-titulos` y todos
 *    los componentes usan la utilidad `font-titulo`.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ MANROPE
 * ---------------------------------------------------------------------------
 * De las tres candidatas (Sora, Manrope, Figtree), Manrope es la que más se
 * acerca a Intro: geométrica-humanista, de trazo uniforme, con terminales
 * rectos y una "a" de un solo piso. Sora tiene detalles demasiado técnicos
 * (la "g", la "y") para un hotel de montaña, y Figtree es más redonda y
 * juvenil de lo que pide el isotipo del ave. Manrope además viene con eje
 * variable 200–800, lo que da una jerarquía de títulos amplia con un solo
 * archivo.
 *
 * El CUERPO va en Inter: neutra, altísima legibilidad en párrafos largos y
 * pantallas pequeñas, y emparienta bien con el aire "iOS" del diseño.
 */
import { Inter, Manrope } from "next/font/google";

/** Titulares, navegación y cifras destacadas. */
export const fuenteTitulos = Manrope({
  subsets: ["latin"],
  variable: "--fuente-titulos",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

/** Cuerpo de texto, formularios y elementos de interfaz. */
export const fuenteCuerpo = Inter({
  subsets: ["latin"],
  variable: "--fuente-cuerpo",
  display: "swap",
});

/** Clases que el layout raíz pone en `<html>` para publicar las variables. */
export const clasesDeFuentes = `${fuenteTitulos.variable} ${fuenteCuerpo.variable}`;
