"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { guardarTemporadaAction } from "./acciones";
import { FormularioAccion } from "@/components/admin/formulario-accion";
import {
  Campo,
  CLASE_INPUT,
  Desplegable,
  Divisor,
  Entrada,
} from "@/components/admin/ui";
import type { CabanaDeTemporada } from "@/lib/admin/temporadas";
import {
  crucesDeTemporada,
  diferenciaPorcentual,
  fechasDeTemporada,
  nochesDeTemporada,
  planesDelAlcance,
  rangoLegible,
  seCruzanNoches,
  textoDiferencia,
  ultimaNoche,
  type BaseDeCabana,
  type PlanConBases,
  type Temporada,
} from "@/lib/reserva/temporadas";
import { formatearCOP } from "@/lib/utils/formato";

/* En el panel esto se llama «Tarifas diferenciales»; en el código y la base
   sigue siendo `temporadas`. */

const TODAS = "todas";

/** Lo que escribe el equipo, con o sin puntos: «402.500» o «402500». */
function leerPesos(texto: string): number | null {
  const limpio = texto.replace(/[.\s$,]/g, "");
  if (!limpio) return null;
  const valor = Number(limpio);
  return Number.isInteger(valor) && valor > 0 ? valor : null;
}

/** «$350.000», o «$350.000 a $380.000» si las cabañas no cuestan lo mismo. */
function textoBase(precios: number[]): string {
  const unicos = [...new Set(precios)].sort((a, b) => a - b);
  if (unicos.length === 0) return "sin precio base";
  if (unicos.length === 1) return formatearCOP(unicos[0]);
  return `${formatearCOP(unicos[0])} a ${formatearCOP(unicos[unicos.length - 1])}`;
}

type Valores = Record<string, { precio: string; unaPersona: string }>;

