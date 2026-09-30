/**
 * Envío de los correos transaccionales con Resend.
 *
 * ---------------------------------------------------------------------------
 * ESTADO: LISTO PERO DORMIDO
 * ---------------------------------------------------------------------------
 * Todavía no hay cuenta de Resend, ni dominio verificado, ni `RESEND_API_KEY`.
 * Mientras esa variable no exista, las funciones de envío **no hacen nada y no
 * fallan**: registran en consola qué habrían enviado y devuelven
 * `{ enviado: false, motivo: "no_configurado" }`.
 *
 * Esa decisión es deliberada y no es pereza. Estas funciones se van a llamar
 * **desde el webhook de la pasarela de pagos**, donde un `throw` sería
 * desastroso: el huésped ya pagó y la reserva ya está creada, así que un fallo
 * al enviar un correo NUNCA puede tumbar la transacción ni impedir que la
 * reserva se guarde o se confirme. Quien llame decide qué hacer con el
 * resultado; ignorarlo es una respuesta válida y es lo que hace el panel.
 *
 * **Ninguna función de este módulo lanza.** Si alguna vez hubiera que cambiar
 * eso, hay que revisar antes cada punto de llamada.
 *
 * ---------------------------------------------------------------------------
 * PARA ACTIVARLO (cuando el hotel tenga correo y dominio)
 * ---------------------------------------------------------------------------
 *   1. Crear la cuenta en Resend y **verificar `lafincaecohotel.com`** con los
 *      registros TXT/DKIM en Hostinger. Sin dominio verificado, un correo
 *      enviado desde `@lafincaecohotel.com` se marca como spam o se rechaza.
 *   2. Poner `RESEND_API_KEY`, `EMAIL_FROM` y `EMAIL_NOTIFY_TO` en Vercel y en
 *      `.env.local` (ver `.env.example` y `docs/DESPLIEGUE_VERCEL.md`).
 *   3. No hay que tocar código: el remitente y los destinatarios internos se
 *      leen del entorno.
 *
 * El paquete `resend` se importa **dinámicamente**, ya dentro de la función que
 * envía: importar este archivo sin la clave no carga nada de red y no revienta.
 */
import "server-only";

import {
  renderAvisoAdministracion,
  renderReservaConfirmada,
  renderSolicitudRecibida,
  type ContactoCorreo,
  type CorreoRenderizado,
  type DatosCorreo,
} from "./plantillas";
import { getContacto } from "../contenido";
import { SITIO, medio } from "../sitio";

/* ===========================================================================
 * Configuración
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

/**
 * Remitente por defecto. Tiene que pertenecer a un dominio verificado en
 * Resend: enviar desde un dominio ajeno hace que el correo caiga en spam.
 *
 * `reservas@` y no `no-reply@`: el huésped va a responder a este correo con
 * dudas sobre su reserva, y un buzón que no lee nadie es una queja esperando.
 */
const REMITENTE_POR_DEFECTO = "La Finca Eco Hotel <reservas@lafincaecohotel.com>";

/** ¿Está Resend configurado en este entorno? */
export function correosConfigurados(): boolean {
  return leerEntorno("RESEND_API_KEY") !== null;
}

/**
 * Destinatarios del aviso interno. `EMAIL_NOTIFY_TO` admite **varios correos
 * separados por coma**: el hotel querrá avisar a la dueña y a quien lleve las
 * reservas, y pedirles crear una lista de distribución para eso es pedir de más.
 */
export function destinatariosInternos(): string[] {
  const crudo = leerEntorno("EMAIL_NOTIFY_TO");
  if (!crudo) return [];
  return crudo
    .split(",")
    .map((correo) => correo.trim())
    .filter((correo) => correo.includes("@"));
}

/* ===========================================================================
 * Resultado
 * ======================================================================== */

