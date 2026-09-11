"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin/auth";
import { galeriaDeAlojamiento } from "@/lib/admin/datos";
import { limpiarImagenesHuerfanas } from "@/lib/admin/limpieza-storage";
import { refrescarPanel, revalidarSitioPublico } from "@/lib/admin/revalidar";
import { esSlugValido, slugificar } from "@/lib/admin/slug";
import { estadoOk, type EstadoAccion } from "@/lib/admin/tipos";
import {
  ErrorDeValidacion,
  casilla,
  ejecutarAccion,
  enteroOpcional,
  enteroRequerido,
  listaGaleria,
  listaTexto,
  textoOpcional,
  textoRequerido,
  traducirErrorPostgres,
} from "@/lib/admin/validacion";

const RUTA_LISTA = "/admin/alojamientos";

function refrescar(id?: string) {
  refrescarPanel(RUTA_LISTA, ...(id ? [`${RUTA_LISTA}/${id}`] : []));
}

/**
 * Crea o actualiza una cabaña.
 *
 * El mismo formulario sirve para las dos cosas: si llega `id`, es edición; si
 * no, se crea y se redirige a la ficha para que se le puedan añadir las fotos.
 *
 * Guarda a la vez tres cosas que en la base viven en tablas distintas:
 *   · la fila de `alojamientos`,
 *   · su galería (filas de `imagenes`, que se reescriben enteras en orden),
 *   · sus tarifas base (una fila de `tarifas` por plan, sin vigencia).
 * Hacerlo en un solo guardado es una decisión de interfaz: para el cliente,
 * "la cabaña" es una sola cosa.
 */
export async function guardarAlojamientoAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    const { supabase } = await requireAdmin();

    const id = String(formData.get("id") ?? "").trim();
    const nombre = textoRequerido(formData, "nombre", "Nombre", 120);

    const slugCrudo = String(formData.get("slug") ?? "").trim();
    const slug = slugificar(slugCrudo || nombre);
    if (!esSlugValido(slug)) {
      throw new ErrorDeValidacion(
        "La dirección web solo puede llevar letras minúsculas, números y guiones.",
      );
    }

    const galeria = listaGaleria(formData, "galeria");

    const datos = {
      nombre,
      slug,
      descripcion: textoOpcional(formData, "descripcion", 6000),
      capacidad: enteroRequerido(formData, "capacidad", "Capacidad", {
        min: 1,
        max: 30,
      }),
      amenidades: listaTexto(formData, "amenidades"),
      orden: enteroRequerido(formData, "orden", "Orden", { min: 0, max: 9999 }),
      activo: casilla(formData, "activo"),
    };

    let alojamientoId = id;
    let creada = false;

    if (id) {
      const { error } = await supabase
        .from("alojamientos")
        .update(datos)
        .eq("id", id);
      if (error) {
        throw traducirErrorPostgres(error, {
          unico:
            "Ya existe otra cabaña con esa dirección web. Cámbiala por una distinta.",
        });
      }
    } else {
      const { data, error } = await supabase
        .from("alojamientos")
        .insert(datos)
        .select("id")
        .single();
      if (error) {
        throw traducirErrorPostgres(error, {
          unico:
            "Ya existe otra cabaña con esa dirección web. Cámbiala por una distinta.",
        });
      }
      alojamientoId = String(data.id);
      creada = true;
    }

    // --- Galería: se reescribe entera, en orden ------------------------------
    const anterior = creada
      ? []
      : await galeriaDeAlojamiento(supabase, alojamientoId);

    const { error: errorBorrado } = await supabase
      .from("imagenes")
      .delete()
      .eq("alojamiento_id", alojamientoId);
    if (errorBorrado) throw new Error(errorBorrado.message);

    if (galeria.length > 0) {
      const { error: errorInsercion } = await supabase.from("imagenes").insert(
        galeria.map((imagen, indice) => ({
          alojamiento_id: alojamientoId,
          url: imagen.url,
          alt: imagen.alt || null,
          orden: indice,
        })),
      );
      if (errorInsercion) throw new Error(errorInsercion.message);
    }

    // --- Tarifas base: una por plan ----------------------------------------
    await guardarTarifas(supabase, alojamientoId, formData);

    // --- Higiene de Storage -------------------------------------------------
    const siguenUsadas = new Set(galeria.map((imagen) => imagen.url));
    const huerfanas = anterior
      .map((imagen) => imagen.url)
      .filter((url) => !siguenUsadas.has(url));
    if (huerfanas.length > 0) {
      await limpiarImagenesHuerfanas(supabase, huerfanas);
    }

    refrescar(alojamientoId);
    revalidarSitioPublico();

    if (creada) {
      redirect(
        `${RUTA_LISTA}/${alojamientoId}?ok=${encodeURIComponent(
          `Cabaña «${nombre}» creada. Ya aparece en el sitio si la dejaste activa.`,
        )}`,
      );
    }

    return estadoOk("Cambios guardados. El sitio ya los muestra.");
  });
}

