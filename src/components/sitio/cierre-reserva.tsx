import type { ReactNode } from "react";

import { Boton } from "@/components/ui/boton";
import { Seccion } from "@/components/ui/seccion";

import {
  CorteOrganico,
  FondoBosque,
  RamaBotanica,
  RELLENO_DE_FONDO,
} from "./atmosfera";

/**
 * Cierre de página: la ladera, el bosque y el camino a reservar.
 *
 * Casi todas las páginas internas terminaban con el mismo bloque copiado —una
 * `Seccion fondo="petroleo"` con un título, un párrafo y un botón—. Ahora ese
 * cierre es una pieza sola, y de paso hace tres cosas que antes no hacía:
 *
 *   1. **Entra por una ladera, no por una línea recta.** La ladera se dibuja
 *      ENCIMA de la fotografía del cierre, con el color de la sección anterior:
 *      así el corte recorta la propia imagen y la foto llega hasta el filo de
 *      la onda. Dibujarla al revés —onda de color plano en la sección de
 *      arriba— dejaba una franja verde con forma de ladera y, debajo, el borde
 *      recto de la foto. Ver `CorteOrganico` en `atmosfera.tsx`.
 *   2. **Tiene atmósfera.** Bruma y motas de luz, como el resto de las zonas
 *      oscuras del sitio.
 *   3. **Usa el botón crema.** El petróleo sobre verde bosque no llega al 3:1
 *      que exige la norma para el contorno de un control (ver `boton.tsx`).
 *
 * `fondoAnterior` es obligatorio y no tiene valor por defecto a propósito: la
 * onda se rellena con ESE color, y si no coincide con la sección de arriba se
 * ve una franja de color equivocado. Que haya que decirlo obliga a mirarlo.
 */
export function CierreReserva({
  titulo,
  texto,
  fondoAnterior,
  imagen,
  perfil = "loma",
  espejo = false,
  children,
}: {
  titulo: string;
  texto?: string;
  /** Clase de fondo de la sección inmediatamente anterior (`bg-crema-50`…). */
  fondoAnterior: string;
  /**
   * Foto de bosque del fondo. La pasa cada página desde el CMS
   * (`seccionPlanes.imagen_fondo`) para que el cliente pueda cambiarla sin
   * tocar código, y para que no todas las páginas cierren con la misma imagen.
   */
  imagen: string;
  perfil?: "cresta" | "loma" | "bruma";
  espejo?: boolean;
  /** Sustituye al botón por defecto (por ejemplo, para poner dos). */
  children?: ReactNode;
}) {
  return (
    <>
      <Seccion
        fondo="bosque"
        espacio="normal"
        /* El aire de arriba lo marca la onda, que mide 88 px y se dibuja
           dentro de la sección: sin este relleno el titular se le montaría. */
        className="relative isolate overflow-hidden pt-28 pb-24 sm:pt-32 sm:pb-28 lg:pt-36 lg:pb-28"
      >
        {/* Bosque de verdad bajo el velo de petróleo, con bruma, resplandor y
            patrón de colibríes. Ver `FondoBosque` en `atmosfera.tsx`. */}
        <FondoBosque imagen={imagen} velo="denso" resplandor="izquierda" />

        {/* La ladera, ENCIMA de la foto y con el color de la sección anterior:
            es lo que recorta la imagen en vez de taparla. */}
        <CorteOrganico
          perfil={perfil}
          color={RELLENO_DE_FONDO[fondoAnterior] ?? "fill-crema-50"}
          borde="superior"
          alto={88}
          espejo={espejo}
        />
        {/* El corte de abajo, hacia el pie de página. */}
        <CorteOrganico
          perfil="loma"
          color="fill-petroleo-900"
          borde="inferior"
          alto={64}
          espejo={!espejo}
        />
        <RamaBotanica
          className="absolute bottom-[-12%] left-[-3%] hidden w-48 text-brote-100/20 lg:block"
          ritmo="lenta"
        />

        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          <h2 className="max-w-2xl text-2xl leading-tight font-bold text-white sm:text-3xl">
            {titulo}
          </h2>
          {texto ? (
            <p className="max-w-xl leading-relaxed text-crema-100/90">{texto}</p>
          ) : null}
          {children ?? (
            <Boton href="/reservar" variante="marca" tamano="grande">
              Reservar ahora
            </Boton>
          )}
        </div>
      </Seccion>
    </>
  );
}
