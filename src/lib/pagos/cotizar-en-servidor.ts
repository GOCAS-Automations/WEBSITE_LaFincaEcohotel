/**
 * EL PRECIO QUE SE COBRA SE CALCULA **AQUÍ**, EN EL SERVIDOR.
 *
 * ===========================================================================
 * EL REQUISITO 1 DE LA AUDITORÍA, HECHO CÓDIGO
 * ===========================================================================
 * `docs/AUDITORIA_SEGURIDAD.md`, §Pagos, requisito 1:
 *
 *   «El precio se recalcula SIEMPRE en el servidor. El importe que se le manda a
 *   la pasarela no puede salir de lo que envíe el navegador. Hoy el total lo
 *   calcula el cliente (`cotizar()`, `resumenDePago()`) para poder enseñarlo sin
 *   latencia; el mismo cálculo tiene que repetirse en el servidor con las
 *   tarifas de la base antes de crear el cobro, y si no coincide, gana el
 *   servidor.»
 *
 * Esto es ese «mismo cálculo». Lo importante es que **son las mismas funciones
 * puras** —`nochesDe`, `cotizar`, `resumenDePago`, `cotizarDiaDeCalma`— que usa
 * el selector del navegador. No hay una segunda implementación del precio que
 * pueda irse separando de la primera: lo único que cambia es de dónde salen las
 * tarifas (de la base, recién leídas) y que aquí nadie puede tocarlas.
 *
 * Del navegador llegan **decisiones**, nunca cifras:
 *   · qué fechas, qué cabaña, qué plan de fin de semana, cuántas personas,
 *   · qué experiencias y en qué noche, y cuántas,
 *   · qué porcentaje de anticipo (50–100).
 *
 * Los precios de las noches y de cada extra se leen de `tarifas` y de `extras`
 * en el momento de cobrar. Si el hotel subió una tarifa hace cinco minutos, se
 * cobra la nueva; si el navegador manda un total distinto, no se mira.
 *
 * ---------------------------------------------------------------------------
 * CON `service_role` Y SIN CACHÉ, A PROPÓSITO
 * ---------------------------------------------------------------------------
 * El sitio público lee las tarifas con `crearClientePublico()`, que trae la
 * Data Cache de Next con una hora de validez (`SEGUNDOS_REVALIDACION`). Para
 * **mirar** un precio, una hora de desfase es irrelevante. Para **cobrarlo**,
 * no: sería cobrar la tarifa de hace una hora y escribirla congelada en la
 * reserva. De ahí el cliente administrador, que no cachea nada.
 */
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  cotizar,
  type CabanaCotizable,
  type LineaNoche,
} from "../reserva/cotizacion";
import {
  CUPO_DIA_DE_CALMA,
  MAX_PERSONAS_POR_RESERVA_DIA,
  cotizarDiaDeCalma,
} from "../reserva/dia-de-calma";
import { esFechaISO, nochesDe, validarRango } from "../reserva/noches";
import { ocupaCalendario } from "../reserva/holds";
import {
  normalizarPorcentajeAnticipo,
  resumenDePago,
  type ExtraElegido,
  type ResumenDePago,
} from "../reserva/total";
import { sumarDias, type FechaISO } from "../utils/formato";

/* ===========================================================================
 * Lo que llega del navegador
 * ======================================================================== */

/** Una experiencia elegida, **sin precio**: el precio lo pone el servidor. */
export type ExtraPedido = {
  extraId: string;
  /** Noche a la que se añade (`AAAA-MM-DD`). `null` = toda la estadía o el día. */
  noche: FechaISO | null;
  cantidad: number;
};

export type SolicitudDeReserva = {
  tipo: "hospedaje" | "dia";
  /** Llegada, o el día en el Día de Calma. */
  entrada: FechaISO;
  /** Salida, exclusiva. Solo hospedaje. */
  salida: FechaISO | null;
  /** `slug` de la cabaña. Solo hospedaje. */
  cabanaSlug: string | null;
  /** Nombre del plan de fin de semana elegido, si la estadía lo necesita. */
  planFinDeSemana: string | null;
  /** Una o dos personas. */
  personas: number;
  extras: ExtraPedido[];
  /** Entre 50 y 100. Se normaliza igual que en el navegador. */
  porcentajeAnticipo: number;
};

