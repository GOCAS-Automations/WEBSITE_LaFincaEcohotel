"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin/auth";
import { buscarChoques, describirChoques } from "@/lib/admin/disponibilidad";
import { aRangoFechas, nochesEntre } from "@/lib/admin/fechas";
import { refrescarPanel } from "@/lib/admin/revalidar";
import { estadoOk, type EstadoAccion } from "@/lib/admin/tipos";
import {
  ErrorDeValidacion,
  ejecutarAccion,
  fechaRequerida,
  textoOpcional,
  mensajeDeErrorDeBase,
  traducirErrorPostgres,
  uuidRequerido,
} from "@/lib/admin/validacion";

const RUTA = "/admin/bloqueos";

/**
 * Crea un bloqueo: días en los que una cabaña no se puede reservar por
 * mantenimiento, un evento privado o porque la usan los dueños.
 *
 * El rango es `[inicio, fin)`, igual que las reservas: la última noche
 * bloqueada es la anterior al día de fin. Por eso el formulario pide "primera
 * noche" y "día en que vuelve a estar libre", que es como se piensa de verdad.
 */
export async function crearBloqueoAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    const { supabase } = await requireAdmin();

    const alojamientoId = uuidRequerido(formData, "alojamiento_id", "Cabaña");
    const inicio = fechaRequerida(formData, "inicio", "Primera noche");
    const fin = fechaRequerida(formData, "fin", "Vuelve a estar libre");

    const noches = nochesEntre(inicio, fin);
    if (noches < 1) {
      throw new ErrorDeValidacion(
        "El día en que la cabaña vuelve a estar libre tiene que ser posterior a la primera noche bloqueada.",
      );
    }
    if (noches > 365) {
      throw new ErrorDeValidacion(
        "Un bloqueo no puede pasar de 365 noches. Divídelo en varios si hace falta.",
      );
    }

    /* Tolerante con Google: un bloqueo solo quita noches de la venta, así que
       una caída del calendario del hotel no tiene por qué impedirlo. */
    const choques = await buscarChoques(supabase, alojamientoId, inicio, fin, undefined, {
      calendario: "tolerante",
    });
    if (choques.length > 0) {
      throw new ErrorDeValidacion(describirChoques(choques));
    }

    const { error } = await supabase.from("bloqueos").insert({
      alojamiento_id: alojamientoId,
      rango: aRangoFechas(inicio, fin),
      motivo: textoOpcional(formData, "motivo", 300),
    });

    if (error) {
      throw traducirErrorPostgres(error, {
        exclusion:
          "Esas fechas se cruzan con otro bloqueo o con una reserva de la misma cabaña.",
      });
    }

    refrescarPanel(RUTA, "/admin/reservas");
    return estadoOk(
      `Bloqueo creado: ${noches} ${noches === 1 ? "noche" : "noches"}. Ya se ve en el calendario.`,
    );
  });
}

export async function eliminarBloqueoAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();

  const { error } = await supabase.from("bloqueos").delete().eq("id", id);

  if (error) {
    redirect(`${RUTA}?error=${encodeURIComponent(mensajeDeErrorDeBase(error))}`);
  }

  refrescarPanel(RUTA, "/admin/reservas");
  redirect(
    `${RUTA}?ok=${encodeURIComponent(
      "Bloqueo eliminado: esas noches vuelven a estar disponibles.",
    )}`,
  );
}
