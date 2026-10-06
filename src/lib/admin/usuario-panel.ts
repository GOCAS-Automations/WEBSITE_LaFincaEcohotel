/**
 * EL «USUARIO» CON QUE SE ENTRA AL PANEL.
 *
 * Supabase Auth exige un correo por cuenta y solo inicia sesión con él. El
 * usuario (`admin`, `j-mejia`…) es una capa encima:
 *
 *   · vive en `app_metadata.usuario`, que solo escribe la clave de servicio
 *     —como `app_metadata.rol`—, así que nadie se lo cambia desde el navegador;
 *   · el login del servidor lo traduce al correo con la función
 *     `public.correo_de_usuario_panel` (migración 025, solo `service_role`) y
 *     luego llama a `signInWithPassword` con ese correo;
 *   · las cuentas que no tienen un correo de contacto usan uno interno
 *     (`usuario@usuarios.lafincaecohotel.com`) que nunca recibe nada.
 *
 * Este módulo es puro (sin `server-only`): lo usan también los formularios del
 * navegador para el `pattern` y los textos de ayuda.
 */
import { ErrorDeValidacion } from "./validacion";

/** Minúsculas, números y guiones; empieza por letra o número; 2 a 30. */
export const PATRON_USUARIO = /^[a-z0-9][a-z0-9-]{1,29}$/;

/** El mismo patrón para el atributo `pattern` de un `<input>`. */
export const PATRON_USUARIO_HTML = "[a-zA-Z0-9][a-zA-Z0-9\\-]{1,29}";

export const LARGO_MINIMO_USUARIO = 2;
export const LARGO_MAXIMO_USUARIO = 30;

/** Dominio de los correos internos: existen solo porque Supabase pide uno. */
export const DOMINIO_CORREO_INTERNO = "usuarios.lafincaecohotel.com";

export const AYUDA_USUARIO =
  "Con esto entra al panel. Solo letras minúsculas sin tilde, números y guiones, por ejemplo «j-mejia».";

/**
 * Lo que la persona escribió, listo para comparar: sin espacios alrededor y en
 * minúsculas. «  J-Mejia » y «j-mejia» son el mismo usuario.
 */
export function normalizarUsuario(valor: string): string {
  return valor.trim().toLowerCase();
}

/** ¿Cumple el formato, ya normalizado? */
export function esUsuarioValido(valor: string): boolean {
  return PATRON_USUARIO.test(valor);
}

/** Si lo escrito tiene pinta de correo (lleva «@»). */
export function pareceCorreo(valor: string): boolean {
  return valor.includes("@");
}

/**
 * Normaliza y valida un usuario nuevo. Devuelve el usuario normalizado o lanza
 * `ErrorDeValidacion` con un mensaje que dice qué arreglar.
 */
export function validarUsuario(valor: string): string {
  const usuario = normalizarUsuario(valor);

  if (!usuario) {
    throw new ErrorDeValidacion("Escribe un usuario.");
  }
  if (pareceCorreo(usuario)) {
    throw new ErrorDeValidacion(
      "El usuario no es un correo: usa letras, números y guiones, por ejemplo «j-mejia». El correo va en su propio campo.",
    );
  }
  if (/\s/.test(usuario)) {
    throw new ErrorDeValidacion(
      "El usuario no puede llevar espacios. Usa un guion en su lugar, por ejemplo «j-mejia».",
    );
  }
  if (usuario.length < LARGO_MINIMO_USUARIO) {
    throw new ErrorDeValidacion(
      `El usuario debe tener al menos ${LARGO_MINIMO_USUARIO} caracteres.`,
    );
  }
  if (usuario.length > LARGO_MAXIMO_USUARIO) {
    throw new ErrorDeValidacion(
      `El usuario no puede pasar de ${LARGO_MAXIMO_USUARIO} caracteres. El que escribiste tiene ${usuario.length}.`,
    );
  }
  if (usuario.startsWith("-")) {
    throw new ErrorDeValidacion(
      "El usuario tiene que empezar por una letra o un número, no por un guion.",
    );
  }
  if (!esUsuarioValido(usuario)) {
    throw new ErrorDeValidacion(
      "El usuario solo puede llevar letras sin tilde, números y guiones (-). Sin tildes, eñes, puntos ni otros signos.",
    );
  }
  return usuario;
}

/** Lee y valida el campo de un formulario. */
export function usuarioDeFormulario(form: FormData, campo: string): string {
  return validarUsuario(String(form.get(campo) ?? ""));
}

/**
 * El usuario guardado en `app_metadata`, o `null` si no hay uno válido.
 * `user_metadata` no se mira nunca: lo edita el propio dueño de la cuenta.
 */
export function usuarioDeMetadatos(
  metadatos: Record<string, unknown> | null | undefined,
): string | null {
  const valor = metadatos?.usuario;
  return typeof valor === "string" && esUsuarioValido(valor) ? valor : null;
}

/** El correo interno de una cuenta sin correo de contacto. */
export function correoInternoDe(usuario: string): string {
  return `${usuario}@${DOMINIO_CORREO_INTERNO}`;
}

/** ¿Es un correo interno (que nadie lee)? */
export function esCorreoInterno(correo: string | null | undefined): boolean {
  return Boolean(correo?.toLowerCase().endsWith(`@${DOMINIO_CORREO_INTERNO}`));
}
