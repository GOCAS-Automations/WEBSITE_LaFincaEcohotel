import type { Metadata } from "next";

import { FormularioAlojamiento } from "../formulario-alojamiento";
import {
  CuerpoTarjeta,
  EncabezadoPagina,
  Tarjeta,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { planesDeHospedaje } from "@/lib/admin/datos";

export const metadata: Metadata = { title: "Nueva cabaña" };
export const dynamic = "force-dynamic";

export default async function PaginaNuevaCabana() {
  const { supabase } = await requireAdmin();
  // Solo los planes de hospedaje: los de día no se venden por cabaña.
  const planes = await planesDeHospedaje(supabase);

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
              // Una cabaña nueva nace sin ningún plan activado: se encienden
              // uno a uno al ponerles precio.
              ofrecido: false,
              precio_noche: null,
              precio_noche_1_persona: null,
              dias_aplica: plan.dias_aplica,
            }))}
          />
        </CuerpoTarjeta>
      </Tarjeta>
    </>
  );
}
