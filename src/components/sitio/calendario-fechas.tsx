"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { nombreDelFestivo, tipoDeNoche } from "@/lib/festivos-colombia";
import {
  nochePermitida,
  validarEstadia,
  type RestriccionPlan,
} from "@/lib/reglas-reserva";
import { formatearFechaCorta } from "@/lib/utils/formato";

import { IconoCalendario } from "./iconos";

/**
 * Calendario de llegada y salida, escrito a mano.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO ES UN `<input type="date">`
 * ---------------------------------------------------------------------------
 * El campo nativo es cómodo y aquí no sirve, por un motivo concreto: **no sabe
 * deshabilitar días sueltos**. Solo entiende `min`, `max` y `step`. La Finca
 * necesita apagar los viernes, sábados, domingos y festivos cuando el visitante
 * ha elegido el plan Entre Semana, y apagar los lunes a jueves cuando ha
 * elegido Estándar o Premium (§3 de `docs/DATOS_CLIENTE.md`). Con el campo
 * nativo, la única alternativa es dejar elegir cualquier día y rechazarlo
 * después: el visitante escoge un sábado, se ilusiona y recibe un error. Eso no
 * es validar, es tender una trampa.
 *
 * Tampoco entra una librería: un calendario de mes es una tabla de siete
 * columnas y aritmética de días. Lo caro de un calendario no es dibujarlo, es
 * la accesibilidad, y eso hay que revisarlo igual venga de donde venga.
 *
 * ---------------------------------------------------------------------------
 * ACCESIBILIDAD
 * ---------------------------------------------------------------------------
 * · El desplegable es un botón con `aria-expanded` / `aria-controls`.
 * · La rejilla es una `<table role="grid">` de verdad, con los días de la
 *   semana en `<th scope="col">` y su nombre completo en `<abbr>` —el lector de
 *   pantalla dice «lunes», no «lu»—.
 * · **Tabulación itinerante** (`roving tabindex`): dentro de la rejilla solo un
 *   día es tabulable; las flechas mueven el foco día a día, arriba y abajo
 *   saltan semana, `Inicio`/`Fin` van al principio y al final de la semana,
 *   `RePág`/`AvPág` cambian de mes. Es el patrón que espera quien navega con
 *   teclado, y evita que el tabulador tenga que pasar por 42 celdas.
 * · Cada día anuncia su fecha completa y, si está apagado, POR QUÉ
 *   (`aria-label`: «sábado 20 de septiembre — el plan Entre Semana no cubre
 *   noches de fin de semana»).
 * · El foco NO se escapa del panel mientras está abierto, `Escape` lo cierra y
 *   devuelve el foco al botón.
 * · Un `aria-live="polite"` anuncia la selección y los errores.
 *
 * ---------------------------------------------------------------------------
 * ZONA HORARIA
 * ---------------------------------------------------------------------------
 * Todo es texto `AAAA-MM-DD` y aritmética sobre UTC al mediodía, igual que en
 * el resto del proyecto. `hoy` llega calculado en el SERVIDOR con
 * `hoyEnBogota()`: si se calculara aquí, un visitante en Madrid vería
 * deshabilitado un día que en Colombia todavía no ha terminado.
 */

/* ===========================================================================
 * Aritmética de calendario (local al componente, sobre texto ISO)
 * ======================================================================== */

function aUTC(fecha: string): Date {
  return new Date(`${fecha}T12:00:00Z`);
}

function aISO(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function sumarDias(fecha: string, dias: number): string {
  const d = aUTC(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return aISO(d);
}

function sumarMeses(fecha: string, meses: number): string {
  const d = aUTC(fecha);
  const diaOriginal = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + meses);
  /* Del 31 de enero + 1 mes no sale el 3 de marzo: se recorta al último día
     del mes destino, que es lo que espera cualquiera que pulse «siguiente». */
  const ultimo = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12),
  ).getUTCDate();
  d.setUTCDate(Math.min(diaOriginal, ultimo));
  return aISO(d);
}

