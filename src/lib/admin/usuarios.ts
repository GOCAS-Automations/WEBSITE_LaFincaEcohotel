/**
 * LAS CUENTAS DEL PANEL, CONTRA LA ADMIN API DE SUPABASE.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTE MÓDULO ES `server-only`
 * ---------------------------------------------------------------------------
 * Crear, editar o borrar una cuenta de Supabase Auth exige la clave
 * `service_role`, que ignora RLS y puede leer la tabla `auth.users` entera. Esa
 * clave **no puede llegar al navegador jamás** (regla 2 de `CLAUDE.md`), así
 * que el módulo empieza por `import "server-only"`: si alguien lo importara
 * desde un componente de cliente, la compilación rompe en vez de publicar la
 * llave.
 *
 * Quién puede llamar a estas funciones NO se decide aquí: se decide en las
 * Server Actions (`/admin/usuarios/acciones.ts`), que son las que conocen la
 * sesión. Aquí solo vive el trato con Supabase y la traducción al español de
 * lo que responde.
 */
import "server-only";

import type { User } from "@supabase/supabase-js";

import { ErrorDeValidacion } from "./validacion";
import { rolDeMetadatos, type RolPanel } from "./roles";
import type { UsuarioPanel } from "./tipos";
import { crearClienteAdmin } from "@/lib/supabase/admin";

function aUsuarioPanel(usuario: User): UsuarioPanel {
  return {
    id: usuario.id,
    correo: usuario.email ?? "(sin correo)",
    rol: rolDeMetadatos(usuario.app_metadata),
    ultimoAcceso: usuario.last_sign_in_at ?? null,
    creada: usuario.created_at,
  };
}

/**
 * Todas las cuentas, las más recientes primero.
 *
 * El hotel va a tener un puñado de cuentas, no miles: una sola página de 200 es
 * de sobra y evita una paginación que nadie usaría. Si algún día se pasara de
 * ahí, la lista se cortaría en silencio, así que se pide el máximo que admite
 * la API y se avisa en el comentario.
 */
export async function listarUsuariosDelPanel(): Promise<UsuarioPanel[]> {
  const admin = crearClienteAdmin();
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (error) throw traducirErrorDeAuth(error);

  return data.users
    .map(aUsuarioPanel)
    .sort((a, b) => b.creada.localeCompare(a.creada));
}

/** Cuántos propietarios quedan. Manda la última palabra sobre quitar un rol. */
export function contarPropietarios(usuarios: UsuarioPanel[]): number {
  return usuarios.filter((usuario) => usuario.rol === "propietario").length;
}

export async function crearUsuarioDelPanel({
  correo,
  contrasena,
  rol,
}: {
  correo: string;
  contrasena: string;
  rol: RolPanel;
}): Promise<UsuarioPanel> {
  const admin = crearClienteAdmin();

  /*
    `email_confirm: true` da la cuenta por confirmada sin mandar correo.
    Es lo correcto aquí: el hotel no tiene todavía un emisor configurado
    (Resend es una fase posterior) y una cuenta sin confirmar no puede entrar;
    quedaría creada y muerta. La contraseña se la entrega el propietario en
    persona o por WhatsApp, y la cambia en cuanto entre.
  */
  const { data, error } = await admin.auth.admin.createUser({
    email: correo,
    password: contrasena,
    email_confirm: true,
    app_metadata: { rol },
  });

  if (error) throw traducirErrorDeAuth(error);
  if (!data.user) {
    throw new ErrorDeValidacion(
      "Supabase no devolvió la cuenta recién creada. Vuelve a intentarlo.",
    );
  }

  return aUsuarioPanel(data.user);
}

export async function cambiarRolDeUsuario(
  id: string,
  rol: RolPanel,
): Promise<void> {
  const admin = crearClienteAdmin();
  const { error } = await admin.auth.admin.updateUserById(id, {
    app_metadata: { rol },
  });
  if (error) throw traducirErrorDeAuth(error);
}

export async function restablecerContrasenaDeUsuario(
  id: string,
  contrasena: string,
): Promise<void> {
  const admin = crearClienteAdmin();
  const { error } = await admin.auth.admin.updateUserById(id, {
    password: contrasena,
  });
  if (error) throw traducirErrorDeAuth(error);
}

export async function eliminarUsuarioDelPanel(id: string): Promise<void> {
  const admin = crearClienteAdmin();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw traducirErrorDeAuth(error);
}

/* ===========================================================================
 * Los errores de Supabase, en español
 * ======================================================================== */

/**
 * Supabase responde en inglés y con jerga («User already registered», «Password
 * should be at least 6 characters»). Quien administra el hotel no tiene por qué
 * leer eso: aquí se traduce lo que de verdad puede ocurrir, y lo que no
 * reconocemos sube como un error genérico que `ejecutarAccion()` convierte en
 * «vuelve a intentarlo» sin enseñar el mensaje crudo.
 */
export function traducirErrorDeAuth(error: {
  message: string;
  status?: number;
  code?: string;
}): Error {
  const mensaje = error.message.toLowerCase();

  if (
    mensaje.includes("already registered") ||
    mensaje.includes("already been registered") ||
    mensaje.includes("already exists") ||
    error.code === "email_exists" ||
    error.code === "user_already_exists"
  ) {
    return new ErrorDeValidacion(
      "Ya hay una cuenta con ese correo. Si es de alguien que ya no trabaja aquí, cámbiale la contraseña o elimínala.",
    );
  }

  if (mensaje.includes("password") && mensaje.includes("least")) {
    return new ErrorDeValidacion(
      "La contraseña es demasiado corta para lo que exige Supabase. Escribe una más larga.",
    );
  }

  if (
    mensaje.includes("weak password") ||
    error.code === "weak_password"
  ) {
    return new ErrorDeValidacion(
      "Esa contraseña es demasiado fácil de adivinar. Mézclale mayúsculas, números y algún símbolo.",
    );
  }

  if (
    mensaje.includes("invalid email") ||
    mensaje.includes("unable to validate email") ||
    error.code === "email_address_invalid"
  ) {
    return new ErrorDeValidacion(
      "Ese correo no tiene un formato que Supabase acepte. Revísalo.",
    );
  }

  if (mensaje.includes("user not found") || error.status === 404) {
    return new ErrorDeValidacion(
      "Esa cuenta ya no existe. Recarga la página para ver la lista al día.",
    );
  }

  if (error.status === 429 || mensaje.includes("rate limit")) {
    return new ErrorDeValidacion(
      "Se hicieron demasiados cambios seguidos. Espera un minuto y vuelve a intentarlo.",
    );
  }

  console.error("[panel] error de Supabase Auth sin traducir:", error);
  return new Error(error.message);
}
