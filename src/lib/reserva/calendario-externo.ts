/**
 * Del Google Calendar del hotel a la ocupación de las cabañas.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTE MÓDULO ES PURO
 * ---------------------------------------------------------------------------
 * Aquí no se habla con Google ni con Supabase: entran eventos ya normalizados
 * y salen rangos de noches ocupadas. Así se puede probar con Vitest —las
 * reglas de abajo son adivinanzas sobre cómo escribe el hotel sus eventos, y
 * van a cambiar— sin pedirle nada a la red.
 *
 * La capa que sí habla con Google es `src/lib/google/calendario.ts`, y la que
 * cachea y mezcla con la base es `src/lib/reserva/ocupacion-externa.ts`.
 *
 * ⚠️ NO importar `server-only` ni alias `@/` aquí: `scripts/probar-calendario.mjs`
 * carga este archivo tal cual para verificar las reglas de punta a punta.
 *
 * ---------------------------------------------------------------------------
 * LAS REGLAS (pensadas para ajustarse, no para durar para siempre)
 * ---------------------------------------------------------------------------
 * Todavía no sabemos con qué palabras apunta el hotel sus reservas en el
 * calendario «la finca». Hasta que lo sepamos, las reglas son estas y están
 * escritas para que cambiar una sea cambiar una línea:
 *
 *   1. Si el título contiene «cabaña», «cabana» o «cab» seguido de un número
 *      del 1 al 5 (con o sin cero delante), el evento ocupa ESA cabaña.
 *   2. Si no se reconoce ninguna cabaña, el evento bloquea LAS CINCO. Es la
 *      decisión conservadora a propósito: preferimos decirle «no hay sitio» a
 *      quien sí cabía antes que vender dos veces la misma noche.
 *   2b. EXCEPTO EL DÍA DE CALMA (2026-10-05). Si el evento no nombra cabaña y
 *      su título dice «plan día», «plan de día», «día de calma» o «pasadía»
 *      (sin mirar mayúsculas ni tildes, ver {@link esTituloDeDiaDeCalma}), es
 *      un Día de Calma: **no ocupa ninguna cabaña** —el plan de día no lleva
 *      hospedaje (`docs/DATOS_CLIENTE.md`)— y **gasta cupo del Día de Calma**
 *      ese día, {@link PERSONAS_POR_EVENTO_DIA_DE_CALMA} personas: el plan es
 *      para una o dos y el evento no dice cuántas, así que se cuenta lo más.
 *      Caso real: «Cristian Arcila plan día» (04/10/2026, calendario general)
 *      dejó el domingo sin ninguna cabaña libre en el sitio.
 *      Si nombra una cabaña («Cabaña 3 plan día») o viene del subcalendario de
 *      una cabaña, sigue ocupando esa cabaña: ahí el hotel dijo cuál.
 *   3. Los eventos cancelados se ignoran.
 *   4. Los eventos que creó el propio sitio se ignoran: ya están en la tabla
 *      `reservas` y contarlos dos veces haría que una reserva chocara consigo
 *      misma. Se reconocen por `extendedProperties.private.origen`.
 *   5. Si el evento viene de un calendario atado a una cabaña (los cinco
 *      subcalendarios que lleva el hotel, ver `calendarios-config.ts`), ocupa
 *      ESA cabaña y el título no se mira. Lo hace
 *      {@link ocupacionDesdeVariosCalendarios}, que además une lo de todos los
 *      calendarios sin contar dos veces un evento duplicado.
 *
 * ---------------------------------------------------------------------------
 * FECHAS
 * ---------------------------------------------------------------------------
 * Todo sale como `AAAA-MM-DD` y como rango medio-abierto `[inicio, fin)`, que
 * es el mismo idioma que hablan `daterange` en Postgres y el resto del motor.
 * Colombia es UTC-5 todo el año (no tiene horario de verano), así que un
 * evento con hora se lleva a día de Bogotá restando cinco horas, igual que
 * hace `hoyISO()` en el panel.
 */

