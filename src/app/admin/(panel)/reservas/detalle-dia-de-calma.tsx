"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useId, useRef } from "react";

import { fondoDeColumna, tonoCupo } from "./estilos-calendario";
import { Pastilla } from "@/components/admin/ui";
import type {
  DetalleDiaDeCalma,
  DiaDelCalendario,
  ParticipanteDiaDeCalma,
} from "@/lib/admin/calendario-mes";
import { ETIQUETA_ESTADO, TONO_ESTADO } from "@/lib/admin/tipos";
import { CUPO_DIA_DE_CALMA } from "@/lib/reserva/dia-de-calma";
import { formatearFechaConDia } from "@/lib/utils/formato";

/**
 * El detalle del Día de Calma de un día: quién viene.
 *
 * La fila «Día de Calma» del calendario solo dice el cupo («4/10»). Al tocar
 * un día —en la cuadrícula del escritorio o en la agenda «Por día» del
 * celular— se abre una ventana con TODAS las reservas de Día de Calma de ese
 * día: las del sitio y del panel (titular, personas, teléfono, correo, estado,
 * código y su ficha) y los «plan día» del calendario del hotel (título y 2
 * personas). Al final, el total frente al cupo.
 *
 * Hay UNA sola ventana para las dos vistas: la tiene `VistasCalendario` y las
 * celdas la piden por contexto. La cuadrícula se pinta en el servidor, pero sus
 * celdas del Día de Calma son de cliente y viven dentro de `VistasCalendario`,
 * así que el contexto les llega.
 */

const AbrirDiaDeCalma = createContext<((iso: string) => void) | null>(null);

export const ProveedorDiaDeCalma = AbrirDiaDeCalma.Provider;

/* ===========================================================================
 * La fila del Día de Calma en la cuadrícula del mes
 * ======================================================================== */

