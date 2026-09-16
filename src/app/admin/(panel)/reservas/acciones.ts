"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin/auth";
import { REINTENTOS_CODIGO, siguienteCodigo } from "@/lib/admin/codigo-reserva";
import { buscarChoques, describirChoques } from "@/lib/admin/disponibilidad";
import {
  aRangoFechas,
  leerRangoFechas,
  nochesEntre,
  sumarDiasISO,
} from "@/lib/admin/fechas";
import { refrescarPanel } from "@/lib/admin/revalidar";
import {
  ESTADOS_QUE_OCUPAN,
  ESTADOS_RESERVA,
  ORIGENES_RESERVA,
  TIPOS_RESERVA,
  estadoOk,
  type EstadoAccion,
} from "@/lib/admin/tipos";
import {
  CUPO_DIA_DE_CALMA,
  MAX_PERSONAS_POR_RESERVA_DIA,
} from "@/lib/reserva/dia-de-calma";
import { invalidarCacheCalendario } from "@/lib/reserva/ocupacion-externa";
import {
  borrarEventoDeReserva,
  sincronizarReservaEnCalendario,
} from "@/lib/reserva/sincronizar-calendario";
import {
  calcularAnticipo,
  normalizarPorcentajeAnticipo,
} from "@/lib/reserva/total";
import {
  CUPO_DIA_LLENO,
  ErrorDeValidacion,
  ejecutarAccion,
  emailOpcional,
  enteroOpcional,
  enteroRequerido,
  enumRequerido,
  esUuid,
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

/**
 * «Actualizar ahora»: tira la caché de cinco minutos del calendario de Google.
 *
 * No consulta nada por sí misma; solo hace que la siguiente lectura —la de la
 * pantalla que se pinta justo después— vaya a Google de verdad.
 */
export async function refrescarCalendarioAction(formData: FormData) {
  await requireAdmin();
  invalidarCacheCalendario();

  const mes = String(formData.get("mes") ?? "").trim();
  const consulta = new URLSearchParams();
  if (/^\d{4}-\d{2}$/.test(mes)) consulta.set("mes", mes);
  consulta.set("ok", "Calendario del hotel consultado de nuevo.");

  refrescar();
  redirect(`${RUTA_LISTA}?${consulta.toString()}`);
}

type LineaExtra = {
  extra_id: string;
  cantidad: number;
  precio_unitario: number;
  /** Noche a la que se añade; `null` = para toda la estadía. */
  noche: string | null;
};

/**
 * Lee las experiencias elegidas en el formulario.
 *
 * Viajan como JSON en un solo campo porque cada línea es una TERNA —extra,
 * noche y cantidad— y el mismo extra puede aparecer en varias noches: con
 * campos sueltos (`cantidad_<id>`) no había forma de distinguir el fondue del
 * viernes del fondue del sábado. El formato se valida entero aquí: lo que
 * llega del navegador nunca se cree sin mirar.
 */
function leerExtras(formData: FormData, nochesValidas: string[]): LineaExtra[] {
  const crudo = String(formData.get("extras") ?? "").trim();
  if (!crudo) return [];

  let analizado: unknown;
  try {
    analizado = JSON.parse(crudo);
  } catch {
    throw new ErrorDeValidacion(
      "No se pudieron leer las experiencias de la pantalla. Vuelve a marcarlas.",
    );
  }
  if (!Array.isArray(analizado)) return [];

  const permitidas = new Set(nochesValidas);
  const vistas = new Set<string>();
  const lineas: LineaExtra[] = [];

  for (const item of analizado) {
    if (typeof item !== "object" || item === null) continue;
    const fila = item as Record<string, unknown>;

    const extraId = String(fila.extra_id ?? "").trim();
    if (!esUuid(extraId)) continue;

    const cantidad = Math.max(1, Math.min(99, Number(fila.cantidad ?? 1) || 1));
    const precio = Math.max(
      0,
      Math.min(100_000_000, Math.round(Number(fila.precio_unitario ?? 0) || 0)),
    );

    const nocheCruda =
      typeof fila.noche === "string" && fila.noche.trim()
        ? fila.noche.trim()
        : null;
    /* Una noche que no pertenece a la estadía se guarda como «toda la
       estadía» en vez de rechazar el guardado: el usuario del panel cambió las
       fechas y no tiene por qué perder lo que ya había marcado. */
    const noche =
      nocheCruda && permitidas.has(nocheCruda) ? nocheCruda : null;

    const clave = `${extraId}|${noche ?? ""}`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);

    lineas.push({ extra_id: extraId, cantidad, precio_unitario: precio, noche });
  }

  return lineas;
}

