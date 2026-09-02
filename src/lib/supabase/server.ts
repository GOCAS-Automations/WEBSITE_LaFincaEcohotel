import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para el servidor (Server Components, Route Handlers,
 * Server Actions). Usa la clave pública (anon) y mantiene la sesión del
 * usuario en cookies: las políticas RLS siguen aplicando.
 */
export async function crearClienteServidor() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const claveAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !claveAnon) {
    throw new Error(
      "Faltan las variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const almacenCookies = await cookies();

  return createServerClient(url, claveAnon, {
    cookies: {
      getAll() {
        return almacenCookies.getAll();
      },
      setAll(cookiesNuevas) {
        try {
          for (const { name, value, options } of cookiesNuevas) {
            almacenCookies.set(name, value, options);
          }
        } catch {
          // Desde un Server Component no se pueden escribir cookies.
          // Si hay middleware refrescando la sesión, se puede ignorar.
        }
      },
    },
  });
}
