"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { guardarReservaAction } from "./acciones";
import { FormularioAccion } from "@/components/admin/formulario-accion";
import {
  AreaTexto,
  Campo,
  CLASE_INPUT,
  Desplegable,
  Divisor,
  Entrada,
} from "@/components/admin/ui";
import type { ExtraDeReserva } from "@/lib/admin/datos";
import { fechaCorta, hoyISO, nochesEntre, sumarDiasISO } from "@/lib/admin/fechas";
import {
  AYUDA_ESTADO,
  AYUDA_TIPO_RESERVA,
  ESTADOS_RESERVA,
  ETIQUETA_ESTADO,
  ETIQUETA_ORIGEN,
  ETIQUETA_TIPO_RESERVA,
  ORIGENES_RESERVA,
  TIPOS_RESERVA,
  type OpcionAlojamiento,
  type OpcionPlan,
  type ReservaAdmin,
} from "@/lib/admin/tipos";
import {
  CUPO_DIA_DE_CALMA,
  HORARIO_DIA_POR_DEFECTO,
  MAX_PERSONAS_POR_RESERVA_DIA,
  textoCupo,
} from "@/lib/reserva/dia-de-calma";
import {
  ANTICIPO_MAXIMO,
  ANTICIPO_MINIMO,
  calcularAnticipo,
  escalaDeAnticipo,
  normalizarPorcentajeAnticipo,
  type PorcentajeAnticipo,
} from "@/lib/reserva/total";
import { precioDeNoche, type TarifaCotizable } from "@/lib/reserva/cotizacion";
import { formatearCOP } from "@/lib/utils/formato";
import type {
  EstadoReserva,
  Extra,
  TipoReserva,
} from "@/lib/tipos/basedatos";

/**
 * Formulario de reserva manual: la que se apunta cuando alguien escribe por
 * WhatsApp o llama.
 *
 * ---------------------------------------------------------------------------
 * DOS FORMAS DE VENDER EN UN SOLO FORMULARIO
 * ---------------------------------------------------------------------------
 * · **Hospedaje**: cabaña, entrada y salida. Esas noches quedan ocupadas.
 * · **Día de Calma**: una sola fecha, sin cabaña, con el cupo de
 *   {@link CUPO_DIA_DE_CALMA} personas por día a la vista. No bloquea ninguna
 *   cabaña: el mismo día puede haber gente durmiendo y gente de día.
 *
 * ---------------------------------------------------------------------------
 * LAS EXPERIENCIAS VAN POR NOCHE
 * ---------------------------------------------------------------------------
 * La torta de aniversario se sirve un día concreto, así que cada noche de la
 * estadía tiene su propia lista. Los adicionales que no son de una noche —la
 * segunda mascota— van en el bloque «Para toda la estadía» y se guardan con
 * `noche = null`. Todo viaja como JSON en un único campo `extras`: son ternas
 * (extra, noche, cantidad) y con campos sueltos no había forma de distinguir
 * el fondue del viernes del fondue del sábado.
 *
 * El valor del alojamiento se calcula solo (precio del plan × noches) pero
 * queda EDITABLE: en la práctica se pacta un descuento, se cobra un festivo
 * distinto o se acuerda algo por fuera de la tarifa, y un panel que no deje
 * escribir el número real obliga a mentirle a la base de datos.
 *
 * El total nunca se escribe a mano: es alojamiento + extras. Que salga de una
 * suma visible evita cuadres imposibles después.
 */

/** Clave de una línea de extra: el mismo extra puede ir en varias noches. */
function claveExtra(noche: string | null, id: string): string {
  return `${noche ?? ""}|${id}`;
}

