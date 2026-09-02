import type { Metadata } from "next";

import { PaginaNuevoExtra } from "../../_extras/pagina-extra";

export const metadata: Metadata = { title: "Nueva experiencia" };
export const dynamic = "force-dynamic";

export default function PaginaNuevaExperiencia() {
  return <PaginaNuevoExtra tipo="experiencia" />;
}
