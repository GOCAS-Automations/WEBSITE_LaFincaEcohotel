"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";

import { clasesBoton } from "@/components/ui/boton";
import {
  bloqueoComun,
  bloqueoDeCabana,
  mesDe,
  MOTIVO_TODAS_OCUPADAS,
  nochesBloqueadas,
  validarFechas,
} from "@/lib/reserva/elegibilidad-calendario";
import {
  etiquetaTipoNoche,
  nochesDe,
  primeraLlegadaReservable,
  validarRango,
  type TipoNoche,
} from "@/lib/reserva/noches";

import { CalendarioFechas } from "./calendario-fechas";
import { SelectorCabana } from "./selector-cabana";
import { IconoFlecha, IconoLlave } from "./iconos";
import { useOcupacion } from "./usar-ocupacion";

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
 * · Las fechas NO son dos `input type="date"`. El campo nativo no sabe marcar
 *   los festivos de Colombia ni distinguir las noches entre semana de las de
 *   fin de semana, que es de lo que depende el precio. Es `CalendarioFechas`,
 *   escrito a mano. De paso los dos campos pasan a ser UNO, que es lo que
 *   devuelve al módulo el alto que tenía antes: en el hero de un teléfono cada
 *   línea cuenta.
 * · **Ningún día se apaga por culpa de un plan.** Aquí ni siquiera se pregunta
 *   el plan: el plan sale de la noche (ver `src/lib/reserva/noches.ts`).
 * · **Sí se apaga lo OCUPADO** (2026-10-03). Con cabaña elegida, el calendario
 *   tacha sus noches tomadas —y, en la 02, las de lunes a jueves, que no
 *   vende—. Sin cabaña, tacha solo las noches en que NO queda ninguna libre, y
 *   el panel dice que al elegir cabaña se ven sus fechas exactas. Las reglas
 *   y la carga son las mismas que en `/reservar`: `elegibilidad-calendario.ts`
 *   y `useOcupacion`. Nada se pide al servidor hasta que el visitante abre el
 *   calendario o elige cabaña.
 */

export type CabanaOpcion = {
  slug: string;
  nombre: string;
  /**
   * Tipos de noche que vende (de sus tarifas, `tiposOfrecidosDe`). La 02 solo
   * vende las de fin de semana. `null` o ausente = todas.
   */
  tipos?: TipoNoche[] | null;
};

type Props = {
  cabanas: CabanaOpcion[];
  /**
   * El «hoy» del hotel (`AAAA-MM-DD`), calculado en el servidor con
   * `hoyEnBogota()`. De aquí sale la primera llegada elegible, que **no** es
   * hoy: ver `DIAS_MINIMOS_ANTELACION` en `src/lib/reserva/noches.ts`.
   */
  hoy: string;
  /** Texto del botón. */
  ctaTexto?: string;
};

/* La piel de los campos vive ahora en cada control (`SelectorCabana` y
   `CalendarioFechas`): los dos tienen que medir exactamente lo mismo —radio de
   12 px, borde crema y 49 px de alto— y una constante aquí solo la usaba uno. */
const CLASE_ETIQUETA =
  "flex items-center gap-1.5 font-titulo text-xs font-semibold tracking-[0.12em] text-crema-600 uppercase";

