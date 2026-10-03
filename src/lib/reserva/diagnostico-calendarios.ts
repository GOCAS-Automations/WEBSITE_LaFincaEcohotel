/**
 * «¿Está viva la conexión con Google Calendar?», armado para enseñarlo.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTE MÓDULO EXISTE, Y POR QUÉ ES PURO
 * ---------------------------------------------------------------------------
 * El diagnóstico se mira desde el panel: es donde el equipo del hotel comprueba
 * si el sitio está leyendo su calendario. Un falso negativo ahí es peor que no
 * tener diagnóstico, porque manda a alguien a buscar un problema que no existe.
 *
 * Y hubo uno. La primera versión preguntaba a `calendarList.list` qué
 * calendarios «ve» la cuenta de servicio y daba por perdido todo lo que no
 * saliera en esa lista. Pero `calendarList` son las **suscripciones** de la
 * cuenta, no sus **permisos**: cuando el hotel comparte un calendario con una
 * cuenta de servicio, la ACL se concede y la lista se queda vacía, porque nadie
 * «acepta» nada —una cuenta de servicio no tiene interfaz donde aceptar—. Con
 * los siete calendarios del hotel ya compartidos y leyéndose perfectamente, el
 * panel decía «ninguno todavía».
 *
 * De ahí la regla de este módulo:
 *
 *   **La verdad es la lectura de eventos de cada calendario configurado.**
 *   `calendarList` solo sirve para DESCUBRIR identificadores que nadie nos ha
 *   dado, y su silencio no prueba nada.
 *
 * Aquí no se habla con Google: entran las comprobaciones ya hechas y sale lo que
 * se pinta. Así se puede probar con Vitest, que es lo que no pasaba cuando esta
 * lógica vivía pegada a la llamada de red.
 *
 * ⚠️ NO importar `server-only` ni alias `@/` aquí: es un módulo puro y lo
 * cargan tanto Vitest como `scripts/verificar-calendarios.mjs`.
 */

import type { ConfiguracionCalendarios } from "./calendarios-config";

/**
 * Resultado de preguntarle a Google por un calendario concreto.
 *
 * Es la forma que devuelve `comprobarCalendario()` en
 * `src/lib/google/calendario.ts`, redeclarada aquí sin dependencias para que
 * este módulo siga siendo puro.
 */
export type ComprobacionDeCalendario =
  | {
      ok: true;
      /** Nombre del calendario en Google; `null` si no lo devolvió. */
      nombre: string | null;
      /** `owner`, `writer`, `reader` o `freeBusyReader`. */
      acceso: string | null;
      puedeEscribir: boolean;
    }
  | { ok: false; mensaje: string };

/** Un calendario al que la cuenta de servicio está suscrita. */
export type CalendarioSuscrito = {
  id: string;
  nombre: string;
  /** Permiso, tal como lo llama Google. */
  acceso: string;
};

/** Un calendario de la configuración, ya comprobado contra Google. */
export type CalendarioDiagnosticado = {
  id: string;
  /** Cabaña fija (1–5), o `null` si es un calendario general. */
  cabana: number | null;
  /** Nombre en Google; `null` si no respondió o Google no lo dio. */
  nombre: string | null;
  /** Permiso real; `null` si no respondió. */
  acceso: string | null;
  /** Cierto si la cuenta del sitio puede apuntar eventos en él. */
  puedeEscribir: boolean;
  /** Cierto si la lectura de eventos funcionó. **Esta** es la prueba de acceso. */
  responde: boolean;
  /** Por qué no respondió, en español; `null` si respondió. */
  error: string | null;
  /** Cierto si es el calendario donde se apuntan las reservas del panel. */
  deEscritura: boolean;
};

export type DiagnosticoCalendario = {
  credencial: boolean;
  /** El correo con el que hay que compartir cada calendario. */
  correoCuenta: string | null;
  configurado: boolean;
  /** Los calendarios que el sitio LEE, en su orden, comprobados uno por uno. */
  configurados: CalendarioDiagnosticado[];
  /** Cuántos de ellos respondieron. */
  responden: number;
  escribirEn: string | null;
  escrituraForzada: boolean;
  escrituraFueraDeLista: boolean;
  /**
   * El calendario donde se ESCRIBE, comprobado. `null` si no hay ninguno
   * configurado. Puede no estar en `configurados` si se fijó aparte con
   * `GOOGLE_CALENDAR_ESCRIBIR_EN`.
   */
  escritura: CalendarioDiagnosticado | null;
  /**
   * Cierto solo cuando Google contestó y dijo que la cuenta **no** puede
   * escribir ahí. Es el aviso grave del panel: sin permiso de escritura, las
   * reservas que el equipo cree desde el panel no se apuntan en ningún
   * calendario, y nadie se da cuenta hasta que alguien lo echa en falta.
   */
  escrituraSinPermiso: boolean;
  /** Frases en español para enseñar: configuración rara, calendarios caídos. */
  avisos: string[];
  /**
   * Calendarios a los que la cuenta está suscrita y que NO están configurados:
   * identificadores listos para copiar. `null` si no se pudo preguntar.
   *
   * Que esto venga vacío **no** significa que no haya nada compartido: ver la
   * cabecera del módulo.
   */
  suscritosSinConfigurar: CalendarioSuscrito[] | null;
  /** Por qué no se pudo preguntar por las suscripciones, si es el caso. */
  errorSuscritos: string | null;
};

