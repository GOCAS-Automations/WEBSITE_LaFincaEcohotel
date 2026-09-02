import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FormularioAlojamiento } from "../formulario-alojamiento";
import { Aviso } from "@/components/admin/aviso";
import {
  CuerpoTarjeta,
  EncabezadoPagina,
  Tarjeta,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import {
  galeriaDeAlojamiento,
  obtenerAlojamiento,
  tarifasDeAlojamiento,
} from "@/lib/admin/datos";
import { esUuid } from "@/lib/admin/validacion";

export const metadata: Metadata = { title: "Editar cabaña" };
export const dynamic = "force-dynamic";

export default async function PaginaEditarCabana({
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

  const alojamiento = await obtenerAlojamiento(supabase, id);
  if (!alojamiento) notFound();

  const [galeria, tarifas] = await Promise.all([
    galeriaDeAlojamiento(supabase, id),
    tarifasDeAlojamiento(supabase, id),
  ]);

  return (
    <>
      <EncabezadoPagina
        titulo={alojamiento.nombre}
        descripcion="Todo lo que el huésped ve de esta cabaña en el sitio web."
        accion={
          <Link
            href={`/alojamientos/${alojamiento.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-[0.875rem] font-semibold text-petroleo-700 underline-offset-4 hover:underline"
          >
            Ver en el sitio ↗
          </Link>
        }
      />

      <Aviso ok={busqueda.ok} error={busqueda.error} />

      <Tarjeta>
        <CuerpoTarjeta>
          <FormularioAlojamiento
            alojamiento={alojamiento}
            galeria={galeria}
            tarifas={tarifas}
          />
        </CuerpoTarjeta>
      </Tarjeta>
    </>
  );
}
