import { Banner } from "./ui";

/**
 * Banner de resultado para las acciones que terminan redirigiendo (crear,
 * eliminar, cambiar de estado). El mensaje viaja en la dirección —`?ok=` o
 * `?error=`— y se pinta en la página de destino.
 *
 * El texto se renderiza como contenido de React, nunca como HTML: un valor
 * manipulado en la barra de direcciones no puede inyectar marcado.
 */
export function Aviso({ ok, error }: { ok?: string; error?: string }) {
  const mensaje = ok ?? error;
  if (!mensaje) return null;

  return (
    <div className="mb-5">
      <Banner tono={ok ? "ok" : "error"}>{mensaje.slice(0, 500)}</Banner>
    </div>
  );
}