function mismoId(a: string | null | undefined, b: string | null | undefined): boolean {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

/** Los identificadores que hay que comprobar: los que se leen y el de escritura. */
export function calendariosAComprobar(config: ConfiguracionCalendarios): string[] {
  const ids = config.calendarios.map((calendario) => calendario.id);
  if (
    config.escribirEn &&
    !ids.some((id) => mismoId(id, config.escribirEn))
  ) {
    ids.push(config.escribirEn);
  }
  return ids;
}

function diagnosticar(
  id: string,
  cabana: number | null,
  deEscritura: boolean,
  comprobacion: ComprobacionDeCalendario | undefined,
): CalendarioDiagnosticado {
  if (!comprobacion) {
    /* No se llegó a preguntar (no hay credencial, normalmente): no se afirma ni
       que responda ni que falle. */
    return {
      id,
      cabana,
      nombre: null,
      acceso: null,
      puedeEscribir: false,
      responde: false,
      error: null,
      deEscritura,
    };
  }
  if (!comprobacion.ok) {
    return {
      id,
      cabana,
      nombre: null,
      acceso: null,
      puedeEscribir: false,
      responde: false,
      error: comprobacion.mensaje,
      deEscritura,
    };
  }
  return {
    id,
    cabana,
    nombre: comprobacion.nombre,
    acceso: comprobacion.acceso,
    puedeEscribir: comprobacion.puedeEscribir,
    responde: true,
    error: null,
    deEscritura,
  };
}

/** Cómo se dice un permiso de Google en español, para el panel. */
export function accesoEnEspanol(acceso: string | null): string {
  switch (acceso) {
    case "owner":
      return "puede leer y escribir (es suyo)";
    case "writer":
      return "puede leer y escribir";
    case "reader":
      return "solo lectura";
    case "freeBusyReader":
      return "solo ve si está ocupado, no los títulos";
    case null:
      return "sin comprobar";
    default:
      return acceso;
  }
}

/**
 * El aviso grave, escrito una sola vez.
 *
 * Lo enseñan dos sitios —la franja de estado del panel y el desplegable de
 * diagnóstico— y tienen que decir exactamente lo mismo, porque es la frase que
 * alguien va a reenviar por WhatsApp al hotel para que arregle el permiso.
 */
export function avisoDeEscrituraSinPermiso(
  nombreOId: string,
  acceso: string | null,
): string {
  return (
    `El calendario donde el panel apunta las reservas («${nombreOId}») está ` +
    `compartido con la cuenta del sitio en modo «${accesoEnEspanol(acceso)}». ` +
    "Mientras siga así, las reservas que se creen desde el panel NO se apuntarán " +
    "en ningún calendario. Hay que volver a compartirlo dándole «Hacer cambios en eventos»."
  );
}

/**
 * Junta la configuración con lo que Google contestó.
 *
 * `comprobaciones` va indexado por identificador en minúsculas, igual que se
 * comparan los identificadores en todo el proyecto (Google no distingue
 * mayúsculas en ellos).
 */
export function armarDiagnostico(entrada: {
  credencial: boolean;
  correoCuenta: string | null;
  config: ConfiguracionCalendarios;
  comprobaciones: Record<string, ComprobacionDeCalendario>;
  suscritos: CalendarioSuscrito[] | null;
  errorSuscritos: string | null;
}): DiagnosticoCalendario {
  const { credencial, correoCuenta, config, comprobaciones } = entrada;
  const de = (id: string) => comprobaciones[id.toLowerCase()];

  const configurados = config.calendarios.map((calendario) =>
    diagnosticar(
      calendario.id,
      calendario.cabana,
      mismoId(calendario.id, config.escribirEn),
      de(calendario.id),
    ),
  );

  const escritura = config.escribirEn
    ? (configurados.find((calendario) => calendario.deEscritura) ??
      diagnosticar(config.escribirEn, null, true, de(config.escribirEn)))
    : null;

  /* Solo se afirma que falta el permiso cuando Google contestó: si la lectura
     falló, el problema que hay que enseñar es ese, no un permiso que no se pudo
     consultar. */
  const escrituraSinPermiso = Boolean(
    escritura && escritura.responde && !escritura.puedeEscribir,
  );

  const avisos = [...config.avisos];

  if (escrituraSinPermiso && escritura) {
    avisos.push(
      avisoDeEscrituraSinPermiso(escritura.nombre ?? escritura.id, escritura.acceso),
    );
  }

  const caidos = configurados.filter(
    (calendario) => calendario.error !== null,
  );
  for (const calendario of caidos) {
    avisos.push(`No se pudo leer el calendario «${calendario.id}»: ${calendario.error}`);
  }

  const estanConfigurados = new Set(
    config.calendarios.map((calendario) => calendario.id.toLowerCase()),
  );
  if (config.escribirEn) estanConfigurados.add(config.escribirEn.toLowerCase());

  return {
    credencial,
    correoCuenta,
    configurado: credencial && config.calendarios.length > 0,
    configurados,
    responden: configurados.filter((calendario) => calendario.responde).length,
    escribirEn: config.escribirEn,
    escrituraForzada: config.escrituraForzada,
    escrituraFueraDeLista: config.escrituraFueraDeLista,
    escritura,
    escrituraSinPermiso,
    avisos,
    suscritosSinConfigurar:
      entrada.suscritos?.filter(
        (suscrito) => !estanConfigurados.has(suscrito.id.toLowerCase()),
      ) ?? null,
    errorSuscritos: entrada.errorSuscritos,
  };
}
