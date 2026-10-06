"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { pielDeBarra, tonoCupo } from "./estilos-calendario";
import {
  cabanasEnDia,
  type CalendarioDelMes,
} from "@/lib/admin/calendario-mes";
import { fechaConDia } from "@/lib/admin/fechas";
import { CUPO_DIA_DE_CALMA } from "@/lib/reserva/dia-de-calma";

/**
 * Las dos vistas del calendario de ocupación.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EN EL CELULAR ES UNA AGENDA POR DÍA
 * ---------------------------------------------------------------------------
 * La cuadrícula del mes son cinco filas por 31 columnas: en un teléfono de
 * 390 px eso es o una rejilla ilegible o un rollo horizontal en el que se
 * pierde la cabaña. Y la pregunta que llega por WhatsApp casi siempre es de un
 * día: «¿tienen algo libre el sábado 17?». Por eso en el celular se abre una
 * **agenda por día**: una tira de días del mes —cada uno con cuántas cabañas
 * tiene ocupadas— y, debajo, las cinco cabañas de ese día con quién duerme,
 * quién llega, quién sale por la mañana y el cupo del Día de Calma. La
 * cuadrícula sigue a un toque («Mes completo») para quien quiera el mapa
 * entero.
 *
 * En escritorio (desde `md`) se ve solo la cuadrícula: ahí sí cabe y es la
 * mejor forma de ver el mes de un vistazo.
 */
