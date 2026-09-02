import type { ReactNode } from "react";

import { Boton } from "@/components/ui/boton";
import { Seccion } from "@/components/ui/seccion";

import { DivisorOrganico, Motas, Neblina } from "./atmosfera";

/**
 * Cierre de página: la ladera, el bosque y el camino a reservar.
 *
 * Casi todas las páginas internas terminaban con el mismo bloque copiado —una
 * `Seccion fondo="petroleo"` con un título, un párrafo y un botón—. Ahora ese
 * cierre es una pieza sola, y de paso hace tres cosas que antes no hacía:
 *
 *   1. **Entra por una ladera, no por una línea recta.** El divisor orgánico se
 *      dibuja dentro de la sección anterior con el color del bosque, así que la
 *      página no termina: se hunde.
 *   2. **Tiene atmósfera.** Bruma y motas de luz, como el resto de las zonas
 *      oscuras del sitio.
 *   3. **Usa el botón crema.** El petróleo sobre verde bosque no llega al 3:1
 *      que exige la norma para el contorno de un control (ver `boton.tsx`).
 *
 * `fondoAnterior` es obligatorio y no tiene valor por defecto a propósito: el
 * divisor se pinta ENCIMA de la sección anterior, y si su fondo no coincide se
 * ve una franja de color equivocado. Que haya que decirlo obliga a mirarlo.
 */
export function CierreReserva({
  titulo,
  texto,
  fondoAnterior,
  perfil = "loma",
  espejo = false,
  children,
}: {
  titulo: string;
  texto?: string;
  /** Clase de fondo de la sección inmediatamente anterior (`bg-crema-50`…). */
  fondoAnterior: string;
  perfil?: "cresta" | "loma" | "bruma";
  espejo?: boolean;
  /** Sustituye al botón por defecto (por ejemplo, para poner dos). */
  children?: ReactNode;
}) {
  return (
    <>
      <div className={`relative ${fondoAnterior}`}>
        <DivisorOrganico
          perfil={perfil}
          color="fill-bosque-900"
          alto={88}
          espejo={espejo}
          className="-mb-px"
        />
      </div>

      <Seccion
        fondo="bosque"
        espacio="compacto"
        className="relative overflow-hidden"
      >
        <Neblina tono="bosque" />
        <Motas />

        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          <h2 className="max-w-2xl text-2xl leading-tight font-bold text-white sm:text-3xl">
            {titulo}
          </h2>
          {texto ? (
            <p className="max-w-xl leading-relaxed text-crema-100/90">{texto}</p>
          ) : null}
          {children ?? (
            <Boton href="/reservar" variante="crema" tamano="grande">
              Reservar ahora
            </Boton>
          )}
        </div>
      </Seccion>
    </>
  );
}
