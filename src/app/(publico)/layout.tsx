import { Encabezado } from "@/components/sitio/encabezado";
import { Pie } from "@/components/sitio/pie";
import { WhatsappFlotante } from "@/components/sitio/whatsapp-flotante";

/**
 * Layout del sitio público.
 *
 * Vive en un grupo de rutas `(publico)` para que el futuro panel `/admin` no
 * herede ni el encabezado, ni el pie, ni el botón de WhatsApp.
 *
 * El enlace "Saltar al contenido" es el primer elemento enfocable de la página:
 * quien navega con teclado o lector de pantalla no tiene que recorrer las ocho
 * entradas del menú en cada página para llegar al texto.
 */
export default function LayoutPublico({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-crema-50">
      <a
        href="#contenido"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-100 focus-visible:rounded-full focus-visible:bg-petroleo-600 focus-visible:px-5 focus-visible:py-3 focus-visible:font-titulo focus-visible:text-sm focus-visible:font-semibold focus-visible:text-white"
      >
        Saltar al contenido
      </a>

      <Encabezado />

      <main id="contenido" className="flex-1">
        {children}
      </main>

      <Pie />
      <WhatsappFlotante />
    </div>
  );
}