/** Primer día del mes de esa fecha. */
function inicioDeMes(fecha: string): string {
  return `${fecha.slice(0, 7)}-01`;
}

/** Día ISO: 1 = lunes … 7 = domingo. */
function diaSemana(fecha: string): number {
  const n = aUTC(fecha).getUTCDay();
  return n === 0 ? 7 : n;
}

/**
 * Las seis semanas que se pintan de un mes, empezando en LUNES.
 *
 * Seis filas siempre, aunque a algún mes le sobre una: si la rejilla cambia de
 * alto al pasar de mes, el panel salta y el botón de «siguiente» se mueve
 * debajo del cursor.
 */
function semanasDelMes(mes: string): string[][] {
  const primero = inicioDeMes(mes);
  const desfase = diaSemana(primero) - 1;
  const inicio = sumarDias(primero, -desfase);
  const semanas: string[][] = [];
  for (let semana = 0; semana < 6; semana++) {
    const dias: string[] = [];
    for (let dia = 0; dia < 7; dia++) {
      dias.push(sumarDias(inicio, semana * 7 + dia));
    }
    semanas.push(dias);
  }
  return semanas;
}

const DIAS_CORTOS = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];
const DIAS_LARGOS = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

const formateadorMes = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

const formateadorDiaLargo = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

/* ===========================================================================
 * El componente
 * ======================================================================== */

export type PropsCalendario = {
  entrada: string;
  salida: string;
  alCambiar: (entrada: string, salida: string) => void;
  /** Fecha mínima seleccionable (`AAAA-MM-DD`), calculada en el servidor. */
  hoy: string;
  /** Restricción del plan elegido. `null` = todavía no hay plan. */
  restriccion?: RestriccionPlan | null;
  /** Nombre del plan, para explicar por qué un día está apagado. */
  nombrePlan?: string | null;
  /** Nombres de los campos ocultos, para que el `<form>` funcione sin JS. */
  nombreEntrada?: string;
  nombreSalida?: string;
  /** Compacto: el que va dentro del hero de la portada. */
  compacto?: boolean;
  className?: string;
};