export function ModuloReserva({
  cabanas,
  hoy,
  ctaTexto = "Reservar",
}: Props) {
  const router = useRouter();
  const idEtiquetaCabana = useId();

  const [cabana, setCabana] = useState("");
  const [entrada, setEntrada] = useState("");
  const [salida, setSalida] = useState("");

  const primera = primeraLlegadaReservable(hoy);

  /* --- La ocupación ------------------------------------------------------ */

  /*
    PEREZOSA: la portada la ve todo el mundo y casi nadie abre el calendario.
    Se enciende al abrirlo (el calendario avisa del mes que muestra) o al
    elegir cabaña, que es la señal de que va en serio.
  */
  const [interesado, setInteresado] = useState(false);
  const [mes, setMes] = useState(() => mesDe(primera));
  const ocupacion = useOcupacion({ activa: interesado, mes });

  const opcion = cabanas.find((item) => item.slug === cabana) ?? null;

  /*
    QUÉ SE TACHA.
    Con cabaña: sus noches tomadas (la regla de la 02 la aplica el propio
    calendario con `tiposDeNocheOfrecidos`). Sin cabaña: las noches en que
    las cinco están bloqueadas —ocupadas o, en la 02, entre semana—, sacadas
    de los meses ya cargados.
  */
  const nochesOcupadas = useMemo(() => {
    if (opcion) return ocupacion.porCabana[opcion.slug] ?? [];
    if (ocupacion.diasCargados.length === 0) return [];
    const comun = bloqueoComun(
      cabanas.map((item) =>
        bloqueoDeCabana({
          ocupadas: ocupacion.porCabana[item.slug] ?? [],
          tiposOfrecidos: item.tipos ?? null,
        }),
      ),
    );
    return nochesBloqueadas(ocupacion.diasCargados, comun);
  }, [opcion, cabanas, ocupacion.porCabana, ocupacion.diasCargados]);

  const notaCalendario =
    ocupacion.estado === "error"
      ? "No pudimos consultar las fechas ocupadas ahora mismo. Elige igual: te las confirmamos al reservar."
      : !opcion
        ? "Tachamos solo los días sin ninguna cabaña libre. Al elegir cabaña verás sus fechas exactas."
        : opcion.tipos && opcion.tipos.length === 1
          ? `La ${opcion.nombre} solo se ofrece para ${etiquetaTipoNoche(opcion.tipos[0], true)}: las demás salen tachadas.`
          : null;

  /*
    CAMBIAR DE CABAÑA CON LAS FECHAS PUESTAS.
    Se comprueban contra la nueva con las mismas reglas del calendario; si no
    valen, se quitan y se dice arriba, en la línea de estado del módulo.
    `/reservar` haría lo mismo al llegar, pero aquí se ve antes de pulsar.
  */
  const [porValidar, setPorValidar] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!porValidar) return;
    if (!entrada || !opcion) {
      setPorValidar(false);
      return;
    }
    if (ocupacion.estado !== "error" && !ocupacion.mesCargado(mesDe(entrada))) {
      return;
    }
    const resultado = validarFechas(
      { entrada, salida },
      {
        hoy,
        minima: primera,
        bloqueo: bloqueoDeCabana({
          ocupadas: ocupacion.porCabana[opcion.slug] ?? [],
          tiposOfrecidos: opcion.tipos ?? null,
          nombreCabana: opcion.nombre,
        }),
      },
    );
    if (!resultado.valido) {
      setAviso(`Esas fechas no están libres en la ${opcion.nombre}: elige otras.`);
      setEntrada("");
      setSalida("");
    }
    setPorValidar(false);
  }, [porValidar, entrada, salida, opcion, ocupacion, hoy, primera]);

  function cambiarCabana(nueva: string) {
    setCabana(nueva);
    setAviso(null);
    if (nueva) setInteresado(true);
    if (nueva && entrada) {
      setMes(mesDe(entrada));
      setPorValidar(true);
    }
  }

  /*
    Aquí NO hay plan, y tampoco hace falta: el plan sale de las noches, no al
    revés (§3 de `docs/DATOS_CLIENTE.md`). Lo único que se valida es el rango en
    sí —que la salida sea posterior a la llegada—. Ninguna combinación de fechas
    está prohibida, incluidas las estadías mixtas jueves→sábado.
  */
  const validacion = useMemo(() => {
    if (!entrada || !salida) return null;
    return validarRango(entrada, salida);
  }, [entrada, salida]);

  const fechasInvalidas = Boolean(validacion && !validacion.valido);

  const noches = useMemo(() => {
    if (!entrada || !salida || fechasInvalidas) return [];
    return nochesDe(entrada, salida);
  }, [entrada, salida, fechasInvalidas]);

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
          {/* Solo la cuenta, no el desglose por tipo de noche: este módulo vive
              DENTRO del hero y tiene que caber en el primer visor de un
              teléfono. El desglose entero lo enseña `/reservar`, que es adonde
              lleva el botón.

              Sin fechas no se escribe nada. Aquí decía «Sin intermediarios ni
              comisiones» y Cesar pidió retirarlo del sitio entero. */}
          {aviso
            ? aviso
            : noches.length > 0
              ? `${noches.length} ${noches.length === 1 ? "noche" : "noches"}`
              : ""}
        </p>
      </div>

      {/*
        Dos columnas YA en móvil, no a partir de `sm`. El módulo vive dentro
        del hero: con los cuatro campos apilados ocupaba 380 px y empujaba el
        enlace secundario fuera de la primera pantalla de un teléfono. Llegada y
        salida comparten fila —son la misma decisión— y la cabaña y el botón
        ocupan las dos columnas.
      */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_1.4fr_auto] lg:items-end lg:gap-4">
        {/*
          EL DESPLEGABLE ES NUESTRO, LISTA INCLUIDA.

          Antes era un `<select>` con la piel del sitio, pero la LISTA
          desplegada la seguía dibujando el sistema operativo: esquinas rectas,
          su tipografía y su azul de selección, justo al lado de un calendario
          con radios de 12 px. Cesar volvió a señalarlo —«se ve anticuado»— y
          la única forma de arreglarlo es dibujar también la lista.

          `SelectorCabana` es un combobox de solo selección con el patrón de
          las APG (teclado completo, `aria-activedescendant`, roles
          combobox/listbox/option) y, mientras React no ha hidratado, pinta el
          `<select>` de siempre para que el formulario siga funcionando sin
          JavaScript. Ver la cabecera de ese archivo.

          No es un `<label>` envolvente: un `<label>` no nombra a un `<button>`.
          El texto visible lleva `id` y el control lo referencia con
          `aria-labelledby`.
        */}
        <div className="flex flex-col gap-1.5">
          <span id={idEtiquetaCabana} className={CLASE_ETIQUETA}>
            Cabaña
          </span>
          <SelectorCabana
            cabanas={cabanas}
            valor={cabana}
            alCambiar={cambiarCabana}
            etiquetaId={idEtiquetaCabana}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={CLASE_ETIQUETA}>Llegada y salida</span>
          <CalendarioFechas
            entrada={entrada}
            salida={salida}
            alCambiar={(nuevaEntrada, nuevaSalida) => {
              setEntrada(nuevaEntrada);
              setSalida(nuevaSalida);
              setAviso(null);
              setPorValidar(false);
            }}
            hoy={hoy}
            /* En línea no se reserva para hoy: la llegada más temprana es
               mañana (`DIAS_MINIMOS_ANTELACION`). El servidor lo vuelve a
               comprobar al crear la reserva; esto solo apaga los días. */
            minima={primera}
            nochesOcupadas={nochesOcupadas}
            tiposDeNocheOfrecidos={opcion?.tipos ?? null}
            nombreCabana={opcion?.nombre ?? null}
            motivoOcupada={opcion ? undefined : MOTIVO_TODAS_OCUPADAS}
            cargandoOcupacion={ocupacion.estado === "cargando"}
            nota={notaCalendario}
            alCambiarMes={(visible) => {
              setInteresado(true);
              setMes(visible);
            }}
            compacto
          />
        </div>

        <button
          type="submit"
          className={clasesBoton(
            "primario",
            "normal",
            "w-full lg:w-auto lg:px-8 py-3.5 whitespace-nowrap",
          )}
        >
          {ctaTexto}
          <IconoFlecha className="size-4" />
        </button>
      </div>

      {/* El mensaje de error lo pinta el propio calendario, justo debajo del
          campo: repetirlo aquí abajo lo alejaría de donde se comete el fallo. */}
    </form>
  );
}
