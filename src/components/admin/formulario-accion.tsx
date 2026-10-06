"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";

import { Banner } from "./ui";
import { BotonEnviar, EnvioPendiente } from "./boton-enviar";
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
 *
 * ---------------------------------------------------------------------------
 * UN ERROR NO PUEDE BORRAR LO QUE SE ESCRIBIÓ (2026-10-05)
 * ---------------------------------------------------------------------------
 * Con `<form action={fn}>`, React 19 **reinicia el formulario** al terminar la
 * acción, haya ido bien o mal. Si el servidor rechazaba una reserva («esas
 * noches ya están ocupadas»), el nombre y el teléfono se vaciaban y los
 * desplegables controlados volvían a su primera opción en pantalla mientras su
 * estado seguía en otra: el siguiente envío mandaba una cabaña distinta de la
 * que se veía en el calendario. Por eso, con JavaScript, el envío pasa por
 * `onSubmit` (que cancela el de React) y se despacha a mano: así no hay
 * reinicio. Si la acción sale bien sin redirigir, se reinicia a propósito, como
 * antes. Sin JavaScript, `action` sigue funcionando igual.
 *
 * Y el aviso, que vive arriba del formulario, se trae a la vista: tras pulsar
 * «Guardar» al final de un formulario largo, un error fuera de pantalla es un
 * error que nadie ve.
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
  const [estado, enviar, pendiente] = useActionState(accion, ESTADO_INICIAL);
  const formulario = useRef<HTMLFormElement>(null);
  const aviso = useRef<HTMLDivElement>(null);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) return;
    const boton = (evento.nativeEvent as SubmitEvent).submitter;
    const datos = new FormData(evento.currentTarget, boton ?? undefined);
    startTransition(() => enviar(datos));
  }

  useEffect(() => {
    if (estado.estado === "idle") return;
    if (estado.estado === "ok") formulario.current?.reset();
    aviso.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [estado]);

  return (
    <form
      ref={formulario}
      action={enviar}
      onSubmit={alEnviar}
      className={className}
      id={id}
    >
      {estado.estado !== "idle" && (
        <div ref={aviso} className="mb-5 scroll-mt-24">
          <Banner tono={estado.estado === "ok" ? "ok" : "error"}>
            {estado.mensaje}
          </Banner>
        </div>
      )}

      <EnvioPendiente.Provider value={pendiente}>
        {children}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <BotonEnviar etiquetaEnEspera={etiquetaEnEspera} confirmar={confirmar}>
            {etiquetaEnviar}
          </BotonEnviar>
          {secundario}
        </div>
      </EnvioPendiente.Provider>
    </form>
  );
}
