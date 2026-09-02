import type { Metadata } from "next";

import { PaginaEditarExtra } from "../../_extras/pagina-extra";

export const metadata: Metadata = { title: "Editar experiencia" };
export const dynamic = "force-dynamic";

export default async function PaginaExperiencia({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  return (
    <PaginaEditarExtra tipo="experiencia" id={id} aviso={await searchParams} />
  );
}
