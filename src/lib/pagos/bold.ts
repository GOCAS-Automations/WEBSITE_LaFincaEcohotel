/**
 * BOLD — la pasarela de pagos de La Finca.
 *
 * ===========================================================================
 * TODO LO QUE HAY AQUÍ SALE DE LA DOCUMENTACIÓN OFICIAL, NO DE SUPONER
 * ===========================================================================
 * Las cuatro páginas que definen esta integración (consultadas el 2026-10-01,
 * «Last updated on September 28, 2026»):
 *
 *   · Botón de pagos, integración manual
 *     https://developers.bold.co/pagos-en-linea/boton-de-pagos/integracion-manual/integracion-manual
 *   · Botón de pagos personalizado (el objeto `BoldCheckout`)
 *     https://developers.bold.co/pagos-en-linea/boton-de-pagos/integracion-manual/integracion-personalizada
 *   · Consulta de transacciones (la API de estado y los estados posibles)
 *     https://developers.bold.co/pagos-en-linea/consulta-de-transacciones
 *   · Webhook (firma `x-bold-signature`, reintentos, idempotencia)
 *     https://developers.bold.co/webhook
 *   · Ambiente de pruebas (tarjetas y limitaciones del sandbox)
 *     https://developers.bold.co/pagos-en-linea/boton-de-pagos/ambiente-pruebas
 *
 * ---------------------------------------------------------------------------
 * LAS DOS LLAVES, Y CUÁL ES SECRETA
 * ---------------------------------------------------------------------------
 * Bold entrega un par por ambiente (pruebas y producción):
 *
 *   · **Llave de identidad** (`BOLD_IDENTITY_KEY`). «Es una llave pública, no
 *     hay problema en que alguien pueda verla ya que sólo sirve para
 *     identificarte». Viaja al navegador en la configuración del checkout y es
 *     la que autentica la API de consulta de estado.
 *   · **Llave secreta** (`BOLD_PRIVATE_KEY`). «Esta llave es privada y no debes
 *     compartirla ni exponerla a la vista de terceros, solo tú debes conocerla
 *     y conservarla **en tu servidor**». Firma el hash de integridad y verifica
 *     la firma de los eventos del webhook.
 *
 * Por eso este módulo es `server-only`: la llave secreta no puede entrar nunca
 * en un bundle de cliente, y la única forma de garantizarlo es que el archivo
 * que la lee rompa la compilación si alguien lo importa desde el navegador.
 *
 * ---------------------------------------------------------------------------
 * DOS FIRMAS DISTINTAS, Y NO SE PARECEN
 * ---------------------------------------------------------------------------
 * Es el detalle que más fácil se confunde, así que queda escrito:
 *
 *   1. **Hash de integridad** (lo que mandamos nosotros al abrir el checkout):
 *      `SHA256("{Identificador}{Monto}{Divisa}{LlaveSecreta}")`, en hexadecimal.
 *      Sin separadores, y «el orden de esta información es crucial».
 *
 *   2. **Firma del webhook** (lo que Bold manda a nuestro endpoint):
 *      `HMAC-SHA256(LlaveSecreta, Base64(cuerpo_crudo))`, en hexadecimal, en la
 *      cabecera `x-bold-signature`. Ojo: se firma el **Base64 del cuerpo**, no
 *      el cuerpo; y es HMAC, no un SHA256 a secas.
 *
 * ---------------------------------------------------------------------------
 * EL MONTO VA EN PESOS ENTEROS, NO EN CENTAVOS
 * ---------------------------------------------------------------------------
 * «amount → Monto a cobrar **sin decimales** (impuestos incluidos si aplica).
 * Por ejemplo, si deseas cobrar $95.000 COP, deberás ingresar: 95000». Y «el
 * mínimo son $1000 COP». Es distinto de Wompi, que pide centavos: por eso aquí
 * NO se usa `aCentavos()` de `utils/formato`.
 *
 * Tampoco se envía `tax`: el hotel no discrimina IVA en el cobro y la
 * documentación es explícita en que los impuestos **no se suman** al `amount`,
 * de modo que declararlos mal cambiaría el reparto, no el total.
 */
import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/* ===========================================================================
 * Constantes del contrato con Bold
 * ======================================================================== */

/** Divisa de todos los cobros del hotel. Bold admite `COP` o `USD`. */
export const MONEDA_BOLD = "COP" as const;

/**
 * Mínimo que acepta Bold. Documentado: «El mínimo son $1000 COP».
 *
 * Importa de verdad: un Día de Calma con un anticipo del 50 % sobre un precio
 * bajo podría quedar por debajo, y Bold devolvería un error en la pasarela —ya
 * con la reserva creada—. Se comprueba **antes** de crear nada.
 */
export const MONTO_MINIMO_BOLD = 1000;

/**
 * Largo máximo de la referencia. Documentado para `order-id`: «Solo se aceptan
 * caracteres alfanuméricos, guiones bajos (_) y medios (-) y un máximo de 60
 * caracteres».
 */
export const LARGO_MAXIMO_REFERENCIA = 60;

