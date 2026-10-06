"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { CLASE_INPUT } from "@/components/admin/ui";
import { IconoCalendario } from "@/components/sitio/iconos";
import { useLadoDelPanel } from "@/components/sitio/usar-lado-panel";
import { RejillaMeses } from "@/components/ui/rejilla-meses";
import { nombreDelFestivo } from "@/lib/festivos-colombia";
import {
  DIAS_SEMANA_CORTOS,
  diaSemanaISO,
  formatearFecha,
  hoyEnBogota,
  leerFechaNumerica,
  sumarDias,
  type FechaISO,
} from "@/lib/utils/formato";
import {
  limitesDelPanel,
  mesEnPalabras,
  moverMes,
  puedeAvanzar,
  puedeRetroceder,
  type LimitesMes,
} from "@/lib/utils/selector-mes";

/**
 * Selector de UN día para el panel, siempre en `dd/mm/aaaa`.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO ES UN `<input type="date">`
 * ---------------------------------------------------------------------------
 * El campo nativo escribe la fecha como diga el idioma del NAVEGADOR: con
 * Chrome en inglés sale `12/01/2026` para el 1 de diciembre, y eso fue lo que
 * vio Cesar. La regla del proyecto es `dd/mm/aaaa` siempre, así que el campo
 * es de texto —se puede escribir `05/10/2026`, `5/10/2026` o `05102026`— con
 * un calendario al lado, del mismo estilo que el de reservar
 * (`calendario-fechas.tsx`), para quien prefiera tocar el día.
 *
 * Es UN día, sin semántica de llegada y salida: en las tarifas diferenciales
 * «Primera noche» y «Última noche» son dos noches, las dos incluidas, y en los
 * bloqueos «Primera noche bloqueada» y «Vuelve a estar libre el» se eligen por
 * separado con su propia etiqueta. Por eso no se reutiliza el calendario de
 * rango del sitio, que habla de llegada y salida.
 *
 * ---------------------------------------------------------------------------
 * EL FORMULARIO
 * ---------------------------------------------------------------------------
 * Lo que viaja es un campo oculto con la fecha ISO (`AAAA-MM-DD`), que es lo
 * que esperan las Server Actions. El campo visible no lleva `name`: lleva
 * `required` y una validez propia (`setCustomValidity`), así que el navegador
 * no deja enviar una fecha a medio escribir o fuera de rango y lo dice en
 * español.
 *
 * Sirve controlado (`valor` + `alCambiar`) o no (`valorInicial`).
 */