/**
 * Guarda las tarifas base de una cabaña: una fila de `tarifas` por plan de
 * hospedaje, sin vigencia.
 *
 * QUE EXISTA LA FILA ES LA DISPONIBILIDAD: no hay columna «se ofrece». Por eso
 * el formulario trae un interruptor por plan (`ofrece_<planId>`):
 *   · apagado → se borra la fila; esa cabaña deja de ofrecerse con ese plan.
 *   · encendido → se crea o actualiza con el precio escrito.
 *
 * `precio_noche_1_persona` es opcional: `null` significa que se cobra el mismo
 * precio venga una persona o dos (hoy solo Entre Semana tiene precio aparte).
 *
 * Los `dias_semana` de la tarifa se copian de `planes.dias_aplica`: la fuente
 * de verdad es el plan, y así el motor de reservas puede leer la restricción
 * sin una segunda consulta.
 */
async function guardarTarifas(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  alojamientoId: string,
  formData: FormData,
) {
  const planes = formData.getAll("plan_id").map((valor) => String(valor));
  if (planes.length === 0) return;

  const { data: filasPlan, error: errorPlanes } = await supabase
    .from("planes")
    .select("id, nombre, dias_aplica, tipo")
    .in("id", planes);
  if (errorPlanes) throw new Error(errorPlanes.message);

  const porId = new Map(
    (filasPlan ?? []).map((fila) => [String(fila.id), fila]),
  );

  for (const planId of planes) {
    const plan = porId.get(planId);
    // Un id que no corresponde a ningún plan, o que corresponde a uno de día,
    // se ignora: el formulario solo debería mandar planes de hospedaje.
    if (!plan || plan.tipo !== "hospedaje") continue;

    const etiqueta = String(plan.nombre ?? "este plan");
    const ofrece = casilla(formData, `ofrece_${planId}`);

    if (!ofrece) {
      const { error } = await supabase
        .from("tarifas")
        .delete()
        .eq("alojamiento_id", alojamientoId)
        .eq("plan_id", planId)
        .is("vigencia", null);
      if (error) throw new Error(error.message);
      continue;
    }

    const precio = enteroOpcional(
      formData,
      `precio_${planId}`,
      `Precio por noche del plan ${etiqueta}`,
      { min: 0, max: 100_000_000 },
    );

    if (precio === null) {
      throw new ErrorDeValidacion(
        `Le falta el precio por noche al plan «${etiqueta}». Escríbelo, o apaga el interruptor si esta cabaña no se ofrece con ese plan.`,
      );
    }

    const precioUnaPersona = enteroOpcional(
      formData,
      `precio_1_${planId}`,
      `Precio para 1 persona del plan ${etiqueta}`,
      { min: 0, max: 100_000_000 },
    );

    const datos = {
      precio_noche: precio,
      precio_noche_1_persona: precioUnaPersona,
      dias_semana: plan.dias_aplica ?? null,
    };

    const { data: existente } = await supabase
      .from("tarifas")
      .select("id")
      .eq("alojamiento_id", alojamientoId)
      .eq("plan_id", planId)
      .is("vigencia", null)
      .maybeSingle();

    if (existente) {
      const { error } = await supabase
        .from("tarifas")
        .update(datos)
        .eq("id", existente.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("tarifas").insert({
        alojamiento_id: alojamientoId,
        plan_id: planId,
        vigencia: null,
        ...datos,
      });
      if (error) throw new Error(error.message);
    }
  }
}

/** Guarda de una vez el orden de todas las cabañas del listado. */
export async function guardarOrdenAlojamientosAction(formData: FormData) {
  const { supabase } = await requireAdmin();

  const cambios: { id: string; orden: number }[] = [];
  for (const [clave, valor] of formData.entries()) {
    if (!clave.startsWith("orden__")) continue;
    const id = clave.slice("orden__".length);
    const orden = Number(String(valor).trim());
    if (!Number.isInteger(orden) || orden < 0 || orden > 9999) continue;
    cambios.push({ id, orden });
  }

  for (const cambio of cambios) {
    const { error } = await supabase
      .from("alojamientos")
      .update({ orden: cambio.orden })
      .eq("id", cambio.id);

    if (error) {
      redirect(
        `${RUTA_LISTA}?error=${encodeURIComponent(
          `No se pudo guardar el orden: ${error.message}`,
        )}`,
      );
    }
  }

  refrescar();
  revalidarSitioPublico();
  redirect(`${RUTA_LISTA}?ok=${encodeURIComponent("Orden actualizado.")}`);
}

/** Muestra o pausa una cabaña en el sitio público. */
export async function alternarActivoAlojamientoAction(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const activo = String(formData.get("activo") ?? "") === "true";

  const { error } = await supabase
    .from("alojamientos")
    .update({ activo })
    .eq("id", id);

  if (error) {
    redirect(`${RUTA_LISTA}?error=${encodeURIComponent(error.message)}`);
  }

  refrescar(id);
  revalidarSitioPublico();
  redirect(
    `${RUTA_LISTA}?ok=${encodeURIComponent(
      activo
        ? "La cabaña vuelve a verse en el sitio."
        : "La cabaña quedó pausada: ya no aparece en el sitio, pero no se borró nada.",
    )}`,
  );
}

/**
 * Elimina una cabaña.
 *
 * Borrado defensivo: `reservas.alojamiento_id` no tiene ON DELETE CASCADE, así
 * que se cuentan las reservas ANTES para poder explicar el motivo en español en
 * vez de mostrar el error de Postgres.
 */
export async function eliminarAlojamientoAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();

  const { count, error: errorConteo } = await supabase
    .from("reservas")
    .select("id", { count: "exact", head: true })
    .eq("alojamiento_id", id);

  if (errorConteo) {
    redirect(`${RUTA_LISTA}?error=${encodeURIComponent(errorConteo.message)}`);
  }

  if ((count ?? 0) > 0) {
    redirect(
      `${RUTA_LISTA}?error=${encodeURIComponent(
        `No se puede borrar: esta cabaña tiene ${count} reserva(s) registrada(s). Pausala en vez de borrarla para conservar el historial.`,
      )}`,
    );
  }

  // Se guardan las fotos ANTES de borrar la fila: al eliminar la cabaña, todas
  // sus imágenes pasan a ser candidatas a limpiarse del bucket.
  const galeria = await galeriaDeAlojamiento(supabase, id);

  const { error } = await supabase.from("alojamientos").delete().eq("id", id);

  if (error) {
    const mensaje =
      error.code === "23503"
        ? "No se puede borrar: hay reservas asociadas a esta cabaña."
        : error.message;
    redirect(`${RUTA_LISTA}?error=${encodeURIComponent(mensaje)}`);
  }

  await limpiarImagenesHuerfanas(
    supabase,
    galeria.map((imagen) => imagen.url),
  );

  refrescar();
  revalidarSitioPublico();
  redirect(`${RUTA_LISTA}?ok=${encodeURIComponent("Cabaña eliminada.")}`);
}
