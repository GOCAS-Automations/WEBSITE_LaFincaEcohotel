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
  ordenarPorPlan,
  type CabanaCotizable,
  type LineaNoche,
} from "../reserva/cotizacion";
import {
  CUPO_DIA_DE_CALMA,
  MAX_PERSONAS_POR_RESERVA_DIA,
  cotizarDiaDeCalma,
} from "../reserva/dia-de-calma";
import {
  esFechaISO,
  nochesDe,
  validarAntelacion,
  validarRango,
} from "../reserva/noches";
import { ocupaCalendario } from "../reserva/holds";
import {
  CalendarioSinRespuesta,
  MENSAJE_SIN_CALENDARIO_HUESPED,
} from "../reserva/calendario-sin-respuesta";
import { personasDiaDeCalmaParaEscribir } from "../reserva/ocupacion-externa";
import { motivoPersonasInvalidas, personasValidas } from "../reserva/personas";
import { temporadasDeTarifa, type Temporada } from "../reserva/temporadas";
import { leerTemporadas } from "../reserva/temporadas-db";
import {
  normalizarPorcentajeAnticipo,
  resumenDePago,
  type ExtraElegido,
  type ResumenDePago,
} from "../reserva/total";
import { formatearFecha, hoyEnBogota, sumarDias, type FechaISO } from "../utils/formato";

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
  | {
      ok: false;
      motivo: string;
      /**
       * Cierto cuando el fallo no depende del huésped (el calendario del hotel
       * no respondió, un precio mal configurado): `/api/reservar` responde 503
       * en vez de 400.
       */
      servidor?: boolean;
    };

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
  const hoy = hoyEnBogota(ahora);

  /*
    LA ANTELACIÓN MÍNIMA, Y AQUÍ ES DONDE MANDA.

    El sitio no toma reservas en línea para el mismo día: la llegada más
    temprana es mañana (`DIAS_MINIMOS_ANTELACION`). El calendario ya apaga esos
    días, pero el calendario es del navegador y el navegador puede mandar
    cualquier cosa —un `fetch` a mano, un enlace viejo, una pestaña abierta
    desde ayer—, así que la decisión se toma aquí, con el «hoy» del hotel.

    Vale igual para el **hospedaje** y para el **Día de Calma**: esta
    comprobación va antes de separar los dos caminos, y en el Día de Calma
    `entrada` es la fecha única.

    No afecta al PANEL: el alta manual del equipo
    (`src/app/admin/(panel)/reservas/acciones.ts`) no pasa por esta función —ni
    por `/api/reservar`— precisamente para poder registrar las reservas de hoy
    que entran por WhatsApp a última hora.
  */
  const antelacion = validarAntelacion(solicitud.entrada, hoy);
  if (!antelacion.valido) {
    return no(antelacion.motivo);
  }
  if (solicitud.entrada > sumarDias(hoy, MAXIMO_DIAS_VISTA)) {
    return no(
      "Todavía no tomamos reservas tan adelantadas. Escríbenos por WhatsApp y lo miramos contigo.",
    );
  }

  const esDia = solicitud.tipo === "dia";

  /* Lo repite `/api/reservar`, pero esta es la función que decide el cobro: un
     `personas` que no sea 1 o 2 no se adivina. */
  if (personasValidas(solicitud.personas) === null) {
    return no(motivoPersonasInvalidas(solicitud.tipo));
  }

  /* --- El catálogo, recién leído --------------------------------------- */

  const [planes, extrasCatalogo] = await Promise.all([
    supabase
      .from("planes")
      .select("id, nombre, tipo, dias_aplica, precio_base, orden, activo")
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

  const filasPlanes = (planes.data ?? []) as FilaPlan[];

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

/**
 * UN PRECIO DE 0 ES UN ERROR DE CONFIGURACIÓN, NUNCA UNA NOCHE GRATIS.
 *
 * Si el panel guardara una tarifa (o una tarifa diferencial, o el precio del
 * Día de Calma) en 0, `cotizar()` lo sumaría tal cual y el servidor cobraría $0
 * por esa noche. Aquí se corta: se lanza este error, el registro del servidor
 * lo dice con todas las letras para el equipo, y el huésped lee que escriba por
 * WhatsApp. (La validación del formulario de precios es aparte, en el panel.)
 */
export class ErrorDeConfiguracionDePrecio extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorDeConfiguracionDePrecio";
  }
}

/** Lanza {@link ErrorDeConfiguracionDePrecio} si alguna noche cuesta 0 o menos. */
export function exigirPreciosPositivos(
  lineas: { fecha: string; plan: string; precio: number }[],
  nombreCabana: string,
): void {
  const sinPrecio = lineas.filter(
    (linea) => !(Number.isFinite(linea.precio) && linea.precio > 0),
  );
  if (sinPrecio.length === 0) return;
  throw new ErrorDeConfiguracionDePrecio(
    `La ${nombreCabana} tiene noches sin precio configurado: ${sinPrecio
      .map((linea) => `${formatearFecha(linea.fecha)} (${linea.plan}: ${linea.precio})`)
      .join(", ")}.`,
  );
}

/** Lo que lee el huésped ante un precio mal configurado. */
const MENSAJE_PRECIO_SIN_CONFIGURAR =
  "No pudimos calcular el precio de esas fechas porque falta configurar una tarifa. Escríbenos por WhatsApp y te ayudamos con la reserva.";

