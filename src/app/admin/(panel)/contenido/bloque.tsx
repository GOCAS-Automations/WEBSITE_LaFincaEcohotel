import type { ReactNode } from "react";

import { CabeceraTarjeta, CuerpoTarjeta, Tarjeta } from "@/components/admin/ui";

/**
 * Cada sección editable del sitio es una tarjeta con su propio formulario y su
 * propio botón de guardar.
 *
 * Es a propósito: un único formulario gigante con un solo "Guardar" haría que
 * un campo mal puesto en la portada impidiera guardar el pie de página, y
 * obligaría a revisar la pantalla entera cada vez. Así, cada bloque se guarda
 * y se confirma por separado.
 */
export function BloqueContenido({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  return (
    <Tarjeta>
      <CabeceraTarjeta titulo={titulo} descripcion={descripcion} />
      <CuerpoTarjeta>{children}</CuerpoTarjeta>
    </Tarjeta>
  );
}