/* ===========================================================================
 * Lo que sale
 * ======================================================================== */

/** Una línea de `reserva_extras`, con el precio ya congelado del catálogo. */
export type ExtraParaGuardar = {
  extra_id: string;
  cantidad: number;
  precio_unitario: number;
  noche: string | null;
};

export type CotizacionAutoritativa = {
  tipo: "hospedaje" | "dia";
  /** `null` en el Día de Calma. */
  alojamientoId: string | null;
  alojamientoNombre: string | null;
  planId: string;
  planNombre: string;
  entrada: FechaISO;
  /** Salida **exclusiva**. En el Día de Calma es `entrada + 1 día`. */
  salida: FechaISO;
  numPersonas: number;
  /** Desglose noche por noche. Vacío en el Día de Calma. */
  noches: LineaNoche[];
  extras: ExtraParaGuardar[];
  /** Totales, anticipo y saldo, calculados aquí. */
  pago: ResumenDePago;
};

export type ResultadoCotizacion =
  | { ok: true; cotizacion: CotizacionAutoritativa }
  | { ok: false; motivo: string };

/** Fracaso con un motivo en español que se le puede mostrar al huésped. */
function no(motivo: string): ResultadoCotizacion {
  return { ok: false, motivo };
}

/* ===========================================================================
 * Topes de cordura sobre lo que entra
 * ======================================================================== */

/** Una estadía más larga que esto no es una reserva, es un error o un ataque. */
const MAXIMO_NOCHES = 30;
/** Nadie reserva a más de un año y medio vista. */
const MAXIMO_DIAS_VISTA = 540;
/** Tope por línea de experiencia; el selector ya corta en 9. */
const MAXIMO_CANTIDAD_EXTRA = 9;
/** Tope de líneas distintas: evita un cuerpo con diez mil extras. */
const MAXIMO_LINEAS_EXTRA = 60;

/* ===========================================================================
 * El cálculo
 * ======================================================================== */

/**
 * Recalcula la reserva entera con los datos de la base.
 *
 * Devuelve `ok: false` con un motivo en español cuando algo no cuadra. **Nunca
 * inventa un precio**: si falta una tarifa, se dice y el huésped sigue teniendo
 * WhatsApp. Es la misma regla que ya aplicaba `cotizar()` en el navegador.
 */
