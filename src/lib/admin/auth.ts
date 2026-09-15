import { redirect } from "next/navigation";

import { rolDeMetadatos, type RolPanel } from "./roles";
import { ErrorDePermiso } from "./validacion";
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
 * limpieza de huérfanos de Storage (`limpieza-storage.ts`) y la administración
 * de cuentas (`usuarios.ts`), que la Admin API exige.
 *
 * El `rol` sale de `app_metadata`, que solo escribe la Admin API: no es un dato
 * que el navegador pueda falsificar. Ver `src/lib/admin/roles.ts`.
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

  const rol: RolPanel = rolDeMetadatos(usuario.app_metadata);

  return { supabase, usuario, rol };
}

/**
 * Lo que se le dice a quien entra a Usuarios sin ser propietario.
 *
 * El texto es el mismo en la página y en las Server Actions para que no haya
 * dos versiones del mismo «no».
 */
export const SIN_PERMISO =
  "No tienes permiso para administrar las cuentas del panel. Solo el propietario puede hacerlo.";

/**
 * Puerta de la sección de Usuarios, para las Server Actions.
 *
 * Lanza —no redirige— porque `ejecutarAccion()` convierte el error en un
 * mensaje en pantalla, y porque una acción invocada con un POST directo tiene
 * que fallar, no navegar. La página hace su propia comprobación y pinta el
 * aviso **antes de leer nada**: quien no es propietario no llega a ver ni un
 * correo.
 */
export async function requirePropietario() {
  const sesion = await requireAdmin();
  if (sesion.rol !== "propietario") {
    throw new ErrorDePermiso(SIN_PERMISO);
  }
  return sesion;
}