export function FormularioReserva({
  reserva,
  alojamientos,
  planes,
  tarifas,
  extras,
  extrasElegidos,
}: {
  reserva: ReservaAdmin | null;
  alojamientos: OpcionAlojamiento[];
  planes: OpcionPlan[];
  /**
   * Las tarifas de cada cabaña × plan, con sus temporadas, indexadas por
   * `alojamientoId|planId`. El valor sugerido sale de `precioDeNoche()`, la
   * misma función con que cobra el sitio.
   */
  tarifas: Record<string, TarifaCotizable>;
  extras: Extra[];
  extrasElegidos: ExtraDeReserva[];
}) {
  const hoy = hoyISO();

  const planesHospedaje = planes.filter((plan) => plan.tipo !== "dia");
  const planesDia = planes.filter((plan) => plan.tipo === "dia");

  const [tipo, setTipo] = useState<TipoReserva>(reserva?.tipo ?? "hospedaje");
  const esDia = tipo === "dia";

  const [alojamientoId, setAlojamientoId] = useState(
    reserva?.alojamiento_id ?? alojamientos[0]?.id ?? "",
  );
  const [planId, setPlanId] = useState(
    reserva?.plan_id ??
      (reserva?.tipo === "dia" ? planesDia[0]?.id : planesHospedaje[0]?.id) ??
      planes[0]?.id ??
      "",
  );
  const [entrada, setEntrada] = useState(reserva?.entrada ?? hoy);
  const [salida, setSalida] = useState(reserva?.salida ?? sumarDiasISO(hoy, 1));

  const [subtotal, setSubtotal] = useState(
    reserva ? String(reserva.subtotal_alojamiento) : "",
  );
  const [subtotalTocado, setSubtotalTocado] = useState(Boolean(reserva));
  const [estado, setEstado] = useState<EstadoReserva>(
    reserva?.estado ?? "confirmada",
  );
  const [personas, setPersonas] = useState(String(reserva?.num_personas ?? 2));
  const [porcentaje, setPorcentaje] = useState<PorcentajeAnticipo>(
    normalizarPorcentajeAnticipo(reserva?.porcentaje_anticipo),
  );

  /* --- Las experiencias elegidas, por noche ----------------------------- */

  const [seleccion, setSeleccion] = useState<Record<string, number>>(() => {
    const inicial: Record<string, number> = {};
    for (const elegido of extrasElegidos) {
      inicial[claveExtra(elegido.noche, elegido.extra_id)] = elegido.cantidad;
    }
    return inicial;
  });

  /* Los precios de lo ya guardado NO se recalculan: se congelaron al reservar
     y cambiar la tarifa del catálogo no puede cambiar lo que se le cobró a un
     huésped que ya reservó. */
  const [preciosCongelados] = useState<Record<string, number>>(() => {
    const inicial: Record<string, number> = {};
    for (const elegido of extrasElegidos) {
      inicial[claveExtra(elegido.noche, elegido.extra_id)] =
        elegido.precio_unitario;
    }
    return inicial;
  });

  const noches = useMemo(
    () => (entrada && salida ? Math.max(0, nochesEntre(entrada, salida)) : 0),
    [entrada, salida],
  );

  /** Las noches de la estadía, en orden: una sección de extras por cada una. */
  const fechasDeNoche = useMemo(() => {
    if (esDia || !entrada || !salida || salida <= entrada) return [];
    const lista: string[] = [];
    for (let dia = entrada; dia < salida && lista.length < 120; ) {
      lista.push(dia);
      dia = sumarDiasISO(dia, 1);
    }
    return lista;
  }, [esDia, entrada, salida]);

  /* --- El cupo del día, consultado al servidor -------------------------- */

  const [cupo, setCupo] = useState<{
    estado: "inactivo" | "cargando" | "ok" | "error";
    usado: number | null;
    restante: number | null;
  }>({ estado: "inactivo", usado: null, restante: null });

  useEffect(() => {
    if (!esDia || !entrada) {
      setCupo({ estado: "inactivo", usado: null, restante: null });
      return;
    }
    const control = new AbortController();
    setCupo({ estado: "cargando", usado: null, restante: null });

    fetch(`/api/dia-de-calma/cupo?fecha=${encodeURIComponent(entrada)}`, {
      signal: control.signal,
      cache: "no-store",
    })
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error("respuesta no válida");
        return respuesta.json();
      })
      .then((datos: { usado?: number; restante?: number }) =>
        setCupo({
          estado: "ok",
          usado: Number(datos.usado ?? 0),
          restante: Number(datos.restante ?? 0),
        }),
      )
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCupo({ estado: "error", usado: null, restante: null });
      });

    return () => control.abort();
  }, [esDia, entrada]);

  /* --- El plan sigue al tipo de reserva --------------------------------- */

  useEffect(() => {
    const disponibles = esDia ? planesDia : planesHospedaje;
    if (disponibles.length === 0) return;
    if (!disponibles.some((plan) => plan.id === planId)) {
      setPlanId(disponibles[0].id);
    }
    // `planes` no cambia dentro de la vida del formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esDia, planId]);

  /* --- El precio sugerido ----------------------------------------------- */

  const planElegido = planes.find((plan) => plan.id === planId) ?? null;
  const tarifa = esDia ? null : (tarifas[`${alojamientoId}|${planId}`] ?? null);

  /* Noche por noche con `precioDeNoche()`: la misma regla que el sitio
     (temporadas incluidas, y el precio de una persona si viaja una sola). Aquí
     el plan lo elige el equipo, no el tipo de noche: es una reserva pactada a
     mano y el valor queda editable. */
  const preciosPorNoche = useMemo(() => {
    if (!tarifa) return [];
    const adultos = Number(personas) === 1 ? 1 : 2;
    return fechasDeNoche.map((fecha) => precioDeNoche(tarifa, fecha, adultos));
  }, [tarifa, fechasDeNoche, personas]);
  const precioNoche = preciosPorNoche[0]?.precio ?? tarifa?.precio_noche ?? null;
  const mismoPrecioTodasLasNoches = preciosPorNoche.every(
    (linea) => linea.precio === preciosPorNoche[0]?.precio,
  );
  const temporadasEnLaEstadia = [
    ...new Set(
      preciosPorNoche
        .map((linea) => linea.temporada)
        .filter((nombre): nombre is string => nombre !== null),
    ),
  ];

  const sugerido = esDia
    ? (planElegido?.precio_base ?? null)
    : tarifa
      ? preciosPorNoche.reduce((suma, linea) => suma + linea.precio, 0)
      : null;

  // Mientras nadie toque el importe a mano, sigue a la tarifa.
  useEffect(() => {
    if (subtotalTocado) return;
    setSubtotal(sugerido !== null ? String(sugerido) : "");
  }, [sugerido, subtotalTocado]);

  // Si la salida deja de ser posterior a la entrada, se corrige sola: es más
  // amable que un error después de darle a guardar.
  useEffect(() => {
    if (!esDia && entrada && salida && salida <= entrada) {
      setSalida(sumarDiasISO(entrada, 1));
    }
  }, [esDia, entrada, salida]);

  /* --- Las cuentas ------------------------------------------------------- */

  const subtotalNumero = Number(subtotal.replace(/[.\s$,]/g, "")) || 0;

  /** Las líneas de extras que se van a guardar, ya con su precio y su noche. */
  const lineasExtras = useMemo(() => {
    const nochesValidas = new Set(fechasDeNoche);
    const lineas: {
      extra_id: string;
      noche: string | null;
      cantidad: number;
      precio_unitario: number;
      nombre: string;
    }[] = [];

    for (const [clave, cantidad] of Object.entries(seleccion)) {
      if (!cantidad || cantidad < 1) continue;
      const separador = clave.indexOf("|");
      const etiqueta = clave.slice(0, separador);
      const id = clave.slice(separador + 1);
      const noche = etiqueta ? etiqueta : null;
      /* Si se cambian las fechas, lo que estaba en una noche que ya no existe
         pasa a «toda la estadía» en vez de desaparecer sin avisar. */
      const nocheFinal = noche && nochesValidas.has(noche) ? noche : null;

      const extra = extras.find((item) => item.id === id);
      if (!extra) continue;

      lineas.push({
        extra_id: id,
        noche: nocheFinal,
        cantidad,
        precio_unitario: preciosCongelados[clave] ?? extra.precio,
        nombre: extra.nombre,
      });
    }
    return lineas;
  }, [seleccion, extras, fechasDeNoche, preciosCongelados]);

  const subtotalExtras = lineasExtras.reduce(
    (suma, linea) => suma + linea.cantidad * linea.precio_unitario,
    0,
  );

  const total = subtotalNumero + subtotalExtras;
  const anticipo = porcentaje === 100 ? total : Math.round(total / 2);

  function cambiarExtra(noche: string | null, id: string, cantidad: number) {
    const clave = claveExtra(noche, id);
    setSeleccion((actual) => {
      const siguiente = { ...actual };
      if (cantidad <= 0) delete siguiente[clave];
      else siguiente[clave] = Math.min(99, cantidad);
      return siguiente;
    });
  }

  const experiencias = extras.filter((extra) => extra.tipo === "experiencia");
  const adicionales = extras.filter((extra) => extra.tipo !== "experiencia");

  return (
    <FormularioAccion
      accion={guardarReservaAction}
      etiquetaEnviar={reserva ? "Guardar cambios" : "Crear reserva"}
      secundario={
        <Link
          href={reserva ? `/admin/reservas/${reserva.id}` : "/admin/reservas"}
          className="text-[0.875rem] font-semibold text-crema-700 underline-offset-4 hover:underline"
        >
          Cancelar
        </Link>
      }
    >
      {reserva && <input type="hidden" name="id" value={reserva.id} />}
      {/* Las experiencias viajan como JSON: cada línea es extra + noche. */}
      <input
        type="hidden"
        name="extras"
        value={JSON.stringify(
          lineasExtras.map(({ extra_id, noche, cantidad, precio_unitario }) => ({
            extra_id,
            noche,
            cantidad,
            precio_unitario,
          })),
        )}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Divisor titulo="Qué se reservó" />

        <Campo
          etiqueta="Tipo de reserva"
          htmlFor="tipo"
          obligatorio
          className="sm:col-span-2"
          ayuda={AYUDA_TIPO_RESERVA[tipo]}
        >
          <Desplegable
            id="tipo"
            name="tipo"
            value={tipo}
            onChange={(evento) => {
              setTipo(evento.target.value as TipoReserva);
              setSubtotalTocado(false);
            }}
            required
          >
            {TIPOS_RESERVA.map((opcion) => (
              <option key={opcion} value={opcion}>
                {ETIQUETA_TIPO_RESERVA[opcion]}
              </option>
            ))}
          </Desplegable>
        </Campo>

        {!esDia && (
          <Campo etiqueta="Cabaña" htmlFor="alojamiento_id" obligatorio>
            <Desplegable
              id="alojamiento_id"
              name="alojamiento_id"
              value={alojamientoId}
              onChange={(evento) => setAlojamientoId(evento.target.value)}
              required
            >
              {alojamientos.map((alojamiento) => (
                <option key={alojamiento.id} value={alojamiento.id}>
                  {alojamiento.nombre}
                  {alojamiento.activo ? "" : " (pausada)"}
                </option>
              ))}
            </Desplegable>
          </Campo>
        )}

        <Campo
          etiqueta="Plan"
          htmlFor="plan_id"
          obligatorio
          ayuda={
            esDia
              ? `Horario: ${planElegido?.horario ?? HORARIO_DIA_POR_DEFECTO}. Sin hospedaje.`
              : undefined
          }
        >
          <Desplegable
            id="plan_id"
            name="plan_id"
            value={planId}
            onChange={(evento) => {
              setPlanId(evento.target.value);
              setSubtotalTocado(false);
            }}
            required
          >
            {(esDia ? planesDia : planesHospedaje).map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.nombre}
              </option>
            ))}
          </Desplegable>
        </Campo>

        <Campo
          etiqueta={esDia ? "Fecha del día" : "Entrada"}
          htmlFor="entrada"
          obligatorio
          ayuda={
            esDia
              ? "El Día de Calma dura un solo día y no ocupa ninguna cabaña."
              : undefined
          }
        >
          <Entrada
            id="entrada"
            name="entrada"
            type="date"
            value={entrada}
            onChange={(evento) => setEntrada(evento.target.value)}
            required
          />
        </Campo>

        {!esDia && (
          <Campo
            etiqueta="Salida"
            htmlFor="salida"
            obligatorio
            ayuda={
              noches > 0
                ? `${noches} ${noches === 1 ? "noche" : "noches"}`
                : "La salida debe ser posterior a la entrada."
            }
          >
            <Entrada
              id="salida"
              name="salida"
              type="date"
              value={salida}
              min={entrada ? sumarDiasISO(entrada, 1) : undefined}
              onChange={(evento) => setSalida(evento.target.value)}
              required
            />
          </Campo>
        )}

        <Campo
          etiqueta={esDia ? "Cuántas personas" : "Cuántos adultos"}
          htmlFor="num_personas"
          obligatorio
          ayuda={
            esDia
              ? cupo.estado === "ok" && cupo.restante !== null
                ? `Una o dos personas por reserva. ${cupo.usado ?? 0} de ${CUPO_DIA_DE_CALMA} cupos ya ocupados ese día. ${textoCupo(cupo.restante)}`
                : cupo.estado === "cargando"
                  ? "Consultando el cupo de ese día…"
                  : `Una o dos personas por reserva; máximo ${CUPO_DIA_DE_CALMA} personas por día en toda la finca.`
              : "Las cabañas son para dos personas y La Finca no recibe menores de edad."
          }
        >
          <Entrada
            id="num_personas"
            name="num_personas"
            type="number"
            min={1}
            max={esDia ? MAX_PERSONAS_POR_RESERVA_DIA : 30}
            required
            value={personas}
            onChange={(evento) => setPersonas(evento.target.value)}
          />
        </Campo>

        <Divisor titulo="Huésped" />

        <Campo etiqueta="Nombre completo" htmlFor="huesped_nombre" obligatorio>
          <Entrada
            id="huesped_nombre"
            name="huesped_nombre"
            defaultValue={reserva?.huesped_nombre ?? ""}
            required
            maxLength={160}
            placeholder="Ana María Restrepo"
          />
        </Campo>

        <Campo etiqueta="Teléfono" htmlFor="huesped_telefono" obligatorio>
          <Entrada
            id="huesped_telefono"
            name="huesped_telefono"
            type="tel"
            defaultValue={reserva?.huesped_telefono ?? ""}
            required
            maxLength={60}
            placeholder="+57 300 000 0000"
          />
        </Campo>

        <Campo
          etiqueta="Correo"
          htmlFor="huesped_email"
          ayuda="Opcional. Si lo tienes, es por donde se enviará la confirmación."
        >
          <Entrada
            id="huesped_email"
            name="huesped_email"
            type="email"
            defaultValue={reserva?.huesped_email ?? ""}
            maxLength={200}
            placeholder="ana@correo.com"
          />
        </Campo>

        <Campo
          etiqueta="Documento"
          htmlFor="huesped_documento"
          ayuda="Solo para el registro de huéspedes del check-in. No hace falta para reservar y el sitio nunca lo pide: déjalo vacío hasta que la persona llegue."
        >
          <Entrada
            id="huesped_documento"
            name="huesped_documento"
            defaultValue={reserva?.huesped_documento ?? ""}
            maxLength={60}
            placeholder="Cédula o pasaporte"
          />
        </Campo>

        <Campo etiqueta="Cómo llegó la reserva" htmlFor="origen" obligatorio>
          <Desplegable
            id="origen"
            name="origen"
            defaultValue={reserva?.origen ?? "whatsapp"}
            required
          >
            {ORIGENES_RESERVA.map((origen) => (
              <option key={origen} value={origen}>
                {ETIQUETA_ORIGEN[origen]}
              </option>
            ))}
          </Desplegable>
        </Campo>

        {/* -----------------------------------------------------------------
            AUTORIZACIÓN DE DATOS (Ley 1581 de 2012).

            La ley obliga a **conservar prueba** de que el huésped autorizó el
            tratamiento de sus datos. Quien marca aquí es quien atiende el
            WhatsApp o el teléfono, y por eso el desplegable pregunta POR DÓNDE
            la dio: una casilla marcada en el sitio y un «sí» dicho por
            teléfono no valen lo mismo, y disfrazar el segundo de lo primero
            sería peor que no registrar nada.

            La solicitud que llega del sitio trae la frase de la autorización
            escrita al final del mensaje de WhatsApp: si está, se elige
            «WhatsApp (con la casilla del sitio)».
        ------------------------------------------------------------------ */}
        <Campo
          etiqueta="Autorización de datos"
          htmlFor="autorizacion_datos_canal"
          className="sm:col-span-2"
          ayuda="Por dónde autorizó el huésped el tratamiento de sus datos personales. Si la solicitud llegó del sitio, el mensaje de WhatsApp termina con la frase de la autorización."
        >
          <Desplegable
            id="autorizacion_datos_canal"
            name="autorizacion_datos_canal"
            defaultValue={reserva?.autorizacion_datos_canal ?? ""}
          >
            <option value="">Sin constancia todavía</option>
            <option value="web">
              Casilla del sitio (reserva hecha en la web)
            </option>
            <option value="whatsapp">
              WhatsApp (con la casilla del sitio)
            </option>
            <option value="telefono">Por teléfono (autorización verbal)</option>
            <option value="presencial">En el hotel (autorización verbal)</option>
            <option value="panel">
              La apuntó el equipo sin constancia del canal
            </option>
          </Desplegable>
        </Campo>

        <Campo
          etiqueta="Notas"
          htmlFor="notas"
          className="sm:col-span-2"
          ayuda="Para lo que haga falta recordar: hora de llegada, alergias, decoración pedida…"
        >
          <AreaTexto
            id="notas"
            name="notas"
            defaultValue={reserva?.notas ?? ""}
            maxLength={4000}
            rows={3}
          />
        </Campo>

        <Divisor titulo="Dinero" />

        <Campo
          etiqueta={esDia ? "Valor del día" : "Valor del alojamiento"}
          htmlFor="subtotal_alojamiento"
          obligatorio
          ayuda={
            esDia
              ? planElegido?.precio_base !== null &&
                planElegido?.precio_base !== undefined
                ? `Precio publicado del plan: ${formatearCOP(planElegido.precio_base)} para dos personas. Puedes cambiarlo si acordaste otro valor.`
                : "Ese plan no tiene precio publicado. Escribe el valor acordado."
              : tarifa && precioNoche !== null
                ? mismoPrecioTodasLasNoches
                  ? `Tarifa de esa cabaña con ese plan: ${formatearCOP(precioNoche)} por noche × ${noches} = ${formatearCOP(sugerido ?? 0)}${temporadasEnLaEstadia.length > 0 ? ` (${temporadasEnLaEstadia.join(", ")})` : ""}. Puedes cambiarlo si acordaste otro precio.`
                  : `Suma noche por noche de esa cabaña con ese plan: ${formatearCOP(sugerido ?? 0)} por ${noches} noches; algunas tienen precio de ${temporadasEnLaEstadia.join(", ")}. Puedes cambiarlo si acordaste otro precio.`
                : "Esa cabaña no tiene precio para ese plan. Escribe el valor acordado."
          }
        >
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[0.9375rem] text-crema-500"
              aria-hidden="true"
            >
              $
            </span>
            <input
              id="subtotal_alojamiento"
              name="subtotal_alojamiento"
              type="text"
              inputMode="numeric"
              required
              value={subtotal}
              onChange={(evento) => {
                setSubtotalTocado(true);
                setSubtotal(evento.target.value);
              }}
              className={`${CLASE_INPUT} pl-8`}
            />
          </div>
          {subtotalTocado && sugerido !== null && subtotalNumero !== sugerido && (
            <button
              type="button"
              onClick={() => {
                setSubtotalTocado(false);
                setSubtotal(String(sugerido));
              }}
              className="mt-1.5 text-[0.75rem] font-semibold text-petroleo-700 underline-offset-4 hover:underline"
            >
              Volver a la tarifa ({formatearCOP(sugerido)})
            </button>
          )}
        </Campo>

        <Campo
          etiqueta="Abonado"
          htmlFor="monto_pagado"
          ayuda="Cuánto ha pagado ya el huésped. Déjalo en 0 si todavía no ha pagado."
        >
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[0.9375rem] text-crema-500"
              aria-hidden="true"
            >
              $
            </span>
            <input
              id="monto_pagado"
              name="monto_pagado"
              type="text"
              inputMode="numeric"
              defaultValue={reserva?.monto_pagado ?? 0}
              className={`${CLASE_INPUT} pl-8`}
            />
          </div>
        </Campo>

        {/*
          ANTICIPO: UN RANGO, NO DOS BOTONES (migración 010).
          Desde el 2026-09-15 el huésped elige en el sitio cualquier porcentaje
          entre el 50 % —el mínimo que confirma— y el 100 %. El panel tiene que
          poder anotar exactamente el que se pactó, así que aquí también es una
          escala de cinco en cinco. Se queda como `<select>` y no como
          deslizante: en el panel se transcribe una cifra ya decidida, y un
          desplegable se rellena con el teclado más rápido.
        */}
        <Campo
          etiqueta="Anticipo"
          htmlFor="porcentaje_anticipo"
          className="sm:col-span-2"
          ayuda={
            porcentaje >= ANTICIPO_MAXIMO
              ? "El huésped paga el total antes de llegar."
              : `El ${porcentaje} % confirma la reserva; el resto (${formatearCOP(
                  total - calcularAnticipo(total, porcentaje).anticipo,
                )}) se cobra por link de pago antes de la llegada.`
          }
        >
          <Desplegable
            id="porcentaje_anticipo"
            name="porcentaje_anticipo"
            value={String(porcentaje)}
            onChange={(evento) =>
              setPorcentaje(normalizarPorcentajeAnticipo(evento.target.value))
            }
          >
            {escalaDeAnticipo().map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion} %
                {opcion === ANTICIPO_MINIMO
                  ? " (el mínimo)"
                  : opcion === ANTICIPO_MAXIMO
                    ? " (pago total)"
                    : ""}{" "}
                — {formatearCOP(calcularAnticipo(total, opcion).anticipo)}
              </option>
            ))}
          </Desplegable>
        </Campo>

        {/* ---------------------------------------------------------------
            EXPERIENCIAS: una lista por noche, y otra para toda la estadía.
        ---------------------------------------------------------------- */}
        {extras.length > 0 && (
          <div className="sm:col-span-2">
            <p className="mb-2 text-[0.8125rem] font-semibold text-crema-900">
              Experiencias y adicionales
            </p>

            {!esDia && fechasDeNoche.length > 0 && experiencias.length > 0 && (
              <div className="mb-3 space-y-3">
                {fechasDeNoche.map((noche) => (
                  <fieldset
                    key={noche}
                    className="rounded-tarjeta bg-crema-900/[0.03] px-3.5 py-3"
                  >
                    <legend className="px-1 text-[0.75rem] font-semibold text-crema-700">
                      Noche del {fechaCorta(noche)}
                    </legend>
                    <ul className="space-y-2">
                      {experiencias.map((extra) => (
                        <FilaExtra
                          key={extra.id}
                          extra={extra}
                          cantidad={seleccion[claveExtra(noche, extra.id)] ?? 0}
                          alCambiar={(cantidad) =>
                            cambiarExtra(noche, extra.id, cantidad)
                          }
                        />
                      ))}
                    </ul>
                  </fieldset>
                ))}
              </div>
            )}

            {/* Lo que no pertenece a una noche: se guarda con `noche = null`.
                En un Día de Calma, todo va aquí. */}
            {(esDia ? extras : adicionales).length > 0 && (
              <fieldset className="rounded-tarjeta bg-crema-900/[0.03] px-3.5 py-3">
                <legend className="px-1 text-[0.75rem] font-semibold text-crema-700">
                  {esDia ? "Para ese día" : "Para toda la estadía"}
                </legend>
                <ul className="space-y-2">
                  {(esDia ? extras : adicionales).map((extra) => (
                    <FilaExtra
                      key={extra.id}
                      extra={extra}
                      cantidad={seleccion[claveExtra(null, extra.id)] ?? 0}
                      alCambiar={(cantidad) =>
                        cambiarExtra(null, extra.id, cantidad)
                      }
                    />
                  ))}
                </ul>
              </fieldset>
            )}
          </div>
        )}

        <div className="sm:col-span-2">
          <dl className="rounded-tarjeta bg-petroleo-600/[0.06] px-4 py-3.5 text-[0.875rem]">
            <div className="flex justify-between py-0.5">
              <dt className="text-crema-700">
                {esDia ? "Día de Calma" : "Alojamiento"}
              </dt>
              <dd className="font-medium text-crema-900">
                {formatearCOP(subtotalNumero)}
              </dd>
            </div>
            <div className="flex justify-between py-0.5">
              <dt className="text-crema-700">Experiencias y adicionales</dt>
              <dd className="font-medium text-crema-900">
                {formatearCOP(subtotalExtras)}
              </dd>
            </div>
            <div className="mt-1.5 flex justify-between border-t border-petroleo-600/15 pt-2">
              <dt className="font-semibold text-crema-900">Total</dt>
              <dd className="font-titulo text-[1.125rem] font-semibold text-petroleo-700">
                {formatearCOP(total)}
              </dd>
            </div>
            <div className="flex justify-between py-0.5">
              <dt className="text-crema-700">
                Anticipo ({porcentaje} %)
              </dt>
              <dd className="font-medium text-crema-900">
                {formatearCOP(anticipo)}
              </dd>
            </div>
          </dl>
        </div>

        <Divisor titulo="Estado" />

        <Campo
          etiqueta="Estado de la reserva"
          htmlFor="estado"
          obligatorio
          className="sm:col-span-2"
          /* La explicación va debajo y cambia con la opción elegida: metida
             dentro de cada <option> se corta en el celular. */
          ayuda={AYUDA_ESTADO[estado]}
        >
          <Desplegable
            id="estado"
            name="estado"
            value={estado}
            onChange={(evento) =>
              setEstado(evento.target.value as EstadoReserva)
            }
            required
          >
            {ESTADOS_RESERVA.map((opcion) => (
              <option key={opcion} value={opcion}>
                {ETIQUETA_ESTADO[opcion]}
              </option>
            ))}
          </Desplegable>
        </Campo>
      </div>
    </FormularioAccion>
  );
}