/** Caracteres admitidos en la referencia, según la misma frase. */
const REFERENCIA_VALIDA = /^[A-Za-z0-9_-]{1,60}$/;

/** Largo de la descripción: «un mínimo de 2 y un máximo de 100 caracteres». */
const LARGO_MAXIMO_DESCRIPCION = 100;

/** El script del checkout. Es el único host externo que añade esta fase. */
export const SCRIPT_BOLD = "https://checkout.bold.co/library/boldPaymentButton.js";

/** La API de consulta de estado del Botón de pagos. */
const API_VOUCHER = "https://payments.api.bold.co/v2/payment-voucher";

/**
 * Cuánto se espera a la API de Bold antes de rendirse.
 *
 * La página de retorno del huésped la llama en el camino del render: si Bold
 * tarda, es mejor decirle «estamos confirmando» que dejarle una página en
 * blanco. Seis segundos es el techo de lo que una persona espera sin pensar que
 * se rompió.
 */
const TIMEOUT_CONSULTA_MS = 6000;

/* ===========================================================================
 * Configuración por entorno
 * ======================================================================== */

/** Valores de plantilla que se tratan como «sin configurar». */
const MARCADORES = ["REEMPLAZAR", "REPLACE_ME", "TODO", "PENDIENTE"];

function leerEntorno(nombre: string): string | null {
  const valor = process.env[nombre]?.trim();
  if (!valor) return null;
  if (MARCADORES.some((marcador) => valor.toUpperCase().startsWith(marcador))) {
    return null;
  }
  return valor;
}

export type ModoBold = "pruebas" | "produccion";

/**
 * Ambiente de Bold en el que corre esta instancia.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE ESTA VARIABLE, Y POR QUÉ NO SE PUEDE ADIVINAR
 * ---------------------------------------------------------------------------
 * Las llaves de pruebas y las de producción son indistinguibles a la vista: son
 * dos cadenas del mismo largo. Y hay **una diferencia de comportamiento** que
 * obliga a saber en cuál estamos, documentada literalmente en la página del
 * webhook:
 *
 *   «En modo pruebas la firma usa una clave vacía, es decir cuando se quiere
 *   verificar una transacción que se realizó con las llaves de pruebas, el
 *   atributo donde va tu LLAVE_SECRETA no se ingresa, debe ir como un String
 *   vacío. Ejemplo: `$secretKey = '';`»
 *
 * Es decir: en sandbox **cualquiera puede firmar un evento**, porque la llave
 * es la cadena vacía. Eso no es un descuido nuestro, es cómo funciona el
 * sandbox de Bold; y es exactamente el motivo por el que el webhook, además de
 * verificar la firma, **vuelve a consultar el estado contra la API de Bold**
 * antes de dar una reserva por pagada (requisito 5 de
 * `docs/AUDITORIA_SEGURIDAD.md`).
 *
 * ---------------------------------------------------------------------------
 * EL MODO DE PRUEBAS NO PUEDE LLEGAR A PRODUCCIÓN
 * ---------------------------------------------------------------------------
 * Si `BOLD_MODO=pruebas` se quedara puesto en el despliegue real, cualquiera
 * confirmaría reservas gratis con un `curl` firmado con la llave vacía. Por eso
 * **en el despliegue de producción de Vercel el modo se ignora**: allí siempre
 * se usa la llave secreta de verdad. Olvidarse de quitar la variable deja de
 * ser un agujero y pasa a ser, como máximo, un webhook de pruebas rechazado.
 */
export function modoBold(): ModoBold {
  if (process.env.VERCEL_ENV === "production") return "produccion";
  return leerEntorno("BOLD_MODO")?.toLowerCase() === "pruebas"
    ? "pruebas"
    : "produccion";
}

/**
 * El ambiente **declarado** en la configuración, sin el blindaje de `modoBold()`.
 *
 * `modoBold()` miente a propósito en producción: devuelve `produccion` aunque
 * `BOLD_MODO=pruebas` siga puesto, para que un olvido no abra el agujero de la
 * firma con llave vacía. Eso está bien para firmar, y está mal para decidir si
 * **se puede confirmar una reserva**: ahí lo que importa es qué llaves hay de
 * verdad, y la única pista honesta que tenemos es lo que diga la variable.
 *
 * Se usa en el webhook: ambiente de pruebas declarado + `VERCEL_ENV=production`
 * es un sitio real cobrando por una pasarela de juguete, y ninguna reserva puede
 * confirmarse así.
 */
export function ambienteDeclarado(): ModoBold {
  return leerEntorno("BOLD_MODO")?.toLowerCase() === "pruebas"
    ? "pruebas"
    : "produccion";
}

/** ¿Están las dos llaves puestas? Sin ellas el sitio cierra por WhatsApp. */
export function boldConfigurado(): boolean {
  return (
    leerEntorno("BOLD_IDENTITY_KEY") !== null &&
    leerEntorno("BOLD_PRIVATE_KEY") !== null
  );
}

