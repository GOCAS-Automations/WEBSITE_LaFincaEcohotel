"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  diasSinCupo,
  ventanaPorCargar,
} from "@/lib/reserva/elegibilidad-calendario";

/**
 * La ocupación de UNA cabaña para el calendario de la reserva manual.
 *
 * Es el primo del `useOcupacion` del sitio (`src/components/sitio/
 * usar-ocupacion.ts`), con lo que cambia en el panel: pregunta a
 * `/admin/api/ocupacion` —que deja fuera la reserva que se está editando y
 * acepta cabañas pausadas— y guarda por cabaña, porque cada respuesta es de
 * una sola. Misma aritmética de meses (`ventanaPorCargar`: el mes que se mira
 * y el siguiente, en una consulta) y misma caducidad de cinco minutos.
 */

const VIGENCIA_MS = 5 * 60_000;
const ESPERA_TRAS_FALLO_MS = 30_000;

type MesGuardado = {
  noches: string[];
  dia: Record<string, number>;
  calendarioCaido: boolean;
  cargadoEn: number;
};

export type OcupacionPanel = {
  estado: "inactiva" | "cargando" | "lista" | "error";
  /** Noches ocupadas de la cabaña en todos los meses cargados. */
  noches: string[];
  /** Días sin cupo del Día de Calma en los meses cargados. */
  diasSinCupo: string[];
  /** ¿Ese mes (`AAAA-MM`) ya tiene datos de esta cabaña? */
  mesCargado: (mes: string) => boolean;
  /** Google no respondió: lo tachado es solo lo de la base. */
  calendarioCaido: boolean;
};

export function useOcupacionPanel({
  alojamientoId,
  excluirReservaId,
  mes,
  activa,
}: {
  /** Vacío = Día de Calma (solo hace falta el cupo). */
  alojamientoId: string;
  excluirReservaId: string | null;
  mes: string;
  activa: boolean;
}): OcupacionPanel {
  const guardados = useRef(new Map<string, MesGuardado>());
  const enCurso = useRef(new Set<string>());
  const fallos = useRef(new Map<string, number>());
  const [version, setVersion] = useState(0);
  const [pendientes, setPendientes] = useState(0);
  const [error, setError] = useState(false);

  const prefijo = `${alojamientoId || "dia"}|`;

  useEffect(() => {
    if (!activa || !mes) return;
    const ahora = Date.now();
    const clave = (m: string) => `${prefijo}${m}`;
    const yaPedido = (m: string) => {
      if (enCurso.current.has(clave(m))) return true;
      const guardado = guardados.current.get(clave(m));
      if (guardado && ahora - guardado.cargadoEn < VIGENCIA_MS) return true;
      const fallo = fallos.current.get(clave(m));
      return fallo !== undefined && ahora - fallo < ESPERA_TRAS_FALLO_MS;
    };
    const ventana = ventanaPorCargar(mes, yaPedido);
    if (!ventana) return;
    for (const m of ventana.meses) enCurso.current.add(clave(m));
    setPendientes((n) => n + 1);

    const parametros = new URLSearchParams({ desde: ventana.desde, hasta: ventana.hasta });
    if (alojamientoId) parametros.set("alojamiento", alojamientoId);
    if (excluirReservaId) parametros.set("excluir", excluirReservaId);

    fetch(`/admin/api/ocupacion?${parametros.toString()}`, { cache: "no-store" })
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error("respuesta no válida");
        return respuesta.json();
      })
      .then(
        (datos: {
          noches?: string[];
          dia?: Record<string, number>;
          calendario?: string;
        }) => {
          const cargadoEn = Date.now();
          for (const m of ventana.meses) {
            guardados.current.set(clave(m), {
              noches: (datos.noches ?? []).filter((noche) => noche.startsWith(m)),
              dia: Object.fromEntries(
                Object.entries(datos.dia ?? {}).filter(([dia]) => dia.startsWith(m)),
              ),
              calendarioCaido:
                datos.calendario === "error" || datos.calendario === "sin_configurar",
              cargadoEn,
            });
            fallos.current.delete(clave(m));
          }
          setError(false);
        },
      )
      .catch(() => {
        const cuando = Date.now();
        for (const m of ventana.meses) fallos.current.set(clave(m), cuando);
        setError(true);
      })
      .finally(() => {
        for (const m of ventana.meses) enCurso.current.delete(clave(m));
        setPendientes((n) => n - 1);
        setVersion((v) => v + 1);
      });
  }, [activa, mes, alojamientoId, excluirReservaId, prefijo]);

  const derivado = useMemo(() => {
    void version;
    const noches: string[] = [];
    const dia: Record<string, number> = {};
    const meses = new Set<string>();
    let calendarioCaido = false;
    for (const [clave, guardado] of guardados.current) {
      if (!clave.startsWith(prefijo)) continue;
      meses.add(clave.slice(prefijo.length));
      noches.push(...guardado.noches);
      Object.assign(dia, guardado.dia);
      calendarioCaido ||= guardado.calendarioCaido;
    }
    return { noches: noches.sort(), sinCupo: diasSinCupo(dia), meses, calendarioCaido };
  }, [version, prefijo]);

  return {
    estado: !activa ? "inactiva" : pendientes > 0 ? "cargando" : error ? "error" : "lista",
    noches: derivado.noches,
    diasSinCupo: derivado.sinCupo,
    mesCargado: (m: string) => derivado.meses.has(m),
    calendarioCaido: derivado.calendarioCaido,
  };
}
