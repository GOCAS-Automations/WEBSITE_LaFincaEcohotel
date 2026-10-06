import Link from "next/link";
import type { CSSProperties } from "react";

import { CeldasDiaDeCalma } from "./detalle-dia-de-calma";
import {
  LEYENDA,
  fondoDeColumna,
  pielDeBarra,
  tonoCupo,
} from "./estilos-calendario";
import { NavegacionMes } from "./navegacion-mes";
import { VistasCalendario } from "./vistas-calendario";
import {
  armarCalendarioMes,
  type Barra,
  type CalendarioDelMes,
  type DiaDelCalendario,
} from "@/lib/admin/calendario-mes";
import {
  claveMes,
  hoyISO,
  tituloMes,
  type AnioMes,
} from "@/lib/admin/fechas";
import type {
  BloqueoAdmin,
  OpcionAlojamiento,
  ReservaAdmin,
} from "@/lib/admin/tipos";
import type {
  DiaDeCalmaExterno,
  OcupacionExterna,
} from "@/lib/reserva/calendario-externo";
import { CUPO_DIA_DE_CALMA } from "@/lib/reserva/dia-de-calma";
import { limitesDelPanel } from "@/lib/utils/selector-mes";
import { formatearFechaConDia } from "@/lib/utils/formato";

/**
 * Calendario mensual del hotel: una fila por cabaña, una columna por día.
 *
 * Es la pantalla que el cliente abre todos los días: responde de un vistazo
 * a «¿qué tengo ocupado este mes?». Las reglas de qué ocupa cada noche viven
 * en `armarCalendarioMes()` (`src/lib/admin/calendario-mes.ts`); aquí solo se
 * dibuja.
 *
 * ---------------------------------------------------------------------------
 * LA CUADRÍCULA (2026-10-05)
 * ---------------------------------------------------------------------------
 * · **Todas las columnas miden lo mismo**, tengan o no reservas: es una
 *   rejilla CSS con `minmax(5rem, 1fr)` por día (80 px: el nombre de pila y
 *   el apellido de una estadía de UNA noche se leen en dos líneas). La versión anterior era
 *   una tabla de ancho automático y los días con nombres largos se comían a
 *   los vacíos.
 * · **Cada estadía es UNA barra** que abarca sus noches (`grid-column: span
 *   n`), con el nombre a lo ancho de toda la barra.
 * · **Columna de cabañas y cabecera de días fijas** (`sticky`) dentro del
 *   contenedor que se desplaza.
 * · Fines de semana y festivos con tono suave; hoy, marcado.
 *
 * ---------------------------------------------------------------------------
 * ⚠ EL DESPLAZAMIENTO VA DENTRO, NUNCA EN LA PÁGINA
 * ---------------------------------------------------------------------------
 * El contenedor que se desplaza lleva `relative`. Sin él, los textos para
 * lector de pantalla (`sr-only`, que son `position: absolute`) tomaban como
 * referencia un antepasado de FUERA del contenedor, escapaban de su
 * `overflow` y ensanchaban el documento entero: la página del panel se iba
 * 700 px a la derecha (`scrollWidth` 2112 en una ventana de 1440). Esa era la
 * franja vacía que se veía.
 *
 * El mes viaja en la dirección (`?mes=2026-10`). La cabecera (flechas,
 * selector de mes y año, «Hoy») y la agenda del celular son componentes de
 * cliente; la cuadrícula se pinta en el servidor.
 */
