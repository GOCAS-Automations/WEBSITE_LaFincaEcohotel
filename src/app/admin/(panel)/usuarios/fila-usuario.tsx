"use client";

import { useActionState, useState } from "react";

import {
  cambiarRolAction,
  cambiarUsuarioAction,
  eliminarUsuarioAction,
  restablecerContrasenaAction,
} from "./acciones";
import { BotonEnviar } from "@/components/admin/boton-enviar";
import {
  Banner,
  Campo,
  Desplegable,
  Entrada,
  Pastilla,
} from "@/components/admin/ui";
import {
  ETIQUETA_ROL,
  LARGO_MINIMO_CONTRASENA,
  ROLES_PANEL,
  type RolPanel,
} from "@/lib/admin/roles";
import { ESTADO_INICIAL, type UsuarioPanel } from "@/lib/admin/tipos";
import {
  AYUDA_USUARIO,
  LARGO_MAXIMO_USUARIO,
  PATRON_USUARIO_HTML,
  normalizarUsuario,
} from "@/lib/admin/usuario-panel";
import { formatearFechaHora } from "@/lib/utils/formato";

/**
 * Una cuenta de la lista: su usuario, su rol, su último acceso y las cosas que
 * se le pueden hacer.
 *
 * Cada acción tiene su propio `useActionState`, así que el mensaje aparece
 * **en la fila** que se tocó y no en un banner arriba: con seis cuentas en
 * pantalla, un «Guardado» genérico no dice de cuál.
 *
 * Los botones que aquí se esconden —cambiar el propio rol, eliminarse a uno
 * mismo, dejar al hotel sin propietario— también están cerrados en el servidor.
 * Esconderlos es cortesía; el «no» lo dice `acciones.ts`.
 */
