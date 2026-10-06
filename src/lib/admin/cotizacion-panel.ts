/**
 * El valor sugerido de una reserva manual: LA MISMA cotización que el sitio.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO BASTA CON «EL PLAN ELEGIDO × LAS NOCHES»
 * ---------------------------------------------------------------------------
 * Hasta el 2026-10-05 el formulario del panel aplicaba el plan del desplegable
 * a todas las noches. En una estadía mixta eso daba otro número que el sitio:
 * jueves → sábado con «Entre Semana» salía a 2 × $350.000, cuando el sitio
 * cobra el jueves con Entre Semana y el viernes con Estándar ($480.000),
 * porque Entre Semana no cubre los fines de semana.
 *
 * Ahora el panel llama a `cotizar()`, la función con la que cobra el sitio
 * (`/api/reservar` incluida): cada noche con el plan que le corresponde según
 * su tipo, las tarifas diferenciales de esas fechas y el precio de una
 * persona si viaja sola. El plan del desplegable decide solo lo que el
 * huésped elegiría en el sitio: **qué plan de fin de semana** (Estándar o
 * Premium). Si es Entre Semana, las noches de fin de semana van con el
 * primero, igual que el sitio cuando el huésped no elige.
 *
 * Puro: sin React y sin red, para poder probarlo.
 */
import {
  cotizar,
  planCubre,
  type CabanaCotizable,
  type Cotizacion,
  type LineaNoche,
  type TarifaCotizable,
} from "../reserva/cotizacion";
import { nochesDe } from "../reserva/noches";

export type EntradaCotizacionPanel = {
  alojamientoId: string;
  nombreCabana: string;
  /** El plan del desplegable. */
  planId: string;
  /** Los planes de hospedaje, EN EL ORDEN DEL CATÁLOGO (el del sitio). */
  planesIds: readonly string[];
  /** `alojamientoId|planId` → tarifa con sus temporadas. */
  tarifas: Readonly<Record<string, TarifaCotizable>>;
  entrada: string;
  salida: string;
  /** Cuántas personas escribió el equipo; 1 cobra el precio de una persona. */
  personas: number;
};

/**
 * La cotización del sitio para esas fechas, o `null` si todavía faltan datos
 * (cabaña, fechas). `posible: false` trae el motivo en español: la cabaña no
 * se ofrece esas noches o le falta una tarifa.
 */
export function cotizarReservaManual({
  alojamientoId,
  nombreCabana,
  planId,
  planesIds,
  tarifas,
  entrada,
  salida,
  personas,
}: EntradaCotizacionPanel): Cotizacion | null {
  if (!alojamientoId) return null;
  const noches = nochesDe(entrada, salida);
  if (noches.length === 0) return null;

  const cabana: CabanaCotizable = {
    slug: alojamientoId,
    nombre: nombreCabana,
    tarifas: planesIds.flatMap((id) => {
      const tarifa = tarifas[`${alojamientoId}|${id}`];
      return tarifa ? [tarifa] : [];
    }),
  };

  const elegido = tarifas[`${alojamientoId}|${planId}`] ?? null;
  const planFinDeSemana =
    elegido && planCubre(elegido.plan, "fin_de_semana")
      ? elegido.plan.nombre
      : null;

  return cotizar({
    noches,
    cabana,
    planFinDeSemana,
    adultos: personas === 1 ? 1 : 2,
  });
}

/** Un tramo del desglose: noches seguidas o no con el mismo plan y precio. */
export type TramoDesglose = {
  plan: string;
  precio: number;
  noches: number;
  temporada: string | null;
};

/**
 * El desglose agrupado para leerlo en una línea: «2 × $350.000 (Entre
 * Semana) + 1 × $480.000 (Estándar)». Conserva el orden de aparición.
 */
export function tramosDelDesglose(lineas: readonly LineaNoche[]): TramoDesglose[] {
  const tramos: TramoDesglose[] = [];
  for (const linea of lineas) {
    const igual = tramos.find(
      (tramo) =>
        tramo.plan === linea.plan &&
        tramo.precio === linea.precio &&
        tramo.temporada === linea.temporada,
    );
    if (igual) igual.noches += 1;
    else {
      tramos.push({
        plan: linea.plan,
        precio: linea.precio,
        noches: 1,
        temporada: linea.temporada,
      });
    }
  }
  return tramos;
}