/** Marca con la que el sitio firma los eventos que crea él mismo. */
export const ORIGEN_PROPIO = "lafinca-web";

/** Zona del hotel. Colombia no cambia de hora: el desfase es fijo. */
export const ZONA_HOTEL = "America/Bogota";
const DESFASE_BOGOTA_MS = 5 * 60 * 60 * 1000;

/** Cuántas cabañas tiene la finca. Fuera de este rango no se reconoce número. */
export const CABANAS_DE_LA_FINCA = 5;

/**
 * Un evento de Google Calendar ya normalizado.
 *
 * Es la forma que devuelve `src/lib/google/calendario.ts`; se declara aquí
 * porque este módulo es el que la consume y el que se prueba.
 */
export type EventoCalendario = {
  id: string;
  /** "confirmed" | "tentative" | "cancelled" (Google puede añadir más). */
  estado: string;
  titulo: string;
  descripcion: string | null;
  /** Evento de todo el día: `AAAA-MM-DD`, con `fin` ya exclusivo. */
  inicioFecha: string | null;
  finFecha: string | null;
  /** Evento con hora: marca de tiempo RFC 3339 tal como la da Google. */
  inicioHora: string | null;
  finHora: string | null;
  /** `extendedProperties.private.origen`, si lo trae. */
  origen: string | null;
  /** `extendedProperties.private.reserva_id`, si lo trae. */
  reservaId: string | null;
};

/** Una franja ocupada según el calendario del hotel. */
export type OcupacionExterna = {
  eventoId: string;
  titulo: string;
  /** Primera noche ocupada, `AAAA-MM-DD`. */
  inicio: string;
  /** Día de liberación (exclusivo): la noche anterior es la última ocupada. */
  fin: string;
  /** Número de cabaña (1–5) reconocido en el título; `null` = bloquea todas. */
  cabana: number | null;
  /**
   * Por qué bloquea, para poder explicarlo en el panel en español.
   *
   * · `cabana_reconocida` → el título del evento nombraba la cabaña.
   * · `sin_cabana` → no se reconoció ninguna: bloquea las cinco.
   * · `calendario_de_cabana` → el evento venía de un subcalendario atado a una
   *   cabaña, así que el título no hizo falta.
   */
  motivo: "cabana_reconocida" | "sin_cabana" | "calendario_de_cabana";
};

/**
 * Personas que gasta del cupo del Día de Calma un evento de Google que es un
 * Día de Calma. El plan es para 1 o 2 adultos y el evento no dice cuántos:
 * se cuentan 2, que es lo conservador (regla 2b).
 */
export const PERSONAS_POR_EVENTO_DIA_DE_CALMA = 2;

/**
 * Un Día de Calma apuntado en el calendario del hotel (regla 2b): no ocupa
 * cabaña, gasta cupo. Va en una lista APARTE de las franjas de ocupación a
 * propósito: así ningún código que lea `cabana === null` como «ocupa todas»
 * puede contarlo como ocupación por descuido.
 */
export type DiaDeCalmaExterno = {
  eventoId: string;
  titulo: string;
  /** Día de la visita, `AAAA-MM-DD`. */
  inicio: string;
  /** Exclusivo: un evento de un día es `[4, 5)`. */
  fin: string;
  /** Lo que gasta del cupo cada día: {@link PERSONAS_POR_EVENTO_DIA_DE_CALMA}. */
  personas: number;
};

/** Lo que sale de leer los eventos: ocupación de cabañas y Días de Calma. */
export type LecturaDeEventos = {
  ocupacion: OcupacionExterna[];
  diasDeCalma: DiaDeCalmaExterno[];
};

/* ---------------------------------------------------------------------------
 * Aritmética de fechas (texto, nunca `Date` con husos)
 * ------------------------------------------------------------------------- */

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function esFechaISO(valor: unknown): boolean {
  return typeof valor === "string" && FECHA_ISO.test(valor);
}

