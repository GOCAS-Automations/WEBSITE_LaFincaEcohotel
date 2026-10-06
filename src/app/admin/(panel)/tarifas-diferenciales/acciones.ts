"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin/auth";
import { refrescarPanel, revalidarSitioPublico } from "@/lib/admin/revalidar";
import {
  cabanasParaTemporadas,
  listarTemporadas,
  planesConBases,
} from "@/lib/admin/temporadas";
import { estadoOk, type EstadoAccion } from "@/lib/admin/tipos";
import {
  ErrorDeValidacion,
  ejecutarAccion,
  esUuid,
  fechaRequerida,
  precioOpcional,
  textoRequerido,
  traducirErrorPostgres,
} from "@/lib/admin/validacion";
import {
  crucesDeTemporada,
  fechasDeTemporada,
  planesDelAlcance,
  rangoLegible,
  ultimaNoche,
  validarPreciosDeTemporada,
} from "@/lib/reserva/temporadas";

/* En el panel esto se llama «Tarifas diferenciales»; en el código y la base
   sigue siendo `temporadas`. */
const RUTA_LISTA = "/admin/tarifas-diferenciales";

/** Valor del desplegable de alcance que significa «todas las cabañas». */
const TODAS = "todas";

function refrescar(id?: string) {
  refrescarPanel(
    RUTA_LISTA,
    "/admin/alojamientos",
    ...(id ? [`${RUTA_LISTA}/${id}`] : []),
  );
}

const MENSAJE_CRUCE =
  "Esas fechas se cruzan con otra tarifa diferencial para las mismas cabañas que ya pone precio a uno de estos planes. Cambia las fechas, o deja ese plan en blanco en una de las dos.";

/**
 * Crea o edita una tarifa diferencial (una «temporada» en el código).
 *
 * Todo lo que llega del navegador se vuelve a comprobar aquí, en este orden:
 * fechas («Primera noche» y «Última noche», las dos incluidas), alcance,
 * precios plan por plan (regla de una persona), y que no choque con otra
 * temporada del mismo alcance. Después se guarda con `guardar_temporada()`
 * (migración 017), que escribe temporada y precios en UNA transacción. Si dos
 * personas guardan a la vez y aun así chocan, la exclusión de la base tiene la
 * última palabra y se explica con el mismo texto.
 */
