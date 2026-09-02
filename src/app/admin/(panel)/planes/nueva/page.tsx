import type { Metadata } from "next";

import { FormularioPlan } from "../formulario-plan";
import {
  CuerpoTarjeta,
  EncabezadoPagina,
  Tarjeta,
} from "@/components/admin/ui";

export const metadata: Metadata = { title: "Nuevo plan" };
export const dynamic = "force-dynamic";

export default function PaginaNuevoPlan() {
  return (
    <>
      <EncabezadoPagina
        titulo="Nuevo plan"
        descripcion="Después de crearlo, entra a cada cabaña para asignarle su precio: un plan nuevo nace sin tarifa en ninguna."
      />

      <Tarjeta>
        <CuerpoTarjeta>
          <FormularioPlan plan={null} />
        </CuerpoTarjeta>
      </Tarjeta>
    </>
  );
}
