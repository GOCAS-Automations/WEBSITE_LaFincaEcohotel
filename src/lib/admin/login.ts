/**
 * ENTRAR AL PANEL CON USUARIO Y CONTRASEÑA.
 *
 * La lógica vive aquí y no en la Server Action para poder probarla sin Next ni
 * Supabase: la acción (`/admin/(auth)/login/acciones.ts`) solo le pasa las
 * piezas reales —la búsqueda con la clave de servicio, el `signInWithPassword`
 * que escribe las cookies, el reloj—.
 *
 * ---------------------------------------------------------------------------
 * EL CAMINO
 * ---------------------------------------------------------------------------
 *   1. Si lo escrito lleva «@», es un correo: se orienta («Entra con tu
 *      usuario…») sin consultar nada. Decirlo no revela si ese correo tiene
 *      cuenta: la respuesta es la misma para cualquier correo.
 *   2. Se normaliza el usuario (sin espacios alrededor, minúsculas) y se cuentan
 *      los intentos: por usuario y por IP (ver más abajo).
 *   3. Usuario → correo con `public.correo_de_usuario_panel` (solo
 *      `service_role`, migración 025).
 *   4. `signInWithPassword` con ese correo.
 *
 * ---------------------------------------------------------------------------
 * SIN ENUMERACIÓN
 * ---------------------------------------------------------------------------
 * Un usuario que no existe y una contraseña mala reciben **el mismo mensaje y
 * un tiempo parecido**. Para el tiempo hay dos cosas:
 *
 *   · Cuando el usuario no existe se hace igual un intento de inicio de sesión,
 *     contra un correo interno que no existe, con un cliente sin cookies. Así
 *     los dos caminos hacen los mismos viajes a Supabase.
 *   · Todo fallo tarda **al menos** {@link TIEMPO_MINIMO_FALLO_MS} ms (más un
 *     poco de azar): Supabase contesta antes cuando el correo no existe porque
 *     no tiene contraseña que comparar, y ese suelo tapa la diferencia.
 *
 * ---------------------------------------------------------------------------
 * EL FRENO CONTRA LA FUERZA BRUTA (sin cambios desde 2026-09-30)
 * ---------------------------------------------------------------------------
 * Dos ventanas a la vez, cada una tapa un ataque distinto:
 *
 *   · **Por cuenta** —ahora, por usuario normalizado—: diez intentos cada cinco
 *     minutos. Frena el ataque clásico contra la cuenta del dueño y no depende
 *     de la IP.
 *   · **Por IP:** treinta intentos cada quince minutos. Frena el «password
 *     spraying»: la misma contraseña floja contra muchos usuarios.
 *
 * La ventana por cuenta es corta a propósito: un bloqueo largo se puede volver
 * contra el hotel (quien sepa el usuario del dueño lo dejaría sin ver las
 * reservas del día). Se cura sola en cinco minutos y a cambio no pasan de 120
 * intentos por hora contra una contraseña de diez caracteres como mínimo.
 * Quien acierta sale del contador de inmediato.
 *
 * El contador vive en la memoria de la instancia
 * (`src/lib/api/limite-peticiones.ts`): es un freno, no una cerradura.
 */
import {
  contarPeticion,
  olvidarPeticiones,
} from "@/lib/api/limite-peticiones";
import { MENSAJE_SIN_ACCESO, rolDeMetadatos } from "./roles";
import {
  DOMINIO_CORREO_INTERNO,
  esUsuarioValido,
  normalizarUsuario,
  pareceCorreo,
} from "./usuario-panel";

export const LIMITE_POR_CUENTA = { peticiones: 10, segundos: 5 * 60 };
export const LIMITE_POR_IP = { peticiones: 30, segundos: 15 * 60 };

/** Lo mínimo que tarda cualquier fallo de usuario o contraseña. */
export const TIEMPO_MINIMO_FALLO_MS = 1000;
/** Azar sobre ese mínimo, para que no sea un número exacto que comparar. */
export const AZAR_FALLO_MS = 200;

/** Correo contra el que se hace el intento cuando el usuario no existe. */
export const CORREO_SENUELO = `sin-cuenta@${DOMINIO_CORREO_INTERNO}`;

export const MENSAJE_FALTAN_DATOS = "Escribe tu usuario y tu contraseña.";

export const MENSAJE_CREDENCIALES =
  "El usuario o la contraseña no son correctos. Revísalos e intenta de nuevo.";

