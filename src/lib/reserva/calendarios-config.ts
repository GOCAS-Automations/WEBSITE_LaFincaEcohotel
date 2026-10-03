/**
 * Qué calendarios de Google mira el sitio, y a qué cabaña corresponde cada uno.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ VARIOS CALENDARIOS
 * ---------------------------------------------------------------------------
 * El hotel lleva un calendario general («la finca») donde apunta las reservas
 * poniendo el nombre de la cabaña en el título, y además va a crear **cinco
 * subcalendarios, uno por cabaña**, bajo el mismo Gmail, para un bot de
 * WhatsApp que funciona aparte. Las dos cosas van a convivir, así que el sitio
 * tiene que poder leer una lista de calendarios y no uno solo.
 *
 * ---------------------------------------------------------------------------
 * EL FORMATO DE `GOOGLE_CALENDAR_ID`
 * ---------------------------------------------------------------------------
 * Una lista separada por comas (los espacios y los saltos de línea también
 * valen como separador). Cada trozo es un identificador de calendario y, si
 * hace falta, el número de cabaña al que pertenece, detrás de un `=`:
 *
 *     GOOGLE_CALENDAR_ID=general@group.calendar.google.com
 *     GOOGLE_CALENDAR_ID=general@group.calendar.google.com, cab1@…=1, cab2@…=2
 *
 * · Sin `=n` → **calendario general**: cada evento ocupa la cabaña que diga su
 *   título, y las cinco si no lo dice (la regla conservadora de siempre, en
 *   `calendario-externo.ts`).
 * · Con `=n` (1 a 5) → **calendario de esa cabaña**: TODOS sus eventos ocupan
 *   esa cabaña, sin mirar el título. También se entiende `=cabaña 3`,
 *   `=cabana-03` o `=cab. 3`, porque es lo que alguien va a escribir.
 *
 * ---------------------------------------------------------------------------
 * UNA VARIABLE MAL ESCRITA NO PUEDE APAGAR LAS RESERVAS
 * ---------------------------------------------------------------------------
 * Esto lo edita una persona en el panel de Vercel, de noche y con prisa. Así que
 * aquí no se lanza nada ni se descarta nada en silencio: lo que no se entiende
 * se degrada a la opción conservadora (calendario general, que bloquea más) y
 * deja un **aviso en español** que el panel muestra al propietario.
 *
 *   · `=9` o `=cocina` → se lee como calendario general, con aviso.
 *   · El mismo identificador dos veces → se queda el primero, con aviso.
 *
 * ⚠️ Módulo PURO y sin `server-only` ni alias `@/`: lo prueba Vitest y lo carga
 * tal cual `scripts/verificar-calendarios.mjs`.
 */

import { CABANAS_DE_LA_FINCA, numeroDeCabana } from "./calendario-externo";

/** Un calendario de la lista, ya entendido. */
export type CalendarioDelHotel = {
  /** Identificador tal como lo escribió quien configuró la variable. */
  id: string;
  /** Cabaña fija (1–5), o `null` si es un calendario general. */
  cabana: number | null;
};

export type ConfiguracionCalendarios = {
  /** Los calendarios que se LEEN, en el orden en que se escribieron. */
  calendarios: CalendarioDelHotel[];
  /** Dónde se APUNTAN las reservas del panel. `null` si no hay ninguno. */
  escribirEn: string | null;
  /** Cierto si `escribirEn` lo fijó `GOOGLE_CALENDAR_ESCRIBIR_EN`. */
  escrituraForzada: boolean;
  /** Cierto si el calendario de escritura no está entre los que se leen. */
  escrituraFueraDeLista: boolean;
  /** Frases en español para enseñar en el panel. Vacío = todo en orden. */
  avisos: string[];
};

/**
 * Parte la variable en trozos.
 *
 * Antes de cortar se normalizan dos cosas, porque si no el espacio de dentro de
 * un mapeo partiría el trozo en dos y «cab1@… = 1» se leería como tres
 * calendarios:
 *   1. los espacios alrededor del `=` desaparecen;
 *   2. un mapeo escrito con palabras («=cabaña 3», «=cabana-03», «=cab. 3») se
 *      reduce a su número («=3»).
 */
