"use server";

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { intentarEntrar } from "@/lib/admin/login";
import { estadoError, type EstadoAccion } from "@/lib/admin/tipos";
import { ejecutarAccion } from "@/lib/admin/validacion";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { destinoAdminSeguro } from "@/lib/supabase/middleware";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Entrada al panel con **usuario** y contraseña.
 *
 * Toda la lógica —usuario → correo, mensajes sin enumeración, tiempos
 * igualados y el freno contra la fuerza bruta (10 intentos / 5 min por
 * usuario, 30 / 15 min por IP)— está en `src/lib/admin/login.ts`, con sus
 * pruebas. Aquí solo se le pasan las piezas reales:
 *
 *   · la búsqueda, con la clave de servicio (la función de la base solo la
 *     puede ejecutar `service_role`, ver la migración 025);
 *   · `signInWithPassword` en el cliente de servidor, que escribe las cookies
 *     de sesión (`httpOnly` y, en producción, `secure`);
 *   · un cliente sin cookies para el intento señuelo.
 *
 * No hay registro público: las cuentas se crean desde `/admin/usuarios`.
 */
export async function entrarAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    const usuario = String(formData.get("usuario") ?? "");
    const contrasena = String(formData.get("contrasena") ?? "");
    const destino = destinoAdminSeguro(String(formData.get("next") ?? ""));

    /* La IP la pone el proxy de Vercel. En local no hay ninguna y todos los
       intentos caen en la misma clave, que es lo que se quiere para probarlo. */
    const cabeceras = await headers();
    const ip =
      cabeceras.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      cabeceras.get("x-real-ip") ||
      "local";

    const supabase = await crearClienteServidor();

    let resultado;
    try {
      resultado = await intentarEntrar(
        { usuario, contrasena, ip },
        {
          buscarCorreo: async (nombre) => {
            const { data, error } = await crearClienteAdmin().rpc(
              "correo_de_usuario_panel",
              { p_usuario: nombre },
            );
            if (error) throw new Error(`búsqueda de usuario: ${error.message}`);
            return typeof data === "string" && data ? data : null;
          },
          iniciarSesion: async (correo, clave) => {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: correo,
              password: clave,
            });
            if (error || !data.user) return { ok: false };
            return { ok: true, appMetadata: data.user.app_metadata };
          },
          intentoSenuelo: async (correo, clave) => {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const claveAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (!url || !claveAnon) return;
            await createClient(url, claveAnon, {
              auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
              },
            }).auth.signInWithPassword({ email: correo, password: clave });
          },
          cerrarSesion: async () => {
            await supabase.auth.signOut();
          },
          esperar: (ms) => new Promise((listo) => setTimeout(listo, ms)),
          ahora: () => Date.now(),
          azar: () => Math.random(),
        },
      );
    } catch (error) {
      console.error("[panel] no se pudo comprobar el usuario:", error);
      return estadoError(
        "No se pudo comprobar tu usuario en este momento. Vuelve a intentarlo en un minuto.",
      );
    }

    if (!resultado.ok) return estadoError(resultado.mensaje);

    redirect(destino);
  });
}