export const MENSAJE_ES_CORREO =
  "Entra con tu usuario, no con tu correo. Es el nombre corto que te dieron, por ejemplo «j-mejia». Si no lo recuerdas, pídeselo al propietario.";

export function mensajeDemasiadosIntentos(esperaSegundos: number): string {
  const m = Math.ceil(esperaSegundos / 60);
  const espera = m <= 1 ? "un minuto" : `${m} minutos`;
  return `Demasiados intentos seguidos. Espera ${espera} y vuelve a intentarlo. Si no recuerdas tu contraseña, pídele al propietario que te la restablezca desde el panel.`;
}

export type ResultadoInicio =
  | { ok: true; appMetadata: Record<string, unknown> | undefined }
  | { ok: false };

export type PiezasDelLogin = {
  /** Usuario normalizado → correo, o `null`. Lanza si la base no responde. */
  buscarCorreo: (usuario: string) => Promise<string | null>;
  /** El inicio de sesión de verdad: si sale bien, deja las cookies puestas. */
  iniciarSesion: (correo: string, contrasena: string) => Promise<ResultadoInicio>;
  /** Un intento sin cookies que se descarta: solo iguala los tiempos. */
  intentoSenuelo: (correo: string, contrasena: string) => Promise<void>;
  /** Cierra la sesión que acaba de abrir `iniciarSesion`. */
  cerrarSesion: () => Promise<void>;
  esperar: (ms: number) => Promise<void>;
  ahora: () => number;
  azar: () => number;
};

export type DatosDelLogin = {
  usuario: string;
  contrasena: string;
  ip: string;
};

export type ResultadoLogin = { ok: true } | { ok: false; mensaje: string };

export async function intentarEntrar(
  datos: DatosDelLogin,
  piezas: PiezasDelLogin,
): Promise<ResultadoLogin> {
  const escrito = datos.usuario;
  const contrasena = datos.contrasena;

  if (!escrito.trim() || !contrasena) {
    return { ok: false, mensaje: MENSAJE_FALTAN_DATOS };
  }

  if (pareceCorreo(escrito)) {
    return { ok: false, mensaje: MENSAJE_ES_CORREO };
  }

  const usuario = normalizarUsuario(escrito);
  const claveCuenta = `login-cuenta:${usuario}`;
  const claveIp = `login-ip:${datos.ip}`;

  const porCuenta = contarPeticion(claveCuenta, LIMITE_POR_CUENTA);
  const porIp = contarPeticion(claveIp, LIMITE_POR_IP);

  if (!porCuenta.permitido || !porIp.permitido) {
    const espera = Math.max(
      porCuenta.permitido ? 0 : porCuenta.esperaSegundos,
      porIp.permitido ? 0 : porIp.esperaSegundos,
    );
    /* No dice si el usuario existe: solo que hubo demasiados intentos. */
    return { ok: false, mensaje: mensajeDemasiadosIntentos(espera) };
  }

  const inicio = piezas.ahora();
  const fallar = async (): Promise<ResultadoLogin> => {
    const minimo = TIEMPO_MINIMO_FALLO_MS + Math.floor(piezas.azar() * AZAR_FALLO_MS);
    const falta = minimo - (piezas.ahora() - inicio);
    if (falta > 0) await piezas.esperar(falta);
    return { ok: false, mensaje: MENSAJE_CREDENCIALES };
  };

  /* Un usuario con un formato imposible no puede existir: ni se consulta. */
  const correo = esUsuarioValido(usuario)
    ? await piezas.buscarCorreo(usuario)
    : null;

  if (!correo) {
    await piezas.intentoSenuelo(CORREO_SENUELO, contrasena).catch(() => undefined);
    return fallar();
  }

  const resultado = await piezas.iniciarSesion(correo, contrasena);
  if (!resultado.ok) return fallar();

  if (!rolDeMetadatos(resultado.appMetadata)) {
    /* Contraseña correcta, pero la cuenta no es del panel (sin
       `app_metadata.rol`). Se cierra en el acto y el contador no se reinicia.
       Decir «no tiene acceso» no revela nada que quien sabe la contraseña no
       sepa ya. */
    await piezas.cerrarSesion().catch(() => undefined);
    return { ok: false, mensaje: MENSAJE_SIN_ACCESO };
  }

  olvidarPeticiones(claveCuenta);
  olvidarPeticiones(claveIp);
  return { ok: true };
}
