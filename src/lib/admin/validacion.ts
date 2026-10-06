/**
 * Lectura y validación del `FormData` que llega a las Server Actions.
 *
 * Filosofía: un `ErrorDeValidacion` con un mensaje en español por cada campo
 * mal diligenciado. Las acciones envuelven su cuerpo en `ejecutarAccion()`, que
 * convierte esa excepción en el `EstadoAccion` que pinta la interfaz. Así
 * ninguna validación termina en la pantalla de error de Next, que al usuario
 * del panel no le dice nada.
 */
import { estadoError, type EstadoAccion } from "./tipos";
import { esFechaISO } from "./fechas";
import { LARGO_MINIMO_CONTRASENA } from "./roles";
import { direccionDeMapa } from "@/lib/mapa-embebido";
import { leerEnteroEscrito } from "@/lib/utils/importe";
import { formatearCOP, formatearNumero } from "@/lib/utils/formato";

export class ErrorDeValidacion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorDeValidacion";
  }
}

/**
 * Falta de permiso: la acción existe y los datos están bien, pero esta cuenta
 * no puede ejecutarla.
 *
 * Se distingue de `ErrorDeValidacion` porque no se arregla cambiando lo que se
 * escribió. `ejecutarAccion()` las trata igual —mensaje en pantalla, sin
 * pantalla de error de Next— pero el nombre importa al leer los registros.
 */
export class ErrorDePermiso extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorDePermiso";
  }
}

/** Texto obligatorio. */
export function textoRequerido(
  form: FormData,
  campo: string,
  etiqueta: string,
  maximo = 300,
): string {
  const valor = String(form.get(campo) ?? "").trim();
  if (!valor) {
    throw new ErrorDeValidacion(`El campo «${etiqueta}» es obligatorio.`);
  }
  if (valor.length > maximo) {
    throw new ErrorDeValidacion(
      `El campo «${etiqueta}» no puede superar ${maximo} caracteres.`,
    );
  }
  return valor;
}

/** Texto opcional: vacío se guarda como NULL. */
export function textoOpcional(
  form: FormData,
  campo: string,
  maximo = 5000,
): string | null {
  const valor = String(form.get(campo) ?? "").trim();
  if (!valor) return null;
  return valor.slice(0, maximo);
}

/**
 * Entero obligatorio dentro de un rango.
 *
 * Acepta el separador de miles y el signo de pesos: el cliente escribe
 * "450.000" o "$450.000" con toda naturalidad y rechazárselo sería pedirle que
 * piense como un programa. Lo que NO acepta son centavos ni decimales
 * («552.000,50»): antes se borraban los separadores y eso se guardaba como
 * 55.200.050. Las reglas exactas, en `leerEnteroEscrito()`.
 *
 * Para los precios, `precioRequerido()`, con mensajes de dinero.
 */
export function enteroRequerido(
  form: FormData,
  campo: string,
  etiqueta: string,
  { min = 0, max = 2_000_000_000 }: { min?: number; max?: number } = {},
): number {
  const lectura = leerEnteroEscrito(String(form.get(campo) ?? ""));
  if (!lectura.ok) {
    if (lectura.problema === "vacio") {
      throw new ErrorDeValidacion(`El campo «${etiqueta}» es obligatorio.`);
    }
    if (lectura.problema === "centavos") {
      throw new ErrorDeValidacion(
        `Escribe «${etiqueta}» sin centavos ni decimales: solo el número entero, por ejemplo 552.000.`,
      );
    }
    throw new ErrorDeValidacion(
      `No se entiende el número de «${etiqueta}». Escríbelo solo con cifras, por ejemplo 552000 o 552.000.`,
    );
  }
  const valor = lectura.valor;
  if (valor < min || valor > max) {
    throw new ErrorDeValidacion(
      `El campo «${etiqueta}» debe estar entre ${formatearNumero(min)} y ${formatearNumero(max)}.`,
    );
  }
  return valor;
}

/** Entero opcional (vacío → null). */
export function enteroOpcional(
  form: FormData,
  campo: string,
  etiqueta: string,
  rango: { min?: number; max?: number } = {},
): number | null {
  const crudo = String(form.get(campo) ?? "").trim();
  if (!crudo) return null;
  return enteroRequerido(form, campo, etiqueta, rango);
}

