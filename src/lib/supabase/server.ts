import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { OPCIONES_COOKIE_SESION, recortarDuracion } from "./opciones-cookie";

/**
 * Cliente de Supabase para el servidor (Server Components, Route Handlers,
 * Server Actions). Usa la clave pública (anon) y mantiene la sesión del
 * usuario en cookies: las políticas RLS siguen aplicando.
 *
 * La cookie se escribe con `httpOnly` y, en producción, `secure`. El motivo
 * está en `opciones-cookie.ts`: aquí nadie la lee desde el navegador.
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
    cookieOptions: OPCIONES_COOKIE_SESION,
    cookies: {
      getAll() {
        return almacenCookies.getAll();
      },
      setAll(cookiesNuevas) {
        try {
          for (const { name, value, options } of cookiesNuevas) {
            /* `recortarDuracion` porque la librería pisa el `maxAge` que se le
               pasa en `cookieOptions`: ver `opciones-cookie.ts`. */
            almacenCookies.set(name, value, recortarDuracion(options));
          }
        } catch {
          // Desde un Server Component no se pueden escribir cookies.
          // Si hay middleware refrescando la sesión, se puede ignorar.
        }
      },
    },
  });
}
