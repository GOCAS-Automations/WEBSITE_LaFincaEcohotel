"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { clasesBoton } from "@/components/ui/boton";
import { formatearCOP, formatearFechaCorta } from "@/lib/utils/formato";
import { enlaceWhatsapp, mensajeReserva } from "@/lib/whatsapp";

import { IconoCheck, IconoWhatsapp } from "./iconos";

/**
 * Selector de reserva — puente hasta que exista el motor.
 *
 * ---------------------------------------------------------------------------
 * PENSADO PARA QUE EL MOTOR ENTRE DESPUÉS SIN REHACERLO
 * ---------------------------------------------------------------------------
 * El estado que maneja (cabaña, plan, entrada, salida) es EXACTAMENTE el que
 * necesitará el motor de reservas: cuando exista, se sustituye el enlace de
 * WhatsApp del final por el paso de datos del huésped y el resto sigue igual.
 * Por eso las fechas ya se validan entre sí y el total ya se calcula por
 * noches, aunque hoy solo sirva para redactar un mensaje.
 *
 * El precio que se muestra es SIEMPRE una estimación con la tarifa publicada:
 * el precio real lo confirma el equipo. Cuando llegue el motor, ese cálculo
 * tendrá que rehacerse en el servidor —lo que se calcula en el navegador es
 * para mirar, nunca para cobrar—.
 *
 * Accesibilidad: cada grupo es un `<fieldset>` con su `<legend>`; las tarjetas
 * son `<label>` con un `<input type="radio">` real escondido, así que funcionan
 * con teclado (flechas dentro del grupo) y se anuncian como opciones.
 *
 * ---------------------------------------------------------------------------
 * LOS PARÁMETROS DE LA DIRECCIÓN
 * ---------------------------------------------------------------------------
 * Lee `?cabana=`, `?plan=`, `?entrada=` y `?salida=`. Los dos últimos son los
 * que envía el módulo de reserva de la portada: quien ya eligió fechas allí
 * arriba no puede llegar aquí y encontrarse los campos vacíos.
 *
 * Se leen desde el CLIENTE, dentro del `<Suspense>` de la página. Leerlos en el
 * servidor volvería dinámica la ruta `/reservar` y perdería su prerenderizado.
 *
 * Las fechas que llegan por la dirección **se validan**, no se creen: una URL
 * la escribe cualquiera (o la hereda de un enlace viejo compartido por
 * WhatsApp). Se exige el formato `AAAA-MM-DD` real, que la llegada no sea
 * anterior a hoy y que la salida sea posterior a la llegada. Lo que no pasa el
 * filtro se ignora en silencio: el visitante ve el formulario vacío, que es
 * mejor que verlo con una fecha del año pasado ya elegida.
 */