/** Una experiencia dentro de una noche (o de la estadía): casilla y cantidad. */
function FilaExtra({
  extra,
  cantidad,
  alCambiar,
}: {
  extra: Extra;
  cantidad: number;
  alCambiar: (cantidad: number) => void;
}) {
  const marcado = cantidad > 0;

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-tarjeta bg-white px-3.5 py-2.5 ring-1 ring-crema-900/[0.06]">
      <label className="flex flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={marcado}
          onChange={() => alCambiar(marcado ? 0 : 1)}
          className="h-5 w-5 shrink-0 accent-[var(--color-petroleo-600)]"
        />
        <span className="min-w-0">
          <span className="block text-[0.875rem] font-medium text-crema-900">
            {extra.nombre}
          </span>
          <span className="block text-[0.75rem] text-crema-600">
            {formatearCOP(extra.precio)} c/u
          </span>
        </span>
      </label>
      {marcado && (
        <label className="flex items-center gap-2 text-[0.75rem] text-crema-700">
          Cantidad
          {/* El ancho va en el contenedor: `CLASE_INPUT` trae `w-full` y no
              siempre pierde ante una clase escrita después. */}
          <span className="block w-16">
            <input
              type="number"
              min={1}
              max={99}
              value={cantidad}
              onChange={(evento) =>
                alCambiar(Math.max(1, Number(evento.target.value) || 1))
              }
              className={`${CLASE_INPUT} px-2 py-1.5 text-center text-[0.8125rem]`}
            />
          </span>
        </label>
      )}
    </li>
  );
}
