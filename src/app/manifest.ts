import type { MetadataRoute } from "next";

import { SITIO } from "@/lib/sitio";

/**
 * El manifiesto de la aplicación web (`/manifest.webmanifest`).
 *
 * ---------------------------------------------------------------------------
 * PARA QUÉ SIRVE EN UN HOTEL
 * ---------------------------------------------------------------------------
 * No es para convertir el sitio en una app: es lo que Android lee cuando
 * alguien pulsa «Añadir a la pantalla de inicio» desde el WhatsApp del hotel, y
 * también lo que decide **de qué color pinta Chrome la barra del sistema**
 * mientras se navega. Sin él, esa barra queda blanca y el sitio empieza con una
 * franja que no es de la marca.
 *
 * ---------------------------------------------------------------------------
 * DECISIONES
 * ---------------------------------------------------------------------------
 * · `display: "browser"`, no `"standalone"`. El sitio se lee como un sitio:
 *   quien lo abra desde el icono espera poder compartir la dirección y volver
 *   atrás. Un modo sin barra de navegación esconde esas dos cosas.
 * · `theme_color` es el petróleo del manual (`#027570`), el mismo de la cápsula
 *   de navegación; `background_color` es el crema de fondo del sitio.
 * · Los iconos apuntan a `/icon.png` y `/apple-icon.png`, que genera
 *   `npm run marca:iconos` desde el isotipo oficial. Next les pone su propio
 *   hash de versión en la cabecera, pero en el manifiesto la ruta estable es la
 *   correcta: se pide una vez, al instalar.
 * · `maskable` en el de 512: Android recorta el icono a la forma del sistema
 *   (círculo, cuadrado redondeado, gota). Como el ave va centrada dentro de un
 *   cuadrado de petróleo con márgenes, cualquier recorte cae en el fondo y no
 *   en el dibujo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITIO.nombre,
    short_name: "La Finca",
    description:
      "Ecohotel en el bosque de niebla del Km 18, a 45 minutos de Cali. Cinco cabañas para dos con jacuzzi privado.",
    lang: "es-CO",
    start_url: "/",
    display: "browser",
    theme_color: "#027570",
    background_color: "#fefbf7",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
