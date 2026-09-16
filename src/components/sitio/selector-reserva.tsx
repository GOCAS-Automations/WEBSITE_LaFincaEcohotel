"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { clasesBoton } from "@/components/ui/boton";
import {
  cotizar,
  categoriaDePlan,
  elegibilidadDeCabana,
  planCubre,
  planesDeFinDeSemana,
  type CabanaCotizable,
  type PlanCotizable,
} from "@/lib/reserva/cotizacion";
import {
  CUPO_DIA_DE_CALMA,
  HORARIO_DIA_POR_DEFECTO,
  cotizarDiaDeCalma,
  opcionesDePersonas,
  textoCupo,
} from "@/lib/reserva/dia-de-calma";
import {
  esFechaISO,
  etiquetaTipoNoche,
  nochesDe,
  resumenEnPalabras,
  tieneFinDeSemana,
  validarRango,
  type TipoNoche,
} from "@/lib/reserva/noches";
import {
  ANTICIPO_MAXIMO,
  ANTICIPO_MINIMO,
  ANTICIPO_POR_DEFECTO,
  PASO_ANTICIPO,
  explicacionAnticipo,
  normalizarPorcentajeAnticipo,
  resumenDePago,
  type ExtraElegido,
  type GrupoDeExtras,
  type PorcentajeAnticipo,
  type ResumenDePago,
} from "@/lib/reserva/total";
import {
  formatearCOP,
  formatearFecha,
  formatearFechaCorta,
} from "@/lib/utils/formato";
import { enlaceWhatsapp, mensajeDiaDeCalma, mensajeReserva } from "@/lib/whatsapp";

import { CalendarioFechas } from "./calendario-fechas";
import { IconoCheck, IconoWhatsapp } from "./iconos";

/**
 * Selector de reserva — el motor de precios, con cara.
 *
 * ---------------------------------------------------------------------------
 * EL FLUJO, Y POR QUÉ ESTE Y NO OTRO
 * ---------------------------------------------------------------------------
 * En La Finca **el plan es una consecuencia de la noche**, no una elección
 * libre (§3 de `docs/DATOS_CLIENTE.md`). Así que el orden de las preguntas es:
 *
 *   1. **Fechas.** Nunca se bloquean. Cualquier rango es vendible. Y elegir
 *      **un solo día, sin salida**, es una respuesta válida: es el Día de
 *      Calma, que se explica solo y muestra el cupo que queda.
 *   2. **Cabaña**, entre las que tienen tarifa para TODAS las noches de esa
 *      estadía. La 02 solo se vende con Estándar, así que desaparece —con su
 *      explicación escrita— cuando hay noches entre semana.
 *   3. **Plan de fin de semana** (Estándar o Premium), y solo si la estadía
 *      toca viernes, sábado, domingo o festivo. Cambiar entre ellos NO toca
 *      las fechas.
 *   4. **Experiencias, noche por noche.** La torta de aniversario se sirve un
 *      día concreto: el paso pregunta cuál.
 *   5. **Cuánto se paga ahora**: un deslizante de 50 a 100 %. El 50 % es el
 *      mínimo que confirma la reserva; lo que sobre se paga por link antes de
 *      llegar.
 *
 * Y a la derecha, el desglose noche por noche con el total y el botón de
 * WhatsApp con ese mismo desglose ya escrito.
 *
 * ---------------------------------------------------------------------------
 * EL DÍA DE CALMA RECORRE EL MISMO CIERRE
 * ---------------------------------------------------------------------------
 * El modo de día tiene sus propios pasos —el plan, cuántas personas y los
 * adicionales «para el día»— pero termina exactamente igual: total, deslizante
 * de 50 a 100 % y el mismo botón final. `pagoActual` es el resumen del modo en
 * curso, y el botón lo lee a él: cuando entre Wompi, el cobro se escribe una
 * vez y sirve para los dos.
 *
 * La versión anterior preguntaba el plan PRIMERO y luego apagaba días del
 * calendario. De ahí salía el fallo que reportó Cesar: con ciertas fechas
 * puestas el plan quedaba congelado, porque cada uno bloqueaba al otro.
 *
 * ---------------------------------------------------------------------------
 * EL PLAN QUE LLEGA DE LA PORTADA ES UNA PREFERENCIA, NUNCA UN BLOQUEO
 * ---------------------------------------------------------------------------
 * `?plan=Premium` preselecciona ese plan de fin de semana. `?plan=Entre Semana`
 * resalta en el calendario las noches de lunes a jueves —y se puede quitar—,
 * pero si el visitante elige un fin de semana el sistema cambia el plan solo y
 * lo dice en una frase. `?plan=Día de Calma` abre directamente el modo de día.
 * Nunca se le niega una fecha.
 *
 * ---------------------------------------------------------------------------
 * EL PRECIO QUE SE VE ES UNA ESTIMACIÓN
 * ---------------------------------------------------------------------------
 * Sale de las tarifas publicadas y se calcula en el NAVEGADOR: sirve para
 * mirar, nunca para cobrar. Cuando exista el motor con pagos, las mismas
 * funciones (`src/lib/reserva/*.ts`, puras y probadas) se ejecutarán en el
 * servidor y ese será el número que mande.
 *
 * Accesibilidad: cada paso con opciones es un `<fieldset>` con su `<legend>`;
 * las tarjetas son `<label>` con un `<input type="radio">` real escondido, así
 * que funcionan con teclado y se anuncian como opciones. Los bloques que llevan
 * fondo propio —las tarjetas de noche del paso 4— agrupan con `role="group"` +
 * `aria-labelledby` en vez de `legend`: ver el comentario de ese paso.
 */

export type CabanaSeleccionable = CabanaCotizable;

/** Un plan del catálogo, con lo que hace falta para explicarlo. */
export type PlanSeleccionable = PlanCotizable & {
  descripcion: string | null;
  incluye: string[];
  /** Precio de referencia cuando todavía no hay cabaña elegida. */
  precio_base: number | null;
  /** Cierto si ese precio es el más bajo de varios: se antepone «desde». */
  precio_varia?: boolean;
  horario: string | null;
};

/** Una experiencia o adicional del catálogo, para el paso 4. */
export type ExtraSeleccionable = {
  id: string;
  tipo: "experiencia" | "adicional";
  nombre: string;
  descripcion: string | null;
  /** Precio unitario, entero COP. */
  precio: number;
};

type Props = {
  cabanas: CabanaSeleccionable[];
  /** Los planes del catálogo, en orden. */
  planes: PlanSeleccionable[];
  /** Experiencias y adicionales activos. */
  extras: ExtraSeleccionable[];
  whatsapp: string;
  /** Fecha mínima seleccionable (`AAAA-MM-DD`), calculada en el servidor. */
  hoy: string;
};

/** Clave de una elección de extra: el mismo extra puede ir en varias noches. */
function claveExtra(noche: string | null, id: string): string {
  return `${noche ?? "estadia"}::${id}`;
}

