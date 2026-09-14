"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { clasesBoton } from "@/components/ui/boton";
import {
  planCompatibleConFechas,
  restriccionDePlan,
  validarEstadia,
  type PlanConReglas,
} from "@/lib/reglas-reserva";
import { formatearCOP, formatearFechaCorta } from "@/lib/utils/formato";
import { enlaceWhatsapp, mensajeReserva } from "@/lib/whatsapp";

import { CalendarioFechas } from "./calendario-fechas";
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

/**
 * Un plan tal como lo necesita este selector: además del nombre, lo que hace
 * falta para aplicar la regla plan ↔ noches y para explicarlo.
 */
export type PlanSeleccionable = PlanConReglas & {
  descripcion: string | null;
  incluye: string[];
  /** Precio de referencia cuando todavía no hay cabaña elegida. */
  precio_base: number | null;
  /** Cierto si ese precio es el más bajo de varios: se antepone «desde». */
  precio_varia?: boolean;
  horario: string | null;
};

type Props = {
  cabanas: CabanaSeleccionable[];
  /** Los planes del catálogo, en orden. */
  planes: PlanSeleccionable[];
  whatsapp: string;
  /** Fecha mínima seleccionable (`AAAA-MM-DD`), calculada en el servidor. */
  hoy: string;
};

