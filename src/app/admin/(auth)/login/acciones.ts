"use server";

import { redirect } from "next/navigation";

import { estadoError, type EstadoAccion } from "@/lib/admin/tipos";
import { ejecutarAccion } from "@/lib/admin/validacion";
import { destinoAdminSeguro } from "@/lib/supabase/middleware";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Entrada al panel con correo y contraseña.
 *
 * `signInWithPassword` en el cliente de servidor escribe las cookies de sesión
 * a través de `cookies()`, así que al terminar la acción el navegador ya viaja
 * autenticado y el middleware deja pasar.
 *
 * No hay registro público: las cuentas se crean desde el panel de Supabase.
 */
export async function entrarAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    const correo = String(formData.get("correo") ?? "")
      .trim()
      .toLowerCase();
    const contrasena = String(formData.get("contrasena") ?? "");
    const destino = destinoAdminSeguro(String(formData.get("next") ?? ""));

    if (!correo || !contrasena) {
      return estadoError("Escribe tu correo y tu contraseña.");
    }

    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });

    if (error) {
      /* No se distingue entre "ese correo no existe" y "la contraseña está
         mal": decirlo permitiría averiguar qué correos tienen cuenta. */
      if (error.message.toLowerCase().includes("email not confirmed")) {
        return estadoError(
          "La cuenta existe pero todavía no está confirmada. Avísale al desarrollador.",
        );
      }
      return estadoError(
        "El correo o la contraseña no son correctos. Revísalos e intenta de nuevo.",
      );
    }

    redirect(destino);
  });
}
