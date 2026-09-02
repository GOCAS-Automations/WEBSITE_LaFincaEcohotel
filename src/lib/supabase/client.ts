import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para el navegador (Client Components).
 * Usa la clave pública (anon): todo lo que lea pasa por las políticas RLS.
 */
export function crearClienteNavegador() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const claveAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !claveAnon) {
    throw new Error(
      "Faltan las variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createBrowserClient(url, claveAnon);
}
