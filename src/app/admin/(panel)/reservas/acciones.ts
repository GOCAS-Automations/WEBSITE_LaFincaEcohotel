"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin/auth";
import { REINTENTOS_CODIGO, siguienteCodigo } from "@/lib/admin/codigo-reserva";
import { buscarChoques, describirChoques } from "@/lib/admin/disponibilidad";
import { aRangoFechas, leerRangoFechas, nochesEntre } from "@/lib/admin/fechas";
import { refrescarPanel } from "@/lib/admin/revalidar";
import {
  ESTADOS_QUE_OCUPAN,
  ESTADOS_RESERVA,
  ORIGENES_RESERVA,
  estadoOk,
  type EstadoAccion,
} from "@/lib/admin/tipos";
import {
  ErrorDeValidacion,
  ejecutarAccion,
  emailOpcional,
  enteroOpcional,
  enteroRequerido,
  enumRequerido,
  fechaRequerida,
  textoOpcional,
  textoRequerido,
  traducirErrorPostgres,
  uuidRequerido,
  VIOLACION_UNICA,
} from "@/lib/admin/validacion";
import type { EstadoReserva } from "@/lib/tipos/basedatos";

const RUTA_LISTA = "/admin/reservas";

function refrescar(id?: string) {
  refrescarPanel(
    RUTA_LISTA,
    "/admin/bloqueos",
    ...(id ? [`${RUTA_LISTA}/${id}`] : []),
  );
}

/** Lee los extras marcados en el formulario, con su cantidad y su precio. */
function leerExtras(formData: FormData): {
  extra_id: string;
  cantidad: number;
  precio_unitario: number;
}[] {
  const ids = formData.getAll("extra_id").map((valor) => String(valor));
  const elegidos = new Set(
    formData.getAll("extra_elegido").map((valor) => String(valor)),
  );

  return ids
    .filter((id) => elegidos.has(id))
    .map((id) => ({
      extra_id: id,
      cantidad: Math.max(
        1,
        enteroOpcional(formData, `cantidad_${id}`, "Cantidad", {
          min: 1,
          max: 99,
        }) ?? 1,
      ),
      precio_unitario:
        enteroOpcional(formData, `precio_extra_${id}`, "Precio del extra", {
          min: 0,
          max: 100_000_000,
        }) ?? 0,
    }));
}

/**
 * Crea o edita una reserva desde el panel.
 *
 * Es el registro MANUAL: las reservas que llegan por WhatsApp, por teléfono o
 * que el equipo apunta a mano. (Cuando exista el motor de reservas del sitio,
 * las de origen "web" se crearán solas y se editarán desde aquí.)
 *
 * Orden de las comprobaciones, y por qué ese orden:
 *   1. Se validan los campos, para no consultar la base con datos rotos.
 *   2. Si el estado OCUPA calendario, se buscan choques y se explican en
 *      español. La restricción EXCLUDE de Postgres sigue ahí como red de
 *      seguridad ante dos guardados simultáneos, pero su mensaje no le sirve a
 *      nadie.
 *   3. Se escribe. Si aun así vuelve un 23P01, se traduce.
 */
