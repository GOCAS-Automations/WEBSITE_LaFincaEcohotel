"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type FormEvent } from "react";

import { clasesBoton } from "@/components/ui/boton";
import { contarNoches, sumarDias } from "@/lib/utils/formato";

import { IconoCalendario, IconoFlecha, IconoLlave } from "./iconos";

/**
 * Módulo de reserva directa de la portada.
 *
 * ---------------------------------------------------------------------------
 * QUÉ HACE HOY Y QUÉ VA A HACER
 * ---------------------------------------------------------------------------
 * Hoy no reserva: **recoge la intención** —qué cabaña y qué fechas— y la lleva
 * a `/reservar` en la dirección (`?cabana=…&entrada=…&salida=…`), donde el hub
 * la recibe ya rellena. Cuando exista el motor de reservas, este mismo módulo
 * pasará a consultar disponibilidad real y el destino cambiará de `/reservar` a
 * la primera pantalla del flujo de pago: el estado que maneja (cabaña, entrada,
 * salida) es exactamente el que necesita el motor, así que no habrá que
 * rediseñarlo, solo cambiar a dónde apunta.
 *
 * POR QUÉ ES UN `<form>` DE VERDAD
 * --------------------------------
 * Lleva `action="/reservar"` y `method="get"`, así que **funciona sin
 * JavaScript**: el navegador arma la misma dirección solo. Con JavaScript se
 * intercepta el envío para poder (a) omitir los parámetros vacíos —una URL con
 * `?cabana=&entrada=` es fea y confunde al compartirla—, (b) avisar de un rango
 * de fechas imposible antes de navegar y (c) llegar directamente al ancla del
 * selector. Es progressive enhancement, no un adorno.
 *
 * DECISIONES DE FORMULARIO
 * ------------------------
 * · "Cualquier cabaña" es la opción por defecto y va PRIMERA. Quien llega a la
 *   portada casi nunca sabe todavía cuál quiere; obligarlo a elegir una para
 *   poder mirar fechas sería ponerle una puerta al camino de reserva.
 * · Elegir la llegada empuja la salida al día siguiente si había quedado antes.
 *   Corregirle la fecha al visitante en silencio es mejor que enseñarle un
 *   error que él no provocó.
 * · Las fechas son `input type="date"` nativos: en el celular abren el
 *   calendario del sistema, que es el que el visitante ya sabe usar. Un
 *   calendario propio aquí sería kilobytes y errores a cambio de nada.
 */

export type CabanaOpcion = { slug: string; nombre: string };

type Props = {
  cabanas: CabanaOpcion[];
  /** Fecha mínima seleccionable (`AAAA-MM-DD`), calculada en el servidor. */
  hoy: string;
  /** Texto del botón. */
  ctaTexto?: string;
};

const CLASE_CAMPO =
  "w-full rounded-[var(--radius-suave)] border border-crema-300/90 bg-white px-3.5 py-3 " +
  "font-titulo text-[0.95rem] font-medium text-petroleo-900 shadow-[inset_0_1px_2px_rgba(41,37,33,0.04)] " +
  "transition-colors duration-200 outline-none focus:border-petroleo-500 hover:border-crema-400";

const CLASE_ETIQUETA =
  "flex items-center gap-1.5 font-titulo text-[0.7rem] font-semibold tracking-[0.14em] text-crema-600 uppercase";

