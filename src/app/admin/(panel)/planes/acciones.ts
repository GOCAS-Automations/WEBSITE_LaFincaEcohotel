"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin/auth";
import { refrescarPanel, revalidarSitioPublico } from "@/lib/admin/revalidar";
import { estadoOk, type EstadoAccion } from "@/lib/admin/tipos";
import {
  casilla,
  ejecutarAccion,
  enteroRequerido,
  listaTexto,
  textoOpcional,
  textoRequerido,
  traducirErrorPostgres,
} from "@/lib/admin/validacion";

const RUTA_LISTA = "/admin/planes";

function refrescar(id?: string) {
  refrescarPanel(RUTA_LISTA, ...(id ? [`${RUTA_LISTA}/${id}`] : []));
}

const CONTEXTO_ERRORES = {
  unico: "Ya existe otro plan con ese mismo nombre. Cámbialo por uno distinto.",
};

/**
 * Crea o actualiza un plan tarifario.
 *
 * A propósito NO toca la tabla `tarifas`: un plan nuevo nace sin precio en
 * ninguna cabaña (asignarlo es una decisión por cabaña, no algo que el panel
 * deba inventar). Por eso, al crear, se redirige con un aviso que se lo
 * recuerda al cliente en vez de dejar que lo descubra cuando el plan no se
 * pueda reservar en ningún alojamiento.
 */
export async function guardarPlanAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    const { supabase } = await requireAdmin();

    const id = String(formData.get("id") ?? "").trim();
    const nombre = textoRequerido(formData, "nombre", "Nombre", 80);

    const datos = {
      nombre,
      descripcion: textoOpcional(formData, "descripcion", 2000),
      incluye: listaTexto(formData, "incluye"),
      orden: enteroRequerido(formData, "orden", "Orden", { min: 0, max: 9999 }),
      activo: casilla(formData, "activo"),
    };

    if (id) {
      const { error } = await supabase.from("planes").update(datos).eq("id", id);
      if (error) throw traducirErrorPostgres(error, CONTEXTO_ERRORES);

      refrescar(id);
      revalidarSitioPublico();
      return estadoOk("Cambios guardados. El sitio ya los muestra.");
    }

    const { data, error } = await supabase
      .from("planes")
      .insert(datos)
      .select("id")
      .single();
    if (error) throw traducirErrorPostgres(error, CONTEXTO_ERRORES);

    refrescar();
    revalidarSitioPublico();
    redirect(
      `${RUTA_LISTA}/${data.id}?ok=${encodeURIComponent(
        `Plan «${nombre}» creado. Todavía no tiene precio en ninguna cabaña: entra a cada cabaña y asígnale su tarifa para este plan, o no podrá reservarse.`,
      )}`,
    );
  });
}

/** Guarda de una vez el orden de todos los planes del listado. */
export async function guardarOrdenPlanesAction(formData: FormData) {
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
      .from("planes")
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

/** Muestra o pausa un plan en el sitio público. */
export async function alternarActivoPlanAction(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const activo = String(formData.get("activo") ?? "") === "true";

  const { error } = await supabase.from("planes").update({ activo }).eq("id", id);

  if (error) {
    redirect(`${RUTA_LISTA}?error=${encodeURIComponent(error.message)}`);
  }

  refrescar(id);
  revalidarSitioPublico();
  redirect(
    `${RUTA_LISTA}?ok=${encodeURIComponent(
      activo
        ? "El plan vuelve a verse en el sitio."
        : "El plan quedó pausado: ya no aparece en el sitio, pero no se borró nada.",
    )}`,
  );
}

/**
 * Elimina un plan.
 *
 * Borrado defensivo con DOS conteos, porque las dos tablas que referencian
 * `planes.id` se comportan distinto ante un DELETE:
 *   · `tarifas.plan_id` tiene ON DELETE CASCADE — Postgres NO lo rechazaría,
 *     borraría en silencio el precio del plan en todas las cabañas. Por eso se
 *     cuenta a mano y se avisa ANTES de que eso pase.
 *   · `reservas.plan_id` no tiene cascada: si hay reservas, Postgres sí
 *     rechaza el DELETE (23503), pero contarlas antes deja explicar el motivo
 *     en español en vez de mostrarle al cliente el error crudo.
 */
export async function eliminarPlanAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();

  const [conteoReservas, conteoTarifas] = await Promise.all([
    supabase.from("reservas").select("id", { count: "exact", head: true }).eq("plan_id", id),
    supabase.from("tarifas").select("id", { count: "exact", head: true }).eq("plan_id", id),
  ]);

  if (conteoReservas.error) {
    redirect(`${RUTA_LISTA}?error=${encodeURIComponent(conteoReservas.error.message)}`);
  }
  if (conteoTarifas.error) {
    redirect(`${RUTA_LISTA}?error=${encodeURIComponent(conteoTarifas.error.message)}`);
  }

  const reservas = conteoReservas.count ?? 0;
  const tarifas = conteoTarifas.count ?? 0;

  if (reservas > 0) {
    redirect(
      `${RUTA_LISTA}?error=${encodeURIComponent(
        `No se puede borrar: este plan tiene ${reservas} reserva(s) registrada(s). Pausalo en vez de borrarlo para conservar el historial.`,
      )}`,
    );
  }

  if (tarifas > 0) {
    redirect(
      `${RUTA_LISTA}?error=${encodeURIComponent(
        `No se puede borrar: este plan tiene precio asignado en ${tarifas} cabaña(s). Pausalo en vez de borrarlo, o primero quítale el precio en cada cabaña.`,
      )}`,
    );
  }

  const { error } = await supabase.from("planes").delete().eq("id", id);

  if (error) {
    redirect(`${RUTA_LISTA}?error=${encodeURIComponent(error.message)}`);
  }

  refrescar();
  revalidarSitioPublico();
  redirect(`${RUTA_LISTA}?ok=${encodeURIComponent("Plan eliminado.")}`);
}