/**
 * Precio obligatorio, en pesos enteros.
 *
 * Igual que `enteroRequerido()` pero con mensajes de dinero y, por defecto,
 * **mayor que cero**: una noche a $0 no es una tarifa, es un error de
 * escritura que el sitio cobraría tal cual. Quien sí admite el cero (un
 * adicional de cortesía) lo pide con `min: 0`.
 */
export function precioRequerido(
  form: FormData,
  campo: string,
  etiqueta: string,
  { min = 1, max = 100_000_000 }: { min?: number; max?: number } = {},
): number {
  const lectura = leerEnteroEscrito(String(form.get(campo) ?? ""));
  if (!lectura.ok) {
    if (lectura.problema === "vacio") {
      throw new ErrorDeValidacion(`El campo «${etiqueta}» es obligatorio.`);
    }
    if (lectura.problema === "centavos") {
      throw new ErrorDeValidacion(
        `Escribe el precio sin centavos en «${etiqueta}»: por ejemplo, 552.000.`,
      );
    }
    throw new ErrorDeValidacion(
      `No se entiende el precio de «${etiqueta}». Escríbelo solo con cifras, por ejemplo 552000 o 552.000.`,
    );
  }
  const valor = lectura.valor;
  if (valor < min) {
    throw new ErrorDeValidacion(
      min >= 1
        ? `El precio de «${etiqueta}» tiene que ser mayor que $0.`
        : `El precio de «${etiqueta}» no puede ser negativo.`,
    );
  }
  if (valor > max) {
    throw new ErrorDeValidacion(
      `El precio de «${etiqueta}» no puede pasar de ${formatearCOP(max)}. Revisa que no le sobre un cero.`,
    );
  }
  return valor;
}

/** Precio opcional (vacío → null). Mismas reglas que `precioRequerido()`. */
export function precioOpcional(
  form: FormData,
  campo: string,
  etiqueta: string,
  rango: { min?: number; max?: number } = {},
): number | null {
  const crudo = String(form.get(campo) ?? "").trim();
  if (!crudo) return null;
  return precioRequerido(form, campo, etiqueta, rango);
}

/**
 * Grupo de casillas que envían números (los días de la semana del plan).
 *
 * Devuelve la lista ordenada y sin repetidos, o `null` cuando no se marcó
 * ninguna: en la base, `null` significa «todos los días», no «ninguno». Los
 * valores que no estén dentro del rango se descartan en vez de aceptarlos:
 * llegan del navegador y nada garantiza que sean los que pintamos.
 */
export function enterosDeCasillas(
  form: FormData,
  campo: string,
  { min = 1, max = 7 }: { min?: number; max?: number } = {},
): number[] | null {
  const valores = form
    .getAll(campo)
    .map((valor) => Number(String(valor).trim()))
    .filter(
      (valor) => Number.isInteger(valor) && valor >= min && valor <= max,
    );

  if (valores.length === 0) return null;
  return [...new Set(valores)].sort((a, b) => a - b);
}

/** Casilla de verificación o interruptor. */
export function casilla(form: FormData, campo: string): boolean {
  const valor = form.get(campo);
  return valor === "on" || valor === "true" || valor === "1";
}

/** Fecha ISO obligatoria (el campo oculto de `SelectorFecha`, que muestra dd/mm/aaaa). */
export function fechaRequerida(
  form: FormData,
  campo: string,
  etiqueta: string,
): string {
  const valor = String(form.get(campo) ?? "").trim();
  if (!valor) {
    throw new ErrorDeValidacion(`El campo «${etiqueta}» es obligatorio.`);
  }
  if (!esFechaISO(valor)) {
    throw new ErrorDeValidacion(`El campo «${etiqueta}» no es una fecha válida.`);
  }
  return valor;
}