/*
  OJO CON EL `<legend>` Y EL `gap` DEL FIELDSET.
  Cada paso es un `<fieldset className="flex flex-col gap-4">` con su
  `<legend>`. El navegador saca el `legend` del flujo del contenedor —es parte
  del borde del fieldset, no un hijo normal— así que el `gap` NO lo separa de la
  primera tarjeta. Cada `legend` lleva por eso su propio `mb-4`.
*/
export function SelectorReserva({
  cabanas,
  planes,
  extras,
  whatsapp,
  hoy,
}: Props) {
  const parametros = useSearchParams();

  /* --- Lo que llega por la dirección ------------------------------------ */

  const cabanaInicial =
    cabanas.find((cabana) => cabana.slug === parametros.get("cabana"))?.slug ??
    null;

  /* El plan de la URL se busca sin distinguir mayúsculas: viene de un enlace
     escrito a mano en la portada, no de un identificador. */
  const planUrl = parametros.get("plan")?.toLowerCase() ?? null;
  const planInicial =
    planes.find((plan) => plan.nombre.toLowerCase() === planUrl) ?? null;

  const entradaUrl = parametros.get("entrada");
  const salidaUrl = parametros.get("salida");
  /* Una llegada anterior a hoy no se acepta: viene de un enlace viejo
     compartido por WhatsApp y el visitante no puede hacer nada con ella. */
  const entradaInicial =
    esFechaISO(entradaUrl) && entradaUrl >= hoy ? entradaUrl : "";
  const salidaInicial =
    esFechaISO(salidaUrl) && entradaInicial && salidaUrl > entradaInicial
      ? salidaUrl
      : "";

  /* --- Estado ------------------------------------------------------------ */

  const [entrada, setEntrada] = useState(entradaInicial);
  const [salida, setSalida] = useState(salidaInicial);
  const [slug, setSlug] = useState<string | null>(cabanaInicial);
  /*
    HUÉSPEDES: UNO O DOS, Y SIEMPRE ADULTOS.
    Las cinco cabañas son para dos, y La Finca no recibe menores de edad (§5 de
    `docs/DATOS_CLIENTE.md`). Además el plan Entre Semana tiene un precio
    distinto para una sola persona, así que el dato hace falta para cotizar.
  */
  const [adultos, setAdultos] = useState(2);

  /* El plan de día del catálogo: hoy, el Día de Calma. */
  const planDia = useMemo(
    () => planes.find((plan) => categoriaDePlan(plan) === "dia") ?? null,
    [planes],
  );

  /* Los planes de fin de semana del catálogo. Hoy: Estándar y Premium. */
  const planesFinDeSemana = useMemo(
    () => planesDeFinDeSemana(planes),
    [planes],
  );

  /*
    LA PREFERENCIA QUE TRAE DE LA PORTADA.
    Si pulsó Estándar o Premium, ese es el plan de fin de semana preseleccionado.
    Si pulsó Entre Semana, se guarda como preferencia de CALENDARIO (resalta los
    lunes a jueves) y el plan de fin de semana arranca en el primero. Si pulsó
    Día de Calma, el módulo abre directamente en modo de día.
  */
  const categoriaInicial = planInicial ? categoriaDePlan(planInicial) : null;

  const [planFinDeSemana, setPlanFinDeSemana] = useState<string | null>(
    categoriaInicial === "fin_de_semana"
      ? planInicial!.nombre
      : (planesFinDeSemana[0]?.nombre ?? null),
  );

  const [preferencia, setPreferencia] = useState<TipoNoche | null>(
    categoriaInicial === "entre_semana" || categoriaInicial === "fin_de_semana"
      ? categoriaInicial
      : null,
  );

  /** Modo «Día de Calma»: una sola fecha, sin salida y sin cabaña. */
  const [soloUnDia, setSoloUnDia] = useState(categoriaInicial === "dia");
  const [personasDia, setPersonasDia] = useState(2);

  /** Las experiencias elegidas, por noche: `cantidad` por clave. */
  const [seleccionExtras, setSeleccionExtras] = useState<
    Record<string, number>
  >({});

  const [porcentaje, setPorcentaje] = useState<PorcentajeAnticipo>(
    ANTICIPO_POR_DEFECTO,
  );

  /* --- Las noches -------------------------------------------------------- */

  const rango = useMemo(() => validarRango(entrada, salida), [entrada, salida]);
  const noches = useMemo(
    () => (entrada && salida && !soloUnDia ? nochesDe(entrada, salida) : []),
    [entrada, salida, soloUnDia],
  );
  const fechasDeNoche = useMemo(
    () => noches.map((noche) => noche.fecha),
    [noches],
  );
  const hayFinDeSemana = tieneFinDeSemana(noches);
  const hayEntreSemana = noches.some((noche) => noche.tipo === "entre_semana");

  /* --- El cupo del Día de Calma ----------------------------------------- */

  /*
    EL CUPO SE PREGUNTA AL SERVIDOR.
    `reservas` no tiene lectura pública —son datos personales— así que el
    número sale de `/api/dia-de-calma/cupo`, que devuelve SOLO el agregado.
    Si la consulta falla, el módulo no miente ni se bloquea: deja de prometer
    cupos y el visitante puede escribir igual por WhatsApp.
  */
  const [cupo, setCupo] = useState<{
    estado: "sin_fecha" | "cargando" | "ok" | "error";
    restante: number | null;
    usado: number | null;
  }>({ estado: "sin_fecha", restante: null, usado: null });

  useEffect(() => {
    if (!soloUnDia || !entrada) {
      setCupo({ estado: "sin_fecha", restante: null, usado: null });
      return;
    }

    const control = new AbortController();
    setCupo({ estado: "cargando", restante: null, usado: null });

    fetch(`/api/dia-de-calma/cupo?fecha=${encodeURIComponent(entrada)}`, {
      signal: control.signal,
      cache: "no-store",
    })
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error("respuesta no válida");
        return respuesta.json();
      })
      .then((datos: { usado?: number; restante?: number }) => {
        setCupo({
          estado: "ok",
          usado: Number(datos.usado ?? 0),
          restante: Number(datos.restante ?? 0),
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCupo({ estado: "error", restante: null, usado: null });
      });

    return () => control.abort();
  }, [soloUnDia, entrada]);

  /* Si quedan menos cupos de los que pidió, se le baja el número solo: es más
     amable que dejarle un error puesto que no sabe cómo quitar. */
  useEffect(() => {
    if (cupo.estado !== "ok" || cupo.restante === null) return;
    if (cupo.restante > 0 && personasDia > cupo.restante) {
      setPersonasDia(cupo.restante);
    }
  }, [cupo, personasDia]);

  /* --- La disponibilidad de la cabaña (hospedaje) ------------------------ */

  /*
    MISMO PATRÓN QUE EL CUPO DEL DÍA DE CALMA, PERO PARA EL HOSPEDAJE.
    `/api/disponibilidad` también es agregada y de solo lectura: dice qué
    noches están ocupadas por cabaña, sin nombres de huéspedes. Si ya eligió
    cabaña, se le dice si esas noches están libres EN ELLA; si todavía no
    eligió, se cuenta cuántas cabañas del listado siguen libres. Es un AVISO,
    no una restricción: nunca deshabilita el botón de WhatsApp ni el paso
    siguiente, ni le cambia la cabaña que escogió — igual que el calendario de
    fechas (`calendario-fechas.tsx`), la última palabra la tiene el hotel al
    confirmar por WhatsApp.
  */
  const [disponibilidad, setDisponibilidad] = useState<{
    estado: "sin_fechas" | "cargando" | "ok" | "error";
    cabanas: { slug: string; ocupado: string[] }[];
  }>({ estado: "sin_fechas", cabanas: [] });

  useEffect(() => {
    if (soloUnDia || !rango.valido) {
      setDisponibilidad({ estado: "sin_fechas", cabanas: [] });
      return;
    }

    const control = new AbortController();
    setDisponibilidad({ estado: "cargando", cabanas: [] });

    fetch(
      `/api/disponibilidad?desde=${encodeURIComponent(entrada)}&hasta=${encodeURIComponent(salida)}`,
      { signal: control.signal, cache: "no-store" },
    )
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error("respuesta no válida");
        return respuesta.json();
      })
      .then((datos: { cabanas?: { slug: string; ocupado: string[] }[] }) => {
        setDisponibilidad({ estado: "ok", cabanas: datos.cabanas ?? [] });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDisponibilidad({ estado: "error", cabanas: [] });
      });

    return () => control.abort();
  }, [soloUnDia, rango.valido, entrada, salida]);

  /*
    EL AVISO DE CAMBIO DE PLAN, EN UNA FRASE.
    Quien llegó pidiendo «Entre Semana» y eligió un viernes no recibe un error:
    se le dice que esas noches van con el plan de fin de semana y se sigue. Es
    exactamente lo que pidió Cesar: el sistema cambia el plan y lo cuenta.
  */
  const avisoDeCambio =
    preferencia === "entre_semana" && hayFinDeSemana
      ? `Las fechas que elegiste incluyen ${etiquetaTipoNoche("fin_de_semana", true)}, y esas no las cubre el plan Entre Semana: se cobran con ${planFinDeSemana ?? "el plan de fin de semana"}. Las noches de lunes a jueves siguen con su tarifa de Entre Semana.`
      : preferencia === "fin_de_semana" && hayEntreSemana
        ? `Tus fechas incluyen ${etiquetaTipoNoche("entre_semana", true)}: esas se cobran con el plan Entre Semana, más barato. Abajo lo ves noche por noche.`
        : null;

  /* --- Cabañas: cuáles se pueden ofrecer para estas noches --------------- */

  const cabanasConEstado = useMemo(
    () =>
      cabanas.map((cabana) => ({
        cabana,
        estado:
          noches.length > 0
            ? elegibilidadDeCabana(cabana, noches)
            : ({ elegible: true } as const),
      })),
    [cabanas, noches],
  );

  const elegibles = cabanasConEstado.filter((fila) => fila.estado.elegible);
  const descartadas = cabanasConEstado.filter((fila) => !fila.estado.elegible);

  /*
    Si la cabaña elegida deja de ser elegible al cambiar las fechas, se suelta.
    Dejarla marcada produciría un resumen que promete algo que el hotel no
    vende. Va en un efecto y no en el render porque cambia estado.
  */
  useEffect(() => {
    if (!slug) return;
    const fila = cabanasConEstado.find((f) => f.cabana.slug === slug);
    if (fila && !fila.estado.elegible) setSlug(null);
  }, [slug, cabanasConEstado]);

  const cabana = elegibles.find((fila) => fila.cabana.slug === slug)?.cabana ?? null;

  /*
    El texto final del aviso de disponibilidad, en una frase. El endpoint solo
    devuelve cabañas activas, así que el total de «N de M libres» se cruza por
    `slug` con las que llegan por props (`cabanas`): si una cabaña de la URL
    ya no está activa, no cuenta ni como libre ni como ocupada, no se inventa
    un dato.
  */
  const avisoDisponibilidad = useMemo(() => {
    if (soloUnDia || !rango.valido) return null;

    if (disponibilidad.estado === "cargando") {
      return "Comprobando disponibilidad…";
    }
    if (disponibilidad.estado === "error") {
      return "No pudimos comprobar la disponibilidad ahora mismo; te la confirmamos por WhatsApp.";
    }
    if (disponibilidad.estado !== "ok") return null;

    if (cabana) {
      const fila = disponibilidad.cabanas.find((item) => item.slug === cabana.slug);
      if (!fila) return null;
      const ocupada = fechasDeNoche.some((fecha) => fila.ocupado.includes(fecha));
      return ocupada
        ? `Esas noches ya están ocupadas en ${cabana.nombre}. Escríbenos y te proponemos otras fechas o cabaña.`
        : `Esas noches están libres en ${cabana.nombre}.`;
    }

    const disponibles = cabanas.filter((fila) =>
      disponibilidad.cabanas.some((item) => item.slug === fila.slug),
    );
    if (disponibles.length === 0) return null;
    const libres = disponibles.filter((fila) => {
      const item = disponibilidad.cabanas.find((d) => d.slug === fila.slug);
      return item ? !fechasDeNoche.some((fecha) => item.ocupado.includes(fecha)) : false;
    }).length;
    return `${libres} de ${disponibles.length} cabañas libres en esas fechas.`;
  }, [soloUnDia, rango.valido, disponibilidad, cabana, cabanas, fechasDeNoche]);

  /* --- La cotización de la estadía -------------------------------------- */

  const cotizacion = useMemo(() => {
    if (soloUnDia || !cabana || noches.length === 0) return null;
    return cotizar({ noches, cabana, planFinDeSemana, adultos });
  }, [soloUnDia, cabana, noches, planFinDeSemana, adultos]);

  const desglose = cotizacion?.posible ? cotizacion : null;

  /* --- Las experiencias elegidas ---------------------------------------- */

  /*
    Solo cuentan las de una noche que siga estando en la estadía (y las de
    «toda la estadía»). Si alguien cambia las fechas, lo que había elegido para
    una noche que ya no existe deja de sumar, pero no se borra: si vuelve a
    esas fechas, sigue ahí.
  */
  const extrasElegidos: ExtraElegido[] = useMemo(() => {
    const elegidos: ExtraElegido[] = [];
    const nochesValidas = new Set(fechasDeNoche);

    for (const [clave, cantidad] of Object.entries(seleccionExtras)) {
      if (!cantidad || cantidad < 1) continue;
      const separador = clave.indexOf("::");
      if (separador < 0) continue;
      const etiqueta = clave.slice(0, separador);
      const id = clave.slice(separador + 2);
      const noche = etiqueta === "estadia" ? null : etiqueta;
      if (noche !== null && !nochesValidas.has(noche)) continue;

      const extra = extras.find((item) => item.id === id);
      if (!extra) continue;

      elegidos.push({
        extraId: extra.id,
        nombre: extra.nombre,
        noche,
        cantidad,
        precioUnitario: extra.precio,
      });
    }
    return elegidos;
  }, [seleccionExtras, extras, fechasDeNoche]);

  function cambiarExtra(noche: string | null, id: string, cantidad: number) {
    const clave = claveExtra(noche, id);
    setSeleccionExtras((actual) => {
      const siguiente = { ...actual };
      if (cantidad <= 0) delete siguiente[clave];
      else siguiente[clave] = Math.min(9, cantidad);
      return siguiente;
    });
  }

  /**
   * Cambia al modo de día CONSERVANDO la fecha de llegada como el día elegido.
   *
   * Es el mismo gesto que ofrece el calendario («Vengo solo ese día»), y por
   * eso hace lo mismo: solo se suelta la salida —no hay noche que dormir— y la
   * preferencia de plan, que ya no significa nada. Lo llaman la nota del paso
   * del plan y, cuando ese paso no existe, la nota suelta de más abajo.
   */
  function irAlDiaDeCalma() {
    setSoloUnDia(true);
    setSalida("");
    setPreferencia(null);
  }

  /* --- El total y el anticipo ------------------------------------------- */

  const pago = useMemo(
    () =>
      desglose
        ? resumenDePago({
            subtotalAlojamiento: desglose.total,
            extras: extrasElegidos,
            noches: fechasDeNoche,
            porcentaje,
          })
        : null,
    [desglose, extrasElegidos, fechasDeNoche, porcentaje],
  );

  /* --- El Día de Calma --------------------------------------------------- */

  const cotizacionDia = useMemo(() => {
    if (!soloUnDia || !entrada) return null;
    return cotizarDiaDeCalma({
      fecha: entrada,
      personas: personasDia,
      precioBase: planDia?.precio_base ?? null,
      restante: cupo.estado === "ok" ? cupo.restante : null,
    });
  }, [soloUnDia, entrada, personasDia, planDia, cupo]);

  /*
    EL DÍA DE CALMA TERMINA IGUAL QUE EL HOSPEDAJE.
    Mismo `resumenDePago`, mismo deslizante de 50 a 100 % y mismo botón final.
    Antes el modo de día se despedía con un «el anticipo te lo confirmamos por
    WhatsApp»: dos cierres distintos para el mismo hotel, y el día que entre
    Wompi habría que cablear dos cobros. El único hueco que queda es de datos,
    no de código: el hotel no ha confirmado si el Día de Calma pide el mismo
    50 % mínimo (ver el `TODO` de `src/lib/reserva/dia-de-calma.ts`), así que
    mientras tanto se aplica la regla del hospedaje y se dice en pantalla.

    Sin noches no hay experiencias por noche, pero los adicionales sí caben:
    viajan con `noche = null`, que es exactamente como los guarda
    `reserva_extras` «para toda la estadía» desde la migración 009.
  */
  const pagoDia = useMemo(
    () =>
      soloUnDia && typeof cotizacionDia?.precio === "number"
        ? resumenDePago({
            subtotalAlojamiento: cotizacionDia.precio,
            extras: extrasElegidos,
            noches: [],
            porcentaje,
          })
        : null,
    [soloUnDia, cotizacionDia, extrasElegidos, porcentaje],
  );

  /** El pago del modo en curso: uno u otro, nunca los dos. */
  const pagoActual = soloUnDia ? pagoDia : pago;

  /* --- El mensaje de WhatsApp, con el desglose ya escrito ---------------- */

  const enlace = soloUnDia
    ? enlaceWhatsapp(
        mensajeDiaDeCalma({
          fecha: entrada || hoy,
          personas: personasDia,
          horario: planDia?.horario ?? HORARIO_DIA_POR_DEFECTO,
          extras: extrasElegidos.map((extra) => ({
            nombre: extra.nombre,
            cantidad: extra.cantidad,
            importe: extra.cantidad * extra.precioUnitario,
          })),
          total: pagoDia?.total ?? cotizacionDia?.precio ?? null,
          anticipo: pagoDia
            ? {
                porcentaje: pagoDia.porcentaje,
                monto: pagoDia.anticipo,
                saldo: pagoDia.saldo,
              }
            : null,
        }),
        whatsapp,
      )
    : enlaceWhatsapp(
        mensajeReserva({
          cabana: cabana?.nombre ?? null,
          plan: desglose ? desglose.planes.join(" + ") : null,
          entrada: entrada || null,
          salida: rango.valido ? salida : null,
          adultos,
          desglose: desglose
            ? desglose.lineas.map((linea) => ({
                fecha: formatearFecha(linea.fecha),
                plan: linea.plan,
                precio: linea.precio,
                festivo: linea.festivo,
              }))
            : null,
          extras: extrasElegidos.map((extra) => ({
            nombre: extra.nombre,
            cantidad: extra.cantidad,
            importe: extra.cantidad * extra.precioUnitario,
            noche: extra.noche ? formatearFechaCorta(extra.noche) : null,
          })),
          total: pago?.total ?? desglose?.total ?? null,
          anticipo: pago
            ? {
                porcentaje: pago.porcentaje,
                monto: pago.anticipo,
                saldo: pago.saldo,
              }
            : null,
        }),
        whatsapp,
      );

  /* --- La numeración de los pasos --------------------------------------- */

  /* Los pasos no son fijos: el del plan solo aparece si hay noches de fin de
     semana, y el de experiencias solo si ya hay noches. Numerarlos a mano
     dejaría un «3.» seguido de un «5.».

     El contador se incrementa en el MISMO orden en que se pintan los bloques
     más abajo: fechas → Día de Calma → cabaña → plan → experiencias →
     adicionales del día → pago. Los dos modos son excluyentes, así que en cada
     uno la cuenta sale seguida. */
  const adicionales = extras.filter((extra) => extra.tipo === "adicional");

  let contadorPaso = 1;
  const numeroFechas = contadorPaso++;
  const numeroDia = soloUnDia ? contadorPaso++ : null;
  const numeroCabana = soloUnDia ? null : contadorPaso++;
  const numeroPlan =
    !soloUnDia && hayFinDeSemana && planesFinDeSemana.length > 0
      ? contadorPaso++
      : null;
  const numeroExtras =
    !soloUnDia && noches.length > 0 && extras.length > 0 ? contadorPaso++ : null;
  const numeroExtrasDia =
    soloUnDia &&
    typeof cotizacionDia?.precio === "number" &&
    adicionales.length > 0
      ? contadorPaso++
      : null;
  const numeroPago =
    pagoActual && pagoActual.total > 0 ? contadorPaso++ : null;

  /* ===================================================================== */

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-10">
      <div
        className="flex min-w-0 flex-col gap-8"
        /* Igual que en `ModuloReserva`: mientras estos campos estén en el
           viewport, el FAB de WhatsApp se aparta. Quien llega desde el módulo
           de la portada cae aquí mismo por el ancla `#solicitud`, y sin esto el
           FAB tapaba justo el bloque de fechas. */
        data-fab-evitar=""
      >
        {/* ---------------------------------------------------------------
            PASO 1 — FECHAS. Van primero porque son las que deciden el plan.
        ---------------------------------------------------------------- */}
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-4 font-titulo text-lg font-bold text-petroleo-900">
            {numeroFechas}. ¿Qué fechas tienes en mente?
          </legend>

          <div className="max-w-sm">
            <CalendarioFechas
              entrada={entrada}
              salida={salida}
              alCambiar={(nuevaEntrada, nuevaSalida) => {
                setEntrada(nuevaEntrada);
                setSalida(nuevaSalida);
                /* Elegir una salida —o borrarlo todo— sale del modo de día:
                   quien marca dos fechas quiere dormir. */
                if (nuevaSalida || !nuevaEntrada) setSoloUnDia(false);
              }}
              hoy={hoy}
              preferencia={preferencia}
              nombrePreferencia={
                preferencia === "entre_semana"
                  ? (planes.find(
                      (plan) => categoriaDePlan(plan) === "entre_semana",
                    )?.nombre ?? null)
                  : planFinDeSemana
              }
              alQuitarPreferencia={() => setPreferencia(null)}
              diaUnico={soloUnDia}
              alElegirDiaUnico={
                planDia
                  ? () => {
                      setSoloUnDia(true);
                      setSalida("");
                      setPreferencia(null);
                    }
                  : undefined
              }
              alQuitarDiaUnico={() => setSoloUnDia(false)}
            />
          </div>

          {soloUnDia ? (
            <p className="text-sm leading-relaxed text-crema-700">
              Vienes <strong className="font-semibold text-petroleo-900">
                solo ese día
              </strong>
              , sin hospedaje. Si prefieres quedarte a dormir, elige también una
              fecha de salida.
            </p>
          ) : noches.length > 0 ? (
            <p className="text-sm leading-relaxed text-crema-700">
              Son <strong className="font-semibold text-petroleo-900">
                {resumenEnPalabras(noches)}
              </strong>
              . Cada noche se cobra con la tarifa que le corresponde a su fecha.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-crema-700">
              Elige llegada y salida. No hay fechas prohibidas: si tu estadía
              mezcla días de semana y fin de semana, te lo desglosamos noche por
              noche.{" "}
              {planDia
                ? "¿Vienes solo por el día? Elige la fecha y marca «Vengo solo ese día»."
                : null}
            </p>
          )}

          {avisoDeCambio && !soloUnDia ? (
            <p className="rounded-[var(--radius-tarjeta)] bg-brote-100 px-4 py-3 text-sm leading-relaxed text-oliva-800">
              {avisoDeCambio}
            </p>
          ) : null}

          {!soloUnDia ? (
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 font-titulo text-sm font-semibold text-petroleo-900">
                ¿Cuántos son?
              </legend>
              <div className="flex flex-wrap items-center gap-3">
                {[1, 2].map((cantidad) => (
                  <label
                    key={cantidad}
                    className={[
                      "flex min-h-11 cursor-pointer items-center rounded-full border px-5 font-titulo text-sm font-semibold transition-all duration-200",
                      adultos === cantidad
                        ? "border-petroleo-600 bg-petroleo-50 text-petroleo-900"
                        : "border-crema-300/80 bg-white text-crema-700 hover:border-petroleo-300",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="adultos"
                      value={cantidad}
                      checked={adultos === cantidad}
                      onChange={() => setAdultos(cantidad)}
                      className="sr-only"
                    />
                    {cantidad === 1 ? "1 adulto" : "2 adultos"}
                  </label>
                ))}
                <p className="text-sm text-crema-600">
                  Las cabañas son para dos. La Finca no recibe menores de edad.
                </p>
              </div>
            </fieldset>
          ) : null}
        </fieldset>

        {/* ---------------------------------------------------------------
            MODO DÍA DE CALMA — una sola fecha, sin cabaña y con cupo.
        ---------------------------------------------------------------- */}
        {soloUnDia && planDia ? (
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-4 font-titulo text-lg font-bold text-petroleo-900">
              {numeroDia}. Tu {planDia.nombre}
            </legend>

            <div className="flex flex-col gap-4 rounded-[var(--radius-generoso)] bg-white p-5 shadow-[var(--shadow-tenue)] ring-1 ring-crema-200/70">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="font-titulo text-base font-bold text-petroleo-900">
                  {planDia.horario ?? HORARIO_DIA_POR_DEFECTO}
                </p>
                <p className="font-titulo text-lg font-extrabold text-petroleo-700">
                  {typeof planDia.precio_base === "number"
                    ? formatearCOP(planDia.precio_base)
                    : "Consultar"}
                  <span className="ml-1 text-xs font-medium text-crema-600">
                    para dos personas
                  </span>
                </p>
              </div>

              {planDia.descripcion ? (
                <p className="text-sm leading-relaxed text-crema-700">
                  {planDia.descripcion}
                </p>
              ) : null}

              {planDia.incluye.length > 0 ? (
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {planDia.incluye.map((item) => (
                    <li
                      key={item}
                      className="flex gap-1.5 text-sm leading-snug text-crema-700"
                    >
                      <IconoCheck className="mt-0.5 size-3.5 shrink-0 text-petroleo-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}

              <p className="rounded-[var(--radius-tarjeta)] bg-brote-100/70 px-4 py-3 text-sm leading-relaxed text-oliva-800">
                Es un día completo en La Finca, <strong>sin hospedaje</strong>:
                llegas a las 10:00 a. m. y te vas a las 5:00 p. m. No ocupa
                cabaña, así que no hace falta elegir una.
              </p>
            </div>

            {/* --- Cuántas personas, con el cupo que queda --- */}
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 font-titulo text-sm font-semibold text-petroleo-900">
                ¿Cuántas personas vienen?
              </legend>

              <p
                aria-live="polite"
                className="text-sm leading-relaxed text-crema-700"
              >
                {!entrada
                  ? "Elige primero la fecha y te decimos cuántos cupos quedan."
                  : cupo.estado === "cargando"
                    ? "Consultando cuántos cupos quedan ese día…"
                    : cupo.estado === "ok" && cupo.restante !== null
                      ? `${textoCupo(cupo.restante)} Cada solicitud es para una o dos personas, y la finca recibe máximo ${CUPO_DIA_DE_CALMA} personas por día.`
                      : `No pudimos comprobar el cupo ahora mismo. Cada solicitud es para una o dos personas, y la finca recibe máximo ${CUPO_DIA_DE_CALMA} personas por día: te lo confirmamos por WhatsApp.`}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {(cupo.estado === "ok" && cupo.restante !== null
                  ? opcionesDePersonas(cupo.restante)
                  : opcionesDePersonas(CUPO_DIA_DE_CALMA)
                ).map((cantidad) => (
                  <label
                    key={cantidad}
                    className={[
                      "flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border px-4 font-titulo text-sm font-semibold transition-all duration-200",
                      personasDia === cantidad
                        ? "border-petroleo-600 bg-petroleo-50 text-petroleo-900"
                        : "border-crema-300/80 bg-white text-crema-700 hover:border-petroleo-300",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="personas-dia"
                      value={cantidad}
                      checked={personasDia === cantidad}
                      onChange={() => setPersonasDia(cantidad)}
                      className="sr-only"
                    />
                    {cantidad}
                  </label>
                ))}
              </div>

              {cotizacionDia?.nota ? (
                <p className="rounded-[var(--radius-tarjeta)] bg-crema-100 px-4 py-3 text-sm leading-relaxed text-crema-800">
                  {cotizacionDia.nota}
                </p>
              ) : null}
            </fieldset>

            {/*
              EL ANTICIPO DEL DÍA DE CALMA SIGUE LA REGLA DEL HOSPEDAJE.
              `TODO` (Amapola): confirmar si el Día de Calma pide el mismo 50 %
              mínimo, su política de cancelación y si se puede añadir jacuzzi.
              Ver `src/lib/reserva/dia-de-calma.ts` y §3 de
              `docs/DATOS_CLIENTE.md`. Mientras no lo confirme se aplica la
              misma regla del hospedaje —mínimo 50 %— y se dice aquí, en vez de
              dejar el cierre a medias. Lo que sigue sin número es la política
              de cambios, que sí se remite a WhatsApp.
            */}
            <p className="text-sm leading-relaxed text-crema-600">
              El anticipo funciona igual que en el hospedaje: con el 50 % queda
              confirmado y puedes adelantar más si quieres. Las condiciones de
              cambio del Día de Calma te las confirmamos por WhatsApp al
              responder tu solicitud.
            </p>
          </fieldset>
        ) : null}

        {/* ---------------------------------------------------------------
            PASO 2 — CABAÑA, solo las que sirven para esas noches.
        ---------------------------------------------------------------- */}
        {!soloUnDia ? (
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-4 font-titulo text-lg font-bold text-petroleo-900">
              {numeroCabana}. Elige tu cabaña
            </legend>

            <ul className="grid gap-3 sm:grid-cols-2">
              {elegibles.map(({ cabana: opcion }) => {
                const activa = opcion.slug === slug;
                const precio = precioParaLista(
                  opcion,
                  noches.length > 0,
                  hayEntreSemana,
                  hayFinDeSemana,
                  planFinDeSemana,
                  adultos,
                );
                return (
                  <li key={opcion.slug}>
                    <label
                      className={[
                        "flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-tarjeta)] border px-4 py-3.5 transition-all duration-200",
                        activa
                          ? "border-petroleo-600 bg-petroleo-50 shadow-[var(--shadow-tenue)]"
                          : "border-crema-300/80 bg-white hover:border-petroleo-300",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name="cabana"
                        value={opcion.slug}
                        checked={activa}
                        onChange={() => setSlug(opcion.slug)}
                        className="sr-only"
                      />
                      <span className="font-titulo text-sm font-semibold text-petroleo-900">
                        {opcion.nombre}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {precio !== null ? (
                          <span className="text-right text-xs text-crema-600">
                            {precio.etiqueta}
                          </span>
                        ) : null}
                        {activa ? (
                          <IconoCheck className="size-4 text-petroleo-600" />
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            {/*
              LAS QUE NO SE PUEDEN, CON SU MOTIVO.
              Que una cabaña desaparezca sin explicación se lee como un error del
              sitio. La 02 solo se vende con el plan Estándar: hay que decirlo.
            */}
            {descartadas.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {descartadas.map(({ cabana: opcion, estado }) => (
                  <li
                    key={opcion.slug}
                    className="rounded-[var(--radius-tarjeta)] border border-crema-200 bg-crema-50/70 px-4 py-3 text-sm leading-snug text-crema-700"
                  >
                    <span className="font-titulo font-semibold text-crema-800">
                      {opcion.nombre}
                    </span>{" "}
                    — no disponible para estas fechas.{" "}
                    {!estado.elegible ? estado.motivo : null}
                  </li>
                ))}
              </ul>
            ) : null}

            {elegibles.length === 0 ? (
              <p className="rounded-[var(--radius-tarjeta)] bg-petroleo-50 px-4 py-3 text-sm text-petroleo-800">
                Ninguna cabaña cubre esas fechas. Prueba con otras o escríbenos
                por WhatsApp y te armamos la estadía.
              </p>
            ) : null}
          </fieldset>
        ) : null}

        {/* ---------------------------------------------------------------
            PASO 3 — PLAN DE FIN DE SEMANA. Solo si hace falta.
        ---------------------------------------------------------------- */}
        {numeroPlan !== null ? (
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-4 font-titulo text-lg font-bold text-petroleo-900">
              {numeroPlan}. ¿Estándar o Premium para tus noches de fin de semana?
            </legend>

            <p className="text-sm leading-relaxed text-crema-700">
              Tus {etiquetaTipoNoche("fin_de_semana", true)} se cobran con uno de
              estos dos planes. Cambiar de plan no toca tus fechas.
              {hayEntreSemana
                ? " Las noches de lunes a jueves van siempre con el plan Entre Semana."
                : ""}
            </p>

            <ul className="grid gap-3 sm:grid-cols-2">
              {planesFinDeSemana.map((opcion) => {
                const activo = opcion.nombre === planFinDeSemana;
                const tarifa = cabana?.tarifas.find(
                  (t) => t.plan.nombre === opcion.nombre,
                );
                const disponible = !cabana || Boolean(tarifa);
                const precio = tarifa?.precio_noche ?? opcion.precio_base;
                return (
                  <li key={opcion.nombre}>
                    <label
                      className={[
                        "flex h-full flex-col gap-1.5 rounded-[var(--radius-tarjeta)] border px-4 py-3.5 transition-all duration-200",
                        !disponible
                          ? "cursor-not-allowed border-crema-200 bg-crema-50/60 opacity-70"
                          : activo
                            ? "cursor-pointer border-petroleo-600 bg-petroleo-50 shadow-[var(--shadow-tenue)]"
                            : "cursor-pointer border-crema-300/80 bg-white hover:border-petroleo-300",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name="plan-fin-de-semana"
                        value={opcion.nombre}
                        checked={activo}
                        disabled={!disponible}
                        onChange={() => {
                          setPlanFinDeSemana(opcion.nombre);
                          /* Cambiar de plan NO toca las fechas: ni se tocan
                             `entrada` ni `salida` aquí. Es el requisito
                             central del encargo. */
                        }}
                        className="sr-only"
                      />
                      <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <span className="font-titulo text-sm font-semibold text-petroleo-900">
                          {opcion.nombre}
                        </span>
                        <span className="font-titulo text-base font-bold text-petroleo-700">
                          {precio !== null
                            ? `${formatearCOP(precio)}`
                            : "Consultar"}
                          <span className="ml-1 text-xs font-medium text-crema-600">
                            por noche
                          </span>
                        </span>
                      </span>

                      {opcion.incluye.length > 0 ? (
                        <ul className="mt-0.5 flex flex-col gap-1">
                          {opcion.incluye.slice(0, 4).map((item) => (
                            <li
                              key={item}
                              className="flex gap-1.5 text-[0.75rem] leading-snug text-crema-700"
                            >
                              <IconoCheck className="mt-px size-3 shrink-0 text-petroleo-500" />
                              {item}
                            </li>
                          ))}
                          {opcion.incluye.length > 4 ? (
                            <li className="text-[0.75rem] text-crema-600">
                              y {opcion.incluye.length - 4} cosas más
                            </li>
                          ) : null}
                        </ul>
                      ) : null}

                      {!disponible ? (
                        <span className="mt-auto pt-2 text-[0.75rem] leading-snug font-medium text-crema-700">
                          La {cabana?.nombre} no tiene este plan. Elige otra
                          cabaña para poder pedirlo.
                        </span>
                      ) : null}
                    </label>
                  </li>
                );
              })}
            </ul>

            <p className="text-sm text-crema-700">
              ¿Quieres el detalle completo de cada plan?{" "}
              <Link
                href="/#planes"
                className="font-semibold text-petroleo-700 underline-offset-4 hover:underline"
              >
                Míralos en la portada
              </Link>
              .
            </p>

            {planDia ? (
              <NotaDiaDeCalma
                plan={planDia}
                fecha={entrada}
                alElegir={irAlDiaDeCalma}
              />
            ) : null}
          </fieldset>
        ) : null}

        {/*
          LA MISMA NOTA CUANDO NO HAY PASO DE PLAN.
          El paso del plan solo existe si la estadía toca fin de semana o
          festivo: quien elija de lunes a jueves no lo ve, y se quedaría sin
          enterarse de que el plan de día existe. Aparece en el mismo sitio del
          flujo —justo después de la cabaña— para que se lea igual en los dos
          casos.
        */}
        {!soloUnDia && numeroPlan === null && planDia ? (
          <NotaDiaDeCalma
            plan={planDia}
            fecha={entrada}
            alElegir={irAlDiaDeCalma}
          />
        ) : null}

        {/* ---------------------------------------------------------------
            PASO 4 — EXPERIENCIAS, NOCHE POR NOCHE.
        ---------------------------------------------------------------- */}
        {numeroExtras !== null ? (
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-4 font-titulo text-lg font-bold text-petroleo-900">
              {numeroExtras}. ¿Añadimos algo a alguna noche?
            </legend>

            <p className="text-sm leading-relaxed text-crema-700">
              Las experiencias se preparan para una noche concreta: dinos cuál y
              la torta, el fondue o el arreglo llegan ese día. Puedes dejarlo en
              blanco: nada de esto es obligatorio.
            </p>

            <ul className="flex flex-col gap-4">
              {noches.map((noche) => (
                <li key={noche.fecha}>
                  {/*
                    NI `<fieldset>` NI `<legend>` EN LAS TARJETAS DE NOCHE.
                    Aquí había uno de cada, y de ahí salían los solapes que
                    reportó Cesar: el navegador saca el `legend` del flujo y lo
                    coloca SOBRE el borde superior del fieldset, así que con una
                    tarjeta con fondo, `p-4` y `ring` el título quedaba montado
                    encima del filo de la tarjeta —y, con dos líneas a 390 px,
                    fuera de ella—. La agrupación se hace ahora con
                    `role="group"` + `aria-labelledby`, que el lector de pantalla
                    anuncia igual y el motor de maquetación trata como un div
                    cualquiera.
                  */}
                  <div
                    role="group"
                    aria-labelledby={`noche-${noche.fecha}`}
                    className="rounded-[var(--radius-generoso)] bg-white p-4 shadow-[var(--shadow-tenue)] ring-1 ring-crema-200/70 sm:p-5"
                  >
                    <p
                      id={`noche-${noche.fecha}`}
                      className="mb-3 font-titulo text-sm font-bold text-petroleo-900"
                    >
                      Noche del {formatearFechaCorta(noche.fecha)}
                      <span className="ml-2 font-normal text-crema-600">
                        {noche.festivo ?? etiquetaTipoNoche(noche.tipo)}
                      </span>
                    </p>

                    <ul className="flex flex-col gap-2">
                      {extras
                        .filter((extra) => extra.tipo === "experiencia")
                        .map((extra) => (
                          <FilaExtra
                            key={extra.id}
                            extra={extra}
                            cantidad={
                              seleccionExtras[claveExtra(noche.fecha, extra.id)] ?? 0
                            }
                            alCambiar={(cantidad) =>
                              cambiarExtra(noche.fecha, extra.id, cantidad)
                            }
                            nombreCampo={`extra-${noche.fecha}`}
                          />
                        ))}
                    </ul>
                  </div>
                </li>
              ))}

              {/*
                LOS ADICIONALES NO SON DE UNA NOCHE.
                La segunda mascota se cobra por la estadía, no por noche: va en
                su propio bloque y viaja con `noche = null`, que es como lo
                guarda `reserva_extras` desde la migración 009.
              */}
              {extras.some((extra) => extra.tipo === "adicional") ? (
                <li>
                  <div
                    role="group"
                    aria-labelledby="extras-estadia"
                    className="rounded-[var(--radius-generoso)] bg-white p-4 shadow-[var(--shadow-tenue)] ring-1 ring-crema-200/70 sm:p-5"
                  >
                    <p
                      id="extras-estadia"
                      className="mb-3 font-titulo text-sm font-bold text-petroleo-900"
                    >
                      Para toda la estadía
                    </p>
                    <ul className="flex flex-col gap-2">
                      {extras
                        .filter((extra) => extra.tipo === "adicional")
                        .map((extra) => (
                          <FilaExtra
                            key={extra.id}
                            extra={extra}
                            cantidad={
                              seleccionExtras[claveExtra(null, extra.id)] ?? 0
                            }
                            alCambiar={(cantidad) =>
                              cambiarExtra(null, extra.id, cantidad)
                            }
                            nombreCampo="extra-estadia"
                          />
                        ))}
                    </ul>
                  </div>
                </li>
              ) : null}
            </ul>
          </fieldset>
        ) : null}

        {/* ---------------------------------------------------------------
            ADICIONALES DEL DÍA DE CALMA.
            Sin noches no hay experiencias por noche —la torta se sirve una
            noche concreta y aquí no se duerme—, pero los adicionales sí caben:
            son por estadía y viajan con `noche = null`, la misma forma que
            guarda `reserva_extras` para «toda la estadía».
        ---------------------------------------------------------------- */}
        {numeroExtrasDia !== null ? (
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-4 font-titulo text-lg font-bold text-petroleo-900">
              {numeroExtrasDia}. ¿Añadimos algo para el día?
            </legend>

            <p className="text-sm leading-relaxed text-crema-700">
              Puedes dejarlo en blanco: nada de esto es obligatorio.
            </p>

            <div className="rounded-[var(--radius-generoso)] bg-white p-4 shadow-[var(--shadow-tenue)] ring-1 ring-crema-200/70 sm:p-5">
              <ul className="flex flex-col gap-2">
                {adicionales.map((extra) => (
                  <FilaExtra
                    key={extra.id}
                    extra={extra}
                    cantidad={seleccionExtras[claveExtra(null, extra.id)] ?? 0}
                    alCambiar={(cantidad) =>
                      cambiarExtra(null, extra.id, cantidad)
                    }
                    nombreCampo="extra-dia"
                  />
                ))}
              </ul>
            </div>
          </fieldset>
        ) : null}

        {/* ---------------------------------------------------------------
            ÚLTIMO PASO — CUÁNTO SE PAGA AHORA.
            El mismo para las dos formas de reservar: el Día de Calma también
            elige con el deslizante cuánto adelanta, de 50 a 100 %.
        ---------------------------------------------------------------- */}
        {numeroPago !== null && pagoActual ? (
          <section className="flex flex-col gap-4">
            <h2 className="font-titulo text-lg font-bold text-petroleo-900">
              {numeroPago}. ¿Cuánto quieres pagar ahora?
            </h2>

            <DeslizanteAnticipo
              porcentaje={pagoActual.porcentaje}
              anticipo={pagoActual.anticipo}
              saldo={pagoActual.saldo}
              total={pagoActual.total}
              etiquetaTotal={soloUnDia ? "Total del día" : "Total de la estadía"}
              alCambiar={setPorcentaje}
            />
          </section>
        ) : null}
      </div>

      {/* ===================================================================
          RESUMEN — el desglose noche por noche y el total.
      ==================================================================== */}
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="flex flex-col gap-4 rounded-[var(--radius-generoso)] bg-white p-5 shadow-[var(--shadow-tarjeta)] ring-1 ring-crema-200/70 sm:p-6">
          <h3 className="font-titulo text-lg font-bold text-petroleo-900">
            Tu solicitud
          </h3>

          {soloUnDia ? (
            <>
              <dl className="flex flex-col gap-2.5 text-sm">
                <Fila etiqueta="Plan" valor={planDia?.nombre ?? "Día de Calma"} />
                <Fila
                  etiqueta="Fecha"
                  valor={entrada ? formatearFechaCorta(entrada) : "Sin definir"}
                />
                <Fila
                  etiqueta="Horario"
                  valor={planDia?.horario ?? HORARIO_DIA_POR_DEFECTO}
                />
                <Fila
                  etiqueta="Personas"
                  valor={
                    personasDia === 1 ? "1 persona" : `${personasDia} personas`
                  }
                />
                {cupo.estado === "ok" && cupo.restante !== null ? (
                  <Fila
                    etiqueta="Cupo del día"
                    valor={`${cupo.usado ?? 0}/${CUPO_DIA_DE_CALMA} ocupados`}
                  />
                ) : null}
              </dl>

              {/* Los adicionales del día, con la misma pinta que en el
                  hospedaje: un solo grupo, el de «toda la estadía». */}
              {pagoDia && pagoDia.grupos.length > 0 ? (
                <BloqueExtras grupos={pagoDia.grupos} etiquetaSinNoche="Para el día" />
              ) : null}

              {pagoDia ? (
                <BloqueTotales pago={pagoDia} />
              ) : (
                <p className="rounded-[var(--radius-tarjeta)] bg-crema-100 px-4 py-3 text-sm leading-relaxed text-crema-800">
                  {cotizacionDia?.nota ??
                    "Elige la fecha y te mostramos el valor del día."}
                </p>
              )}

              <p className="text-sm leading-relaxed text-crema-600">
                El Día de Calma no incluye hospedaje ni ocupa cabaña.
              </p>
            </>
          ) : (
            <>
              <dl className="flex flex-col gap-2.5 text-sm">
                <Fila etiqueta="Cabaña" valor={cabana?.nombre ?? "Sin elegir"} />
                <Fila
                  etiqueta="Huéspedes"
                  valor={adultos === 1 ? "1 adulto" : "2 adultos"}
                />
                {/* Las fechas en formato corto ("12 mar 2026"): el resumen se lee,
                    no se descifra. */}
                <Fila
                  etiqueta="Llegada"
                  valor={entrada ? formatearFechaCorta(entrada) : "Sin definir"}
                />
                <Fila
                  etiqueta="Salida"
                  valor={
                    salida && rango.valido
                      ? formatearFechaCorta(salida)
                      : "Sin definir"
                  }
                />
                <Fila
                  etiqueta="Noches"
                  valor={noches.length > 0 ? String(noches.length) : "—"}
                />
              </dl>

              {/* Aviso de disponibilidad: informa, no bloquea.
                  El párrafo se pinta SIEMPRE, aunque esté vacío: una región
                  `aria-live` que aparece a la vez que su texto no se anuncia
                  —el lector de pantalla necesita que el contenedor ya estuviera
                  ahí para notar el cambio—. Vacío no ocupa nada. */}
              <p
                aria-live="polite"
                className={
                  avisoDisponibilidad
                    ? "text-sm leading-relaxed text-crema-700"
                    : "sr-only"
                }
              >
                {avisoDisponibilidad ?? ""}
              </p>

              {/* --- El desglose --- */}
              {desglose ? (
                <div className="flex flex-col gap-2 border-t border-crema-200 pt-4">
                  <p className="font-titulo text-sm font-semibold text-crema-700">
                    Noche por noche
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {desglose.lineas.map((linea) => (
                      <li
                        key={linea.fecha}
                        className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm"
                      >
                        <span className="min-w-0 text-crema-700">
                          {formatearFechaCorta(linea.fecha)}
                          <span className="ml-1.5 text-xs text-crema-600">
                            {linea.festivo ?? linea.plan}
                          </span>
                        </span>
                        <span className="font-medium text-petroleo-900">
                          {formatearCOP(linea.precio)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {desglose.lineas.some((linea) => linea.festivo) ? (
                    <p className="text-xs leading-snug text-crema-600">
                      Los festivos se cobran como noche de fin de semana.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* --- Las experiencias, agrupadas por noche --- */}
              {pago && pago.grupos.length > 0 ? (
                <BloqueExtras grupos={pago.grupos} />
              ) : null}

              {pago ? <BloqueTotales pago={pago} /> : null}

              {cotizacion && !cotizacion.posible ? (
                <p className="rounded-[var(--radius-tarjeta)] bg-crema-100 px-4 py-3 text-sm leading-relaxed text-crema-800">
                  {cotizacion.motivo}
                </p>
              ) : null}

              {!cotizacion ? (
                <p className="text-sm leading-relaxed text-crema-600">
                  Elige fechas y cabaña y te mostramos el precio noche por noche.
                </p>
              ) : null}
            </>
          )}

          {/*
            AQUÍ VA EL COBRO DE WOMPI — UNA SOLA COSTURA PARA LOS DOS PLANES.
            Cuando existan las llaves (§12 del plan), este botón deja de ir a
            WhatsApp y pasa a crear la reserva en estado `pendiente` y abrir el
            checkout de Wompi por `pagoActual.anticipo` —el porcentaje de 50 a
            100 % que el visitante acaba de elegir con el deslizante—.

            `pagoActual` es el resumen del modo en curso: el del hospedaje o el
            del Día de Calma, calculados los dos con `resumenDePago()`. Por eso
            el cobro se escribe UNA vez y sirve para ambos; lo único que cambia
            entre ellos es qué se guarda en la reserva (`tipo = 'hospedaje'` con
            cabaña y noches, o `tipo = 'dia'` con `alojamiento_id` nulo). El
            `porcentaje_anticipo` y el `monto_anticipo` se persisten igual en
            los dos casos, como ya hace el panel.

            Todo lo que hace falta para ese paso ya está resuelto: el desglose
            por noche, los extras con su noche, el total y el anticipo. Lo único
            que cambia es el destino de este enlace.
          */}
          <a
            href={enlace}
            target="_blank"
            rel="noopener noreferrer"
            className={clasesBoton("primario", "grande", "w-full")}
          >
            <IconoWhatsapp className="size-5" />
            Solicitar por WhatsApp
          </a>

          <p className="text-xs leading-relaxed text-crema-600">
            Te llevamos a WhatsApp con el desglose ya escrito. El total es una
            estimación con la tarifa publicada: el equipo confirma
            disponibilidad y precio final antes de cobrar.
          </p>
        </div>
      </aside>
    </div>
  );
}

/* ===========================================================================
 * Piezas auxiliares
 * ======================================================================== */

/**
 * Las experiencias y adicionales del resumen, agrupados.
 *
 * Lo usan los DOS modos. En el hospedaje los grupos son las noches; en el Día
 * de Calma solo puede haber uno, el de `noche: null`, que allí se llama «Para
 * el día» porque no hay estadía que valga.
 */
function BloqueExtras({
  grupos,
  etiquetaSinNoche = "Para toda la estadía",
}: {
  grupos: GrupoDeExtras[];
  etiquetaSinNoche?: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-crema-200 pt-4">
      <p className="font-titulo text-sm font-semibold text-crema-700">
        Experiencias y adicionales
      </p>
      <ul className="flex flex-col gap-1.5">
        {grupos.map((grupo) => (
          <li key={grupo.noche ?? "estadia"}>
            <p className="text-xs font-semibold text-crema-600">
              {grupo.noche
                ? `Noche del ${formatearFechaCorta(grupo.noche)}`
                : etiquetaSinNoche}
            </p>
            <ul className="flex flex-col gap-1">
              {grupo.lineas.map((linea) => (
                <li
                  key={`${grupo.noche ?? "estadia"}-${linea.extraId}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm"
                >
                  <span className="min-w-0 text-crema-700">
                    {linea.nombre}
                    {linea.cantidad > 1 ? ` ×${linea.cantidad}` : ""}
                  </span>
                  <span className="font-medium text-petroleo-900">
                    {formatearCOP(linea.importe)}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * El total, lo que se paga ahora y lo que queda.
 *
 * Una sola pieza para el hospedaje y para el Día de Calma: son la misma cuenta
 * —`resumenDePago()`— y enseñarlas distinto solo conseguiría que una de las dos
 * se quedara atrás en el próximo cambio.
 */
function BloqueTotales({ pago }: { pago: ResumenDePago }) {
  return (
    <div className="flex flex-col gap-2 border-t border-crema-200 pt-4">
      <p className="flex items-baseline justify-between gap-3">
        <span className="font-titulo text-sm font-semibold text-crema-700">
          Total estimado
        </span>
        <span className="font-titulo text-2xl font-extrabold text-petroleo-700">
          {formatearCOP(pago.total)}
        </span>
      </p>
      <p className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-crema-700">Pagas ahora ({pago.porcentaje} %)</span>
        <span className="font-semibold text-petroleo-900">
          {formatearCOP(pago.anticipo)}
        </span>
      </p>
      {pago.saldo > 0 ? (
        <p className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-crema-700">Antes de llegar</span>
          <span className="font-semibold text-petroleo-900">
            {formatearCOP(pago.saldo)}
          </span>
        </p>
      ) : null}
      <p className="text-xs leading-relaxed text-crema-600">
        {explicacionAnticipo(pago.porcentaje)}
      </p>
    </div>
  );
}

/**
 * La nota que recuerda que existe el Día de Calma.
 *
 * Va en el paso del plan, que es donde alguien se pregunta «¿y si no me quedo
 * a dormir?». El botón conserva la fecha de llegada como día elegido: cambiar
 * de idea no puede costar volver a buscar la fecha en el calendario.
 *
 * Nunca la palabra «pasadía»: el hotel la rechaza (§3 de
 * `docs/DATOS_CLIENTE.md`).
 */
function NotaDiaDeCalma({
  plan,
  fecha,
  alElegir,
}: {
  plan: PlanSeleccionable;
  fecha: string;
  alElegir: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-tarjeta)] border border-dashed border-crema-300 bg-crema-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p className="min-w-0 text-sm leading-relaxed text-crema-700">
        ¿Vienes solo por el día? También está el{" "}
        <strong className="font-semibold text-petroleo-900">
          Plan {plan.nombre}
        </strong>{" "}
        ({plan.horario ?? HORARIO_DIA_POR_DEFECTO},{" "}
        {typeof plan.precio_base === "number"
          ? formatearCOP(plan.precio_base)
          : "consultar"}{" "}
        para dos, sin hospedaje).
      </p>
      <button
        type="button"
        onClick={alElegir}
        className="shrink-0 self-start rounded-full border border-petroleo-300 bg-white px-4 py-2 font-titulo text-sm font-semibold text-petroleo-800 transition-colors duration-200 hover:border-petroleo-500 hover:bg-petroleo-50 sm:self-auto"
      >
        {fecha
          ? `Verlo para el ${formatearFechaCorta(fecha)}`
          : "Ver el plan de un día"}
      </button>
    </div>
  );
}

/**
 * El anticipo, con un control deslizante de 50 a 100 %.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ UN `<input type="range">` Y NO UNA FILA DE BOTONES
 * ---------------------------------------------------------------------------
 * Con veinte valores posibles (50, 55, … 100) una fila de botones ocuparía
 * media pantalla. Y el nativo trae gratis lo que cuesta caro reimplementar:
 * rol `slider`, flechas del teclado, Inicio/Fin, RePág/AvPág y el arrastre
 * táctil. Solo se le cambia la piel (`.deslizante-marca` en `globals.css`).
 *
 * El número que se anuncia NO es «62», que no dice nada: `aria-valuetext` lo
 * convierte en «65 % — $520.000 ahora», que es la frase que hace falta oír.
 *
 * El relleno del carril lo dibuja un degradado cuyo corte llega por la
 * variable `--recorrido`: es una propiedad personalizada, así que no hace
 * falta tocar el DOM ni medir nada al arrastrar.
 */
function DeslizanteAnticipo({
  porcentaje,
  anticipo,
  saldo,
  total,
  etiquetaTotal = "Total de la estadía",
  alCambiar,
}: {
  porcentaje: PorcentajeAnticipo;
  anticipo: number;
  saldo: number;
  total: number;
  /** «Total de la estadía» o «Total del día»: el mismo control, dos planes. */
  etiquetaTotal?: string;
  alCambiar: (porcentaje: PorcentajeAnticipo) => void;
}) {
  const recorrido =
    ((porcentaje - ANTICIPO_MINIMO) / (ANTICIPO_MAXIMO - ANTICIPO_MINIMO)) * 100;

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-generoso)] bg-white p-5 shadow-[var(--shadow-tenue)] ring-1 ring-crema-200/70 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <label
          htmlFor="anticipo"
          className="font-titulo text-sm font-semibold text-petroleo-900"
        >
          Pagas ahora
        </label>
        {/* El porcentaje y el monto, en vivo. `aria-live` no hace falta: el
            propio deslizante ya anuncia su valor al moverse, y duplicarlo
            haría que el lector lo dijera dos veces. */}
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-titulo text-2xl font-extrabold text-petroleo-700">
            {porcentaje} %
          </span>
          <span className="font-titulo text-lg font-bold text-petroleo-900">
            {formatearCOP(anticipo)}
          </span>
        </p>
      </div>

      <input
        id="anticipo"
        name="anticipo"
        type="range"
        min={ANTICIPO_MINIMO}
        max={ANTICIPO_MAXIMO}
        step={PASO_ANTICIPO}
        value={porcentaje}
        onChange={(evento) =>
          alCambiar(normalizarPorcentajeAnticipo(evento.target.value))
        }
        aria-valuetext={`${porcentaje} por ciento, ${formatearCOP(anticipo)} ahora`}
        className="deslizante-marca"
        style={{ "--recorrido": `${recorrido}%` } as CSSProperties}
      />

      <div
        aria-hidden="true"
        className="-mt-2 flex justify-between text-xs font-medium text-crema-600"
      >
        <span>50 % (lo mínimo)</span>
        <span>100 % (todo)</span>
      </div>

      <dl className="flex flex-col gap-1.5 border-t border-crema-200 pt-4 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-crema-700">{etiquetaTotal}</dt>
          <dd className="font-medium text-petroleo-900">
            {formatearCOP(total)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-crema-700">
            {saldo > 0 ? "Antes de llegar" : "Pendiente al llegar"}
          </dt>
          <dd className="font-medium text-petroleo-900">
            {formatearCOP(saldo)}
          </dd>
        </div>
      </dl>

      <p className="text-[0.8125rem] leading-relaxed text-crema-700">
        {explicacionAnticipo(porcentaje)}
      </p>
    </div>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-crema-600">{etiqueta}</dt>
      <dd className="min-w-0 text-right font-medium text-petroleo-900">
        {valor}
      </dd>
    </div>
  );
}

/**
 * Una experiencia dentro de una noche: casilla y, si está marcada, cantidad.
 *
 * La casilla es un `<input type="checkbox">` de verdad dentro de un `<label>`:
 * funciona con teclado y el lector de pantalla anuncia el nombre y el precio.
 */
function FilaExtra({
  extra,
  cantidad,
  alCambiar,
  nombreCampo,
}: {
  extra: ExtraSeleccionable;
  cantidad: number;
  alCambiar: (cantidad: number) => void;
  nombreCampo: string;
}) {
  const marcado = cantidad > 0;

  return (
    <li
      className={[
        "flex flex-wrap items-center gap-3 rounded-[var(--radius-tarjeta)] border px-3.5 py-2.5 transition-colors duration-200",
        marcado
          ? "border-petroleo-600 bg-petroleo-50"
          : "border-crema-300/80 bg-white hover:border-petroleo-300",
      ].join(" ")}
    >
      <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          name={nombreCampo}
          value={extra.id}
          checked={marcado}
          onChange={() => alCambiar(marcado ? 0 : 1)}
          className="size-5 shrink-0 accent-[var(--color-petroleo-600)]"
        />
        <span className="min-w-0">
          <span className="block font-titulo text-sm font-semibold text-petroleo-900">
            {extra.nombre}
          </span>
          <span className="block text-xs text-crema-600">
            {formatearCOP(extra.precio)}
            {extra.descripcion ? ` · ${extra.descripcion}` : ""}
          </span>
        </span>
      </label>

      {marcado ? (
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => alCambiar(cantidad - 1)}
            aria-label={`Quitar una unidad de ${extra.nombre}`}
            className="flex size-9 items-center justify-center rounded-full border border-crema-300 text-petroleo-800 transition-colors hover:bg-crema-100"
          >
            −
          </button>
          <span className="min-w-6 text-center font-titulo text-sm font-semibold text-petroleo-900">
            {cantidad}
          </span>
          <button
            type="button"
            onClick={() => alCambiar(cantidad + 1)}
            aria-label={`Añadir una unidad de ${extra.nombre}`}
            className="flex size-9 items-center justify-center rounded-full border border-crema-300 text-petroleo-800 transition-colors hover:bg-crema-100"
          >
            +
          </button>
        </span>
      ) : null}
    </li>
  );
}

/**
 * El precio que se enseña en la tarjeta de cada cabaña.
 *
 * Sin fechas todavía, es el «desde» del catálogo. Con fechas, es la tarifa que
 * de verdad le va a tocar a esa estadía: mostrar un «desde $350.000» cuando la
 * persona ya eligió un sábado es enseñarle un precio que no va a pagar.
 */
function precioParaLista(
  cabana: CabanaCotizable,
  hayFechas: boolean,
  hayEntreSemana: boolean,
  hayFinDeSemana: boolean,
  planFinDeSemana: string | null,
  adultos: number,
): { etiqueta: string } | null {
  const precioDe = (tarifa: CabanaCotizable["tarifas"][number]) =>
    adultos === 1 && typeof tarifa.precio_noche_1_persona === "number"
      ? tarifa.precio_noche_1_persona
      : tarifa.precio_noche;

  if (!hayFechas) {
    const precios = cabana.tarifas.map(precioDe);
    if (precios.length === 0) return null;
    return { etiqueta: `desde ${formatearCOP(Math.min(...precios))}` };
  }

  /* Con fechas puestas: si la estadía es de un solo tipo de noche, se puede
     nombrar el precio exacto por noche. Si es mixta, el total manda y aquí se
     enseña el más bajo de los dos con un «desde». */
  const relevantes = cabana.tarifas.filter((tarifa) => {
    if (hayFinDeSemana && planCubre(tarifa.plan, "fin_de_semana")) {
      return !planFinDeSemana || tarifa.plan.nombre === planFinDeSemana;
    }
    if (hayEntreSemana && planCubre(tarifa.plan, "entre_semana")) return true;
    return false;
  });

  if (relevantes.length === 0) return null;
  const precios = relevantes.map(precioDe);
  const minimo = Math.min(...precios);

  return {
    etiqueta:
      precios.length > 1 || (hayEntreSemana && hayFinDeSemana)
        ? `desde ${formatearCOP(minimo)} / noche`
        : `${formatearCOP(minimo)} / noche`,
  };
}
