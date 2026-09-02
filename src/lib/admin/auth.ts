import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/server";
import { RUTA_LOGIN_ADMIN } from "@/lib/supabase/middleware";

/**
 * Puerta de entrada de todo el panel (capa 2 de 3).
 *
 * El middleware ya redirige a quien no tenga sesión, pero cada página y cada
 * Server Action vuelve a comprobarlo aquí. El motivo es concreto: **el
 * middleware es una conveniencia de navegación, no una frontera**. Una Server
 * Action se puede invocar con un POST directo, sin pasar por la navegación del
 * navegador, y un `matcher` mal editado en el futuro dejaría rutas al aire.
 *
 * Devuelve además el cliente de Supabase ya ligado a las cookies de la sesión:
 * todas las consultas del panel viajan con el JWT del usuario y las políticas
 * RLS (capa 3) siguen aplicando. El panel NUNCA usa `service_role`, salvo la
 * limpieza de huérfanos de Storage (`limpieza-storage.ts`).
 */
export async function requireAdmin() {
  const supabase = await crearClienteServidor();
  const {
    data: { user: usuario },
    error,
  } = await supabase.auth.getUser();

  if (error || !usuario) {
    redirect(RUTA_LOGIN_ADMIN);
  }

  return { supabase, usuario };
}