/** `AAAA-MM-DD` y además una fecha que existe (descarta 2026-02-31). */
function esFechaValida(valor: string | null): valor is string {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T12:00:00Z`);
  return (
    !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
  );
}

export type CabanaSeleccionable = {
  slug: string;
  nombre: string;
  tarifas: { plan: string; precio: number }[];
};

type Props = {
  cabanas: CabanaSeleccionable[];
  /** Nombres de los planes, en su orden de catálogo. */
  planes: string[];
  whatsapp: string;
  /** Fecha mínima seleccionable (`AAAA-MM-DD`), calculada en el servidor. */
  hoy: string;
};

export function SelectorReserva({ cabanas, planes, whatsapp, hoy }: Props) {
  const parametros = useSearchParams();

  const cabanaInicial =
    cabanas.find((cabana) => cabana.slug === parametros.get("cabana"))?.slug ??
    null;
  const planInicial =
    planes.find(
      (plan) => plan.toLowerCase() === parametros.get("plan")?.toLowerCase(),
    ) ?? null;

  const entradaUrl = parametros.get("entrada");
  const salidaUrl = parametros.get("salida");
  /* Una llegada anterior a hoy no se acepta: el `min` del campo la rechazaría
     igualmente y el visitante se quedaría con un valor que no puede enviar. */
  const entradaInicial =
    esFechaValida(entradaUrl) && entradaUrl >= hoy ? entradaUrl : "";
  const salidaInicial =
    esFechaValida(salidaUrl) && entradaInicial && salidaUrl > entradaInicial
      ? salidaUrl
      : "";

  const [slug, setSlug] = useState<string | null>(cabanaInicial);
  const [plan, setPlan] = useState<string | null>(planInicial);
  const [entrada, setEntrada] = useState(entradaInicial);
  const [salida, setSalida] = useState(salidaInicial);

  const cabana = cabanas.find((opcion) => opcion.slug === slug) ?? null;

  const precioNoche = useMemo(() => {
    if (!cabana || !plan) return null;
    return (
      cabana.tarifas.find((tarifa) => tarifa.plan === plan)?.precio ?? null
    );
  }, [cabana, plan]);

  const noches = useMemo(() => {
    if (!entrada || !salida || salida <= entrada) return 0;
    const ms = Date.parse(`${salida}T12:00:00Z`) - Date.parse(`${entrada}T12:00:00Z`);
    return Math.round(ms / 86_400_000);
  }, [entrada, salida]);

  const fechasInvalidas = Boolean(entrada && salida && salida <= entrada);
  const total = precioNoche !== null && noches > 0 ? precioNoche * noches : null;

  const enlace = enlaceWhatsapp(
    mensajeReserva({
      cabana: cabana?.nombre ?? null,
      plan,
      entrada: entrada || null,
      salida: fechasInvalidas ? null : salida || null,
      precioNoche,
    }),
    whatsapp,
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-10">
      <div
        className="flex flex-col gap-8"
        /* Igual que en `ModuloReserva`: mientras estos campos —cabaña, plan,
           fechas— estén en el viewport, el FAB de WhatsApp se aparta. Quien
           llega desde el módulo de la portada cae aquí mismo por el ancla
           `#solicitud`, y sin esto el FAB tapaba justo el bloque de fechas. */
        data-fab-evitar=""
      >
        {/* Cabaña */}
        <fieldset className="flex flex-col gap-4">
          <legend className="font-titulo text-lg font-bold text-petroleo-900">
            1. Elige tu cabaña
          </legend>
          <ul className="grid gap-3 sm:grid-cols-2">
            {cabanas.map((opcion) => {
              const activa = opcion.slug === slug;
              const desde = opcion.tarifas.length
                ? Math.min(...opcion.tarifas.map((tarifa) => tarifa.precio))
                : null;
              return (
                <li key={opcion.slug}>
                  <label
                    className={[
                      "flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-tarjeta)] border px-4 py-3.5 transition-all duration-200",
                      activa
                        ? "border-petroleo-600 bg-petroleo-50 shadow-[var(--shadow-tenue)]"
                        : "border-crema-300/80 bg-white hover:border-petroleo-300",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="cabana"
                      value={opcion.slug}
                      checked={activa}
                      onChange={() => setSlug(opcion.slug)}
                      className="sr-only"
                    />
                    <span className="font-titulo text-sm font-semibold text-petroleo-900">
                      {opcion.nombre}
                    </span>
                    <span className="flex items-center gap-2">
                      {desde !== null ? (
                        <span className="text-xs text-crema-600">
                          desde {formatearCOP(desde)}
                        </span>
                      ) : null}
                      {activa ? (
                        <IconoCheck className="size-4 text-petroleo-600" />
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        {/* Plan */}
        <fieldset className="flex flex-col gap-4">
          <legend className="font-titulo text-lg font-bold text-petroleo-900">
            2. Elige tu plan
          </legend>
          <ul className="grid gap-3 sm:grid-cols-3">
            {planes.map((nombre) => {
              const activo = nombre === plan;
              const precio =
                cabana?.tarifas.find((tarifa) => tarifa.plan === nombre)
                  ?.precio ?? null;
              return (
                <li key={nombre}>
                  <label
                    className={[
                      "flex h-full cursor-pointer flex-col gap-1 rounded-[var(--radius-tarjeta)] border px-4 py-3.5 transition-all duration-200",
                      activo
                        ? "border-petroleo-600 bg-petroleo-50 shadow-[var(--shadow-tenue)]"
                        : "border-crema-300/80 bg-white hover:border-petroleo-300",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={nombre}
                      checked={activo}
                      onChange={() => setPlan(nombre)}
                      className="sr-only"
                    />
                    <span className="font-titulo text-sm font-semibold text-petroleo-900">
                      {nombre}
                    </span>
                    <span className="text-xs text-crema-600">
                      {precio !== null
                        ? `${formatearCOP(precio)} / noche`
                        : "Elige una cabaña para ver el precio"}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        {/* Fechas */}
        <fieldset className="flex flex-col gap-4">
          <legend className="font-titulo text-lg font-bold text-petroleo-900">
            3. ¿Qué fechas tienes en mente?{" "}
            <span className="font-normal text-crema-600">(opcional)</span>
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-crema-800">Llegada</span>
              <input
                type="date"
                value={entrada}
                min={hoy}
                onChange={(evento) => setEntrada(evento.target.value)}
                className="rounded-[var(--radius-suave)] border border-crema-300/80 bg-white px-4 py-3 text-sm text-petroleo-900 transition-colors duration-200 focus:border-petroleo-500"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-crema-800">Salida</span>
              <input
                type="date"
                value={salida}
                min={entrada || hoy}
                onChange={(evento) => setSalida(evento.target.value)}
                aria-invalid={fechasInvalidas}
                aria-describedby={fechasInvalidas ? "error-fechas" : undefined}
                className={[
                  "rounded-[var(--radius-suave)] border bg-white px-4 py-3 text-sm text-petroleo-900 transition-colors duration-200",
                  fechasInvalidas
                    ? "border-red-600"
                    : "border-crema-300/80 focus:border-petroleo-500",
                ].join(" ")}
              />
            </label>
          </div>
          {fechasInvalidas ? (
            <p id="error-fechas" className="text-sm text-red-700">
              La fecha de salida debe ser posterior a la de llegada.
            </p>
          ) : null}
        </fieldset>
      </div>

      {/* Resumen */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="flex flex-col gap-4 rounded-[var(--radius-generoso)] bg-white p-6 shadow-[var(--shadow-tarjeta)] ring-1 ring-crema-200/70">
          <h3 className="font-titulo text-lg font-bold text-petroleo-900">
            Tu solicitud
          </h3>

          <dl className="flex flex-col gap-2.5 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-crema-600">Cabaña</dt>
              <dd className="text-right font-medium text-petroleo-900">
                {cabana?.nombre ?? "Sin elegir"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-crema-600">Plan</dt>
              <dd className="text-right font-medium text-petroleo-900">
                {plan ?? "Sin elegir"}
              </dd>
            </div>
            {/*
              Las fechas se muestran en formato corto ("12 mar 2026") y no como
              `2026-03-12`: el resumen es lo que el visitante repasa antes de
              escribirle al hotel, y ahí una fecha se lee, no se descifra.
            */}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-crema-600">Llegada</dt>
              <dd className="text-right font-medium text-petroleo-900">
                {entrada ? formatearFechaCorta(entrada) : "Sin definir"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-crema-600">Salida</dt>
              <dd className="text-right font-medium text-petroleo-900">
                {salida && !fechasInvalidas
                  ? formatearFechaCorta(salida)
                  : "Sin definir"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-crema-600">Noches</dt>
              <dd className="text-right font-medium text-petroleo-900">
                {noches > 0 ? noches : "—"}
              </dd>
            </div>
            {precioNoche !== null ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-crema-600">Por noche</dt>
                <dd className="text-right font-medium text-petroleo-900">
                  {formatearCOP(precioNoche)}
                </dd>
              </div>
            ) : null}
          </dl>

          {total !== null ? (
            <p className="flex items-baseline justify-between gap-3 border-t border-crema-200 pt-4">
              <span className="font-titulo text-sm font-semibold text-crema-700">
                Total estimado
              </span>
              <span className="font-titulo text-2xl font-extrabold text-petroleo-700">
                {formatearCOP(total)}
              </span>
            </p>
          ) : null}

          <a
            href={enlace}
            target="_blank"
            rel="noopener noreferrer"
            className={clasesBoton("primario", "grande", "w-full")}
          >
            <IconoWhatsapp className="size-5" />
            Solicitar por WhatsApp
          </a>

          <p className="text-xs leading-relaxed text-crema-600">
            Te llevamos a WhatsApp con el mensaje ya escrito. El total es una
            estimación con la tarifa publicada: el equipo confirma
            disponibilidad y precio final antes de cobrar.
          </p>
        </div>
      </aside>
    </div>
  );
}
