/**
 * «Cambiar mi contraseña»: lo que cada persona del panel hace con SU cuenta,
 * sea propietario o equipo.
 *
 * Hasta el 2026-10-05 la sección Usuarios decía «dile que la cambie en cuanto
 * entre», pero no había dónde: solo el propietario podía restablecer
 * contraseñas, y la temporal se quedaba para siempre.
 *
 * ---------------------------------------------------------------------------
 * CÓMO SE CAMBIA SIN TOCAR LA SESIÓN
 * ---------------------------------------------------------------------------
 * 1. Se comprueba la contraseña ACTUAL con un cliente aparte, sin cookies
 *    (`persistSession: false`): un `signInWithPassword` con el correo de la
 *    sesión. Así, quien encuentre un celular con el panel abierto no puede
 *    cambiar la contraseña sin saberla. La sesión de prueba se cierra en el
 *    acto, solo ella (`scope: "local"`): un cierre «global» echaría también
 *    a la persona de su propia sesión.
 * 2. Se cambia con la sesión de la propia persona (`auth.updateUser`), no con
 *    la Admin API: nadie cambia aquí una contraseña ajena.
 */
import { createClient } from "@supabase/supabase-js";

import { LARGO_MINIMO_CONTRASENA } from "./roles";
import { ErrorDeValidacion } from "./validacion";

export type CambioDeContrasena = { actual: string; nueva: string };

/** Lee y valida los tres campos. Lanza `ErrorDeValidacion` en español. */
export function leerCambioDeContrasena(form: FormData): CambioDeContrasena {
  /* Las contraseñas no se recortan: un espacio al final es parte de ellas. */
  const actual = String(form.get("actual") ?? "");
  const nueva = String(form.get("nueva") ?? "");
  const repetida = String(form.get("repetida") ?? "");

  if (!actual) {
    throw new ErrorDeValidacion("Escribe tu contraseña actual.");
  }
  if (!nueva.trim()) {
    throw new ErrorDeValidacion("Escribe la contraseña nueva.");
  }
  if (nueva.length < LARGO_MINIMO_CONTRASENA) {
    throw new ErrorDeValidacion(
      `La contraseña nueva debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres. La que escribiste tiene ${nueva.length}.`,
    );
  }
  if (nueva.length > 72) {
    throw new ErrorDeValidacion(
      "La contraseña nueva no puede pasar de 72 caracteres.",
    );
  }
  if (nueva !== repetida) {
    throw new ErrorDeValidacion(
      "La contraseña nueva y la repetida no son iguales. Escríbelas otra vez.",
    );
  }
  if (nueva === actual) {
    throw new ErrorDeValidacion(
      "La contraseña nueva tiene que ser distinta de la actual.",
    );
  }
  return { actual, nueva };
}

/**
 * ¿Es esa la contraseña actual de ese correo? Lanza `ErrorDeValidacion` si no
 * lo es o si hubo demasiados intentos; un fallo de red sube como error común.
 */
export async function verificarContrasenaActual(
  correo: string,
  actual: string,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const claveAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !claveAnon) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const verificador = createClient(url, claveAnon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await verificador.auth.signInWithPassword({
    email: correo,
    password: actual,
  });

  if (error) {
    if (error.status === 429 || /rate limit/i.test(error.message)) {
      throw new ErrorDeValidacion(
        "Hubo demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.",
      );
    }
    if (
      error.status === 400 ||
      error.code === "invalid_credentials" ||
      /invalid login credentials/i.test(error.message)
    ) {
      throw new ErrorDeValidacion(
        "La contraseña actual no es correcta. Escríbela otra vez.",
      );
    }
    console.error("[panel] no se pudo comprobar la contraseña actual:", error);
    throw new Error(error.message);
  }

  /* Solo se quería saber si la contraseña era buena: esa sesión de prueba
     sobra. `local` cierra solo ella. */
  if (data.session) {
    await verificador.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
}

/** Errores de `updateUser` que la persona puede entender y resolver. */
export function traducirErrorDeCambio(error: {
  message: string;
  status?: number;
  code?: string;
}): Error {
  const mensaje = error.message.toLowerCase();
  if (error.code === "same_password" || mensaje.includes("different from the old")) {
    return new ErrorDeValidacion(
      "La contraseña nueva tiene que ser distinta de la actual.",
    );
  }
  if (error.code === "weak_password" || mensaje.includes("weak")) {
    return new ErrorDeValidacion(
      "Esa contraseña es demasiado fácil de adivinar. Usa una frase más larga o mézclale números y algún símbolo.",
    );
  }
  if (error.code === "reauthentication_needed" || mensaje.includes("reauthenticat")) {
    return new ErrorDeValidacion(
      "Por seguridad hay que entrar de nuevo antes de cambiarla: toca «Salir», vuelve a entrar y cámbiala enseguida.",
    );
  }
  if (error.status === 429 || mensaje.includes("rate limit")) {
    return new ErrorDeValidacion(
      "Hubo demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.",
    );
  }
  console.error("[panel] Supabase no aceptó el cambio de contraseña:", error);
  return new Error(error.message);
}