export function CalendarioMes({
  mes,
  alojamientos,
  reservas,
  bloqueos,
  personasDeDia,
  ocupacionGoogle = [],
  diasDeCalmaGoogle = [],
  consulta = "",
  diaAbierto = null,
}: {
  mes: AnioMes;
  alojamientos: OpcionAlojamiento[];
  reservas: ReservaAdmin[];
  bloqueos: BloqueoAdmin[];
  /** Personas reservadas de día, por fecha. Alimenta la fila del Día de Calma. */
  personasDeDia: Map<string, number>;
  /** Franjas del Google Calendar del hotel. Vacío si no está conectado. */
  ocupacionGoogle?: OcupacionExterna[];
  /** «Plan día» del calendario general del hotel: cuentan en la fila del Día de Calma. */
  diasDeCalmaGoogle?: DiaDeCalmaExterno[];
  /** El resto de la dirección (filtro del listado), para no perderlo al cambiar de mes. */
  consulta?: string;
  /** Día del mes cuyo Día de Calma se abre al cargar (`?dia=`, desde la ficha). */
  diaAbierto?: string | null;
}) {
  const hoy = hoyISO();
  const calendario = armarCalendarioMes({
    mes,
    hoy,
    alojamientos,
    reservas,
    bloqueos,
    franjas: ocupacionGoogle,
    personasDeDia,
    diasDeCalma: diasDeCalmaGoogle,
    ahora: new Date(),
  });
  const indiceHoy = calendario.dias.findIndex((dia) => dia.esHoy);
  const indiceAbierto = diaAbierto
    ? calendario.dias.findIndex((dia) => dia.iso === diaAbierto)
    : -1;

  return (
    <section
      aria-label={`Calendario de ${tituloMes(mes)}`}
      className="rounded-amplio bg-white shadow-tarjeta ring-1 ring-crema-900/[0.06]"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-crema-900/[0.07] px-3 py-3 sm:px-5">
        <NavegacionMes
          mes={claveMes(mes)}
          mesDeHoy={hoy.slice(0, 7)}
          limites={limitesDelPanel(hoy)}
          consulta={consulta}
          titulo={tituloMes(mes)}
        />
      </header>

      {alojamientos.length === 0 ? (
        <p className="px-6 py-10 text-center text-[0.875rem] text-crema-600">
          Todavía no hay cabañas creadas, así que el calendario está vacío.
        </p>
      ) : (
        <VistasCalendario
          calendario={calendario}
          indiceInicial={
            indiceAbierto >= 0 ? indiceAbierto : indiceHoy >= 0 ? indiceHoy : 0
          }
          diaAbierto={indiceAbierto >= 0 ? diaAbierto : null}
          cuadricula={<Cuadricula calendario={calendario} titulo={tituloMes(mes)} />}
        />
      )}

      <footer className="border-t border-crema-900/[0.07] px-4 py-3 sm:px-5">
        <Leyenda />
      </footer>
    </section>
  );
}

/* ===========================================================================
 * La cuadrícula
 * ======================================================================== */