export function ModuloReserva({
  cabanas,
  hoy,
  ctaTexto = "Reservar",
}: Props) {
  const router = useRouter();
  const idError = useId();

  const [cabana, setCabana] = useState("");
  const [entrada, setEntrada] = useState("");
  const [salida, setSalida] = useState("");

  const fechasInvalidas = Boolean(entrada && salida && salida <= entrada);

  const noches = useMemo(() => {
    if (!entrada || !salida || fechasInvalidas) return 0;
    return contarNoches(entrada, salida);
  }, [entrada, salida, fechasInvalidas]);

  /** Al mover la llegada, la salida nunca puede quedarse detrás. */
  function cambiarEntrada(valor: string) {
    setEntrada(valor);
    if (valor && salida && salida <= valor) setSalida(sumarDias(valor, 1));
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (fechasInvalidas) return;

    const parametros = new URLSearchParams();
    if (cabana) parametros.set("cabana", cabana);
    if (entrada) parametros.set("entrada", entrada);
    if (!fechasInvalidas && salida) parametros.set("salida", salida);

    const consulta = parametros.toString();
    router.push(`/reservar${consulta ? `?${consulta}` : ""}#solicitud`);
  }

  return (
    <form
      action="/reservar"
      method="get"
      onSubmit={enviar}
      aria-label="Consultar disponibilidad"
      /* El FAB de WhatsApp (`BotonWhatsappFlotante`) observa este atributo y
         se aparta mientras el módulo esté en pantalla: en un teléfono es el
         momento más importante de la portada y no puede quedar tapado. */
      data-fab-evitar=""
      className="rounded-[var(--radius-generoso)] bg-crema-50/95 p-5 shadow-[var(--shadow-elevada)] ring-1 ring-white/60 backdrop-blur-xl sm:p-6 lg:rounded-[28px] lg:p-7"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <p className="flex items-center gap-2 font-titulo text-sm font-bold text-petroleo-900">
          <IconoLlave className="size-4 text-oliva-600" />
          Reserva directa con el hotel
        </p>
        <p
          className="text-xs text-crema-600"
          aria-live="polite"
          role="status"
        >
          {noches > 0
            ? `${noches} ${noches === 1 ? "noche" : "noches"}`
            : "Sin intermediarios ni comisiones"}
        </p>
      </div>

      {/*
        Dos columnas YA en móvil, no a partir de `sm`. El módulo vive dentro
        del hero: con los cuatro campos apilados ocupaba 380 px y empujaba el
        enlace secundario fuera de la primera pantalla de un teléfono. Llegada y
        salida comparten fila —son la misma decisión— y la cabaña y el botón
        ocupan las dos columnas.
      */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.35fr_1fr_1fr_auto] lg:items-end lg:gap-4">
        <label className="col-span-2 flex flex-col gap-1.5 lg:col-span-1">
          <span className={CLASE_ETIQUETA}>Cabaña</span>
          <select
            name="cabana"
            value={cabana}
            onChange={(evento) => setCabana(evento.target.value)}
            className={CLASE_CAMPO}
          >
            <option value="">Cualquier cabaña</option>
            {cabanas.map((opcion) => (
              <option key={opcion.slug} value={opcion.slug}>
                {opcion.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={CLASE_ETIQUETA}>
            <IconoCalendario className="size-3.5" />
            Llegada
          </span>
          <input
            type="date"
            name="entrada"
            value={entrada}
            min={hoy}
            onChange={(evento) => cambiarEntrada(evento.target.value)}
            className={CLASE_CAMPO}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={CLASE_ETIQUETA}>
            <IconoCalendario className="size-3.5" />
            Salida
          </span>
          <input
            type="date"
            name="salida"
            value={salida}
            min={entrada ? sumarDias(entrada, 1) : hoy}
            onChange={(evento) => setSalida(evento.target.value)}
            aria-invalid={fechasInvalidas}
            aria-describedby={fechasInvalidas ? idError : undefined}
            className={
              fechasInvalidas
                ? `${CLASE_CAMPO} border-red-600 focus:border-red-600`
                : CLASE_CAMPO
            }
          />
        </label>

        <button
          type="submit"
          className={clasesBoton(
            "primario",
            "normal",
            "col-span-2 lg:col-span-1 w-full lg:w-auto lg:px-8 py-3.5 whitespace-nowrap",
          )}
        >
          {ctaTexto}
          <IconoFlecha className="size-4" />
        </button>
      </div>

      {fechasInvalidas ? (
        <p id={idError} className="mt-3 text-sm font-medium text-red-700">
          La fecha de salida debe ser posterior a la de llegada.
        </p>
      ) : null}
    </form>
  );
}