export function SelectorFecha({
  id,
  name,
  valor,
  valorInicial,
  alCambiar,
  minima,
  maxima,
  required = false,
  etiqueta,
}: {
  /** El `id` del campo visible: el `htmlFor` de su etiqueta. */
  id: string;
  /** Nombre del campo oculto que lleva la fecha ISO al formulario. */
  name: string;
  /** Controlado: la fecha ISO, o `""` si no hay. */
  valor?: FechaISO;
  /** No controlado: la fecha ISO con la que empieza. */
  valorInicial?: FechaISO;
  alCambiar?: (fecha: FechaISO) => void;
  /** Primer día elegible (incluido). */
  minima?: FechaISO;
  /** Último día elegible (incluido). */
  maxima?: FechaISO;
  required?: boolean;
  /** Para el lector de pantalla del calendario: «Primera noche», «Última noche»… */
  etiqueta: string;
}) {
  const controlado = valor !== undefined;
  const [interno, setInterno] = useState<FechaISO>(valorInicial ?? "");
  const actual = controlado ? valor : interno;

  const [texto, setTexto] = useState(() => (actual ? formatearFecha(actual) : ""));
  const [tocado, setTocado] = useState(false);

  /* Si la fecha cambia desde fuera (un efecto del formulario que mueve la
     salida, por ejemplo), el texto la sigue. Lo que se está escribiendo y
     todavía no es una fecha no se pisa: no cambia `actual`. */
  useEffect(() => {
    setTexto((previo) => {
      if (!actual) return previo.trim() === "" || leerFechaNumerica(previo) ? "" : previo;
      return leerFechaNumerica(previo) === actual ? previo : formatearFecha(actual);
    });
  }, [actual]);

  const fijar = useCallback(
    (fecha: FechaISO) => {
      if (!controlado) setInterno(fecha);
      alCambiar?.(fecha);
    },
    [controlado, alCambiar],
  );

  const fueraDeRango = useCallback(
    (fecha: FechaISO) => Boolean((minima && fecha < minima) || (maxima && fecha > maxima)),
    [minima, maxima],
  );

  /** Qué tiene de malo lo escrito, en español, o `null`. */
  const problema = useMemo(() => {
    if (texto.trim() === "") return null; // `required` ya lo dice el navegador
    const leida = leerFechaNumerica(texto);
    if (!leida) return "Escribe la fecha como dd/mm/aaaa, por ejemplo 05/10/2026.";
    if (minima && leida < minima) return `Tiene que ser el ${formatearFecha(minima)} o después.`;
    if (maxima && leida > maxima) return `Tiene que ser el ${formatearFecha(maxima)} o antes.`;
    return null;
  }, [texto, minima, maxima]);

  const campo = useRef<HTMLInputElement>(null);
  useEffect(() => {
    campo.current?.setCustomValidity(problema ?? "");
  }, [problema]);

  /* --- El calendario ---------------------------------------------------- */

  const idPanel = useId();
  const idMeses = useId();
  const idAviso = useId();
  const hoy = useMemo(() => hoyEnBogota(), []);
  const [abierto, setAbierto] = useState(false);
  const [eligiendoMes, setEligiendoMes] = useState(false);
  const [mes, setMes] = useState(() => (actual || hoy).slice(0, 7));
  const [foco, setFoco] = useState<FechaISO>(() => actual || hoy);

  const limites = useMemo<LimitesMes>(() => {
    const panel = limitesDelPanel(hoy);
    return {
      minimo: minima ? minima.slice(0, 7) : panel.minimo,
      maximo: maxima ? maxima.slice(0, 7) : panel.maximo,
    };
  }, [hoy, minima, maxima]);

  const contenedor = useRef<HTMLDivElement>(null);
  const disparador = useRef<HTMLButtonElement>(null);
  const hoja = useRef<HTMLDivElement>(null);
  const botonMes = useRef<HTMLButtonElement>(null);
  const celdaEnfocada = useRef<HTMLButtonElement>(null);

  const { lado, espacio } = useLadoDelPanel({
    abierto,
    disparador,
    panel: hoja,
    altoEstimado: 420,
  });

  const abrir = () => {
    const base = actual || (minima && minima > hoy ? minima : hoy);
    setMes(base.slice(0, 7));
    setFoco(base);
    setEligiendoMes(false);
    setAbierto(true);
  };

  const cerrar = useCallback((devolverFoco: boolean) => {
    setAbierto(false);
    setEligiendoMes(false);
    if (devolverFoco) campo.current?.focus();
  }, []);

  /* Escape y clic fuera cierran; con la rejilla de meses abierta, Escape
     vuelve a los días (como en `calendario-fechas.tsx`). */
  const eligiendoMesRef = useRef(false);
  useEffect(() => {
    eligiendoMesRef.current = eligiendoMes;
  });
  useEffect(() => {
    if (!abierto) return;
    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      evento.stopPropagation();
      if (eligiendoMesRef.current) {
        setEligiendoMes(false);
        botonMes.current?.focus();
        return;
      }
      cerrar(true);
    }
    function alPulsarFuera(evento: MouseEvent) {
      if (!contenedor.current?.contains(evento.target as Node)) cerrar(false);
    }
    document.addEventListener("keydown", alPulsarTecla, true);
    document.addEventListener("mousedown", alPulsarFuera);
    return () => {
      document.removeEventListener("keydown", alPulsarTecla, true);
      document.removeEventListener("mousedown", alPulsarFuera);
    };
  }, [abierto, cerrar]);

  useEffect(() => {
    if (abierto && !eligiendoMes) celdaEnfocada.current?.focus();
  }, [abierto, foco, mes, eligiendoMes]);

  const elegir = (dia: FechaISO) => {
    if (fueraDeRango(dia)) return;
    setTexto(formatearFecha(dia));
    setTocado(true);
    fijar(dia);
    cerrar(true);
  };

  const moverFoco = (nuevo: FechaISO) => {
    if (fueraDeRango(nuevo)) return;
    if (nuevo.slice(0, 7) < limites.minimo || nuevo.slice(0, 7) > limites.maximo) return;
    setFoco(nuevo);
    if (nuevo.slice(0, 7) !== mes) setMes(nuevo.slice(0, 7));
  };

  const teclasRejilla = (evento: React.KeyboardEvent<HTMLTableSectionElement>) => {
    const saltos: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (evento.key in saltos) {
      evento.preventDefault();
      moverFoco(sumarDias(foco, saltos[evento.key]));
    } else if (evento.key === "Home") {
      evento.preventDefault();
      moverFoco(sumarDias(foco, -(diaSemanaISO(foco) - 1)));
    } else if (evento.key === "End") {
      evento.preventDefault();
      moverFoco(sumarDias(foco, 7 - diaSemanaISO(foco)));
    } else if (evento.key === "PageUp" || evento.key === "PageDown") {
      evento.preventDefault();
      const destino = moverMes(foco.slice(0, 7), evento.key === "PageUp" ? -1 : 1);
      moverFoco(`${destino}-${foco.slice(8, 10) > "28" ? "28" : foco.slice(8, 10)}`);
    }
  };

  const semanas = semanasDelMes(mes);
  const hoyElegible = !fueraDeRango(hoy);

  return (
    <div ref={contenedor} className="relative">
      <input type="hidden" name={name} value={actual} />
      <div className="relative">
        <input
          ref={campo}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/aaaa"
          maxLength={10}
          required={required}
          value={texto}
          aria-invalid={tocado && problema ? true : undefined}
          aria-describedby={tocado && problema ? idAviso : undefined}
          onChange={(evento) => {
            const nuevo = evento.target.value;
            setTexto(nuevo);
            if (nuevo.trim() === "") {
              fijar("");
              return;
            }
            const leida = leerFechaNumerica(nuevo);
            if (leida && !fueraDeRango(leida)) fijar(leida);
          }}
          onBlur={() => {
            setTocado(true);
            const leida = leerFechaNumerica(texto);
            if (leida) setTexto(formatearFecha(leida));
          }}
          className={`${CLASE_INPUT} pr-14 tabular-nums`}
        />
        <button
          ref={disparador}
          type="button"
          onClick={() => (abierto ? cerrar(true) : abrir())}
          aria-expanded={abierto}
          aria-controls={idPanel}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-suave text-oliva-700 transition-colors duration-200 hover:bg-crema-900/[0.05] focus-visible:outline-2 focus-visible:outline-petroleo-500"
        >
          <IconoCalendario className="size-5" />
          <span className="sr-only">Abrir el calendario: {etiqueta}</span>
        </button>
      </div>

      {tocado && problema ? (
        <p id={idAviso} className="mt-1.5 text-[0.75rem] font-medium leading-relaxed text-red-700">
          {problema}
        </p>
      ) : null}

      {abierto ? (
        <>
          <div
            aria-hidden="true"
            onClick={() => cerrar(false)}
            className="fixed inset-0 z-40 bg-petroleo-950/45 sm:hidden"
          />
          <div
            ref={hoja}
            id={idPanel}
            role="group"
            aria-label={`Calendario: ${etiqueta}`}
            data-fab-evitar=""
            style={{ "--alto-hoja": `${Math.max(320, espacio)}px` } as React.CSSProperties}
            className={[
              "fixed inset-x-3 bottom-3 z-50 rounded-[var(--radius-generoso)] bg-white p-4 shadow-[var(--shadow-elevada)] ring-1 ring-crema-200",
              "sm:absolute sm:inset-x-auto sm:left-0 sm:w-[20.5rem]",
              "sm:max-h-[var(--alto-hoja)] sm:overflow-y-auto sm:overscroll-contain",
              lado === "arriba"
                ? "sm:top-auto sm:bottom-[calc(100%+0.5rem)]"
                : "sm:bottom-auto sm:top-[calc(100%+0.5rem)]",
            ].join(" ")}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setMes(moverMes(mes, -1))}
                disabled={!puedeRetroceder(mes, limites)}
                className={`flex size-11 shrink-0 items-center justify-center rounded-full text-petroleo-700 transition-colors duration-200 hover:bg-crema-100 disabled:pointer-events-none disabled:opacity-35 ${eligiendoMes ? "invisible" : ""}`}
              >
                <span className="sr-only">Mes anterior</span>
                <Flecha className="size-4 rotate-180" />
              </button>
              <button
                ref={botonMes}
                type="button"
                onClick={() => setEligiendoMes((valor) => !valor)}
                aria-expanded={eligiendoMes}
                aria-controls={idMeses}
                aria-label={
                  eligiendoMes
                    ? "Volver a los días del mes"
                    : `${mesEnPalabras(mes)}. Cambiar de mes o de año`
                }
                className="flex min-h-11 items-center gap-1.5 rounded-full px-3 font-titulo text-sm font-bold text-petroleo-900 transition-colors duration-200 hover:bg-crema-100"
              >
                <span className="first-letter:uppercase">{mesEnPalabras(mes)}</span>
                <Flecha
                  className={`size-3.5 text-petroleo-600 transition-transform duration-200 ${eligiendoMes ? "-rotate-90" : "rotate-90"}`}
                />
              </button>
              <span aria-live="polite" className="sr-only">
                {mesEnPalabras(mes)}
              </span>
              <button
                type="button"
                onClick={() => setMes(moverMes(mes, 1))}
                disabled={!puedeAvanzar(mes, limites)}
                className={`flex size-11 shrink-0 items-center justify-center rounded-full text-petroleo-700 transition-colors duration-200 hover:bg-crema-100 disabled:pointer-events-none disabled:opacity-35 ${eligiendoMes ? "invisible" : ""}`}
              >
                <span className="sr-only">Mes siguiente</span>
                <Flecha className="size-4" />
              </button>
            </div>

            {eligiendoMes ? (
              <RejillaMeses
                id={idMeses}
                mes={mes}
                limites={limites}
                mesDeHoy={hoy.slice(0, 7)}
                motivoAntes="antes de la primera fecha permitida"
                motivoDespues="después de la última fecha permitida"
                alElegir={(clave) => {
                  setMes(clave);
                  const inicio = `${clave}-01`;
                  setFoco(minima && inicio < minima ? minima : inicio);
                  setEligiendoMes(false);
                }}
                alCerrar={() => {
                  setEligiendoMes(false);
                  botonMes.current?.focus();
                }}
                className="pb-1"
              />
            ) : (
              <table role="grid" className="w-full border-collapse">
                <thead>
                  <tr>
                    {DIAS_SEMANA_CORTOS.map((corto, indice) => (
                      <th
                        key={corto}
                        scope="col"
                        className="pb-1.5 text-center text-[0.68rem] font-semibold tracking-wide text-crema-600 uppercase"
                      >
                        <abbr title={DIAS_LARGOS[indice]} className="no-underline">
                          {corto.slice(0, 2)}
                        </abbr>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody onKeyDown={teclasRejilla}>
                  {semanas.map((semana) => (
                    <tr key={semana[0]}>
                      {semana.map((dia) => {
                        const apagado = fueraDeRango(dia);
                        const elegido = dia === actual;
                        const deOtroMes = dia.slice(0, 7) !== mes;
                        const festivo = nombreDelFestivo(dia);
                        return (
                          <td key={dia} role="gridcell" className="p-px text-center sm:p-0.5">
                            <button
                              ref={dia === foco ? celdaEnfocada : undefined}
                              type="button"
                              tabIndex={dia === foco ? 0 : -1}
                              aria-disabled={apagado || undefined}
                              aria-current={elegido ? "date" : undefined}
                              aria-label={[
                                `${DIAS_LARGOS[diaSemanaISO(dia) - 1]} ${formatearFecha(dia)}`,
                                festivo ? `(${festivo})` : null,
                                dia === hoy ? "— hoy" : null,
                                apagado ? "— fuera de las fechas permitidas" : null,
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={() => elegir(dia)}
                              className={[
                                "relative flex h-11 w-full items-center justify-center rounded-[10px] text-sm transition-colors duration-150",
                                elegido
                                  ? "bg-petroleo-600 font-bold text-white hover:bg-petroleo-700"
                                  : apagado
                                    ? "cursor-not-allowed text-crema-400 line-through opacity-70"
                                    : `${deOtroMes ? "text-crema-400" : "text-petroleo-900"} hover:bg-crema-100 ${dia === hoy ? "ring-1 ring-inset ring-petroleo-400" : ""}`,
                              ].join(" ")}
                            >
                              {Number(dia.slice(8, 10))}
                              {festivo && !elegido ? (
                                <span
                                  aria-hidden="true"
                                  className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-oliva-500"
                                />
                              ) : null}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-crema-200 pt-3">
              {hoyElegible ? (
                <button
                  type="button"
                  onClick={() => elegir(hoy)}
                  className="min-h-11 font-titulo text-xs font-semibold text-crema-600 underline-offset-4 hover:text-petroleo-800 hover:underline"
                >
                  Hoy, {formatearFecha(hoy)}
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => cerrar(true)}
                className="min-h-11 px-3 font-titulo text-xs font-semibold text-petroleo-700 underline-offset-4 hover:underline"
              >
                Cerrar
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

const DIAS_LARGOS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/** Las seis semanas que se pintan de un mes (`AAAA-MM`), empezando en lunes. */
function semanasDelMes(mes: string): FechaISO[][] {
  const primero = `${mes}-01`;
  const inicio = sumarDias(primero, -(diaSemanaISO(primero) - 1));
  return Array.from({ length: 6 }, (_, semana) =>
    Array.from({ length: 7 }, (_, dia) => sumarDias(inicio, semana * 7 + dia)),
  );
}

function Flecha({ className }: { className?: string }) {
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