export function FormularioTemporada({
  temporada,
  planes,
  cabanas,
  otras,
}: {
  temporada: Temporada | null;
  planes: PlanConBases[];
  cabanas: CabanaDeTemporada[];
  /** Las demás tarifas diferenciales, para avisar de cruces mientras se escribe. */
  otras: Temporada[];
}) {
  const [nombre, setNombre] = useState(temporada?.nombre ?? "");
  const [primera, setPrimera] = useState(temporada?.desde ?? "");
  const [ultima, setUltima] = useState(temporada ? ultimaNoche(temporada) : "");
  const [alcance, setAlcance] = useState(temporada?.alojamientoId ?? TODAS);
  const [valores, setValores] = useState<Valores>(() => {
    const inicial: Valores = {};
    for (const precio of temporada?.precios ?? []) {
      inicial[precio.planId] = {
        precio: String(precio.precio_noche),
        unaPersona:
          precio.precio_noche_1_persona === null
            ? ""
            : String(precio.precio_noche_1_persona),
      };
    }
    return inicial;
  });

  const alojamientoId = alcance === TODAS ? null : alcance;
  const visibles = useMemo(
    () => planesDelAlcance(planes, alojamientoId),
    [planes, alojamientoId],
  );
  const ocultos = planes.filter(
    (plan) => !visibles.some((visible) => visible.planId === plan.planId),
  );
  const nombreAlcance = alojamientoId
    ? (cabanas.find((cabana) => cabana.id === alojamientoId)?.nombre ?? "esa cabaña")
    : "todas las cabañas";

  const fechas = primera && ultima ? fechasDeTemporada(primera, ultima) : null;

  /* Los cruces se calculan mientras se escribe, con la misma función que usa
     el servidor al guardar: el aviso llega antes que el error. */
  const planesConPrecio = visibles
    .filter((plan) => leerPesos(valores[plan.planId]?.precio ?? "") !== null)
    .map((plan) => plan.planId);
  const cruces =
    fechas?.valido && planesConPrecio.length > 0
      ? crucesDeTemporada(
          {
            id: temporada?.id ?? null,
            alojamientoId,
            desde: fechas.desde,
            hasta: fechas.hasta,
            planIds: planesConPrecio,
          },
          otras,
        )
      : [];

  /* Las de otro alcance que se cruzan: no chocan, pero hay que decir quién
     manda en las noches que compartan. */
  const conviven =
    fechas?.valido
      ? otras.filter(
          (otra) =>
            otra.id !== temporada?.id &&
            seCruzanNoches(otra, fechas) &&
            (alojamientoId === null
              ? otra.alojamientoId !== null
              : otra.alojamientoId === null),
        )
      : [];

  function cambiar(planId: string, campo: "precio" | "unaPersona", valor: string) {
    setValores((actuales) => ({
      ...actuales,
      [planId]: {
        precio: actuales[planId]?.precio ?? "",
        unaPersona: actuales[planId]?.unaPersona ?? "",
        [campo]: valor,
      },
    }));
  }

  return (
    <FormularioAccion
      accion={guardarTemporadaAction}
      etiquetaEnviar={temporada ? "Guardar cambios" : "Crear tarifa diferencial"}
      secundario={
        <Link
          href="/admin/tarifas-diferenciales"
          className="text-[0.875rem] font-semibold text-crema-700 underline-offset-4 hover:underline"
        >
          Cancelar
        </Link>
      }
    >
      {temporada && <input type="hidden" name="id" value={temporada.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          etiqueta="Nombre de la tarifa diferencial"
          htmlFor="nombre"
          obligatorio
          className="sm:col-span-2"
          ayuda="El huésped lo ve debajo del precio de cada noche al reservar. Por ejemplo: «Temporada de fin de año» o «Semana Santa»."
        >
          <Entrada
            id="nombre"
            name="nombre"
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            required
            maxLength={80}
            placeholder="Temporada de fin de año"
          />
        </Campo>

        <Campo
          etiqueta="Primera noche"
          htmlFor="primera_noche"
          obligatorio
          ayuda="La primera noche que se cobra con esta tarifa; se incluye. Por ejemplo, si es el 1/12/2026, quien duerme esa noche la paga con esta tarifa."
        >
          <Entrada
            id="primera_noche"
            name="primera_noche"
            type="date"
            value={primera}
            onChange={(evento) => setPrimera(evento.target.value)}
            required
          />
        </Campo>

        <Campo
          etiqueta="Última noche"
          htmlFor="ultima_noche"
          obligatorio
          ayuda="La última noche que se cobra con esta tarifa; también se incluye. Es la noche que se duerme, no el día de salida: si es el 8/1/2027, quien sale el 9/1/2027 paga el 8/1 con esta tarifa."
        >
          <Entrada
            id="ultima_noche"
            name="ultima_noche"
            type="date"
            value={ultima}
            min={primera || undefined}
            onChange={(evento) => setUltima(evento.target.value)}
            required
          />
        </Campo>

        {fechas ? (
          <p
            className={`sm:col-span-2 -mt-2 rounded-tarjeta p-3.5 text-[0.8125rem] leading-relaxed ${
              fechas.valido
                ? "bg-crema-900/[0.03] text-crema-700"
                : "bg-red-600/[0.08] text-red-800"
            }`}
          >
            {fechas.valido ? (
              <>
                {(() => {
                  const noches = nochesDeTemporada(fechas);
                  return `${noches} ${noches === 1 ? "noche" : "noches"}: ${rangoLegible(fechas)}. `;
                })()}
                Quien duerme la última noche la paga con esta tarifa; la noche
                siguiente ya se cobra con el precio base.
              </>
            ) : (
              fechas.motivo
            )}
          </p>
        ) : null}

        <Campo
          etiqueta="¿A qué cabañas aplica?"
          htmlFor="alcance"
          className="sm:col-span-2"
          ayuda="Si una misma noche tiene una tarifa para una cabaña y otra para todas, en esa cabaña gana la de la cabaña."
        >
          <Desplegable
            id="alcance"
            name="alcance"
            value={alcance}
            onChange={(evento) => setAlcance(evento.target.value)}
          >
            <option value={TODAS}>Todas las cabañas</option>
            {cabanas.map((cabana) => (
              <option key={cabana.id} value={cabana.id}>
                Solo la {cabana.nombre}
                {cabana.activo ? "" : " (pausada)"}
              </option>
            ))}
          </Desplegable>
        </Campo>

        {conviven.length > 0 ? (
          <div className="sm:col-span-2 -mt-2 flex flex-col gap-1.5 rounded-tarjeta bg-sky-600/[0.08] p-3.5 text-[0.8125rem] leading-relaxed text-sky-900">
            {conviven.map((otra) => {
              const cabanaOtra = otra.alojamientoId
                ? (cabanas.find((cabana) => cabana.id === otra.alojamientoId)
                    ?.nombre ?? "esa cabaña")
                : null;
              return (
                <p key={otra.id}>
                  {cabanaOtra
                    ? `En la ${cabanaOtra}, «${otra.nombre}» (${rangoLegible(otra)}) gana sobre esta en las noches que compartan.`
                    : `Comparte noches con «${otra.nombre}» (todas las cabañas, ${rangoLegible(otra)}): en esas noches, en la ${nombreAlcance} gana esta.`}
                </p>
              );
            })}
          </div>
        ) : null}

        {cruces.length > 0 ? (
          <div
            role="alert"
            className="sm:col-span-2 -mt-2 rounded-tarjeta bg-red-600/[0.08] p-3.5 text-[0.8125rem] leading-relaxed text-red-800 ring-1 ring-red-600/20"
          >
            {cruces.map((cruce) => (
              <p key={cruce.temporada.id}>
                Las fechas se cruzan con «{cruce.temporada.nombre}» ({rangoLegible(cruce.temporada)}) en{" "}
                {cruce.planIds
                  .map((planId) => planes.find((plan) => plan.planId === planId)?.nombre)
                  .filter(Boolean)
                  .join(", ")}
                . Dos tarifas diferenciales para {nombreAlcance} no pueden
                poner precio al mismo plan en las mismas noches: cambia las
                fechas, o deja ese plan en blanco en una de las dos.
              </p>
            ))}
          </div>
        ) : null}

        <Divisor titulo="Precios por noche en esas fechas" />

        <div className="sm:col-span-2">
          <p className="mb-4 text-[0.8125rem] leading-relaxed text-crema-700">
            Escribe cuánto cuesta la noche de cada plan en esas fechas, en
            pesos y sin centavos (<span className="font-semibold">552000</span>{" "}
            o <span className="font-semibold">552.000</span>).{" "}
            <strong>Un plan en blanco se cobra con su precio base</strong> en
            esas noches. Esta tarifa solo cambia el precio, no el plan: de
            lunes a jueves sigue siendo Entre Semana, y viernes, sábado,
            domingo y festivos, Estándar o Premium, según lo que elija el
            huésped. Por ejemplo, con Estándar en $500.000 (cifra de ejemplo),
            un sábado de esas fechas se cobra a $500.000.
          </p>

          <div className="grid gap-3">
            {visibles.map((plan) => (
              <FilaPrecio
                key={plan.planId}
                planId={plan.planId}
                nombre={plan.nombre}
                bases={plan.bases}
                tieneUnaPersona={plan.tieneUnaPersona}
                precio={valores[plan.planId]?.precio ?? ""}
                unaPersona={valores[plan.planId]?.unaPersona ?? ""}
                alCambiar={cambiar}
              />
            ))}
          </div>

          {ocultos.length > 0 ? (
            <p className="mt-3 text-[0.75rem] leading-relaxed text-crema-600">
              {ocultos.map((plan) => plan.nombre).join(", ")}:{" "}
              {alojamientoId
                ? `la ${nombreAlcance} no se ofrece con ${ocultos.length === 1 ? "ese plan" : "esos planes"}, así que una tarifa diferencial no puede ponerle${ocultos.length === 1 ? "" : "s"} precio.`
                : "ninguna cabaña tiene precio base con ese plan."}
            </p>
          ) : null}

          <p className="mt-3 text-[0.75rem] leading-relaxed text-crema-600">
            El Día de Calma no cambia con las tarifas diferenciales: su precio
            se edita en «Planes». Las reservas ya hechas tampoco cambian: se
            quedan con el precio con que se reservaron.
          </p>
        </div>
      </div>
    </FormularioAccion>
  );
}

function FilaPrecio({
  planId,
  nombre,
  bases,
  tieneUnaPersona,
  precio,
  unaPersona,
  alCambiar,
}: {
  planId: string;
  nombre: string;
  bases: BaseDeCabana[];
  tieneUnaPersona: boolean;
  precio: string;
  unaPersona: string;
  alCambiar: (planId: string, campo: "precio" | "unaPersona", valor: string) => void;
}) {
  const basesDos = bases.map((base) => base.precio);
  const basesUna = bases
    .map((base) => base.precioUnaPersona)
    .filter((valor): valor is number => valor !== null);

  return (
    <div className="rounded-tarjeta bg-crema-900/[0.03] p-3.5">
      <p className="text-[0.875rem] font-semibold text-crema-900">
        Plan {nombre}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <CampoPrecio
          id={`precio_${planId}`}
          etiqueta="Precio por noche (2 personas)"
          valor={precio}
          bases={basesDos}
          alCambiar={(valor) => alCambiar(planId, "precio", valor)}
        />
        {tieneUnaPersona ? (
          <CampoPrecio
            id={`precio_1_${planId}`}
            etiqueta="Precio si viaja una sola persona"
            valor={unaPersona}
            bases={basesUna}
            alCambiar={(valor) => alCambiar(planId, "unaPersona", valor)}
          />
        ) : null}
      </div>

      {tieneUnaPersona ? (
        <p className="mt-2 text-[0.75rem] leading-relaxed text-crema-600">
          Este plan tiene precio para una persona: escribe los dos, o deja los
          dos en blanco para que se cobre el precio base.
        </p>
      ) : null}
    </div>
  );
}

function CampoPrecio({
  id,
  etiqueta,
  valor,
  bases,
  alCambiar,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  bases: number[];
  alCambiar: (valor: string) => void;
}) {
  const numero = leerPesos(valor);
  const diferencia = textoDiferencia(bases, numero);
  /* Un cambio de más de la mitad casi siempre es un cero de más o de menos. */
  const llamativo =
    numero !== null &&
    bases.some((base) => Math.abs(diferenciaPorcentual(base, numero)) > 50);

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[0.8125rem] font-semibold text-crema-900"
      >
        {etiqueta}
      </label>
      <div className="relative">
        <span
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[0.9375rem] text-crema-500"
          aria-hidden="true"
        >
          $
        </span>
        <input
          id={id}
          name={id}
          type="text"
          inputMode="numeric"
          value={valor}
          onChange={(evento) => alCambiar(evento.target.value)}
          placeholder="En blanco: precio base"
          aria-describedby={`${id}__base`}
          className={`${CLASE_INPUT} pl-8`}
        />
      </div>
      <p id={`${id}__base`} className="mt-1.5 text-[0.75rem] leading-relaxed text-crema-600">
        Base: {textoBase(bases)}
        {diferencia ? (
          <>
            {" · "}
            <span
              className={
                llamativo
                  ? "font-semibold text-dorado-800"
                  : "font-semibold text-petroleo-700"
              }
            >
              {diferencia}
            </span>
            {llamativo ? " — revisa que no sobre o falte un cero" : null}
          </>
        ) : null}
      </p>
    </div>
  );
}