export type ResultadoCorreo =
  /** Entregado a Resend. `id` es el identificador del envío. */
  | { enviado: true; id: string | null }
  /**
   * No se envió, y no pasa nada:
   *   · `no_configurado`   — falta `RESEND_API_KEY` (la fase actual).
   *   · `sin_destinatario` — la reserva no trae correo, o falta `EMAIL_NOTIFY_TO`.
   *   · `fallo`            — Resend respondió con error, o la red falló.
   */
  | {
      enviado: false;
      motivo: "no_configurado" | "sin_destinatario" | "fallo";
      mensaje: string;
    };

/* ===========================================================================
 * Contacto del hotel
 * ======================================================================== */

/**
 * Los datos de contacto que se pintan en el correo.
 *
 * Se leen del CMS (`sitio.contacto`) para que un cambio de número de WhatsApp
 * no obligue a desplegar, y si la base no responde se cae al respaldo en
 * código. Nunca lanza: un correo con el teléfono de respaldo es infinitamente
 * mejor que un correo que no sale.
 */
async function contactoDelCorreo(): Promise<ContactoCorreo> {
  const respaldo: ContactoCorreo = {
    whatsapp: SITIO.contacto.whatsapp,
    whatsappVisible: SITIO.contacto.whatsappVisible,
    correo: SITIO.contacto.correo,
    direccionCompleta: SITIO.contacto.direccionCompleta,
    rnt: SITIO.rnt,
    comoLlegar: "",
  };

  try {
    const contacto = await getContacto();
    return {
      whatsapp: contacto.whatsapp || respaldo.whatsapp,
      whatsappVisible: contacto.whatsapp_visible || respaldo.whatsappVisible,
      correo: contacto.correo || respaldo.correo,
      direccionCompleta: contacto.direccion_completa || respaldo.direccionCompleta,
      rnt: contacto.rnt || respaldo.rnt,
      comoLlegar: contacto.mapa_como_llegar || "",
    };
  } catch (error) {
    console.warn(
      "[correos] no se pudo leer `sitio.contacto`; se usa el respaldo en código:",
      error instanceof Error ? error.message : error,
    );
    return respaldo;
  }
}

/**
 * Contexto común de las tres plantillas.
 *
 * El logo va **en PNG y desde el bucket**, con URL absoluta: un `src` relativo
 * no existe para un cliente de correo, y el WebP del sitio no lo pinta Outlook
 * de escritorio.
 */
async function contexto(reserva: DatosCorreo) {
  return {
    reserva,
    contacto: await contactoDelCorreo(),
    urlSitio: SITIO.url,
    urlLogo: medio("sitio/marca/icono-correo.png"),
  };
}

/* ===========================================================================
 * Envío
 * ======================================================================== */

/**
 * Único punto que habla con Resend.
 *
 * El cliente se instancia aquí dentro —y no al cargar el módulo— para que
 * importar este archivo sin la clave no reviente nada: en la fase actual, el
 * módulo se importa y nunca se llega a la importación dinámica.
 */
async function entregar(
  destinatarios: string[],
  correo: CorreoRenderizado,
  etiqueta: string,
): Promise<ResultadoCorreo> {
  const clave = leerEntorno("RESEND_API_KEY");

  if (!clave) {
    /*
      MODO DORMIDO. Se registra con detalle a propósito: es la única forma de
      comprobar, antes de que exista la cuenta de Resend, que el correo se
      habría disparado en el momento correcto y al destinatario correcto.
    */
    console.info(
      `[correos] ${etiqueta}: RESEND_API_KEY no está configurada, no se envía nada.\n` +
        `          Destinatario previsto: ${destinatarios.join(", ")}\n` +
        `          Asunto: "${correo.asunto}"`,
    );
    return {
      enviado: false,
      motivo: "no_configurado",
      mensaje: "RESEND_API_KEY no está configurada.",
    };
  }

  try {
    /* Importación dinámica: el paquete solo se carga si de verdad se va a usar. */
    const { Resend } = await import("resend");
    const resend = new Resend(clave);

    const { data, error } = await resend.emails.send({
      from: leerEntorno("EMAIL_FROM") ?? REMITENTE_POR_DEFECTO,
      to: destinatarios,
      subject: correo.asunto,
      html: correo.html,
      text: correo.texto,
    });

    if (error) {
      console.error(`[correos] ${etiqueta}: Resend devolvió error:`, error.message);
      return { enviado: false, motivo: "fallo", mensaje: error.message };
    }

    console.info(
      `[correos] ${etiqueta}: enviado a ${destinatarios.join(", ")} (id ${data?.id ?? "?"}).`,
    );
    return { enviado: true, id: data?.id ?? null };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    console.error(`[correos] ${etiqueta}: fallo al enviar:`, mensaje);
    return { enviado: false, motivo: "fallo", mensaje };
  }
}

