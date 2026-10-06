import type { Metadata } from "next";
import Link from "next/link";

import { eliminarTemporadaAction } from "./acciones";
import { confirmacionBorrado } from "./textos";
import { Aviso } from "@/components/admin/aviso";
import { BotonEnviar } from "@/components/admin/boton-enviar";
import {
  CabeceraTarjeta,
  CuerpoTarjeta,
  EnlaceBoton,
  EncabezadoPagina,
  EstadoVacio,
  Pastilla,
  Tarjeta,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import {
  cabanasParaTemporadas,
  listarTemporadas,
  planesConBases,
  type CabanaDeTemporada,
} from "@/lib/admin/temporadas";
import {
  estadoDeTemporada,
  nochesDeTemporada,
  planesDelAlcance,
  rangoLegible,
  type EstadoTemporada,
  type PlanConBases,
  type Temporada,
} from "@/lib/reserva/temporadas";
import { formatearCOP, hoyEnBogota } from "@/lib/utils/formato";

/*
  En el panel esto se llama «Tarifas diferenciales»; en el código y la base
  sigue siendo `temporadas` (tabla, tipos, `guardar_temporada`…). El sitio
  público no usa ese nombre: el huésped solo ve el nombre de cada tarifa bajo
  el precio de la noche.
*/
export const metadata: Metadata = { title: "Tarifas diferenciales" };
export const dynamic = "force-dynamic";

const GRUPOS: { estado: EstadoTemporada; titulo: string; vacio: string }[] = [
  {
    estado: "activa",
    titulo: "Activas ahora",
    vacio: "Hoy ninguna tarifa diferencial cambia los precios.",
  },
  {
    estado: "proxima",
    titulo: "Próximas",
    vacio: "No hay tarifas diferenciales programadas.",
  },
  {
    estado: "pasada",
    titulo: "Pasadas",
    vacio: "Todavía no ha terminado ninguna.",
  },
];

export default async function PaginaTemporadas({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const [temporadas, planes, cabanas] = await Promise.all([
    listarTemporadas(supabase),
    planesConBases(supabase),
    cabanasParaTemporadas(supabase),
  ]);

  const hoy = hoyEnBogota();
  const porEstado = (estado: EstadoTemporada) =>
    temporadas.filter((temporada) => estadoDeTemporada(temporada, hoy) === estado);

  return (
    <>
      <EncabezadoPagina
        titulo="Tarifas diferenciales"
        descripcion="Precios distintos para unas fechas concretas —fin de año, Semana Santa, un puente—, para todas las cabañas o para una sola. En esas noches el sitio cobra el precio de la tarifa diferencial; el resto del año, el precio base de siempre."
        accion={
          <EnlaceBoton href="/admin/tarifas-diferenciales/nueva">
            Nueva tarifa diferencial
          </EnlaceBoton>
        }
      />

      <Aviso ok={params.ok} error={params.error} />

      <div className="mb-6 rounded-tarjeta bg-crema-900/[0.03] p-4 text-[0.8125rem] leading-relaxed text-crema-700 ring-1 ring-crema-900/[0.05]">
        <p className="font-semibold text-crema-900">Cómo se aplican</p>
        <ul className="mt-1.5 flex list-disc flex-col gap-1.5 pl-5">
          <li>
            <strong>Para qué sirven.</strong> Para cobrar distinto en fechas
            concretas: temporada alta, puentes, eventos. Fuera de esas fechas
            se cobra el precio base de siempre.
          </li>
          <li>
            <strong>El tipo de noche sigue decidiendo el plan.</strong> De
            lunes a jueves es Entre Semana; viernes, sábado, domingo y
            festivos, Estándar o Premium, según lo que elija el huésped. La
            tarifa diferencial solo cambia el precio de ese plan en esas
            noches.
          </li>
          <li>
            <strong>
              «Primera noche» y «Última noche» son noches, y las dos cuentan.
            </strong>{" "}
            La última noche es la que se duerme, no el día de salida: si la
            última noche es el 08/01/2027, quien sale el 09/01/2027 paga el 8/1
            con esta tarifa.
          </li>
          <li>
            <strong>Un plan en blanco</strong> se cobra con su precio base en
            esas noches.
          </li>
          <li>
            <strong>Una para una cabaña y otra para todas:</strong> en esa
            cabaña gana la de la cabaña.
          </li>
          <li>
            <strong>Las reservas ya hechas no cambian:</strong> se quedan con el
            precio con que se reservaron, aunque edites o borres la tarifa.
          </li>
          <li>
            Una tarifa diferencial no puede ofrecer un plan que la cabaña no
            tiene.
          </li>
        </ul>

        <div className="mt-3.5 rounded-tarjeta bg-white p-3.5 ring-1 ring-crema-900/[0.07]">
          <p className="font-semibold text-crema-900">
            Ejemplo: fin de año{" "}
            <span className="font-normal text-crema-600">
              (las cifras son solo para explicar)
            </span>
          </p>
          <p className="mt-1">
            Primera noche: <strong>mar 01/12/2026</strong>. Última noche:{" "}
            <strong>vie 08/01/2027</strong>. Para todas las cabañas. Estándar a{" "}
            <strong>$500.000</strong>, Premium a <strong>$600.000</strong> y
            Entre Semana en blanco.
          </p>
          <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5">
            <li>
              Un sábado de esas fechas se cobra a $500.000 (Estándar) o a
              $600.000 (Premium), según lo que elija el huésped.
            </li>
            <li>
              Un martes de esas fechas es Entre Semana: como ese plan quedó en
              blanco, se cobra con su precio base.
            </li>
            <li>
              Quien llega el vie 08/01/2027 y sale el sáb 09/01/2027 duerme una
              sola noche, la del 08/01, y la paga con esta tarifa. Quien llega el
              sáb 09/01/2027 ya paga el precio base.
            </li>
          </ul>
        </div>
      </div>

      {temporadas.length === 0 ? (
        <Tarjeta>
          <CuerpoTarjeta>
            <EstadoVacio
              titulo="Todavía no hay tarifas diferenciales"
              descripcion="Con una tarifa diferencial cambias el precio de unas noches concretas sin tocar el precio base de cada cabaña."
              accion={
                <EnlaceBoton href="/admin/tarifas-diferenciales/nueva">
                  Crear la primera tarifa diferencial
                </EnlaceBoton>
              }
            />
          </CuerpoTarjeta>
        </Tarjeta>
      ) : (
        <div className="flex flex-col gap-6">
          {GRUPOS.map((grupo) => {
            const lista = porEstado(grupo.estado);
            return (
              <Tarjeta key={grupo.estado}>
                <CabeceraTarjeta
                  titulo={`${grupo.titulo} (${lista.length})`}
                />
                {lista.length === 0 ? (
                  <p className="px-4 py-4 text-[0.8125rem] text-crema-600 sm:px-6">
                    {grupo.vacio}
                  </p>
                ) : (
                  <ul className="divide-y divide-crema-900/[0.07]">
                    {lista.map((temporada) => (
                      <FilaTemporada
                        key={temporada.id}
                        temporada={temporada}
                        estado={grupo.estado}
                        planes={planes}
                        cabanas={cabanas}
                      />
                    ))}
                  </ul>
                )}
              </Tarjeta>
            );
          })}
        </div>
      )}
    </>
  );
}

function FilaTemporada({
  temporada,
  estado,
  planes,
  cabanas,
}: {
  temporada: Temporada;
  estado: EstadoTemporada;
  planes: PlanConBases[];
  cabanas: CabanaDeTemporada[];
}) {
  const noches = nochesDeTemporada(temporada);
  const alcance = temporada.alojamientoId
    ? `Solo la ${cabanas.find((cabana) => cabana.id === temporada.alojamientoId)?.nombre ?? "cabaña"}`
    : "Todas las cabañas";

  /* Los planes posibles en su alcance, con su precio o «usa la base». */
  const posibles = planesDelAlcance(planes, temporada.alojamientoId);

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/tarifas-diferenciales/${temporada.id}`}
            className="font-titulo text-[0.9375rem] font-semibold text-crema-900 underline-offset-4 hover:underline"
          >
            {temporada.nombre}
          </Link>
          {estado === "activa" ? (
            <Pastilla tono="verde">Activa</Pastilla>
          ) : estado === "proxima" ? (
            <Pastilla tono="dorado">Próxima</Pastilla>
          ) : (
            <Pastilla tono="gris">Pasada</Pastilla>
          )}
        </div>
        <p className="mt-0.5 text-[0.8125rem] text-crema-700">
          {rangoLegible(temporada)}
          <span className="mx-1.5 text-crema-400">·</span>
          {noches} {noches === 1 ? "noche" : "noches"}
          <span className="mx-1.5 text-crema-400">·</span>
          {alcance}
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {posibles.map((plan) => {
            const precio = temporada.precios.find(
              (item) => item.planId === plan.planId,
            );
            return (
              <li
                key={plan.planId}
                className="rounded-full bg-crema-900/[0.04] px-2.5 py-1 text-[0.75rem] text-crema-800 ring-1 ring-crema-900/[0.06]"
              >
                <span className="font-semibold">{plan.nombre}:</span>{" "}
                {precio ? (
                  <>
                    {formatearCOP(precio.precio_noche)}
                    {precio.precio_noche_1_persona !== null
                      ? ` · 1 persona ${formatearCOP(precio.precio_noche_1_persona)}`
                      : plan.tieneUnaPersona
                        ? " · falta el precio de 1 persona"
                        : ""}
                  </>
                ) : (
                  <span className="text-crema-600">usa la base</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
        <Link
          href={`/admin/tarifas-diferenciales/${temporada.id}`}
          className="rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold text-petroleo-700 transition-colors hover:bg-petroleo-600/10"
        >
          Editar
        </Link>
        <form action={eliminarTemporadaAction}>
          <input type="hidden" name="id" value={temporada.id} />
          <BotonEnviar
            tono="peligro"
            tamano="sm"
            etiquetaEnEspera="Borrando…"
            confirmar={confirmacionBorrado(temporada.nombre)}
          >
            Borrar
          </BotonEnviar>
        </form>
      </div>
    </li>
  );
}