function trocear(crudo: string | null | undefined): string[] {
  if (!crudo) return [];
  return crudo
    .replace(/\s*=\s*/g, "=")
    .replace(/=cab(?:a[nñ]as?|\.)?[\s._-]*#?\s*0*(\d{1,2})\b/giu, "=$1")
    .split(/[\s,;]+/)
    .map((trozo) => trozo.trim())
    .filter(Boolean);
}

/** Número de cabaña que pide un mapeo, o `null` si no se entiende. */
function cabanaDelMapeo(mapeo: string): number | null {
  if (/^\d{1,2}$/.test(mapeo)) {
    const numero = Number(mapeo);
    return numero >= 1 && numero <= CABANAS_DE_LA_FINCA ? numero : null;
  }
  /* Red de seguridad para lo que el troceo no pudo normalizar («=cabana01»):
     la misma función que lee los títulos de los eventos. */
  return numeroDeCabana(mapeo);
}

/**
 * Lee `GOOGLE_CALENDAR_ID` y `GOOGLE_CALENDAR_ESCRIBIR_EN`.
 *
 * Nunca lanza. Un solo identificador —el formato de antes de los
 * subcalendarios— sigue funcionando exactamente igual: sale una lista de uno.
 */
export function parsearCalendarios(
  crudoIds: string | null | undefined,
  crudoEscritura?: string | null,
): ConfiguracionCalendarios {
  const avisos: string[] = [];
  const calendarios: CalendarioDelHotel[] = [];
  /** Identificadores ya aceptados, en minúsculas, para detectar repetidos. */
  const yaEstan = new Set<string>();

  for (const trozo of trocear(crudoIds)) {
    const corte = trozo.indexOf("=");
    const id = (corte === -1 ? trozo : trozo.slice(0, corte)).trim();
    const mapeo = corte === -1 ? null : trozo.slice(corte + 1).trim();
    if (!id) continue;

    if (yaEstan.has(id.toLowerCase())) {
      avisos.push(
        `El calendario «${id}» está repetido en GOOGLE_CALENDAR_ID. Solo se tiene en cuenta la primera vez que aparece.`,
      );
      continue;
    }

    let cabana: number | null = null;
    if (mapeo !== null) {
      cabana = cabanaDelMapeo(mapeo);
      if (cabana === null) {
        avisos.push(
          `No se entendió a qué cabaña pertenece el calendario «${id}»: después del «=» hay «${mapeo}» y ahí se espera un número del 1 al ${CABANAS_DE_LA_FINCA}. Mientras tanto se lee como un calendario general: cada evento ocupa la cabaña que diga su título, y las cinco si no lo dice.`,
        );
      }
    }

    yaEstan.add(id.toLowerCase());
    calendarios.push({ id, cabana });
  }

  /* ------------------------------------------------------------------------
   * Dónde se escribe
   * --------------------------------------------------------------------- */

  let escribirEn: string | null = null;
  let escrituraForzada = false;
  let escrituraFueraDeLista = false;

  const pedido = (crudoEscritura ?? "").trim();
  if (pedido) {
    const corte = pedido.indexOf("=");
    if (corte !== -1) {
      avisos.push(
        "GOOGLE_CALENDAR_ESCRIBIR_EN lleva un solo identificador de calendario, sin «=número». Se usa solo lo que hay antes del «=».",
      );
    }
    const id = (corte === -1 ? pedido : pedido.slice(0, corte)).trim();
    if (id) {
      escribirEn = id;
      escrituraForzada = true;
      if (!yaEstan.has(id.toLowerCase())) {
        escrituraFueraDeLista = true;
        avisos.push(
          `El calendario donde se apuntan las reservas (GOOGLE_CALENDAR_ESCRIBIR_EN: «${id}») no está entre los que el sitio lee (GOOGLE_CALENDAR_ID). Las reservas del panel se van a escribir ahí igualmente, pero conviene revisar que sea el calendario correcto.`,
        );
      }
    }
  }

  if (!escribirEn) escribirEn = calendarios[0]?.id ?? null;

  /* Si el calendario de escritura es el de una cabaña, TODAS las reservas del
     panel —las de las otras cuatro cabañas y las del Día de Calma— acabarían
     en el calendario de esa cabaña. Es casi siempre un error de orden en la
     variable, y se nota tarde: hay que decirlo. */
  const destino = calendarios.find(
    (calendario) => calendario.id.toLowerCase() === escribirEn?.toLowerCase(),
  );
  if (destino && destino.cabana !== null) {
    avisos.push(
      `Las reservas del panel se van a apuntar en el calendario de la Cabaña ${destino.cabana}, porque es el que manda en la configuración. Todas, también las de las otras cabañas. Si no es lo que se quiere, pon primero el calendario general en GOOGLE_CALENDAR_ID o indica el correcto en GOOGLE_CALENDAR_ESCRIBIR_EN.`,
    );
  }

  return {
    calendarios,
    escribirEn,
    escrituraForzada,
    escrituraFueraDeLista,
    avisos,
  };
}

/** Cómo se nombra un calendario en el panel: «general» o «Cabaña 3». */
export function etiquetaDeCalendario(calendario: CalendarioDelHotel): string {
  return calendario.cabana === null
    ? "Calendario general (se mira el título de cada evento)"
    : `Solo Cabaña ${calendario.cabana}`;
}
