"use client";

import { entrarAction } from "./acciones";
import { FormularioAccion } from "@/components/admin/formulario-accion";
import { Campo, Entrada } from "@/components/admin/ui";

/**
 * Usuario y contraseña. El usuario va en un campo de texto (no `email`) y sin
 * corrección ni mayúscula automática: en el celular, «J-mejia» o un autocorrector
 * que cambie el guion serían un fallo de entrada sin culpa de nadie. El
 * servidor normaliza igual (sin espacios, minúsculas).
 */
export function FormularioLogin({ destino }: { destino: string }) {
  return (
    <FormularioAccion
      accion={entrarAction}
      etiquetaEnviar="Entrar al panel"
      etiquetaEnEspera="Entrando…"
      className="space-y-4"
    >
      <input type="hidden" name="next" value={destino} />

      <Campo etiqueta="Usuario" htmlFor="usuario" obligatorio>
        <Entrada
          id="usuario"
          name="usuario"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          autoFocus
          maxLength={60}
          placeholder="Ej.: j-mejia"
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
