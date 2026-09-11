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
 * UNA SOLA FAMILIA PARA TODO (septiembre de 2026)
 * -----------------------------------------------
 * El cuerpo iba en Inter. Se unificó en Manrope por dos motivos, y el de diseño
 * pesa más que el de rendimiento:
 *
 *   1. **El manual usa una sola familia.** Intro Alt compone los titulares y
 *      también los párrafos de misión y visión. Mezclar dos tipografías era una
 *      decisión nuestra, no de la marca, y la sustituta tiene que imitar el
 *      sistema real en vez de inventarse otro.
 *   2. Inter sumaba 48 kB de tipografía en prioridad máxima solo para el
 *      cuerpo. Manrope ya se descargaba para los titulares y tiene el mismo eje
 *      variable, así que el cuerpo pasa a ser gratis. En el móvil de Lighthouse
 *      eso movió el LCP de la portada casi un segundo.
 *
 * Siguen siendo DOS variables CSS (`--fuente-titulos` y `--fuente-cuerpo`)
 * apuntando hoy a la misma fuente: el día que llegue la licencia de Intro basta
 * con cambiar estas dos declaraciones y el sistema entero se mueve con ellas.
 */
import { Manrope } from "next/font/google";

/**
 * Titulares, navegación y cifras destacadas.
 *
 * SIN `weight`: así `next/font` sirve el archivo VARIABLE de Manrope, uno solo
 * que cubre el eje 200–800 entero. Con la lista de cinco pesos que había antes
 * descargaba cinco instancias estáticas, 48 kB en total y en prioridad máxima.
 * En un móvil con 4G eso retrasaba el intercambio de fuente hasta los 4,5 s, y
 * como el titular del hero se repinta al llegar la tipografía, ESE repintado
 * era el LCP de la portada. Con el variable, el mismo rango de pesos pesa la
 * mitad y llega mucho antes.
 */
export const fuenteTitulos = Manrope({
  subsets: ["latin"],
  variable: "--fuente-titulos",
  display: "swap",
});

/** Cuerpo de texto, formularios y elementos de interfaz: la MISMA Manrope. */
export const fuenteCuerpo = Manrope({
  subsets: ["latin"],
  variable: "--fuente-cuerpo",
  display: "swap",
});

/** Clases que el layout raíz pone en `<html>` para publicar las variables. */
export const clasesDeFuentes = `${fuenteTitulos.variable} ${fuenteCuerpo.variable}`;
