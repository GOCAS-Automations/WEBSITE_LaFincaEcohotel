/**
 * LOS DOS ROLES DEL PANEL.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EL ROL VIVE EN `app_metadata` Y NO EN UNA TABLA
 * ---------------------------------------------------------------------------
 * `app_metadata` lo escribe **solo** la Admin API (`service_role`): el usuario
 * no puede tocarlo desde el navegador ni con su propio token, a diferencia de
 * `user_metadata`, que sí es editable por su dueño. Además viaja dentro del JWT
 * ya validado por `getUser()`, así que leer el rol no cuesta una consulta más
 * en cada navegación del panel.
 *
 * ---------------------------------------------------------------------------
 * MÓDULO PURO
 * ---------------------------------------------------------------------------
 * Sin red y sin `server-only`: lo leen tanto el servidor (la puerta de cada
 * página y de cada Server Action) como la navegación, que es un componente de
 * cliente y necesita saber si pinta o no la sección de Usuarios. Lo que NO
 * viaja al navegador es la clave de servicio: eso vive en
 * `src/lib/admin/usuarios.ts`, que sí es `server-only`.
 */

export const ROLES_PANEL = ["propietario", "equipo"] as const;

export type RolPanel = (typeof ROLES_PANEL)[number];

export const ETIQUETA_ROL: Record<RolPanel, string> = {
  propietario: "Propietario",
  equipo: "Equipo",
};

/**
 * Qué puede hacer cada rol, en una frase. Se pinta en la propia pantalla de
 * Usuarios: quien administra el hotel no tiene por qué deducirlo.
 */
export const DESCRIPCION_ROL: Record<RolPanel, string> = {
  propietario:
    "Entra a todo el panel y además administra las cuentas: crear, cambiar de rol, restablecer contraseñas y eliminar.",
  equipo:
    "Entra a todo el panel —reservas, bloqueos, cabañas, planes, experiencias y contenido del sitio— pero no ve ni puede abrir Usuarios.",
};

export function esRolPanel(valor: unknown): valor is RolPanel {
  return (
    typeof valor === "string" && (ROLES_PANEL as readonly string[]).includes(valor)
  );
}

/**
 * El rol que trae el usuario de Supabase, o `null` si la cuenta no es del panel.
 *
 * ---------------------------------------------------------------------------
 * SIN ROL NO HAY PANEL
 * ---------------------------------------------------------------------------
 * Hasta octubre de 2026 a una cuenta sin rol se la trataba como «equipo». Eso,
 * sumado al registro público de Supabase Auth —que se puede volver a encender
 * desde su panel sin tocar el código—, dejaba entrar al panel a cualquiera que
 * se creara una cuenta con la clave anónima que viaja en el sitio. Ahora una
 * cuenta sin rol, o con uno que no reconocemos, **no es del panel**: el
 * middleware y `requireAdmin()` le cierran la sesión, y las políticas RLS de la
 * base (`es_admin()`, migración 018) tampoco la dejan leer ni escribir nada.
 *
 * Se lee SOLO de `app_metadata`. Quien llame a esta función le pasa
 * `usuario.app_metadata`, nunca `usuario.user_metadata`: ese lo escribe el
 * propio usuario con su token (`auth.updateUser({ data })`) y cualquiera podría
 * darse ahí el rol de propietario.
 */
export function rolDeMetadatos(
  metadatos: Record<string, unknown> | null | undefined,
): RolPanel | null {
  const valor = metadatos?.rol;
  return esRolPanel(valor) ? valor : null;
}

/**
 * Lo que ve quien entra con una cuenta que no es del panel: en el login, al
 * acertar la contraseña de una cuenta sin rol, y en la página de entrada cuando
 * llega con `?motivo=sin-acceso` desde el middleware o desde `requireAdmin()`.
 */
export const MENSAJE_SIN_ACCESO =
  "Esta cuenta no tiene acceso al panel. Si trabajas en el hotel, pídele al propietario que te asigne un rol desde Usuarios.";

/** La contraseña más corta que aceptamos para una cuenta del panel. */
export const LARGO_MINIMO_CONTRASENA = 10;
