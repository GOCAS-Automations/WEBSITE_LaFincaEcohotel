import type { Metadata } from "next";

import { ListaExtras } from "../_extras/lista-extras";

export const metadata: Metadata = { title: "Experiencias" };
export const dynamic = "force-dynamic";

export default async function PaginaExperiencias({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  return <ListaExtras tipo="experiencia" aviso={await searchParams} />;
}