/**
 * EL INTERRUPTOR DEL NEGOCIO: `PAGOS_ACTIVOS`.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO BASTA `boldConfigurado()`
 * ---------------------------------------------------------------------------
 * Tener llaves no significa poder cobrar. Desde que el dominio real apunta a
 * Vercel, el sitio publicado es el del hotel: un huésped de verdad puede entrar
 * a `/reservar` cualquier tarde. Si las llaves puestas son las de **pruebas**,
 * ese huésped pasaría por una pasarela que no cobra nada, y el día que un evento
 * de ese sandbox llegara al webhook la reserva quedaría **confirmada sin pago
 * real**: una cabaña bloqueada por una venta que nunca existió.
 *
 * Por eso el cobro en línea tiene su propio interruptor, separado de las llaves,
 * y **nace apagado**. Con `PAGOS_ACTIVOS` distinto de `1`:
 *
 *   · El sitio público **no muestra el botón de pagar**: el cierre es WhatsApp,
 *     con el mismo resumen y el mismo desglose que antes de la fase de pagos.
 *   · `POST /api/reservar` responde que los pagos no están habilitados, así que
 *     nadie crea reservas `pendiente` por esa puerta.
 *   · El **webhook sigue vivo** —hace falta para probarlo desde el panel de
 *     Bold— pero no confirma nada si el ambiente declarado es de pruebas y
 *     `VERCEL_ENV=production`.
 *
 * Es el **último interruptor que se activa en el lanzamiento**, y se activa solo
 * junto a las llaves de producción.
 */
export function pagosActivos(): boolean {
  return leerEntorno("PAGOS_ACTIVOS") === "1";
}

/**
 * ¿Se puede pagar en línea ahora mismo? Las llaves **y** el interruptor.
 *
 * Es lo que mira el sitio público y el endpoint que crea la reserva. La página
 * de retorno y el webhook NO la usan: los dos tienen que seguir funcionando con
 * los pagos apagados, porque un huésped que pagó mientras el interruptor estaba
 * encendido merece ver su comprobante aunque se apague después.
 */
export function pagoEnLineaDisponible(): boolean {
  return pagosActivos() && boldConfigurado();
}

/** La llave de identidad (pública). Lanza si falta: es un error de despliegue. */
export function llaveDeIdentidad(): string {
  const llave = leerEntorno("BOLD_IDENTITY_KEY");
  if (!llave) {
    throw new Error(
      "Falta BOLD_IDENTITY_KEY. Sin la llave de identidad de Bold no se puede cobrar en línea.",
    );
  }
  return llave;
}

/** La llave secreta. **Jamás** se devuelve al navegador ni se registra. */
function llaveSecreta(): string {
  const llave = leerEntorno("BOLD_PRIVATE_KEY");
  if (!llave) {
    throw new Error(
      "Falta BOLD_PRIVATE_KEY. Sin la llave secreta de Bold no se puede firmar el cobro.",
    );
  }
  return llave;
}

/**
 * La llave con la que Bold firma los eventos que nos manda.
 *
 * En producción, la secreta. En pruebas, la cadena vacía (ver `modoBold`).
 */
function llaveDeFirmaDeEventos(): string {
  return modoBold() === "pruebas" ? "" : llaveSecreta();
}

/* ===========================================================================
 * La referencia de la venta (`order-id`)
 * ======================================================================== */

/**
 * La referencia única que viaja a Bold y vuelve en el webhook.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO ES EL CÓDIGO DE LA RESERVA A SECAS
 * ---------------------------------------------------------------------------
 * `LF-2026-0042` es lo que el huésped lee y dicta por teléfono, y es único en
 * `reservas`. Pero la documentación advierte: «Evita reutilizar identificadores
 * que ya estén en tu base de datos ya que se podría generar un error al intentar
 * abrir la pasarela de pagos de Bold si se usa un identificador asociado a una
 * orden de compra ya pagada», y recomienda «adicionar la fecha en formato
 * timestamp para evitar identificadores duplicados».
 *
 * Eso no es teórico aquí: una reserva puede intentar pagarse dos veces (tarjeta
 * rechazada y segundo intento con otra), y el segundo intento necesita una
 * referencia nueva. Con el sufijo de tiempo, cada intento es su propia fila en
 * `pagos` —`referencia` es `unique`— y el historial queda completo.
 *
 * Se conserva el código **al principio**, para que la referencia siga siendo
 * legible en el panel de Bold y en el extracto del hotel: `LF-2026-0042-…`.
 *
 * El largo: 12 (código) + 1 + 13 (milisegundos) = 26 caracteres, holgadamente
 * por debajo de los 60 del límite.
 */
export function construirReferencia(codigo: string, ahora: Date = new Date()): string {
  /* El código ya es `LF-AAAA-NNNN`, pero se sanea igual: si algún día cambia de
     forma, lo que no quiero es descubrirlo con un error de Bold en producción. */
  const base = codigo
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

  const marca = String(ahora.getTime());
  const espacio = LARGO_MAXIMO_REFERENCIA - marca.length - 1;
  const prefijo = (base || "LF").slice(0, Math.max(1, espacio));

  return `${prefijo}-${marca}`;
}

