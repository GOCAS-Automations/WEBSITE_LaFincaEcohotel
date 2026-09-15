"use server";

import { redirect } from "next/navigation";

import { requirePropietario } from "@/lib/admin/auth";
import { refrescarPanel } from "@/lib/admin/revalidar";
import { ETIQUETA_ROL, ROLES_PANEL } from "@/lib/admin/roles";
import { estadoOk, type EstadoAccion } from "@/lib/admin/tipos";
import {
  ErrorDePermiso,
  ErrorDeValidacion,
  contrasenaDeCuenta,
  correoDeCuenta,
  ejecutarAccion,
  enumRequerido,
  uuidRequerido,
} from "@/lib/admin/validacion";
import {
  cambiarRolDeUsuario,
  contarPropietarios,
  crearUsuarioDelPanel,
  eliminarUsuarioDelPanel,
  listarUsuariosDelPanel,
  restablecerContrasenaDeUsuario,
} from "@/lib/admin/usuarios";

/**
 * LAS CUENTAS DEL PANEL — SERVER ACTIONS.
 *
 * ---------------------------------------------------------------------------
 * CADA ACCIÓN VUELVE A PREGUNTAR QUIÉN LLAMA
 * ---------------------------------------------------------------------------
 * `requirePropietario()` abre las cuatro. No basta con esconder el enlace de la
 * navegación ni con proteger la página: una Server Action se puede invocar con
 * un POST directo desde fuera del navegador, y la del `equipo` es una sesión
 * legítima que Next acepta. Por eso el permiso se comprueba **dentro** de la
 * acción, antes de tocar nada, y `service_role` solo se usa después de esa
 * comprobación (`src/lib/admin/usuarios.ts`, que es `server-only`).
 *
 * ---------------------------------------------------------------------------
 * LAS DOS REGLAS QUE EVITAN QUEDARSE FUERA
 * ---------------------------------------------------------------------------
 *   1. **Nadie se elimina a sí mismo** ni se cambia su propio rol. El daño de
 *      un clic mal dado aquí es cerrarse la puerta desde dentro.
 *   2. **Siempre queda al menos un propietario.** Ni quitándole el rol ni
 *      eliminándolo: sin propietario no habría quien vuelva a crear cuentas, y
 *      recuperarlo exigiría entrar al panel de Supabase.
 */

const RUTA = "/admin/usuarios";

/* ---------------------------------------------------------------------------
 * Crear
 * ------------------------------------------------------------------------- */

export async function crearUsuarioAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await requirePropietario();

    const correo = correoDeCuenta(formData, "correo", "Correo");
    const contrasena = contrasenaDeCuenta(
      formData,
      "contrasena",
      "Contraseña temporal",
    );
    const rol = enumRequerido(formData, "rol", "Rol", ROLES_PANEL);

    await crearUsuarioDelPanel({ correo, contrasena, rol });

    refrescarPanel(RUTA);
    return estadoOk(
      `Cuenta creada para ${correo} con el rol ${ETIQUETA_ROL[rol]}. Pásale la contraseña y dile que la cambie en cuanto entre.`,
    );
  });
}

/* ---------------------------------------------------------------------------
 * Cambiar de rol
 * ------------------------------------------------------------------------- */

export async function cambiarRolAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    const { usuario } = await requirePropietario();

    const id = uuidRequerido(formData, "id", "Cuenta");
    const rol = enumRequerido(formData, "rol", "Rol", ROLES_PANEL);

    if (id === usuario.id) {
      throw new ErrorDePermiso(
        "No puedes cambiarte el rol a ti mismo. Si hace falta, pídeselo a otro propietario.",
      );
    }

    const usuarios = await listarUsuariosDelPanel();
    const objetivo = usuarios.find((fila) => fila.id === id);
    if (!objetivo) {
      throw new ErrorDeValidacion(
        "Esa cuenta ya no existe. Recarga la página para ver la lista al día.",
      );
    }

    if (objetivo.rol === rol) {
      return estadoOk(
        `${objetivo.correo} ya tenía el rol ${ETIQUETA_ROL[rol]}: no se cambió nada.`,
      );
    }

    if (
      objetivo.rol === "propietario" &&
      contarPropietarios(usuarios) <= 1
    ) {
      throw new ErrorDeValidacion(
        "Es el único propietario que queda. Crea o asciende a otro propietario antes de quitarle el rol a este.",
      );
    }

    await cambiarRolDeUsuario(id, rol);

    refrescarPanel(RUTA);
    return estadoOk(`${objetivo.correo} ahora es ${ETIQUETA_ROL[rol]}.`);
  });
}

