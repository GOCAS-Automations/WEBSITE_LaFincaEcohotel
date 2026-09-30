/**
 * Plantillas de los correos transaccionales de La Finca Eco Hotel.
 *
 * Este módulo es **PURO**: recibe los datos de la reserva y devuelve asunto,
 * HTML y texto plano. No conoce Resend, no lee variables de entorno y no toca
 * la base de datos, así que se puede renderizar a un archivo y revisar en el
 * navegador sin enviar nada — que es lo que hace `npm run correos:probar`.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EL HTML ESTÁ ESCRITO ASÍ Y NO CON TAILWIND NI CON COMPONENTES
 * ---------------------------------------------------------------------------
 *   · **Estilos en línea, obligatorio.** Gmail, Outlook y compañía descartan
 *     las hojas externas y buena parte de lo que va en `<style>`. Cada regla
 *     viaja en su propio atributo `style`.
 *   · **Maquetación con `<table>`.** Outlook para Windows sigue renderizando
 *     con el motor de Word: `flex` y `grid` no existen para él. Las tablas
 *     anidadas son feas, pero son lo único que se ve igual en todas partes.
 *   · **Ancho máximo de 600 px.** Es lo que cabe en el panel de vista previa de
 *     cualquier cliente de correo, y en el teléfono la tabla baja sola al
 *     100 %.
 *   · **Texto plano siempre.** Se manda como alternativa `text`: hay clientes
 *     —y filtros antispam— que lo prefieren, y un correo sin versión plana
 *     puntúa peor en entregabilidad. Cada plantilla se leyó completa en plano
 *     antes de darla por buena.
 *   · **El logo es un PNG, no el WebP del sitio.** Outlook de escritorio no
 *     pinta WebP: dejaría un cuadro roto en la cabecera. En el bucket vive
 *     `sitio/marca/icono-correo.png` (160 px) solo para esto.
 *   · **El logo lleva `alt` y la cabecera repite el nombre en texto**, porque
 *     la mayoría de los clientes bloquean las imágenes hasta que el lector las
 *     pide: el correo tiene que leerse igual con los huecos vacíos.
 *
 * ---------------------------------------------------------------------------
 * IDENTIDAD
 * ---------------------------------------------------------------------------
 * La paleta oficial son tres colores (manual de marca, pp. 8–9): petróleo
 * `#027570`, oliva `#5E6033` y verde claro `#E8F4D9`. El fondo es el crema del
 * sitio (`#FEFBF7`), nunca blanco puro. No hay dorado: se retiró del sitio
 * público porque venía del WordPress viejo y no está en el manual.
 *
 * Todo el texto va en **español claro**, también el aviso interno: lo lee el
 * equipo del hotel, que no es técnico.
 */
import { formatearCOP, formatearFecha, formatearFechaCorta } from "../utils/formato";

/* ===========================================================================
 * Datos de entrada
 * ======================================================================== */

/** Una experiencia o adicional de la reserva. */
export type ExperienciaCorreo = {
  nombre: string;
  cantidad: number;
  /** Precio congelado al reservar, por unidad. */
  precioUnitario: number;
  /** Noche a la que se añade (ISO). `null` = para toda la estadía o el día. */
  noche: string | null;
};

/**
 * Una noche con su plan y su precio.
 *
 * Es la misma forma que devuelve `cotizar()` (`LineaNoche` en
 * `@/lib/reserva/cotizacion`), para que el día que el motor público cree la
 * reserva pueda pasar su desglose real tal cual. Cuando quien envía el correo
 * solo tiene la fila de `reservas` —que guarda un único `plan_id` y un
 * subtotal— la lista va vacía y la plantilla pinta una sola línea con el plan y
 * el número de noches. **Nunca se reparte el subtotal a ojo entre las noches:
 * un número inventado en un correo de cobro es peor que un número menos
 * detallado.**
 */
export type NocheCorreo = {
  /** ISO de la noche (se identifica por su fecha de llegada). */
  fecha: string;
  /** Nombre del plan con el que se cobra esa noche. */
  plan: string;
  precio: number;
  /** Nombre del festivo, si esa noche cae en uno. */
  festivo?: string | null;
};

/** Pago ya aprobado por la pasarela (llega desde el webhook). */
export type PagoCorreo = {
  /** Lo que se cobró de verdad. */
  monto: number;
  /** Lo que queda pendiente para antes de la llegada. */
  saldo: number;
  /** `Tarjeta`, `PSE`, `Nequi`… tal como lo diga la pasarela. */
  metodo: string | null;
  transaccionId: string | null;
};

/**
 * La reserva vista por los correos.
 *
 * Es un subconjunto de la fila de `reservas` para poder pasarla tal cual desde
 * el panel, desde el motor público y desde el webhook de pagos.
 */
export type DatosCorreo = {
  /** `id` de la fila: es lo que compone el enlace a la ficha del panel. */
  id: string;
  /** El código legible («LF-2026-0042»). Es LA referencia para el huésped. */
  codigo: string;
  tipo: "hospedaje" | "dia";
  /** Nombre de la cabaña. `null` en el Día de Calma, que no ocupa ninguna. */
  alojamiento: string | null;
  /** Nombre del plan guardado en la reserva. */
  plan: string | null;
  /** ISO de la llegada (o del día, en el Día de Calma). */
  entrada: string;
  /** ISO de la salida, **exclusiva**: `[entrada, salida)`. */
  salida: string;
  numPersonas: number;
  huespedNombre: string;
  huespedEmail: string | null;
  huespedTelefono: string | null;
  /** Lo que escribió el huésped. Solo se muestra en el aviso interno. */
  notas?: string | null;
  subtotalAlojamiento: number;
  subtotalExtras: number;
  total: number;
  /** Entero entre 50 y 100. */
  porcentajeAnticipo: number;
  montoAnticipo: number;
  experiencias: ExperienciaCorreo[];
  /** Desglose real noche por noche, cuando quien envía lo tenga. */
  noches?: NocheCorreo[];
  /** Estado y origen: solo para el aviso interno. */
  estado?: string;
  origen?: string;
  /** ISO del vencimiento del hold. Solo en «solicitud recibida». */
  expiraAt?: string | null;
  /** Pago aprobado, cuando el correo lo dispara el webhook. */
  pago?: PagoCorreo | null;
};

