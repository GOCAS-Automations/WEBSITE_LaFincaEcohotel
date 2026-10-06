"use client";

import Link from "next/link";
import { useState } from "react";

import { IconoWhatsapp } from "./iconos";
import { clasesBoton } from "@/components/ui/boton";
import { anticipoCambio } from "@/lib/pagos/anticipo-mostrado";
import { formatearCOP } from "@/lib/utils/formato";

/**
 * EL CIERRE DE LA RESERVA: pagar en línea con Bold.
 *
 * ===========================================================================
 * QUÉ SALE DE ESTE NAVEGADOR Y QUÉ NO
 * ===========================================================================
 * Sale: las fechas, la cabaña, el plan, cuántas personas, qué experiencias y en
 * qué noche, el porcentaje de anticipo y los datos de contacto.
 *
 * **No sale ni un precio.** El total que el visitante ve a la derecha lo calcula
 * este navegador para poder enseñarlo sin latencia, pero el que se cobra lo
 * recalcula el servidor leyendo `tarifas` y `extras`
 * (`src/lib/pagos/cotizar-en-servidor.ts`). Si alguien edita el deslizante con
 * las herramientas del navegador, lo único que consigue es ver otro número en su
 * pantalla: el cobro no cambia.
 *
 * Y **la firma de integridad tampoco se calcula aquí**. La documentación de Bold
 * es explícita: «Si optas por generar este hash en el frontend, corres el riesgo
 * de comprometer la seguridad, ya que un atacante con los conocimientos
 * suficientes podría manipular los datos de tus transacciones (p.ej. cambiar el
 * monto de una venta). En definitiva, este hash solo cumple con la función para
 * la que fue diseñado si lo generas del lado del servidor». La llave secreta no
 * existe en este archivo ni en ningún otro que llegue al navegador.
 *
 * ---------------------------------------------------------------------------
 * EL ORDEN DE LO QUE PASA AL PULSAR
 * ---------------------------------------------------------------------------
 *   1. `POST /api/reservar` — el servidor recalcula el precio, barre las
 *      reservas vencidas, comprueba disponibilidad, crea la reserva `pendiente`
 *      con 30 minutos de vida, crea la fila de `pagos` y devuelve la
 *      configuración del checkout **ya firmada**.
 *   2. Se carga el script de Bold (si no estaba).
 *   3. `new BoldCheckout(configuración).open()` — y el navegador se va a la
 *      pasarela.
 *
 * El orden importa: primero la reserva, después el checkout. Al revés habría
 * gente pagando noches que ya estaban vendidas. La documentación de Bold lo pide
 * igual: «Debes asegurarte de crear la orden de compra antes de pasar al proceso
 * de pago».
 */

/* ===========================================================================
 * El script de Bold
 * ======================================================================== */

const URL_SCRIPT = "https://checkout.bold.co/library/boldPaymentButton.js";

/** Lo mínimo del constructor de Bold que este sitio usa. */
type InstanciaBold = { open: () => void };
type ConstructorBold = new (configuracion: Record<string, unknown>) => InstanciaBold;

declare global {
  interface Window {
    BoldCheckout?: ConstructorBold;
  }
}

/**
 * Carga el script de Bold **la primera vez que hace falta**, no en cada visita.
 *
 * `/reservar` es una página estática que mucha gente abre para mirar precios y
 * cierra. Meter el script en el `<head>` le costaría una petición a un dominio
 * externo a todas esas visitas para nada. Aquí se inyecta al pulsar: el que paga
 * espera unas décimas, y el que mira no paga nada.
 *
 * Es el patrón que la propia documentación propone para la integración
 * personalizada (`initBoldCheckout`), con sus eventos `boldCheckoutLoaded` y
 * `boldCheckoutLoadFailed` resueltos aquí como una promesa.
 *
 * ⚠ **Requiere `https://checkout.bold.co` en `script-src` de la CSP**
 * (`next.config.ts`). Es el único host externo que añadió la fase de pagos, y
 * está declarado ahí con su motivo.
 */
let cargando: Promise<void> | null = null;