export async function cotizarEnServidor(
  supabase: SupabaseClient,
  solicitud: SolicitudDeReserva,
  ahora: Date = new Date(),
): Promise<ResultadoCotizacion> {
  /* --- Fechas ------------------------------------------------------------ */

  if (!esFechaISO(solicitud.entrada)) {
    return no("La fecha de llegada no es válida.");
  }

  /* El «hoy» del hotel, no el del navegador: una zona horaria distinta no puede
     servir para reservar una noche que ya pasó. */
  const hoy = new Date(ahora.getTime() - 5 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  if (solicitud.entrada < hoy) {
    return no("Esa fecha ya pasó. Elige una fecha a partir de hoy.");
  }
  if (solicitud.entrada > sumarDias(hoy, MAXIMO_DIAS_VISTA)) {
    return no(
      "Todavía no tomamos reservas tan adelantadas. Escríbenos por WhatsApp y lo miramos contigo.",
    );
  }

  const esDia = solicitud.tipo === "dia";

  /* --- El catálogo, recién leído --------------------------------------- */

  const [planes, extrasCatalogo] = await Promise.all([
    supabase
      .from("planes")
      .select("id, nombre, tipo, dias_aplica, precio_base, activo")
      .eq("activo", true),
    solicitud.extras.length > 0
      ? supabase
          .from("extras")
          .select("id, nombre, precio, activo")
          .eq("activo", true)
      : Promise.resolve({ data: [] as unknown[], error: null }),
  ]);

  if (planes.error) {
    return no("No pudimos leer las tarifas ahora mismo. Inténtalo en un momento.");
  }
  if (extrasCatalogo.error) {
    return no(
      "No pudimos leer las experiencias ahora mismo. Inténtalo en un momento.",
    );
  }

  const filasPlanes = (planes.data ?? []) as {
    id: string;
    nombre: string;
    tipo: string | null;
    dias_aplica: number[] | null;
    precio_base: number | null;
  }[];

  /* --- Las experiencias y adicionales ---------------------------------- */

  if (solicitud.extras.length > MAXIMO_LINEAS_EXTRA) {
    return no("Hay demasiadas experiencias en la solicitud. Revísala.");
  }

  const preciosExtras = new Map(
    ((extrasCatalogo.data ?? []) as { id: string; nombre: string; precio: number }[])
      .map((fila) => [String(fila.id), fila]),
  );

  /* --- Según el tipo --------------------------------------------------- */

  const base = esDia
    ? await cotizarDia(supabase, solicitud, filasPlanes, ahora)
    : await cotizarHospedaje(supabase, solicitud, filasPlanes);

  if (!base.ok) return base;

  const {
    alojamientoId,
    alojamientoNombre,
    planId,
    planNombre,
    entrada,
    salida,
    numPersonas,
    subtotalAlojamiento,
    noches,
  } = base.datos;

  /* Las noches válidas: un extra solo puede pertenecer a una noche de ESTA
     estadía. Lo que venga con otra fecha se descarta en silencio igual que lo
     hace el selector (no suma, pero tampoco rompe la reserva). */
  const nochesValidas = new Set(noches.map((linea) => linea.fecha));

  const elegidos: ExtraElegido[] = [];
  const paraGuardar: ExtraParaGuardar[] = [];

  for (const pedido of solicitud.extras) {
    const cantidad = Math.round(Number(pedido.cantidad));
    if (!Number.isFinite(cantidad) || cantidad < 1) continue;
    if (cantidad > MAXIMO_CANTIDAD_EXTRA) {
      return no(
        `No se pueden pedir más de ${MAXIMO_CANTIDAD_EXTRA} unidades de una misma experiencia.`,
      );
    }

    const extra = preciosExtras.get(String(pedido.extraId));
    /* Un extra que el hotel pausó mientras el huésped elegía simplemente no se
       cobra. Avisar «ya no se ofrece X» a mitad de un pago es peor que cobrar
       lo que sí existe y que el equipo lo comente al confirmar. */
    if (!extra) continue;

    const noche =
      pedido.noche && esFechaISO(pedido.noche) && nochesValidas.has(pedido.noche)
        ? pedido.noche
        : null;

    /* En el Día de Calma no hay noches: todo va como «para ese día». */
    const nocheFinal = esDia ? null : noche;

    elegidos.push({
      extraId: String(extra.id),
      nombre: String(extra.nombre),
      noche: nocheFinal,
      cantidad,
      precioUnitario: Number(extra.precio),
    });

    paraGuardar.push({
      extra_id: String(extra.id),
      cantidad,
      precio_unitario: Number(extra.precio),
      noche: nocheFinal,
    });
  }

  /* --- Totales y anticipo ---------------------------------------------- */

  const pago = resumenDePago({
    subtotalAlojamiento,
    extras: elegidos,
    noches: noches.map((linea) => linea.fecha),
    porcentaje: normalizarPorcentajeAnticipo(solicitud.porcentajeAnticipo),
  });

  if (pago.total <= 0) {
    return no(
      "No pudimos calcular el precio de esa reserva. Escríbenos por WhatsApp y lo revisamos contigo.",
    );
  }

  return {
    ok: true,
    cotizacion: {
      tipo: solicitud.tipo,
      alojamientoId,
      alojamientoNombre,
      planId,
      planNombre,
      entrada,
      salida,
      numPersonas,
      noches,
      extras: paraGuardar,
      pago,
    },
  };
}

/* ===========================================================================
 * Hospedaje
 * ======================================================================== */

type DatosBase = {
  alojamientoId: string | null;
  alojamientoNombre: string | null;
  planId: string;
  planNombre: string;
  entrada: FechaISO;
  salida: FechaISO;
  numPersonas: number;
  subtotalAlojamiento: number;
  noches: LineaNoche[];
};

type ResultadoBase = { ok: true; datos: DatosBase } | { ok: false; motivo: string };

async function cotizarHospedaje(
  supabase: SupabaseClient,
  solicitud: SolicitudDeReserva,
  filasPlanes: {
    id: string;
    nombre: string;
    tipo: string | null;
    dias_aplica: number[] | null;
    precio_base: number | null;
  }[],
): Promise<ResultadoBase> {
  const { entrada } = solicitud;
  const salida = solicitud.salida;

  if (!salida || !esFechaISO(salida)) {
    return { ok: false, motivo: "La fecha de salida no es válida." };
  }

  const rango = validarRango(entrada, salida);
  if (!rango.valido) {
    return { ok: false, motivo: rango.motivo };
  }

  const listaNoches = nochesDe(entrada, salida);
  if (listaNoches.length === 0) {
    return {
      ok: false,
      motivo: "Una estadía es de mínimo una noche. Revisa las fechas.",
    };
  }
  if (listaNoches.length > MAXIMO_NOCHES) {
    return {
      ok: false,
      motivo: `Para estadías de más de ${MAXIMO_NOCHES} noches escríbenos por WhatsApp: las armamos a mano.`,
    };
  }

  if (!solicitud.cabanaSlug) {
    return { ok: false, motivo: "Elige una cabaña." };
  }

  /* --- La cabaña y sus tarifas, de la base ----------------------------- */

  const { data: alojamiento, error: errorAlojamiento } = await supabase
    .from("alojamientos")
    .select("id, nombre, slug, capacidad, activo")
    .eq("slug", solicitud.cabanaSlug)
    .eq("activo", true)
    .maybeSingle();

  if (errorAlojamiento) {
    return {
      ok: false,
      motivo: "No pudimos leer las cabañas ahora mismo. Inténtalo en un momento.",
    };
  }
  if (!alojamiento) {
    return {
      ok: false,
      motivo: "Esa cabaña ya no está disponible. Elige otra, por favor.",
    };
  }

  /* `.is("vigencia", null)` es la tarifa VIGENTE: la tabla admite filas con un
     rango de vigencia para temporadas, y sin este filtro se podría cobrar una
     tarifa pasada. Mismo filtro que `mapaDeTarifas()` y que el sitio público. */
  const { data: tarifas, error: errorTarifas } = await supabase
    .from("tarifas")
    .select("plan_id, precio_noche, precio_noche_1_persona")
    .eq("alojamiento_id", alojamiento.id)
    .is("vigencia", null);

  if (errorTarifas) {
    return {
      ok: false,
      motivo: "No pudimos leer las tarifas ahora mismo. Inténtalo en un momento.",
    };
  }

  const planesPorId = new Map(filasPlanes.map((plan) => [String(plan.id), plan]));

  /* `CabanaCotizable` es exactamente lo que espera `cotizar()`: el mismo tipo
     que usa el navegador, rellenado desde la base. */
  const cabana: CabanaCotizable = {
    slug: String(alojamiento.slug),
    nombre: String(alojamiento.nombre),
    tarifas: (tarifas ?? [])
      .map((tarifa) => {
        const plan = planesPorId.get(String(tarifa.plan_id));
        if (!plan) return null;
        return {
          plan: {
            nombre: String(plan.nombre),
            tipo: plan.tipo,
            dias_aplica: plan.dias_aplica,
          },
          precio_noche: Number(tarifa.precio_noche),
          precio_noche_1_persona:
            tarifa.precio_noche_1_persona === null ||
            tarifa.precio_noche_1_persona === undefined
              ? null
              : Number(tarifa.precio_noche_1_persona),
        };
      })
      .filter((tarifa): tarifa is NonNullable<typeof tarifa> => tarifa !== null),
  };

  /* Una o dos personas: las cinco cabañas son para dos y el hotel no recibe
     menores (§5 de `docs/DATOS_CLIENTE.md`). El dato cambia el precio del plan
     Entre Semana, así que se acota aquí y no se confía en el navegador. */
  const personas = Math.min(2, Math.max(1, Math.round(solicitud.personas)));

  const cotizacion = cotizar({
    noches: listaNoches,
    cabana,
    planFinDeSemana: solicitud.planFinDeSemana,
    adultos: personas,
  });

  if (!cotizacion.posible) {
    return { ok: false, motivo: cotizacion.motivo };
  }

  /*
    EL `plan_id` QUE SE GUARDA EN LA RESERVA.

    `reservas` tiene UN solo `plan_id`, y una estadía mixta (jueves→sábado) usa
    dos planes. Se guarda el del **primer** plan que aparece en el desglose, que
    es el de la primera noche, y el desglose completo viaja a los correos por
    `noches`. Es lo mismo que hace el panel cuando el equipo registra una
    estadía mixta a mano, y está anotado como pendiente del cliente en
    `docs/PLAN_CIERRE.md` («confirmar cómo cobran las estadías mixtas»).
  */
  const nombrePlanPrincipal = cotizacion.planes[0];
  const planPrincipal = filasPlanes.find(
    (plan) => plan.nombre === nombrePlanPrincipal,
  );

  if (!planPrincipal) {
    return {
      ok: false,
      motivo:
        "No pudimos identificar el plan de esa estadía. Escríbenos por WhatsApp y lo armamos contigo.",
    };
  }

  return {
    ok: true,
    datos: {
      alojamientoId: String(alojamiento.id),
      alojamientoNombre: String(alojamiento.nombre),
      planId: String(planPrincipal.id),
      planNombre: String(planPrincipal.nombre),
      entrada,
      salida,
      numPersonas: personas,
      subtotalAlojamiento: cotizacion.total,
      noches: cotizacion.lineas,
    },
  };
}

/* ===========================================================================
 * Día de Calma
 * ======================================================================== */

async function cotizarDia(
  supabase: SupabaseClient,
  solicitud: SolicitudDeReserva,
  filasPlanes: {
    id: string;
    nombre: string;
    tipo: string | null;
    dias_aplica: number[] | null;
    precio_base: number | null;
  }[],
  ahora: Date,
): Promise<ResultadoBase> {
  const plan = filasPlanes.find((fila) => fila.tipo === "dia");
  if (!plan) {
    return {
      ok: false,
      motivo:
        "El Día de Calma no está disponible ahora mismo. Escríbenos por WhatsApp.",
    };
  }

  const personas = Math.min(
    MAX_PERSONAS_POR_RESERVA_DIA,
    Math.max(1, Math.round(solicitud.personas)),
  );

  /*
    EL CUPO SE CUENTA AQUÍ OTRA VEZ, CON LA MISMA REGLA QUE EL SITIO.

    El selector ya lo consultó, pero entre esa consulta y este cobro pueden
    haber entrado otras reservas. La última palabra la tiene el trigger
    `reservas_cupo_dia_de_calma` de la base; esto existe para poder explicarlo
    en español antes de crear nada.

    `ocupaCalendario()` es la misma función que usan el endpoint público, el
    panel y el calendario: una solicitud con el hold vencido no gasta cupo.
  */
  const { data: deEseDia, error } = await supabase
    .from("reservas")
    .select("num_personas, estado, expira_at")
    .eq("tipo", "dia")
    .in("estado", ["pendiente", "confirmada"])
    .overlaps("estancia", `[${solicitud.entrada},${sumarDias(solicitud.entrada, 1)})`);

  if (error) {
    return {
      ok: false,
      motivo: "No pudimos comprobar el cupo de ese día. Inténtalo en un momento.",
    };
  }

  const usado = (deEseDia ?? [])
    .filter((fila) =>
      ocupaCalendario(
        {
          estado: String(fila.estado ?? ""),
          expira_at: typeof fila.expira_at === "string" ? fila.expira_at : null,
        },
        ahora,
      ),
    )
    .reduce((suma, fila) => suma + Number(fila.num_personas ?? 0), 0);

  const restante = Math.max(0, CUPO_DIA_DE_CALMA - usado);

  const cotizacion = cotizarDiaDeCalma({
    fecha: solicitud.entrada,
    personas,
    precioBase: plan.precio_base,
    restante,
  });

  if (typeof cotizacion.precio !== "number") {
    return {
      ok: false,
      motivo:
        cotizacion.nota ??
        "No pudimos calcular el precio de ese día. Escríbenos por WhatsApp.",
    };
  }

  return {
    ok: true,
    datos: {
      alojamientoId: null,
      alojamientoNombre: null,
      planId: String(plan.id),
      planNombre: String(plan.nombre),
      entrada: solicitud.entrada,
      /* El Día de Calma dura un día y se guarda como `[fecha, fecha+1)`, igual
         que lo hace el panel: así el calendario, el cupo y las consultas de
         solape siguen usando el mismo `daterange`. */
      salida: sumarDias(solicitud.entrada, 1),
      numPersonas: cotizacion.personas,
      subtotalAlojamiento: cotizacion.precio,
      noches: [],
    },
  };
}