/** Los datos de contacto del hotel que se pintan en el pie y en el cuerpo. */
export type ContactoCorreo = {
  /** Solo dígitos con indicativo, para el enlace `wa.me`. */
  whatsapp: string;
  whatsappVisible: string;
  /** Puede estar vacío: el hotel todavía no tiene correo publicado. */
  correo: string;
  direccionCompleta: string;
  rnt: string;
  /** Enlace a las indicaciones desde Cali. Puede venir vacío. */
  comoLlegar: string;
};

export type CorreoRenderizado = {
  asunto: string;
  html: string;
  texto: string;
};

type Contexto = {
  reserva: DatosCorreo;
  contacto: ContactoCorreo;
  /** Base absoluta del sitio, para el enlace al panel y al logo. */
  urlSitio: string;
  /** URL absoluta del isotipo en PNG. */
  urlLogo: string;
};

/* ===========================================================================
 * Datos fijos del hotel (§5 y §6 de docs/DATOS_CLIENTE.md)
 * ======================================================================== */

/**
 * Las reglas de llegada, tal como las confirmó el hotel. Viven aquí porque son
 * lo que el correo de confirmación promete, y una promesa desalineada con la
 * realidad es una queja en recepción.
 */
export const LLEGADA = {
  /** Desde esta hora se pueden usar restaurante, senderos, decks y zonas sociales. */
  desde: "1:00 p. m.",
  /** Entrega de la cabaña. */
  checkIn: "3:00 p. m.",
  checkOut: "1:00 p. m.",
} as const;

/** Franja del Día de Calma. Nunca se usa la palabra «pasadía». */
export const HORARIO_DIA = { desde: "10:00 a. m.", hasta: "5:00 p. m." } as const;

/** El anfitrión que recibe en la finca. */
export const ANFITRION = "Nicolás";

/* ===========================================================================
 * Utilidades
 * ======================================================================== */

/**
 * Escapa el texto que se interpola en el HTML.
 *
 * No es una precaución teórica: el nombre, el teléfono y las notas del huésped
 * los escribe una persona y viajan tal cual al aviso interno. Un `<` sin
 * escapar rompe la maqueta del correo en el mejor de los casos.
 */
export function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const COLOR = {
  /** Petróleo de marca: cabeceras, pie y cifras que importan. */
  petroleo: "#027570",
  petroleoOscuro: "#015551",
  /** Verde claro de marca: fondos de bloque y filas alternas. */
  brote: "#E8F4D9",
  broteSuave: "#F3F9EA",
  oliva: "#5E6033",
  /** Fondo crema del sitio. Nunca blanco puro. */
  crema: "#FEFBF7",
  tarjeta: "#FFFFFF",
  texto: "#2B2A26",
  textoSuave: "#5F5C55",
  borde: "#E6E1D8",
  /** Solo para el aviso de vencimiento del hold. */
  alerta: "#8A5A00",
  alertaFondo: "#FDF4E3",
} as const;

const FUENTE =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/** Cuántas noches hay entre dos fechas ISO (rango medio abierto). */
function nochesDe(reserva: DatosCorreo): number {
  const [ae, me, de] = reserva.entrada.split("-").map(Number);
  const [as, ms, ds] = reserva.salida.split("-").map(Number);
  const dias = Math.round(
    (Date.UTC(as, ms - 1, ds) - Date.UTC(ae, me - 1, de)) / 86_400_000,
  );
  return Math.max(0, dias);
}

function etiquetaNoches(noches: number): string {
  return noches === 1 ? "1 noche" : `${noches} noches`;
}

function etiquetaPersonas(personas: number): string {
  return personas === 1 ? "1 persona" : `${personas} personas`;
}

/** Una fila de la tabla de detalle: etiqueta a la izquierda, valor a la derecha. */
function fila(etiqueta: string, valor: string, ultima = false): string {
  const borde = ultima ? "none" : `1px solid ${COLOR.borde}`;
  return `<tr>
    <td style="padding:10px 0;border-bottom:${borde};font-family:${FUENTE};font-size:14px;line-height:20px;color:${COLOR.textoSuave};vertical-align:top;">${etiqueta}</td>
    <td style="padding:10px 0;border-bottom:${borde};font-family:${FUENTE};font-size:14px;line-height:20px;color:${COLOR.texto};font-weight:600;text-align:right;vertical-align:top;">${valor}</td>
  </tr>`;
}

/** Botón (tabla, no `<a>` con padding: Outlook ignora el padding del enlace). */
function boton(href: string, etiqueta: string, color = COLOR.petroleo): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0;">
    <tr><td align="center" bgcolor="${color}" style="border-radius:14px;">
      <a href="${escaparHtml(href)}" style="display:inline-block;padding:13px 26px;font-family:${FUENTE};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:14px;">${etiqueta}</a>
    </td></tr>
  </table>`;
}

/** Bloque destacado sobre verde claro. */
function bloque(contenidoHtml: string, fondo: string = COLOR.brote): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;">
    <tr><td bgcolor="${fondo}" style="padding:16px 18px;border-radius:16px;font-family:${FUENTE};font-size:14px;line-height:22px;color:${COLOR.texto};">${contenidoHtml}</td></tr>
  </table>`;
}