function cargarBold(): Promise<void> {
  if (typeof window !== "undefined" && window.BoldCheckout) return Promise.resolve();
  if (cargando) return cargando;

  cargando = new Promise<void>((resolver, rechazar) => {
    const existente = document.querySelector<HTMLScriptElement>(
      `script[src="${URL_SCRIPT}"]`,
    );
    if (existente) {
      /* Ya estaba en el DOM (otra instancia lo metió): se espera su carga. */
      existente.addEventListener("load", () => resolver(), { once: true });
      existente.addEventListener(
        "error",
        () => rechazar(new Error("no se pudo cargar el script de Bold")),
        { once: true },
      );
      if (window.BoldCheckout) resolver();
      return;
    }

    const script = document.createElement("script");
    script.src = URL_SCRIPT;
    script.async = true;
    script.onload = () => resolver();
    script.onerror = () => {
      /* Se olvida la promesa fallida para que un segundo intento vuelva a
         probar: lo más común es una red mala, no un script roto. */
      cargando = null;
      rechazar(new Error("no se pudo cargar el script de Bold"));
    };
    document.head.appendChild(script);
  });

  return cargando;
}

/* ===========================================================================
 * Los datos del huésped
 * ======================================================================== */

export type DatosHuesped = {
  nombre: string;
  correo: string;
  telefono: string;
  notas: string;
  /**
   * EL HONEYPOT (pendiente P-3 de la auditoría).
   *
   * Un campo que ninguna persona ve, ni puede enfocar con el tabulador, ni le
   * dice nada a un lector de pantalla. Un bot que rellena todo lo que encuentra
   * lo llena, y el endpoint descarta esa solicitud sin escribir nada.
   *
   * Se llama `companiaWeb` y no `honeypot` por un motivo: un bot que vea el
   * nombre del truco lo evita. «Compañía» es un campo que los formularios de
   * reserva piden de verdad, así que es creíble.
   */
  companiaWeb: string;
};

export const HUESPED_VACIO: DatosHuesped = {
  nombre: "",
  correo: "",
  telefono: "",
  notas: "",
  companiaWeb: "",
};

/** ¿Están los tres campos obligatorios con algo que parezca válido? */
export function huespedCompleto(datos: DatosHuesped): boolean {
  return (
    datos.nombre.trim().length >= 3 &&
    /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(datos.correo.trim()) &&
    datos.telefono.replace(/\D/g, "").length >= 7
  );
}

const CLASE_CAMPO =
  "w-full rounded-[var(--radius-tarjeta)] border-0 bg-white px-4 py-3 text-base text-petroleo-900 " +
  "ring-1 ring-crema-300 transition-shadow placeholder:text-crema-500 " +
  "focus:ring-2 focus:ring-petroleo-500 focus:outline-none";

/**
 * El paso de los datos de contacto.
 *
 * Tres campos obligatorios y uno opcional, y nada más. **No se pide el documento
 * de identidad**: el registro de huéspedes lo exige en el check-in, no al
 * reservar, y pedirlo aquí sería recoger un dato que todavía no hace falta
 * (hallazgo B-3 de la auditoría, principio de minimización de la Ley 1581).
 *
 * El correo lleva su propia explicación de para qué es: es por donde llega la
 * confirmación, y un correo mal escrito es la causa número uno de «no me llegó
 * nada».
 */
export function PasoDatosHuesped({
  numero,
  datos,
  alCambiar,
}: {
  numero: number;
  datos: DatosHuesped;
  alCambiar: (siguiente: DatosHuesped) => void;
}) {
  const cambiar = <C extends keyof DatosHuesped>(campo: C, valor: string) =>
    alCambiar({ ...datos, [campo]: valor });

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-4 font-titulo text-lg font-bold text-petroleo-900">
        {numero}. ¿A nombre de quién?
      </legend>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-semibold text-petroleo-900">
            Nombre y apellido
          </span>
          <input
            type="text"
            name="nombre"
            value={datos.nombre}
            onChange={(evento) => cambiar("nombre", evento.target.value)}
            autoComplete="name"
            required
            maxLength={160}
            placeholder="Como aparece en tu documento"
            className={CLASE_CAMPO}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-petroleo-900">Correo</span>
          <input
            type="email"
            name="correo"
            value={datos.correo}
            onChange={(evento) => cambiar("correo", evento.target.value)}
            autoComplete="email"
            inputMode="email"
            required
            maxLength={160}
            placeholder="tucorreo@ejemplo.com"
            aria-describedby="nota-correo"
            className={CLASE_CAMPO}
          />
          <span id="nota-correo" className="text-xs leading-snug text-crema-600">
            Aquí te llega la confirmación con el código de tu reserva y cómo
            llegar.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-petroleo-900">Celular</span>
          <input
            type="tel"
            name="telefono"
            value={datos.telefono}
            onChange={(evento) => cambiar("telefono", evento.target.value)}
            autoComplete="tel"
            inputMode="tel"
            required
            maxLength={40}
            placeholder="300 123 4567"
            aria-describedby="nota-telefono"
            className={CLASE_CAMPO}
          />
          <span id="nota-telefono" className="text-xs leading-snug text-crema-600">
            Para avisarte de cualquier cosa el día de tu llegada.
          </span>
        </label>

        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-semibold text-petroleo-900">
            ¿Algo que debamos saber?{" "}
            <span className="font-normal text-crema-600">(opcional)</span>
          </span>
          <textarea
            name="notas"
            value={datos.notas}
            onChange={(evento) => cambiar("notas", evento.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Alergias, hora aproximada de llegada, si celebran algo…"
            className={`${CLASE_CAMPO} resize-y`}
          />
        </label>

        {/*
          EL HONEYPOT.

          Fuera de la pantalla en vez de `display:none` porque algunos bots
          saltan lo que está oculto con CSS y rellenan lo que está «visible pero
          lejos». `aria-hidden` y `tabIndex={-1}` lo sacan del alcance de un
          lector de pantalla y del tabulador, así que para una persona no existe.
          `autoComplete="off"` evita que el navegador lo rellene solo, que
          convertiría a un huésped real en un bot a nuestros ojos.
        */}
        <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px]">
          <label>
            Compañía
            <input
              type="text"
              name="companiaWeb"
              tabIndex={-1}
              autoComplete="off"
              value={datos.companiaWeb}
              onChange={(evento) => cambiar("companiaWeb", evento.target.value)}
            />
          </label>
        </div>
      </div>
    </fieldset>
  );
}

