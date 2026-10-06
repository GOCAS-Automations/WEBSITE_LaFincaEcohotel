import { NextResponse } from "next/server";

import { leerSesionDelPanel } from "@/lib/admin/auth";
import { MENSAJE_SIN_ACCESO } from "@/lib/admin/roles";
import { CARPETAS_IMAGENES } from "@/lib/admin/tipos";

/**
 * Subida de imágenes al bucket `imagenes` de Supabase Storage.
 *
 * Vive BAJO `/admin` a propósito: así queda dentro del `matcher` del middleware
 * y hereda la primera capa de protección. La subida se hace en el servidor —y
 * no directamente desde el navegador— para que la escritura viaje con la sesión
 * verificada del administrador: la política de Storage solo permite INSERT a
 * una cuenta con rol del panel (`es_admin()`, migración 018), y aquí
 * `getUser()` confirma el JWT contra el servidor de Auth —y que la cuenta tiene
 * rol— antes de tocar el bucket.
 *
 * Devuelve `{ url, path }`. La `url` es la definitiva y es la que el editor de
 * galería guarda en la base.
 */

const BUCKET = "imagenes";
const MAXIMO_BYTES = 10 * 1024 * 1024;

/**
 * Formatos admitidos. GIF queda fuera a propósito: un GIF de fotografía pesa
 * muchísimo más que su equivalente en WebP y aquí solo se suben fotos.
 */
const EXTENSIONES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function POST(peticion: Request) {
  const sesion = await leerSesionDelPanel();

  if (sesion.estado === "sin-sesion") {
    return NextResponse.json(
      { error: "Tu sesión expiró. Vuelve a entrar al panel." },
      { status: 401 },
    );
  }
  if (sesion.estado === "sin-rol") {
    return NextResponse.json({ error: MENSAJE_SIN_ACCESO }, { status: 403 });
  }

  const { supabase } = sesion;

  let form: FormData;
  try {
    form = await peticion.formData();
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el archivo enviado." },
      { status: 400 },
    );
  }

  const archivo = form.get("archivo");
  if (!(archivo instanceof File)) {
    return NextResponse.json(
      { error: "No se recibió ninguna imagen." },
      { status: 400 },
    );
  }

  const extension = EXTENSIONES[archivo.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Ese formato no se admite. Usa JPG, PNG, WebP o AVIF." },
      { status: 415 },
    );
  }

  if (archivo.size > MAXIMO_BYTES) {
    return NextResponse.json(
      { error: "La imagen pesa más de 10 MB. Comprímela antes de subirla." },
      { status: 413 },
    );
  }

  const carpetaCruda = String(form.get("carpeta") ?? "");
  const carpeta = CARPETAS_IMAGENES.has(carpetaCruda) ? carpetaCruda : "sitio";

  /* Nombre opaco: evita colisiones y no expone el nombre original del archivo
     (que a veces trae rutas o datos del equipo del cliente). Como NUNCA se
     sobrescribe una foto —cada subida crea una ruta nueva—, las direcciones son
     inmutables y se pueden cachear un año sin riesgo. */
  const sello = new Date().toISOString().slice(0, 10);
  const unico = globalThis.crypto.randomUUID().slice(0, 8);
  const ruta = `${carpeta}/${sello}-${unico}.${extension}`;

  const bytes = new Uint8Array(await archivo.arrayBuffer());

  const { error } = await supabase.storage.from(BUCKET).upload(ruta, bytes, {
    contentType: archivo.type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    console.error("[panel] error subiendo a Storage:", error.message);
    return NextResponse.json(
      { error: `No se pudo subir la imagen: ${error.message}` },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(ruta);

  return NextResponse.json({ url: publicUrl, path: ruta });
}