export function VistasCalendario({
  calendario,
  cuadricula,
  indiceInicial,
}: {
  calendario: CalendarioDelMes;
  /** La cuadrícula del mes, ya pintada en el servidor. */
  cuadricula: ReactNode;
  /** Día que se abre en la agenda: hoy si es este mes, si no el 1. */
  indiceInicial: number;
}) {
  const [vista, setVista] = useState<"dia" | "mes">("dia");

  return (
    <>
      <div
        role="group"
        aria-label="Cómo ver el calendario"
        className="mx-4 mt-3 grid grid-cols-2 gap-1 rounded-full bg-crema-900/[0.06] p-1 md:hidden"
      >
        {(
          [
            ["dia", "Por día"],
            ["mes", "Mes completo"],
          ] as const
        ).map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={vista === valor}
            onClick={() => setVista(valor)}
            className={`min-h-10 rounded-full text-[0.875rem] font-semibold transition-colors ${
              vista === valor
                ? "bg-white text-crema-900 shadow-tenue"
                : "text-crema-700"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      <div className={vista === "dia" ? "md:hidden" : "hidden"}>
        <AgendaDelMes calendario={calendario} indiceInicial={indiceInicial} />
      </div>
      <div className={vista === "mes" ? "mt-3 md:mt-0" : "hidden md:block"}>
        {cuadricula}
      </div>
    </>
  );
}

function AgendaDelMes({
  calendario,
  indiceInicial,
}: {
  calendario: CalendarioDelMes;
  indiceInicial: number;
}) {
  const { dias } = calendario;
  const [indice, setIndice] = useState(
    Math.min(Math.max(indiceInicial, 0), dias.length - 1),
  );
  const tira = useRef<HTMLDivElement>(null);
  const elegido = useRef<HTMLButtonElement>(null);

  /* El día elegido siempre a la vista dentro de la tira (que se desplaza
     sola, sin mover la página). */
  useEffect(() => {
    const contenedor = tira.current;
    const boton = elegido.current;
    if (!contenedor || !boton) return;
    const izquierda =
      boton.offsetLeft - contenedor.clientWidth / 2 + boton.clientWidth / 2;
    contenedor.scrollTo({ left: Math.max(0, izquierda), behavior: "smooth" });
  }, [indice]);

  const dia = dias[indice];
  if (!dia) return null;
  const cabanas = cabanasEnDia(calendario, indice);
  const ocupadas = cabanas.filter((cabana) => cabana.noche !== null).length;
  const personas = calendario.personasDeDia[dia.iso] ?? 0;

  /* Cuántas cabañas tiene ocupadas cada día, para la tira. */
  const ocupadasPorDia = dias.map(
    (_, posicion) =>
      calendario.filas.filter((fila) =>
        fila.barras.some(
          (barra) =>
            barra.inicio <= posicion && posicion < barra.inicio + barra.noches,
        ),
      ).length,
  );

  return (
    <div className="pb-4 pt-3">
      {/* `relative`: el contenedor que se desplaza es también el que contiene
          lo que va dentro, así que nada se le escapa y ensancha la página. */}
      <div
        ref={tira}
        role="group"
        aria-label="Días del mes"
        className="relative flex gap-1.5 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:thin]"
      >
        {dias.map((otro, posicion) => {
          const activo = posicion === indice;
          return (
            <button
              key={otro.iso}
              ref={activo ? elegido : undefined}
              type="button"
              onClick={() => setIndice(posicion)}
              aria-pressed={activo}
              aria-label={`${fechaConDia(otro.iso)}${otro.festivo ? `, festivo (${otro.festivo})` : ""}${otro.esHoy ? ", hoy" : ""}: ${ocupadasPorDia[posicion]} de ${calendario.filas.length} cabañas ocupadas`}
              className={`flex w-12 shrink-0 flex-col items-center rounded-[14px] py-1.5 transition-colors ${
                activo
                  ? "bg-petroleo-600 text-white shadow-tenue"
                  : otro.destacado
                    ? "bg-crema-200/70 text-crema-900"
                    : "bg-white text-crema-900 ring-1 ring-inset ring-crema-900/[0.07]"
              } ${otro.esHoy && !activo ? "ring-2 ring-inset ring-petroleo-500" : ""}`}
            >
              <span
                className={`text-[0.625rem] font-semibold uppercase ${activo ? "text-white/80" : "text-crema-600"}`}
              >
                {otro.semana}
              </span>
              <span className="text-[1rem] font-semibold leading-tight tabular-nums">
                {otro.numero}
              </span>
              <span
                aria-hidden="true"
                className={`mt-0.5 text-[0.625rem] font-semibold tabular-nums ${activo ? "text-white/85" : ocupadasPorDia[posicion] > 0 ? "text-petroleo-700" : "text-crema-400"}`}
              >
                {ocupadasPorDia[posicion]}/{calendario.filas.length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 px-4">
        <button
          type="button"
          onClick={() => setIndice((valor) => Math.max(0, valor - 1))}
          disabled={indice === 0}
          aria-label="Día anterior"
          className="inline-flex size-10 items-center justify-center rounded-full text-crema-700 hover:bg-crema-900/[0.06] disabled:opacity-30"
        >
          <Chevron girado />
        </button>
        <div className="min-w-0 text-center" aria-live="polite">
          <p className="font-titulo text-[1rem] font-semibold text-crema-900">
            {fechaConDia(dia.iso)}
            {dia.esHoy ? (
              <span className="ml-2 rounded-full bg-petroleo-600 px-2 py-0.5 align-middle text-[0.6875rem] font-semibold text-white">
                hoy
              </span>
            ) : null}
          </p>
          <p className="text-[0.75rem] text-crema-600">
            {dia.festivo ? `Festivo: ${dia.festivo} · ` : ""}
            {ocupadas} de {cabanas.length} cabañas ocupadas esa noche
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIndice((valor) => Math.min(dias.length - 1, valor + 1))}
          disabled={indice === dias.length - 1}
          aria-label="Día siguiente"
          className="inline-flex size-10 items-center justify-center rounded-full text-crema-700 hover:bg-crema-900/[0.06] disabled:opacity-30"
        >
          <Chevron />
        </button>
      </div>

      <ul className="mx-4 mt-3 divide-y divide-crema-900/[0.07] overflow-hidden rounded-tarjeta bg-white ring-1 ring-crema-900/[0.07]">
        {cabanas.map((cabana) => {
          const noche = cabana.noche;
          const piel = noche ? pielDeBarra(noche) : null;
          const contenido = (
            <>
              <span className="w-[5.5rem] shrink-0 pt-0.5 text-[0.8125rem] font-semibold text-crema-900">
                {cabana.nombre}
                {!cabana.activo ? (
                  <span className="block text-[0.6875rem] font-normal text-crema-500">
                    pausada
                  </span>
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                {noche ? (
                  <span
                    style={piel?.estilo}
                    className={`flex min-h-9 items-center rounded-[10px] px-2.5 text-[0.8125rem] font-semibold ${piel?.clase ?? ""}`}
                  >
                    <span className="truncate">{noche.etiqueta}</span>
                  </span>
                ) : (
                  <span className="flex min-h-9 items-center text-[0.8125rem] font-medium text-oliva-700">
                    Libre
                  </span>
                )}
                <span className="mt-1 block text-[0.75rem] leading-snug text-crema-600">
                  {describirDia(cabana.llega, noche, cabana.sale)}
                </span>
              </span>
            </>
          );
          return (
            <li key={cabana.id}>
              {noche?.href ? (
                <Link
                  href={noche.href}
                  title={noche.detalle}
                  className="flex items-start gap-3 px-3.5 py-3 transition-colors hover:bg-crema-900/[0.025]"
                >
                  {contenido}
                </Link>
              ) : (
                <div
                  title={noche?.detalle}
                  className="flex items-start gap-3 px-3.5 py-3"
                >
                  {contenido}
                </div>
              )}
            </li>
          );
        })}
        <li className="flex items-center gap-3 bg-crema-100/60 px-3.5 py-3">
          <span className="w-[5.5rem] shrink-0 text-[0.8125rem] font-semibold text-crema-900">
            Día de Calma
          </span>
          {personas > 0 ? (
            <span
              className={`rounded-full px-2.5 py-1 text-[0.75rem] font-bold tabular-nums ${tonoCupo(personas)}`}
            >
              {personas} de {CUPO_DIA_DE_CALMA} cupos
            </span>
          ) : (
            <span className="text-[0.8125rem] text-crema-600">
              Nadie todavía · {CUPO_DIA_DE_CALMA} cupos libres
            </span>
          )}
        </li>
      </ul>
    </div>
  );
}

/** Una línea por cabaña: llega, se queda, sale por la mañana. */
function describirDia(
  llega: boolean,
  noche: ReturnType<typeof cabanasEnDia>[number]["noche"],
  sale: ReturnType<typeof cabanasEnDia>[number]["sale"],
): string {
  const partes: string[] = [];
  if (sale) {
    partes.push(
      sale.fuente === "bloqueo"
        ? "Termina un bloqueo esta mañana"
        : `Sale por la mañana: ${sale.etiqueta}`,
    );
  }
  if (noche?.fuente === "bloqueo") {
    partes.push(
      `Bloqueada${llega ? " desde hoy" : ""}; se libera el ${fechaConDia(noche.salida)}`,
    );
  } else if (noche) {
    const fuente =
      noche.fuente === "google"
        ? "Calendario del hotel"
        : "Reserva del sitio o del panel";
    const tramo = llega
      ? `llega hoy, sale el ${fechaConDia(noche.salida)}`
      : `sale el ${fechaConDia(noche.salida)}`;
    partes.push(`${fuente} · ${tramo}`);
  }
  return partes.join(" · ") || "Nadie llega ni sale";
}

function Chevron({ girado = false }: { girado?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-5 ${girado ? "rotate-180" : ""}`}
    >
      <path d="m10 6 6 6-6 6" />
    </svg>
  );
}
