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
import { hoyISO, nochesEntre, sumarDiasISO } from "@/lib/admin/fechas";
import {
  AYUDA_ESTADO,
  ESTADOS_RESERVA,
  ETIQUETA_ESTADO,
  ETIQUETA_ORIGEN,
  ORIGENES_RESERVA,
  type OpcionAlojamiento,
  type OpcionPlan,
  type ReservaAdmin,
} from "@/lib/admin/tipos";
import { formatearCOP } from "@/lib/utils/formato";
import type { EstadoReserva, Extra } from "@/lib/tipos/basedatos";

/**
 * Formulario de reserva manual: la que se apunta cuando alguien escribe por
 * WhatsApp o llama.
 *
 * El valor del alojamiento se calcula solo (precio del plan × noches) pero
 * queda EDITABLE: en la práctica se pacta un descuento, se cobra un festivo
 * distinto o se acuerda algo por fuera de la tarifa, y un panel que no deje
 * escribir el número real obliga a mentirle a la base de datos.
 *
 * El total nunca se escribe a mano: es alojamiento + extras. Que salga de una
 * suma visible evita cuadres imposibles después.
 */

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
  /** Precios base indexados por `alojamientoId|planId`. */
  tarifas: Record<string, number>;
  extras: Extra[];
  extrasElegidos: ExtraDeReserva[];
}) {
  const hoy = hoyISO();

  const [alojamientoId, setAlojamientoId] = useState(
    reserva?.alojamiento_id ?? alojamientos[0]?.id ?? "",
  );
  const [planId, setPlanId] = useState(reserva?.plan_id ?? planes[0]?.id ?? "");
  const [entrada, setEntrada] = useState(reserva?.entrada ?? hoy);
  const [salida, setSalida] = useState(
    reserva?.salida ?? sumarDiasISO(hoy, 1),
  );

  const [subtotal, setSubtotal] = useState(
    reserva ? String(reserva.subtotal_alojamiento) : "",
  );
  const [subtotalTocado, setSubtotalTocado] = useState(Boolean(reserva));
  const [estado, setEstado] = useState<EstadoReserva>(
    reserva?.estado ?? "confirmada",
  );

  const [seleccion, setSeleccion] = useState<Record<string, number>>(() => {
    const inicial: Record<string, number> = {};
    for (const elegido of extrasElegidos) {
      inicial[elegido.extra_id] = elegido.cantidad;
    }
    return inicial;
  });

  const noches = useMemo(
    () => (entrada && salida ? Math.max(0, nochesEntre(entrada, salida)) : 0),
    [entrada, salida],
  );

  const precioNoche = tarifas[`${alojamientoId}|${planId}`] ?? null;
  const sugerido = precioNoche !== null ? precioNoche * noches : null;

  // Mientras nadie toque el importe a mano, sigue a la tarifa.
  useEffect(() => {
    if (subtotalTocado) return;
    setSubtotal(sugerido !== null ? String(sugerido) : "");
  }, [sugerido, subtotalTocado]);

  // Si la salida deja de ser posterior a la entrada, se corrige sola: es más
  // amable que un error después de darle a guardar.
  useEffect(() => {
    if (entrada && salida && salida <= entrada) {
      setSalida(sumarDiasISO(entrada, 1));
    }
  }, [entrada, salida]);

  const subtotalNumero = Number(subtotal.replace(/[.\s$,]/g, "")) || 0;

  const subtotalExtras = extras.reduce((suma, extra) => {
    const cantidad = seleccion[extra.id];
    return cantidad ? suma + cantidad * extra.precio : suma;
  }, 0);

  const total = subtotalNumero + subtotalExtras;

  function alternarExtra(extra: Extra) {
    setSeleccion((actual) => {
      const siguiente = { ...actual };
      if (siguiente[extra.id]) delete siguiente[extra.id];
      else siguiente[extra.id] = 1;
      return siguiente;
    });
  }

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

      <div className="grid gap-5 sm:grid-cols-2">
        <Divisor titulo="Estadía" />

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

        <Campo etiqueta="Plan" htmlFor="plan_id" obligatorio>
          <Desplegable
            id="plan_id"
            name="plan_id"
            value={planId}
            onChange={(evento) => setPlanId(evento.target.value)}
            required
          >
            {planes.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.nombre}
              </option>
            ))}
          </Desplegable>
        </Campo>

        <Campo etiqueta="Entrada" htmlFor="entrada" obligatorio>
          <Entrada
            id="entrada"
            name="entrada"
            type="date"
            value={entrada}
            onChange={(evento) => setEntrada(evento.target.value)}
            required
          />
        </Campo>

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

        <Campo etiqueta="Documento" htmlFor="huesped_documento">
          <Entrada
            id="huesped_documento"
            name="huesped_documento"
            defaultValue={reserva?.huesped_documento ?? ""}
            maxLength={60}
            placeholder="Cédula o pasaporte"
          />
        </Campo>

        <Campo
          etiqueta="Cuántas personas"
          htmlFor="num_personas"
          obligatorio
        >
          <Entrada
            id="num_personas"
            name="num_personas"
            type="number"
            min={1}
            max={30}
            required
            defaultValue={reserva?.num_personas ?? 2}
          />
        </Campo>

        <Campo
          etiqueta="Cómo llegó la reserva"
          htmlFor="origen"
          obligatorio
        >
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
          etiqueta="Valor del alojamiento"
          htmlFor="subtotal_alojamiento"
          obligatorio
          ayuda={
            precioNoche !== null
              ? `Tarifa de esa cabaña con ese plan: ${formatearCOP(precioNoche)} por noche × ${noches} = ${formatearCOP(sugerido ?? 0)}. Puedes cambiarlo si acordaste otro precio.`
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

        {extras.length > 0 && (
          <div className="sm:col-span-2">
            <p className="mb-2 text-[0.8125rem] font-semibold text-crema-900">
              Experiencias y adicionales
            </p>
            <ul className="space-y-2">
              {extras.map((extra) => {
                const cantidad = seleccion[extra.id];
                const marcado = Boolean(cantidad);
                return (
                  <li
                    key={extra.id}
                    className="flex flex-wrap items-center gap-3 rounded-tarjeta bg-crema-900/[0.03] px-3.5 py-2.5"
                  >
                    <input type="hidden" name="extra_id" value={extra.id} />
                    <input
                      type="hidden"
                      name={`precio_extra_${extra.id}`}
                      value={extra.precio}
                    />
                    <label className="flex flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        name="extra_elegido"
                        value={extra.id}
                        checked={marcado}
                        onChange={() => alternarExtra(extra)}
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
                        {/* El ancho va en el contenedor: `CLASE_INPUT` trae
                            `w-full` y no siempre pierde ante una clase escrita
                            después. */}
                        <span className="block w-16">
                          <input
                            type="number"
                            name={`cantidad_${extra.id}`}
                            min={1}
                            max={99}
                            value={cantidad}
                            onChange={(evento) =>
                              setSeleccion((actual) => ({
                                ...actual,
                                [extra.id]: Math.max(
                                  1,
                                  Number(evento.target.value) || 1,
                                ),
                              }))
                            }
                            className={`${CLASE_INPUT} px-2 py-1.5 text-center text-[0.8125rem]`}
                          />
                        </span>
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="sm:col-span-2">
          <dl className="rounded-tarjeta bg-petroleo-600/[0.06] px-4 py-3.5 text-[0.875rem]">
            <div className="flex justify-between py-0.5">
              <dt className="text-crema-700">Alojamiento</dt>
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
