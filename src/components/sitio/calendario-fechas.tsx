"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  bloqueoDeCabana,
  eligiendoSalida as fasePideSalida,
  evaluadorDeDias,
  type EstadoDia,
} from "@/lib/reserva/elegibilidad-calendario";
import {
  nochesDe,
  resumenEnPalabras,
  TEXTO_ANTELACION,
  tipoDeNoche,
  validarRango,
  type TipoNoche,
} from "@/lib/reserva/noches";
import { nombreDelFestivo } from "@/lib/festivos-colombia";
import { formatearFechaCorta } from "@/lib/utils/formato";

import { IconoCalendario } from "./iconos";
import { useLadoDelPanel } from "./usar-lado-panel";

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
 * le pone a cada noche la tarifa que le toca. Si llega una PREFERENCIA de tipo
 * de noche —alguien que pulsó «Entre Semana» en la portada— se resalta, se
 * explica y se puede quitar, pero nunca impide elegir.
 *
 * ---------------------------------------------------------------------------
 * LO QUE SÍ APAGA UN DÍA: LA OCUPACIÓN DE LA CABAÑA ELEGIDA (2026-10-03)
 * ---------------------------------------------------------------------------
 * Esto NO contradice lo de arriba. Un plan es una tarifa: cambia el precio,
 * no la posibilidad de dormir. Una noche ocupada, en cambio, no se puede
 * vender a nadie, y dejar elegirla para avisar después («esas noches ya están
 * ocupadas») era hacer elegir a ciegas. Ahora el calendario recibe las
 * noches tomadas de la cabaña (`nochesOcupadas`) y las tacha, con la
 * semántica hotelera de `[llegada, salida)`: no se llega en una noche
 * ocupada, la salida no salta por encima de una, y se puede llegar el día en
 * que otro sale. Las reglas viven en `src/lib/reserva/elegibilidad-calendario.ts`,
 * puras y con pruebas.
 *
 * La única restricción «de tarifa» que entra por la misma puerta es la de la
 * Cabaña 02 (`tiposDeNocheOfrecidos`): no es una preferencia de plan sino una
 * noche que esa cabaña no vende, y para el calendario es igual que una noche
 * ocupada. Los planes siguen sin apagar nada.
 *
 * El tachado es EXPERIENCIA DE USO, NO SEGURIDAD: la ocupación se cargó hace
 * un rato y puede haber cambiado. El servidor vuelve a comprobar al reservar
 * y la restricción de exclusión de Postgres tiene la última palabra.
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
 * · Un día apagado NO lleva `disabled`, lleva `aria-disabled` y su motivo en
 *   la etiqueta («lunes 12 de octubre — ocupado: esa noche ya está
 *   reservada»). Un `<button disabled>` no recibe foco: con las flechas el
 *   foco caía en una casilla ocupada y se perdía fuera de la rejilla, y el
 *   lector de pantalla nunca llegaba a decir POR QUÉ no se puede elegir.
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
 *
 * ---------------------------------------------------------------------------
 * ANTELACIÓN MÍNIMA (`minima`)
 * ---------------------------------------------------------------------------
 * El sitio público no toma reservas para hoy: la primera llegada elegible es
 * mañana (`DIAS_MINIMOS_ANTELACION` en `src/lib/reserva/noches.ts`). Quien use
 * este calendario pasa esa fecha en `minima` y los días anteriores salen
 * apagados con su motivo. Es **ayuda visual**: la validación que manda es la del
 * servidor (`cotizarEnServidor` y `/api/reservar`), porque un navegador puede
 * mandar cualquier cosa. Sin `minima` el calendario solo apaga el pasado, que es
 * lo que necesita cualquier uso interno.
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
  /** El «hoy» del hotel (`AAAA-MM-DD`), calculado en el servidor. El pasado se apaga. */
  hoy: string;
  /**
   * Primera fecha ELEGIBLE (`AAAA-MM-DD`). Por defecto, `hoy`.
   *
   * El sitio público pasa `primeraLlegadaReservable(hoy)` —mañana— porque en
   * línea no se reserva para el mismo día. Los días entre `hoy` y `minima` se
   * pintan apagados con el motivo «no se puede reservar para hoy».
   */
  minima?: string;
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
  /**
   * DÍA SUELTO, SIN SALIDA: el Día de Calma.
   *
   * Quien solo quiere venir un día no tiene salida que elegir. Con
   * `alElegirDiaUnico` el panel ofrece «Vengo solo ese día» en cuanto hay
   * llegada, y `diaUnico` pinta el calendario en ese modo: un solo día
   * marcado, sin rango y sin pedir salida.
   */
  diaUnico?: boolean;
  alElegirDiaUnico?: () => void;
  /** Vuelve al modo estadía conservando la fecha ya elegida. */
  alQuitarDiaUnico?: () => void;
  /**
   * NOCHES OCUPADAS (`AAAA-MM-DD`) de la cabaña elegida: cada fecha es una
   * noche tomada, con la semántica `[llegada, salida)`. Se tachan y no se
   * pueden elegir como llegada; la salida no puede saltar por encima de una.
   * Vacío = nada tachado (sin cabaña, o mientras carga).
   */
  nochesOcupadas: string[];
  /**
   * Tipos de noche que vende la cabaña elegida. La 02 solo vende las de fin
   * de semana o festivo: sus lunes a jueves se tratan como noches tomadas.
   * `null` = las vende todas.
   */
  tiposDeNocheOfrecidos?: readonly TipoNoche[] | null;
  /** Para nombrar la cabaña en el motivo que oye el lector de pantalla. */
  nombreCabana?: string | null;
  /** Motivo de las noches ocupadas, si no es el de una sola cabaña. */
  motivoOcupada?: string;
  /** Modo `diaUnico`: días sin cupo del Día de Calma. Se tachan. */
  diasSinCupo?: string[];
  /** Mientras llega la ocupación: un aviso discreto, nada se bloquea. */
  cargandoOcupacion?: boolean;
  /** Una explicación dentro del panel (la regla de la 02, un fallo de carga…). */
  nota?: ReactNode;
  /**
   * Avisa del mes que se está mirando con el panel abierto, para que quien
   * carga la ocupación pida ese mes y el siguiente.
   */
  alCambiarMes?: (mes: string) => void;
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
  minima,
  preferencia = null,
  nombrePreferencia = null,
  alQuitarPreferencia,
  diaUnico = false,
  alElegirDiaUnico,
  alQuitarDiaUnico,
  nochesOcupadas,
  tiposDeNocheOfrecidos = null,
  nombreCabana = null,
  motivoOcupada,
  diasSinCupo,
  cargandoOcupacion = false,
  nota,
  alCambiarMes,
  nombreEntrada = "entrada",
  nombreSalida = "salida",
  compacto = false,
  className,
}: PropsCalendario) {
  const idPanel = useId();
  const idAviso = useId();

  /* La primera fecha elegible. Sin `minima`, el único límite es el pasado. */
  const primera = minima && minima > hoy ? minima : hoy;

  const [abierto, setAbierto] = useState(false);
  const [mes, setMes] = useState(() => inicioDeMes(entrada || primera));
  const [foco, setFoco] = useState(() => entrada || primera);
  /**
   * Fase: si ya hay llegada y falta salida, el siguiente clic pone la salida.
   * En modo «solo ese día» no hay salida que elegir, así que cada clic mueve
   * el día elegido en vez de cerrar un rango.
   */
  const eligiendoSalida = fasePideSalida({ entrada, salida, diaUnico });

  /*
    El mes que se mira, hacia fuera: quien carga la ocupación pide ese mes y
    el siguiente. Solo con el panel abierto —cerrado no se mira nada— y por
    una ref, para que un `alCambiarMes` nuevo en cada render no dispare el
    efecto en bucle.
  */
  const avisarMes = useRef(alCambiarMes);
  useEffect(() => {
    avisarMes.current = alCambiarMes;
  });
  useEffect(() => {
    if (abierto) avisarMes.current?.(mes.slice(0, 7));
  }, [abierto, mes]);

  const contenedor = useRef<HTMLDivElement>(null);
  const disparador = useRef<HTMLButtonElement>(null);
  const celdaEnfocada = useRef<HTMLButtonElement>(null);
  const hoja = useRef<HTMLDivElement>(null);

  /*
    EN ESCRITORIO, HACIA ARRIBA CUANDO ABAJO NO CABE.

    En el teléfono el panel es una hoja anclada al borde inferior de la
    pantalla y siempre cabe. En escritorio colgaba SIEMPRE del campo hacia
    abajo, y el módulo de reserva vive dentro del hero: medido contra
    localhost, a 1440×900 el pie del panel caía en y = 929 —la última semana
    del mes y los botones «Borrar fechas» y «Listo» quedaban fuera de la
    ventana—. Ahora se mide al abrir, al desplazar y al redimensionar. Ver
    `useLadoDelPanel`.

    El alto estimado (470 px) es el del panel con sus seis semanas; en cuanto
    existe en el árbol manda su alto real.
  */
  const { lado, espacio } = useLadoDelPanel({
    abierto,
    disparador,
    panel: hoja,
    altoEstimado: 470,
  });

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
   * Qué se puede pulsar. Las reglas están en `evaluadorDeDias()`
   * (`src/lib/reserva/elegibilidad-calendario.ts`), puras y probadas:
   *
   *   · **el pasado** y **la antelación mínima** (hoy, cuando se pasa
   *     `minima`), como siempre;
   *   · eligiendo la salida, **los días anteriores a la llegada** y **los
   *     posteriores a la primera noche ocupada** tras ella —el tope se pinta
   *     tachado para que el huésped lo vea sin adivinarlo—;
   *   · eligiendo la llegada, **los días cuya noche está tomada** en la cabaña
   *     elegida (o que la cabaña no vende), y en modo día **los días sin
   *     cupo**.
   *
   * Ningún plan apaga nada: una estadía mixta (jueves→sábado) es
   * perfectamente vendible. La salida tampoco se rige por la antelación, que
   * es regla de LLEGADA. El tope de un año lo explica `validarRango()`.
   */
  const bloqueo = useMemo(
    () =>
      bloqueoDeCabana({
        ocupadas: nochesOcupadas,
        tiposOfrecidos: tiposDeNocheOfrecidos,
        nombreCabana,
        motivoOcupada,
      }),
    [nochesOcupadas, tiposDeNocheOfrecidos, nombreCabana, motivoOcupada],
  );
  const sinCupo = useMemo(() => {
    const dias = new Set(diasSinCupo ?? []);
    return (dia: string) => dias.has(dia);
  }, [diasSinCupo]);

  const evaluador = useMemo(
    () =>
      evaluadorDeDias(
        { entrada, salida, diaUnico },
        { hoy, minima, bloqueo, sinCupo },
      ),
    [entrada, salida, diaUnico, hoy, minima, bloqueo, sinCupo],
  );
  const estadoDeDia = evaluador.estado;
  /** Última salida posible mientras se elige la salida (o `null`). */
  const tope = evaluador.tope;

  /* --- Selección -------------------------------------------------------- */

  const elegir = useCallback(
    (dia: string) => {
      if (!estadoDeDia(dia).activable) return;
      if (eligiendoSalida || diaUnico) {
        /* La salida —o el único día del Día de Calma— cierra la pregunta:
           el panel se recoge y lo siguiente que hay que ver está debajo. */
        alCambiar(eligiendoSalida ? entrada : dia, eligiendoSalida ? dia : "");
        setAbierto(false);
        disparador.current?.focus();
        return;
      }
      /* Primer clic (o clic con el rango ya completo): empieza de nuevo. */
      alCambiar(dia, "");
      setFoco(dia);
    },
    [estadoDeDia, eligiendoSalida, diaUnico, entrada, alCambiar],
  );

  /*
    El foco no baja de la primera fecha ELEGIBLE, no de hoy. Los días
    ocupados SÍ reciben foco —llevan `aria-disabled`, no `disabled`— para que
    el lector de pantalla diga por qué no se pueden elegir; los anteriores a la
    primera fecha elegible no hacen falta recorrerlos.
  */
  const moverFoco = useCallback(
    (nuevo: string) => {
      if (nuevo < primera) return;
      setFoco(nuevo);
      if (nuevo.slice(0, 7) !== mes.slice(0, 7)) setMes(inicioDeMes(nuevo));
    },
    [primera, mes],
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
    diaUnico && entrada
      ? `${formatearFechaCorta(entrada)} · solo ese día`
      : entrada && salida
        ? `${formatearFechaCorta(entrada)} → ${formatearFechaCorta(salida)}`
        : entrada
          ? `${formatearFechaCorta(entrada)} → elige la salida`
          : diaUnico
            ? "Elige el día"
            : "Elige tus fechas";

  /* No se retrocede a un mes en el que ya no queda ningún día elegible. */
  const mesAnteriorPermitido = inicioDeMes(mes) > inicioDeMes(primera);

  const semanas = semanasDelMes(mes);
  /* ¿Hay algo tachado por ocupación en el mes que se ve? Entonces se explica
     qué significa el tachado, debajo de la rejilla. */
  const hayOcupados = semanas.some((semana) =>
    semana.some(
      (dia) => dia.slice(0, 7) === mes.slice(0, 7) && estadoDeDia(dia).ocupado,
    ),
  );

  /* La ayuda de arriba de la rejilla, según la fase. */
  const ayuda = diaUnico
    ? entrada
      ? "Vienes solo ese día, sin dormir. Toca otro día si quieres cambiarlo."
      : `Elige el día de tu visita, ${TEXTO_ANTELACION}. Es un día completo, sin dormir.`
    : eligiendoSalida
      ? tope !== null && tope <= entrada
        ? "Esa llegada ya no está libre. Borra las fechas y elige otra."
        : tope !== null
          ? `Ahora elige el día de salida. Como tarde, el ${formatearFechaCorta(tope)}: esa noche ya no está libre.`
          : "Ahora elige el día de salida. Cuentan las noches, no los días: si sales el sábado, el sábado no se cobra."
      : primera > hoy
        ? `Elige el día de llegada, ${TEXTO_ANTELACION}: a cada noche le ponemos su tarifa. Para llegar hoy mismo, escríbenos por WhatsApp.`
        : "Elige el día de llegada. Cualquier fecha vale: a cada noche le ponemos su tarifa.";

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
          setMes(inicioDeMes(entrada || primera));
          setFoco(entrada || primera);
        }}
        aria-expanded={abierto}
        aria-controls={idPanel}
        className={[
          /* `min-h-11` = 44 px, el mínimo táctil. */
          "flex w-full min-h-11 items-center gap-2 rounded-[var(--radius-suave)] border border-crema-300/90 bg-white text-left",
          "font-titulo font-medium text-petroleo-900 shadow-[inset_0_1px_2px_rgba(41,37,33,0.04)]",
          "transition-colors duration-200 outline-none hover:border-crema-400 focus-visible:border-petroleo-500",
          /* Dentro de un `<fieldset disabled>` (el paso de fechas sin cabaña
             elegida en `/reservar`) el botón queda apagado de verdad. */
          "disabled:cursor-not-allowed disabled:bg-crema-50 disabled:hover:border-crema-300/90",
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
            ref={hoja}
            id={idPanel}
            role="group"
            aria-label="Calendario de llegada y salida"
            /* En el teléfono es una hoja al borde inferior: el FAB de WhatsApp
               se aparta mientras está abierta (ver `boton-whatsapp.tsx`). */
            data-fab-evitar=""
            /*
              El tope de alto va en una variable CSS y no en `max-height`
              directo porque solo debe aplicarse desde `sm`: en el teléfono el
              panel es una hoja anclada al borde inferior y ahí `espacio`
              —medido desde el campo— no significa nada. En escritorio, si el
              panel no cabe entero ni arriba ni abajo, se desplaza dentro de sí
              mismo en vez de salirse de la ventana. El suelo de 320 px evita
              que quede una rendija con dos semanas.
            */
            style={
              { "--alto-hoja": `${Math.max(320, espacio)}px` } as React.CSSProperties
            }
            className={[
              "fixed inset-x-3 bottom-3 z-50 rounded-[var(--radius-generoso)] bg-white p-4 shadow-[var(--shadow-elevada)] ring-1 ring-crema-200",
              "sm:absolute sm:inset-x-auto sm:left-0 sm:w-[20.5rem]",
              /* En el módulo de la portada, desde `lg`, el panel se abre en dos
                 columnas (ver DOS COLUMNAS más abajo): necesita más ancho. */
              compacto ? "lg:w-auto" : "",
              "sm:max-h-[var(--alto-hoja)] sm:overflow-y-auto sm:overscroll-contain",
              /* Solo desde `sm`: por debajo es la hoja del borde inferior. */
              lado === "arriba"
                ? "sm:top-auto sm:bottom-[calc(100%+0.5rem)]"
                : "sm:bottom-auto sm:top-[calc(100%+0.5rem)]",
            ].join(" ")}
          >
          {/*
            DOS COLUMNAS EN EL MÓDULO DE LA PORTADA, DESDE `lg`.
            Allí el panel se abre HACIA ARRIBA (debajo no hay sitio dentro del
            hero) y por encima solo quedan unos 500 px hasta la barra del sitio.
            En una sola columna —mes, ayuda, aviso, rejilla, leyenda y botones—
            pasaba de 600 px y se cortaba: «Borrar fechas» y «Listo» quedaban
            escondidos dentro del panel. Medido contra localhost a 1440×900.
            Con los textos a la izquierda y la rejilla a la derecha mide lo que
            la rejilla, unos 400 px. En el teléfono es la hoja inferior de
            siempre, y en `/reservar` (sin `compacto`) la columna única de
            siempre: las áreas de rejilla solo actúan dentro del `grid`.
            El orden del DOM no cambia: mes, ayuda, rejilla, leyenda y pie.
          */}
          <div
            className={
              compacto
                ? "lg:grid lg:grid-cols-[14rem_19.5rem] lg:grid-rows-[auto_1fr_auto] lg:gap-x-5 lg:[grid-template-areas:'textos_mes'_'textos_rejilla'_'pie_rejilla']"
                : undefined
            }
          >
          <div className="mb-3 flex items-center justify-between gap-2 lg:[grid-area:mes]">
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

          <div className="lg:[grid-area:textos]">
          <p className="mb-2 text-xs leading-snug text-crema-600">{ayuda}</p>

          {/*
            MIENTRAS LLEGA LA OCUPACIÓN.
            Discreto a propósito: una línea con un punto que late, la rejilla
            un poco más tenue y `aria-busy`. No se bloquea nada —el servidor
            vuelve a comprobar— y casi siempre llega antes de que se lea.
            El punto solo late si el sistema no pide menos movimiento.
          */}
          <p
            role="status"
            className={
              cargandoOcupacion
                ? "mb-2 flex items-center gap-1.5 text-[0.7rem] leading-snug font-medium text-oliva-700"
                : "sr-only"
            }
          >
            {cargandoOcupacion ? (
              <>
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-oliva-500 motion-safe:animate-pulse"
                />
                Consultando las fechas libres…
              </>
            ) : null}
          </p>

          {nota ? (
            <div className="mb-2 rounded-[var(--radius-suave)] bg-crema-100 px-3 py-2 text-xs leading-snug text-crema-800">
              {nota}
            </div>
          ) : null}

          {/*
            EL CAMINO AL DÍA DE CALMA.
            Elegir un día y NO elegir salida es exactamente lo que hace quien
            solo quiere venir de día. En vez de dejarlo atascado pidiéndole una
            salida que no existe, el panel se lo ofrece con todas las letras.
          */}
          {entrada && alElegirDiaUnico && !diaUnico ? (
            <button
              type="button"
              onClick={() => {
                alElegirDiaUnico();
                /* Se cierra como al elegir la salida: la respuesta ya está
                   dada y lo siguiente que hay que ver —el plan del día y su
                   cupo— vive debajo del calendario. */
                setAbierto(false);
                disparador.current?.focus();
              }}
              className="mb-2 flex min-h-11 w-full items-center justify-center rounded-[var(--radius-suave)] bg-brote-100 px-3 text-xs leading-snug font-semibold text-oliva-800 transition-colors hover:bg-brote-200"
            >
              Vengo solo ese día, sin dormir
            </button>
          ) : null}

          {diaUnico && alQuitarDiaUnico ? (
            <button
              type="button"
              onClick={alQuitarDiaUnico}
              className="mb-2 flex min-h-11 w-full items-center justify-center rounded-[var(--radius-suave)] bg-petroleo-50 px-3 text-xs leading-snug font-semibold text-petroleo-800 transition-colors hover:bg-petroleo-100"
            >
              Prefiero quedarme a dormir
            </button>
          ) : null}

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

          </div>

          <div className="lg:[grid-area:rejilla]">
          <table
            role="grid"
            aria-busy={cargandoOcupacion || undefined}
            className={[
              "w-full border-collapse transition-opacity duration-200",
              cargandoOcupacion ? "opacity-70" : "",
            ].join(" ")}
          >
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
              {semanas.map((semana) => (
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
          </div>

          <div className="lg:[grid-area:pie] lg:self-end">
          {/*
            QUÉ SIGNIFICA EL TACHADO, CON UNA MUESTRA.
            Solo si en el mes que se ve hay algo tachado por ocupación —sin eso
            la leyenda es ruido— y no hay `nota`: la nota ya explica el
            tachado (la regla de la 02, la portada sin cabaña) y repetirlo
            alarga un panel que en la portada vive con el espacio justo. La muestra es la misma casilla en pequeño, así
            que no hay que traducir nada. `aria-hidden`: el lector de pantalla
            ya oye el motivo en cada día.
          */}
          {hayOcupados && !nota ? (
            <p
              aria-hidden="true"
              className="mt-2 flex items-center gap-2 text-[0.7rem] leading-snug text-crema-700"
            >
              <span className="inline-flex h-5 min-w-7 items-center justify-center rounded-md bg-crema-200/80 px-1 text-[0.7rem] text-crema-600 line-through decoration-crema-600 decoration-[1.5px]">
                12
              </span>
              {diaUnico
                ? "Tachado: ese día ya no tiene cupo."
                : eligiendoSalida
                  ? "Tachado: para salir ese día habría que pasar una noche ocupada."
                  : "Tachado: esa noche ya está ocupada. Sí puedes llegar el día en que otro huésped sale."}
            </p>
          ) : null}

          {/*
            LA CUENTA DE NOCHES, DENTRO DEL PANEL.
            Es la información que decide el precio y antes había que cerrar el
            calendario para verla. Aquí se lee mientras se elige: «1 noche entre
            semana y 2 noches de fin de semana o festivo».
          */}
          {resumenNoches && !diaUnico ? (
            <p className="mt-3 rounded-[var(--radius-suave)] bg-petroleo-50 px-3 py-2 text-xs leading-snug font-medium text-petroleo-800">
              {resumenNoches}
            </p>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-crema-200 pt-3">
            <button
              type="button"
              onClick={() => {
                alQuitarDiaUnico?.();
                alCambiar("", "");
                setFoco(primera);
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
  estado: EstadoDia;
  preferencia: TipoNoche | null;
  alElegir: (dia: string) => void;
  refFoco?: React.RefObject<HTMLButtonElement | null>;
}) {
  const apagado = !estado.activable;
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
        /* `aria-disabled` y no `disabled`: ver ACCESIBILIDAD en la cabecera.
           El clic de un día apagado no hace nada (`elegir` lo comprueba). */
        aria-disabled={apagado || undefined}
        aria-label={etiqueta}
        aria-current={seleccionado ? "date" : undefined}
        onClick={() => alElegir(dia)}
        className={[
          /* 44 px de alto: es el mínimo que se acierta con el pulgar sin
             ampliar, y el calendario se usa sobre todo desde el teléfono. */
          "relative flex h-11 w-full items-center justify-center rounded-[10px] text-sm transition-colors duration-150",
          /*
            Prioridad: lo elegido manda —la llegada se sigue viendo como
            llegada mientras se elige la salida—, luego lo apagado y luego el
            rango. Lo apagado tiene DOS pieles: un día que ya pasó se borra
            casi del todo; uno OCUPADO se tacha sobre un fondo crema propio
            con texto `crema-600` (4,7:1 sobre ese fondo), para que se lea qué
            día es y se note que no es lo mismo que un día pasado.
          */
          seleccionado
            ? "bg-petroleo-600 font-bold text-white hover:bg-petroleo-700"
            : apagado
              ? estado.ocupado
                ? `cursor-not-allowed bg-crema-200/70 text-crema-600 line-through decoration-crema-600 decoration-[1.5px] ${deOtroMes ? "opacity-60" : ""}`
                : "cursor-not-allowed text-crema-400 line-through opacity-70"
              : enRango
                ? "bg-petroleo-50 font-semibold text-petroleo-800"
                : `${deOtroMes ? "text-crema-400" : "text-petroleo-900"} ${
                    preferido
                      ? "bg-brote-100 font-semibold hover:bg-brote-200"
                      : "hover:bg-crema-100"
                  }`,
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
