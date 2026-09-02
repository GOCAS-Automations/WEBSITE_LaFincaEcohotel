import { MarcoPublico } from "@/components/sitio/marco-publico";

/**
 * Layout del sitio público.
 *
 * Vive en un grupo de rutas `(publico)` para que el futuro panel `/admin` no
 * herede ni el encabezado, ni el pie, ni el botón de WhatsApp.
 */
export default function LayoutPublico({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <MarcoPublico>{children}</MarcoPublico>;
}