/** Título de sección dentro del cuerpo. */
function subtitulo(texto: string): string {
  return `<p style="margin:26px 0 8px;font-family:${FUENTE};font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${COLOR.petroleo};">${texto}</p>`;
}

function parrafo(html: string): string {
  return `<p style="margin:0 0 14px;font-family:${FUENTE};font-size:15px;line-height:24px;color:${COLOR.texto};">${html}</p>`;
}

/** Lista de viñetas, con márgenes explícitos porque Outlook los inventa. */
function lista(puntos: string[]): string {
  const items = puntos
    .map(
      (punto) =>
        `<li style="margin:0 0 7px;font-family:${FUENTE};font-size:14px;line-height:22px;color:${COLOR.texto};">${punto}</li>`,
    )
    .join("");
  return `<ul style="margin:0 0 14px;padding-left:20px;">${items}</ul>`;
}

/* ---------------------------------------------------------------------------
 * El envoltorio: cabecera, cuerpo y pie
 * ------------------------------------------------------------------------- */

function envoltorio({
  preencabezado,
  titulo,
  cuerpo,
  contacto,
  urlLogo,
  urlSitio,
  interno = false,
}: {
  /** Primera línea que enseña la bandeja junto al asunto. */
  preencabezado: string;
  titulo: string;
  cuerpo: string;
  contacto: ContactoCorreo;
  urlLogo: string;
  urlSitio: string;
  /** El aviso interno no lleva el pie comercial ni el RNT. */
  interno?: boolean;
}): string {
  const whatsapp = `https://wa.me/${contacto.whatsapp}`;

  const pie = interno
    ? `<p style="margin:0;font-family:${FUENTE};font-size:12px;line-height:19px;color:#CFE3DF;">Aviso automático del sitio de La Finca Eco Hotel. Se envía a las direcciones configuradas en <span style="color:#ffffff;">EMAIL_NOTIFY_TO</span>.</p>`
    : `<p style="margin:0 0 10px;font-family:${FUENTE};font-size:13px;line-height:21px;color:#DCEBE8;">
         <strong style="color:#ffffff;">La Finca Eco Hotel</strong><br />
         ${escaparHtml(contacto.direccionCompleta)}<br />
         WhatsApp <a href="${whatsapp}" style="color:#ffffff;text-decoration:underline;">${escaparHtml(contacto.whatsappVisible)}</a>${
           contacto.correo
             ? ` · <a href="mailto:${escaparHtml(contacto.correo)}" style="color:#ffffff;text-decoration:underline;">${escaparHtml(contacto.correo)}</a>`
             : ""
         }
       </p>
       <p style="margin:0;font-family:${FUENTE};font-size:11px;line-height:18px;color:#B6D2CE;">
         RNT ${escaparHtml(contacto.rnt)} · <a href="${escaparHtml(urlSitio)}" style="color:#B6D2CE;text-decoration:underline;">lafincaecohotel.com</a><br />
         Este correo se envía porque hiciste una reserva con nosotros.
       </p>`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>${escaparHtml(titulo)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLOR.crema};">
<!-- Preencabezado: se lee en la bandeja y no se ve al abrir. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escaparHtml(preencabezado)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLOR.crema}" style="background-color:${COLOR.crema};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

        <!-- Cabecera: verde claro de marca, con el isotipo en petróleo. -->
        <tr>
          <td bgcolor="${COLOR.brote}" style="padding:22px 26px;border-radius:20px 20px 0 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-right:12px;vertical-align:middle;">
                  <img src="${escaparHtml(urlLogo)}" width="44" height="44" alt="La Finca Eco Hotel" style="display:block;width:44px;height:44px;border:0;" />
                </td>
                <td style="vertical-align:middle;">
                  <div style="font-family:${FUENTE};font-size:15px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${COLOR.petroleo};">La Finca</div>
                  <div style="margin-top:3px;font-family:${FUENTE};font-size:9px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:${COLOR.oliva};">Eco · Hotel</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Cuerpo -->
        <tr>
          <td bgcolor="${COLOR.tarjeta}" style="padding:30px 26px 34px;">
            <h1 style="margin:0 0 16px;font-family:${FUENTE};font-size:23px;line-height:31px;font-weight:700;color:${COLOR.petroleoOscuro};">${escaparHtml(titulo)}</h1>
            ${cuerpo}
          </td>
        </tr>

        <!-- Pie -->
        <tr>
          <td bgcolor="${COLOR.petroleo}" style="padding:22px 26px;border-radius:0 0 20px 20px;">
            ${pie}
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/* ---------------------------------------------------------------------------
 * Piezas compartidas: el detalle de la reserva y el del pago
 * ------------------------------------------------------------------------- */

/** Título legible de una noche: «vie 16 oct» (+ el festivo, si lo hay). */
function etiquetaNoche(noche: NocheCorreo): string {
  const base = formatearFechaCorta(noche.fecha);
  return noche.festivo ? `${base} · ${noche.festivo}` : base;
}

/** Cómo se nombra una experiencia con su noche. */
function etiquetaExperiencia(extra: ExperienciaCorreo): string {
  const cantidad = extra.cantidad > 1 ? ` ×${extra.cantidad}` : "";
  const cuando = extra.noche
    ? ` — noche del ${formatearFechaCorta(extra.noche)}`
    : "";
  return `${extra.nombre}${cantidad}${cuando}`;
}

/**
 * La tabla del detalle: fechas, cabaña, plan noche por noche, experiencias y
 * total. Es la misma en los dos correos al huésped: lo que cambia alrededor es
 * el tono, no las cifras.
 */