function Cuadricula({
  calendario,
  titulo,
}: {
  calendario: CalendarioDelMes;
  titulo: string;
}) {
  const { dias, filas, personasDeDia, diaDeCalmaDelHotel, diaDeCalma } = calendario;
  const columnas = `repeat(${dias.length}, minmax(var(--ancho-dia), 1fr))`;

  return (
    /* `relative` es la corrección del desbordamiento: ver la cabecera. */
    <div
      role="region"
      aria-label={`Ocupación de ${titulo}: una fila por cabaña, una columna por día. Se desplaza hacia los lados.`}
      tabIndex={0}
      className="relative max-h-[min(78vh,44rem)] overflow-auto overscroll-x-contain rounded-b-amplio outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-petroleo-500 [--ancho-cabana:6.75rem] [--ancho-dia:4.25rem] md:[--ancho-cabana:8.5rem] md:[--ancho-dia:5rem]"
    >
      {/* Ancho explícito y no `max-content`: con `max-content` cada columna
          crecía hasta el nombre más largo que tuviera y los días dejaban de
          medir lo mismo. Así cada día mide `--ancho-dia` como mínimo y, si
          sobra pantalla, todos crecen por igual. */}
      <div
        className="grid text-[0.75rem]"
        style={{
          gridTemplateColumns: `var(--ancho-cabana) ${columnas}`,
          width: `max(100%, calc(var(--ancho-cabana) + ${dias.length} * var(--ancho-dia)))`,
        }}
      >
        {/* --- Cabecera: esquina + un día por columna --------------------- */}
        <div className="sticky left-0 top-0 z-30 flex items-end border-b border-r border-crema-900/[0.08] bg-white px-3 pb-2 pt-3 text-[0.75rem] font-semibold text-crema-700">
          Cabaña
        </div>
        {dias.map((dia) => (
          <div
            key={dia.iso}
            title={
              dia.festivo
                ? `${formatearFechaConDia(dia.iso)} · festivo: ${dia.festivo}`
                : formatearFechaConDia(dia.iso)
            }
            className={`sticky top-0 z-20 flex flex-col items-center gap-0.5 border-b border-crema-900/[0.08] px-0.5 pb-1.5 pt-2 ${
              dia.esHoy ? "bg-petroleo-50" : dia.destacado ? "bg-crema-100" : "bg-white"
            }`}
          >
            <span
              className={`text-[0.625rem] font-semibold uppercase tracking-wide ${
                dia.esHoy ? "text-petroleo-700" : dia.destacado ? "text-crema-800" : "text-crema-500"
              }`}
            >
              {dia.semana}
            </span>
            <span
              className={`flex size-7 items-center justify-center rounded-full text-[0.8125rem] tabular-nums ${
                dia.esHoy
                  ? "bg-petroleo-600 font-bold text-white"
                  : "font-semibold text-crema-900"
              }`}
            >
              {dia.numero}
            </span>
            <span
              aria-hidden="true"
              className={`size-1 rounded-full ${dia.festivo ? "bg-oliva-500" : "bg-transparent"}`}
            />
          </div>
        ))}

        {/* --- Una fila por cabaña --------------------------------------- */}
        {filas.map((fila) => (
          <FilaDeCabana
            key={fila.id}
            nombre={fila.nombre}
            activo={fila.activo}
            barras={fila.barras}
            dias={dias}
            columnas={columnas}
          />
        ))}

        {/* --- El Día de Calma: el cupo de la finca, no una cabaña -------- */}
        <div className="sticky left-0 z-10 flex flex-col justify-center border-r border-t-2 border-crema-900/[0.08] border-t-crema-900/[0.12] bg-white px-3 py-2">
          <span className="truncate text-[0.8125rem] font-semibold text-crema-900">
            Día de Calma
          </span>
          <span className="text-[0.6875rem] text-crema-600">
            cupo {CUPO_DIA_DE_CALMA} personas/día
          </span>
        </div>
        <div
          role="group"
          aria-label="Día de Calma: toca un día para ver quién viene"
          className="grid border-t-2 border-t-crema-900/[0.12]"
          style={{ gridColumn: `2 / span ${dias.length}`, gridTemplateColumns: columnas }}
        >
          {/* De cliente: cada día con alguien abre el detalle de quién viene. */}
          <CeldasDiaDeCalma
            dias={dias}
            personasDeDia={personasDeDia}
            diaDeCalmaDelHotel={diaDeCalmaDelHotel}
            conDetalle={Object.keys(diaDeCalma)}
          />
        </div>
      </div>
    </div>
  );
}

function FilaDeCabana({
  nombre,
  activo,
  barras,
  dias,
  columnas,
}: {
  nombre: string;
  activo: boolean;
  barras: Barra[];
  dias: DiaDelCalendario[];
  columnas: string;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 flex flex-col justify-center border-b border-r border-crema-900/[0.06] bg-white px-3 py-2">
        <span className="truncate text-[0.8125rem] font-semibold text-crema-900">
          {nombre}
        </span>
        {!activo ? (
          <span className="text-[0.6875rem] text-crema-500">pausada</span>
        ) : null}
      </div>
      <div
        role="group"
        aria-label={nombre}
        className="grid border-b border-crema-900/[0.06]"
        style={{ gridColumn: `2 / span ${dias.length}`, gridTemplateColumns: columnas }}
      >
        {/* El fondo de cada día: tono de fin de semana o festivo, y hoy. */}
        {dias.map((dia, indice) => (
          <div
            key={dia.iso}
            aria-hidden="true"
            style={{ gridColumn: indice + 1, gridRow: 1 }}
            className={`h-16 border-l border-crema-900/[0.04] ${fondoDeColumna(dia)}`}
          />
        ))}
        {barras.map((barra) => (
          <BarraDeOcupacion key={barra.clave} barra={barra} />
        ))}
      </div>
    </>
  );
}