/**
 * Cuántas personas hay ya reservadas de día en esa fecha.
 *
 * La palabra final la tiene el trigger `reservas_cupo_dia_de_calma` de la
 * base; esto es para poder avisar ANTES, y con el detalle a la vista.
 */
async function personasDeDiaEn(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  fecha: string,
  excluirId?: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("reservas")
    .select("id, num_personas")
    .eq("tipo", "dia")
    .in("estado", ["pendiente", "confirmada"])
    .overlaps("estancia", `[${fecha},${sumarDiasISO(fecha, 1)})`);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((fila) => !excluirId || String(fila.id) !== excluirId)
    .reduce((suma, fila) => suma + Number(fila.num_personas ?? 0), 0);
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
    const tipo = enumRequerido(formData, "tipo", "Tipo de reserva", TIPOS_RESERVA);
    const esDia = tipo === "dia";

    /* El Día de Calma no ocupa cabaña y dura un solo día: la salida se calcula
       (`[fecha, fecha+1)`), no se pregunta. Así el calendario, el cupo y las
       consultas de solape siguen usando el mismo `daterange` de siempre. */
    const alojamientoId = esDia
      ? null
      : uuidRequerido(formData, "alojamiento_id", "Cabaña");
    const planId = uuidRequerido(formData, "plan_id", "Plan");
    const entrada = fechaRequerida(
      formData,
      "entrada",
      esDia ? "Fecha del día" : "Fecha de entrada",
    );
    const salida = esDia
      ? sumarDiasISO(entrada, 1)
      : fechaRequerida(formData, "salida", "Fecha de salida");

    const noches = nochesEntre(entrada, salida);
    if (!esDia) {
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
    }

    const estado = enumRequerido(formData, "estado", "Estado", ESTADOS_RESERVA);
    const origen = enumRequerido(formData, "origen", "Origen", ORIGENES_RESERVA);

    const numPersonas = enteroRequerido(
      formData,
      "num_personas",
      "Número de personas",
      /* El Día de Calma se vende para una o dos personas (decisión del
         cliente, 2026-09-15): el cupo de 10 es el de toda la finca y lo
         llenan varias reservas, no una sola. La base lo repite en
         `reservas_dia_maximo_dos_personas` (migración 010); aquí se comprueba
         antes para poder explicarlo en español. */
      { min: 1, max: esDia ? MAX_PERSONAS_POR_RESERVA_DIA : 30 },
    );

    /* El plan tiene que ser del tipo que se está vendiendo: un Día de Calma
       cobrado con el plan Premium sería una reserva que no significa nada. */
    const { data: plan } = await supabase
      .from("planes")
      .select("nombre, tipo")
      .eq("id", planId)
      .maybeSingle();

    if (!plan) {
      throw new ErrorDeValidacion("El plan que elegiste ya no existe.");
    }
    if (esDia && plan.tipo !== "dia") {
      throw new ErrorDeValidacion(
        "Para una reserva de Día de Calma tienes que elegir un plan de día.",
      );
    }
    if (!esDia && plan.tipo === "dia") {
      throw new ErrorDeValidacion(
        "Ese plan es de día, sin hospedaje. Elige un plan de hospedaje o cambia el tipo de reserva.",
      );
    }

    let alojamiento: { nombre: string; capacidad: number } | null = null;

    if (!esDia && alojamientoId) {
      const { data } = await supabase
        .from("alojamientos")
        .select("nombre, capacidad")
        .eq("id", alojamientoId)
        .maybeSingle();

      if (!data) {
        throw new ErrorDeValidacion("La cabaña que elegiste ya no existe.");
      }
      alojamiento = {
        nombre: String(data.nombre),
        capacidad: Number(data.capacidad),
      };

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
    }

    /* El cupo del día, avisado antes de intentarlo. Si dos personas guardan a
       la vez, el trigger de la base sigue siendo quien decide. */
    if (esDia && ["pendiente", "confirmada"].includes(estado)) {
      const ocupadas = await personasDeDiaEn(supabase, entrada, id || undefined);
      if (ocupadas + numPersonas > CUPO_DIA_DE_CALMA) {
        throw new ErrorDeValidacion(
          `El Día de Calma admite ${CUPO_DIA_DE_CALMA} personas por día y para esa fecha ya hay ${ocupadas}. Quedan ${Math.max(
            CUPO_DIA_DE_CALMA - ocupadas,
            0,
          )} cupos.`,
        );
      }
    }

    /* Las noches de la estadía, para saber a cuál puede pertenecer un extra. */
    const nochesValidas: string[] = [];
    if (!esDia) {
      for (let dia = entrada; dia < salida; dia = sumarDiasISO(dia, 1)) {
        nochesValidas.push(dia);
      }
    }

    const extras = leerExtras(formData, nochesValidas);
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

    const total = subtotalAlojamiento + subtotalExtras;

    /* Anticipo: cualquier porcentaje entre el 50 % que pide el hotel para
       confirmar y el 100 %. El monto se guarda además del porcentaje porque es
       la cifra que se le prometió al huésped; recalcularla después, con otras
       tarifas, daría otro número. */
    const porcentajeAnticipo = normalizarPorcentajeAnticipo(
      formData.get("porcentaje_anticipo"),
    );
    const montoAnticipo = calcularAnticipo(total, porcentajeAnticipo).anticipo;

    const datos = {
      tipo,
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
      total,
      monto_pagado: montoPagado,
      estado,
      origen,
      porcentaje_anticipo: porcentajeAnticipo,
      monto_anticipo: montoAnticipo,
    };

    const avisoCapacidad =
      alojamiento && numPersonas > alojamiento.capacidad
        ? `\nAviso: son más personas de las que caben normalmente en ${alojamiento.nombre} (${alojamiento.capacidad}).`
        : "";

    if (id) {
      const { error } = await supabase.from("reservas").update(datos).eq("id", id);
      if (error) throw traducirErrorPostgres(error);

      await guardarExtrasDeReserva(supabase, id, extras);

      /* El calendario del hotel va al final y sin poder estropear nada: la
         reserva YA está guardada. Si Google falla, solo se añade un aviso. */
      const avisoCalendario = await sincronizarReservaEnCalendario(supabase, id);

      refrescar(id);
      return estadoOk(
        `Reserva actualizada.${avisoCapacidad}${
          avisoCalendario ? `\n${avisoCalendario}` : ""
        }`,
      );
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

    const avisoCalendarioNueva = await sincronizarReservaEnCalendario(
      supabase,
      nuevaId,
    );

    refrescar(nuevaId);
    redirect(
      `${RUTA_LISTA}/${nuevaId}?ok=${encodeURIComponent(
        `${
          esDia
            ? `Reserva ${codigoUsado} creada. Ese Día de Calma ya cuenta para el cupo de esa fecha; no bloquea ninguna cabaña.`
            : `Reserva ${codigoUsado} creada. Esas fechas ya quedan ocupadas en el calendario.${avisoCapacidad}`
        }${avisoCalendarioNueva ? `\n${avisoCalendarioNueva}` : ""}`,
      )}`,
    );
  });
}

