"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import {
  anioDe,
  aniosDelSelector,
  claveDe,
  mesEnPalabras,
  mesesDelAnio,
  numeroDeMes,
  type ClaveMes,
  type LimitesMes,
} from "@/lib/utils/selector-mes";

/**
 * El selector de mes y año: doce meses en una rejilla de tres columnas, con el
 * año arriba y sus dos flechas. Es lo que aparece al tocar el título del mes,
 * como en el calendario del iPhone.
 *
 * Lo comparten el calendario de fechas del sitio (portada, `/reservar` y la
 * reserva manual del panel) y el calendario de ocupación del panel. Los
 * límites llegan de fuera y son los MISMOS que respetan las flechas de mes
 * (`src/lib/utils/selector-mes.ts`).
 *
 * ---------------------------------------------------------------------------
 * TECLADO Y LECTOR DE PANTALLA
 * ---------------------------------------------------------------------------
 * · Tabulación itinerante, igual que la rejilla de días: un solo mes entra en
 *   el orden del tabulador; las flechas mueven el foco (izquierda y derecha de
 *   uno en uno, arriba y abajo de tres en tres), `Inicio`/`Fin` van a enero y
 *   a diciembre y `RePág`/`AvPág` cambian de año.
 * · Un mes fuera de los límites lleva `aria-disabled` y el motivo en su
 *   etiqueta, no `disabled`: así recibe foco y el lector dice por qué no.
 * · `Escape` cierra el selector y devuelve el control a quien lo abrió.
 * · El año cambia dentro de una región `aria-live`.
 */
export function RejillaMeses({
  mes,
  limites,
  alElegir,
  alCerrar,
  mesDeHoy,
  motivoAntes = "ya pasó",
  motivoDespues = "todavía no se puede elegir",
  id,
  className,
}: {
  /** El mes que se está mirando (`AAAA-MM`): sale marcado. */
  mes: ClaveMes;
  limites: LimitesMes;
  alElegir: (mes: ClaveMes) => void;
  /** Escape. Quien lo abrió devuelve el foco a su botón. */
  alCerrar: () => void;
  /** El mes de hoy, con un anillo para ubicarse. */
  mesDeHoy?: ClaveMes;
  /** Lo que oye el lector en un mes anterior al primero que se puede elegir. */
  motivoAntes?: string;
  /** Y en uno posterior al último. */
  motivoDespues?: string;
  id?: string;
  className?: string;
}) {
  const anios = aniosDelSelector(limites);
  const primerAnio = anios[0] ?? anioDe(mes);
  const ultimoAnio = anios[anios.length - 1] ?? anioDe(mes);

  /* El mes enfocado decide el año a la vista: mover el foco a enero del año
     siguiente ya es cambiar de año. */
  const [foco, setFoco] = useState<ClaveMes>(mes);
  const anio = Math.min(Math.max(anioDe(foco), primerAnio), ultimoAnio);
  const meses = mesesDelAnio(anio, limites);

  const botones = useRef<Map<ClaveMes, HTMLButtonElement>>(new Map());
  const primeraVez = useRef(true);

  /* El foco entra en la rejilla al abrirse y sigue al mes enfocado. */
  useEffect(() => {
    botones.current.get(foco)?.focus({ preventScroll: !primeraVez.current });
    primeraVez.current = false;
  }, [foco]);

  function enfocar(clave: ClaveMes) {
    const anioNuevo = anioDe(clave);
    if (anioNuevo < primerAnio || anioNuevo > ultimoAnio) return;
    setFoco(clave);
  }

  function moverFoco(cantidad: number) {
    const total = anioDe(foco) * 12 + (numeroDeMes(foco) - 1) + cantidad;
    enfocar(claveDe(Math.floor(total / 12), (total % 12) + 1));
  }

  function alPulsarTecla(evento: KeyboardEvent<HTMLDivElement>) {
    const saltos: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -3,
      ArrowDown: 3,
      PageUp: -12,
      PageDown: 12,
    };
    if (evento.key in saltos) {
      evento.preventDefault();
      moverFoco(saltos[evento.key]);
      return;
    }
    if (evento.key === "Home") {
      evento.preventDefault();
      enfocar(claveDe(anio, 1));
      return;
    }
    if (evento.key === "End") {
      evento.preventDefault();
      enfocar(claveDe(anio, 12));
      return;
    }
    if (evento.key === "Escape") {
      evento.preventDefault();
      evento.stopPropagation();
      alCerrar();
    }
  }

  function cambiarAnio(delta: number) {
    const destino = anio + delta;
    if (destino < primerAnio || destino > ultimoAnio) return;
    /* Se conserva el mes: de octubre de 2026 a octubre de 2027. */
    setFoco(claveDe(destino, numeroDeMes(foco)));
  }

  return (
    <div id={id} className={className} onKeyDown={alPulsarTecla}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => cambiarAnio(-1)}
          disabled={anio <= primerAnio}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-petroleo-700 transition-colors duration-200 hover:bg-crema-100 disabled:pointer-events-none disabled:opacity-35"
        >
          <span className="sr-only">Año anterior</span>
          <Chevron className="size-4 rotate-180" />
        </button>
        <p
          aria-live="polite"
          className="font-titulo text-[0.9375rem] font-bold tabular-nums text-petroleo-900"
        >
          {anio}
        </p>
        <button
          type="button"
          onClick={() => cambiarAnio(1)}
          disabled={anio >= ultimoAnio}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-petroleo-700 transition-colors duration-200 hover:bg-crema-100 disabled:pointer-events-none disabled:opacity-35"
        >
          <span className="sr-only">Año siguiente</span>
          <Chevron className="size-4" />
        </button>
      </div>

      <div
        role="group"
        aria-label={`Meses de ${anio}`}
        className="grid grid-cols-3 gap-1.5"
      >
        {meses.map((opcion) => {
          const elegido = opcion.clave === mes;
          const deHoy = opcion.clave === mesDeHoy;
          return (
            <button
              key={opcion.clave}
              ref={(nodo) => {
                if (nodo) botones.current.set(opcion.clave, nodo);
                else botones.current.delete(opcion.clave);
              }}
              type="button"
              tabIndex={opcion.clave === foco ? 0 : -1}
              aria-disabled={!opcion.permitido || undefined}
              aria-current={elegido ? "date" : undefined}
              aria-label={
                opcion.permitido
                  ? mesEnPalabras(opcion.clave)
                  : `${mesEnPalabras(opcion.clave)} — ${
                      opcion.clave < limites.minimo ? motivoAntes : motivoDespues
                    }`
              }
              onClick={() => {
                if (opcion.permitido) alElegir(opcion.clave);
              }}
              className={[
                "flex min-h-11 items-center justify-center rounded-[12px] text-sm capitalize transition-colors duration-150",
                elegido
                  ? "bg-petroleo-600 font-bold text-white hover:bg-petroleo-700"
                  : opcion.permitido
                    ? `font-medium text-petroleo-900 hover:bg-crema-100 ${deHoy ? "ring-1 ring-inset ring-petroleo-400" : ""}`
                    : "cursor-not-allowed text-crema-400 line-through opacity-70",
              ].join(" ")}
            >
              {opcion.corto}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
