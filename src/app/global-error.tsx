"use client";

import { useEffect, type CSSProperties } from "react";

import { MENSAJE_GENERAL, enlaceWhatsapp } from "@/lib/whatsapp";

/**
 * El último recurso: se pinta cuando falla el propio layout raíz (o el de un
 * grupo) y ninguna otra página de error puede hacerlo.
 *
 * Reemplaza al layout raíz entero, así que trae su propio `<html>` y `<body>`
 * y NO cuenta con nada de lo que este carga: ni la hoja de estilos, ni las
 * fuentes, ni la cabecera. Por eso los estilos van en línea y son pocos —los
 * colores de la marca y aire—: tiene que verse digna aunque no cargue nada
 * más. Sirve tanto al sitio como al panel, de ahí que el texto no dé por
 * hecho ninguno de los dos.
 */
export default function ErrorGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global] la página no se pudo cargar:", error);
  }, [error]);

  const boton: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "0 24px",
    borderRadius: 999,
    fontSize: 16,
    fontWeight: 600,
    textDecoration: "none",
    cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <html lang="es">
      <head>
        <title>Algo falló · La Finca Eco Hotel</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          boxSizing: "border-box",
          background: "#f7f3ea",
          color: "#2b2620",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <main
          role="alert"
          style={{
            maxWidth: 480,
            width: "100%",
            background: "#ffffff",
            borderRadius: 20,
            padding: "40px 24px",
            boxShadow: "0 1px 2px rgba(43,38,32,0.06), 0 8px 24px rgba(43,38,32,0.08)",
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#027570",
            }}
          >
            La Finca Eco Hotel
          </p>
          <h1 style={{ margin: "12px 0 0", fontSize: 26, lineHeight: 1.25 }}>
            Algo falló al cargar la página
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 16, lineHeight: 1.6, color: "#5c544a" }}>
            Puede ser la conexión o una falla momentánea de nuestro lado.
            Vuelve a intentarlo en unos segundos. Si quieres reservar o tienes
            una pregunta, escríbenos por WhatsApp.
          </p>

          <div
            style={{
              marginTop: 28,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{ ...boton, border: 0, background: "#027570", color: "#ffffff" }}
            >
              Reintentar
            </button>
            <a
              href={enlaceWhatsapp(MENSAJE_GENERAL)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...boton,
                border: "1.5px solid #027570",
                background: "transparent",
                color: "#027570",
              }}
            >
              Escribir por WhatsApp
            </a>
            {/* `<a>` y no `<Link>`: con el layout raíz caído, mejor una carga
                completa que una navegación del lado del cliente. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ marginTop: 6, fontSize: 14, color: "#027570" }}>
              Volver al inicio
            </a>
          </div>

          {error.digest ? (
            <p style={{ margin: "24px 0 0", fontSize: 12, color: "#8a8176", fontFamily: "monospace" }}>
              Código del error: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
