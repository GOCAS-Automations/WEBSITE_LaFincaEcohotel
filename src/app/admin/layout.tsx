import type { Metadata } from "next";

/**
 * Layout raíz del panel.
 *
 * No pinta interfaz: existe para aislar `/admin/*` del sitio público —que tiene
 * su propio armazón con cabecera, pie y botón de WhatsApp en
 * `src/app/(publico)/layout.tsx`— y para marcar TODO el panel como no
 * indexable. El `robots.ts` ya excluye `/admin`, pero la metaetiqueta cubre el
 * caso de un enlace directo compartido por error.
 */
export const metadata: Metadata = {
  title: {
    default: "Panel · La Finca Eco Hotel",
    template: "%s · Panel La Finca",
  },
  robots: { index: false, follow: false, nocache: true },
};

export default function LayoutRaizAdmin({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
