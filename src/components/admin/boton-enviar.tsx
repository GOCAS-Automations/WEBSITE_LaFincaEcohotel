"use client";

import { useFormStatus } from "react-dom";
import { createContext, useContext, type ReactNode } from "react";

import { claseBoton, type TamanoBoton, type TonoBoton } from "./ui";

/**
 * Botón de envío que se deshabilita y cambia de texto mientras la Server Action
 * está en vuelo. `useFormStatus` lee el estado del `<form>` padre, así que este
 * componente tiene que ser HIJO del formulario (no el formulario mismo).
 *
 * `confirmar` pide confirmación antes de enviar: se usa en todo lo que borra.
 */
/**
 * «Enviando», dicho por `FormularioAccion`. Ese formulario despacha la acción
 * a mano (para que un error no lo reinicie) y entonces `useFormStatus` no se
 * entera: el estado llega por aquí.
 */
export const EnvioPendiente = createContext(false);

export function BotonEnviar({
  children,
  etiquetaEnEspera = "Guardando…",
  tono = "primario",
  tamano = "md",
  className = "",
  confirmar,
  name,
  value,
}: {
  children: ReactNode;
  etiquetaEnEspera?: string;
  tono?: TonoBoton;
  tamano?: TamanoBoton;
  className?: string;
  confirmar?: string;
  name?: string;
  value?: string;
}) {
  const { pending: enviandoFormulario } = useFormStatus();
  const enviandoAMano = useContext(EnvioPendiente);
  const pending = enviandoFormulario || enviandoAMano;

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      onClick={(evento) => {
        if (confirmar && !window.confirm(confirmar)) {
          evento.preventDefault();
        }
      }}
      className={`${claseBoton(tono, tamano)} ${className}`}
    >
      {pending ? etiquetaEnEspera : children}
    </button>
  );
}