type FilaPlan = {
  id: string;
  nombre: string;
  tipo: string | null;
  dias_aplica: number[] | null;
  precio_base: number | null;
  orden?: number | null;
};

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

type ResultadoBase =
  | { ok: true; datos: DatosBase }
  | { ok: false; motivo: string; servidor?: boolean };

async function cotizarHospedaje(
  supabase: SupabaseClient,
  solicitud: SolicitudDeReserva,
  filasPlanes: FilaPlan[],
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

  /* Las temporadas que tocan ESTA estadía en ESTA cabaña (las suyas y las de
     todas), recién leídas: se cobra el precio de temporada de cada noche. Si
     no se pueden leer, no se cobra la base a ciegas: sería cobrar diciembre a
     precio de octubre. */
  let temporadas: Temporada[];
  try {
    temporadas = await leerTemporadas(supabase, {
      alojamientoId: String(alojamiento.id),
      desde: entrada,
      hasta: salida,
    });
  } catch {
    return {
      ok: false,
      motivo: "No pudimos leer las tarifas ahora mismo. Inténtalo en un momento.",
    };
  }

  const planesPorId = new Map(filasPlanes.map((plan) => [String(plan.id), plan]));

  /* `CabanaCotizable` es exactamente lo que espera `cotizar()`: el mismo tipo
     que usa el navegador, rellenado desde la base. */
  /* EN EL MISMO ORDEN QUE EL NAVEGADOR (`ordenarPorPlan`): `cotizar()` toma
     la primera tarifa que sirve para cada tipo de noche, así que con otro orden
     podría escoger otro plan que el que vio el huésped. */
  const tarifasOrdenadas = ordenarPorPlan(
    (tarifas ?? []).flatMap((tarifa) => {
      const plan = planesPorId.get(String(tarifa.plan_id));
      return plan ? [{ plan, tarifa }] : [];
    }),
  );

  const cabana: CabanaCotizable = {
    slug: String(alojamiento.slug),
    nombre: String(alojamiento.nombre),
    tarifas: tarifasOrdenadas
      .map(({ plan, tarifa }) => {
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
          temporadas: temporadasDeTarifa(
            temporadas,
            String(alojamiento.id),
            String(tarifa.plan_id),
          ),
        };
      })
      .filter((tarifa): tarifa is NonNullable<typeof tarifa> => tarifa !== null),
  };

  /* Una o dos personas: las cinco cabañas son para dos y el hotel no recibe
     menores (§5 de `docs/DATOS_CLIENTE.md`). El dato cambia el precio del plan
     Entre Semana; `cotizarEnServidor` ya rechazó lo que no sea 1 o 2. */
  const personas = personasValidas(solicitud.personas) ?? 2;

  const cotizacion = cotizar({
    noches: listaNoches,
    cabana,
    planFinDeSemana: solicitud.planFinDeSemana,
    adultos: personas,
  });

  if (!cotizacion.posible) {
    return { ok: false, motivo: cotizacion.motivo };
  }

  /* Ninguna noche se cobra a $0: eso es una tarifa mal guardada, no un regalo. */
  try {
    exigirPreciosPositivos(cotizacion.lineas, String(alojamiento.nombre));
  } catch (error) {
    if (!(error instanceof ErrorDeConfiguracionDePrecio)) throw error;
    console.error(`[precios] ERROR DE CONFIGURACIÓN: ${error.message}`);
    return { ok: false, motivo: MENSAJE_PRECIO_SIN_CONFIGURAR, servidor: true };
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
  filasPlanes: FilaPlan[],
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

  /* Ya validado arriba (1 o 2): aquí no se acota nada a ciegas. */
  const personas = personasValidas(solicitud.personas);
  if (personas === null || personas > MAX_PERSONAS_POR_RESERVA_DIA) {
    return { ok: false, motivo: motivoPersonasInvalidas("dia") };
  }

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

  /* Los «plan día» del calendario general del hotel también gastan cupo: 2
     cada uno (regla 2b de `calendario-externo.ts`). Misma suma que
     `/api/dia-de-calma/cupo` y `/api/disponibilidad`. Sin Google configurado,
     0. Esto decide un cobro, así que se lee SIN caché y, si Google está
     configurado y no responde, no se vende el día (falla cerrado). */
  let delHotel = 0;
  try {
    delHotel =
      (
        await personasDiaDeCalmaParaEscribir(
          solicitud.entrada,
          sumarDias(solicitud.entrada, 1),
        )
      )[solicitud.entrada] ?? 0;
  } catch (error) {
    console.error(
      "[pagos] no se pudo leer el calendario del hotel para el cupo del Día de Calma:",
      error instanceof CalendarioSinRespuesta
        ? error.detalle
        : error instanceof Error
          ? error.message
          : error,
    );
    return { ok: false, motivo: MENSAJE_SIN_CALENDARIO_HUESPED, servidor: true };
  }

  const restante = Math.max(0, CUPO_DIA_DE_CALMA - usado - delHotel);

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

  /* Lo mismo para el Día de Calma: su precio vive en `planes.precio_base`. */
  if (!(cotizacion.precio > 0)) {
    console.error(
      `[precios] ERROR DE CONFIGURACIÓN: el plan «${plan.nombre}» (Día de Calma) tiene precio ${cotizacion.precio}.`,
    );
    return { ok: false, motivo: MENSAJE_PRECIO_SIN_CONFIGURAR, servidor: true };
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
