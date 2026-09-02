import type { Metadata } from "next";

import { ListaExtras } from "../_extras/lista-extras";

export const metadata: Metadata = { title: "Adicionales" };
export const dynamic = "force-dynamic";

export default async function PaginaAdicionales({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  return <ListaExtras tipo="adicional" aviso={await searchParams} />;
}
