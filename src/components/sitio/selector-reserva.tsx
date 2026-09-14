"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { clasesBoton } from "@/components/ui/boton";
import {
  cotizar,
  categoriaDePlan,
  elegibilidadDeCabana,
  planCubre,
  planesDeFinDeSemana,
  type CabanaCotizable,
  type PlanCotizable,
} from "@/lib/reserva/cotizacion";
import {
  esFechaISO,
  etiquetaTipoNoche,
  nochesDe,
  resumenEnPalabras,
  tieneFinDeSemana,
  validarRango,
  type TipoNoche,
} from "@/lib/reserva/noches";
import {
  formatearCOP,
  formatearFecha,
  formatearFechaCorta,
} from "@/lib/utils/formato";
import { enlaceWhatsapp, mensajeReserva } from "@/lib/whatsapp";

import { CalendarioFechas } from "./calendario-fechas";
import { IconoCheck, IconoWhatsapp } from "./iconos";

/**
 * Selector de reserva — el motor de precios, con cara.
 *
 * ---------------------------------------------------------------------------
 * EL FLUJO, Y POR QUÉ ESTE Y NO OTRO
 * ---------------------------------------------------------------------------
 * En La Finca **el plan es una consecuencia de la noche**, no una elección
 * libre (§3 de `docs/DATOS_CLIENTE.md`). Así que el orden de las preguntas es:
 *
 *   1. **Fechas.** Nunca se bloquean. Cualquier rango es vendible.
 *   2. **Cabaña**, entre las que tienen tarifa para TODAS las noches de esa
 *      estadía. La 02 solo se vende con Estándar, así que desaparece —con su
 *      explicación escrita— cuando hay noches entre semana.
 *   3. **Plan de fin de semana** (Estándar o Premium), y solo si la estadía
 *      toca viernes, sábado, domingo o festivo. Cambiar entre ellos NO toca
 *      las fechas.
 *   4. **Desglose noche por noche** con el total, y el botón de WhatsApp con
 *      ese mismo desglose ya escrito.
 *
 * La versión anterior preguntaba el plan PRIMERO y luego apagaba días del
 * calendario. De ahí salía el fallo que reportó Cesar: con ciertas fechas
 * puestas el plan quedaba congelado, porque cada uno bloqueaba al otro.
 *
 * ---------------------------------------------------------------------------
 * EL PLAN QUE LLEGA DE LA PORTADA ES UNA PREFERENCIA, NUNCA UN BLOQUEO
 * ---------------------------------------------------------------------------
 * `?plan=Premium` preselecciona ese plan de fin de semana. `?plan=Entre Semana`
 * resalta en el calendario las noches de lunes a jueves —y se puede quitar—,
 * pero si el visitante elige un fin de semana el sistema cambia el plan solo y
 * lo dice en una frase. Nunca se le niega una fecha.
 *
 * ---------------------------------------------------------------------------
 * EL PRECIO QUE SE VE ES UNA ESTIMACIÓN
 * ---------------------------------------------------------------------------
 * Sale de las tarifas publicadas y se calcula en el NAVEGADOR: sirve para
 * mirar, nunca para cobrar. Cuando exista el motor con pagos, la misma función
 * (`src/lib/reserva/cotizacion.ts`, pura y probada) se ejecutará en el servidor
 * y ese será el número que mande.
 *
 * Accesibilidad: cada paso es un `<fieldset>` con su `<legend>`; las tarjetas
 * son `<label>` con un `<input type="radio">` real escondido, así que funcionan
 * con teclado y se anuncian como opciones.
 */

export type CabanaSeleccionable = CabanaCotizable;