export async function guardarTemporadaAction(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    const { supabase } = await requireAdmin();

    const idCrudo = String(formData.get("id") ?? "").trim();
    const id = idCrudo && esUuid(idCrudo) ? idCrudo : null;

    const nombre = textoRequerido(formData, "nombre", "Nombre de la tarifa diferencial", 80);

    const fechas = fechasDeTemporada(
      fechaRequerida(formData, "primera_noche", "Primera noche"),
      fechaRequerida(formData, "ultima_noche", "Última noche"),
    );
    if (!fechas.valido) throw new ErrorDeValidacion(fechas.motivo);

    const [cabanas, planes, existentes] = await Promise.all([
      cabanasParaTemporadas(supabase),
      planesConBases(supabase),
      listarTemporadas(supabase),
    ]);

    const alcanceCrudo = String(formData.get("alcance") ?? "").trim();
    let alojamientoId: string | null = null;
    if (alcanceCrudo !== TODAS) {
      const cabana = cabanas.find((item) => item.id === alcanceCrudo);
      if (!cabana) {
        throw new ErrorDeValidacion(
          "Elige a qué cabañas aplica la tarifa diferencial: todas, o una en concreto.",
        );
      }
      alojamientoId = cabana.id;
    }

    /* Solo los planes que esa cabaña (o alguna, si es para todas) tiene en su
       tarifa base: una temporada nunca habilita un plan que no se vende. */
    const planesPosibles = planesDelAlcance(planes, alojamientoId);
    const valores = planesPosibles.map((plan) => ({
      planId: plan.planId,
      precio: precioOpcional(
        formData,
        `precio_${plan.planId}`,
        `Precio por noche del plan ${plan.nombre}`,
      ),
      precioUnaPersona: precioOpcional(
        formData,
        `precio_1_${plan.planId}`,
        `Precio para una persona del plan ${plan.nombre}`,
      ),
    }));

    const precios = validarPreciosDeTemporada(planesPosibles, valores);
    if (!precios.valido) throw new ErrorDeValidacion(precios.motivo);

    const cruces = crucesDeTemporada(
      {
        id,
        alojamientoId,
        desde: fechas.desde,
        hasta: fechas.hasta,
        planIds: precios.precios.map((precio) => precio.planId),
      },
      existentes,
    );
    if (cruces.length > 0) {
      const [primero] = cruces;
      const nombresPlanes = primero.planIds
        .map((planId) => planes.find((plan) => plan.planId === planId)?.nombre)
        .filter(Boolean)
        .join(", ");
      const alcance = alojamientoId
        ? (cabanas.find((cabana) => cabana.id === alojamientoId)?.nombre ??
          "esa cabaña")
        : "todas las cabañas";
      throw new ErrorDeValidacion(
        `Las fechas se cruzan con «${primero.temporada.nombre}» (${alcance}, ${rangoLegible(primero.temporada)}) en ${primero.planIds.length === 1 ? "el plan" : "los planes"} ${nombresPlanes}. Dos tarifas diferenciales para las mismas cabañas no pueden poner precio al mismo plan en las mismas noches: cambia las fechas, o deja ese plan en blanco en una de las dos.`,
      );
    }

    const { data, error } = await supabase.rpc("guardar_temporada", {
      p_id: id,
      p_nombre: nombre,
      p_alojamiento_id: alojamientoId,
      p_primera_noche: fechas.desde,
      /* La función recibe la última noche INCLUIDA y suma el día ella misma
         para guardar `[primera, última + 1)`. */
      p_ultima_noche: ultimaNoche(fechas),
      p_precios: precios.precios.map((precio) => ({
        plan_id: precio.planId,
        precio_noche: precio.precio_noche,
        precio_noche_1_persona: precio.precio_noche_1_persona,
      })),
    });

    if (error) {
      /* Los mensajes que lanza la propia función ya están en español. */
      if (error.code === "22023") throw new ErrorDeValidacion(error.message);
      if (error.code === "P0002") {
        throw new ErrorDeValidacion(
          "Esa tarifa diferencial ya no existe: alguien la borró mientras la editabas. Vuelve al listado.",
        );
      }
      throw traducirErrorPostgres(error, {
        exclusion: MENSAJE_CRUCE,
        check: "Alguno de los precios no es válido: revisa que sean números enteros mayores que cero.",
      });
    }

    const guardadaId = String(data ?? id ?? "");
    refrescar(guardadaId || undefined);
    revalidarSitioPublico();

    if (id) {
      return estadoOk(
        "Cambios guardados. Desde ya el sitio cobra estos precios en esas fechas; las reservas ya hechas no cambian.",
      );
    }

    redirect(
      `${RUTA_LISTA}?ok=${encodeURIComponent(
        `Tarifa diferencial «${nombre}» creada. Desde ya el sitio cobra estos precios en esas fechas.`,
      )}`,
    );
  });
}

/**
 * Borra una tarifa diferencial (una «temporada» en el código). Sus precios se
 * van con ella (la base los borra en cascada) y esas fechas vuelven a la
 * tarifa base. Las reservas ya hechas no se tocan: su total quedó congelado
 * al reservar.
 */
export async function eliminarTemporadaAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!esUuid(id)) {
    redirect(`${RUTA_LISTA}?error=${encodeURIComponent("Esa tarifa diferencial no existe.")}`);
  }

  const { data, error } = await supabase
    .from("temporadas")
    .delete()
    .eq("id", id)
    .select("nombre");

  if (error) {
    redirect(
      `${RUTA_LISTA}?error=${encodeURIComponent(
        "No se pudo borrar la tarifa diferencial. Vuelve a intentarlo; si sigue pasando, avísale al desarrollador.",
      )}`,
    );
  }

  const nombre = data?.[0]?.nombre
    ? `La tarifa diferencial «${data[0].nombre}»`
    : "La tarifa diferencial";

  refrescar();
  revalidarSitioPublico();
  redirect(
    `${RUTA_LISTA}?ok=${encodeURIComponent(
      `${nombre} se borró. Esas fechas vuelven a cobrarse con el precio base; las reservas ya hechas no cambian.`,
    )}`,
  );
}
