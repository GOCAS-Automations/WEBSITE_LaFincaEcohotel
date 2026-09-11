/**
 * Tipos y etiquetas del panel.
 *
 * Se declaran aparte de `@/lib/contenido` porque el panel ve columnas que el
 * sitio público no usa (estado, origen, monto_pagado) y ve también las filas
 * pausadas. Todas las etiquetas están en español claro: el usuario del panel
 * no es técnico y nunca debe leer un valor de base de datos en crudo.
 */

import type {
  EstadoReserva,
  OrigenReserva,
  TipoExtra,
  TipoPlan,
} from "@/lib/tipos/basedatos";

/* ===========================================================================
 * Resultado de las Server Actions
 * ======================================================================== */

/** Resultado uniforme de las acciones que consume `useActionState`. */
export type EstadoAccion = {
  estado: "idle" | "ok" | "error";
  mensaje: string;
};

export const ESTADO_INICIAL: EstadoAccion = { estado: "idle", mensaje: "" };

export function estadoError(mensaje: string): EstadoAccion {
  return { estado: "error", mensaje };
}

export function estadoOk(mensaje: string): EstadoAccion {
  return { estado: "ok", mensaje };
}

/* ===========================================================================
 * Reservas
 * ======================================================================== */

export const ESTADOS_RESERVA = [
  "pendiente",
  "confirmada",
  "completada",
  "cancelada",
] as const;

export const ORIGENES_RESERVA = [
  "web",
  "whatsapp",
  "telefono",
  "manual",
] as const;

export const ETIQUETA_ESTADO: Record<EstadoReserva, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  completada: "Completada",
  cancelada: "Cancelada",
};

/** Explicación de cada estado, para que el panel no dependa de saberlo. */
export const AYUDA_ESTADO: Record<EstadoReserva, string> = {
  pendiente: "Apartada pero sin confirmar. Ya ocupa las fechas.",
  confirmada: "Confirmada con el huésped. Ocupa las fechas.",
  completada: "El huésped ya se hospedó. Ocupa las fechas del pasado.",
  cancelada: "No ocupa fechas: esas noches vuelven a estar libres.",
};

export const ETIQUETA_ORIGEN: Record<OrigenReserva, string> = {
  web: "Desde el sitio web",
  whatsapp: "Por WhatsApp",
  telefono: "Por teléfono",
  manual: "Registrada a mano",
};

/**
 * Estados que ocupan calendario.
 *
 * Debe coincidir con el `where` del constraint `reservas_sin_solapamiento`
 * ('pendiente','confirmada') más 'completada', que ya pasó y también hay que
 * mostrar como ocupado en el calendario histórico. La base solo impide cruces
 * entre pendientes y confirmadas; el panel avisa además de las completadas
 * para no ofrecer como libre una noche que sí se usó.
 */
export const ESTADOS_QUE_OCUPAN: EstadoReserva[] = [
  "pendiente",
  "confirmada",
  "completada",
];

/** Colores de cada estado en el calendario y en las pastillas. */
export const TONO_ESTADO: Record<
  EstadoReserva,
  "verde" | "ambar" | "gris" | "azul"
> = {
  pendiente: "ambar",
  confirmada: "verde",
  completada: "azul",
  cancelada: "gris",
};

/** Una reserva tal como la lista y edita el panel. */
export type ReservaAdmin = {
  id: string;
  codigo: string;
  alojamiento_id: string | null;
  alojamiento_nombre: string | null;
  plan_id: string | null;
  plan_nombre: string | null;
  entrada: string;
  salida: string;
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
};

export type BloqueoAdmin = {
  id: string;
  alojamiento_id: string;
  alojamiento_nombre: string | null;
  inicio: string;
  /** Día de liberación (exclusivo): la noche anterior es la última bloqueada. */
  fin: string;
  motivo: string | null;
  created_at: string;
};

/* ===========================================================================
 * Catálogo
 * ======================================================================== */

export type ImagenGaleriaAdmin = {
  url: string;
  alt: string;
};

/** Opción mínima para los desplegables de cabaña. */
export type OpcionAlojamiento = {
  id: string;
  nombre: string;
  capacidad: number;
  activo: boolean;
};

export type OpcionPlan = {
  id: string;
  nombre: string;
};

/* ---------------------------------------------------------------------------
 * Planes
 * ------------------------------------------------------------------------- */

export const TIPOS_PLAN = ["hospedaje", "dia"] as const;

/**
 * Cómo se le nombra cada tipo de plan al cliente. «Día sin hospedaje» y no
 * «pasadía»: el hotel rechaza expresamente esa palabra.
 */
export const ETIQUETA_TIPO_PLAN: Record<TipoPlan, string> = {
  hospedaje: "Hospedaje (noche en una cabaña)",
  dia: "Día sin hospedaje",
};

export const AYUDA_TIPO_PLAN: Record<TipoPlan, string> = {
  hospedaje:
    "El huésped duerme en una cabaña. El precio se pone cabaña por cabaña, en «Cabañas».",
  dia: "Visita de un día, sin noche ni cabaña. Lleva un horario y un solo precio para todo el hotel.",
};

/** Pastilla corta para los listados. */
export const ETIQUETA_CORTA_TIPO_PLAN: Record<TipoPlan, string> = {
  hospedaje: "Hospedaje",
  dia: "Día sin hospedaje",
};

/** Los siete días de la semana en orden ISO (1 = lunes … 7 = domingo). */
export const DIAS_SEMANA = [
  { numero: 1, nombre: "Lunes", corto: "Lun" },
  { numero: 2, nombre: "Martes", corto: "Mar" },
  { numero: 3, nombre: "Miércoles", corto: "Mié" },
  { numero: 4, nombre: "Jueves", corto: "Jue" },
  { numero: 5, nombre: "Viernes", corto: "Vie" },
  { numero: 6, nombre: "Sábado", corto: "Sáb" },
  { numero: 7, nombre: "Domingo", corto: "Dom" },
] as const;

/**
 * Resume `dias_aplica` en una frase para el panel. Vacío o `null` significa
 * «todos los días», que es como lo entiende el motor de reservas.
 */
export function resumirDias(dias: number[] | null | undefined): string {
  if (!dias || dias.length === 0) return "Todos los días";
  if (dias.length === 7) return "Todos los días";
  return DIAS_SEMANA.filter((dia) => dias.includes(dia.numero))
    .map((dia) => dia.corto)
    .join(", ");
}

export const TIPOS_EXTRA = ["experiencia", "adicional"] as const;

export const ETIQUETA_TIPO_EXTRA: Record<TipoExtra, string> = {
  experiencia: "Experiencia",
  adicional: "Adicional",
};

/* ===========================================================================
 * Carpetas del bucket de imágenes
 * ======================================================================== */

/**
 * Carpetas admitidas dentro del bucket `imagenes`. Es una lista cerrada: el
 * nombre de la carpeta llega del navegador y sin esta comprobación se podría
 * escribir en cualquier ruta del bucket (`../`, `otro-sitio/…`).
 */
export const CARPETAS_IMAGENES = new Set([
  "alojamientos",
  "experiencias",
  "adicionales",
  "sitio",
  "galeria",
]);

export type CarpetaImagenes =
  | "alojamientos"
  | "experiencias"
  | "adicionales"
  | "sitio"
  | "galeria";
