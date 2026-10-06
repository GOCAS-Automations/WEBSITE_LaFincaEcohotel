"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin/auth";
import { refrescarPanel, revalidarSitioPublico } from "@/lib/admin/revalidar";
import { estadoOk, TIPOS_PLAN, type EstadoAccion } from "@/lib/admin/tipos";
import {
  ErrorDeValidacion,
  casilla,
  ejecutarAccion,
  enteroRequerido,
  enterosDeCasillas,
  enumRequerido,
  listaTexto,
  precioOpcional,
  textoOpcional,
  textoRequerido,
  mensajeDeErrorDeBase,
  traducirErrorPostgres,
} from "@/lib/admin/validacion";

const RUTA_LISTA = "/admin/planes";

function refrescar(id?: string) {
  refrescarPanel(RUTA_LISTA, ...(id ? [`${RUTA_LISTA}/${id}`] : []));
}

const CONTEXTO_ERRORES = {
  unico: "Ya existe otro plan con ese mismo nombre. Cámbialo por uno distinto.",
  check:
    "Los datos del plan no encajan entre sí: un plan de hospedaje no lleva horario ni precio propio (su precio va por cabaña), y uno de día sí necesita su precio.",
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

    const tipo = enumRequerido(formData, "tipo", "Tipo de plan", TIPOS_PLAN);
    const esDeDia = tipo === "dia";

    // `horario` y `precio_base` solo existen en los planes de día. En los de
    // hospedaje se fuerzan a null aunque el navegador haya mandado algo: la
    // base tiene la misma regla (`planes_coherencia_tipo`) y un precio
    // fantasma compitiendo con el de `tarifas` sería un error caro.
    const horario = esDeDia ? textoOpcional(formData, "horario", 120) : null;
    const precioBase = esDeDia
      ? precioOpcional(formData, "precio_base", "Precio del plan")
      : null;

    if (esDeDia && precioBase === null) {
      throw new ErrorDeValidacion(
        "Un plan de día se vende con un solo precio para todo el hotel: escribe «Precio del plan».",
      );
    }

    const datos = {
      nombre,
      descripcion: textoOpcional(formData, "descripcion", 2000),
      incluye: listaTexto(formData, "incluye"),
      tipo,
      // Sin días marcados = se puede reservar cualquier día.
      dias_aplica: enterosDeCasillas(formData, "dias_aplica", { min: 1, max: 7 }),
      horario,
      precio_base: precioBase,
      orden: enteroRequerido(formData, "orden", "Orden", { min: 0, max: 9999 }),
      activo: casilla(formData, "activo"),
    };

    if (id) {
      const { error } = await supabase.from("planes").update(datos).eq("id", id);
      if (error) throw traducirErrorPostgres(error, CONTEXTO_ERRORES);

      // Si el plan pasó a ser de día, sus precios por cabaña —y los de las
      // temporadas— ya no significan nada: se retiran para que ninguna
      // pantalla los siga sumando.
      let aviso = "";
      if (esDeDia) {
        const { count, error: errorTarifas } = await supabase
          .from("tarifas")
          .delete({ count: "exact" })
          .eq("plan_id", id);
        if (errorTarifas) throw traducirErrorPostgres(errorTarifas);
        if ((count ?? 0) > 0) {
          aviso =
            " Como ahora es un plan de día, se quitaron los precios que tenía por cabaña: se cobra el precio del plan.";
        }
      }

      refrescar(id);
      revalidarSitioPublico();
      return estadoOk(`Cambios guardados. El sitio ya los muestra.${aviso}`);
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
        esDeDia
          ? `Plan «${nombre}» creado. Se vende con el precio que le pusiste, sin cabaña: no hay que hacer nada más.`
          : `Plan «${nombre}» creado. Todavía no tiene precio en ninguna cabaña: entra a cada cabaña y asígnale su tarifa para este plan, o no podrá reservarse.`,
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
          mensajeDeErrorDeBase(error, {
            generico:
              "No se pudo guardar el orden. Vuelve a intentarlo; si sigue pasando, avísale al desarrollador.",
          }),
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
    redirect(`${RUTA_LISTA}?error=${encodeURIComponent(mensajeDeErrorDeBase(error))}`);
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

  const [conteoReservas, conteoTarifas, conteoTemporadas] = await Promise.all([
    supabase.from("reservas").select("id", { count: "exact", head: true }).eq("plan_id", id),
    supabase
      .from("tarifas")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", id)
      .is("vigencia", null),
    /* Los precios de temporada también se borrarían en cascada, en silencio. */
    supabase
      .from("tarifas")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", id)
      .not("temporada_id", "is", null),
  ]);

  if (conteoReservas.error) {
    redirect(`${RUTA_LISTA}?error=${encodeURIComponent(mensajeDeErrorDeBase(conteoReservas.error))}`);
  }
  if (conteoTarifas.error) {
    redirect(`${RUTA_LISTA}?error=${encodeURIComponent(mensajeDeErrorDeBase(conteoTarifas.error))}`);
  }
  if (conteoTemporadas.error) {
    redirect(`${RUTA_LISTA}?error=${encodeURIComponent(mensajeDeErrorDeBase(conteoTemporadas.error))}`);
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

  /* En el panel las temporadas se llaman «Tarifas diferenciales». */
  const temporadas = conteoTemporadas.count ?? 0;
  if (temporadas > 0) {
    const cuantas =
      temporadas === 1
        ? "1 tarifa diferencial"
        : `${temporadas} tarifas diferenciales`;
    redirect(
      `${RUTA_LISTA}?error=${encodeURIComponent(
        `No se puede borrar: este plan tiene precio en ${cuantas}. Páusalo en vez de borrarlo, o primero quítale ese precio en «Tarifas diferenciales».`,
      )}`,
    );
  }

  const { error } = await supabase.from("planes").delete().eq("id", id);

  if (error) {
    const mensaje = mensajeDeErrorDeBase(error, {
      foranea:
        "No se puede borrar: este plan todavía tiene reservas o precios asociados. Páusalo en vez de borrarlo.",
    });
    redirect(`${RUTA_LISTA}?error=${encodeURIComponent(mensaje)}`);
  }

  refrescar();
  revalidarSitioPublico();
  redirect(`${RUTA_LISTA}?ok=${encodeURIComponent("Plan eliminado.")}`);
}