function tablaDetalle(reserva: DatosCorreo): string {
  const filas: string[] = [];
  const esDia = reserva.tipo === "dia";

  filas.push(fila("Código de reserva", `<span style="font-family:'SFMono-Regular',Consolas,monospace;letter-spacing:0.5px;">${escaparHtml(reserva.codigo)}</span>`));

  if (esDia) {
    filas.push(fila("Día de Calma", formatearFecha(reserva.entrada)));
    filas.push(fila("Horario", `${HORARIO_DIA.desde} a ${HORARIO_DIA.hasta}`));
  } else {
    filas.push(fila("Llegada", formatearFecha(reserva.entrada)));
    filas.push(fila("Salida", formatearFecha(reserva.salida)));
    filas.push(
      fila("Cabaña", escaparHtml(reserva.alojamiento ?? "Por asignar")),
    );
  }

  filas.push(fila("Personas", etiquetaPersonas(reserva.numPersonas)));

  /* El plan, noche por noche cuando quien envía trae el desglose real; si no,
     una sola línea con el plan guardado y el número de noches. */
  const noches = reserva.noches ?? [];
  if (!esDia && noches.length > 0) {
    for (const noche of noches) {
      filas.push(
        fila(
          `${etiquetaNoche(noche)} · ${escaparHtml(noche.plan)}`,
          formatearCOP(noche.precio),
        ),
      );
    }
  } else if (esDia) {
    filas.push(
      fila(
        escaparHtml(reserva.plan ?? "Día de Calma"),
        formatearCOP(reserva.subtotalAlojamiento),
      ),
    );
  } else {
    filas.push(
      fila(
        `${escaparHtml(reserva.plan ?? "Hospedaje")} · ${etiquetaNoches(nochesDe(reserva))}`,
        formatearCOP(reserva.subtotalAlojamiento),
      ),
    );
  }

  for (const extra of reserva.experiencias) {
    filas.push(
      fila(
        escaparHtml(etiquetaExperiencia(extra)),
        formatearCOP(extra.cantidad * extra.precioUnitario),
      ),
    );
  }

  filas.push(
    `<tr>
      <td style="padding:14px 0 0;font-family:${FUENTE};font-size:16px;line-height:22px;color:${COLOR.texto};font-weight:700;">Total</td>
      <td style="padding:14px 0 0;font-family:${FUENTE};font-size:18px;line-height:22px;color:${COLOR.petroleo};font-weight:700;text-align:right;">${formatearCOP(reserva.total)}</td>
    </tr>`,
  );

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 4px;">${filas.join("")}</table>`;
}

/** El mismo detalle, en texto plano. */
function detalleEnTexto(reserva: DatosCorreo): string[] {
  const lineas: string[] = [];
  const esDia = reserva.tipo === "dia";

  lineas.push(`Código de reserva: ${reserva.codigo}`);
  if (esDia) {
    lineas.push(`Día de Calma: ${formatearFecha(reserva.entrada)}`);
    lineas.push(`Horario: ${HORARIO_DIA.desde} a ${HORARIO_DIA.hasta}`);
  } else {
    lineas.push(`Llegada: ${formatearFecha(reserva.entrada)}`);
    lineas.push(`Salida: ${formatearFecha(reserva.salida)}`);
    lineas.push(`Cabaña: ${reserva.alojamiento ?? "Por asignar"}`);
  }
  lineas.push(`Personas: ${etiquetaPersonas(reserva.numPersonas)}`);

  const noches = reserva.noches ?? [];
  if (!esDia && noches.length > 0) {
    lineas.push("");
    lineas.push("Precio noche por noche:");
    for (const noche of noches) {
      lineas.push(
        `  - ${etiquetaNoche(noche)} · ${noche.plan}: ${formatearCOP(noche.precio)}`,
      );
    }
  } else {
    lineas.push("");
    lineas.push(
      esDia
        ? `${reserva.plan ?? "Día de Calma"}: ${formatearCOP(reserva.subtotalAlojamiento)}`
        : `${reserva.plan ?? "Hospedaje"} · ${etiquetaNoches(nochesDe(reserva))}: ${formatearCOP(reserva.subtotalAlojamiento)}`,
    );
  }

  if (reserva.experiencias.length > 0) {
    lineas.push("");
    lineas.push("Experiencias y adicionales:");
    for (const extra of reserva.experiencias) {
      lineas.push(
        `  - ${etiquetaExperiencia(extra)}: ${formatearCOP(extra.cantidad * extra.precioUnitario)}`,
      );
    }
  }

  lineas.push("");
  lineas.push(`TOTAL: ${formatearCOP(reserva.total)}`);
  return lineas;
}

/**
 * El bloque del anticipo: qué se paga ahora y qué queda.
 *
 * El saldo se calcula como `total − anticipo` para que las dos cifras sumen
 * exacto: el anticipo se guarda congelado al reservar y recalcularlo aquí con
 * otro porcentaje daría otro número (§ del anticipo en `docs/DATOS_CLIENTE.md`).
 */
