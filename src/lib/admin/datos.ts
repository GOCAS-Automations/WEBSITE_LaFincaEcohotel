import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { leerRangoFechas } from "./fechas";
import type {
  BloqueoAdmin,
  ImagenGaleriaAdmin,
  OpcionAlojamiento,
  OpcionPlan,
  ReservaAdmin,
} from "./tipos";
import type {
  Alojamiento,
  EstadoReserva,
  Extra,
  OrigenReserva,
  Plan,
  TipoExtra,
} from "@/lib/tipos/basedatos";

/**
 * Consultas del panel.
 *
 * Todas reciben el cliente que devuelve `requireAdmin()`, es decir el que viaja
 * con la sesión del administrador: las políticas RLS siguen aplicando y el
 * panel ve también lo pausado, que es justo lo que el sitio público no ve.
 *
 * El `daterange` de Postgres llega como texto (`"[2026-03-12,2026-03-14)"`) y
 * se convierte aquí, una sola vez, a `{ entrada, salida }`. Ninguna pantalla
 * debería volver a mirar ese formato.
 */

/* ===========================================================================
 * Catálogo
 * ======================================================================== */

const COLUMNAS_ALOJAMIENTO =
  "id, nombre, slug, descripcion, capacidad, amenidades, orden, activo, created_at";

export async function listarAlojamientos(
  supabase: SupabaseClient,
): Promise<Alojamiento[]> {
  const { data, error } = await supabase
    .from("alojamientos")
    .select(COLUMNAS_ALOJAMIENTO)
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Alojamiento[];
}

export async function obtenerAlojamiento(
  supabase: SupabaseClient,
  id: string,
): Promise<Alojamiento | null> {
  const { data, error } = await supabase
    .from("alojamientos")
    .select(COLUMNAS_ALOJAMIENTO)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Alojamiento | null) ?? null;
}

export async function opcionesAlojamiento(
  supabase: SupabaseClient,
): Promise<OpcionAlojamiento[]> {
  const { data, error } = await supabase
    .from("alojamientos")
    .select("id, nombre, capacidad, activo")
    .order("orden", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as OpcionAlojamiento[];
}

const COLUMNAS_PLAN =
  "id, nombre, descripcion, incluye, tipo, dias_aplica, horario, precio_base, orden, activo";

export async function listarPlanes(supabase: SupabaseClient): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("planes")
    .select(COLUMNAS_PLAN)
    .order("orden", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Plan[];
}

/**
 * Solo los planes que se reservan por cabaña.
 *
 * Los de tipo `dia` no tienen tarifa por cabaña —su precio vive en el propio
 * plan— así que no deben aparecer en la rejilla de precios de una cabaña: un
 * campo de precio que no se usa es una invitación a llenarlo mal.
 */
export async function planesDeHospedaje(
  supabase: SupabaseClient,
): Promise<Plan[]> {
  const planes = await listarPlanes(supabase);
  return planes.filter((plan) => plan.tipo === "hospedaje");
}

export async function opcionesPlan(
  supabase: SupabaseClient,
): Promise<OpcionPlan[]> {
  const planes = await listarPlanes(supabase);
  return planes.map((plan) => ({ id: plan.id, nombre: plan.nombre }));
}

export async function obtenerPlan(
  supabase: SupabaseClient,
  id: string,
): Promise<Plan | null> {
  const { data, error } = await supabase
    .from("planes")
    .select(COLUMNAS_PLAN)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Plan | null) ?? null;
}

