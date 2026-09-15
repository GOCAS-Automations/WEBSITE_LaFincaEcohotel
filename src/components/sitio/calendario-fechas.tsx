"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  nochesDe,
  resumenEnPalabras,
  tipoDeNoche,
  validarRango,
  type TipoNoche,
} from "@/lib/reserva/noches";
import { nombreDelFestivo } from "@/lib/festivos-colombia";
import { formatearFechaCorta } from "@/lib/utils/formato";

import { IconoCalendario } from "./iconos";

/**
 * Calendario de llegada y salida, escrito a mano.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO ES UN `<input type="date">`
 * ---------------------------------------------------------------------------
 * El campo nativo no sabe pintar información sobre los días: La Finca necesita
 * marcar los festivos de Colombia y distinguir de un vistazo las noches entre
 * semana de las de fin de semana, porque de eso depende el precio
 * (§3 de `docs/DATOS_CLIENTE.md`). Con el campo nativo, el visitante elige a
 * ciegas y descubre el precio después.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ AQUÍ NO SE APAGA NINGÚN DÍA POR CULPA DE UN PLAN
 * ---------------------------------------------------------------------------
 * La versión anterior deshabilitaba los viernes y sábados con el plan Entre
 * Semana elegido, y limitaba la salida para que la estadía no mezclara los dos
 * bloques. Eso producía el fallo que reportó Cesar: con ciertas fechas puestas
 * ya no se podía cambiar de plan, porque plan y fechas se bloqueaban entre sí.
 *
 * El modelo real es el contrario (§3 de `docs/DATOS_CLIENTE.md`): **el plan es
 * una consecuencia de la noche**. Cualquier rango de fechas es válido; el motor
 * le pone a cada noche la tarifa que le toca. Lo único que sigue apagado es el
 * pasado. Si llega una PREFERENCIA de tipo de noche —alguien que pulsó «Entre
 * Semana» en la portada— se resalta, se explica y se puede quitar, pero nunca
 * impide elegir.
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
 * · Cada día anuncia su fecha completa, si es festivo y qué tipo de noche es
 *   (`aria-label`: «sábado 19 de septiembre — noche de fin de semana o
 *   festivo»), que es justo lo que decide el precio.
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
  /**
   * PREFERENCIA de tipo de noche, no restricción.
   *
   * Quien llega desde la portada habiendo pulsado un plan trae una idea de qué
   * noches busca. Se resaltan esos días para ayudarle a encontrarlos; los demás
   * siguen siendo perfectamente elegibles.
   */
  preferencia?: TipoNoche | null;
  /** Nombre del plan del que salió la preferencia, para poder nombrarlo. */
  nombrePreferencia?: string | null;
  /** Si se pasa, se muestra un enlace para quitar la preferencia. */
  alQuitarPreferencia?: () => void;
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
  preferencia = null,
  nombrePreferencia = null,
  alQuitarPreferencia,
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
   * Qué se puede pulsar.
   *
   * Solo dos cosas apagan un día, y ninguna tiene que ver con el plan:
   * **el pasado** y, mientras se elige la salida, **los días anteriores a la
   * llegada**. Una estadía mixta (jueves→sábado) es perfectamente vendible: se
   * desglosa noche por noche. Ver `src/lib/reserva/noches.ts`.
   *
   * El tope de un año evita que alguien arme por accidente una estadía absurda;
   * `validarRango()` lo explica en español si llega a pasar.
   */
  const estadoDeDia = useCallback(
    (dia: string): { activable: boolean; motivo: string | null } => {
      if (dia < hoy) return { activable: false, motivo: "ya pasó" };

      if (eligiendoSalida && dia <= entrada) {
        return { activable: false, motivo: "es anterior a la llegada" };
      }

      return { activable: true, motivo: null };
    },
    [hoy, eligiendoSalida, entrada],
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
    return validarRango(entrada, salida);
  }, [entrada, salida]);

  /** «1 noche entre semana y 2 noches de fin de semana o festivo». */
  const resumenNoches = useMemo(() => {
    if (!entrada || !salida) return null;
    const noches = nochesDe(entrada, salida);
    return noches.length ? resumenEnPalabras(noches) : null;
  }, [entrada, salida]);

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
          /* `min-h-11` = 44 px, el mínimo táctil. */
          "flex w-full min-h-11 items-center gap-2 rounded-[var(--radius-suave)] border border-crema-300/90 bg-white text-left",
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
        {validacion && !validacion.valido
          ? validacion.motivo
          : entrada && salida
            ? `Del ${formatearFechaCorta(entrada)} al ${formatearFechaCorta(salida)}. ${resumenNoches ?? ""}`
            : ""}
      </p>

      {validacion && !validacion.valido ? (
        <p className="mt-2 text-sm leading-relaxed font-medium text-red-700">
          {validacion.motivo}
        </p>
      ) : null}

      {abierto ? (
        <>
          {/*
            EN MÓVIL ES UNA HOJA, NO UN DESPLEGABLE.
            El calendario mide unos 400 px: colgado del campo, en una pantalla
            de teléfono se sale por abajo, y el hero de la portada —que es donde
            vive este módulo— tiene `overflow-hidden` para recortar la bruma, así
            que lo que se salga se pierde. Anclado al borde inferior de la
            pantalla cabe siempre y además queda al alcance del pulgar.

            `position: fixed` escapa del recorte del hero; el velo cierra al
            tocar fuera, que en un teléfono es el gesto que todo el mundo hace.
          */}
          <div
            aria-hidden="true"
            onClick={() => setAbierto(false)}
            className="fixed inset-0 z-40 bg-petroleo-950/45 sm:hidden"
          />
          <div
            id={idPanel}
            role="group"
            aria-label="Calendario de llegada y salida"
            className="fixed inset-x-3 bottom-3 z-50 rounded-[var(--radius-generoso)] bg-white p-4 shadow-[var(--shadow-elevada)] ring-1 ring-crema-200 sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-[calc(100%+0.5rem)] sm:left-0 sm:w-[20.5rem]"
          >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMes(sumarMeses(mes, -1))}
              disabled={!mesAnteriorPermitido}
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-petroleo-700 transition-colors duration-200 hover:bg-crema-100 disabled:pointer-events-none disabled:opacity-35"
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
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-petroleo-700 transition-colors duration-200 hover:bg-crema-100"
            >
              <span className="sr-only">Mes siguiente</span>
              <Flecha className="size-4" />
            </button>
          </div>

          <p className="mb-2 text-xs leading-snug text-crema-600">
            {eligiendoSalida
              ? "Ahora elige el día de salida. Cuentan las noches, no los días: si sales el sábado, el sábado no se cobra."
              : "Elige el día de llegada. Cualquier fecha vale: a cada noche le ponemos su tarifa."}
          </p>

          {/*
            LA PREFERENCIA SE EXPLICA Y SE PUEDE QUITAR.
            Quien pulsó un plan en la portada trae una idea de qué noches busca
            y aquí se le resaltan. Pero es una AYUDA, no una puerta: los demás
            días siguen activos y el enlace la retira de un toque.
          */}
          {preferencia ? (
            <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--radius-suave)] bg-brote-100/70 px-3 py-2 text-xs leading-snug text-oliva-800">
              <span>
                Te resaltamos las{" "}
                {preferencia === "entre_semana"
                  ? "noches de lunes a jueves"
                  : "noches de viernes a domingo y festivos"}
                {nombrePreferencia ? `, las del plan ${nombrePreferencia}` : ""}.
                Puedes elegir cualquier otra.
              </span>
              {alQuitarPreferencia ? (
                <button
                  type="button"
                  onClick={alQuitarPreferencia}
                  className="font-titulo font-semibold text-petroleo-700 underline underline-offset-4"
                >
                  Quitar
                </button>
              ) : null}
            </p>
          ) : null}

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
                      preferencia={preferencia}
                      alElegir={elegir}
                      refFoco={dia === foco ? celdaEnfocada : undefined}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/*
            LA CUENTA DE NOCHES, DENTRO DEL PANEL.
            Es la información que decide el precio y antes había que cerrar el
            calendario para verla. Aquí se lee mientras se elige: «1 noche entre
            semana y 2 noches de fin de semana o festivo».
          */}
          {resumenNoches ? (
            <p className="mt-3 rounded-[var(--radius-suave)] bg-petroleo-50 px-3 py-2 text-xs leading-snug font-medium text-petroleo-800">
              {resumenNoches}
            </p>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-crema-200 pt-3">
            <button
              type="button"
              onClick={() => {
                alCambiar("", "");
                setFoco(hoy);
              }}
              className="min-h-11 font-titulo text-xs font-semibold text-crema-600 underline-offset-4 hover:text-petroleo-800 hover:underline"
            >
              Borrar fechas
            </button>
            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                disparador.current?.focus();
              }}
              className="min-h-11 px-3 font-titulo text-xs font-semibold text-petroleo-700 underline-offset-4 hover:underline"
            >
              Listo
            </button>
          </div>
          </div>
        </>
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
  preferencia,
  alElegir,
  refFoco,
}: {
  dia: string;
  mes: string;
  entrada: string;
  salida: string;
  foco: string;
  estado: { activable: boolean; motivo: string | null };
  preferencia: TipoNoche | null;
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
  const tipo = tipoDeNoche(dia);
  const seleccionado = esEntrada || esSalida;
  /* La preferencia resalta, no apaga: el día sigue siendo pulsable. */
  const preferido = preferencia !== null && tipo === preferencia;

  const etiqueta = [
    formateadorDiaLargo.format(aUTC(dia)),
    festivo ? `(${festivo})` : null,
    estado.activable
      ? tipo === "entre_semana"
        ? "— noche entre semana"
        : "— noche de fin de semana o festivo"
      : null,
    estado.motivo ? `— ${estado.motivo}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <td role="gridcell" className="p-px text-center sm:p-0.5">
      <button
        ref={refFoco}
        type="button"
        /* Tabulación itinerante: solo el día enfocado entra en el orden de
           tabulación. Sin esto, el tabulador pasaría por 42 botones. */
        tabIndex={dia === foco ? 0 : -1}
        disabled={!estado.activable}
        aria-label={etiqueta}
        aria-current={seleccionado ? "date" : undefined}
        onClick={() => alElegir(dia)}
        className={[
          /* 44 px de alto: es el mínimo que se acierta con el pulgar sin
             ampliar, y el calendario se usa sobre todo desde el teléfono. */
          "relative flex h-11 w-full items-center justify-center rounded-[10px] text-sm transition-colors duration-150",
          "disabled:cursor-not-allowed disabled:text-crema-400 disabled:line-through disabled:opacity-70",
          deOtroMes ? "text-crema-400" : "text-petroleo-900",
          seleccionado
            ? "bg-petroleo-600 font-bold text-white hover:bg-petroleo-700"
            : enRango
              ? "bg-petroleo-50 font-semibold text-petroleo-800"
              : preferido
                ? "bg-brote-100 font-semibold hover:bg-brote-200"
                : "hover:bg-crema-100",
        ].join(" ")}
      >
        {Number(dia.slice(8, 10))}
        {/* El festivo se marca con un punto, no con color: el color ya está
            ocupado por la selección y dos códigos en la misma casilla no se
            distinguen. */}
        {festivo && !seleccionado ? (
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