export function sumarDias(iso: string, dias: number): string {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/**
 * Día de Bogotá de una marca de tiempo RFC 3339.
 *
 * `new Date(...)` entiende el desplazamiento que trae la cadena
 * (`2026-09-12T14:00:00-05:00`, o `...Z`), así que lo único que hay que hacer
 * es correr el instante cinco horas y leer la parte de fecha en UTC.
 */
export function diaEnBogota(marca: string): string | null {
  const instante = new Date(marca);
  if (Number.isNaN(instante.getTime())) return null;
  return new Date(instante.getTime() - DESFASE_BOGOTA_MS)
    .toISOString()
    .slice(0, 10);
}

/* ---------------------------------------------------------------------------
 * ¿De qué cabaña habla este título?
 * ------------------------------------------------------------------------- */

/** Quita tildes y pasa a minúsculas para poder comparar sin sorpresas. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Las señales de un Día de Calma en el título, ya sin tildes y en minúsculas:
 * «plan día», «plan de día», «plan-día», «día de calma» y «pasadía». Con `\b`
 * a los lados, para que «plan diario» o «pasadías» no cuenten.
 */
const SENALES_DIA_DE_CALMA =
  /\bplan[\s-]+(?:de[\s-]+)?dia\b|\bdia[\s-]+de[\s-]+calma\b|\bpasadia\b/;

/**
 * ¿El título de un evento dice que es un Día de Calma? (regla 2b)
 *
 * Solo mira el título. Que el evento nombre o no una cabaña lo decide quien
 * llama: un «Cabaña 3 plan día» sigue ocupando la 3.
 */
export function esTituloDeDiaDeCalma(titulo: string | null | undefined): boolean {
  if (!titulo) return false;
  return SENALES_DIA_DE_CALMA.test(normalizar(titulo));
}

/**
 * Número de cabaña que nombra un texto, o `null` si no nombra ninguno.
 *
 * Reconoce «Cabaña 3», «cabaña 03», «CABANA #4», «Cab. 2», «cab5» y también
 * «La Finca — Cabaña 01 · Ana». Lo que NO reconoce —a propósito— es un número
 * suelto: «Reserva 3 personas» no habla de la cabaña 3.
 *
 * Sirve para dos cosas: leer el título de un evento de Google y leer el nombre
 * de una cabaña de la base («Cabaña 03»), que es como se emparejan las dos.
 */
export function numeroDeCabana(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const limpio = normalizar(texto);
  const coincidencia = /\bcab(?:ana|anas|\.)?\s*(?:n[o°.]?\s*|#\s*)?0*(\d{1,2})\b/.exec(
    limpio,
  );
  if (!coincidencia) return null;
  const numero = Number(coincidencia[1]);
  if (!Number.isInteger(numero)) return null;
  if (numero < 1 || numero > CABANAS_DE_LA_FINCA) return null;
  return numero;
}

/* ---------------------------------------------------------------------------
 * De un evento a un rango de noches
 * ------------------------------------------------------------------------- */

/**
 * Rango `[inicio, fin)` de noches que ocupa un evento, o `null` si no se
 * entiende.
 *
 * · **Todo el día**: Google ya da `end.date` exclusivo, así que el rango pasa
 *   tal cual. Un evento de un solo día llega como `[12, 13)`.
 * · **Con hora**: se toman los días de Bogotá de la entrada y de la salida. Un
 *   14:00 del 12 a un 11:00 del 15 son las noches 12, 13 y 14 → `[12, 15)`, que
 *   es justo la convención del hotel (la salida no se cobra). Si entrada y
 *   salida caen el mismo día —una visita de 10:00 a 17:00— el rango se queda
 *   vacío, y un rango vacío no bloquea nada: se estira a un día, porque ese día
 *   la cabaña sí está ocupada.
 */
export function rangoDelEvento(
  evento: EventoCalendario,
): { inicio: string; fin: string } | null {
  if (esFechaISO(evento.inicioFecha)) {
    const inicio = evento.inicioFecha as string;
    const fin = esFechaISO(evento.finFecha)
      ? (evento.finFecha as string)
      : sumarDias(inicio, 1);
    return { inicio, fin: fin > inicio ? fin : sumarDias(inicio, 1) };
  }

  if (!evento.inicioHora) return null;
  const inicio = diaEnBogota(evento.inicioHora);
  if (!inicio) return null;

  const finCrudo = evento.finHora ? diaEnBogota(evento.finHora) : null;
  const fin = finCrudo && finCrudo > inicio ? finCrudo : sumarDias(inicio, 1);
  return { inicio, fin };
}

/** ¿Este evento lo creó nuestro propio sitio? */
export function esEventoPropio(evento: EventoCalendario): boolean {
  return evento.origen === ORIGEN_PROPIO;
}

/**
 * Lee los eventos de UN calendario: franjas de ocupación y Días de Calma.
 *
 * Descarta lo cancelado, lo propio y lo que no tiene fechas legibles. Con
 * `cabanaDelCalendario` (subcalendario de una cabaña) todo ocupa esa cabaña y
 * el título no se mira (regla 5). Sin ella, un evento sin cabaña reconocible
 * cuyo título dice «plan día» o parecido es un Día de Calma (regla 2b) y va a
 * `diasDeCalma`, no a `ocupacion`. Las dos listas salen ordenadas por fecha.
 */
export function leerEventos(
  eventos: EventoCalendario[],
  cabanaDelCalendario: number | null = null,
): LecturaDeEventos {
  const ocupacion: OcupacionExterna[] = [];
  const diasDeCalma: DiaDeCalmaExterno[] = [];

  for (const evento of eventos) {
    if (evento.estado === "cancelled") continue;
    if (esEventoPropio(evento)) continue;

    const rango = rangoDelEvento(evento);
    if (!rango) continue;

    const titulo = evento.titulo.trim() || "Evento sin título";

    if (cabanaDelCalendario !== null) {
      ocupacion.push({
        eventoId: evento.id,
        titulo,
        inicio: rango.inicio,
        fin: rango.fin,
        cabana: cabanaDelCalendario,
        motivo: "calendario_de_cabana",
      });
      continue;
    }

    const cabana = numeroDeCabana(evento.titulo);
    if (cabana === null && esTituloDeDiaDeCalma(evento.titulo)) {
      diasDeCalma.push({
        eventoId: evento.id,
        titulo,
        inicio: rango.inicio,
        fin: rango.fin,
        personas: PERSONAS_POR_EVENTO_DIA_DE_CALMA,
      });
      continue;
    }

    ocupacion.push({
      eventoId: evento.id,
      titulo,
      inicio: rango.inicio,
      fin: rango.fin,
      cabana,
      motivo: cabana === null ? "sin_cabana" : "cabana_reconocida",
    });
  }

  ordenarFranjas(ocupacion);
  ordenarFranjas(diasDeCalma);
  return { ocupacion, diasDeCalma };
}

/**
 * Las franjas de ocupación de los eventos de un calendario general.
 * Los Días de Calma no salen: no ocupan cabaña (ver {@link leerEventos}).
 */
export function ocupacionDesdeEventos(
  eventos: EventoCalendario[],
): OcupacionExterna[] {
  return leerEventos(eventos).ocupacion;
}

/** Orden de lectura del panel: por fecha y, a igualdad, por título. */
function ordenarFranjas(franjas: { inicio: string; titulo: string }[]): void {
  franjas.sort((a, b) =>
    a.inicio === b.inicio ? a.titulo.localeCompare(b.titulo) : a.inicio < b.inicio ? -1 : 1,
  );
}

/** Los eventos de UN calendario, con la cabaña a la que está atado ese calendario. */
export type LoteDeCalendario = {
  /** Cabaña fija del calendario (1–5), o `null` si es un calendario general. */
  cabana: number | null;
  eventos: EventoCalendario[];
};

/**
 * Junta la ocupación de varios calendarios en una sola lista.
 *
 * ---------------------------------------------------------------------------
 * SUBCALENDARIOS: LA CABAÑA MANDA SOBRE EL TÍTULO
 * ---------------------------------------------------------------------------
 * Si el lote viene de un calendario atado a una cabaña, sus eventos ocupan ESA
 * cabaña y da igual lo que diga el título. Es lo que hace útil un subcalendario:
 * el equipo puede apuntar «Ana Pérez» a secas en el de la Cabaña 3 y el sitio
 * sabe de qué cabaña habla.
 *
 * ---------------------------------------------------------------------------
 * ESTO ES UNA UNIÓN, NO UNA SUMA
 * ---------------------------------------------------------------------------
 * El mismo evento puede estar en el calendario general Y en el de su cabaña
 * —son dos calendarios del mismo Gmail y nadie promete que no se dupliquen—. Un
 * evento repetido no debe ocupar «dos veces»: lo que sale de aquí son franjas, y
 * dos franjas idénticas bloquean exactamente las mismas noches que una. Para que
 * tampoco se vean dos barras iguales en el panel, se descarta la copia cuando
 * coinciden cabaña, fechas y título.
 *
 * Cuando el título SÍ difiere (en el general «Cabaña 3 · Ana» y en el
 * subcalendario «Ana»), quedan dos franjas; siguen apuntando a la misma cabaña y
 * a las mismas noches, así que la disponibilidad resultante es la misma.
 */
export function ocupacionDesdeVariosCalendarios(
  lotes: LoteDeCalendario[],
): OcupacionExterna[] {
  return lecturaDeVariosCalendarios(lotes).ocupacion;
}

/**
 * Lo mismo que {@link ocupacionDesdeVariosCalendarios}, con los Días de Calma
 * aparte (regla 2b). También se unen: un «plan día» copiado en dos calendarios
 * generales gasta el cupo una sola vez.
 */
export function lecturaDeVariosCalendarios(
  lotes: LoteDeCalendario[],
): LecturaDeEventos {
  const franjas: OcupacionExterna[] = [];
  const diasDeCalma: DiaDeCalmaExterno[] = [];
  const vistas = new Set<string>();

  for (const lote of lotes) {
    const lectura = leerEventos(lote.eventos, lote.cabana);

    for (const franja of lectura.ocupacion) {
      const clave = [
        franja.cabana ?? "todas",
        franja.inicio,
        franja.fin,
        franja.titulo.toLowerCase(),
      ].join("|");
      if (vistas.has(clave)) continue;

      vistas.add(clave);
      franjas.push(franja);
    }

    for (const dia of lectura.diasDeCalma) {
      const clave = ["dia", dia.inicio, dia.fin, dia.titulo.toLowerCase()].join("|");
      if (vistas.has(clave)) continue;

      vistas.add(clave);
      diasDeCalma.push(dia);
    }
  }

  ordenarFranjas(franjas);
  ordenarFranjas(diasDeCalma);
  return { ocupacion: franjas, diasDeCalma };
}

/* ---------------------------------------------------------------------------
 * Emparejar con las cabañas de la base
 * ------------------------------------------------------------------------- */

/** Lo mínimo que hace falta saber de una cabaña para emparejarla. */
export type CabanaConNombre = { id: string; nombre: string };

/**
 * ¿A qué cabañas de la base afecta una franja?
 *
 * Si la franja nombra un número, a la cabaña cuyo nombre lleve ese mismo
 * número («Cabaña 03» → 3). Si no lo nombra, a todas: regla 2 de arriba.
 */
export function cabanasAfectadas(
  franja: OcupacionExterna,
  cabanas: CabanaConNombre[],
): CabanaConNombre[] {
  if (franja.cabana === null) return cabanas;
  const emparejadas = cabanas.filter(
    (cabana) => numeroDeCabana(cabana.nombre) === franja.cabana,
  );
  /* Si el hotel escribió «Cabaña 4» y en la base no hay ninguna cabaña con ese
     número, se vuelve a lo conservador: bloquea todas en vez de no bloquear
     nada. Un número que no reconocemos no es permiso para vender. */
  return emparejadas.length > 0 ? emparejadas : cabanas;
}

/** ¿Se cruzan dos rangos medio-abiertos? Comparar ISO es comparar fechas. */
export function seCruzan(
  aInicio: string,
  aFin: string,
  bInicio: string,
  bFin: string,
): boolean {
  return aInicio < bFin && bInicio < aFin;
}

/**
 * Franjas que chocan con `[entrada, salida)` en una cabaña concreta.
 * `nombreCabana` es el de la base («Cabaña 03»).
 */
export function franjasQueChocan(
  franjas: OcupacionExterna[],
  nombreCabana: string,
  entrada: string,
  salida: string,
): OcupacionExterna[] {
  const numero = numeroDeCabana(nombreCabana);
  return franjas.filter((franja) => {
    if (!seCruzan(entrada, salida, franja.inicio, franja.fin)) return false;
    if (franja.cabana === null) return true;
    return numero !== null && franja.cabana === numero;
  });
}

/** Todos los días sueltos que cubre una franja, para pintar el calendario. */
export function diasDeLaFranja(franja: OcupacionExterna): string[] {
  const dias: string[] = [];
  for (let dia = franja.inicio; dia < franja.fin; dia = sumarDias(dia, 1)) {
    dias.push(dia);
    if (dias.length > 400) break; // red de seguridad ante un rango absurdo
  }
  return dias;
}

/* ---------------------------------------------------------------------------
 * El cupo del Día de Calma que gasta el calendario del hotel (regla 2b)
 * ------------------------------------------------------------------------- */

/**
 * Los Días de Calma del calendario del hotel, fecha por fecha, dentro de
 * `[desde, hasta)` (sin límites si no se pasan). Para nombrarlos en el panel.
 */
export function diasDeCalmaPorFecha(
  diasDeCalma: DiaDeCalmaExterno[],
  desde?: string,
  hasta?: string,
): Record<string, DiaDeCalmaExterno[]> {
  const porFecha: Record<string, DiaDeCalmaExterno[]> = {};
  for (const evento of diasDeCalma) {
    let vueltas = 0;
    for (let dia = evento.inicio; dia < evento.fin; dia = sumarDias(dia, 1)) {
      if (++vueltas > 400) break; // red de seguridad ante un rango absurdo
      if (desde && dia < desde) continue;
      if (hasta && dia >= hasta) break;
      (porFecha[dia] ??= []).push(evento);
    }
  }
  return porFecha;
}

/**
 * Personas que el calendario del hotel ya gasta del cupo del Día de Calma,
 * por fecha: {@link PERSONAS_POR_EVENTO_DIA_DE_CALMA} por cada «plan día».
 * Solo salen las fechas con alguien. Se SUMA a las reservas de día de la base
 * con {@link sumarPorFecha}.
 */
export function personasDeDiaDeCalmaPorFecha(
  diasDeCalma: DiaDeCalmaExterno[],
  desde?: string,
  hasta?: string,
): Record<string, number> {
  const personas: Record<string, number> = {};
  for (const [dia, eventos] of Object.entries(
    diasDeCalmaPorFecha(diasDeCalma, desde, hasta),
  )) {
    personas[dia] = eventos.reduce((suma, evento) => suma + evento.personas, 0);
  }
  return personas;
}

/** Suma, fecha por fecha, varios conteos de personas. */
export function sumarPorFecha(
  ...conteos: (Record<string, number> | Map<string, number>)[]
): Record<string, number> {
  const total: Record<string, number> = {};
  for (const conteo of conteos) {
    const entradas = conteo instanceof Map ? [...conteo.entries()] : Object.entries(conteo);
    for (const [dia, cantidad] of entradas) {
      total[dia] = (total[dia] ?? 0) + cantidad;
    }
  }
  return total;
}