function bloqueAnticipo(reserva: DatosCorreo): string {
  const pagado = reserva.pago ? reserva.pago.monto : reserva.montoAnticipo;
  const saldo = reserva.pago
    ? reserva.pago.saldo
    : Math.max(0, reserva.total - reserva.montoAnticipo);
  const completo = saldo <= 0;

  const filas = [
    fila(
      reserva.pago ? "Pagado" : `Anticipo (${reserva.porcentajeAnticipo} %)`,
      formatearCOP(pagado),
      completo,
    ),
    ...(completo
      ? []
      : [fila("Saldo por pagar antes de llegar", formatearCOP(saldo), true)]),
  ];

  const nota = completo
    ? "Queda pagado el total: llegas sin nada pendiente."
    : "El saldo se paga <strong>antes de la llegada</strong>, con un enlace de pago que te enviamos por WhatsApp. En la finca no hay datáfono y no se maneja efectivo.";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 2px;">${filas.join("")}</table>
    <p style="margin:10px 0 0;font-family:${FUENTE};font-size:13px;line-height:21px;color:${COLOR.textoSuave};">${nota}</p>`;
}

function anticipoEnTexto(reserva: DatosCorreo): string[] {
  const pagado = reserva.pago ? reserva.pago.monto : reserva.montoAnticipo;
  const saldo = reserva.pago
    ? reserva.pago.saldo
    : Math.max(0, reserva.total - reserva.montoAnticipo);

  const lineas = [
    reserva.pago
      ? `Pagado: ${formatearCOP(pagado)}`
      : `Anticipo (${reserva.porcentajeAnticipo} %): ${formatearCOP(pagado)}`,
  ];
  if (saldo > 0) {
    lineas.push(`Saldo por pagar antes de llegar: ${formatearCOP(saldo)}`);
    lineas.push(
      "El saldo se paga antes de la llegada, con un enlace de pago que te enviamos por WhatsApp.",
    );
    lineas.push("En la finca no hay datáfono y no se maneja efectivo.");
  } else {
    lineas.push("Queda pagado el total: llegas sin nada pendiente.");
  }
  return lineas;
}

/* ===========================================================================
 * 1. SOLICITUD RECIBIDA — al huésped, en cuanto envía la solicitud
 * ======================================================================== */

/**
 * «Recibimos tu solicitud».
 *
 * **NO dice que la reserva esté confirmada**, porque todavía no lo está: el
 * hotel la confirma desde el panel o la confirma el pago. Decir «confirmada»
 * aquí sería la peor clase de error en un correo de hotel: el huésped se
 * presenta y no hay cabaña.
 */
export function renderSolicitudRecibida({
  reserva,
  contacto,
  urlSitio,
  urlLogo,
}: Contexto): CorreoRenderizado {
  const esDia = reserva.tipo === "dia";
  const whatsapp = `https://wa.me/${contacto.whatsapp}`;
  const nombre = escaparHtml(reserva.huespedNombre.split(" ")[0] || "Hola");

  const avisoHold = reserva.expiraAt
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;">
         <tr><td bgcolor="${COLOR.alertaFondo}" style="padding:14px 16px;border-radius:14px;font-family:${FUENTE};font-size:13px;line-height:21px;color:${COLOR.alerta};">
           Te apartamos ${esDia ? "el cupo de ese día" : "esas fechas"} mientras completas el pago. Si no llega el anticipo, ${esDia ? "el cupo vuelve a quedar libre" : "las fechas vuelven al calendario"} y habría que empezar de nuevo.
         </td></tr>
       </table>`
    : "";

  const cuerpo = `
    ${parrafo(`${nombre}, gracias por escribirnos. <strong>Recibimos tu solicitud</strong> y ya la tenemos en nuestro sistema.`)}
    ${parrafo(`Guarda este código, que es con el que te vamos a identificar: <strong style="color:${COLOR.petroleo};">${escaparHtml(reserva.codigo)}</strong>.`)}
    ${avisoHold}
    ${subtitulo(esDia ? "Tu Día de Calma" : "Tu estadía")}
    ${tablaDetalle(reserva)}
    ${subtitulo("El pago")}
    ${bloqueAnticipo(reserva)}
    ${subtitulo("Qué sigue")}
    ${lista([
      "Revisamos la disponibilidad y te confirmamos por WhatsApp.",
      `Cuando entre el anticipo${reserva.montoAnticipo > 0 ? ` de ${formatearCOP(reserva.montoAnticipo)}` : ""}, te llega un segundo correo: <strong>ese</strong> es el que confirma la reserva.`,
      `Con la confirmación te enviamos el pin exacto de la ubicación y el video de cómo llegar${esDia ? "" : ", además de los horarios de entrada y salida"}.`,
    ])}
    ${bloque(
      `<strong>¿Algo que debamos saber?</strong> Escríbenos por WhatsApp al ${escaparHtml(contacto.whatsappVisible)} con tu código y lo ajustamos.<br /><br />${boton(whatsapp, "Escribirnos por WhatsApp")}`,
    )}
    ${parrafo(`<span style="font-size:13px;color:${COLOR.textoSuave};">Esta solicitud todavía <strong>no está confirmada</strong>. No hagas planes de viaje hasta que te llegue el correo de confirmación.</span>`)}
  `;

  const texto = [
    `${reserva.huespedNombre}, recibimos tu solicitud en La Finca Eco Hotel.`,
    "",
    `Tu código de reserva es ${reserva.codigo}. Guárdalo: es con el que te identificamos.`,
    ...(reserva.expiraAt
      ? [
          "",
          `Te apartamos ${esDia ? "el cupo de ese día" : "esas fechas"} mientras completas el pago. Si no llega el anticipo, ${esDia ? "el cupo vuelve a quedar libre" : "las fechas vuelven al calendario"}.`,
        ]
      : []),
    "",
    esDia ? "TU DÍA DE CALMA" : "TU ESTADÍA",
    ...detalleEnTexto(reserva),
    "",
    "EL PAGO",
    ...anticipoEnTexto(reserva),
    "",
    "QUÉ SIGUE",
    "- Revisamos la disponibilidad y te confirmamos por WhatsApp.",
    `- Cuando entre el anticipo, te llega un segundo correo: ese es el que confirma la reserva.`,
    "- Con la confirmación te enviamos el pin exacto de la ubicación y el video de cómo llegar.",
    "",
    `¿Algo que debamos saber? Escríbenos por WhatsApp al ${contacto.whatsappVisible} con tu código.`,
    "",
    "Esta solicitud todavía NO está confirmada. No hagas planes de viaje hasta que te llegue el correo de confirmación.",
    "",
    "--",
    "La Finca Eco Hotel",
    contacto.direccionCompleta,
    `WhatsApp ${contacto.whatsappVisible}`,
    `RNT ${contacto.rnt} · ${urlSitio}`,
  ].join("\n");

  const asunto = `Recibimos tu solicitud · ${reserva.codigo} · La Finca Eco Hotel`;

  return {
    asunto,
    texto,
    html: envoltorio({
      preencabezado: `Tu código es ${reserva.codigo}. Todavía falta confirmarla.`,
      titulo: "Recibimos tu solicitud",
      cuerpo,
      contacto,
      urlLogo,
      urlSitio,
    }),
  };
}

/* ===========================================================================
 * 2. RESERVA CONFIRMADA — al huésped
 * ======================================================================== */

/**
 * La confirmación definitiva.
 *
 * Sale cuando el equipo confirma desde el panel o cuando el webhook de la
 * pasarela aprueba el pago. Además del detalle, lleva **todo lo que el huésped
 * necesita el día del viaje**: cómo llegar, horarios, qué llevar y a quién
 * buscar al llegar. El Día de Calma tiene su propia variante: no hay check-in
 * ni check-out, hay una franja de 10:00 a. m. a 5:00 p. m.
 */
export function renderReservaConfirmada({
  reserva,
  contacto,
  urlSitio,
  urlLogo,
}: Contexto): CorreoRenderizado {
  const esDia = reserva.tipo === "dia";
  const whatsapp = `https://wa.me/${contacto.whatsapp}`;
  const nombre = escaparHtml(reserva.huespedNombre.split(" ")[0] || "Hola");

  const horarios = esDia
    ? lista([
        `<strong>Te esperamos de ${HORARIO_DIA.desde} a ${HORARIO_DIA.hasta}</strong>. El Día de Calma no incluye hospedaje: es un día completo en la finca, sin noche.`,
        "Puedes llegar desde las 10:00 a. m. y quedarte hasta las 5:00 p. m.",
      ])
    : lista([
        `<strong>Entrega de la cabaña (check-in): ${LLEGADA.checkIn}</strong>`,
        `<strong>Check-out: ${LLEGADA.checkOut}</strong>`,
        `Puedes llegar <strong>desde la ${LLEGADA.desde}</strong> y usar el restaurante, los senderos, los decks y las zonas sociales mientras alistamos tu cabaña.`,
      ]);

  const queLlevar = lista([
    "<strong>Ropa abrigada.</strong> Estamos en bosque de niebla, a 18 °C o menos, y en la noche refresca más de lo que la gente espera.",
    "<strong>Vestido de baño</strong>, para el jacuzzi, el turco y la piscina.",
    "Zapatos cómodos para caminar por los alrededores.",
  ]);

  const comoLlegar = `
    ${parrafo(`Estamos en el <strong>Km 18 vía Cali–Buenaventura, Vereda Loma Alta</strong>, a unos 45 minutos del occidente de Cali. La vía no está pavimentada en el último tramo, pero es apta para cualquier carro.`)}
    ${parrafo(`<strong>El parqueadero es externo</strong>, vigilado 24 horas, en la entrada: los vehículos no ingresan a la reserva natural.`)}
    ${parrafo(`Te enviamos por WhatsApp el <strong>pin exacto</strong> y un video corto del recorrido: el mapa a secas confunde en el Km 18.`)}
    ${contacto.comoLlegar ? boton(contacto.comoLlegar, "Ver la ruta desde Cali") : ""}
  `;

  const cuerpo = `
    ${parrafo(`${nombre}, ${esDia ? "tu <strong>Día de Calma</strong> quedó confirmado" : "tu reserva quedó <strong>confirmada</strong>"}. Ya te estamos esperando.`)}
    ${bloque(
      `<strong style="font-size:15px;">Código ${escaparHtml(reserva.codigo)}</strong><br />${
        esDia
          ? `${formatearFecha(reserva.entrada)} · ${HORARIO_DIA.desde} a ${HORARIO_DIA.hasta}`
          : `${formatearFechaCorta(reserva.entrada)} → ${formatearFechaCorta(reserva.salida)} · ${etiquetaNoches(nochesDe(reserva))} · ${escaparHtml(reserva.alojamiento ?? "Por asignar")}`
      }`,
    )}
    ${subtitulo(esDia ? "Tu Día de Calma" : "Tu estadía")}
    ${tablaDetalle(reserva)}
    ${subtitulo("El pago")}
    ${bloqueAnticipo(reserva)}
    ${subtitulo(esDia ? "Horario" : "Horarios")}
    ${horarios}
    ${subtitulo("Cómo llegar")}
    ${comoLlegar}
    ${subtitulo("Qué llevar")}
    ${queLlevar}
    ${subtitulo("Al llegar")}
    ${parrafo(`Te recibe <strong>${ANFITRION}</strong>, nuestro anfitrión en la finca. Él coordina los turnos de jacuzzi y de turco y resuelve cualquier detalle mientras estés con nosotros.`)}
    ${bloque(
      `<strong>¿Necesitas algo antes de venir?</strong> Escríbenos por WhatsApp al ${escaparHtml(contacto.whatsappVisible)} con tu código ${escaparHtml(reserva.codigo)}.<br /><br />${boton(whatsapp, "Escribirnos por WhatsApp")}`,
    )}
    ${parrafo(`<span style="font-size:13px;color:${COLOR.textoSuave};">Recuerda: <strong>no se permiten menores de edad</strong> en la finca, las mascotas son bienvenidas (la primera no tiene costo) y el terreno no es plano, así que no lo recomendamos a personas con movilidad reducida.</span>`)}
  `;

  const texto = [
    `${reserva.huespedNombre}, ${esDia ? "tu Día de Calma quedó confirmado" : "tu reserva quedó confirmada"} en La Finca Eco Hotel.`,
    "",
    `Código ${reserva.codigo}`,
    "",
    esDia ? "TU DÍA DE CALMA" : "TU ESTADÍA",
    ...detalleEnTexto(reserva),
    "",
    "EL PAGO",
    ...anticipoEnTexto(reserva),
    "",
    esDia ? "HORARIO" : "HORARIOS",
    ...(esDia
      ? [
          `- Te esperamos de ${HORARIO_DIA.desde} a ${HORARIO_DIA.hasta}`,
          "- El Día de Calma no incluye hospedaje: es un día completo en la finca, sin noche.",
        ]
      : [
          `- Entrega de la cabaña (check-in): ${LLEGADA.checkIn}`,
          `- Check-out: ${LLEGADA.checkOut}`,
          `- Puedes llegar desde la ${LLEGADA.desde} y usar el restaurante, los senderos, los decks y las zonas sociales mientras alistamos tu cabaña.`,
        ]),
    "",
    "CÓMO LLEGAR",
    "Km 18 vía Cali–Buenaventura, Vereda Loma Alta, Valle del Cauca.",
    "A unos 45 minutos del occidente de Cali. El último tramo no está pavimentado, pero es apto para cualquier carro.",
    "El parqueadero es externo, vigilado 24 horas, en la entrada: los vehículos no ingresan a la reserva natural.",
    "Te enviamos por WhatsApp el pin exacto y un video corto del recorrido.",
    ...(contacto.comoLlegar ? [`Ruta desde Cali: ${contacto.comoLlegar}`] : []),
    "",
    "QUÉ LLEVAR",
    "- Ropa abrigada: estamos en bosque de niebla, a 18 °C o menos, y en la noche refresca.",
    "- Vestido de baño, para el jacuzzi, el turco y la piscina.",
    "- Zapatos cómodos para caminar por los alrededores.",
    "",
    "AL LLEGAR",
    `Te recibe ${ANFITRION}, nuestro anfitrión en la finca. Él coordina los turnos de jacuzzi y de turco.`,
    "",
    `¿Necesitas algo antes de venir? Escríbenos por WhatsApp al ${contacto.whatsappVisible} con tu código ${reserva.codigo}.`,
    "",
    "Recuerda: no se permiten menores de edad en la finca, las mascotas son bienvenidas (la primera no tiene costo) y el terreno no es plano.",
    "",
    "--",
    "La Finca Eco Hotel",
    contacto.direccionCompleta,
    `WhatsApp ${contacto.whatsappVisible}`,
    `RNT ${contacto.rnt} · ${urlSitio}`,
  ].join("\n");

  const asunto = esDia
    ? `Tu Día de Calma está confirmado · ${reserva.codigo} · La Finca Eco Hotel`
    : `Tu reserva está confirmada · ${reserva.codigo} · La Finca Eco Hotel`;

  return {
    asunto,
    texto,
    html: envoltorio({
      preencabezado: esDia
        ? `${formatearFechaCorta(reserva.entrada)}, de ${HORARIO_DIA.desde} a ${HORARIO_DIA.hasta}. Todo lo que necesitas saber.`
        : `${formatearFechaCorta(reserva.entrada)} → ${formatearFechaCorta(reserva.salida)}. Cómo llegar, horarios y qué llevar.`,
      titulo: esDia ? "Tu Día de Calma está confirmado" : "Tu reserva está confirmada",
      cuerpo,
      contacto,
      urlLogo,
      urlSitio,
    }),
  };
}