export async function guardarReservaAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    const { supabase } = await requireAdmin();

    const id = String(formData.get("id") ?? "").trim();
    const alojamientoId = uuidRequerido(formData, "alojamiento_id", "Cabaña");
    const planId = uuidRequerido(formData, "plan_id", "Plan");
    const entrada = fechaRequerida(formData, "entrada", "Fecha de entrada");
    const salida = fechaRequerida(formData, "salida", "Fecha de salida");

    const noches = nochesEntre(entrada, salida);
    if (noches < 1) {
      throw new ErrorDeValidacion(
        "La fecha de salida tiene que ser posterior a la de entrada: una estadía es de mínimo una noche.",
      );
    }
    if (noches > 120) {
      throw new ErrorDeValidacion(
        "La estadía no puede pasar de 120 noches. Revisa las fechas.",
      );
    }

    const estado = enumRequerido(formData, "estado", "Estado", ESTADOS_RESERVA);
    const origen = enumRequerido(formData, "origen", "Origen", ORIGENES_RESERVA);

    const numPersonas = enteroRequerido(
      formData,
      "num_personas",
      "Número de personas",
      { min: 1, max: 30 },
    );

    const { data: alojamiento } = await supabase
      .from("alojamientos")
      .select("nombre, capacidad")
      .eq("id", alojamientoId)
      .maybeSingle();

    if (!alojamiento) {
      throw new ErrorDeValidacion("La cabaña que elegiste ya no existe.");
    }

    if (ESTADOS_QUE_OCUPAN.includes(estado)) {
      const choques = await buscarChoques(
        supabase,
        alojamientoId,
        entrada,
        salida,
        id || undefined,
      );
      if (choques.length > 0) {
        throw new ErrorDeValidacion(describirChoques(choques));
      }
    }

    const extras = leerExtras(formData);
    const subtotalExtras = extras.reduce(
      (suma, extra) => suma + extra.cantidad * extra.precio_unitario,
      0,
    );

    const subtotalAlojamiento = enteroRequerido(
      formData,
      "subtotal_alojamiento",
      "Valor del alojamiento",
      { min: 0, max: 1_000_000_000 },
    );

    const montoPagado =
      enteroOpcional(formData, "monto_pagado", "Abonado", {
        min: 0,
        max: 1_000_000_000,
      }) ?? 0;

    const datos = {
      alojamiento_id: alojamientoId,
      plan_id: planId,
      estancia: aRangoFechas(entrada, salida),
      huesped_nombre: textoRequerido(
        formData,
        "huesped_nombre",
        "Nombre del huésped",
        160,
      ),
      huesped_email: emailOpcional(formData, "huesped_email") ?? "",
      huesped_telefono: textoRequerido(
        formData,
        "huesped_telefono",
        "Teléfono del huésped",
        60,
      ),
      huesped_documento: textoOpcional(formData, "huesped_documento", 60),
      num_personas: numPersonas,
      notas: textoOpcional(formData, "notas", 4000),
      subtotal_alojamiento: subtotalAlojamiento,
      subtotal_extras: subtotalExtras,
      total: subtotalAlojamiento + subtotalExtras,
      monto_pagado: montoPagado,
      estado,
      origen,
    };

    const avisoCapacidad =
      numPersonas > alojamiento.capacidad
        ? `\nAviso: son más personas de las que caben normalmente en ${alojamiento.nombre} (${alojamiento.capacidad}).`
        : "";

    if (id) {
      const { error } = await supabase.from("reservas").update(datos).eq("id", id);
      if (error) throw traducirErrorPostgres(error);

      await guardarExtrasDeReserva(supabase, id, extras);

      refrescar(id);
      return estadoOk(`Reserva actualizada.${avisoCapacidad}`);
    }

    /* El código se genera por reintento y NO por "leer el último y sumar uno":
       entre la lectura y la escritura cabe otra reserva. El índice único de
       `reservas.codigo` es quien decide, y aquí se reacciona a su 23505. */
    let nuevaId: string | null = null;
    let codigoUsado = "";
    let ultimoError: { code?: string; message: string } | null = null;

    for (let intento = 0; intento < REINTENTOS_CODIGO; intento += 1) {
      const codigo = await siguienteCodigo(supabase, intento);
      const { data, error } = await supabase
        .from("reservas")
        .insert({ ...datos, codigo })
        .select("id")
        .single();

      if (!error) {
        nuevaId = String(data.id);
        codigoUsado = codigo;
        break;
      }

      ultimoError = error;
      if (error.code !== VIOLACION_UNICA) break;
      // 23505 con otro origen (no el código) tampoco se resuelve reintentando,
      // pero el bucle se corta solo a los seis intentos.
    }

    if (!nuevaId) {
      throw traducirErrorPostgres(
        ultimoError ?? { message: "No se pudo crear la reserva." },
        {
          unico:
            "No se pudo asignar un código de reserva libre. Intenta guardar de nuevo.",
        },
      );
    }

    await guardarExtrasDeReserva(supabase, nuevaId, extras);

    refrescar(nuevaId);
    redirect(
      `${RUTA_LISTA}/${nuevaId}?ok=${encodeURIComponent(
        `Reserva ${codigoUsado} creada. Esas fechas ya quedan ocupadas en el calendario.${avisoCapacidad}`,
      )}`,
    );
  });
}

