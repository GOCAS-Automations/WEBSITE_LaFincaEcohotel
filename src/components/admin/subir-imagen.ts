/**
 * Cliente de la subida de imágenes, compartido por `CampoImagen` y
 * `EditorGaleria`.
 *
 * Se llama al route handler `/admin/api/galeria/subir` en vez de escribir en
 * Storage desde el navegador con la clave anónima: la política del bucket solo
 * permite escribir a `authenticated`, y allí el servidor verifica el JWT antes
 * de tocar nada.
 */

export const MAXIMO_BYTES = 10 * 1024 * 1024;

export type CarpetaSubida =
  | "alojamientos"
  | "experiencias"
  | "adicionales"
  | "sitio"
  | "galeria";

/** Sube un archivo y devuelve su dirección pública definitiva. */
export async function subirImagen(
  archivo: File,
  carpeta: CarpetaSubida,
): Promise<string> {
  if (archivo.size > MAXIMO_BYTES) {
    throw new Error(
      `«${archivo.name}» pesa más de 10 MB. Comprímela antes de subirla.`,
    );
  }

  const cuerpo = new FormData();
  cuerpo.append("archivo", archivo);
  cuerpo.append("carpeta", carpeta);

  const respuesta = await fetch("/admin/api/galeria/subir", {
    method: "POST",
    body: cuerpo,
  });

  const carga: unknown = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const mensaje =
      typeof carga === "object" &&
      carga !== null &&
      typeof (carga as { error?: unknown }).error === "string"
        ? (carga as { error: string }).error
        : "No se pudo subir la imagen.";
    throw new Error(mensaje);
  }

  const url =
    typeof carga === "object" &&
    carga !== null &&
    typeof (carga as { url?: unknown }).url === "string"
      ? (carga as { url: string }).url
      : null;

  if (!url) {
    /* Una respuesta "correcta" sin JSON suele significar que el middleware
       redirigió al login porque la sesión caducó. */
    throw new Error(
      "No se pudo completar la subida. Puede que tu sesión haya expirado: recarga la página y vuelve a entrar.",
    );
  }

  return url;
}

/** ¿Es una dirección aceptable para pegar a mano? */
export function esDireccionValida(valor: string): boolean {
  return /^https?:\/\//i.test(valor) || (valor.startsWith("/") && !valor.startsWith("//"));
}

export const AYUDA_DIRECCION =
  "La dirección debe empezar por https:// (o por / si la imagen ya está en el sitio).";