function BarraDeOcupacion({ barra }: { barra: Barra }) {
  const { clase, estilo } = pielDeBarra(barra);
  const posicion: CSSProperties = {
    ...estilo,
    gridColumn: `${barra.inicio + 1} / span ${barra.noches}`,
    gridRow: 1,
  };
  /* Bordes redondeados solo donde la estadía empieza o termina de verdad: si
     viene del mes anterior o sigue en el siguiente, el borde va recto. */
  const bordes = [
    barra.continuaAntes ? "rounded-l-none ml-0" : "rounded-l-[10px] ml-1",
    barra.continuaDespues ? "rounded-r-none mr-0" : "rounded-r-[10px] mr-1",
  ].join(" ");
  const clases = `relative z-[1] my-1.5 flex min-w-0 items-center gap-1 overflow-hidden px-1.5 ${bordes} ${clase}`;
  /* El icono solo cuando hay sitio: en una estadía de una noche, cada
     píxel es para el nombre. */
  const conIcono = barra.noches >= 2;

  const contenido = (
    <>
      {barra.fuente === "bloqueo" && conIcono ? (
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          aria-hidden="true"
        >
          <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" />
        </svg>
      ) : null}
      {barra.fuente === "google" && barra.sinCabana && conIcono ? (
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 shrink-0 text-dorado-700"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
      ) : null}
      {barra.fuente === "google" && !barra.sinCabana && conIcono ? (
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 shrink-0 text-petroleo-700"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 8h16M7 4v3m10-3v3M5 20h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z" />
        </svg>
      ) : null}
      <span
        className="line-clamp-2 min-w-0 break-words text-[0.75rem] font-semibold leading-[1.15]"
        aria-hidden="true"
      >
        {barra.etiqueta}
      </span>
      <span className="sr-only">{barra.detalle}</span>
    </>
  );

  if (barra.href) {
    return (
      <Link
        href={barra.href}
        title={barra.detalle}
        style={posicion}
        className={`${clases} transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-700`}
      >
        {contenido}
      </Link>
    );
  }
  return (
    <span title={barra.detalle} style={posicion} className={clases}>
      {contenido}
    </span>
  );
}

function Leyenda() {
  return (
    <ul
      aria-label="Qué significa cada color"
      className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[0.75rem] text-crema-700"
    >
      <li className="font-semibold text-crema-900">Reservas del sitio y del panel:</li>
      {LEYENDA.map((item) => (
        <li key={item.etiqueta} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            style={item.estilo}
            className={`h-3.5 w-5 rounded-[4px] ${item.clase}`}
          />
          {item.etiqueta}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={`flex h-3.5 w-7 items-center justify-center rounded-[4px] text-[0.5625rem] font-bold ${tonoCupo(4)}`}
        >
          4/10
        </span>
        Día de Calma (personas del día)
      </li>
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={`flex h-3.5 w-7 items-center justify-center rounded-[4px] border border-dashed border-crema-900/45 text-[0.5625rem] font-bold ${tonoCupo(2)}`}
        >
          2/10
        </span>
        «Plan día» del calendario del hotel: cuenta 2 en el Día de Calma, no ocupa cabaña
      </li>
      <li className="text-crema-600">
        Toca un día del Día de Calma para ver quién viene.
      </li>
    </ul>
  );
}