/** Un plan del catálogo, con lo que hace falta para explicarlo. */
export type PlanSeleccionable = PlanCotizable & {
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
  Cada paso es un `<fieldset className="flex flex-col gap-4">` con su
  `<legend>`. El navegador saca el `legend` del flujo del contenedor —es parte
  del borde del fieldset, no un hijo normal— así que el `gap` NO lo separa de la
  primera tarjeta. Cada `legend` lleva por eso su propio `mb-4`.
*/
export function SelectorReserva({ cabanas, planes, whatsapp, hoy }: Props) {
  const parametros = useSearchParams();

  /* --- Lo que llega por la dirección ------------------------------------ */

  const cabanaInicial =
    cabanas.find((cabana) => cabana.slug === parametros.get("cabana"))?.slug ??
    null;

  /* El plan de la URL se busca sin distinguir mayúsculas: viene de un enlace
     escrito a mano en la portada, no de un identificador. */
  const planUrl = parametros.get("plan")?.toLowerCase() ?? null;
  const planInicial =
    planes.find((plan) => plan.nombre.toLowerCase() === planUrl) ?? null;

  const entradaUrl = parametros.get("entrada");
  const salidaUrl = parametros.get("salida");
  /* Una llegada anterior a hoy no se acepta: viene de un enlace viejo
     compartido por WhatsApp y el visitante no puede hacer nada con ella. */
  const entradaInicial =
    esFechaISO(entradaUrl) && entradaUrl >= hoy ? entradaUrl : "";
  const salidaInicial =
    esFechaISO(salidaUrl) && entradaInicial && salidaUrl > entradaInicial
      ? salidaUrl
      : "";

  /* --- Estado ------------------------------------------------------------ */

  const [entrada, setEntrada] = useState(entradaInicial);
  const [salida, setSalida] = useState(salidaInicial);
  const [slug, setSlug] = useState<string | null>(cabanaInicial);
  /*
    HUÉSPEDES: UNO O DOS, Y SIEMPRE ADULTOS.
    Las cinco cabañas son para dos, y La Finca no recibe menores de edad (§5 de
    `docs/DATOS_CLIENTE.md`). Además el plan Entre Semana tiene un precio
    distinto para una sola persona, así que el dato hace falta para cotizar.
  */
  const [adultos, setAdultos] = useState(2);

  /* Los planes de fin de semana del catálogo. Hoy: Estándar y Premium. */
  const planesFinDeSemana = useMemo(
    () => planesDeFinDeSemana(planes),
    [planes],
  );

  /*
    LA PREFERENCIA QUE TRAE DE LA PORTADA.
    Si pulsó Estándar o Premium, ese es el plan de fin de semana preseleccionado.
    Si pulsó Entre Semana, se guarda como preferencia de CALENDARIO (resalta los
    lunes a jueves) y el plan de fin de semana arranca en el primero.
  */
  const categoriaInicial = planInicial ? categoriaDePlan(planInicial) : null;

  const [planFinDeSemana, setPlanFinDeSemana] = useState<string | null>(
    categoriaInicial === "fin_de_semana"
      ? planInicial!.nombre
      : (planesFinDeSemana[0]?.nombre ?? null),
  );

  const [preferencia, setPreferencia] = useState<TipoNoche | null>(
    categoriaInicial === "entre_semana" || categoriaInicial === "fin_de_semana"
      ? categoriaInicial
      : null,
  );

  /* --- Las noches -------------------------------------------------------- */

  const rango = useMemo(() => validarRango(entrada, salida), [entrada, salida]);
  const noches = useMemo(
    () => (entrada && salida ? nochesDe(entrada, salida) : []),
    [entrada, salida],
  );
  const hayFinDeSemana = tieneFinDeSemana(noches);
  const hayEntreSemana = noches.some((noche) => noche.tipo === "entre_semana");

  /*
    EL AVISO DE CAMBIO DE PLAN, EN UNA FRASE.
    Quien llegó pidiendo «Entre Semana» y eligió un viernes no recibe un error:
    se le dice que esas noches van con el plan de fin de semana y se sigue. Es
    exactamente lo que pidió Cesar: el sistema cambia el plan y lo cuenta.
  */
  const avisoDeCambio =
    preferencia === "entre_semana" && hayFinDeSemana
      ? `Las fechas que elegiste incluyen ${etiquetaTipoNoche("fin_de_semana", true)}, y esas no las cubre el plan Entre Semana: se cobran con ${planFinDeSemana ?? "el plan de fin de semana"}. Las noches de lunes a jueves siguen con su tarifa de Entre Semana.`
      : preferencia === "fin_de_semana" && hayEntreSemana
        ? `Tus fechas incluyen ${etiquetaTipoNoche("entre_semana", true)}: esas se cobran con el plan Entre Semana, más barato. Abajo lo ves noche por noche.`
        : null;

  /* --- Cabañas: cuáles se pueden ofrecer para estas noches --------------- */

  const cabanasConEstado = useMemo(
    () =>
      cabanas.map((cabana) => ({
        cabana,
        estado:
          noches.length > 0
            ? elegibilidadDeCabana(cabana, noches)
            : ({ elegible: true } as const),
      })),
    [cabanas, noches],
  );

  const elegibles = cabanasConEstado.filter((fila) => fila.estado.elegible);
  const descartadas = cabanasConEstado.filter((fila) => !fila.estado.elegible);

  /*
    Si la cabaña elegida deja de ser elegible al cambiar las fechas, se suelta.
    Dejarla marcada produciría un resumen que promete algo que el hotel no
    vende. Va en un efecto y no en el render porque cambia estado.
  */
  useEffect(() => {
    if (!slug) return;
    const fila = cabanasConEstado.find((f) => f.cabana.slug === slug);
    if (fila && !fila.estado.elegible) setSlug(null);
  }, [slug, cabanasConEstado]);

  const cabana = elegibles.find((fila) => fila.cabana.slug === slug)?.cabana ?? null;

  /* --- La cotización ----------------------------------------------------- */

  const cotizacion = useMemo(() => {
    if (!cabana || noches.length === 0) return null;
    return cotizar({ noches, cabana, planFinDeSemana, adultos });
  }, [cabana, noches, planFinDeSemana, adultos]);

  const desglose = cotizacion?.posible ? cotizacion : null;

  /* --- El mensaje de WhatsApp, con el desglose ya escrito ---------------- */

  const enlace = enlaceWhatsapp(
    mensajeReserva({
      cabana: cabana?.nombre ?? null,
      plan: desglose ? desglose.planes.join(" + ") : null,
      entrada: entrada || null,
      salida: rango.valido ? salida : null,
      adultos,
      desglose: desglose
        ? desglose.lineas.map((linea) => ({
            fecha: formatearFecha(linea.fecha),
            plan: linea.plan,
            precio: linea.precio,
            festivo: linea.festivo,
          }))
        : null,
      total: desglose?.total ?? null,
    }),
    whatsapp,
  );

  /* ===================================================================== */

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-10">
      <div
        className="flex min-w-0 flex-col gap-8"
        /* Igual que en `ModuloReserva`: mientras estos campos estén en el
           viewport, el FAB de WhatsApp se aparta. Quien llega desde el módulo
           de la portada cae aquí mismo por el ancla `#solicitud`, y sin esto el
           FAB tapaba justo el bloque de fechas. */
        data-fab-evitar=""
      >
        {/* ---------------------------------------------------------------
            PASO 1 — FECHAS. Van primero porque son las que deciden el plan.
        ---------------------------------------------------------------- */}
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-4 font-titulo text-lg font-bold text-petroleo-900">
            1. ¿Qué fechas tienes en mente?
          </legend>

          <div className="max-w-sm">
            <CalendarioFechas
              entrada={entrada}
              salida={salida}
              alCambiar={(nuevaEntrada, nuevaSalida) => {
                setEntrada(nuevaEntrada);
                setSalida(nuevaSalida);
              }}
              hoy={hoy}
              preferencia={preferencia}
              nombrePreferencia={
                preferencia === "entre_semana"
                  ? (planes.find(
                      (plan) => categoriaDePlan(plan) === "entre_semana",
                    )?.nombre ?? null)
                  : planFinDeSemana
              }
              alQuitarPreferencia={() => setPreferencia(null)}
            />
          </div>

          {noches.length > 0 ? (
            <p className="text-sm leading-relaxed text-crema-700">
              Son <strong className="font-semibold text-petroleo-900">
                {resumenEnPalabras(noches)}
              </strong>
              . Cada noche se cobra con la tarifa que le corresponde a su fecha.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-crema-700">
              Elige llegada y salida. No hay fechas prohibidas: si tu estadía
              mezcla días de semana y fin de semana, te lo desglosamos noche por
              noche.
            </p>
          )}

          {avisoDeCambio ? (
            <p className="rounded-[var(--radius-tarjeta)] bg-brote-100 px-4 py-3 text-sm leading-relaxed text-oliva-800">
              {avisoDeCambio}
            </p>
          ) : null}

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 font-titulo text-sm font-semibold text-petroleo-900">
              ¿Cuántos son?
            </legend>
            <div className="flex flex-wrap items-center gap-3">
              {[1, 2].map((cantidad) => (
                <label
                  key={cantidad}
                  className={[
                    "flex min-h-11 cursor-pointer items-center rounded-full border px-5 font-titulo text-sm font-semibold transition-all duration-200",
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
        </fieldset>

        {/* ---------------------------------------------------------------
            PASO 2 — CABAÑA, solo las que sirven para esas noches.
        ---------------------------------------------------------------- */}
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-4 font-titulo text-lg font-bold text-petroleo-900">
            2. Elige tu cabaña
          </legend>

          <ul className="grid gap-3 sm:grid-cols-2">
            {elegibles.map(({ cabana: opcion }) => {
              const activa = opcion.slug === slug;
              const precio = precioParaLista(
                opcion,
                noches.length > 0,
                hayEntreSemana,
                hayFinDeSemana,
                planFinDeSemana,
                adultos,
              );
              return (
                <li key={opcion.slug}>
                  <label
                    className={[
                      "flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-tarjeta)] border px-4 py-3.5 transition-all duration-200",
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
                    <span className="flex shrink-0 items-center gap-2">
                      {precio !== null ? (
                        <span className="text-right text-xs text-crema-600">
                          {precio.etiqueta}
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

          {/*
            LAS QUE NO SE PUEDEN, CON SU MOTIVO.
            Que una cabaña desaparezca sin explicación se lee como un error del
            sitio. La 02 solo se vende con el plan Estándar: hay que decirlo.
          */}
          {descartadas.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {descartadas.map(({ cabana: opcion, estado }) => (
                <li
                  key={opcion.slug}
                  className="rounded-[var(--radius-tarjeta)] border border-crema-200 bg-crema-50/70 px-4 py-3 text-sm leading-snug text-crema-700"
                >
                  <span className="font-titulo font-semibold text-crema-800">
                    {opcion.nombre}
                  </span>{" "}
                  — no disponible para estas fechas.{" "}
                  {!estado.elegible ? estado.motivo : null}
                </li>
              ))}
            </ul>
          ) : null}

          {elegibles.length === 0 ? (
            <p className="rounded-[var(--radius-tarjeta)] bg-petroleo-50 px-4 py-3 text-sm text-petroleo-800">
              Ninguna cabaña cubre esas fechas. Prueba con otras o escríbenos por
              WhatsApp y te armamos la estadía.
            </p>
          ) : null}
        </fieldset>

        {/* ---------------------------------------------------------------
            PASO 3 — PLAN DE FIN DE SEMANA. Solo si hace falta.
        ---------------------------------------------------------------- */}
        {hayFinDeSemana && planesFinDeSemana.length > 0 ? (
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-4 font-titulo text-lg font-bold text-petroleo-900">
              3. ¿Estándar o Premium para tus noches de fin de semana?
            </legend>

            <p className="text-sm leading-relaxed text-crema-700">
              Tus {etiquetaTipoNoche("fin_de_semana", true)} se cobran con uno de
              estos dos planes. Cambiar de plan no toca tus fechas.
              {hayEntreSemana
                ? " Las noches de lunes a jueves van siempre con el plan Entre Semana."
                : ""}
            </p>

            <ul className="grid gap-3 sm:grid-cols-2">
              {planesFinDeSemana.map((opcion) => {
                const activo = opcion.nombre === planFinDeSemana;
                const tarifa = cabana?.tarifas.find(
                  (t) => t.plan.nombre === opcion.nombre,
                );
                const disponible = !cabana || Boolean(tarifa);
                const precio = tarifa?.precio_noche ?? opcion.precio_base;
                return (
                  <li key={opcion.nombre}>
                    <label
                      className={[
                        "flex h-full flex-col gap-1.5 rounded-[var(--radius-tarjeta)] border px-4 py-3.5 transition-all duration-200",
                        !disponible
                          ? "cursor-not-allowed border-crema-200 bg-crema-50/60 opacity-70"
                          : activo
                            ? "cursor-pointer border-petroleo-600 bg-petroleo-50 shadow-[var(--shadow-tenue)]"
                            : "cursor-pointer border-crema-300/80 bg-white hover:border-petroleo-300",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name="plan-fin-de-semana"
                        value={opcion.nombre}
                        checked={activo}
                        disabled={!disponible}
                        onChange={() => {
                          setPlanFinDeSemana(opcion.nombre);
                          /* Cambiar de plan NO toca las fechas: ni se tocan
                             `entrada` ni `salida` aquí. Es el requisito
                             central del encargo. */
                        }}
                        className="sr-only"
                      />
                      <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <span className="font-titulo text-sm font-semibold text-petroleo-900">
                          {opcion.nombre}
                        </span>
                        <span className="font-titulo text-base font-bold text-petroleo-700">
                          {precio !== null
                            ? `${formatearCOP(precio)}`
                            : "Consultar"}
                          <span className="ml-1 text-xs font-medium text-crema-600">
                            por noche
                          </span>
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

                      {!disponible ? (
                        <span className="mt-auto pt-2 text-[0.75rem] leading-snug font-medium text-crema-700">
                          La {cabana?.nombre} no tiene este plan. Elige otra
                          cabaña para poder pedirlo.
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
        ) : null}
      </div>

      {/* ===================================================================
          RESUMEN — el desglose noche por noche y el total.
      ==================================================================== */}
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="flex flex-col gap-4 rounded-[var(--radius-generoso)] bg-white p-5 shadow-[var(--shadow-tarjeta)] ring-1 ring-crema-200/70 sm:p-6">
          <h3 className="font-titulo text-lg font-bold text-petroleo-900">
            Tu solicitud
          </h3>

          <dl className="flex flex-col gap-2.5 text-sm">
            <Fila etiqueta="Cabaña" valor={cabana?.nombre ?? "Sin elegir"} />
            <Fila
              etiqueta="Huéspedes"
              valor={adultos === 1 ? "1 adulto" : "2 adultos"}
            />
            {/* Las fechas en formato corto ("12 mar 2026"): el resumen se lee,
                no se descifra. */}
            <Fila
              etiqueta="Llegada"
              valor={entrada ? formatearFechaCorta(entrada) : "Sin definir"}
            />
            <Fila
              etiqueta="Salida"
              valor={
                salida && rango.valido
                  ? formatearFechaCorta(salida)
                  : "Sin definir"
              }
            />
            <Fila
              etiqueta="Noches"
              valor={noches.length > 0 ? String(noches.length) : "—"}
            />
          </dl>

          {/* --- El desglose --- */}
          {desglose ? (
            <div className="flex flex-col gap-2 border-t border-crema-200 pt-4">
              <p className="font-titulo text-sm font-semibold text-crema-700">
                Noche por noche
              </p>
              <ul className="flex flex-col gap-1.5">
                {desglose.lineas.map((linea) => (
                  <li
                    key={linea.fecha}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm"
                  >
                    <span className="min-w-0 text-crema-700">
                      {formatearFechaCorta(linea.fecha)}
                      <span className="ml-1.5 text-xs text-crema-600">
                        {linea.festivo ?? linea.plan}
                      </span>
                    </span>
                    <span className="font-medium text-petroleo-900">
                      {formatearCOP(linea.precio)}
                    </span>
                  </li>
                ))}
              </ul>
              {desglose.lineas.some((linea) => linea.festivo) ? (
                <p className="text-xs leading-snug text-crema-600">
                  Los festivos se cobran como noche de fin de semana.
                </p>
              ) : null}
            </div>
          ) : null}

          {desglose ? (
            <p className="flex items-baseline justify-between gap-3 border-t border-crema-200 pt-4">
              <span className="font-titulo text-sm font-semibold text-crema-700">
                Total estimado
              </span>
              <span className="font-titulo text-2xl font-extrabold text-petroleo-700">
                {formatearCOP(desglose.total)}
              </span>
            </p>
          ) : null}

          {cotizacion && !cotizacion.posible ? (
            <p className="rounded-[var(--radius-tarjeta)] bg-crema-100 px-4 py-3 text-sm leading-relaxed text-crema-800">
              {cotizacion.motivo}
            </p>
          ) : null}

          {!cotizacion ? (
            <p className="text-sm leading-relaxed text-crema-600">
              Elige fechas y cabaña y te mostramos el precio noche por noche.
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
            Te llevamos a WhatsApp con el desglose ya escrito. El total es una
            estimación con la tarifa publicada: el equipo confirma
            disponibilidad y precio final antes de cobrar.
          </p>
        </div>
      </aside>
    </div>
  );
}

/* ===========================================================================
 * Piezas auxiliares
 * ======================================================================== */

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-crema-600">{etiqueta}</dt>
      <dd className="min-w-0 text-right font-medium text-petroleo-900">
        {valor}
      </dd>
    </div>
  );
}

/**
 * El precio que se enseña en la tarjeta de cada cabaña.
 *
 * Sin fechas todavía, es el «desde» del catálogo. Con fechas, es la tarifa que
 * de verdad le va a tocar a esa estadía: mostrar un «desde $350.000» cuando la
 * persona ya eligió un sábado es enseñarle un precio que no va a pagar.
 */
function precioParaLista(
  cabana: CabanaCotizable,
  hayFechas: boolean,
  hayEntreSemana: boolean,
  hayFinDeSemana: boolean,
  planFinDeSemana: string | null,
  adultos: number,
): { etiqueta: string } | null {
  const precioDe = (tarifa: CabanaCotizable["tarifas"][number]) =>
    adultos === 1 && typeof tarifa.precio_noche_1_persona === "number"
      ? tarifa.precio_noche_1_persona
      : tarifa.precio_noche;

  if (!hayFechas) {
    const precios = cabana.tarifas.map(precioDe);
    if (precios.length === 0) return null;
    return { etiqueta: `desde ${formatearCOP(Math.min(...precios))}` };
  }

  /* Con fechas puestas: si la estadía es de un solo tipo de noche, se puede
     nombrar el precio exacto por noche. Si es mixta, el total manda y aquí se
     enseña el más bajo de los dos con un «desde». */
  const relevantes = cabana.tarifas.filter((tarifa) => {
    if (hayFinDeSemana && planCubre(tarifa.plan, "fin_de_semana")) {
      return !planFinDeSemana || tarifa.plan.nombre === planFinDeSemana;
    }
    if (hayEntreSemana && planCubre(tarifa.plan, "entre_semana")) return true;
    return false;
  });

  if (relevantes.length === 0) return null;
  const precios = relevantes.map(precioDe);
  const minimo = Math.min(...precios);

  return {
    etiqueta:
      precios.length > 1 || (hayEntreSemana && hayFinDeSemana)
        ? `desde ${formatearCOP(minimo)} / noche`
        : `${formatearCOP(minimo)} / noche`,
  };
}
