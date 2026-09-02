// Este módulo solo puede importarse desde el servidor.
// `server-only` rompe la compilación si alguien lo importa en un Client Component.
import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cliente privilegiado de Supabase (service_role). Ignora RLS por diseño.
 *
 * REGLA INNEGOCIABLE: solo en Route Handlers, Server Actions o scripts.
 * La clave `SUPABASE_SERVICE_ROLE_KEY` jamás debe llegar al navegador.
 */
export function crearClienteAdmin() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El cliente administrador de Supabase no puede usarse en el navegador.",
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !claveServicio) {
    throw new Error(
      "Faltan las variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, claveServicio, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
