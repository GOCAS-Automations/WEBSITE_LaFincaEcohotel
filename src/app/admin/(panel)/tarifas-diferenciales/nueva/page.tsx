import type { Metadata } from "next";

import { FormularioTemporada } from "../formulario-temporada";
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

export const metadata: Metadata = { title: "Nueva tarifa diferencial" };
export const dynamic = "force-dynamic";

export default async function PaginaNuevaTemporada() {
  const { supabase } = await requireAdmin();

  const [planes, cabanas, otras] = await Promise.all([
    planesConBases(supabase),
    cabanasParaTemporadas(supabase),
    listarTemporadas(supabase),
  ]);

  return (
    <>
      <EncabezadoPagina
        titulo="Nueva tarifa diferencial"
        descripcion="Unas fechas con precios distintos. Al guardarla, el sitio empieza a cobrar esos precios en esas noches; el resto del año sigue el precio base de cada cabaña."
      />

      <Tarjeta>
        <CuerpoTarjeta>
          <FormularioTemporada
            temporada={null}
            planes={planes}
            cabanas={cabanas}
            otras={otras}
          />
        </CuerpoTarjeta>
      </Tarjeta>
    </>
  );
}