/* ===========================================================================
 * El botón de pagar
 * ======================================================================== */

/** Lo que el servidor necesita saber para recalcular y cobrar. */
export type SolicitudEnviable = {
  tipo: "hospedaje" | "dia";
  entrada: string;
  salida: string | null;
  cabana: string | null;
  planFinDeSemana: string | null;
  personas: number;
  porcentajeAnticipo: number;
  extras: { extraId: string; noche: string | null; cantidad: number }[];
};

type EstadoPago =
  | { fase: "listo" }
  | { fase: "creando" }
  | { fase: "abriendo" }
  | { fase: "error"; mensaje: string }
  /**
   * El servidor calcula otro anticipo que el que se enseñó: NO se va a la
   * pasarela sin que el huésped vea el monto nuevo y lo confirme. `checkout`
   * llega solo si la reserva ya quedó creada (un servidor que no comparó); si
   * no, confirmar vuelve a pedirla con el monto nuevo.
   */
  | {
      fase: "confirmar";
      mensaje: string;
      anticipoNuevo: number;
      checkout: Record<string, unknown> | null;
    };

export function BotonPagar({
  disponible,
  solicitud,
  huesped,
  autoriza,
  anticipo,
  saldo,
  porcentaje,
  enlaceWhatsapp,
}: {
  /** `true` si el servidor tiene las llaves de Bold. */
  disponible: boolean;
  /** `null` mientras la reserva no esté completa (sin fechas, sin cabaña…). */
  solicitud: SolicitudEnviable | null;
  huesped: DatosHuesped;
  autoriza: boolean;
  anticipo: number;
  saldo: number;
  porcentaje: number;
  enlaceWhatsapp: string;
}) {
  const [estado, setEstado] = useState<EstadoPago>({ fase: "listo" });

  const ocupado =
    estado.fase === "creando" || estado.fase === "abriendo" || estado.fase === "confirmar";
  const faltanDatos = !huespedCompleto(huesped);
  const puedePagar =
    disponible && solicitud !== null && autoriza && !faltanDatos && !ocupado;

  /** Por qué el botón está apagado, en una frase. `null` si no lo está. */
  const impedimento = !disponible
    ? null
    : solicitud === null
      ? "Completa los pasos de arriba para pagar en línea."
      : !autoriza
        ? "Marca la casilla de autorización de datos para continuar."
        : faltanDatos
          ? "Completa tu nombre, correo y celular para pagar en línea."
          : null;

  /**
   * `anticipoMostrado` es el anticipo que el huésped tiene delante: el de la
   * pantalla o, tras confirmar un cambio, el nuevo. Viaja al servidor como
   * `anticipoEsperado` y, si el servidor calcula otro, no se paga sin
   * preguntar.
   */
  async function pagar(anticipoMostrado: number = anticipo) {
    if (!solicitud) return;
    setEstado({ fase: "creando" });

    try {
      const respuesta = await fetch("/api/reservar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...solicitud,
          anticipoEsperado: anticipoMostrado,
          nombre: huesped.nombre,
          correo: huesped.correo,
          telefono: huesped.telefono,
          notas: huesped.notas,
          companiaWeb: huesped.companiaWeb,
          autorizaDatos: autoriza,
        }),
      });

      const datos: unknown = await respuesta.json().catch(() => null);
      const cuerpo =
        typeof datos === "object" && datos !== null ? (datos as Record<string, unknown>) : {};

      /* El servidor calculó otro anticipo y no creó nada: se enseña el nuevo. */
      if (respuesta.status === 409 && typeof cuerpo.anticipoNuevo === "number") {
        setEstado({
          fase: "confirmar",
          mensaje: String(cuerpo.error ?? ""),
          anticipoNuevo: cuerpo.anticipoNuevo,
          checkout: null,
        });
        return;
      }

      if (!respuesta.ok) {
        const mensaje =
          typeof datos === "object" && datos !== null && "error" in datos
            ? String((datos as { error: unknown }).error)
            : "No pudimos abrir el pago. Inténtalo de nuevo o escríbenos por WhatsApp.";
        setEstado({ fase: "error", mensaje });
        return;
      }

      const checkout =
        typeof datos === "object" && datos !== null && "checkout" in datos
          ? (datos as { checkout: Record<string, unknown> }).checkout
          : null;

      if (!checkout) {
        setEstado({
          fase: "error",
          mensaje:
            "La reserva quedó creada pero no pudimos abrir la pasarela. Escríbenos por WhatsApp y la cerramos contigo.",
        });
        return;
      }

      /* Segunda red: si el servidor devolvió otro anticipo que el que se
         enseñó (uno que no comparó), tampoco se va a la pasarela sin
         preguntar. La reserva ya está apartada: confirmar abre ESTE cobro. */
      const anticipoDelServidor = typeof cuerpo.anticipo === "number" ? cuerpo.anticipo : null;
      if (anticipoDelServidor !== null && anticipoCambio(anticipoMostrado, anticipoDelServidor)) {
        setEstado({
          fase: "confirmar",
          mensaje: `El anticipo cambió mientras elegías: veías ${formatearCOP(anticipoMostrado)} y ahora es ${formatearCOP(anticipoDelServidor)}. ¿Quieres pagar ${formatearCOP(anticipoDelServidor)}?`,
          anticipoNuevo: anticipoDelServidor,
          checkout,
        });
        return;
      }

      await abrirPasarela(checkout);
    } catch (error) {
      console.error("[pago] no se pudo abrir el checkout:", error);
      setEstado({
        fase: "error",
        mensaje:
          "No pudimos abrir la pasarela de pagos. Revisa tu conexión e inténtalo otra vez, o escríbenos por WhatsApp.",
      });
    }
  }

  /** Lleva el navegador a la pasarela de Bold con un cobro ya firmado. */
  async function abrirPasarela(checkout: Record<string, unknown>) {
    setEstado({ fase: "abriendo" });
    await cargarBold();

    if (!window.BoldCheckout) {
      throw new Error("el script de Bold cargó sin el constructor");
    }

    /* `open()` lleva el navegador a la pasarela de Bold: desde aquí ya no
       vuelve a correr nada de esta página hasta el retorno. */
    new window.BoldCheckout(checkout).open();
  }

  /** «Sí, pagar el monto nuevo». */
  async function confirmarMontoNuevo() {
    if (estado.fase !== "confirmar") return;
    if (!estado.checkout) {
      await pagar(estado.anticipoNuevo);
      return;
    }
    try {
      await abrirPasarela(estado.checkout);
    } catch (error) {
      console.error("[pago] no se pudo abrir el checkout:", error);
      setEstado({
        fase: "error",
        mensaje:
          "No pudimos abrir la pasarela de pagos. Revisa tu conexión e inténtalo otra vez, o escríbenos por WhatsApp.",
      });
    }
  }

  /* --- Sin llaves de Bold, WhatsApp sigue siendo el cierre -------------- */

  if (!disponible) {
    return (
      <>
        <BotonWhatsapp enlace={enlaceWhatsapp} activo={autoriza} principal />
        {!autoriza ? <AvisoAutorizacion /> : null}
        <p className="text-xs leading-relaxed text-crema-600">
          Te llevamos a WhatsApp con el desglose ya escrito. El total es una
          estimación con la tarifa publicada: el equipo confirma disponibilidad y
          precio final antes de cobrar.
        </p>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => pagar()}
        disabled={!puedePagar}
        aria-describedby={impedimento ? "impedimento-pago" : undefined}
        className={clasesBoton(
          "primario",
          "grande",
          `w-full ${puedePagar ? "" : "cursor-not-allowed opacity-50"}`,
        )}
      >
        {estado.fase === "creando"
          ? "Apartando tus fechas…"
          : estado.fase === "abriendo"
            ? "Abriendo la pasarela…"
            : anticipo > 0
              ? `Pagar ${formatearCOP(anticipo)} y reservar`
              : "Pagar y reservar"}
      </button>

      {impedimento ? (
        <p
          id="impedimento-pago"
          className="text-xs leading-relaxed text-crema-700"
        >
          {impedimento}
        </p>
      ) : null}

      {estado.fase === "confirmar" ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-[var(--radius-tarjeta)] bg-dorado-50 px-4 py-4 ring-1 ring-dorado-200"
        >
          <p id="monto-nuevo" className="text-sm leading-relaxed text-dorado-800">
            {estado.mensaje}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={confirmarMontoNuevo}
              className={clasesBoton("primario", "grande", "w-full sm:w-auto")}
            >
              {`Sí, pagar ${formatearCOP(estado.anticipoNuevo)}`}
            </button>
            <button
              type="button"
              onClick={() => setEstado({ fase: "listo" })}
              className={clasesBoton("secundario", "grande", "w-full sm:w-auto")}
            >
              No, volver a revisar
            </button>
          </div>
        </div>
      ) : null}

      {estado.fase === "error" ? (
        <p
          role="alert"
          className="rounded-[var(--radius-tarjeta)] bg-dorado-50 px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-dorado-800 ring-1 ring-dorado-200"
        >
          {estado.mensaje}
        </p>
      ) : null}

      {/* Lo que el huésped necesita saber ANTES de pulsar, no después. */}
      <ul className="flex flex-col gap-1 text-xs leading-relaxed text-crema-600">
        <li>
          Pago seguro con Bold: tarjeta, PSE, Nequi o botón Bancolombia. El sitio
          no ve ni guarda los datos de tu tarjeta.
        </li>
        <li>
          Apartamos tus fechas <strong>30 minutos</strong> mientras pagas. Si no
          completas el pago, vuelven a quedar libres solas.
        </li>
        {saldo > 0 ? (
          <li>
            Pagas ahora el {porcentaje} % y quedan{" "}
            <strong>{formatearCOP(saldo)}</strong> que te cobramos por link antes
            de tu llegada: en la finca no hay datáfono ni se maneja efectivo.
          </li>
        ) : (
          <li>Pagas el total: llegas sin nada pendiente.</li>
        )}
      </ul>

      {/* WhatsApp sigue visible, como alternativa y no como camino principal. */}
      <div className="flex flex-col gap-2 border-t border-crema-200 pt-4">
        <p className="text-xs leading-relaxed text-crema-600">
          ¿Prefieres hablar con alguien antes de pagar?
        </p>
        <BotonWhatsapp enlace={enlaceWhatsapp} activo={autoriza} />
        {!autoriza ? <AvisoAutorizacion /> : null}
      </div>
    </>
  );
}

