/**
 * Tipos del modelo de datos (ver §4 del plan de desarrollo).
 * Reflejan las tablas creadas en `supabase/migrations/`.
 */

export type EstadoReserva =
  | "pendiente"
  | "confirmada"
  | "cancelada"
  | "completada";

export type OrigenReserva = "web" | "whatsapp" | "telefono" | "manual";

export type TipoExtra = "experiencia" | "adicional";

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
  orden: number;
  activo: boolean;
}

export interface Tarifa {
  id: string;
  alojamiento_id: string;
  plan_id: string;
  /** Precio por noche en pesos colombianos, entero. */
  precio_noche: number;
  /** `daterange` de Postgres; `null` = tarifa base todo el año. */
  vigencia: string | null;
  /** Días ISO (1 = lunes … 7 = domingo) en los que aplica la tarifa. */
  dias_semana: number[] | null;
  created_at: string;
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
  created_at: string;
}

export interface ReservaExtra {
  reserva_id: string;
  extra_id: string;
  cantidad: number;
  precio_unitario: number;
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
