import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { eliminarTemporadaAction } from "../acciones";
import { FormularioTemporada } from "../formulario-temporada";
import { confirmacionBorrado } from "../textos";
import { Aviso } from "@/components/admin/aviso";
import { BotonEnviar } from "@/components/admin/boton-enviar";
import {
  CuerpoTarjeta,
  EncabezadoPagina,
  Tarjeta,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import {
  cabanasParaTemporadas,
  listarTemporadas,
  planesConBases,
} from "@/lib/admin/temporadas";
import { esUuid } from "@/lib/admin/validacion";

export const metadata: Metadata = { title: "Editar tarifa diferencial" };
export const dynamic = "force-dynamic";

export default async function PaginaEditarTemporada({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const busqueda = await searchParams;

  if (!esUuid(id)) notFound();

  const [todas, planes, cabanas] = await Promise.all([
    listarTemporadas(supabase),
    planesConBases(supabase),
    cabanasParaTemporadas(supabase),
  ]);

  const temporada = todas.find((item) => item.id === id);
  if (!temporada) notFound();

  return (
    <>
      <EncabezadoPagina
        titulo={temporada.nombre}
        descripcion="Las fechas, las cabañas y los precios de esta tarifa diferencial. Los cambios se aplican en el sitio al guardar; las reservas ya hechas no cambian."
      />

      <Aviso ok={busqueda.ok} error={busqueda.error} />

      <Tarjeta>
        <CuerpoTarjeta>
          <FormularioTemporada
            temporada={temporada}
            planes={planes}
            cabanas={cabanas}
            otras={todas.filter((item) => item.id !== temporada.id)}
          />
        </CuerpoTarjeta>
      </Tarjeta>

      <Tarjeta className="mt-6">
        <CuerpoTarjeta className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 max-w-xl">
            <h2 className="font-titulo text-[1.0625rem] font-semibold text-crema-900">
              Borrar tarifa diferencial
            </h2>
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-crema-700">
              Esas fechas vuelven a cobrarse con el precio base. Las reservas ya
              hechas no cambian: se quedan con el precio con que se reservaron.
            </p>
          </div>
          <form action={eliminarTemporadaAction}>
            <input type="hidden" name="id" value={temporada.id} />
            <BotonEnviar
              tono="peligro"
              tamano="sm"
              etiquetaEnEspera="Borrando…"
              confirmar={confirmacionBorrado(temporada.nombre)}
            >
              Borrar tarifa diferencial
            </BotonEnviar>
          </form>
        </CuerpoTarjeta>
      </Tarjeta>
    </>
  );
}
