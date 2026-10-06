"use server";

import { requireAdmin } from "@/lib/admin/auth";
import {
  leerCambioDeContrasena,
  traducirErrorDeCambio,
  verificarContrasenaActual,
} from "@/lib/admin/mi-contrasena";
import { estadoOk, type EstadoAccion } from "@/lib/admin/tipos";
import { ErrorDeValidacion, ejecutarAccion } from "@/lib/admin/validacion";

/**
 * Cambia la contraseña de QUIEN ESTÁ DENTRO, sea propietario o equipo.
 *
 * Pide la actual (se comprueba aparte, sin tocar la sesión) y cambia la nueva
 * con la sesión de la propia persona. Ver `src/lib/admin/mi-contrasena.ts`.
 */
export async function cambiarMiContrasenaAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    const { supabase, usuario } = await requireAdmin();
    const { actual, nueva } = leerCambioDeContrasena(formData);

    if (!usuario.email) {
      throw new ErrorDeValidacion(
        "Tu cuenta no tiene correo, así que no se puede comprobar la contraseña actual. Pídele al propietario que te la restablezca desde «Usuarios».",
      );
    }

    await verificarContrasenaActual(usuario.email, actual);

    const { error } = await supabase.auth.updateUser({ password: nueva });
    if (error) throw traducirErrorDeCambio(error);

    return estadoOk(
      "Listo: tu contraseña quedó cambiada. Sigues dentro; la próxima vez que entres, usa la nueva.",
    );
  });
}
