import { Encabezado } from "./encabezado";
import { Pie } from "./pie";
import { WhatsappFlotante } from "./whatsapp-flotante";

/**
 * Estructura del sitio público: encabezado, contenido, pie y botón de WhatsApp.
 *
 * Existe como componente —y no solo dentro del layout del grupo `(publico)`—
 * porque la página 404 de la raíz (`src/app/not-found.tsx`) se renderiza fuera
 * de ese grupo: es la que responde a una dirección que no coincide con ninguna
 * ruta, y sin esto saldría sin menú, sin pie y sin el RNT.
 *
 * El enlace "Saltar al contenido" es el primer elemento enfocable de la página:
 * quien navega con teclado o lector de pantalla no tiene que recorrer las siete
 * entradas del menú en cada página para llegar al texto.
 */
export function MarcoPublico({
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
