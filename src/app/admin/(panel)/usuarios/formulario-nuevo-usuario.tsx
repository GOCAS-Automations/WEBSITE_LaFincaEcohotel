"use client";

import { useState } from "react";

import { crearUsuarioAction } from "./acciones";
import { FormularioAccion } from "@/components/admin/formulario-accion";
import { Campo, Desplegable, Entrada } from "@/components/admin/ui";
import {
  DESCRIPCION_ROL,
  ETIQUETA_ROL,
  LARGO_MINIMO_CONTRASENA,
  ROLES_PANEL,
  type RolPanel,
} from "@/lib/admin/roles";
import {
  AYUDA_USUARIO,
  DOMINIO_CORREO_INTERNO,
  LARGO_MAXIMO_USUARIO,
  PATRON_USUARIO_HTML,
} from "@/lib/admin/usuario-panel";

/**
 * Alta de una cuenta del panel.
 *
 * La contraseña se escribe visible a propósito: quien la crea tiene que
 * dictarla o copiarla para dársela a la persona, y un campo de puntos obliga a
 * escribirla dos veces «a ciegas». Nadie está mirando por encima del hombro del
 * dueño del hotel en su oficina, y el riesgo real aquí es una contraseña mal
 * transcrita, no un fisgón.
 *
 * La validación de verdad está en el servidor (`acciones.ts`): esto es solo la
 * ayuda que evita el viaje de ida y vuelta.
 */
export function FormularioNuevoUsuario() {
  const [rol, setRol] = useState<RolPanel>("equipo");

  return (
    <FormularioAccion
      accion={crearUsuarioAction}
      etiquetaEnviar="Crear cuenta"
      etiquetaEnEspera="Creando…"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Usuario"
          htmlFor="usuario"
          obligatorio
          ayuda={AYUDA_USUARIO}
        >
          <Entrada
            id="usuario"
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
            placeholder="Ej.: j-mejia"
          />
        </Campo>

        <Campo
          etiqueta="Contraseña temporal"
          htmlFor="contrasena"
          obligatorio
          ayuda={`Mínimo ${LARGO_MINIMO_CONTRASENA} caracteres. Mezcla mayúsculas, números y algún símbolo.`}
        >
          <Entrada
            id="contrasena"
            name="contrasena"
            type="text"
            autoComplete="new-password"
            required
            minLength={LARGO_MINIMO_CONTRASENA}
            placeholder="Ej.: LaFinca2026*"
          />
        </Campo>

        <Campo
          etiqueta="Correo de contacto (opcional)"
          htmlFor="correo"
          ayuda={`No sirve para entrar. Si lo dejas vacío, la cuenta usa uno interno (…@${DOMINIO_CORREO_INTERNO}) que nadie lee.`}
        >
          <Entrada
            id="correo"
            name="correo"
            type="email"
            autoComplete="off"
            placeholder="nombre@correo.com"
          />
        </Campo>

        <Campo
          etiqueta="Rol"
          htmlFor="rol"
          ayuda={DESCRIPCION_ROL[rol]}
        >
          <Desplegable
            id="rol"
            name="rol"
            value={rol}
            onChange={(evento) => setRol(evento.target.value as RolPanel)}
          >
            {ROLES_PANEL.map((opcion) => (
              <option key={opcion} value={opcion}>
                {ETIQUETA_ROL[opcion]}
              </option>
            ))}
          </Desplegable>
        </Campo>
      </div>
    </FormularioAccion>
  );
}
