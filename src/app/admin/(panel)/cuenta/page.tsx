import type { Metadata } from "next";

import { FormularioContrasena } from "./formulario-contrasena";
import {
  CabeceraTarjeta,
  CuerpoTarjeta,
  EncabezadoPagina,
  Tarjeta,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { DESCRIPCION_ROL, ETIQUETA_ROL } from "@/lib/admin/roles";
import { esCorreoInterno, usuarioDeMetadatos } from "@/lib/admin/usuario-panel";

export const metadata: Metadata = { title: "Mi cuenta" };

/**
 * Mi cuenta: con qué usuario se entra, qué rol se tiene y «Cambiar mi
 * contraseña». Abierta a cualquier rol —es la cuenta propia—, a diferencia de
 * «Usuarios», que es solo del propietario.
 */
export default async function PaginaMiCuenta() {
  const { usuario, rol } = await requireAdmin();
  const correo = usuario.email ?? "";
  const nombre = usuarioDeMetadatos(usuario.app_metadata);

  return (
    <div className="max-w-2xl">
      <EncabezadoPagina
        titulo="Mi cuenta"
        descripcion="Tus datos para entrar al panel. Si te dieron una contraseña temporal, cámbiala aquí."
      />

      <div className="space-y-6">
        <Tarjeta>
          <CuerpoTarjeta>
            <dl className="grid gap-4">
              <div className="min-w-0">
                <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-crema-600">
                  Usuario
                </dt>
                <dd className="mt-1 text-[0.9375rem] font-semibold text-crema-900 [overflow-wrap:anywhere]">
                  {nombre ?? "Sin usuario"}
                </dd>
                <dd className="mt-0.5 text-[0.8125rem] leading-relaxed text-crema-700">
                  {nombre
                    ? "Con esto entras al panel, junto con tu contraseña."
                    : "Pídele al propietario que te ponga uno en «Usuarios»: sin usuario no podrás volver a entrar."}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-crema-600">
                  Correo de contacto
                </dt>
                <dd className="mt-1 text-[0.9375rem] text-crema-900 [overflow-wrap:anywhere]">
                  {correo && !esCorreoInterno(correo)
                    ? correo
                    : "Ninguno (la cuenta usa uno interno que nadie lee)"}
                </dd>
                <dd className="mt-0.5 text-[0.8125rem] leading-relaxed text-crema-700">
                  No sirve para entrar.
                </dd>
              </div>
              <div>
                <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-crema-600">
                  Rol
                </dt>
                <dd className="mt-1 text-[0.9375rem] font-semibold text-crema-900">
                  {ETIQUETA_ROL[rol]}
                </dd>
                <dd className="mt-0.5 text-[0.8125rem] leading-relaxed text-crema-700">
                  {DESCRIPCION_ROL[rol]}
                </dd>
              </div>
            </dl>
          </CuerpoTarjeta>
        </Tarjeta>

        <Tarjeta>
          <CabeceraTarjeta
            titulo="Cambiar mi contraseña"
            descripcion="Escribe la que usas hoy y luego la nueva dos veces. No se cierra tu sesión: sigues dentro."
          />
          <CuerpoTarjeta>
            <FormularioContrasena usuario={nombre ?? correo} />
          </CuerpoTarjeta>
        </Tarjeta>

        <p className="px-1 text-[0.8125rem] leading-relaxed text-crema-600">
          ¿Olvidaste tu contraseña? Desde aquí no se puede recuperar: pídele al
          propietario que te ponga una temporal en «Usuarios» y luego cámbiala
          en esta pantalla.
        </p>
      </div>
    </div>
  );
}