export function CalendarioFechas({
  entrada,
  salida,
  alCambiar,
  hoy,
  restriccion = null,
  nombrePlan = null,
  nombreEntrada = "entrada",
  nombreSalida = "salida",
  compacto = false,
  className,
}: PropsCalendario) {
  const idPanel = useId();
  const idAviso = useId();

  const [abierto, setAbierto] = useState(false);
  const [mes, setMes] = useState(() => inicioDeMes(entrada || hoy));
  const [foco, setFoco] = useState(() => entrada || hoy);
  /** Fase: si ya hay llegada y falta salida, el siguiente clic pone la salida. */
  const eligiendoSalida = Boolean(entrada) && !salida;

  const contenedor = useRef<HTMLDivElement>(null);
  const disparador = useRef<HTMLButtonElement>(null);
  const celdaEnfocada = useRef<HTMLButtonElement>(null);

  /* --- Cierre por Escape y por clic fuera ------------------------------- */
  useEffect(() => {
    if (!abierto) return;

    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.stopPropagation();
        setAbierto(false);
        disparador.current?.focus();
      }
    }
    function alPulsarFuera(evento: MouseEvent) {
      if (!contenedor.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("keydown", alPulsarTecla, true);
    document.addEventListener("mousedown", alPulsarFuera);
    return () => {
      document.removeEventListener("keydown", alPulsarTecla, true);
      document.removeEventListener("mousedown", alPulsarFuera);
    };
  }, [abierto]);

  /* El foco va a la celda activa cada vez que se mueve. */
  useEffect(() => {
    if (abierto) celdaEnfocada.current?.focus();
  }, [abierto, foco, mes]);

  /* --- Reglas ----------------------------------------------------------- */

  /**
   * Tope de la selección de salida.
   *
   * Todas las noches de una estadía tienen que ser del mismo tipo (no se venden
   * estancias mixtas en línea, ver `reglas-reserva.ts`). Así que, una vez
   * elegida la llegada, la salida puede llegar como mucho hasta la primera
   * noche que cambie de tipo.
   */
  const topeSalida = useMemo(() => {
    if (!entrada) return null;
    const tipo = tipoDeNoche(entrada);
    let cursor = entrada;
    /* Un año de margen: nadie reserva más y evita un bucle infinito si algo
       inesperado pasara con las fechas. */
    for (let i = 0; i < 366; i++) {
      const siguiente = sumarDias(cursor, 1);
      if (tipoDeNoche(siguiente) !== tipo) return siguiente;
      cursor = siguiente;
    }
    return sumarDias(entrada, 366);
  }, [entrada]);

  const estadoDeDia = useCallback(
    (dia: string): { activable: boolean; motivo: string | null } => {
      if (dia < hoy) return { activable: false, motivo: "ya pasó" };

      if (eligiendoSalida) {
        if (dia <= entrada) {
          return { activable: false, motivo: "es anterior a la llegada" };
        }
        if (topeSalida && dia > topeSalida) {
          return {
            activable: false,
            motivo:
              "la estadía mezclaría noches de entre semana con noches de fin de semana",
          };
        }
        return { activable: true, motivo: null };
      }

      if (!nochePermitida(dia, restriccion)) {
        const nombre = nombrePlan ? `el plan ${nombrePlan}` : "el plan elegido";
        return {
          activable: false,
          motivo:
            restriccion === "entre-semana"
              ? `${nombre} solo cubre noches de lunes a jueves`
              : restriccion === "sin-noches"
                ? `${nombre} no incluye hospedaje`
                : `${nombre} solo cubre noches de viernes a domingo y festivos`,
        };
      }

      return { activable: true, motivo: null };
    },
    [hoy, eligiendoSalida, entrada, topeSalida, restriccion, nombrePlan],
  );

  /* --- Selección -------------------------------------------------------- */

  const elegir = useCallback(
    (dia: string) => {
      if (!estadoDeDia(dia).activable) return;
      if (eligiendoSalida) {
        alCambiar(entrada, dia);
        setAbierto(false);
        disparador.current?.focus();
        return;
      }
      /* Primer clic (o clic con el rango ya completo): empieza de nuevo. */
      alCambiar(dia, "");
      setFoco(dia);
    },
    [estadoDeDia, eligiendoSalida, entrada, alCambiar],
  );

  const moverFoco = useCallback(
    (nuevo: string) => {
      if (nuevo < hoy) return;
      setFoco(nuevo);
      if (nuevo.slice(0, 7) !== mes.slice(0, 7)) setMes(inicioDeMes(nuevo));
    },
    [hoy, mes],
  );

  const teclasRejilla = useCallback(
    (evento: React.KeyboardEvent<HTMLTableSectionElement>) => {
      const saltos: Record<string, number> = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -7,
        ArrowDown: 7,
      };
      if (evento.key in saltos) {
        evento.preventDefault();
        moverFoco(sumarDias(foco, saltos[evento.key]));
        return;
      }
      if (evento.key === "Home") {
        evento.preventDefault();
        moverFoco(sumarDias(foco, -(diaSemana(foco) - 1)));
        return;
      }
      if (evento.key === "End") {
        evento.preventDefault();
        moverFoco(sumarDias(foco, 7 - diaSemana(foco)));
        return;
      }
      if (evento.key === "PageUp" || evento.key === "PageDown") {
        evento.preventDefault();
        moverFoco(sumarMeses(foco, evento.key === "PageUp" ? -1 : 1));
      }
    },
    [foco, moverFoco],
  );

  /* --- Texto del botón y avisos ----------------------------------------- */

  const validacion = useMemo(() => {
    if (!entrada || !salida) return null;
    return validarEstadia(entrada, salida, restriccion);
  }, [entrada, salida, restriccion]);

  const resumen =
    entrada && salida
      ? `${formatearFechaCorta(entrada)} → ${formatearFechaCorta(salida)}`
      : entrada
        ? `${formatearFechaCorta(entrada)} → elige la salida`
        : "Elige tus fechas";

  const mesAnteriorPermitido = inicioDeMes(mes) > inicioDeMes(hoy);

  return (
    <div ref={contenedor} className={`relative ${className ?? ""}`}>
      {/*
        Campos ocultos con el valor real. El módulo de la portada es un
        `<form method="get">` que funciona sin JavaScript; el calendario es la
        capa de encima, y estos dos campos son los que viajan en la dirección.
      */}
      <input type="hidden" name={nombreEntrada} value={entrada} />
      <input type="hidden" name={nombreSalida} value={salida} />

      <button
        ref={disparador}
        type="button"
        onClick={() => {
          setAbierto((valor) => !valor);
          setMes(inicioDeMes(entrada || hoy));
          setFoco(entrada || hoy);
        }}
        aria-expanded={abierto}
        aria-controls={idPanel}
        className={[
          "flex w-full items-center gap-2 rounded-[var(--radius-suave)] border border-crema-300/90 bg-white text-left",
          "font-titulo font-medium text-petroleo-900 shadow-[inset_0_1px_2px_rgba(41,37,33,0.04)]",
          "transition-colors duration-200 outline-none hover:border-crema-400 focus-visible:border-petroleo-500",
          compacto ? "px-3.5 py-3 text-[0.95rem]" : "px-4 py-3 text-sm",
        ].join(" ")}
      >
        <IconoCalendario className="size-4 shrink-0 text-oliva-600" />
        <span className={entrada ? "" : "text-crema-600"}>{resumen}</span>
      </button>

      {/* Estado y errores, para lector de pantalla y para la vista. */}
      <p id={idAviso} aria-live="polite" className="sr-only">
        {validacion && !validacion.valida
          ? validacion.motivo
          : entrada && salida
            ? `Del ${formatearFechaCorta(entrada)} al ${formatearFechaCorta(salida)}.`
            : ""}
      </p>

      {validacion && !validacion.valida ? (
        <p className="mt-2 text-sm leading-relaxed font-medium text-red-700">
          {validacion.motivo}
        </p>
      ) : null}

      {abierto ? (
        <div
          id={idPanel}
          role="group"
          aria-label="Calendario de llegada y salida"
          className="absolute top-[calc(100%+0.5rem)] left-0 z-50 w-[min(20.5rem,calc(100vw-2.5rem))] rounded-[var(--radius-generoso)] bg-white p-4 shadow-[var(--shadow-elevada)] ring-1 ring-crema-200"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMes(sumarMeses(mes, -1))}
              disabled={!mesAnteriorPermitido}
              className="rounded-full p-2 text-petroleo-700 transition-colors duration-200 hover:bg-crema-100 disabled:pointer-events-none disabled:opacity-35"
            >
              <span className="sr-only">Mes anterior</span>
              <Flecha className="size-4 rotate-180" />
            </button>
            <p
              aria-live="polite"
              className="font-titulo text-sm font-bold text-petroleo-900 first-letter:uppercase"
            >
              {formateadorMes.format(aUTC(mes))}
            </p>
            <button
              type="button"
              onClick={() => setMes(sumarMeses(mes, 1))}
              className="rounded-full p-2 text-petroleo-700 transition-colors duration-200 hover:bg-crema-100"
            >
              <span className="sr-only">Mes siguiente</span>
              <Flecha className="size-4" />
            </button>
          </div>

          <p className="mb-2 text-xs leading-snug text-crema-600">
            {eligiendoSalida
              ? "Ahora elige el día de salida."
              : restriccion === "entre-semana"
                ? "Con este plan puedes dormir de lunes a jueves."
                : restriccion === "fin-de-semana"
                  ? "Con este plan puedes dormir de viernes a domingo y festivos."
                  : "Elige el día de llegada."}
          </p>

          <table role="grid" className="w-full border-collapse">
            <thead>
              <tr>
                {DIAS_CORTOS.map((corto, indice) => (
                  <th
                    key={corto}
                    scope="col"
                    className="pb-1.5 text-center text-[0.68rem] font-semibold tracking-wide text-crema-600 uppercase"
                  >
                    <abbr
                      title={DIAS_LARGOS[indice]}
                      className="no-underline"
                    >
                      {corto}
                    </abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody onKeyDown={teclasRejilla}>
              {semanasDelMes(mes).map((semana) => (
                <tr key={semana[0]}>
                  {semana.map((dia) => (
                    <Celda
                      key={dia}
                      dia={dia}
                      mes={mes}
                      entrada={entrada}
                      salida={salida}
                      foco={foco}
                      estado={estadoDeDia(dia)}
                      alElegir={elegir}
                      refFoco={dia === foco ? celdaEnfocada : undefined}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-crema-200 pt-3">
            <button
              type="button"
              onClick={() => {
                alCambiar("", "");
                setFoco(hoy);
              }}
              className="font-titulo text-xs font-semibold text-crema-600 underline-offset-4 hover:text-petroleo-800 hover:underline"
            >
              Borrar fechas
            </button>
            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                disparador.current?.focus();
              }}
              className="font-titulo text-xs font-semibold text-petroleo-700 underline-offset-4 hover:underline"
            >
              Listo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ===========================================================================
 * Una celda
 * ======================================================================== */

function Celda({
  dia,
  mes,
  entrada,
  salida,
  foco,
  estado,
  alElegir,
  refFoco,
}: {
  dia: string;
  mes: string;
  entrada: string;
  salida: string;
  foco: string;
  estado: { activable: boolean; motivo: string | null };
  alElegir: (dia: string) => void;
  refFoco?: React.RefObject<HTMLButtonElement | null>;
}) {
  const deOtroMes = dia.slice(0, 7) !== mes.slice(0, 7);
  const esEntrada = dia === entrada;
  const esSalida = dia === salida;
  const enRango = Boolean(
    entrada && salida && dia > entrada && dia < salida,
  );
  const festivo = nombreDelFestivo(dia);

  const etiqueta = [
    formateadorDiaLargo.format(aUTC(dia)),
    festivo ? `(${festivo})` : null,
    estado.motivo ? `— ${estado.motivo}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <td role="gridcell" className="p-0.5 text-center">
      <button
        ref={refFoco}
        type="button"
        /* Tabulación itinerante: solo el día enfocado entra en el orden de
           tabulación. Sin esto, el tabulador pasaría por 42 botones. */
        tabIndex={dia === foco ? 0 : -1}
        disabled={!estado.activable}
        aria-label={etiqueta}
        aria-current={esEntrada || esSalida ? "date" : undefined}
        onClick={() => alElegir(dia)}
        className={[
          "flex h-9 w-full items-center justify-center rounded-[10px] text-sm transition-colors duration-150",
          "disabled:cursor-not-allowed disabled:text-crema-400 disabled:line-through disabled:opacity-70",
          deOtroMes ? "text-crema-400" : "text-petroleo-900",
          esEntrada || esSalida
            ? "bg-petroleo-600 font-bold text-white hover:bg-petroleo-700"
            : enRango
              ? "bg-petroleo-50 font-semibold text-petroleo-800"
              : "hover:bg-crema-100",
          /* El festivo se marca con un punto, no con color: el color ya está
             ocupado por la selección y dos códigos en la misma casilla no se
             distinguen. */
          festivo && !esEntrada && !esSalida ? "relative" : "",
        ].join(" ")}
      >
        {Number(dia.slice(8, 10))}
        {festivo && !esEntrada && !esSalida ? (
          <span
            aria-hidden="true"
            className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-oliva-500"
          />
        ) : null}
      </button>
    </td>
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