/** Reescribe los extras de una reserva. */
async function guardarExtrasDeReserva(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  reservaId: string,
  extras: { extra_id: string; cantidad: number; precio_unitario: number }[],
) {
  const { error: errorBorrado } = await supabase
    .from("reserva_extras")
    .delete()
    .eq("reserva_id", reservaId);
  if (errorBorrado) throw new Error(errorBorrado.message);

  if (extras.length === 0) return;

  const { error } = await supabase.from("reserva_extras").insert(
    extras.map((extra) => ({
      reserva_id: reservaId,
      extra_id: extra.extra_id,
      cantidad: extra.cantidad,
      precio_unitario: extra.precio_unitario,
    })),
  );
  if (error) throw new Error(error.message);
}

/**
 * Cambia el estado de una reserva desde la ficha o el listado.
 *
 * Reactivar una reserva cancelada puede chocar con lo que se haya agendado
 * entretanto, así que se comprueba el calendario ANTES de escribir.
 */
export async function cambiarEstadoReservaAction(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const estadoCrudo = String(formData.get("estado") ?? "").trim();

  if (!ESTADOS_RESERVA.includes(estadoCrudo as EstadoReserva)) {
    redirect(`${RUTA_LISTA}/${id}?error=${encodeURIComponent("Estado no válido.")}`);
  }
  const estado = estadoCrudo as EstadoReserva;

  const { data: reserva, error: errorLectura } = await supabase
    .from("reservas")
    .select("alojamiento_id, estancia")
    .eq("id", id)
    .maybeSingle();

  if (errorLectura || !reserva) {
    redirect(
      `${RUTA_LISTA}?error=${encodeURIComponent("No se encontró la reserva.")}`,
    );
  }

  if (ESTADOS_QUE_OCUPAN.includes(estado) && reserva.alojamiento_id) {
    const rango = leerRangoFechas(reserva.estancia);
    if (rango) {
      const choques = await buscarChoques(
        supabase,
        String(reserva.alojamiento_id),
        rango.inicio,
        rango.fin,
        id,
      );
      if (choques.length > 0) {
        redirect(
          `${RUTA_LISTA}/${id}?error=${encodeURIComponent(
            `No se pudo cambiar el estado. ${describirChoques(choques)}`,
          )}`,
        );
      }
    }
  }

  const { error } = await supabase
    .from("reservas")
    .update({ estado })
    .eq("id", id);

  if (error) {
    const mensaje =
      error.code === "23P01"
        ? "Esas fechas se cruzan con otra reserva activa de la misma cabaña."
        : error.message;
    redirect(`${RUTA_LISTA}/${id}?error=${encodeURIComponent(mensaje)}`);
  }

  refrescar(id);
  redirect(
    `${RUTA_LISTA}/${id}?ok=${encodeURIComponent("Estado de la reserva actualizado.")}`,
  );
}

/**
 * Borra la reserva definitivamente.
 *
 * Se ofrece además de "cancelar" para poder limpiar registros de prueba, pero
 * el camino recomendado sigue siendo cancelar: conserva el historial.
 */
export async function eliminarReservaAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();

  const { error: errorExtras } = await supabase
    .from("reserva_extras")
    .delete()
    .eq("reserva_id", id);
  if (errorExtras) {
    redirect(`${RUTA_LISTA}/${id}?error=${encodeURIComponent(errorExtras.message)}`);
  }

  const { error } = await supabase.from("reservas").delete().eq("id", id);

  if (error) {
    redirect(`${RUTA_LISTA}/${id}?error=${encodeURIComponent(error.message)}`);
  }

  refrescar();
  redirect(`${RUTA_LISTA}?ok=${encodeURIComponent("Reserva eliminada.")}`);
}