/* ---------------------------------------------------------------------------
 * Restablecer la contraseña
 * ------------------------------------------------------------------------- */

export async function restablecerContrasenaAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await requirePropietario();

    const id = uuidRequerido(formData, "id", "Cuenta");
    const contrasena = contrasenaDeCuenta(
      formData,
      "contrasena",
      "Contraseña nueva",
    );

    const usuarios = await listarUsuariosDelPanel();
    const objetivo = usuarios.find((fila) => fila.id === id);
    if (!objetivo) {
      throw new ErrorDeValidacion(
        "Esa cuenta ya no existe. Recarga la página para ver la lista al día.",
      );
    }

    await restablecerContrasenaDeUsuario(id, contrasena);

    refrescarPanel(RUTA);
    return estadoOk(
      `Contraseña cambiada para ${objetivo.correo}. Pásasela y dile que la cambie al entrar; su sesión actual sigue abierta hasta que salga.`,
    );
  });
}

/* ---------------------------------------------------------------------------
 * Eliminar
 * ------------------------------------------------------------------------- */

/**
 * Elimina una cuenta y vuelve a la lista con el resultado en la dirección.
 *
 * Es la única de las cuatro que no usa `useActionState`: después de borrar, la
 * fila que mostraba el resultado ya no existe, así que el mensaje se pinta en
 * la página de destino (`<Aviso>`), igual que en Bloqueos.
 */
export async function eliminarUsuarioAction(formData: FormData) {
  /* Un `equipo` que llegue aquí con un POST directo recibe el mismo «no» que
     en la pantalla, no una pantalla de error de Next con su rastro de pila.
     `redirect()` lanza, así que la rama de permiso nunca devuelve sesión. */
  const { usuario } = await requirePropietario().catch((error: unknown) => {
    if (error instanceof ErrorDePermiso) redirect(RUTA);
    throw error;
  });

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect(`${RUTA}?error=${encodeURIComponent("Falta la cuenta.")}`);

  if (id === usuario.id) {
    redirect(
      `${RUTA}?error=${encodeURIComponent(
        "No puedes eliminar tu propia cuenta: te quedarías fuera del panel.",
      )}`,
    );
  }

  const usuarios = await listarUsuariosDelPanel();
  const objetivo = usuarios.find((fila) => fila.id === id);
  if (!objetivo) {
    redirect(
      `${RUTA}?error=${encodeURIComponent(
        "Esa cuenta ya no existe. La lista ya está al día.",
      )}`,
    );
  }

  if (objetivo.rol === "propietario" && contarPropietarios(usuarios) <= 1) {
    redirect(
      `${RUTA}?error=${encodeURIComponent(
        "Es el único propietario que queda. Crea otro propietario antes de eliminar este.",
      )}`,
    );
  }

  try {
    await eliminarUsuarioDelPanel(id);
  } catch (error) {
    const mensaje =
      error instanceof ErrorDeValidacion
        ? error.message
        : "No se pudo eliminar la cuenta. Vuelve a intentarlo.";
    redirect(`${RUTA}?error=${encodeURIComponent(mensaje)}`);
  }

  refrescarPanel(RUTA);
  redirect(
    `${RUTA}?ok=${encodeURIComponent(
      `Cuenta de ${objetivo.correo} eliminada. Ya no puede entrar al panel.`,
    )}`,
  );
}