/* ===========================================================================
 * 3. AVISO A LA ADMINISTRACIÓN — interno, siempre en español
 * ======================================================================== */

/** Cómo se lee el estado en el aviso interno. */
const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Pendiente (sin confirmar)",
  confirmada: "Confirmada",
  completada: "Completada",
  cancelada: "Cancelada",
};

/** Cómo se lee el origen. */
const ETIQUETA_ORIGEN: Record<string, string> = {
  web: "Desde el sitio web",
  whatsapp: "Por WhatsApp",
  telefono: "Por teléfono",
  manual: "Registrada a mano en el panel",
  google_calendar: "Desde el calendario de Google",
};

/**
 * Aviso al equipo del hotel.
 *
 * Lleva **el enlace directo a la ficha** del panel: sin él, quien recibe el
 * aviso tiene que entrar al panel, buscar la reserva en el listado y abrirla, y
 * eso es exactamente la friccion que hace que un aviso se ignore.
 *
 * Siempre en español y sin adornos: es una notificación de trabajo.
 */
export function renderAvisoAdministracion({
  reserva,
  contacto,
  urlSitio,
  urlLogo,
}: Contexto): CorreoRenderizado {
  const esDia = reserva.tipo === "dia";
  const enlaceFicha = `${urlSitio.replace(/\/+$/, "")}/admin/reservas/${reserva.id}`;
  const telefono = reserva.huespedTelefono?.trim() ?? "";
  const soloDigitos = telefono.replace(/[^\d]/g, "");
  const estado = reserva.estado ?? "pendiente";
  const saldo = reserva.pago
    ? reserva.pago.saldo
    : Math.max(0, reserva.total - reserva.montoAnticipo);

  const filasHuesped = [
    fila("Nombre", escaparHtml(reserva.huespedNombre)),
    fila(
      "Teléfono",
      telefono
        ? `<a href="https://wa.me/${escaparHtml(soloDigitos)}" style="color:${COLOR.petroleo};">${escaparHtml(telefono)}</a>`
        : "— sin teléfono —",
    ),
    fila(
      "Correo",
      reserva.huespedEmail
        ? `<a href="mailto:${escaparHtml(reserva.huespedEmail)}" style="color:${COLOR.petroleo};">${escaparHtml(reserva.huespedEmail)}</a>`
        : "— sin correo —",
    ),
    fila("Personas", etiquetaPersonas(reserva.numPersonas)),
    fila("Origen", escaparHtml(ETIQUETA_ORIGEN[reserva.origen ?? "web"] ?? reserva.origen ?? "—")),
    fila("Estado", escaparHtml(ETIQUETA_ESTADO[estado] ?? estado), true),
  ];

  const filasDinero = [
    fila("Total", formatearCOP(reserva.total)),
    fila(
      reserva.pago ? "Pagado" : `Anticipo (${reserva.porcentajeAnticipo} %)`,
      formatearCOP(reserva.pago ? reserva.pago.monto : reserva.montoAnticipo),
    ),
    fila("Saldo", formatearCOP(saldo), !reserva.pago),
    ...(reserva.pago
      ? [
          fila(
            "Pasarela",
            escaparHtml(
              [reserva.pago.metodo, reserva.pago.transaccionId]
                .filter(Boolean)
                .join(" · ") || "sin detalle",
            ),
            true,
          ),
        ]
      : []),
  ];

  const cuerpo = `
    ${parrafo(
      `<strong>${escaparHtml(reserva.codigo)}</strong> · ${
        esDia
          ? `Día de Calma del ${formatearFecha(reserva.entrada)}, de ${HORARIO_DIA.desde} a ${HORARIO_DIA.hasta}`
          : `${escaparHtml(reserva.alojamiento ?? "sin cabaña")}, del ${formatearFechaCorta(reserva.entrada)} al ${formatearFechaCorta(reserva.salida)} (${etiquetaNoches(nochesDe(reserva))})`
      }`,
    )}
    ${boton(enlaceFicha, "Abrir la ficha en el panel")}
    ${subtitulo("El huésped")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${filasHuesped.join("")}</table>
    ${subtitulo("Dinero")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${filasDinero.join("")}</table>
    ${subtitulo("Detalle")}
    ${tablaDetalle(reserva)}
    ${
      reserva.notas?.trim()
        ? `${subtitulo("Notas del huésped")}${bloque(escaparHtml(reserva.notas.trim()).replace(/\n/g, "<br />"), COLOR.broteSuave)}`
        : ""
    }
    ${
      estado === "pendiente"
        ? parrafo(
            `<span style="font-size:13px;color:${COLOR.textoSuave};">Esta reserva está <strong>pendiente</strong>: ya aparta las fechas${
              reserva.expiraAt
                ? ", pero si no se completa el pago se libera sola y las fechas vuelven al calendario"
                : ""
            }. Confírmala desde el panel cuando esté cerrada con el huésped.</span>`,
          )
        : ""
    }
  `;

  const texto = [
    `${reserva.codigo} — ${
      esDia
        ? `Día de Calma del ${formatearFecha(reserva.entrada)} (${HORARIO_DIA.desde} a ${HORARIO_DIA.hasta})`
        : `${reserva.alojamiento ?? "sin cabaña"}, del ${formatearFechaCorta(reserva.entrada)} al ${formatearFechaCorta(reserva.salida)} (${etiquetaNoches(nochesDe(reserva))})`
    }`,
    "",
    `Ficha en el panel: ${enlaceFicha}`,
    "",
    "EL HUÉSPED",
    `Nombre: ${reserva.huespedNombre}`,
    `Teléfono: ${telefono || "— sin teléfono —"}`,
    `Correo: ${reserva.huespedEmail || "— sin correo —"}`,
    `Personas: ${etiquetaPersonas(reserva.numPersonas)}`,
    `Origen: ${ETIQUETA_ORIGEN[reserva.origen ?? "web"] ?? reserva.origen ?? "—"}`,
    `Estado: ${ETIQUETA_ESTADO[estado] ?? estado}`,
    "",
    "DINERO",
    `Total: ${formatearCOP(reserva.total)}`,
    reserva.pago
      ? `Pagado: ${formatearCOP(reserva.pago.monto)}`
      : `Anticipo (${reserva.porcentajeAnticipo} %): ${formatearCOP(reserva.montoAnticipo)}`,
    `Saldo: ${formatearCOP(saldo)}`,
    ...(reserva.pago
      ? [
          `Pasarela: ${[reserva.pago.metodo, reserva.pago.transaccionId].filter(Boolean).join(" · ") || "sin detalle"}`,
        ]
      : []),
    "",
    "DETALLE",
    ...detalleEnTexto(reserva),
    ...(reserva.notas?.trim()
      ? ["", "NOTAS DEL HUÉSPED", reserva.notas.trim()]
      : []),
    ...(estado === "pendiente"
      ? [
          "",
          `Esta reserva está pendiente: ya aparta las fechas${reserva.expiraAt ? ", pero si no se completa el pago se libera sola" : ""}. Confírmala desde el panel cuando esté cerrada con el huésped.`,
        ]
      : []),
    "",
    "--",
    `Aviso automático del sitio de La Finca Eco Hotel (${urlSitio}).`,
    `Se envía a las direcciones configuradas en EMAIL_NOTIFY_TO. RNT ${contacto.rnt}.`,
  ].join("\n");

  const titulo =
    estado === "confirmada"
      ? `Reserva confirmada · ${reserva.codigo}`
      : `Nueva ${esDia ? "solicitud de Día de Calma" : "solicitud de reserva"} · ${reserva.codigo}`;

  return {
    asunto: `${titulo} · ${reserva.huespedNombre}`,
    texto,
    html: envoltorio({
      preencabezado: `${reserva.huespedNombre} · ${formatearCOP(reserva.total)} · ${
        esDia
          ? formatearFechaCorta(reserva.entrada)
          : `${formatearFechaCorta(reserva.entrada)} → ${formatearFechaCorta(reserva.salida)}`
      }`,
      titulo,
      cuerpo,
      contacto,
      urlLogo,
      urlSitio,
      interno: true,
    }),
  };
}
