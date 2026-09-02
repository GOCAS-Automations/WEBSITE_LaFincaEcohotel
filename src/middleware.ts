import type { NextRequest } from "next/server";

import { actualizarSesion } from "@/lib/supabase/middleware";

/**
 * El middleware solo se ocupa del panel: refresca la sesión de Supabase y
 * manda al login a quien no la tenga.
 *
 * El `matcher` cubre EXCLUSIVAMENTE `/admin/…`. Es deliberado: un middleware
 * que corriera en el sitio público lo volvería dinámico (leer cookies obliga a
 * renderizar en cada visita) y se perderían el prerenderizado y el ISR de una
 * hora de las 18 rutas públicas. El panel, en cambio, siempre es dinámico.
 */
export async function middleware(peticion: NextRequest) {
  return actualizarSesion(peticion);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
