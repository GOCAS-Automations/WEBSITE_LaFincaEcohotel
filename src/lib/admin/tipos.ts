/**
 * Tipos y etiquetas del panel.
 *
 * Se declaran aparte de `@/lib/contenido` porque el panel ve columnas que el
 * sitio público no usa (estado, origen, monto_pagado) y ve también las filas
 * pausadas. Todas las etiquetas están en español claro: el usuario del panel
 * no es técnico y nunca debe leer un valor de base de datos en crudo.
 */

import type { RolPanel } from "./roles";
import type {
  EstadoReserva,
  OrigenReserva,
  TipoExtra,
  TipoPlan,
  TipoReserva,
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
  "google_calendar",
] as const;

/* ---------------------------------------------------------------------------
 * Las dos formas de reservar
 * ------------------------------------------------------------------------- */

export const TIPOS_RESERVA = ["hospedaje", "dia"] as const;

/** Nunca «pasadía»: el hotel rechaza esa palabra (§3 de DATOS_CLIENTE.md). */
export const ETIQUETA_TIPO_RESERVA: Record<TipoReserva, string> = {
  hospedaje: "Hospedaje (noches en una cabaña)",
  dia: "Día de Calma (sin hospedaje)",
};

/** Pastilla corta, para listados y calendario. */
export const ETIQUETA_CORTA_TIPO_RESERVA: Record<TipoReserva, string> = {
  hospedaje: "Hospedaje",
  dia: "Día de Calma",
};

export const AYUDA_TIPO_RESERVA: Record<TipoReserva, string> = {
  hospedaje:
    "El huésped duerme en una cabaña. Esas noches quedan ocupadas en el calendario.",
  dia: "Visita de un día, de 10:00 a. m. a 5:00 p. m., sin cabaña. No bloquea ninguna cabaña, pero cuenta para el cupo de 10 personas de ese día.",
};

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
  /* Reservado para la sincronización futura con el calendario que el hotel
     llena a mano. Hoy nada crea reservas con este origen. */
  google_calendar: "Desde el calendario de Google",
};

/**
 * Cómo se lee en pantalla el canal de la autorización de datos.
 *
 * Las claves son los valores del `check` de la migración 012. Se indexa por
 * `string` porque la columna es texto libre en la base: un valor viejo o
 * inesperado se pinta tal cual en vez de dejar el hueco vacío.
 */
export const ETIQUETA_CANAL_AUTORIZACION: Record<string, string> = {
  web: "Casilla del sitio",
  whatsapp: "WhatsApp, con la casilla del sitio",
  telefono: "Verbal, por teléfono",
  presencial: "Verbal, en el hotel",
  panel: "Apuntada por el equipo",
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
  /** Hospedaje o Día de Calma. */
  tipo: TipoReserva;
  /** `null` en las reservas de Día de Calma. */
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
  /** Qué parte del total se cobró por adelantado: un entero entre 50 y 100. */
  porcentaje_anticipo: number;
  /** Anticipo congelado al reservar; `null` en las reservas antiguas. */
  monto_anticipo: number | null;
  /** Id del evento externo (Google Calendar) si la reserva vino de fuera. */
  referencia_externa: string | null;
  /**
   * Prueba de la autorización de tratamiento de datos (Ley 1581 de 2012).
   *
   * Las tres van juntas o las tres son `null` (lo garantiza un `check` de la
   * migración 012). `null` significa «no consta», y es distinto de una fecha
   * inventada: son las reservas cuya autorización habría que conseguir.
   */
  autorizacion_datos_en: string | null;
  /** Fecha de revisión del texto que el titular aceptó. */
  autorizacion_datos_version: string | null;
  /** Por dónde la dio: `web`, `whatsapp`, `telefono`, `presencial` o `panel`. */
  autorizacion_datos_canal: string | null;
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
  /** Hospedaje o día: el formulario de reserva pregunta cosas distintas. */
  tipo: TipoPlan;
  /** Precio propio de los planes de día (el Día de Calma). */
  precio_base: number | null;
  /** Franja horaria de los planes de día. */
  horario: string | null;
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

/* ===========================================================================
 * Cuentas del panel
 * ======================================================================== */

/**
 * Una cuenta de Supabase Auth, con lo poco que la pantalla de Usuarios enseña.
 *
 * Vive aquí y no en `src/lib/admin/usuarios.ts` porque ese módulo es
 * `server-only` —usa `service_role`— y la fila de la lista es un componente de
 * cliente. Un `import type` se borra al compilar, sí, pero apoyar la frontera
 * del `service_role` en esa sutileza es pedirle a quien lea el código dentro de
 * un año que la recuerde.
 */
export type UsuarioPanel = {
  id: string;
  correo: string;
  rol: RolPanel;
  /** ISO del último inicio de sesión; `null` si nunca ha entrado. */
  ultimoAcceso: string | null;
  /** ISO de creación de la cuenta. */
  creada: string;
};