/** El correo del huésped, si lo hay. Muchas reservas del panel no lo traen. */
function correoDelHuesped(reserva: DatosCorreo): string | null {
  const correo = reserva.huespedEmail?.trim();
  return correo && correo.includes("@") ? correo : null;
}

/**
 * «Recibimos tu solicitud» — al huésped, en cuanto se crea la solicitud.
 *
 * Es el primero de los dos correos que recibe: lleva su código, el resumen, el
 * anticipo y el aviso de que las fechas están apartadas mientras paga. **No
 * dice que la reserva esté confirmada**, porque no lo está.
 */
export async function enviarSolicitudRecibida(
  reserva: DatosCorreo,
): Promise<ResultadoCorreo> {
  const destino = correoDelHuesped(reserva);
  if (!destino) {
    console.info(
      `[correos] solicitud recibida: la reserva ${reserva.codigo} no trae correo del huésped.`,
    );
    return {
      enviado: false,
      motivo: "sin_destinatario",
      mensaje: "La reserva no tiene correo del huésped.",
    };
  }

  return entregar(
    [destino],
    renderSolicitudRecibida(await contexto(reserva)),
    "solicitud recibida",
  );
}

/**
 * Confirmación definitiva al huésped.
 *
 * Sale al confirmar desde el panel y, cuando entre la pasarela, al aprobarse el
 * pago. Si la reserva no trae correo —las que apunta el equipo a mano a veces no
 * lo tienen— no se envía nada y se dice por qué.
 */
export async function enviarReservaConfirmada(
  reserva: DatosCorreo,
): Promise<ResultadoCorreo> {
  const destino = correoDelHuesped(reserva);
  if (!destino) {
    console.info(
      `[correos] confirmación: la reserva ${reserva.codigo} no trae correo del huésped.`,
    );
    return {
      enviado: false,
      motivo: "sin_destinatario",
      mensaje: "La reserva no tiene correo del huésped.",
    };
  }

  return entregar(
    [destino],
    renderReservaConfirmada(await contexto(reserva)),
    "reserva confirmada",
  );
}

/**
 * Aviso interno a la administración del hotel.
 *
 * Los destinatarios salen de `EMAIL_NOTIFY_TO` (admite varios separados por
 * coma). Sin esa variable no hay a quién avisar y la función no hace nada.
 */
export async function enviarAvisoAdministracion(
  reserva: DatosCorreo,
): Promise<ResultadoCorreo> {
  const destinatarios = destinatariosInternos();
  if (destinatarios.length === 0) {
    console.info(
      `[correos] aviso interno: EMAIL_NOTIFY_TO no está configurada (reserva ${reserva.codigo}).`,
    );
    return {
      enviado: false,
      motivo: "sin_destinatario",
      mensaje: "EMAIL_NOTIFY_TO no está configurada.",
    };
  }

  return entregar(
    destinatarios,
    renderAvisoAdministracion(await contexto(reserva)),
    "aviso interno",
  );
}
