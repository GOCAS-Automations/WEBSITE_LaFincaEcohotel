import Link from "next/link";
import { notFound } from "next/navigation";

import { FormularioExtra } from "./formulario-extra";
import { TEXTOS_EXTRA, rutaDeTipo } from "./rutas";
import { Aviso } from "@/components/admin/aviso";
import {
  CuerpoTarjeta,
  EncabezadoPagina,
  Tarjeta,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { obtenerExtra } from "@/lib/admin/datos";
import { esUuid } from "@/lib/admin/validacion";
import type { TipoExtra } from "@/lib/tipos/basedatos";

/** Pantalla de "crear" de una experiencia o un adicional. */
export function PaginaNuevoExtra({ tipo }: { tipo: TipoExtra }) {
  const textos = TEXTOS_EXTRA[tipo];
  return (
    <>
      <EncabezadoPagina
        titulo={`Nueva ${textos.singular}`}
        descripcion={textos.explicacionVacio}
      />
      <Tarjeta>
        <CuerpoTarjeta>
          <FormularioExtra tipo={tipo} extra={null} />
        </CuerpoTarjeta>
      </Tarjeta>
    </>
  );
}

/** Pantalla de "editar". */
export async function PaginaEditarExtra({
  tipo,
  id,
  aviso,
}: {
  tipo: TipoExtra;
  id: string;
  aviso: { ok?: string; error?: string };
}) {
  const { supabase } = await requireAdmin();

  if (!esUuid(id)) notFound();

  const extra = await obtenerExtra(supabase, id);
  if (!extra || extra.tipo !== tipo) notFound();

  const textos = TEXTOS_EXTRA[tipo];

  return (
    <>
      <EncabezadoPagina
        titulo={extra.nombre}
        descripcion={`Datos de esta ${textos.singular} tal como los ve el huésped.`}
        accion={
          <Link
            href={rutaDeTipo(tipo)}
            className="text-[0.875rem] font-semibold text-crema-700 underline-offset-4 hover:underline"
          >
            ← Volver a {textos.plural}
          </Link>
        }
      />

      <Aviso ok={aviso.ok} error={aviso.error} />

      <Tarjeta>
        <CuerpoTarjeta>
          <FormularioExtra tipo={tipo} extra={extra} />
        </CuerpoTarjeta>
      </Tarjeta>
    </>
  );
}