/** Reescribe los extras de una reserva. */
async function guardarExtrasDeReserva(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  reservaId: string,
  extras: LineaExtra[],
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
      noche: extra.noche,
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
    /* El mensaje del cupo del Día de Calma ya viene escrito en español desde
       la base (trigger `validar_cupo_dia_de_calma`): se muestra tal cual. */
    const mensaje =
      error.code === "23P01"
        ? "Esas fechas se cruzan con otra reserva activa de la misma cabaña."
        : error.code === CUPO_DIA_LLENO
          ? `No se pudo cambiar el estado. ${error.message}`
          : error.message;
    redirect(`${RUTA_LISTA}/${id}?error=${encodeURIComponent(mensaje)}`);
  }

  /* Confirmar apunta la reserva en el calendario del hotel; cancelar borra su
     evento. Lo decide `sincronizarReservaEnCalendario` mirando el estado que
     acaba de quedar guardado. */
  const avisoCalendario = await sincronizarReservaEnCalendario(supabase, id);

  refrescar(id);
  redirect(
    `${RUTA_LISTA}/${id}?ok=${encodeURIComponent(
      `Estado de la reserva actualizado.${
        avisoCalendario ? `\n${avisoCalendario}` : ""
      }`,
    )}`,
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

  /* Antes del `delete`: después ya no habría de dónde sacar el id del evento. */
  const avisoCalendario = await borrarEventoDeReserva(supabase, id);

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
  redirect(
    `${RUTA_LISTA}?ok=${encodeURIComponent(
      `Reserva eliminada.${avisoCalendario ? `\n${avisoCalendario}` : ""}`,
    )}`,
  );
}
