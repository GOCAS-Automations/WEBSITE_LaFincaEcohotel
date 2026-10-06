"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  contarPeticion,
  olvidarPeticiones,
} from "@/lib/api/limite-peticiones";
import { MENSAJE_SIN_ACCESO, rolDeMetadatos } from "@/lib/admin/roles";
import { estadoError, type EstadoAccion } from "@/lib/admin/tipos";
import { ejecutarAccion } from "@/lib/admin/validacion";
import { destinoAdminSeguro } from "@/lib/supabase/middleware";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * FRENO CONTRA LA FUERZA BRUTA.
 *
 * La auditoría del 2026-09-30 midió **12 intentos de contraseña en 5,4 segundos
 * sin que nada los detuviera**: el formulario llamaba a `signInWithPassword` en
 * cada envío y el límite de Supabase Auth no ayuda aquí, porque la petición sale
 * del servidor de Vercel y no del navegador de quien ataca — todas las
 * peticiones llegan a Supabase con la misma IP, así que el límite por IP de
 * Supabase o no salta nunca o, peor, salta contra el hotel entero.
 *
 * Se cuentan dos ventanas a la vez, porque cada una tapa un ataque distinto:
 *
 *   · **Por cuenta:** diez intentos cada cinco minutos. Frena el ataque clásico
 *     —probar contraseñas contra el correo del dueño— y no depende de la IP, así
 *     que no se evita saltando de proxy.
 *   · **Por IP:** treinta intentos cada quince minutos. Frena el «password
 *     spraying»: probar la misma contraseña floja contra muchos correos.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ LA VENTANA POR CUENTA ES CORTA Y NO LARGA
 * ---------------------------------------------------------------------------
 * Un bloqueo por cuenta se puede volver contra el hotel: quien conozca el correo
 * del dueño puede gastar los intentos a propósito para dejarlo fuera del panel.
 * Y el panel es donde se ven las reservas del día, así que dejar al hotel sin
 * entrar es un daño real, no teórico.
 *
 * De ahí la forma de estos números: la ventana **se cura sola en cinco minutos**
 * —el peor caso es esperar un café— y a cambio el atacante no pasa de 120
 * intentos por hora contra una contraseña de diez caracteres como mínimo, que es
 * no pasar de ningún sitio. La primera versión de esta auditoría puso cinco
 * intentos cada quince minutos y se probó: dejaba al propietario fuera después
 * de ocho fallos, incluso escribiendo luego la contraseña correcta. Se corrigió.
 *
 * Quien acierta sale del contador de inmediato (`olvidarPeticiones`), así que
 * equivocarse dos veces y entrar a la tercera no deja rastro.
 *
 * Límite conocido: el contador vive en la memoria de la instancia (ver
 * `src/lib/api/limite-peticiones.ts`). Es un freno, no una cerradura; la
 * cerradura de verdad se pone en el firewall de Vercel y está anotada en
 * `docs/AUDITORIA_SEGURIDAD.md`.
 */
const LIMITE_POR_CUENTA = { peticiones: 10, segundos: 5 * 60 };
const LIMITE_POR_IP = { peticiones: 30, segundos: 15 * 60 };

function minutos(segundos: number): string {
  const m = Math.ceil(segundos / 60);
  return m <= 1 ? "un minuto" : `${m} minutos`;
}

/**
 * Entrada al panel con correo y contraseña.
 *
 * `signInWithPassword` en el cliente de servidor escribe las cookies de sesión
 * a través de `cookies()`, así que al terminar la acción el navegador ya viaja
 * autenticado y el middleware deja pasar. La cookie se marca `httpOnly` y, en
 * producción, `secure` (ver `src/lib/supabase/opciones-cookie.ts`).
 *
 * No hay registro público: las cuentas se crean desde `/admin/usuarios`.
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

    /* La IP la pone el proxy de Vercel. En local no hay ninguna y todos los
       intentos caen en la misma clave, que es lo que se quiere para probarlo. */
    const cabeceras = await headers();
    const ip =
      cabeceras.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      cabeceras.get("x-real-ip") ||
      "local";

    const claveCuenta = `login-cuenta:${correo}`;
    const claveIp = `login-ip:${ip}`;

    const porCuenta = contarPeticion(claveCuenta, LIMITE_POR_CUENTA);
    const porIp = contarPeticion(claveIp, LIMITE_POR_IP);

    if (!porCuenta.permitido || !porIp.permitido) {
      const espera = Math.max(
        porCuenta.permitido ? 0 : porCuenta.esperaSegundos,
        porIp.permitido ? 0 : porIp.esperaSegundos,
      );
      /* El mensaje no dice si el correo existe: solo que hubo demasiados
         intentos desde aquí. */
      return estadoError(
        `Demasiados intentos seguidos. Espera ${minutos(espera)} y vuelve a intentarlo. Si no recuerdas tu contraseña, pídele al propietario que te la restablezca desde el panel.`,
      );
    }

    const supabase = await crearClienteServidor();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });

    if (!error && !rolDeMetadatos(data.user?.app_metadata)) {
      /* La contraseña es correcta, pero la cuenta no es del panel (no tiene
         `app_metadata.rol`): pudo crearla cualquiera si el registro público de
         Supabase quedó encendido. Se cierra en el acto —desde una Server
         Action sí se pueden borrar las cookies— y no se reinicia el contador
         de intentos. Decir «no tiene acceso» no revela nada que quien escribe
         la contraseña correcta no sepa ya. */
      await supabase.auth.signOut().catch(() => {});
      return estadoError(MENSAJE_SIN_ACCESO);
    }

    if (error) {
      /* No se distingue entre "ese correo no existe" y "la contraseña está
         mal": decirlo permitiría averiguar qué correos tienen cuenta. Tampoco
         se distingue la cuenta sin confirmar, por lo mismo: antes había una
         rama propia para ella y era una forma de enumerar cuentas. Si una
         cuenta se queda sin confirmar, se ve en `/admin/usuarios`. */
      return estadoError(
        "El correo o la contraseña no son correctos. Revísalos e intenta de nuevo.",
      );
    }

    /* Entró bien: los intentos fallidos anteriores dejan de contar. */
    olvidarPeticiones(claveCuenta);
    olvidarPeticiones(claveIp);

    redirect(destino);
  });
}
