import type { Metadata } from "next";

import { FilaUsuario } from "./fila-usuario";
import { FormularioNuevoUsuario } from "./formulario-nuevo-usuario";
import { Aviso } from "@/components/admin/aviso";
import {
  Banner,
  CabeceraTarjeta,
  CuerpoTarjeta,
  EncabezadoPagina,
  Tarjeta,
} from "@/components/admin/ui";
import { SIN_PERMISO, requireAdmin } from "@/lib/admin/auth";
import { DESCRIPCION_ROL, ETIQUETA_ROL, ROLES_PANEL } from "@/lib/admin/roles";
import { contarPropietarios, listarUsuariosDelPanel } from "@/lib/admin/usuarios";

export const metadata: Metadata = { title: "Usuarios" };
export const dynamic = "force-dynamic";

/**
 * USUARIOS DEL PANEL — quién puede entrar y con qué permisos.
 *
 * ---------------------------------------------------------------------------
 * LA COMPROBACIÓN VA ANTES DE LEER NADA
 * ---------------------------------------------------------------------------
 * Si quien entra no es propietario, la función **devuelve** el aviso sin haber
 * llamado a `listarUsuariosDelPanel()`. No es una cuestión de orden estético:
 * pedir la lista y luego decidir si se pinta dejaría los correos del equipo en
 * la carga útil que Next manda al navegador. Aquí no se lee ni un dato.
 *
 * Es la segunda de tres puertas: la navegación no enseña el enlace a quien no
 * es propietario (conveniencia), esta página corta la lectura (frontera) y
 * cada Server Action vuelve a preguntarlo (`acciones.ts`), porque un POST
 * directo no pasa por ninguna pantalla.
 */
export default async function PaginaUsuarios({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { usuario, rol } = await requireAdmin();

  if (rol !== "propietario") {
    return (
      <>
        <EncabezadoPagina titulo="Usuarios" />
        <Banner tono="error">{SIN_PERMISO}</Banner>
      </>
    );
  }

  const [params, usuarios] = await Promise.all([
    searchParams,
    listarUsuariosDelPanel(),
  ]);

  const propietarios = contarPropietarios(usuarios);

  return (
    <>
      <EncabezadoPagina
        titulo="Usuarios"
        descripcion="Las cuentas que pueden entrar a este panel. Cada persona con la suya: así se sabe quién cambió qué y basta con eliminar una cuenta cuando alguien deja de trabajar en el hotel."
      />

      <Aviso ok={params.ok} error={params.error} />

      {/* ---------------------------------------------------------------
          QUÉ PUEDE HACER CADA ROL, EN UNA FRASE.
          Va arriba y no en un texto de ayuda escondido: es la pregunta que
          se hace quien está a punto de crear una cuenta.
      ---------------------------------------------------------------- */}
      <Tarjeta className="mb-6">
        <CabeceraTarjeta titulo="Los dos roles" />
        <CuerpoTarjeta>
          <dl className="grid gap-4 sm:grid-cols-2">
            {ROLES_PANEL.map((nombre) => (
              <div key={nombre}>
                <dt className="text-[0.9375rem] font-semibold text-crema-900">
                  {ETIQUETA_ROL[nombre]}
                </dt>
                <dd className="mt-1 text-[0.8125rem] leading-relaxed text-crema-700">
                  {DESCRIPCION_ROL[nombre]}
                </dd>
              </div>
            ))}
          </dl>
        </CuerpoTarjeta>
      </Tarjeta>

      <div className="space-y-6">
        <Tarjeta>
          <CabeceraTarjeta
            titulo="Crear una cuenta"
            descripcion="Escribe el correo de la persona y una contraseña temporal. Pásasela por un canal seguro y dile que, al entrar, la cambie en «Mi cuenta» (arriba a la derecha) → «Cambiar mi contraseña»."
          />
          <CuerpoTarjeta>
            <FormularioNuevoUsuario />
          </CuerpoTarjeta>
        </Tarjeta>

        <Tarjeta>
          <CabeceraTarjeta
            titulo={`Cuentas (${usuarios.length})`}
            descripcion={
              propietarios === 1
                ? "Hay un solo propietario: no se le puede quitar el rol ni eliminar hasta que exista otro."
                : `Hay ${propietarios} propietarios.`
            }
          />
          <ul className="divide-y divide-crema-900/[0.07]">
            {usuarios.map((fila) => (
              <li key={fila.id} className="px-4 py-4 sm:px-6">
                <FilaUsuario
                  usuario={fila}
                  esMiCuenta={fila.id === usuario.id}
                  ultimoPropietario={
                    fila.rol === "propietario" && propietarios <= 1
                  }
                />
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>
    </>
  );
}
