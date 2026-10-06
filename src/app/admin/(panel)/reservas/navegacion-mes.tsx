"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { RejillaMeses } from "@/components/ui/rejilla-meses";
import {
  mesEnPalabras,
  moverMes,
  puedeAvanzar,
  puedeRetroceder,
  type ClaveMes,
  type LimitesMes,
} from "@/lib/utils/selector-mes";

/**
 * Cabecera del calendario del panel: flechas de mes, el título que abre el
 * selector de mes y año, y el botón «Hoy».
 *
 * El mes vive en la dirección (`?mes=2026-10`), así que flechas y «Hoy» son
 * enlaces normales: se pueden abrir en otra pestaña y el botón «atrás» del
 * navegador funciona. Lo único con estado en el navegador es la rejilla de
 * meses abierta o cerrada. Las flechas y la rejilla respetan los mismos
 * límites (`limitesDelPanel`).
 */
export function NavegacionMes({
  mes,
  mesDeHoy,
  limites,
  consulta,
  titulo,
}: {
  mes: ClaveMes;
  mesDeHoy: ClaveMes;
  limites: LimitesMes;
  /** El resto de la dirección (el filtro del listado), para no perderlo. */
  consulta: string;
  /** «Octubre 2026». */
  titulo: string;
}) {
  const router = useRouter();
  const idRejilla = useId();
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  const href = (clave: ClaveMes) => {
    const parametros = new URLSearchParams(consulta);
    parametros.set("mes", clave);
    return `/admin/reservas?${parametros.toString()}`;
  };

  /* Clic fuera cierra (Escape lo maneja la rejilla y devuelve el foco). */
  useEffect(() => {
    if (!abierto) return;
    function alPulsarFuera(evento: MouseEvent) {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", alPulsarFuera);
    return () => document.removeEventListener("mousedown", alPulsarFuera);
  }, [abierto]);

  const anterior = moverMes(mes, -1);
  const siguiente = moverMes(mes, 1);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
      <div ref={contenedor} className="relative flex items-center gap-1">
        <Flecha
          href={puedeRetroceder(mes, limites) ? href(anterior) : null}
          etiqueta={`Mes anterior: ${mesEnPalabras(anterior)}`}
          girada
        />
        <button
          ref={boton}
          type="button"
          onClick={() => setAbierto((valor) => !valor)}
          aria-expanded={abierto}
          aria-controls={idRejilla}
          aria-label={`${mesEnPalabras(mes)}. Elegir otro mes o año`}
          className="flex min-h-11 min-w-[11rem] items-center justify-center gap-1.5 rounded-full px-3 font-titulo text-[1.0625rem] font-semibold text-crema-900 transition-colors hover:bg-crema-900/[0.06]"
        >
          {titulo}
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`size-4 text-petroleo-600 transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <Flecha
          href={puedeAvanzar(mes, limites) ? href(siguiente) : null}
          etiqueta={`Mes siguiente: ${mesEnPalabras(siguiente)}`}
        />

        {abierto ? (
          <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[19rem] max-w-[calc(100vw-2rem)] rounded-amplio bg-white p-3 shadow-elevada ring-1 ring-crema-900/[0.08]">
            <RejillaMeses
              id={idRejilla}
              mes={mes}
              limites={limites}
              mesDeHoy={mesDeHoy}
              motivoAntes="fuera del historial del calendario"
              motivoDespues="demasiado lejos en el futuro"
              alElegir={(clave) => {
                setAbierto(false);
                router.push(href(clave), { scroll: false });
              }}
              alCerrar={() => {
                setAbierto(false);
                boton.current?.focus();
              }}
            />
          </div>
        ) : null}
      </div>

      {/* «Hoy» siempre está: fuera del mes actual lleva a él; dentro, no
          estorba y deja claro dónde está uno. */}
      <Link
        href={href(mesDeHoy)}
        scroll={false}
        aria-current={mes === mesDeHoy ? "date" : undefined}
        className={`inline-flex min-h-9 items-center rounded-full px-3.5 text-[0.8125rem] font-semibold transition-colors ${
          mes === mesDeHoy
            ? "bg-petroleo-600/10 text-petroleo-800"
            : "bg-crema-900/[0.06] text-crema-900 hover:bg-crema-900/[0.1]"
        }`}
      >
        Hoy
      </Link>
    </div>
  );
}

function Flecha({
  href,
  etiqueta,
  girada = false,
}: {
  href: string | null;
  etiqueta: string;
  girada?: boolean;
}) {
  const icono = (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${girada ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m10 6 6 6-6 6" />
    </svg>
  );
  const clase =
    "inline-flex h-11 w-11 items-center justify-center rounded-full text-crema-700 transition-colors";
  if (!href) {
    return (
      <span aria-hidden="true" className={`${clase} opacity-30`}>
        {icono}
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      aria-label={etiqueta}
      title={etiqueta}
      className={`${clase} hover:bg-crema-900/[0.07]`}
    >
      {icono}
    </Link>
  );
}
