/**
 * Festivos de Colombia.
 *
 * ---------------------------------------------------------------------------
 * PARA QUÉ SIRVE ESTO EN UN HOTEL
 * ---------------------------------------------------------------------------
 * Las tarifas de La Finca no dependen solo del día de la semana: el plan Entre
 * Semana vale de lunes a jueves, y los planes Estándar y Premium de viernes a
 * domingo **y festivos** (§3 de `docs/DATOS_CLIENTE.md`). Un lunes festivo se
 * cobra como un domingo. Sin esta tabla, el calendario del motor de reservas
 * dejaría vender un lunes de puente al precio de entre semana, y eso no lo
 * arregla después ningún panel.
 *
 * ---------------------------------------------------------------------------
 * LA LEY
 * ---------------------------------------------------------------------------
 * Ley 51 de 1983, conocida como **Ley Emiliani**. Son tres grupos:
 *
 * 1. **FIJOS.** Se celebran el día exacto, caiga cuando caiga:
 *    1 de enero, 1 de mayo, 20 de julio, 7 de agosto, 8 de diciembre y
 *    25 de diciembre.
 *
 * 2. **MÓVILES QUE NO SE TRASLADAN.** Dependen de la Pascua y conservan su día:
 *    Jueves Santo (Pascua − 3) y Viernes Santo (Pascua − 2).
 *
 * 3. **TRASLADABLES AL LUNES SIGUIENTE.** Si no caen en lunes, se corren al
 *    lunes inmediatamente posterior. Son once:
 *      · De fecha fija: Reyes (6 ene), San José (19 mar), San Pedro y San Pablo
 *        (29 jun), Asunción (15 ago), Día de la Raza (12 oct), Todos los Santos
 *        (1 nov) e Independencia de Cartagena (11 nov).
 *      · De cálculo pascual: Ascensión (Pascua + 39), Corpus Christi
 *        (Pascua + 60) y Sagrado Corazón (Pascua + 68).
 *
 * Los tres últimos ya se calculan sobre un jueves, así que su traslado siempre
 * los lleva al lunes siguiente: +4 días. Aun así se pasa por la misma función
 * de traslado, para no depender de esa coincidencia.
 *
 * ---------------------------------------------------------------------------
 * DECISIONES DE IMPLEMENTACIÓN
 * ---------------------------------------------------------------------------
 * · **Se calcula, no se copia una lista.** Una tabla de festivos escrita a mano
 *   caduca cada 31 de diciembre, y quien la mantenga se va a olvidar el año que
 *   el hotel esté lleno. Con el algoritmo de Pascua no hay nada que mantener.
 * · **Módulo PURO.** Ni una importación del proyecto, ni `Date.now()`, ni zona
 *   horaria: entra un año o una fecha `AAAA-MM-DD` y sale otra. Eso es lo que
 *   permite probarlo entero y usarlo igual en el servidor y en el navegador.
 * · **Aritmética de calendario en UTC al mediodía**, como el resto del sitio
 *   (ver `src/lib/utils/formato.ts`): el mediodía deja doce horas de margen a
 *   cada lado, así que ningún desfase de zona horaria corre un día.
 * · **Resultados memorizados por año.** El calendario del motor pinta seis
 *   semanas y pregunta por cada casilla; recalcular la Pascua 42 veces por mes
 *   es gratis pero innecesario.
 */

/** Fecha plana `AAAA-MM-DD`, igual que en el resto del proyecto. */
export type FechaISO = string;

/* ===========================================================================
 * Aritmética de calendario
 * ======================================================================== */

function aUTC(anio: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(anio, mes - 1, dia, 12, 0, 0));
}

function aISO(fecha: Date): FechaISO {
  return fecha.toISOString().slice(0, 10);
}

function sumar(fecha: Date, dias: number): Date {
  const copia = new Date(fecha.getTime());
  copia.setUTCDate(copia.getUTCDate() + dias);
  return copia;
}

/**
 * Corre la fecha al lunes siguiente si no cae ya en lunes (Ley Emiliani).
 *
 * Ojo con el caso «ya es lunes»: la ley dice que se traslada *al lunes
 * siguiente* solo cuando NO cae en lunes. Un 6 de enero que cae en lunes se
 * celebra ese mismo 6 de enero, no el 13.
 */