export function CeldasDiaDeCalma({
  dias,
  personasDeDia,
  diaDeCalmaDelHotel,
  conDetalle,
}: {
  dias: DiaDelCalendario[];
  personasDeDia: Record<string, number>;
  diaDeCalmaDelHotel: Record<string, string[]>;
  /** Días con alguien (aunque sea una cancelada): esos se pueden tocar. */
  conDetalle: string[];
}) {
  const abrir = useContext(AbrirDiaDeCalma);
  const tocables = new Set(conDetalle);

  return (
    <>
      {dias.map((dia, indice) => {
        const personas = personasDeDia[dia.iso] ?? 0;
        /* Los «plan día» del calendario del hotel cuentan aquí (2 cada uno) y
           no en ninguna cabaña: la casilla lleva borde punteado, como todo lo
           que viene de Google. */
        const delHotel = diaDeCalmaDelHotel[dia.iso] ?? [];
        const detalleHotel = delHotel.length
          ? `. Incluye ${delHotel.map((titulo) => `«${titulo}»`).join(", ")} del calendario del hotel (cada «plan día» cuenta 2 y no ocupa cabaña)`
          : "";
        const descripcion = `${formatearFechaConDia(dia.iso)}: ${personas} de ${CUPO_DIA_DE_CALMA} cupos del Día de Calma${personas >= CUPO_DIA_DE_CALMA ? " (completo)" : ""}${detalleHotel}`;
        const clases = `flex h-8 flex-1 items-center justify-center rounded-[8px] text-[0.6875rem] font-bold tabular-nums ${
          personas > 0 ? tonoCupo(personas) : "bg-crema-900/[0.05] text-crema-600"
        } ${delHotel.length ? "border border-dashed border-crema-900/45" : ""}`;
        return (
          <div
            key={dia.iso}
            style={{ gridColumn: indice + 1 }}
            className={`flex h-12 items-center px-1 ${fondoDeColumna(dia)}`}
          >
            {tocables.has(dia.iso) && abrir ? (
              <button
                type="button"
                onClick={() => abrir(dia.iso)}
                title={`${descripcion}. Toca para ver quién viene.`}
                aria-label={`${descripcion}. Ver quién viene.`}
                className={`${clases} cursor-pointer transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-700`}
              >
                {personas}/{CUPO_DIA_DE_CALMA}
              </button>
            ) : personas > 0 ? (
              <span title={descripcion} className={clases}>
                {personas}/{CUPO_DIA_DE_CALMA}
              </span>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

/* ===========================================================================
 * El botón de la agenda del celular
 * ======================================================================== */

export function BotonVerDiaDeCalma({ iso }: { iso: string }) {
  const abrir = useContext(AbrirDiaDeCalma);
  if (!abrir) return null;
  return (
    <button
      type="button"
      onClick={() => abrir(iso)}
      className="inline-flex min-h-9 items-center gap-1 rounded-full bg-white px-3 text-[0.8125rem] font-semibold text-petroleo-700 ring-1 ring-crema-900/[0.1] transition-colors hover:bg-crema-50"
    >
      Ver quién viene
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
      >
        <path d="m10 6 6 6-6 6" />
      </svg>
    </button>
  );
}

/* ===========================================================================
 * La ventana
 * ======================================================================== */

export function VentanaDiaDeCalma({
  iso,
  detalle,
  alCerrar,
}: {
  /** El día abierto; `null` = cerrada. */
  iso: string | null;
  /** Lo de ese día; sin entrada si no hay nadie. */
  detalle: DetalleDiaDeCalma | undefined;
  alCerrar: () => void;
}) {
  const ventana = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  /* `showModal()` da el foco atrapado, Escape y el fondo inerte del navegador. */
  useEffect(() => {
    const dialogo = ventana.current;
    if (!dialogo) return;
    if (iso && !dialogo.open) dialogo.showModal();
    if (!iso && dialogo.open) dialogo.close();
  }, [iso]);

  const participantes = detalle?.participantes ?? [];
  const suman = participantes.filter((participante) => participante.cuenta);
  const noSuman = participantes.filter((participante) => !participante.cuenta);
  const personas = detalle?.personas ?? 0;
  const libres = detalle?.libres ?? CUPO_DIA_DE_CALMA;

  return (
    <dialog
      ref={ventana}
      aria-labelledby={idTitulo}
      onClose={alCerrar}
      /* Tocar el fondo oscuro cierra (el clic cae en el propio <dialog>). */
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) evento.currentTarget.close();
      }}
      className="m-auto max-h-[min(88dvh,46rem)] w-[min(34rem,calc(100%-2rem))] overflow-hidden rounded-amplio bg-white p-0 text-crema-900 shadow-tarjeta backdrop:bg-black/40"
    >
      {iso ? (
        <div className="flex max-h-[min(88dvh,46rem)] flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-crema-900/[0.07] px-5 py-4">
            <div className="min-w-0">
              <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-crema-600">
                Día de Calma
              </p>
              <h2
                id={idTitulo}
                className="font-titulo text-[1.125rem] font-semibold text-crema-900"
              >
                {formatearFechaConDia(iso)}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => ventana.current?.close()}
              aria-label="Cerrar"
              className="-mr-1.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-crema-700 transition-colors hover:bg-crema-900/[0.06]"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="size-5"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </header>

          <div className="overflow-y-auto overscroll-contain px-5 py-4">
            {participantes.length === 0 ? (
              <p className="text-[0.875rem] text-crema-700">
                Nadie tiene Día de Calma este día.
              </p>
            ) : (
              <>
                <ul className="space-y-2.5">
                  {suman.map((participante) => (
                    <Participante key={participante.clave} participante={participante} />
                  ))}
                </ul>
                {noSuman.length > 0 ? (
                  <>
                    <p className="mb-2 mt-5 text-[0.75rem] font-semibold uppercase tracking-wide text-crema-600">
                      No suman al cupo
                    </p>
                    <ul className="space-y-2.5">
                      {noSuman.map((participante) => (
                        <Participante key={participante.clave} participante={participante} />
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            )}
          </div>

          <footer className="border-t border-crema-900/[0.07] bg-crema-100/70 px-5 py-3.5">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem]">
              <span className="font-semibold">Total:</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[0.8125rem] font-bold tabular-nums ${
                  personas > 0 ? tonoCupo(personas) : "bg-crema-900/[0.06] text-crema-700"
                }`}
              >
                {personas} de {CUPO_DIA_DE_CALMA} personas
              </span>
              <span className="text-[0.875rem] text-crema-700">
                {libres > 0
                  ? `quedan ${libres} ${libres === 1 ? "cupo" : "cupos"}`
                  : "completo"}
              </span>
            </p>
            <p className="mt-1 text-[0.75rem] leading-relaxed text-crema-600">
              Suman las confirmadas, las pendientes que aún están en plazo de
              pago y cada «plan día» del calendario del hotel (2 personas).
            </p>
          </footer>
        </div>
      ) : null}
    </dialog>
  );
}

function Participante({ participante }: { participante: ParticipanteDiaDeCalma }) {
  const personas = `${participante.personas} ${participante.personas === 1 ? "persona" : "personas"}`;

  if (participante.fuente === "calendario") {
    return (
      <li className="rounded-tarjeta bg-petroleo-50/70 px-4 py-3 outline-1 -outline-offset-1 outline-dashed outline-petroleo-600/45">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 break-words font-semibold">{participante.nombre}</span>
          <span className="ml-auto whitespace-nowrap text-[0.8125rem] font-semibold tabular-nums">
            {personas}
          </span>
        </div>
        <p className="mt-0.5 text-[0.75rem] font-semibold text-petroleo-800">
          Calendario del hotel
        </p>
        <p className="mt-1 text-[0.75rem] leading-relaxed text-crema-700">
          Evento apuntado a mano en Google: no tiene teléfono ni correo, y cuenta 2
          personas, como cada «plan día».
        </p>
      </li>
    );
  }

  return (
    <li
      className={`rounded-tarjeta px-4 py-3 ring-1 ring-crema-900/[0.08] ${
        participante.cuenta ? "bg-white" : "bg-crema-50"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="min-w-0 break-words font-semibold">{participante.nombre}</span>
        <Pastilla tono={TONO_ESTADO[participante.estado]}>
          {ETIQUETA_ESTADO[participante.estado]}
        </Pastilla>
        <span className="ml-auto whitespace-nowrap text-[0.8125rem] font-semibold tabular-nums">
          {personas}
        </span>
      </div>
      <p className="mt-0.5 text-[0.75rem] text-crema-600">
        {participante.codigo}
        <span className="mx-1.5">·</span>
        {participante.deDonde}
      </p>
      <p className="mt-1.5 flex flex-col gap-0.5 text-[0.8125rem] sm:flex-row sm:flex-wrap sm:gap-x-4">
        {participante.telefono ? (
          <a
            href={`tel:${participante.telefono.replace(/[^\d+]/g, "")}`}
            className="text-petroleo-700 underline-offset-4 hover:underline"
          >
            {participante.telefono}
          </a>
        ) : (
          <span className="text-crema-500">Sin teléfono</span>
        )}
        {participante.correo ? (
          <a
            href={`mailto:${participante.correo}`}
            className="break-all text-petroleo-700 underline-offset-4 hover:underline"
          >
            {participante.correo}
          </a>
        ) : (
          <span className="text-crema-500">Sin correo</span>
        )}
      </p>
      {participante.porQueNoCuenta ? (
        <p className="mt-1 text-[0.75rem] text-crema-600">{participante.porQueNoCuenta}</p>
      ) : null}
      <Link
        href={participante.href}
        className="mt-2 inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-petroleo-700 underline-offset-4 hover:underline"
      >
        Ver la ficha
        <span aria-hidden="true">→</span>
      </Link>
    </li>
  );
}
