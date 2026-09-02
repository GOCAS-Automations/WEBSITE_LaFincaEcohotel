import type { Metadata } from "next";

import { FormularioReserva } from "../formulario-reserva";
import {
  CuerpoTarjeta,
  EncabezadoPagina,
  EstadoVacio,
  EnlaceBoton,
  Tarjeta,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import {
  extrasActivos,
  mapaDeTarifas,
  opcionesAlojamiento,
  opcionesPlan,
} from "@/lib/admin/datos";

export const metadata: Metadata = { title: "Nueva reserva" };
export const dynamic = "force-dynamic";

export default async function PaginaNuevaReserva() {
  const { supabase } = await requireAdmin();

  const [alojamientos, planes, tarifas, extras] = await Promise.all([
    opcionesAlojamiento(supabase),
    opcionesPlan(supabase),
    mapaDeTarifas(supabase),
    extrasActivos(supabase),
  ]);

  const faltaCatalogo = alojamientos.length === 0 || planes.length === 0;

  return (
    <>
      <EncabezadoPagina
        titulo="Nueva reserva"
        descripcion="Para apuntar las reservas que llegan por WhatsApp, por teléfono o en persona. Al guardarla, esas noches quedan ocupadas en el calendario."
      />

      <Tarjeta>
        <CuerpoTarjeta>
          {faltaCatalogo ? (
            <EstadoVacio
              titulo="Falta el catálogo"
              descripcion="Para registrar una reserva hacen falta al menos una cabaña y un plan."
              accion={
                <EnlaceBoton href="/admin/alojamientos">
                  Ir a Cabañas
                </EnlaceBoton>
              }
            />
          ) : (
            <FormularioReserva
              reserva={null}
              alojamientos={alojamientos}
              planes={planes}
              tarifas={tarifas}
              extras={extras}
              extrasElegidos={[]}
            />
          )}
        </CuerpoTarjeta>
      </Tarjeta>
    </>
  );
}