/** Valor obligatorio dentro de un conjunto cerrado (desplegables). */
export function enumRequerido<T extends string>(
  form: FormData,
  campo: string,
  etiqueta: string,
  permitidos: readonly T[],
): T {
  const valor = String(form.get(campo) ?? "").trim();
  if (!permitidos.includes(valor as T)) {
    throw new ErrorDeValidacion(`El campo «${etiqueta}» tiene un valor no válido.`);
  }
  return valor as T;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuidRequerido(
  form: FormData,
  campo: string,
  etiqueta: string,
): string {
  const valor = String(form.get(campo) ?? "").trim();
  if (!UUID.test(valor)) {
    throw new ErrorDeValidacion(`Debes elegir una opción en «${etiqueta}».`);
  }
  return valor;
}

export function esUuid(valor: string): boolean {
  return UUID.test(valor);
}

/** Correo obligatorio con una comprobación de forma deliberadamente laxa. */
export function emailRequerido(
  form: FormData,
  campo: string,
  etiqueta: string,
): string {
  const valor = textoRequerido(form, campo, etiqueta, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) {
    throw new ErrorDeValidacion(
      `El correo escrito en «${etiqueta}» no tiene un formato válido.`,
    );
  }
  return valor;
}

/**
 * Correo de una cuenta del panel: obligatorio, válido y en minúsculas.
 *
 * Se normaliza a minúsculas porque Supabase Auth guarda el correo así y
 * `Fincavillarreal@…` crearía la sensación de ser otra cuenta distinta.
 */
export function correoDeCuenta(
  form: FormData,
  campo: string,
  etiqueta = "Correo",
): string {
  return emailRequerido(form, campo, etiqueta).toLowerCase();
}

/**
 * Contraseña temporal de una cuenta del panel.
 *
 * El mínimo son {@link LARGO_MINIMO_CONTRASENA} caracteres —más de los 6 que
 * pide Supabase por defecto— porque esta contraseña abre las reservas y los
 * datos de los huéspedes. No se recorta ni se transforma: se comprueba y se
 * pasa tal cual, espacios incluidos, que son legítimos en una frase de paso.
 */
export function contrasenaDeCuenta(
  form: FormData,
  campo: string,
  etiqueta = "Contraseña",
): string {
  const valor = String(form.get(campo) ?? "");
  if (!valor.trim()) {
    throw new ErrorDeValidacion(`El campo «${etiqueta}» es obligatorio.`);
  }
  if (valor.length < LARGO_MINIMO_CONTRASENA) {
    throw new ErrorDeValidacion(
      `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres. La que escribiste tiene ${valor.length}.`,
    );
  }
  if (valor.length > 72) {
    /* Supabase corta en 72 bytes (es el límite de bcrypt): más allá, parte de
       lo que se escribió no contaría y la persona no lo sabría. */
    throw new ErrorDeValidacion(
      "La contraseña no puede pasar de 72 caracteres.",
    );
  }
  return valor;
}

/** Correo opcional. */
export function emailOpcional(form: FormData, campo: string): string | null {
  const valor = textoOpcional(form, campo, 200);
  if (!valor) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) {
    throw new ErrorDeValidacion("El correo no tiene un formato válido.");
  }
  return valor;
}

/**
 * Lista de textos enviada como JSON desde el editor de pastillas.
 * Se acepta también el formato plano (una línea por elemento) por si el
 * navegador no ejecutara JavaScript.
 */
export function listaTexto(form: FormData, campo: string, maximo = 40): string[] {
  const crudo = String(form.get(campo) ?? "").trim();
  if (!crudo) return [];
  if (crudo.startsWith("[")) {
    try {
      const analizado: unknown = JSON.parse(crudo);
      if (!Array.isArray(analizado)) return [];
      return analizado
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, maximo);
    } catch {
      throw new ErrorDeValidacion("No se pudo leer la lista de la pantalla.");
    }
  }
  return crudo
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean)
    .slice(0, maximo);
}

/**
 * Dirección de imagen admitida. Lo normal es una `https://` del bucket
 * `imagenes` de Supabase Storage, pero el cliente puede pegar cualquier URL
 * externa. Se aceptan además rutas absolutas del propio sitio (`/logo.png`).
 */
