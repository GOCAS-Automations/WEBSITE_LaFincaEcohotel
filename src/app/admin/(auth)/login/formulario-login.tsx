"use client";

import { entrarAction } from "./acciones";
import { FormularioAccion } from "@/components/admin/formulario-accion";
import { Campo, Entrada } from "@/components/admin/ui";

export function FormularioLogin({ destino }: { destino: string }) {
  return (
    <FormularioAccion
      accion={entrarAction}
      etiquetaEnviar="Entrar al panel"
      etiquetaEnEspera="Entrando…"
      className="space-y-4"
    >
      <input type="hidden" name="next" value={destino} />

      <Campo etiqueta="Correo" htmlFor="correo" obligatorio>
        <Entrada
          id="correo"
          name="correo"
          type="email"
          autoComplete="username"
          required
          autoFocus
          placeholder="tucorreo@lafincaecohotel.com"
        />
      </Campo>

      <Campo etiqueta="Contraseña" htmlFor="contrasena" obligatorio>
        <Entrada
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </Campo>
    </FormularioAccion>
  );
}
