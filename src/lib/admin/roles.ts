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

/** El rol que se le supone a quien no tiene ninguno escrito. */
export const ROL_POR_DEFECTO: RolPanel = "equipo";

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
 * El rol que trae el usuario de Supabase.
 *
 * Si no tiene ninguno —o trae uno que no reconocemos— se le da el MENOS
 * privilegiado. Un valor inesperado nunca puede abrir una puerta: las cuentas
 * anteriores a esta pantalla entran como «equipo» hasta que un propietario les
 * cambie el rol a mano.
 */
export function rolDeMetadatos(
  metadatos: Record<string, unknown> | null | undefined,
): RolPanel {
  const valor = metadatos?.rol;
  return esRolPanel(valor) ? valor : ROL_POR_DEFECTO;
}

/** La contraseña más corta que aceptamos para una cuenta del panel. */
export const LARGO_MINIMO_CONTRASENA = 10;
