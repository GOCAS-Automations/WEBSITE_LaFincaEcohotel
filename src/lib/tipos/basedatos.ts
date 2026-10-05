/**
 * Tipos del modelo de datos (ver §4 del plan de desarrollo).
 * Reflejan las tablas creadas en `supabase/migrations/`.
 */

export type EstadoReserva =
  | "pendiente"
  | "confirmada"
  | "cancelada"
  | "completada";

/**
 * De dónde salió la reserva.
 *
 * `google_calendar` queda declarado para la sincronización futura con el
 * calendario que el hotel llena a mano desde WhatsApp (ver la migración 009):
 * hoy NADA crea reservas con ese origen, pero el panel ya sabe nombrarlo.
 */
export type OrigenReserva =
  | "web"
  | "whatsapp"
  | "telefono"
  | "manual"
  | "google_calendar";

/**
 * Qué se vendió en una reserva:
 *   · `hospedaje` — noche(s) en una cabaña.
 *   · `dia`       — Día de Calma: un solo día, sin cabaña y con cupo diario.
 */
export type TipoReserva = "hospedaje" | "dia";

export type TipoExtra = "experiencia" | "adicional";

/**
 * Las dos formas de vender de La Finca:
 *   · `hospedaje` — noche en una cabaña. El precio sale de `tarifas`.
 *   · `dia`       — visita de día sin hospedaje («Día de Calma»). No se
 *                   reserva por cabaña: el precio sale de `planes.precio_base`.
 */
export type TipoPlan = "hospedaje" | "dia";

export interface Alojamiento {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  capacidad: number;
  amenidades: string[] | null;
  orden: number;
  activo: boolean;
  created_at: string;
}

export interface Plan {
  id: string;
  nombre: string;
  descripcion: string | null;
  incluye: string[] | null;
  /** Hospedaje (precio por cabaña) o día sin hospedaje (precio propio). */
  tipo: TipoPlan;
  /**
   * Días ISO (1 = lunes … 7 = domingo) en los que se puede reservar el plan.
   * `null` = todos los días. Entre Semana `[1,2,3,4]`; Estándar y Premium
   * `[5,6,7]` (viernes a domingo y festivos); Día de Calma `null`.
   */
  dias_aplica: number[] | null;
  /**
   * Franja horaria en texto («10:00 a. m. – 5:00 p. m.»), solo en los planes
   * de tipo `dia`. `null` en los de hospedaje.
   */
  horario: string | null;
  /**
   * Precio en COP entero de los planes que no se reservan por cabaña.
   * `null` en los de hospedaje, cuyo precio vive en `tarifas`.
   */
  precio_base: number | null;
  orden: number;
  activo: boolean;
}

export interface Tarifa {
  id: string;
  /** La cabaña de una tarifa base. `null` en las de temporada (su alcance es el de la temporada). */
  alojamiento_id: string | null;
  plan_id: string;
  /** `null` = tarifa base. Con valor, precio de esa temporada (migración 017). */
  temporada_id: string | null;
  /** Copia del alcance de la temporada, atada por llave. `null` en las base. */
  temporada_alcance: string | null;
  /** Precio por noche en pesos colombianos, entero. */
  precio_noche: number;
  /**
   * Precio por noche cuando viaja una sola persona. `null` = no hay precio
   * distinto y se cobra `precio_noche`. Hoy solo lo usa el plan Entre Semana
   * ($200.000 en vez de $350.000).
   */
  precio_noche_1_persona: number | null;
  /**
   * `daterange` de Postgres; `null` = tarifa base todo el año. En las de
   * temporada es copia de `temporadas.noches` (la llave impide que difiera).
   */
  vigencia: string | null;
  /** Días ISO (1 = lunes … 7 = domingo) en los que aplica la tarifa. */
  dias_semana: number[] | null;
  created_at: string;
}

/** Una temporada: tarifas para fechas concretas (migración 017). */
export interface TemporadaFila {
  id: string;
  nombre: string;
  /** `null` = todas las cabañas. */
  alojamiento_id: string | null;
  /** `daterange` `[primera noche, día siguiente a la última)`. */
  noches: string;
  creado_at: string;
  actualizado_at: string;
}

export interface Extra {
  id: string;
  tipo: TipoExtra;
  nombre: string;
  descripcion: string | null;
  precio: number;
  imagen_url: string | null;
  activo: boolean;
  orden: number;
}

export interface Reserva {
  id: string;
  codigo: string;
  /** Hospedaje o Día de Calma. Decide si hay cabaña y si cuenta para el cupo. */
  tipo: TipoReserva;
  /** `null` en las reservas de Día de Calma: no ocupan cabaña. */
  alojamiento_id: string | null;
  plan_id: string | null;
  /** `daterange` `[check_in, check_out)`. */
  estancia: string;
  huesped_nombre: string;
  huesped_email: string;
  huesped_telefono: string;
  huesped_documento: string | null;
  num_personas: number;
  notas: string | null;
  subtotal_alojamiento: number;
  subtotal_extras: number;
  total: number;
  monto_pagado: number;
  estado: EstadoReserva;
  origen: OrigenReserva;
  /** Id del evento en el sistema de origen (Google Calendar). */
  referencia_externa: string | null;
  /** Qué parte del total se cobra por adelantado: un entero entre 50 y 100. */
  porcentaje_anticipo: number;
  /** Anticipo en COP congelado al reservar. */
  monto_anticipo: number | null;
  /**
   * Prueba de la autorización de tratamiento de datos personales
   * (Ley 1581 de 2012, art. 9; Decreto 1074 de 2015, art. 2.2.2.25.2.4).
   * Migración 012. Las tres van juntas o las tres son `null`.
   */
  autorizacion_datos_en: string | null;
  autorizacion_datos_version: string | null;
  autorizacion_datos_canal: string | null;
  created_at: string;
}

export interface ReservaExtra {
  id: string;
  reserva_id: string;
  extra_id: string;
  cantidad: number;
  precio_unitario: number;
  /**
   * Noche (fecha de check-in) a la que se añade el extra. `null` = para toda
   * la estadía, que es como se apuntan los adicionales que no pertenecen a una
   * noche concreta (la segunda mascota) y como quedaron las reservas viejas.
   */
  noche: string | null;
}

export interface Bloqueo {
  id: string;
  alojamiento_id: string;
  rango: string;
  motivo: string | null;
  created_at: string;
}

export interface Pago {
  id: string;
  reserva_id: string;
  referencia: string;
  transaccion_id: string | null;
  monto: number;
  estado: string;
  metodo: string | null;
  payload: unknown;
  created_at: string;
}

export interface Contenido {
  clave: string;
  valor: unknown;
  actualizado_at: string;
}

export interface Imagen {
  id: string;
  alojamiento_id: string | null;
  url: string;
  alt: string | null;
  orden: number;
}
