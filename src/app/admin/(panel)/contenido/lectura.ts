/**
 * Lectura defensiva del jsonb del CMS.
 *
 * Las filas de `contenido` son jsonb libre: puede faltar una clave, puede venir
 * un número donde el formulario espera texto, puede venir un objeto en vez de
 * una lista. Estos ayudantes devuelven SIEMPRE el tipo que el formulario
 * necesita, para que una fila rara no tumbe una pantalla del panel.
 */

export function texto(
  valor: Record<string, unknown>,
  clave: string,
): string {
  const dato = valor[clave];
  if (typeof dato === "string") return dato;
  if (typeof dato === "number") return String(dato);
  return "";
}

export function numero(
  valor: Record<string, unknown>,
  clave: string,
  respaldo: number,
): number {
  const dato = valor[clave];
  return typeof dato === "number" && Number.isFinite(dato) ? dato : respaldo;
}

/** Lista de textos (`parrafos`, `llegar_indicaciones`, `palabras_clave`). */
export function textos(
  valor: Record<string, unknown>,
  clave: string,
): string[] {
  const dato = valor[clave];
  if (!Array.isArray(dato)) return [];
  return dato.filter((item): item is string => typeof item === "string");
}

/** Lista de fichas (`items`, `datos`, `instalaciones`, `pasos`). */
export function objetos(
  valor: Record<string, unknown>,
  clave: string,
  campos: readonly string[],
): Record<string, string>[] {
  const dato = valor[clave];
  if (!Array.isArray(dato)) return [];
  return dato.flatMap((item): Record<string, string>[] => {
    if (typeof item !== "object" || item === null) return [];
    const origen = item as Record<string, unknown>;
    const salida: Record<string, string> = {};
    for (const campo of campos) {
      const bruto = origen[campo];
      salida[campo] =
        typeof bruto === "string"
          ? bruto
          : typeof bruto === "number"
            ? String(bruto)
            : "";
    }
    return [salida];
  });
}

/** Galería `[{ url, alt }]`. */
export function galeria(
  valor: Record<string, unknown>,
  clave: string,
): { url: string; alt: string }[] {
  const dato = valor[clave];
  if (!Array.isArray(dato)) return [];
  return dato.flatMap((item): { url: string; alt: string }[] => {
    if (typeof item !== "object" || item === null) return [];
    const { url, alt } = item as Record<string, unknown>;
    if (typeof url !== "string" || !url) return [];
    return [{ url, alt: typeof alt === "string" ? alt : "" }];
  });
}

/** Sub-objeto anidado (cada página dentro de `heroes.listados`). */
export function objeto(
  valor: Record<string, unknown>,
  clave: string,
): Record<string, unknown> {
  const dato = valor[clave];
  return typeof dato === "object" && dato !== null && !Array.isArray(dato)
    ? (dato as Record<string, unknown>)
    : {};
}

/** Párrafos guardados → texto para el textarea (una línea en blanco entre cada uno). */
export function comoTextarea(parrafos: string[]): string {
  return parrafos.join("\n\n");
}

/**
 * Las secciones de un documento legal, listas para el editor.
 *
 * Cada sección llega con `parrafos` como arreglo y el editor necesita UNA
 * cadena por caja de texto: se juntan con una línea en blanco, que es
 * exactamente por donde vuelve a cortarlas `aParrafosConLineas()` al guardar.
 * Los saltos de línea sueltos —las viñetas— se conservan tal cual.
 */
export function seccionesLegales(
  valor: Record<string, unknown>,
): { titulo: string; parrafos: string }[] {
  const dato = valor.secciones;
  if (!Array.isArray(dato)) return [];

  return dato.flatMap((item): { titulo: string; parrafos: string }[] => {
    if (typeof item !== "object" || item === null) return [];
    const origen = item as Record<string, unknown>;
    return [
      {
        titulo: texto(origen, "titulo"),
        parrafos: comoTextarea(textos(origen, "parrafos")),
      },
    ];
  });
}