/** Galería de una cabaña, en orden, tal como la edita `EditorGaleria`. */
export async function galeriaDeAlojamiento(
  supabase: SupabaseClient,
  alojamientoId: string,
): Promise<ImagenGaleriaAdmin[]> {
  const { data, error } = await supabase
    .from("imagenes")
    .select("url, alt, orden")
    .eq("alojamiento_id", alojamientoId)
    .order("orden", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((fila) => ({
    url: String(fila.url),
    alt: typeof fila.alt === "string" ? fila.alt : "",
  }));
}

/** Cuántas fotos tiene cada cabaña (para el listado). */
export async function conteoDeGalerias(
  supabase: SupabaseClient,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("imagenes")
    .select("alojamiento_id")
    .not("alojamiento_id", "is", null);

  if (error) throw new Error(error.message);

  const conteo = new Map<string, number>();
  for (const fila of data ?? []) {
    const id = String(fila.alojamiento_id);
    conteo.set(id, (conteo.get(id) ?? 0) + 1);
  }
  return conteo;
}

/** Portada (primera foto) de cada cabaña. */
export async function portadasDeAlojamientos(
  supabase: SupabaseClient,
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("imagenes")
    .select("alojamiento_id, url, orden")
    .not("alojamiento_id", "is", null)
    .order("orden", { ascending: true });

  if (error) throw new Error(error.message);

  const portadas = new Map<string, string>();
  for (const fila of data ?? []) {
    const id = String(fila.alojamiento_id);
    if (!portadas.has(id)) portadas.set(id, String(fila.url));
  }
  return portadas;
}

/* ===========================================================================
 * Tarifas
 * ======================================================================== */

export type TarifaAdmin = {
  id: string | null;
  plan_id: string;
  plan_nombre: string;
  /**
   * `true` si la cabaña se ofrece con ese plan, es decir si existe la fila de
   * `tarifas`. El modelo no tiene una columna «disponible»: la existencia de
   * la tarifa ES la disponibilidad.
   */
  ofrecido: boolean;
  precio_noche: number | null;
  precio_noche_1_persona: number | null;
  /** Días ISO en que se puede reservar el plan, para explicarlo en el panel. */
  dias_aplica: number[] | null;
};

/**
 * Las tarifas base (sin vigencia) de una cabaña, UNA POR PLAN DE HOSPEDAJE.
 *
 * Siempre devuelve todos los planes de hospedaje, aunque alguno no tenga
 * precio todavía: el formulario debe mostrar los huecos, no esconder el que
 * falta. Los planes de día quedan fuera a propósito (no se venden por cabaña).
 */
export async function tarifasDeAlojamiento(
  supabase: SupabaseClient,
  alojamientoId: string,
): Promise<TarifaAdmin[]> {
  const [planes, tarifas] = await Promise.all([
    planesDeHospedaje(supabase),
    supabase
      .from("tarifas")
      .select("id, plan_id, precio_noche, precio_noche_1_persona, vigencia")
      .eq("alojamiento_id", alojamientoId)
      .is("vigencia", null),
  ]);

  if (tarifas.error) throw new Error(tarifas.error.message);

  const porPlan = new Map(
    (tarifas.data ?? []).map((fila) => [String(fila.plan_id), fila]),
  );

  return planes.map((plan) => {
    const fila = porPlan.get(plan.id);
    return {
      id: fila ? String(fila.id) : null,
      plan_id: plan.id,
      plan_nombre: plan.nombre,
      ofrecido: Boolean(fila),
      precio_noche: fila ? Number(fila.precio_noche) : null,
      precio_noche_1_persona:
        fila && fila.precio_noche_1_persona !== null
          ? Number(fila.precio_noche_1_persona)
          : null,
      dias_aplica: plan.dias_aplica,
    };
  });
}

/** Precio de un plan en una cabaña; `null` si no hay tarifa. */
export async function precioDe(
  supabase: SupabaseClient,
  alojamientoId: string,
  planId: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from("tarifas")
    .select("precio_noche")
    .eq("alojamiento_id", alojamientoId)
    .eq("plan_id", planId)
    .is("vigencia", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? Number(data.precio_noche) : null;
}

/** Todas las tarifas base, para que el formulario calcule en el navegador. */
export async function mapaDeTarifas(
  supabase: SupabaseClient,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("tarifas")
    .select("alojamiento_id, plan_id, precio_noche")
    .is("vigencia", null);

  if (error) throw new Error(error.message);

  const mapa: Record<string, number> = {};
  for (const fila of data ?? []) {
    mapa[`${fila.alojamiento_id}|${fila.plan_id}`] = Number(fila.precio_noche);
  }
  return mapa;
}

/* ===========================================================================
 * Extras (experiencias y adicionales)
 * ======================================================================== */

const COLUMNAS_EXTRA =
  "id, tipo, nombre, descripcion, precio, imagen_url, activo, orden";

export async function listarExtras(
  supabase: SupabaseClient,
  tipo: TipoExtra,
): Promise<Extra[]> {
  const { data, error } = await supabase
    .from("extras")
    .select(COLUMNAS_EXTRA)
    .eq("tipo", tipo)
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Extra[];
}

export async function obtenerExtra(
  supabase: SupabaseClient,
  id: string,
): Promise<Extra | null> {
  const { data, error } = await supabase
    .from("extras")
    .select(COLUMNAS_EXTRA)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Extra | null) ?? null;
}

export async function extrasActivos(supabase: SupabaseClient): Promise<Extra[]> {
  const { data, error } = await supabase
    .from("extras")
    .select(COLUMNAS_EXTRA)
    .eq("activo", true)
    .order("tipo", { ascending: true })
    .order("orden", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Extra[];
}

/* ===========================================================================
 * Reservas
 * ======================================================================== */

const COLUMNAS_RESERVA =
  "id, codigo, alojamiento_id, plan_id, estancia, huesped_nombre, huesped_email, huesped_telefono, huesped_documento, num_personas, notas, subtotal_alojamiento, subtotal_extras, total, monto_pagado, estado, origen, created_at";

type FilaReserva = Record<string, unknown>;

function aReservaAdmin(
  fila: FilaReserva,
  nombresAlojamiento: Map<string, string>,
  nombresPlan: Map<string, string>,
): ReservaAdmin | null {
  const rango = leerRangoFechas(fila.estancia);
  if (!rango) return null;

  const alojamientoId = fila.alojamiento_id ? String(fila.alojamiento_id) : null;
  const planId = fila.plan_id ? String(fila.plan_id) : null;

  return {
    id: String(fila.id),
    codigo: String(fila.codigo),
    alojamiento_id: alojamientoId,
    alojamiento_nombre: alojamientoId
      ? (nombresAlojamiento.get(alojamientoId) ?? null)
      : null,
    plan_id: planId,
    plan_nombre: planId ? (nombresPlan.get(planId) ?? null) : null,
    entrada: rango.inicio,
    salida: rango.fin,
    huesped_nombre: String(fila.huesped_nombre ?? ""),
    huesped_email: String(fila.huesped_email ?? ""),
    huesped_telefono: String(fila.huesped_telefono ?? ""),
    huesped_documento:
      typeof fila.huesped_documento === "string" ? fila.huesped_documento : null,
    num_personas: Number(fila.num_personas ?? 2),
    notas: typeof fila.notas === "string" ? fila.notas : null,
    subtotal_alojamiento: Number(fila.subtotal_alojamiento ?? 0),
    subtotal_extras: Number(fila.subtotal_extras ?? 0),
    total: Number(fila.total ?? 0),
    monto_pagado: Number(fila.monto_pagado ?? 0),
    estado: fila.estado as EstadoReserva,
    origen: fila.origen as OrigenReserva,
    created_at: String(fila.created_at ?? ""),
  };
}

async function diccionariosDeNombres(supabase: SupabaseClient) {
  const [alojamientos, planes] = await Promise.all([
    supabase.from("alojamientos").select("id, nombre"),
    supabase.from("planes").select("id, nombre"),
  ]);

  return {
    alojamientos: new Map(
      (alojamientos.data ?? []).map((fila) => [
        String(fila.id),
        String(fila.nombre),
      ]),
    ),
    planes: new Map(
      (planes.data ?? []).map((fila) => [String(fila.id), String(fila.nombre)]),
    ),
  };
}

export async function listarReservas(
  supabase: SupabaseClient,
  filtros: { estado?: EstadoReserva | "todas"; limite?: number } = {},
): Promise<ReservaAdmin[]> {
  let consulta = supabase
    .from("reservas")
    .select(COLUMNAS_RESERVA)
    .order("created_at", { ascending: false })
    .limit(filtros.limite ?? 300);

  if (filtros.estado && filtros.estado !== "todas") {
    consulta = consulta.eq("estado", filtros.estado);
  }

  const [{ data, error }, nombres] = await Promise.all([
    consulta,
    diccionariosDeNombres(supabase),
  ]);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((fila) => aReservaAdmin(fila, nombres.alojamientos, nombres.planes))
    .filter((fila): fila is ReservaAdmin => fila !== null);
}

export async function obtenerReserva(
  supabase: SupabaseClient,
  id: string,
): Promise<ReservaAdmin | null> {
  const [{ data, error }, nombres] = await Promise.all([
    supabase.from("reservas").select(COLUMNAS_RESERVA).eq("id", id).maybeSingle(),
    diccionariosDeNombres(supabase),
  ]);

  if (error) throw new Error(error.message);
  if (!data) return null;
  return aReservaAdmin(data, nombres.alojamientos, nombres.planes);
}

export type ExtraDeReserva = {
  extra_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
};

export async function extrasDeReserva(
  supabase: SupabaseClient,
  reservaId: string,
): Promise<ExtraDeReserva[]> {
  const [{ data, error }, catalogo] = await Promise.all([
    supabase
      .from("reserva_extras")
      .select("extra_id, cantidad, precio_unitario")
      .eq("reserva_id", reservaId),
    supabase.from("extras").select("id, nombre"),
  ]);

  if (error) throw new Error(error.message);

  const nombres = new Map(
    (catalogo.data ?? []).map((fila) => [String(fila.id), String(fila.nombre)]),
  );

  return (data ?? []).map((fila) => ({
    extra_id: String(fila.extra_id),
    nombre: nombres.get(String(fila.extra_id)) ?? "Extra",
    cantidad: Number(fila.cantidad ?? 1),
    precio_unitario: Number(fila.precio_unitario ?? 0),
  }));
}

/** Reservas que tocan un rango de fechas (el calendario del mes). */
export async function reservasEnRango(
  supabase: SupabaseClient,
  desde: string,
  hasta: string,
): Promise<ReservaAdmin[]> {
  const [{ data, error }, nombres] = await Promise.all([
    supabase
      .from("reservas")
      .select(COLUMNAS_RESERVA)
      .overlaps("estancia", `[${desde},${hasta})`),
    diccionariosDeNombres(supabase),
  ]);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((fila) => aReservaAdmin(fila, nombres.alojamientos, nombres.planes))
    .filter((fila): fila is ReservaAdmin => fila !== null);
}

/* ===========================================================================
 * Bloqueos
 * ======================================================================== */

export async function listarBloqueos(
  supabase: SupabaseClient,
): Promise<BloqueoAdmin[]> {
  const [{ data, error }, nombres] = await Promise.all([
    supabase
      .from("bloqueos")
      .select("id, alojamiento_id, rango, motivo, created_at")
      .order("created_at", { ascending: false }),
    diccionariosDeNombres(supabase),
  ]);

  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((fila): BloqueoAdmin[] => {
    const rango = leerRangoFechas(fila.rango);
    if (!rango) return [];
    const alojamientoId = String(fila.alojamiento_id);
    return [
      {
        id: String(fila.id),
        alojamiento_id: alojamientoId,
        alojamiento_nombre: nombres.alojamientos.get(alojamientoId) ?? null,
        inicio: rango.inicio,
        fin: rango.fin,
        motivo: typeof fila.motivo === "string" ? fila.motivo : null,
        created_at: String(fila.created_at ?? ""),
      },
    ];
  });
}

export async function bloqueosEnRango(
  supabase: SupabaseClient,
  desde: string,
  hasta: string,
): Promise<BloqueoAdmin[]> {
  const [{ data, error }, nombres] = await Promise.all([
    supabase
      .from("bloqueos")
      .select("id, alojamiento_id, rango, motivo, created_at")
      .overlaps("rango", `[${desde},${hasta})`),
    diccionariosDeNombres(supabase),
  ]);

  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((fila): BloqueoAdmin[] => {
    const rango = leerRangoFechas(fila.rango);
    if (!rango) return [];
    const alojamientoId = String(fila.alojamiento_id);
    return [
      {
        id: String(fila.id),
        alojamiento_id: alojamientoId,
        alojamiento_nombre: nombres.alojamientos.get(alojamientoId) ?? null,
        inicio: rango.inicio,
        fin: rango.fin,
        motivo: typeof fila.motivo === "string" ? fila.motivo : null,
        created_at: String(fila.created_at ?? ""),
      },
    ];
  });
}

/* ===========================================================================
 * Contenido del sitio
 * ======================================================================== */

/** Lee una fila del CMS como objeto. Si no existe, devuelve `{}`. */
export async function leerFilaContenido(
  supabase: SupabaseClient,
  clave: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("contenido")
    .select("valor")
    .eq("clave", clave)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const valor = data?.valor;
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

/** Lee varias filas del CMS de una vez. */
export async function leerContenidoPanel(
  supabase: SupabaseClient,
): Promise<Map<string, Record<string, unknown>>> {
  const { data, error } = await supabase.from("contenido").select("clave, valor");
  if (error) throw new Error(error.message);

  const mapa = new Map<string, Record<string, unknown>>();
  for (const fila of data ?? []) {
    if (
      fila.valor &&
      typeof fila.valor === "object" &&
      !Array.isArray(fila.valor)
    ) {
      mapa.set(String(fila.clave), fila.valor as Record<string, unknown>);
    }
  }
  return mapa;
}