/** ¿Esta cadena cumple lo que Bold admite como `order-id`? */
export function referenciaValida(referencia: string): boolean {
  return REFERENCIA_VALIDA.test(referencia);
}

/* ===========================================================================
 * Las URLs de retorno
 * ======================================================================== */

/**
 * ⚠ **BOLD SOLO ACEPTA `https://` EN LAS URLS DE RETORNO.** (2026-10-01)
 *
 * Esto costó un «Something went wrong… BTN-001» en la pasarela, y el detalle
 * estaba —como dice su documentación— en la consola del navegador:
 *
 *     Bold Payment Button: 'http://localhost:3000/reservar/confirmacion?ref=…'
 *     is not a valid value for the 'data-redirection-url' attribute.
 *
 * La tabla de atributos de la integración manual lo dice en una línea
 * («`data-redirection-url` → Valid HTTPS URL») y es **literal**: con `http://`
 * el checkout no se abre, devuelve la pantalla de error genérica con el código
 * BTN-001, y ni el monto ni la firma ni las llaves tienen nada que ver.
 *
 * `configuracionCheckout` lo comprueba **antes de abrir nada**, para que el
 * fallo sea un error legible del servidor —con el nombre del atributo y el valor
 * que lo rompe— en vez de una pantalla roja de Bold sin explicación. Quien
 * construye las URLs es `origenParaBold()` (`src/lib/pagos/origen.ts`), que
 * garantiza el `https://`.
 */
export function urlDeRetornoValida(url: string): boolean {
  let parseada: URL;
  try {
    parseada = new URL(url);
  } catch {
    return false;
  }
  return parseada.protocol === "https:";
}

/* ===========================================================================
 * Firma 1 — el hash de integridad del checkout
 * ======================================================================== */

/**
 * `SHA256("{Identificador}{Monto}{Divisa}{LlaveSecreta}")` en hexadecimal.
 *
 * Función **pura**: la llave entra por parámetro para poder probarla con el
 * ejemplo exacto de la documentación (`inv0334` · `39400` · `COP` ·
 * `kgfq2nN0o52XqnuXZWIN2F`). La que lee el entorno es `firmaDeIntegridad`.
 *
 * El monto se concatena como entero sin separadores ni decimales, igual que se
 * manda en `amount`: cualquier otra representación produce un hash que Bold
 * rechaza con un error genérico, y eso es media hora de depuración a ciegas.
 */
export function calcularFirmaDeIntegridad(
  referencia: string,
  monto: number,
  moneda: string,
  secreto: string,
): string {
  const cadena = `${referencia}${Math.round(monto)}${moneda}${secreto}`;
  return createHash("sha256").update(cadena, "utf8").digest("hex");
}

/** La firma de integridad de esta venta, con la llave secreta del entorno. */
export function firmaDeIntegridad(
  referencia: string,
  monto: number,
  moneda: string = MONEDA_BOLD,
): string {
  return calcularFirmaDeIntegridad(referencia, monto, moneda, llaveSecreta());
}

/* ===========================================================================
 * Firma 2 — la de los eventos que llegan al webhook
 * ======================================================================== */

/**
 * `HMAC-SHA256(llave, Base64(cuerpo))` en hexadecimal.
 *
 * Lo que se firma es el **Base64 del cuerpo crudo**, tal como lo describe la
 * documentación y como hacen sus cinco ejemplos (Python, Go, Nest, Node, PHP):
 *
 *     encoded = base64(body)
 *     hashed  = hmac_sha256(secret_key, encoded).hex()
 *
 * «Cuerpo crudo» es literal: el texto exacto que llegó, sin volver a serializar
 * el JSON. Un `JSON.parse` + `JSON.stringify` cambia espacios y orden de claves
 * y la firma deja de coincidir.
 */
export function calcularFirmaDeEvento(cuerpoCrudo: string, llave: string): string {
  const base64 = Buffer.from(cuerpoCrudo, "utf8").toString("base64");
  return createHmac("sha256", llave).update(base64).digest("hex");
}

/**
 * ¿Este evento viene de Bold?
 *
 * Comparación en **tiempo constante**: comparar hashes con `===` filtra, por el
 * tiempo que tarda en fallar, cuántos caracteres iniciales acertó quien lo
 * intenta. `timingSafeEqual` exige longitudes iguales, así que se comprueba
 * antes y se devuelve `false` sin comparar.
 */