function trasladarALunes(fecha: Date): Date {
  const dia = fecha.getUTCDay(); // 0 = domingo, 1 = lunes
  if (dia === 1) return fecha;
  return sumar(fecha, (8 - dia) % 7);
}

/**
 * Domingo de Pascua del año dado, por el **algoritmo de Butcher** (calendario
 * gregoriano). Es el de Wikipedia y el que usan las bibliotecas serias; se
 * escribe aquí entero porque traer una dependencia para veinte líneas de
 * aritmética entera sería peor negocio.
 */
export function domingoDePascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return aUTC(anio, mes, dia);
}

/* ===========================================================================
 * La tabla de festivos
 * ======================================================================== */

export type Festivo = {
  fecha: FechaISO;
  nombre: string;
  /** `true` si se movió al lunes por la Ley Emiliani. */
  trasladado: boolean;
};

const cachePorAnio = new Map<number, Festivo[]>();

/**
 * Los festivos de un año, ordenados por fecha y SIN fechas repetidas.
 *
 * Normalmente son 18: seis fijos, dos de Semana Santa y diez trasladables
 * (siete de fecha fija y tres pascuales).
 *
 * PERO NO SIEMPRE. Hay años en que dos celebraciones distintas terminan en el
 * mismo lunes y Colombia tiene 17 días festivos en vez de 18. Pasa cuando el
 * Sagrado Corazón (Pascua + 68, trasladado) cae en el mismo lunes que San Pedro
 * y San Pablo (29 de junio, trasladado): ocurrió en **2025** —los dos el lunes
 * 30 de junio— y vuelve a ocurrir en 2030, 2038, 2041, 2052 y 2057.
 *
 * Aquí se fusionan en UNA sola entrada con los dos nombres. Devolver la fecha
 * dos veces no cambiaría el resultado de `esFestivo()`, pero sí haría que
 * cualquier recuento («este año hay N festivos») mintiera, y que un listado
 * pintara el mismo día dos veces.
 */
export function festivosDeColombia(anio: number): Festivo[] {
  const enCache = cachePorAnio.get(anio);
  if (enCache) return enCache;

  const pascua = domingoDePascua(anio);
  const lista: Festivo[] = [];

  const fijo = (mes: number, dia: number, nombre: string) => {
    lista.push({ fecha: aISO(aUTC(anio, mes, dia)), nombre, trasladado: false });
  };

  const movilFijo = (fecha: Date, nombre: string) => {
    lista.push({ fecha: aISO(fecha), nombre, trasladado: false });
  };

  const alLunes = (original: Date, nombre: string) => {
    const movida = trasladarALunes(original);
    lista.push({
      fecha: aISO(movida),
      nombre,
      trasladado: movida.getTime() !== original.getTime(),
    });
  };

  /* 1. Fijos. */
  fijo(1, 1, "Año Nuevo");
  fijo(5, 1, "Día del Trabajo");
  fijo(7, 20, "Día de la Independencia");
  fijo(8, 7, "Batalla de Boyacá");
  fijo(12, 8, "Día de la Inmaculada Concepción");
  fijo(12, 25, "Navidad");

  /* 2. Semana Santa: móviles, sin traslado. */
  movilFijo(sumar(pascua, -3), "Jueves Santo");
  movilFijo(sumar(pascua, -2), "Viernes Santo");

  /* 3. Trasladables al lunes siguiente. */
  alLunes(aUTC(anio, 1, 6), "Día de los Reyes Magos");
  alLunes(aUTC(anio, 3, 19), "Día de San José");
  alLunes(sumar(pascua, 39), "Ascensión del Señor");
  alLunes(sumar(pascua, 60), "Corpus Christi");
  alLunes(sumar(pascua, 68), "Sagrado Corazón de Jesús");
  alLunes(aUTC(anio, 6, 29), "San Pedro y San Pablo");
  alLunes(aUTC(anio, 8, 15), "Asunción de la Virgen");
  alLunes(aUTC(anio, 10, 12), "Día de la Raza");
  alLunes(aUTC(anio, 11, 1), "Día de Todos los Santos");
  alLunes(aUTC(anio, 11, 11), "Independencia de Cartagena");

  lista.sort((a, b) => a.fecha.localeCompare(b.fecha));

  /* Fusión de las coincidencias (ver la nota de arriba). */
  const unicos: Festivo[] = [];
  for (const festivo of lista) {
    const anterior = unicos.at(-1);
    if (anterior && anterior.fecha === festivo.fecha) {
      anterior.nombre = `${anterior.nombre} y ${festivo.nombre}`;
      anterior.trasladado = anterior.trasladado || festivo.trasladado;
      continue;
    }
    unicos.push(festivo);
  }

  cachePorAnio.set(anio, unicos);
  return unicos;
}

