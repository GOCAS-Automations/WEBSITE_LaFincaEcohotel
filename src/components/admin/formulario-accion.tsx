"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";

import { Banner } from "./ui";
import { BotonEnviar } from "./boton-enviar";
import { ESTADO_INICIAL, type EstadoAccion } from "@/lib/admin/tipos";

type Props = {
  /** Server Action con la firma (estadoPrevio, FormData) => EstadoAccion. */
  accion: (estado: EstadoAccion, formData: FormData) => Promise<EstadoAccion>;
  children: ReactNode;
  etiquetaEnviar: string;
  etiquetaEnEspera?: string;
  confirmar?: string;
  /** Contenido extra a la derecha de la barra de botones (p. ej. "Cancelar"). */
  secundario?: ReactNode;
  className?: string;
  id?: string;
};

/**
 * Formulario genérico del panel: pinta el banner de éxito o error que devuelve
 * la acción y bloquea el botón mientras guarda.
 *
 * Los formularios que necesitan estado propio en el cliente (galerías, cálculo
 * de totales) no usan este envoltorio, pero siguen el mismo patrón de
 * `useActionState`.
 */
export function FormularioAccion({
  accion,
  children,
  etiquetaEnviar,
  etiquetaEnEspera,
  confirmar,
  secundario,
  className = "",
  id,
}: Props) {
  const [estado, enviar] = useActionState(accion, ESTADO_INICIAL);

  return (
    <form action={enviar} className={className} id={id}>
      {estado.estado !== "idle" && (
        <div className="mb-5">
          <Banner tono={estado.estado === "ok" ? "ok" : "error"}>
            {estado.mensaje}
          </Banner>
        </div>
      )}

      {children}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <BotonEnviar etiquetaEnEspera={etiquetaEnEspera} confirmar={confirmar}>
          {etiquetaEnviar}
        </BotonEnviar>
        {secundario}
      </div>
    </form>
  );
}