export function verificarFirmaDeEvento(
  cuerpoCrudo: string,
  firmaRecibida: string | null | undefined,
  llave: string,
): boolean {
  if (!firmaRecibida) return false;

  const esperada = calcularFirmaDeEvento(cuerpoCrudo, llave);
  const a = Buffer.from(esperada, "utf8");
  const b = Buffer.from(firmaRecibida.trim(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Lo mismo, con la llave que corresponde al ambiente (ver `modoBold`). */
export function firmaDeEventoValida(
  cuerpoCrudo: string,
  firmaRecibida: string | null | undefined,
): boolean {
  return verificarFirmaDeEvento(cuerpoCrudo, firmaRecibida, llaveDeFirmaDeEventos());
}

/** Nombre de la cabecera que trae la firma. Documentado. */
export const CABECERA_FIRMA_BOLD = "x-bold-signature";

/* ===========================================================================
 * Los estados de una transacción
 * ======================================================================== */

/**
 * Estados posibles, copiados de «Consulta de transacciones».
 *
 *   En proceso:  `PROCESSING`, `PENDING` (solo PSE).
 *   Finales:     `APPROVED`, `REJECTED`, `FAILED`, `VOIDED`.
 *   Y además:    `NO_TRANSACTION_FOUND` cuando la venta no tiene ningún intento
 *                de pago todavía.
 *
 * Se añade `DESCONOCIDO` para lo que no esté en esta lista: un estado nuevo de
 * Bold no puede hacer que el sitio lo trate como aprobado.
 */
export const ESTADOS_BOLD = [
  "NO_TRANSACTION_FOUND",
  "PROCESSING",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "FAILED",
  "VOIDED",
  "DESCONOCIDO",
] as const;

export type EstadoBold = (typeof ESTADOS_BOLD)[number];

export function normalizarEstadoBold(valor: unknown): EstadoBold {
  const texto = String(valor ?? "").trim().toUpperCase();
  return (ESTADOS_BOLD as readonly string[]).includes(texto)
    ? (texto as EstadoBold)
    : "DESCONOCIDO";
}

/** Aprobado es aprobado, y nada más es aprobado. */
export function esAprobado(estado: EstadoBold): boolean {
  return estado === "APPROVED";
}

/** Rechazado, fallido o anulado: no se va a cobrar. */
export function esRechazado(estado: EstadoBold): boolean {
  return estado === "REJECTED" || estado === "FAILED" || estado === "VOIDED";
}

/** Un estado del que ya no se sale: no tiene sentido volver a preguntar. */
export function esEstadoFinal(estado: EstadoBold): boolean {
  return esAprobado(estado) || esRechazado(estado);
}

/** Todavía se está decidiendo (o Bold aún no ve la transacción). */
export function estaEnProceso(estado: EstadoBold): boolean {
  return (
    estado === "PROCESSING" ||
    estado === "PENDING" ||
    estado === "NO_TRANSACTION_FOUND"
  );
}

/**
 * Cómo se le cuenta al huésped y al equipo del hotel.
 *
 * En español claro, sin la palabra «transacción»: el panel lo lee gente que no
 * es técnica, y el huésped todavía menos.
 */
export const ETIQUETA_ESTADO_BOLD: Record<EstadoBold, string> = {
  NO_TRANSACTION_FOUND: "Sin intento de pago",
  PROCESSING: "Pago en proceso",
  PENDING: "Pago pendiente de confirmación",
  APPROVED: "Pago aprobado",
  REJECTED: "Pago rechazado",
  FAILED: "Pago fallido",
  VOIDED: "Pago anulado",
  DESCONOCIDO: "Estado desconocido",
};

/* ===========================================================================
 * Métodos de pago
 * ======================================================================== */

/**
 * Los nombres que devuelve Bold, traducidos.
 *
 * El webhook manda `payment_method` con valores de la lista documentada
 * (`CARD`, `CARD_WEB`, `NEQUI`, `BOTON_BANCOLOMBIA`, `PSE`, `QR`); la API de
 * consulta devuelve además `CREDIT_CARD` en su ejemplo. Lo que no esté en el
 * mapa se devuelve tal cual: es mejor que el panel muestre `FOO_BAR` que un
 * «Otro» que no dice nada.
 */
const METODOS: Record<string, string> = {
  CARD: "Tarjeta",
  CARD_WEB: "Tarjeta",
  CREDIT_CARD: "Tarjeta de crédito",
  DEBIT_CARD: "Tarjeta débito",
  BOLD_TAP: "Tarjeta (datáfono móvil)",
  NEQUI: "Nequi",
  BOTON_BANCOLOMBIA: "Botón Bancolombia",
  PSE: "PSE",
  QR: "QR Bold",
};

export function etiquetaMetodoPago(metodo: string | null | undefined): string | null {
  if (!metodo) return null;
  const clave = metodo.trim().toUpperCase();
  return METODOS[clave] ?? metodo.trim();
}

/* ===========================================================================
 * La configuración del checkout que viaja al navegador
 * ======================================================================== */

/**
 * Lo que el navegador le pasa al constructor `BoldCheckout`.
 *
 * Nombres en **camelCase**, como exige la integración personalizada («en este
 * caso sin embargo se usa la sintaxis camelCase para cada uno de los datos»).
 * `amount` es una cadena en todos los ejemplos de Bold, así que cadena va.
 *
 * **Aquí NO hay nada secreto.** `apiKey` es la llave de identidad, que la
 * documentación declara pública; `integritySignature` es un hash que ya salió
 * calculado del servidor. La llave secreta no aparece ni puede aparecer: este
 * objeto se serializa en una respuesta JSON.
 */
export type ConfiguracionCheckoutBold = {
  orderId: string;
  currency: typeof MONEDA_BOLD;
  /** Pesos enteros, en texto. */
  amount: string;
  apiKey: string;
  integritySignature: string;
  description: string;
  redirectionUrl: string;
  originUrl: string;
  /** Nanosegundos desde la época Unix. Ver abajo. */
  expirationDate?: number;
  /** JSON en texto, como pide la documentación. */
  customerData?: string;
};

export type EntradaCheckout = {
  referencia: string;
  /** Anticipo a cobrar, en **pesos enteros**. */
  monto: number;
  /** Entre 2 y 100 caracteres, sin URLs. */
  descripcion: string;
  /** A dónde vuelve el huésped tras pagar. Absoluta. */
  urlRetorno: string;
  /** A dónde vuelve si cancela o abandona. Absoluta. */
  urlAbandono: string;
  /** Cuándo caduca el pago. Se usa el vencimiento del hold de la reserva. */
  expiraEn?: Date | null;
  huesped?: {
    nombre?: string | null;
    correo?: string | null;
    telefono?: string | null;
  };
};

/**
 * La descripción que ve el huésped en la pasarela, recortada a lo que Bold
 * admite. «Si se incluye, deberá tener un mínimo de 2 y un máximo de 100
 * caracteres. (…) No puede contener ninguna URL».
 */
export function descripcionParaBold(texto: string): string {
  const limpio = texto
    /* Una URL en la descripción hace que Bold rechace la venta. Se quita
       cualquier cosa que lo parezca antes de que llegue allí. */
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/www\.\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const recortado = limpio.slice(0, LARGO_MAXIMO_DESCRIPCION).trim();
  return recortado.length >= 2 ? recortado : "Reserva en La Finca Eco Hotel";
}

/**
 * Arma la configuración del checkout. **La firma se calcula aquí, en el
 * servidor, y es el único sitio donde se toca la llave secreta.**
 *
 * Lanza si el monto no llega al mínimo de Bold o si la referencia no cumple su
 * formato: las dos cosas producirían un error opaco en la pasarela con la
 * reserva ya creada, y es mucho mejor fallar antes de escribir nada.
 */
export function configuracionCheckout(
  entrada: EntradaCheckout,
): ConfiguracionCheckoutBold {
  const monto = Math.round(entrada.monto);

  if (!referenciaValida(entrada.referencia)) {
    throw new Error(
      `La referencia «${entrada.referencia}» no cumple el formato de Bold (alfanumérico, «-» y «_», máximo ${LARGO_MAXIMO_REFERENCIA}).`,
    );
  }
  if (!Number.isFinite(monto) || monto < MONTO_MINIMO_BOLD) {
    throw new Error(
      `Bold no admite cobros por debajo de $${MONTO_MINIMO_BOLD} COP y este sería de $${monto}.`,
    );
  }

  /* Las dos URLs de retorno, con `https://` obligatorio. Ver
     `urlDeRetornoValida`: esto es exactamente el BTN-001 del 2026-10-01. */
  if (!urlDeRetornoValida(entrada.urlRetorno)) {
    throw new Error(
      `Bold rechaza «${entrada.urlRetorno}» como redirectionUrl: tiene que ser una URL absoluta con https://. Una dirección http (localhost, por ejemplo) produce el error BTN-001 en la pasarela.`,
    );
  }
  if (!urlDeRetornoValida(entrada.urlAbandono)) {
    throw new Error(
      `Bold rechaza «${entrada.urlAbandono}» como originUrl: tiene que ser una URL absoluta con https://. Una dirección http (localhost, por ejemplo) produce el error BTN-001 en la pasarela.`,
    );
  }

  const configuracion: ConfiguracionCheckoutBold = {
    orderId: entrada.referencia,
    currency: MONEDA_BOLD,
    amount: String(monto),
    apiKey: llaveDeIdentidad(),
    integritySignature: firmaDeIntegridad(entrada.referencia, monto),
    description: descripcionParaBold(entrada.descripcion),
    redirectionUrl: entrada.urlRetorno,
    originUrl: entrada.urlAbandono,
  };

  /*
    LA EXPIRACIÓN DEL PAGO VA EN **NANOSEGUNDOS**.

    «expiration-date → La fecha y hora en la que el pago expirará, representada
    en nanosegundos desde la época Unix». Su ejemplo (`1719242727607215713`)
    tiene 19 dígitos, que es lo que da `milisegundos × 1e6`. El mismo factor
    aparece en el ejemplo del objeto `BoldCheckout`: `Date.now() * 1e6`.

    Se ata al vencimiento del hold de la reserva: si las fechas dejan de estar
    apartadas a los 30 minutos, el checkout no puede seguir cobrable 24 horas
    (que es lo que Bold da por defecto). Pagar un hold ya vencido sería cobrar
    una noche que ya se le ofreció a otra persona.

    `Number` aguanta 1e19 sin perder precisión a nivel de minuto —el error es de
    unos pocos milisegundos— y el campo es numérico en el ejemplo oficial, no
    una cadena, así que no se puede usar `BigInt`.
  */
  if (entrada.expiraEn) {
    configuracion.expirationDate = entrada.expiraEn.getTime() * 1e6;
  }

  /*
    LOS DATOS DEL HUÉSPED SE PRECARGAN, Y SOLO ESO.
    «serán precargados en el formulario de pago de nuestra pasarela de pagos,
    facilitando al comprador no volver a digitar su información». No se envía
    documento de identidad: el sitio público no lo pide (B-3 de la auditoría) y
    aquí tampoco hace falta.
  */
  const datos: Record<string, string> = {};
  if (entrada.huesped?.correo) datos.email = entrada.huesped.correo;
  if (entrada.huesped?.nombre) datos.fullName = entrada.huesped.nombre;
  if (entrada.huesped?.telefono) {
    /* Bold quiere el celular y el indicativo aparte. Los números del hotel son
       colombianos; si alguien escribe `+57 …`, el indicativo se separa. */
    const soloDigitos = entrada.huesped.telefono.replace(/\D/g, "");
    const nacional = soloDigitos.replace(/^57(?=\d{10}$)/, "");
    if (nacional.length >= 7) {
      datos.phone = nacional;
      datos.dialCode = "+57";
    }
  }
  if (Object.keys(datos).length > 0) {
    configuracion.customerData = JSON.stringify(datos);
  }

  return configuracion;
}

/* ===========================================================================
 * El evento del webhook
 * ======================================================================== */

/**
 * Los cuatro tipos de evento, literales de la documentación:
 * `SALE_APPROVED`, `SALE_REJECTED`, `VOID_APPROVED`, `VOID_REJECTED`.
 */
export const TIPOS_EVENTO_BOLD = [
  "SALE_APPROVED",
  "SALE_REJECTED",
  "VOID_APPROVED",
  "VOID_REJECTED",
] as const;

export type TipoEventoBold = (typeof TIPOS_EVENTO_BOLD)[number];

/** El evento, con solo lo que este sitio necesita y ya validado. */
export type EventoBold = {
  /** `id` de la notificación: UUID único por notificación enviada. */
  id: string;
  tipo: TipoEventoBold;
  /** `subject` / `data.payment_id`: el id que Bold le da a la transacción. */
  transaccionId: string | null;
  /**
   * `data.metadata.reference`: **nuestra** referencia.
   *
   * Para el Botón de pagos la documentación lo dice exactamente así: «Botón de
   * pagos → valor del atributo `order-id`, si no se define se toma el timestamp
   * del momento de la transacción». Nosotros siempre lo definimos, así que esto
   * es la referencia que escribimos en `pagos`.
   */
  referencia: string | null;
  /** `data.amount.total`, en pesos enteros. */
  monto: number | null;
  moneda: string | null;
  metodo: string | null;
  correoPagador: string | null;
  /** `data.integration`: para el Botón de pagos, `BUTTON`. */
  integracion: string | null;
};

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : null;
}

/**
 * Lee el cuerpo del evento sin confiar en nada.
 *
 * Devuelve `null` si no es un evento de Bold reconocible. Nunca lanza: el
 * webhook tiene que poder responder a un cuerpo basura sin caerse, porque un
 * 500 hace que Bold reintente cinco veces un evento que nunca va a servir.
 */
export function leerEventoBold(cuerpo: unknown): EventoBold | null {
  if (typeof cuerpo !== "object" || cuerpo === null) return null;
  const raiz = cuerpo as Record<string, unknown>;

  const tipo = texto(raiz.type);
  if (!tipo || !(TIPOS_EVENTO_BOLD as readonly string[]).includes(tipo)) {
    return null;
  }

  const datos =
    typeof raiz.data === "object" && raiz.data !== null
      ? (raiz.data as Record<string, unknown>)
      : {};

  const importe =
    typeof datos.amount === "object" && datos.amount !== null
      ? (datos.amount as Record<string, unknown>)
      : {};

  const metadatos =
    typeof datos.metadata === "object" && datos.metadata !== null
      ? (datos.metadata as Record<string, unknown>)
      : {};

  const total = Number(importe.total);

  return {
    /* Sin `id` no se puede descartar un reenvío por identificador, pero el
       evento sigue siendo procesable: la idempotencia real la da la transición
       de estado en `pagos` (ver el webhook). */
    id: texto(raiz.id) ?? "",
    tipo: tipo as TipoEventoBold,
    transaccionId: texto(datos.payment_id) ?? texto(raiz.subject),
    referencia: texto(metadatos.reference),
    monto: Number.isFinite(total) ? Math.round(total) : null,
    moneda: texto(importe.currency),
    metodo: texto(datos.payment_method),
    correoPagador: texto(datos.payer_email),
    integracion: texto(datos.integration),
  };
}

/** El estado que implica cada tipo de evento. */
export function estadoDeEvento(tipo: TipoEventoBold): EstadoBold {
  switch (tipo) {
    case "SALE_APPROVED":
      return "APPROVED";
    case "SALE_REJECTED":
      return "REJECTED";
    case "VOID_APPROVED":
      return "VOIDED";
    case "VOID_REJECTED":
      /* La anulación falló: el cobro sigue como estaba, o sea aprobado. No se
         toca la reserva por esto; se guarda el evento y se responde 200. */
      return "APPROVED";
  }
}

/* ===========================================================================
 * Consulta activa del estado
 * ======================================================================== */

export type ConsultaEstado = {
  estado: EstadoBold;
  transaccionId: string | null;
  /** Total de la transacción en pesos, si Bold lo devuelve. */
  total: number | null;
  metodo: string | null;
  correoPagador: string | null;
  fecha: string | null;
  /** `true` cuando no se pudo preguntar (red, timeout, 5xx de Bold). */
  fallo: boolean;
};

const SIN_RESPUESTA: ConsultaEstado = {
  estado: "DESCONOCIDO",
  transaccionId: null,
  total: null,
  metodo: null,
  correoPagador: null,
  fecha: null,
  fallo: true,
};

/**
 * Pregunta a Bold en qué estado está una venta, por **nuestra** referencia.
 *
 *     GET https://payments.api.bold.co/v2/payment-voucher/<referencia>
 *     Authorization: x-api-key <llave_de_identidad>
 *
 * Tres cosas que la documentación avisa y que cambian cómo se usa esto:
 *
 *   1. «La consulta con el identificador_único_de_la_venta **solo aplica para
 *      las integraciones con nuestro Botón de pagos** y no para Link de pago».
 *      Es justo la integración de este sitio.
 *   2. «La transacción aparecerá disponible para consulta **en hasta 10
 *      minutos** y durante las próximas 24 horas». Así que un
 *      `NO_TRANSACTION_FOUND` recién vuelto del checkout no significa «no pagó»:
 *      significa «todavía no se sabe». La página de retorno lo dice así.
 *   3. «La llave de identidad, **no** la secreta. Si es incorrecta o no se anexa
 *      al header, la petición será rechazada con 401».
 *
 * Observado contra el ambiente de pruebas el 2026-10-01: una referencia que no
 * existe devuelve **404** con `{"payload":{},"errors":[{"message":"La
 * referencia … no fue encontrada"}]}`, no un 200 con
 * `payment_status: NO_TRANSACTION_FOUND`. Se tratan los dos casos igual.
 *
 * No lanza nunca: devuelve `fallo: true`. Quien llama (la página de retorno y
 * el webhook) tiene que poder seguir sin Bold.
 */
export async function consultarEstadoPago(
  referencia: string,
): Promise<ConsultaEstado> {
  if (!boldConfigurado()) return SIN_RESPUESTA;

  const control = AbortSignal.timeout(TIMEOUT_CONSULTA_MS);

  try {
    const respuesta = await fetch(
      `${API_VOUCHER}/${encodeURIComponent(referencia)}`,
      {
        headers: {
          Authorization: `x-api-key ${llaveDeIdentidad()}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: control,
      },
    );

    /* 404 = la referencia no existe todavía para Bold. Es el estado normal de
       una venta recién abierta: «hasta 10 minutos» para aparecer. */
    if (respuesta.status === 404) {
      return { ...SIN_RESPUESTA, estado: "NO_TRANSACTION_FOUND", fallo: false };
    }

    if (!respuesta.ok) {
      console.error(
        `[bold] la consulta de estado de ${referencia} respondió ${respuesta.status}`,
      );
      return SIN_RESPUESTA;
    }

    const cuerpo: unknown = await respuesta.json();
    return leerConsultaEstado(cuerpo);
  } catch (error) {
    console.error(
      `[bold] no se pudo consultar el estado de ${referencia}:`,
      error instanceof Error ? error.message : error,
    );
    return SIN_RESPUESTA;
  }
}

/**
 * Normaliza la respuesta de la API de estado.
 *
 * Se admiten **dos formas** porque Bold usa las dos: el ejemplo documentado es
 * plano (`{ "payment_status": "APPROVED", … }`) y el error observado viene
 * envuelto (`{ "payload": { … }, "errors": [ … ] }`). Leer solo una de las dos
 * dejaría la página de retorno diciendo «desconocido» en el caso bueno.
 *
 * Exportada para poder probarla sin red.
 */
export function leerConsultaEstado(cuerpo: unknown): ConsultaEstado {
  if (typeof cuerpo !== "object" || cuerpo === null) return SIN_RESPUESTA;

  const raiz = cuerpo as Record<string, unknown>;
  const envoltura =
    typeof raiz.payload === "object" && raiz.payload !== null
      ? (raiz.payload as Record<string, unknown>)
      : null;

  /* Si viene envuelto y el `payload` trae el estado, manda el `payload`. */
  const datos =
    envoltura && envoltura.payment_status !== undefined ? envoltura : raiz;

  if (datos.payment_status === undefined) return SIN_RESPUESTA;

  const total = Number(datos.total);

  return {
    estado: normalizarEstadoBold(datos.payment_status),
    transaccionId: texto(datos.transaction_id),
    total: Number.isFinite(total) ? Math.round(total) : null,
    metodo: texto(datos.payment_method),
    correoPagador: texto(datos.payer_email),
    fecha: texto(datos.transaction_date),
    fallo: false,
  };
}
