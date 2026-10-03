"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  diasDelMes,
  diasSinCupo,
  repartirPorMes,
  ventanaPorCargar,
  type OcupacionDelMes,
} from "@/lib/reserva/elegibilidad-calendario";

/**
 * La ocupación del calendario, cargada por meses y guardada en memoria.
 *
 * La usan los dos calendarios del sitio —el del módulo de la portada y el de
 * `/reservar`— para que la carga sea UNA y no dos copias que acaben diciendo
 * cosas distintas.
 *
 * ---------------------------------------------------------------------------
 * POR MESES, DE DOS EN DOS
 * ---------------------------------------------------------------------------
 * Se pide el mes que se está mirando y el siguiente en una sola consulta: así
 * pasar de página no espera. Dos meses son 62 días como mucho, dentro del tope
 * de 92 que acepta `/api/disponibilidad`. La aritmética de qué pedir vive en
 * `ventanaPorCargar()`, que es pura y tiene sus pruebas.
 *
 * ---------------------------------------------------------------------------
 * UNA CONSULTA SIRVE A LAS CINCO CABAÑAS
 * ---------------------------------------------------------------------------
 * `/api/disponibilidad` devuelve todas las cabañas en la misma respuesta: la
 * consulta cuesta lo mismo pida una o cinco (lee las mismas tablas y el mismo
 * calendario de Google). Por eso la caché es por MES y dentro de cada mes
 * guarda las noches de cada cabaña por separado: cambiar de cabaña no vuelve a
 * preguntar al servidor, pero lo que se pinta es siempre de la cabaña elegida
 * —nunca se mezclan las noches de una con las de otra—. Volver a pedir al
 * cambiar de cabaña solo gastaría el freno de peticiones (30 por minuto) y la
 * cuota de Google para recibir los mismos datos.
 *
 * Lo cargado caduca a los cinco minutos, lo mismo que tarda en refrescarse la
 * capa de Google del servidor: quien se queda mirando el calendario un buen
 * rato vuelve a pedir el mes al moverse por él.
 *
 * ---------------------------------------------------------------------------
 * PEREZOSA
 * ---------------------------------------------------------------------------
 * Con `activa = false` no pide nada. La portada la enciende cuando el
 * visitante abre el calendario o elige cabaña, no al cargar la página: no
 * tiene sentido consultar el calendario del hotel por cada visita que solo
 * mira fotos.
 */

/** Cuánto vale lo cargado antes de volver a pedirlo. */
const VIGENCIA_MS = 5 * 60_000;
/** Tras un fallo, cuánto se espera antes de reintentar ese mes. */
const ESPERA_TRAS_FALLO_MS = 30_000;

type MesGuardado = OcupacionDelMes & { cargadoEn: number };

export type EstadoOcupacion = "inactiva" | "cargando" | "lista" | "error";

export type Ocupacion = {
  estado: EstadoOcupacion;
  /** Noches ocupadas de cada cabaña (por `slug`) en todos los meses cargados. */
  porCabana: Readonly<Record<string, string[]>>;
  /** Días sin cupo para el Día de Calma en los meses cargados. */
  diasSinCupo: string[];
  /** Todos los días de los meses cargados, en orden. */
  diasCargados: string[];
  /** ¿Ese mes (`AAAA-MM`) ya tiene datos? */
  mesCargado: (mes: string) => boolean;
};

export function useOcupacion({
  activa,
  mes,
}: {
  activa: boolean;
  /** Mes que se está mirando, `AAAA-MM`. */
  mes: string;
}): Ocupacion {
  const guardados = useRef(new Map<string, MesGuardado>());
  const enCurso = useRef(new Set<string>());
  const fallos = useRef(new Map<string, number>());

  /* La caché vive en refs; este número es lo que avisa a React de que cambió. */
  const [version, setVersion] = useState(0);
  const [pendientes, setPendientes] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!activa || !mes) return;

    const ahora = Date.now();
    const yaPedido = (clave: string) => {
      if (enCurso.current.has(clave)) return true;
      const guardado = guardados.current.get(clave);
      if (guardado && ahora - guardado.cargadoEn < VIGENCIA_MS) return true;
      const fallo = fallos.current.get(clave);
      return fallo !== undefined && ahora - fallo < ESPERA_TRAS_FALLO_MS;
    };

    const ventana = ventanaPorCargar(mes, yaPedido);
    if (!ventana) return;

    for (const clave of ventana.meses) enCurso.current.add(clave);
    setPendientes((n) => n + 1);

    fetch(
      `/api/disponibilidad?desde=${encodeURIComponent(ventana.desde)}&hasta=${encodeURIComponent(ventana.hasta)}`,
      { cache: "no-store" },
    )
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error("respuesta no válida");
        return respuesta.json();
      })
      .then(
        (datos: {
          cabanas?: { slug: string; ocupado?: string[] }[];
          dia?: Record<string, number>;
        }) => {
          const trozos = repartirPorMes(datos, ventana.meses);
          const cargadoEn = Date.now();
          for (const clave of ventana.meses) {
            guardados.current.set(clave, { ...trozos[clave], cargadoEn });
            fallos.current.delete(clave);
          }
          setError(false);
        },
      )
      .catch(() => {
        const cuando = Date.now();
        for (const clave of ventana.meses) fallos.current.set(clave, cuando);
        setError(true);
      })
      .finally(() => {
        for (const clave of ventana.meses) enCurso.current.delete(clave);
        setPendientes((n) => n - 1);
        setVersion((v) => v + 1);
      });
    /* Sin AbortController a propósito: si el visitante pasa de mes antes de
       que llegue la respuesta, esos datos siguen sirviendo —se guardan— y no
       hay que volver a pedirlos. */
  }, [activa, mes]);

  const derivado = useMemo(() => {
    /* `version` es la dependencia real: la caché es una ref. */
    void version;
    const porCabana: Record<string, string[]> = {};
    const dia: Record<string, number> = {};
    const meses = [...guardados.current.keys()].sort();
    for (const clave of meses) {
      const guardado = guardados.current.get(clave)!;
      for (const [slug, noches] of Object.entries(guardado.cabanas)) {
        (porCabana[slug] ??= []).push(...noches);
      }
      Object.assign(dia, guardado.dia);
    }
    return {
      porCabana,
      diasSinCupo: diasSinCupo(dia),
      diasCargados: meses.flatMap(diasDelMes),
      meses: new Set(meses),
    };
  }, [version]);

  const estado: EstadoOcupacion = !activa
    ? "inactiva"
    : pendientes > 0
      ? "cargando"
      : error
        ? "error"
        : "lista";

  return {
    estado,
    porCabana: derivado.porCabana,
    diasSinCupo: derivado.diasSinCupo,
    diasCargados: derivado.diasCargados,
    mesCargado: (clave: string) => derivado.meses.has(clave),
  };
}