/* ===========================================================================
 * Piezas compartidas
 * ======================================================================== */

/**
 * El botón de WhatsApp, con la misma regla de siempre: **no funciona sin la
 * casilla de autorización marcada**, y cuando está apagado es un `<button
 * disabled>` y no un enlace con poca opacidad, porque un enlace deshabilitado
 * sigue siendo pulsable con el teclado.
 */
function BotonWhatsapp({
  enlace,
  activo,
  principal = false,
}: {
  enlace: string;
  activo: boolean;
  principal?: boolean;
}) {
  const variante = principal ? "primario" : "secundario";

  if (!activo) {
    return (
      <button
        type="button"
        disabled
        aria-describedby="falta-autorizacion"
        className={clasesBoton(
          variante,
          "grande",
          "w-full cursor-not-allowed opacity-50",
        )}
      >
        <IconoWhatsapp className="size-5" />
        Solicitar por WhatsApp
      </button>
    );
  }

  return (
    <a
      href={enlace}
      target="_blank"
      rel="noopener noreferrer"
      className={clasesBoton(variante, "grande", "w-full")}
    >
      <IconoWhatsapp className="size-5" />
      Solicitar por WhatsApp
    </a>
  );
}

function AvisoAutorizacion() {
  return (
    <p id="falta-autorizacion" className="text-xs leading-relaxed text-crema-700">
      Marca la casilla de autorización de datos para poder enviar la solicitud.
    </p>
  );
}

/**
 * El enlace a la política, para que el texto de la casilla no lo repita en dos
 * sitios. Se exporta porque lo usa el bloque de autorización del selector.
 */
export function EnlacePoliticaDatos() {
  return (
    <Link
      href="/legal/datos"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-petroleo-700 underline decoration-petroleo-300 underline-offset-2 hover:decoration-petroleo-600"
    >
      Política de tratamiento de datos personales
    </Link>
  );
}
