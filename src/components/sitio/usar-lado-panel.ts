"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";

/**
 * ¿El panel se abre hacia ABAJO o hacia ARRIBA?
 *
 * ---------------------------------------------------------------------------
 * EL PROBLEMA
 * ---------------------------------------------------------------------------
 * El calendario del módulo de reserva mide unos 460 px y cuelga del campo con
 * `position: absolute`. En un teléfono eso ya estaba resuelto —abajo hay una
 * hoja anclada al borde de la pantalla—, pero en escritorio se abría SIEMPRE
 * hacia abajo. Medido contra localhost: a 1440×900, con el módulo dentro del
 * hero, el pie del panel caía en y = 929 con la ventana acabada en 900. La
 * última fila del mes y los botones «Borrar fechas» y «Listo» quedaban fuera
 * de la pantalla y había que desplazar la página a ciegas. Lo mismo le pasaba
 * a la lista de cabañas.
 *
 * ---------------------------------------------------------------------------
 * LA REGLA
 * ---------------------------------------------------------------------------
 * Se mide el disparador con `getBoundingClientRect()` —que da coordenadas
 * relativas al VISOR, que es justo lo que hace falta— y se compara el espacio
 * libre por debajo con el que hay por encima:
 *
 *   · Si abajo cabe el panel entero, abajo. Es lo que espera todo el mundo.
 *   · Si no cabe abajo y arriba hay más sitio, arriba.
 *   · Si no cabe en ninguno de los dos, se queda abajo y el propio panel se
 *     encarga de no desbordar (`espacio` dice cuánto hay).
 *
 * Se recalcula al abrir, al desplazar y al cambiar el tamaño de la ventana: el
 * módulo de reserva vive dentro del hero y basta con mover la página unos
 * píxeles para que la respuesta correcta cambie. El oyente de `scroll` va con
 * `capture` para enterarse también de los desplazamientos de contenedores
 * internos.
 *
 * El alto real se mide del propio panel cuando ya existe (`panel`); mientras
 * tanto se usa `altoEstimado`, que es lo que evita el salto: la primera
 * decisión se toma ANTES de pintar, con `useLayoutEffect`.
 *
 * ⚠️ El nombre va en inglés —`useLadoDelPanel`— y no en español como el resto
 * del proyecto porque las reglas de React de ESLint reconocen un hook por el
 * prefijo `use`. Con `usarLadoDelPanel` el linter deja de comprobar las
 * dependencias y, de paso, protesta por llamar a `useState` fuera de un hook.
 */

/** `useLayoutEffect` en el navegador, `useEffect` en el servidor (no avisa). */
const useEfectoDeDisposicion =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export type LadoDelPanel = {
  /** Hacia dónde abrir. */
  lado: "abajo" | "arriba";
  /** Píxeles libres en ese lado, ya descontado el margen. */
  espacio: number;
};

export function useLadoDelPanel({
  abierto,
  disparador,
  panel,
  altoEstimado,
  margen = 16,
  margenSuperior = 88,
}: {
  abierto: boolean;
  disparador: RefObject<HTMLElement | null>;
  /** El panel, si ya está en el árbol: su alto real manda sobre el estimado. */
  panel?: RefObject<HTMLElement | null>;
  altoEstimado: number;
  margen?: number;
  /**
   * Aire que hay que dejar arriba. Por defecto 88 px: la cápsula del nav va
   * `fixed` sobre los primeros 76 px de la ventana y, sin reservarlos, un panel
   * abierto hacia arriba se mete por debajo de ella.
   */
  margenSuperior?: number;
}): LadoDelPanel {
  const [estado, setEstado] = useState<LadoDelPanel>({
    lado: "abajo",
    espacio: altoEstimado,
  });

  const calcular = useCallback(() => {
    const ancla = disparador.current;
    if (!ancla) return;

    const caja = ancla.getBoundingClientRect();
    const alto = panel?.current?.offsetHeight || altoEstimado;
    const libreAbajo = window.innerHeight - caja.bottom - margen;
    const libreArriba = caja.top - margenSuperior;

    const arriba = libreAbajo < alto && libreArriba > libreAbajo;
    const siguiente: LadoDelPanel = {
      lado: arriba ? "arriba" : "abajo",
      espacio: Math.max(0, arriba ? libreArriba : libreAbajo),
    };

    setEstado((anterior) =>
      anterior.lado === siguiente.lado &&
      Math.abs(anterior.espacio - siguiente.espacio) < 2
        ? anterior
        : siguiente,
    );
  }, [disparador, panel, altoEstimado, margen, margenSuperior]);

  useEfectoDeDisposicion(() => {
    if (!abierto) return;
    calcular();
  }, [abierto, calcular]);

  useEffect(() => {
    if (!abierto) return;
    window.addEventListener("scroll", calcular, true);
    window.addEventListener("resize", calcular);
    return () => {
      window.removeEventListener("scroll", calcular, true);
      window.removeEventListener("resize", calcular);
    };
  }, [abierto, calcular]);

  return estado;
}
