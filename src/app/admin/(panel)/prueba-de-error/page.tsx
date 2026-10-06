import type { Metadata } from "next";

/**
 * Falla A PROPÓSITO, para poder revisar la página de error del panel
 * (`../error.tsx`) sin esperar a que se caiga la base de verdad. La usa la
 * guía de pruebas (`docs/GUIA_PRUEBAS.md`, §5).
 *
 * Está detrás del inicio de sesión del panel como todo lo demás, no lee ni
 * escribe nada y lo único que deja es una línea en el registro del servidor.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Prueba de la página de error" };

export default function PruebaDeError(): never {
  throw new Error(
    "Prueba de la página de error del panel: este fallo es a propósito (/admin/prueba-de-error).",
  );
}
