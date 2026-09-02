import type { Metadata } from "next";

import { PaginaNuevoExtra } from "../../_extras/pagina-extra";

export const metadata: Metadata = { title: "Nuevo adicional" };
export const dynamic = "force-dynamic";

export default function PaginaNuevoAdicional() {
  return <PaginaNuevoExtra tipo="adicional" />;
}
