"use server";

import { redirect } from "next/navigation";

import { rutaDeTipo } from "./rutas";
import { requireAdmin } from "@/lib/admin/auth";
import { obtenerExtra } from "@/lib/admin/datos";
import { limpiarImagenesHuerfanas } from "@/lib/admin/limpieza-storage";
import { refrescarPanel, revalidarSitioPublico } from "@/lib/admin/revalidar";
import { TIPOS_EXTRA, estadoOk, type EstadoAccion } from "@/lib/admin/tipos";
import {
  casilla,
  ejecutarAccion,
  enteroRequerido,
  enumRequerido,
  precioRequerido,
  textoOpcional,
  textoRequerido,
  traducirErrorPostgres,
  urlImagenOpcional,
} from "@/lib/admin/validacion";
import type { TipoExtra } from "@/lib/tipos/basedatos";

/**
 * Experiencias y adicionales comparten tabla (`extras`) y comparten estas
 * acciones: solo cambia la columna `tipo` y, por tanto, la sección del panel a
 * la que se vuelve. El tipo llega en el formulario y se valida contra la lista
 * cerrada, así que no puede colarse un valor inventado.
 */

const NOMBRE_SINGULAR: Record<TipoExtra, string> = {
  experiencia: "experiencia",
  adicional: "adicional",
};

export async function guardarExtraAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    const { supabase } = await requireAdmin();

    const tipo = enumRequerido(formData, "tipo", "Tipo", TIPOS_EXTRA);
    const id = String(formData.get("id") ?? "").trim();
    const nombre = textoRequerido(formData, "nombre", "Nombre", 160);
    const imagen = urlImagenOpcional(formData, "imagen_url");

    const datos = {
      tipo,
      nombre,
      descripcion: textoOpcional(formData, "descripcion", 4000),
      /* Un adicional sí puede ser de cortesía ($0); negativo, nunca. */
      precio: precioRequerido(formData, "precio", "Precio", { min: 0 }),
      imagen_url: imagen || null,
      activo: casilla(formData, "activo"),
      orden: enteroRequerido(formData, "orden", "Orden", { min: 0, max: 9999 }),
    };

    const contextoErrores = {
      unico: `Ya existe otra ${NOMBRE_SINGULAR[tipo]} con ese nombre. Cámbialo por uno distinto.`,
    };

    if (id) {
      const anterior = await obtenerExtra(supabase, id);

      const { error } = await supabase.from("extras").update(datos).eq("id", id);
      if (error) throw traducirErrorPostgres(error, contextoErrores);

      if (anterior?.imagen_url && anterior.imagen_url !== datos.imagen_url) {
        await limpiarImagenesHuerfanas(supabase, [anterior.imagen_url]);
      }

      refrescarPanel(rutaDeTipo(tipo), `${rutaDeTipo(tipo)}/${id}`);
      revalidarSitioPublico();
      return estadoOk("Cambios guardados. El sitio ya los muestra.");
    }

    const { data, error } = await supabase
      .from("extras")
      .insert(datos)
      .select("id")
      .single();
    if (error) throw traducirErrorPostgres(error, contextoErrores);

    refrescarPanel(rutaDeTipo(tipo));
    revalidarSitioPublico();
    redirect(
      `${rutaDeTipo(tipo)}/${data.id}?ok=${encodeURIComponent(
        `«${nombre}» creada. Ya aparece en el sitio si la dejaste activa.`,
      )}`,
    );
  });
}

export async function alternarActivoExtraAction(formData: FormData) {
  const { supabase } = await requireAdmin();

  const tipo = String(formData.get("tipo") ?? "experiencia") as TipoExtra;
  const ruta = rutaDeTipo(tipo);
  const id = String(formData.get("id") ?? "").trim();
  const activo = String(formData.get("activo") ?? "") === "true";

  const { error } = await supabase.from("extras").update({ activo }).eq("id", id);

  if (error) {
    redirect(`${ruta}?error=${encodeURIComponent(error.message)}`);
  }

  refrescarPanel(ruta);
  revalidarSitioPublico();
  redirect(
    `${ruta}?ok=${encodeURIComponent(
      activo
        ? "Vuelve a verse en el sitio."
        : "Quedó pausada: ya no aparece en el sitio, pero no se borró nada.",
    )}`,
  );
}

export async function eliminarExtraAction(formData: FormData) {
  const { supabase } = await requireAdmin();

  const tipo = String(formData.get("tipo") ?? "experiencia") as TipoExtra;
  const ruta = rutaDeTipo(tipo);
  const id = String(formData.get("id") ?? "").trim();

  // Borrado defensivo: `reserva_extras.extra_id` no tiene ON DELETE CASCADE.
  const { count, error: errorConteo } = await supabase
    .from("reserva_extras")
    .select("extra_id", { count: "exact", head: true })
    .eq("extra_id", id);

  if (errorConteo) {
    redirect(`${ruta}?error=${encodeURIComponent(errorConteo.message)}`);
  }

  if ((count ?? 0) > 0) {
    redirect(
      `${ruta}?error=${encodeURIComponent(
        `No se puede borrar: está incluida en ${count} reserva(s). Pausala en vez de borrarla para conservar el historial.`,
      )}`,
    );
  }

  const anterior = await obtenerExtra(supabase, id);

  const { error } = await supabase.from("extras").delete().eq("id", id);
  if (error) {
    const mensaje =
      error.code === "23503"
        ? "No se puede borrar: está incluida en alguna reserva."
        : error.message;
    redirect(`${ruta}?error=${encodeURIComponent(mensaje)}`);
  }

  if (anterior?.imagen_url) {
    await limpiarImagenesHuerfanas(supabase, [anterior.imagen_url]);
  }

  refrescarPanel(ruta);
  revalidarSitioPublico();
  redirect(`${ruta}?ok=${encodeURIComponent("Eliminada.")}`);
}
