import type { Metadata } from "next";
import Link from "next/link";

import { SECCIONES_CONTENIDO } from "./secciones";
import { EncabezadoPagina } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Contenido del sitio" };
export const dynamic = "force-dynamic";

export default async function PaginaContenido() {
  await requireAdmin();

  return (
    <>
      <EncabezadoPagina
        titulo="Contenido del sitio"
        descripcion="Los textos y las fotos del sitio web. Cambia algo, guarda, y en unos segundos ya se ve publicado."
      />

      <div className="mb-6 rounded-tarjeta bg-dorado-500/[0.09] px-4 py-3.5 text-[0.875rem] leading-relaxed text-dorado-800 ring-1 ring-dorado-500/20">
        Aquí no se editan ni las cabañas, ni los precios, ni las experiencias con
        precio: cada una tiene su propia sección en el menú. Lo de esta pantalla
        son los textos y las fotos que acompañan a todo lo demás.
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {SECCIONES_CONTENIDO.map((seccion) => (
          <li key={seccion.slug}>
            <Link
              href={`/admin/contenido/${seccion.slug}`}
              className="flex h-full flex-col rounded-tarjeta bg-white px-5 py-4 shadow-tenue ring-1 ring-crema-900/[0.06] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-tarjeta"
            >
              <span className="font-titulo text-[1rem] font-semibold text-crema-900">
                {seccion.titulo}
              </span>
              <span className="mt-1.5 text-[0.8125rem] leading-relaxed text-crema-700">
                {seccion.descripcion}
              </span>
              <span className="mt-3 text-[0.8125rem] font-semibold text-petroleo-700">
                Editar →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
