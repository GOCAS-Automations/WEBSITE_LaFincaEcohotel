import type { Metadata } from "next";

import { FormularioAlojamiento } from "../formulario-alojamiento";
import {
  CuerpoTarjeta,
  EncabezadoPagina,
  Tarjeta,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { listarPlanes } from "@/lib/admin/datos";

export const metadata: Metadata = { title: "Nueva cabaña" };
export const dynamic = "force-dynamic";

export default async function PaginaNuevaCabana() {
  const { supabase } = await requireAdmin();
  const planes = await listarPlanes(supabase);

  return (
    <>
      <EncabezadoPagina
        titulo="Nueva cabaña"
        descripcion="Rellena lo básico y créala. Las fotos y los precios se pueden ajustar después."
      />

      <Tarjeta>
        <CuerpoTarjeta>
          <FormularioAlojamiento
            alojamiento={null}
            galeria={[]}
            tarifas={planes.map((plan) => ({
              id: null,
              plan_id: plan.id,
              plan_nombre: plan.nombre,
              precio_noche: null,
            }))}
          />
        </CuerpoTarjeta>
      </Tarjeta>
    </>
  );
}