export function esUrlDeImagen(valor: string): boolean {
  if (valor.startsWith("/")) return !valor.startsWith("//");
  try {
    const url = new URL(valor);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export type EntradaGaleria = { url: string; alt: string };

/** Galería serializada como JSON desde el editor de imágenes. */
export function listaGaleria(form: FormData, campo: string): EntradaGaleria[] {
  const crudo = String(form.get(campo) ?? "").trim();
  if (!crudo) return [];
  let analizado: unknown;
  try {
    analizado = JSON.parse(crudo);
  } catch {
    throw new ErrorDeValidacion("No se pudo leer la galería de imágenes.");
  }
  if (!Array.isArray(analizado)) return [];

  return analizado.flatMap((item): EntradaGaleria[] => {
    if (typeof item !== "object" || item === null) return [];
    const { url, alt } = item as Record<string, unknown>;
    if (typeof url !== "string") return [];
    const limpia = url.trim();
    if (!limpia) return [];
    if (!esUrlDeImagen(limpia)) {
      throw new ErrorDeValidacion(
        `La dirección de imagen «${limpia.slice(0, 60)}» no es válida. Debe empezar por https:// o por /.`,
      );
    }
    return [
      {
        url: limpia,
        alt: typeof alt === "string" ? alt.trim().slice(0, 300) : "",
      },
    ];
  });
}

/**
 * Dirección del mapa embebido del CMS.
 *
 * Se valida aquí, al guardar, además de al pintar: este valor acaba en un
 * `<iframe src>` de `/conocenos` y `/contacto`, y un marco a un sitio ajeno en
 * la página del hotel es una pasarela falsa esperando. Vacío está permitido
 * (la sección se pinta sin mapa). Ver `src/lib/mapa-embebido.ts`.
 */
export function mapaEmbebido(form: FormData, campo: string): string {
  const valor = String(form.get(campo) ?? "").trim();
  if (!valor) return "";
  const direccion = direccionDeMapa(valor);
  if (!direccion) {
    throw new ErrorDeValidacion(
      "La dirección del mapa tiene que ser un mapa embebido de Google Maps " +
        "(de la forma «https://maps.google.com/maps?q=…&output=embed» o " +
        "«https://www.google.com/maps/embed?pb=…»). Cópiala de Google Maps → " +
        "Compartir → Insertar un mapa.",
    );
  }
  return direccion.slice(0, 800);
}

/** Campo de imagen única: cadena vacía si no hay imagen. */
export function urlImagenOpcional(form: FormData, campo: string): string {
  const valor = String(form.get(campo) ?? "").trim();
  if (!valor) return "";
  if (!esUrlDeImagen(valor)) {
    throw new ErrorDeValidacion(
      "La dirección de la imagen debe empezar por https:// o por /.",
    );
  }
  return valor.slice(0, 500);
}

/**
 * Texto libre multilínea → arreglo de párrafos, cortando por línea en blanco.
 * Es la forma en que el panel edita los `parrafos[]` del CMS: una sola caja de
 * texto, como se escribe de verdad, en vez de N campos numerados.
 */
export function aParrafos(valor: string | null): string[] {
  if (!valor) return [];
  return valor
    .split(/\n\s*\n/)
    .map((parrafo) => parrafo.trim().replace(/\s*\n\s*/g, " "))
    .filter(Boolean);
}

/**
 * Igual que `aParrafos()`, pero **conservando los saltos de línea sueltos**.
 *
 * Los documentos legales guardan sus listas de viñetas como un párrafo cuyas
 * líneas empiezan por «- » (ver `src/lib/legal.ts`). `aParrafos()` junta esas
 * líneas en una sola frase corrida —que es lo correcto para la bienvenida de la
 * portada, escrita a mano con el ancho de la caja— y aquí destruiría todas las
 * viñetas de la política de privacidad. Este corta solo por línea en blanco.
 */
export function aParrafosConLineas(valor: string | null): string[] {
  if (!valor) return [];
  return valor
    .split(/\n\s*\n/)
    .map((parrafo) =>
      parrafo
        .split("\n")
        .map((linea) => linea.trim())
        .filter(Boolean)
        .join("\n"),
    )
    .filter(Boolean);
}

/** El camino inverso: párrafos guardados → texto para el textarea. */
export function deParrafos(parrafos: readonly string[] | null | undefined): string {
  return (parrafos ?? []).join("\n\n");
}

/**
 * Lista de objetos (testimonios, preguntas, instalaciones…) enviada como JSON
 * desde un editor repetible del cliente.
 *
 * `campos` enumera las claves de texto que se conservan; cualquier otra se
 * ignora, y un elemento en el que TODOS los campos vengan vacíos se descarta.
 */
export function listaObjetos(
  form: FormData,
  campo: string,
  campos: readonly string[],
  maximo = 60,
  /* Cuánto cabe en CADA campo. Los 4.000 de siempre sobran para una pregunta
     frecuente o el texto de un paso, pero una sección de la política de
     privacidad puede pasarlos: ver `guardarLegalAction`. */
  maximoCampo = 4000,
): Record<string, string>[] {
  const crudo = String(form.get(campo) ?? "").trim();
  if (!crudo) return [];
  let analizado: unknown;
  try {
    analizado = JSON.parse(crudo);
  } catch {
    throw new ErrorDeValidacion("No se pudo leer la lista de la pantalla.");
  }
  if (!Array.isArray(analizado)) return [];

  return analizado
    .flatMap((item): Record<string, string>[] => {
      if (typeof item !== "object" || item === null) return [];
      const origen = item as Record<string, unknown>;
      const salida: Record<string, string> = {};
      for (const clave of campos) {
        const valor = origen[clave];
        salida[clave] =
          typeof valor === "string" ? valor.trim().slice(0, maximoCampo) : "";
      }
      return campos.some((clave) => salida[clave]) ? [salida] : [];
    })
    .slice(0, maximo);
}

/* ---------------------------------------------------------------------------
 * Envoltorio de las Server Actions
 * ------------------------------------------------------------------------- */

/**
 * Envuelve el cuerpo de una Server Action.
 *
 * Devuelve el estado de error en vez de propagar la excepción, SALVO cuando se
 * trata de las señales internas de Next (`redirect()` y `notFound()`), que
 * viajan como excepciones con `digest` y deben seguir su curso. Olvidar esa
 * excepción a la regla es el error clásico: un `redirect()` dentro de un
 * `try/catch` deja de funcionar y la pantalla se queda quieta sin explicación.
 */
export async function ejecutarAccion(
  cuerpo: () => Promise<EstadoAccion>,
): Promise<EstadoAccion> {
  try {
    return await cuerpo();
  } catch (error) {
    if (esSenalDeNext(error)) throw error;
    if (error instanceof ErrorDeValidacion) return estadoError(error.message);
    /* Una cuenta sin permiso recibe el «no» tal cual, sin detalles: el mensaje
       no dice cuántas cuentas hay ni cómo se llaman. */
    if (error instanceof ErrorDePermiso) return estadoError(error.message);
    /* El cupo del Día de Calma lo decide un trigger de la base, y su mensaje
       ya está en español: se muestra tal cual venga por donde venga. */
    if (esErrorDeCupo(error)) return estadoError(error.message);
    /* Un error de la base que llegó sin pasar por `traducirErrorPostgres()`
       (un `throw error` directo): se traduce aquí si es de los conocidos. */
    if (esErrorDeBase(error)) {
      const traducido = traducirErrorPostgres(error);
      if (traducido instanceof ErrorDeValidacion) {
        return estadoError(traducido.message);
      }
    }
    console.error("[panel] error inesperado en una acción:", error);
    return estadoError(
      "Ocurrió un problema al guardar. Vuelve a intentarlo; si sigue pasando, avísale al desarrollador.",
    );
  }
}

/** ¿Es el error del trigger del cupo del Día de Calma? */
function esErrorDeCupo(
  error: unknown,
): error is { code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === CUPO_DIA_LLENO &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

function esSenalDeNext(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    ((error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (error as { digest: string }).digest === "NEXT_NOT_FOUND")
  );
}

/* ---------------------------------------------------------------------------
 * Errores de Postgres traducidos
 * ------------------------------------------------------------------------- */

/** Clave duplicada (slug, nombre de plan, tarifa base repetida). */
export const VIOLACION_UNICA = "23505";
/** Llave foránea: hay filas dependientes. */
export const VIOLACION_LLAVE_FORANEA = "23503";
/** Restricción EXCLUDE: dos rangos de fechas se cruzan. */
export const VIOLACION_EXCLUSION = "23P01";
/** CHECK: la fila no cumple una regla del modelo (tipo de plan, precios…). */
export const VIOLACION_CHECK = "23514";
/**
 * Cupo del Día de Calma agotado.
 *
 * Es un SQLSTATE propio del proyecto, lanzado por el trigger
 * `validar_cupo_dia_de_calma()` (migración 009). Su mensaje YA viene escrito
 * en español y dice cuántos cupos quedan, así que se muestra tal cual.
 */
export const CUPO_DIA_LLENO = "LF010";

/**
 * Texto que no sirve para el tipo de la columna. En el panel es casi siempre
 * un `uuid` mal formado: un enlace recortado o un formulario manipulado.
 */
export const TEXTO_NO_VALIDO = "22P02";

/** Lo mínimo de un error de PostgREST / Postgres. */
export type ErrorDeBase = {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
};

export type ContextoErrores = {
  unico?: string;
  foranea?: string;
  exclusion?: string;
  check?: string;
  /** Para un `uuid` (u otro dato) con forma imposible. */
  formato?: string;
};

/** Lo que se dice cuando el error no es ninguno de los conocidos. */
export const MENSAJE_ERROR_GENERICO =
  "No se pudo completar el cambio. Vuelve a intentarlo; si sigue pasando, avísale al desarrollador.";

/**
 * Traduce al español los errores de Postgres que el usuario del panel puede
 * llegar a provocar. Los que no reconocemos suben como error genérico, que
 * `ejecutarAccion()` registra y convierte en «vuelve a intentarlo».
 *
 * El mensaje original —en inglés, con nombres de tablas y restricciones— NUNCA
 * llega a la pantalla: va al registro del servidor, que es donde le sirve a
 * quien tenga que investigarlo.
 */
export function traducirErrorPostgres(
  error: ErrorDeBase,
  contexto: ContextoErrores = {},
): Error {
  const mensaje = mensajeConocido(error, contexto);
  if (mensaje === null) return new Error(error.message);
  console.warn("[panel] error de la base traducido para la pantalla:", {
    code: error.code,
    message: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
  });
  return new ErrorDeValidacion(mensaje);
}

/**
 * La versión para las acciones que responden con `redirect(…?error=…)` en vez
 * de devolver un estado: siempre un texto en español, nunca el de Postgres.
 * El detalle técnico se registra.
 */
export function mensajeDeErrorDeBase(
  error: ErrorDeBase,
  contexto: ContextoErrores & { generico?: string } = {},
): string {
  const traducido = traducirErrorPostgres(error, contexto);
  if (traducido instanceof ErrorDeValidacion) return traducido.message;
  console.error("[panel] error de la base sin traducir:", {
    code: error.code,
    message: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
  });
  return contexto.generico ?? MENSAJE_ERROR_GENERICO;
}

function mensajeConocido(
  error: ErrorDeBase,
  contexto: ContextoErrores,
): string | null {
  switch (error.code) {
    case CUPO_DIA_LLENO:
      return error.message;
    case VIOLACION_UNICA:
      return (
        contexto.unico ??
        "Ya existe otro registro con ese mismo valor. Cámbialo por uno distinto."
      );
    case VIOLACION_LLAVE_FORANEA:
      return (
        contexto.foranea ??
        "No se puede hacer: hay reservas u otros registros asociados."
      );
    case VIOLACION_EXCLUSION:
      return (
        contexto.exclusion ??
        "Esas fechas se cruzan con otra reserva activa de la misma cabaña."
      );
    case VIOLACION_CHECK:
      return (
        contexto.check ??
        "Alguno de los datos no encaja con el resto: revisa lo que escribiste y vuelve a intentarlo."
      );
    case TEXTO_NO_VALIDO:
      return (
        contexto.formato ??
        "No se encontró lo que intentabas cambiar: el enlace o el formulario llegó incompleto. Recarga la página y vuelve a intentarlo."
      );
    default:
      return null;
  }
}

/** ¿Tiene forma de error de la base (código SQLSTATE y mensaje)? */
function esErrorDeBase(error: unknown): error is ErrorDeBase & { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    !(error instanceof ErrorDeValidacion) &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  );
}
