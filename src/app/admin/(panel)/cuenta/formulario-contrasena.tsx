"use client";

import { useState } from "react";

import { cambiarMiContrasenaAction } from "./acciones";
import { FormularioAccion } from "@/components/admin/formulario-accion";
import { Campo, Entrada } from "@/components/admin/ui";
import { LARGO_MINIMO_CONTRASENA } from "@/lib/admin/roles";

/**
 * Los tres campos de siempre: la actual, la nueva y la nueva otra vez.
 *
 * Ocultas por defecto —esto se hace a veces en la recepción, con gente
 * alrededor—, con un «Mostrar» para quien prefiera ver lo que escribe en el
 * celular. Los `autoComplete` son los que entienden los gestores de
 * contraseñas: proponen una nueva y la guardan.
 */
export function FormularioContrasena({ usuario }: { usuario: string }) {
  const [mostrar, setMostrar] = useState(false);
  const tipo = mostrar ? "text" : "password";

  return (
    <FormularioAccion
      accion={cambiarMiContrasenaAction}
      etiquetaEnviar="Cambiar mi contraseña"
      etiquetaEnEspera="Cambiando…"
    >
      {/* Para que el gestor de contraseñas sepa de qué cuenta es. */}
      <input
        type="text"
        name="usuario"
        autoComplete="username"
        value={usuario}
        readOnly
        hidden
      />
      <div className="grid gap-4">
        <Campo etiqueta="Contraseña actual" htmlFor="actual" obligatorio>
          <Entrada
            id="actual"
            name="actual"
            type={tipo}
            autoComplete="current-password"
            required
          />
        </Campo>
        <Campo
          etiqueta="Contraseña nueva"
          htmlFor="nueva"
          obligatorio
          ayuda={`Mínimo ${LARGO_MINIMO_CONTRASENA} caracteres. Una frase fácil de recordar sirve, por ejemplo «cafe con neblina en la finca».`}
        >
          <Entrada
            id="nueva"
            name="nueva"
            type={tipo}
            autoComplete="new-password"
            minLength={LARGO_MINIMO_CONTRASENA}
            maxLength={72}
            required
          />
        </Campo>
        <Campo etiqueta="Repite la contraseña nueva" htmlFor="repetida" obligatorio>
          <Entrada
            id="repetida"
            name="repetida"
            type={tipo}
            autoComplete="new-password"
            minLength={LARGO_MINIMO_CONTRASENA}
            maxLength={72}
            required
          />
        </Campo>
        <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-[0.875rem] text-crema-800">
          <input
            type="checkbox"
            checked={mostrar}
            onChange={(evento) => setMostrar(evento.target.checked)}
            className="size-4 accent-petroleo-600"
          />
          Mostrar lo que escribo
        </label>
      </div>
    </FormularioAccion>
  );
}