const indicePorAnio = new Map<number, Map<FechaISO, string>>();

function indiceDe(anio: number): Map<FechaISO, string> {
  const enCache = indicePorAnio.get(anio);
  if (enCache) return enCache;
  const indice = new Map<FechaISO, string>();
  for (const festivo of festivosDeColombia(anio)) {
    indice.set(festivo.fecha, festivo.nombre);
  }
  indicePorAnio.set(anio, indice);
  return indice;
}

/** `true` si esa fecha `AAAA-MM-DD` es festivo en Colombia. */
export function esFestivo(fecha: FechaISO): boolean {
  return indiceDe(Number(fecha.slice(0, 4))).has(fecha);
}

/** Nombre del festivo de esa fecha, o `null` si es un día común. */
export function nombreDelFestivo(fecha: FechaISO): string | null {
  return indiceDe(Number(fecha.slice(0, 4))).get(fecha) ?? null;
}

/* ===========================================================================
 * La regla del hotel: qué noche es de qué tipo
 * ======================================================================== */

/**
 * Tipo de una NOCHE.
 *
 * Una noche se identifica por la fecha de su **check-in**: quien entra el
 * viernes y sale el sábado ha dormido «una noche de fin de semana», aunque el
 * sábado sea otro día. Es como lo cuenta el hotel y como lo cuenta la tabla
 * `tarifas`.
 */
export type TipoDeNoche = "entre-semana" | "fin-de-semana";

/**
 * Día de la semana según ISO: 1 = lunes … 7 = domingo.
 *
 * Se repite aquí —existe también en `src/lib/utils/formato.ts`— para que este
 * módulo siga siendo puro y sin importaciones. Son tres líneas.
 */
export function diaISO(fecha: FechaISO): number {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const numero = aUTC(anio, mes, dia).getUTCDay();
  return numero === 0 ? 7 : numero;
}

/**
 * Clasifica una noche.
 *
 * · **entre-semana**: lunes, martes, miércoles o jueves que NO sea festivo.
 * · **fin-de-semana**: viernes, sábado, domingo o cualquier festivo.
 *
 * TODO (Amapola / Juan Camilo): la **víspera de un festivo entre semana**
 * —dormir el domingo para disfrutar el lunes festivo ya está cubierto, pero un
 * miércoles víspera de un jueves festivo, no—. El hotel no ha confirmado si esa
 * noche se cobra como fin de semana. Mientras tanto NO se trata como tal, que
 * es la opción que no le cobra de más a nadie; el interruptor está a un
 * booleano de distancia (`VISPERA_CUENTA_COMO_FIN_DE_SEMANA`).
 */
export const VISPERA_CUENTA_COMO_FIN_DE_SEMANA = false;

export function tipoDeNoche(fecha: FechaISO): TipoDeNoche {
  if (esFestivo(fecha)) return "fin-de-semana";

  const dia = diaISO(fecha);
  if (dia >= 5) return "fin-de-semana";

  if (VISPERA_CUENTA_COMO_FIN_DE_SEMANA) {
    /* La víspera: la noche anterior a un festivo que cae entre semana. */
    const [anio, mes, diaMes] = fecha.split("-").map(Number);
    const siguiente = aISO(sumar(aUTC(anio, mes, diaMes), 1));
    if (esFestivo(siguiente)) return "fin-de-semana";
  }

  return "entre-semana";
}

/** Etiqueta en español para explicarle al huésped por qué un día no se puede. */
export function etiquetaTipoDeNoche(tipo: TipoDeNoche): string {
  return tipo === "entre-semana"
    ? "noche de entre semana"
    : "noche de fin de semana o festivo";
}