export function FilaUsuario({
  usuario,
  esMiCuenta,
  ultimoPropietario,
}: {
  usuario: UsuarioPanel;
  esMiCuenta: boolean;
  ultimoPropietario: boolean;
}) {
  /* "" = la cuenta no tiene rol todavía: el desplegable lo dice y obliga a
     elegir uno antes de guardar. */
  const [rol, setRol] = useState<RolPanel | "">(usuario.rol ?? "");
  const [abrirContrasena, setAbrirContrasena] = useState(false);
  const [abrirUsuario, setAbrirUsuario] = useState(!usuario.usuario);
  const [nombre, setNombre] = useState(usuario.usuario ?? "");

  const [estadoRol, guardarRol] = useActionState(
    cambiarRolAction,
    ESTADO_INICIAL,
  );
  const [estadoClave, guardarClave] = useActionState(
    restablecerContrasenaAction,
    ESTADO_INICIAL,
  );
  const [estadoUsuario, guardarUsuario] = useActionState(
    cambiarUsuarioAction,
    ESTADO_INICIAL,
  );

  const rolBloqueado = esMiCuenta || ultimoPropietario;
  const idCampoRol = `rol-${usuario.id}`;
  const idCampoClave = `clave-${usuario.id}`;
  const idCampoUsuario = `usuario-${usuario.id}`;
  const nombreCambio =
    normalizarUsuario(nombre) !== "" && normalizarUsuario(nombre) !== usuario.usuario;

  return (
    <div className="flex flex-col gap-3">
      {/* --- Identidad --- */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="min-w-0 flex-1 break-all text-[0.9375rem] font-semibold text-crema-900">
          {usuario.usuario ?? (
            <span className="text-red-800">Sin usuario: no puede entrar</span>
          )}
          {esMiCuenta && (
            /* `whitespace-nowrap`: el correo va con `break-all` para que quepa a
               390 px, y sin esto la aclaración se partía en «(tu cu enta)». */
            <span className="ml-2 whitespace-nowrap text-[0.75rem] font-normal text-crema-600">
              (tu cuenta)
            </span>
          )}
        </p>
        <Pastilla tono={usuario.rol === "propietario" ? "verde" : "gris"}>
          {usuario.rol ? ETIQUETA_ROL[usuario.rol] : "Sin acceso al panel"}
        </Pastilla>
      </div>

      <p className="text-[0.8125rem] text-crema-700 [overflow-wrap:anywhere]">
        {usuario.correoInterno
          ? "Sin correo de contacto (usa uno interno que nadie lee)"
          : `Correo de contacto: ${usuario.correo}`}
      </p>

      <p className="text-[0.75rem] text-crema-600">
        {usuario.ultimoAcceso
          ? `Último acceso: ${formatearFechaHora(usuario.ultimoAcceso)}`
          : "Todavía no ha entrado nunca"}
        <span className="mx-1.5">·</span>
        cuenta creada el {formatearFechaHora(usuario.creada)}
      </p>

      {/* --- Rol --- */}
      <form action={guardarRol} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={usuario.id} />
        <Campo etiqueta="Rol" htmlFor={idCampoRol} className="w-full sm:w-56">
          <Desplegable
            id={idCampoRol}
            name="rol"
            value={rol}
            disabled={rolBloqueado}
            onChange={(evento) => setRol(evento.target.value as RolPanel)}
          >
            {!usuario.rol && (
              <option value="" disabled>
                Sin rol: elige uno para darle acceso
              </option>
            )}
            {ROLES_PANEL.map((opcion) => (
              <option key={opcion} value={opcion}>
                {ETIQUETA_ROL[opcion]}
              </option>
            ))}
          </Desplegable>
        </Campo>

        {!rolBloqueado && rol !== "" && rol !== usuario.rol && (
          <BotonEnviar tono="secundario" tamano="sm" etiquetaEnEspera="Guardando…">
            Guardar rol
          </BotonEnviar>
        )}

        {rolBloqueado && (
          <p className="pb-3 text-[0.75rem] leading-relaxed text-crema-600">
            {esMiCuenta
              ? "No puedes cambiarte el rol a ti mismo."
              : "Es el único propietario: crea otro antes de cambiarle el rol."}
          </p>
        )}
      </form>

      {estadoRol.estado !== "idle" && (
        <Banner tono={estadoRol.estado === "ok" ? "ok" : "error"}>
          {estadoRol.mensaje}
        </Banner>
      )}

      {/* --- Usuario, contraseña y eliminación --- */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setAbrirUsuario((abierto) => !abierto)}
          aria-expanded={abrirUsuario}
          className="rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold text-petroleo-700 transition-colors hover:bg-petroleo-600/10"
        >
          {abrirUsuario
            ? "Cerrar usuario"
            : usuario.usuario
              ? "Cambiar usuario"
              : "Ponerle usuario"}
        </button>

        <button
          type="button"
          onClick={() => setAbrirContrasena((abierto) => !abierto)}
          aria-expanded={abrirContrasena}
          className="rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold text-petroleo-700 transition-colors hover:bg-petroleo-600/10"
        >
          {abrirContrasena ? "Cancelar" : "Restablecer contraseña"}
        </button>

        {!esMiCuenta && !ultimoPropietario && (
          <form action={eliminarUsuarioAction}>
            <input type="hidden" name="id" value={usuario.id} />
            <BotonEnviar
              tono="peligro"
              tamano="sm"
              etiquetaEnEspera="Eliminando…"
              confirmar={`¿Eliminar la cuenta ${usuario.usuario ? `«${usuario.usuario}»` : usuario.correo}? No podrá volver a entrar al panel.`}
            >
              Eliminar
            </BotonEnviar>
          </form>
        )}
      </div>

      {abrirUsuario && (
        <form
          action={guardarUsuario}
          className="flex flex-wrap items-end gap-3 rounded-tarjeta bg-crema-900/[0.03] px-3.5 py-3"
        >
          <input type="hidden" name="id" value={usuario.id} />
          <Campo
            etiqueta={usuario.usuario ? "Usuario nuevo" : "Usuario"}
            htmlFor={idCampoUsuario}
            className="w-full sm:w-72"
            ayuda={AYUDA_USUARIO}
          >
            <Entrada
              id={idCampoUsuario}
              name="usuario"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              maxLength={LARGO_MAXIMO_USUARIO}
              pattern={PATRON_USUARIO_HTML}
              title="Letras sin tilde, números y guiones; sin espacios. Mínimo 2 caracteres."
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
            />
          </Campo>
          {nombreCambio && (
            <BotonEnviar tamano="sm" etiquetaEnEspera="Guardando…">
              Guardar usuario
            </BotonEnviar>
          )}
        </form>
      )}

      {estadoUsuario.estado !== "idle" && (
        <Banner tono={estadoUsuario.estado === "ok" ? "ok" : "error"}>
          {estadoUsuario.mensaje}
        </Banner>
      )}

      {abrirContrasena && (
        <form
          action={guardarClave}
          className="flex flex-wrap items-end gap-3 rounded-tarjeta bg-crema-900/[0.03] px-3.5 py-3"
        >
          <input type="hidden" name="id" value={usuario.id} />
          <Campo
            etiqueta="Contraseña nueva"
            htmlFor={idCampoClave}
            className="w-full sm:w-72"
            ayuda={`Mínimo ${LARGO_MINIMO_CONTRASENA} caracteres. Se la entregas tú; nadie recibe un correo.`}
          >
            <Entrada
              id={idCampoClave}
              name="contrasena"
              type="text"
              autoComplete="new-password"
              required
              minLength={LARGO_MINIMO_CONTRASENA}
            />
          </Campo>
          <BotonEnviar tamano="sm" etiquetaEnEspera="Cambiando…">
            Cambiar contraseña
          </BotonEnviar>
        </form>
      )}

      {estadoClave.estado !== "idle" && (
        <Banner tono={estadoClave.estado === "ok" ? "ok" : "error"}>
          {estadoClave.mensaje}
        </Banner>
      )}
    </div>
  );
}
