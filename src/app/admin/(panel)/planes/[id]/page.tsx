import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FormularioPlan } from "../formulario-plan";
import { Aviso } from "@/components/admin/aviso";
import {
  CuerpoTarjeta,
  EncabezadoPagina,
  Tarjeta,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { obtenerPlan } from "@/lib/admin/datos";
import { esUuid } from "@/lib/admin/validacion";

export const metadata: Metadata = { title: "Editar plan" };
export const dynamic = "force-dynamic";

export default async function PaginaEditarPlan({
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

  const plan = await obtenerPlan(supabase, id);
  if (!plan) notFound();

  return (
    <>
      <EncabezadoPagina
        titulo={plan.nombre}
        descripcion={
          plan.tipo === "dia"
            ? "El nombre, lo que incluye, los días en que aplica, el horario y el precio de este plan de día."
            : "El nombre, lo que incluye y los días en que aplica este plan. El precio se pone por cabaña, en «Cabañas»."
        }
      />

      <Aviso ok={busqueda.ok} error={busqueda.error} />

      <Tarjeta>
        <CuerpoTarjeta>
          <FormularioPlan plan={plan} />
        </CuerpoTarjeta>
      </Tarjeta>
    </>
  );
}