/*
  OJO CON EL `<legend>` Y EL `gap` DEL FIELDSET.
  Los cuatro pasos son `<fieldset className="flex flex-col gap-4">` con su
  `<legend>`. El navegador saca el `legend` del flujo del contenedor —es parte
  del borde del fieldset, no un hijo normal— así que el `gap` NO lo separa de la
  primera tarjeta: «1. Elige tu cabaña» quedaba pegado a la Cabaña 01. Cada
  `legend` lleva por eso su propio `mb-4`.
*/
export function SelectorReserva({ cabanas, planes, whatsapp, hoy }: Props) {
  const parametros = useSearchParams();

  const cabanaInicial =
    cabanas.find((cabana) => cabana.slug === parametros.get("cabana"))?.slug ??
    null;
  const planInicial =
    planes.find(
      (plan) =>
        plan.nombre.toLowerCase() === parametros.get("plan")?.toLowerCase(),
    )?.nombre ?? null;

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
  /*
    HUÉSPEDES: UNO O DOS, Y SIEMPRE ADULTOS.
    Las cinco cabañas tienen capacidad máxima de dos personas, y La Finca no
    recibe menores de edad —en ninguna cabaña ni en las zonas comunes, §5 de
    `docs/DATOS_CLIENTE.md`—. Un campo numérico libre invitaría a escribir «4»
    y a recibir después un «no se puede» por WhatsApp; dos botones no dejan
    lugar a dudas. Además el plan Entre Semana tiene un precio distinto para una
    sola persona, así que el dato hace falta de todos modos.
  */
  const [adultos, setAdultos] = useState(2);

  const cabana = cabanas.find((opcion) => opcion.slug === slug) ?? null;
  const planElegido = planes.find((opcion) => opcion.nombre === plan) ?? null;
  const restriccion = planElegido ? restriccionDePlan(planElegido) : null;

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

  /*
    La validación cubre las dos reglas a la vez: que la estadía no mezcle
    noches de entre semana con noches de fin de semana, y que encaje con el
    plan si ya hay uno elegido. Ver `src/lib/reglas-reserva.ts`.
  */
  const validacion = useMemo(() => {
    if (!entrada || !salida) return null;
    return validarEstadia(entrada, salida, restriccion);
  }, [entrada, salida, restriccion]);

  const fechasInvalidas = Boolean(validacion && !validacion.valida);
  const total = precioNoche !== null && noches > 0 && !fechasInvalidas
    ? precioNoche * noches
    : null;

  const enlace = enlaceWhatsapp(
    mensajeReserva({
      cabana: cabana?.nombre ?? null,
      plan,
      entrada: entrada || null,
      salida: fechasInvalidas ? null : salida || null,
      precioNoche,
      adultos,
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
          <legend className="mb-4 font-titulo text-lg font-bold text-petroleo-900">
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
          <legend className="mb-4 font-titulo text-lg font-bold text-petroleo-900">
            2. Elige tu plan
          </legend>
          {/*
            LOS PLANES, EXPLICADOS AQUÍ MISMO.
            Antes eran tres etiquetas con el nombre y el precio: quien no había
            leído la portada tenía que adivinar qué diferencia a «Estándar» de
            «Premium» y para qué días sirve cada uno. Ahora cada tarjeta trae
            los días en que aplica, el precio y lo que incluye, y debajo hay un
            enlace a la sección de planes de la portada para el detalle
            completo.
          */}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {planes.map((opcion) => {
              const nombre = opcion.nombre;
              const activo = nombre === plan;
              const precio =
                cabana?.tarifas.find((tarifa) => tarifa.plan === nombre)
                  ?.precio ??
                opcion.precio_base ??
                null;
              /* Si el visitante ya eligió fechas, los planes que no sirven para
                 esas noches se apagan Y dicen por qué. Es la mitad que falta de
                 la regla: el calendario apaga días según el plan, y esto apaga
                 planes según los días. */
              const { compatible, motivo } = planCompatibleConFechas(
                opcion,
                entrada || null,
                salida || null,
              );
              return (
                <li key={nombre}>
                  <label
                    className={[
                      "flex h-full flex-col gap-1.5 rounded-[var(--radius-tarjeta)] border px-4 py-3.5 transition-all duration-200",
                      !compatible
                        ? "cursor-not-allowed border-crema-200 bg-crema-50/60 opacity-65"
                        : activo
                          ? "cursor-pointer border-petroleo-600 bg-petroleo-50 shadow-[var(--shadow-tenue)]"
                          : "cursor-pointer border-crema-300/80 bg-white hover:border-petroleo-300",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={nombre}
                      checked={activo}
                      disabled={!compatible}
                      onChange={() => setPlan(nombre)}
                      className="sr-only"
                    />
                    <span className="font-titulo text-sm font-semibold text-petroleo-900">
                      {nombre}
                    </span>
                    <span className="font-titulo text-xs font-semibold text-oliva-600">
                      {opcion.tipo === "dia"
                        ? (opcion.horario ?? "Plan de día")
                        : diasEnPalabras(opcion.dias_aplica)}
                    </span>
                    <span className="flex flex-wrap items-baseline gap-x-1.5">
                      {precio !== null && opcion.precio_varia && !cabana ? (
                        <span className="text-xs text-crema-600">desde</span>
                      ) : null}
                      <span className="font-titulo text-base font-bold text-petroleo-700">
                        {precio !== null ? formatearCOP(precio) : "Consultar"}
                      </span>
                      <span className="text-xs font-medium text-crema-600">
                        {opcion.tipo === "dia" ? "por el día" : "por noche"}
                      </span>
                    </span>
                    {opcion.incluye.length > 0 ? (
                      <ul className="mt-0.5 flex flex-col gap-1">
                        {opcion.incluye.slice(0, 4).map((item) => (
                          <li
                            key={item}
                            className="flex gap-1.5 text-[0.75rem] leading-snug text-crema-700"
                          >
                            <IconoCheck className="mt-px size-3 shrink-0 text-petroleo-500" />
                            {item}
                          </li>
                        ))}
                        {opcion.incluye.length > 4 ? (
                          <li className="text-[0.75rem] text-crema-600">
                            y {opcion.incluye.length - 4} cosas más
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                    {!compatible && motivo ? (
                      <span className="mt-auto pt-2 text-[0.75rem] leading-snug font-medium text-crema-700">
                        {motivo}
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>

          <p className="text-sm text-crema-700">
            ¿Quieres el detalle completo de cada plan?{" "}
            <Link
              href="/#planes"
              className="font-semibold text-petroleo-700 underline-offset-4 hover:underline"
            >
              Míralos en la portada
            </Link>
            .
          </p>
        </fieldset>

        {/* Huéspedes */}
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-4 font-titulo text-lg font-bold text-petroleo-900">
            3. ¿Cuántos son?
          </legend>
          <div className="flex flex-wrap items-center gap-3">
            {[1, 2].map((cantidad) => (
              <label
                key={cantidad}
                className={[
                  "cursor-pointer rounded-full border px-5 py-2 font-titulo text-sm font-semibold transition-all duration-200",
                  adultos === cantidad
                    ? "border-petroleo-600 bg-petroleo-50 text-petroleo-900"
                    : "border-crema-300/80 bg-white text-crema-700 hover:border-petroleo-300",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="adultos"
                  value={cantidad}
                  checked={adultos === cantidad}
                  onChange={() => setAdultos(cantidad)}
                  className="sr-only"
                />
                {cantidad === 1 ? "1 adulto" : "2 adultos"}
              </label>
            ))}
            <p className="text-sm text-crema-600">
              Las cabañas son para dos. La Finca no recibe menores de edad.
            </p>
          </div>
        </fieldset>

        {/* Fechas */}
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-4 font-titulo text-lg font-bold text-petroleo-900">
            4. ¿Qué fechas tienes en mente?{" "}
            <span className="font-normal text-crema-600">(opcional)</span>
          </legend>
          {/* Calendario propio: el campo nativo no sabe apagar los días que el
              plan elegido no cubre. Ver `calendario-fechas.tsx`. */}
          <div className="max-w-sm">
            <CalendarioFechas
              entrada={entrada}
              salida={salida}
              alCambiar={(nuevaEntrada, nuevaSalida) => {
                setEntrada(nuevaEntrada);
                setSalida(nuevaSalida);
              }}
              hoy={hoy}
              restriccion={restriccion}
              nombrePlan={plan}
            />
          </div>
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
              <dt className="text-crema-600">Huéspedes</dt>
              <dd className="text-right font-medium text-petroleo-900">
                {adultos === 1 ? "1 adulto" : "2 adultos"}
              </dd>
            </div>
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

/**
 * `[1,2,3,4]` → «Lunes a jueves». Los dos únicos repartos que usa el hotel se
 * escriben como los dice él (§3 de `docs/DATOS_CLIENTE.md`), no como los
 * deduciría un algoritmo; el resto se enumera.
 */
function diasEnPalabras(dias: number[] | null | undefined): string {
  if (!dias || dias.length === 0 || dias.length === 7) return "Todos los días";
  const clave = [...dias].sort((a, b) => a - b).join(",");
  if (clave === "1,2,3,4") return "Lunes a jueves";
  if (clave === "5,6,7") return "Viernes a domingo y festivos";
  const nombres = [
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
    "domingo",
  ];
  const lista = [...dias]
    .sort((a, b) => a - b)
    .map((dia) => nombres[dia - 1])
    .filter(Boolean);
  const texto =
    lista.length === 1
      ? lista[0]
      : `${lista.slice(0, -1).join(", ")} y ${lista[lista.length - 1]}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
