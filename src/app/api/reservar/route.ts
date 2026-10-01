import { NextResponse } from "next/server";

import { frenar } from "@/lib/api/limite-peticiones";
import { boldConfigurado, pagosActivos } from "@/lib/pagos/bold";
import { crearReservaYCobro } from "@/lib/pagos/crear-reserva";
import type { SolicitudDeReserva } from "@/lib/pagos/cotizar-en-servidor";
import { origenParaBold } from "@/lib/pagos/origen";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/**
 * Crear la reserva y abrir el cobro de Bold.
 *
 *     POST /api/reservar
 *     → { referencia, codigo, anticipo, saldo, total, checkout: { … } }
 *
 * ===========================================================================
 * ES EL PRIMER ENDPOINT PÚBLICO DE ESTE SITIO QUE **ESCRIBE** EN LA BASE
 * ===========================================================================
 * Hasta hoy `/api/disponibilidad` y `/api/dia-de-calma/cupo` solo leían y solo
 * devolvían agregados. Este crea filas en `reservas`, `reserva_extras` y
 * `pagos`, así que es el que la auditoría tenía en mente en su pendiente P-3:
 *
 *   «**P-3 · Anti-abuso del formulario cuando entre la pasarela.** Honeypot y
 *   freno por IP en el endpoint que cree la reserva. Hoy no aplica porque el
 *   motor no escribe nada: compone un mensaje de WhatsApp.»
 *
 * Las dos cosas están abajo. Y el resto del endurecimiento es, a propósito,
 * **lo que NO hace**: no acepta precios, no acepta estados, no acepta códigos
 * de reserva, no acepta identificadores de alojamiento (solo el `slug` público)
 * y no devuelve nada que no sea de quien está reservando.
 *
 * ---------------------------------------------------------------------------
 * LO QUE SÍ Y LO QUE NO LLEGA DEL NAVEGADOR
 * ---------------------------------------------------------------------------
 * Llegan **decisiones**: fechas, cabaña, plan, personas, qué experiencias y en
 * qué noche, el porcentaje de anticipo y los datos de contacto. Los precios los
 * pone el servidor leyendo `tarifas` y `extras` (`cotizarEnServidor`). Si el
 * cuerpo trae un `total`, se ignora: no se lee en ningún sitio.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Freno de peticiones.
 *
 * Seis por minuto y por IP. Una persona reservando hace **una**; si el pago le
 * falla y lo reintenta, tres o cuatro en un mal día. Seis deja sitio para el
 * reintento legítimo y corta en seco a un script que quiera llenar la tabla de
 * reservas pendientes para bloquear el calendario del hotel —que es el ataque
 * que de verdad duele aquí: no roba nada, pero deja las cinco cabañas
 * «ocupadas» media hora cada vez—.
 *
 * El límite vive en la memoria de la instancia (ver `limite-peticiones.ts`):
 * sirve contra un script, no contra un ataque distribuido. La cerradura dura es
 * el pendiente P-1 de la auditoría, que es configuración del firewall de Vercel.
 */
const LIMITE = { peticiones: 6, segundos: 60 };

/** Topes de largo de los campos de texto, para no pasarle basura a la base. */
const MAXIMO = { nombre: 160, correo: 160, telefono: 40, notas: 1000 };

type Fallo = { error: string };

function error(mensaje: string, estado: number): NextResponse<Fallo> {
  return NextResponse.json(
    { error: mensaje },
    { status: estado, headers: { "cache-control": "no-store" } },
  );
}

/* ===========================================================================
 * Lectura del cuerpo, sin confiar en nada
 * ======================================================================== */

function texto(valor: unknown, tope: number): string {
  if (typeof valor !== "string") return "";
  /* Los caracteres de control no pintan nada en un nombre y sí ensucian un
     correo: fuera antes de medir el largo. */
  return valor
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, tope);
}

/**
 * ¿Esto parece un correo?
 *
 * Deliberadamente simple. Validar correos con una expresión exhaustiva rechaza
 * direcciones válidas y no detecta las inválidas que importan; lo que hace
 * falta es que tenga una arroba, un punto detrás y nada raro. El correo es,
 * además, por donde va a llegar la confirmación: si está mal escrito, el
 * huésped no la recibe y el hotel tiene su teléfono.
 */
function correoPlausible(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(valor) && valor.length <= MAXIMO.correo;
}

/** Un celular colombiano tiene 10 dígitos; se admite indicativo y separadores. */
function telefonoPlausible(valor: string): boolean {
  const digitos = valor.replace(/\D/g, "");
  return digitos.length >= 7 && digitos.length <= 15;
}

export async function POST(peticion: Request) {
  const frenada = frenar(peticion, "reservar", LIMITE);
  if (frenada) return frenada;

  /* Sin llaves de Bold no hay pago en línea. El sitio sigue cerrando por
     WhatsApp, y el selector ya pinta ese botón: esto es la red por si alguien
     llega al endpoint con el checkout a medio desplegar. */
  if (!boldConfigurado()) {
    return error(
      "El pago en línea no está disponible ahora mismo. Escríbenos por WhatsApp y cerramos tu reserva.",
      503,
    );
  }

  /*
    EL INTERRUPTOR DE PAGOS (`PAGOS_ACTIVOS`).

    Las llaves pueden estar puestas y el cobro seguir apagado: mientras sean las
    de pruebas, un huésped real pasaría por una pasarela que no cobra nada. El
    sitio público ya pinta el cierre por WhatsApp cuando el interruptor está en
    `0` —lo decide `pagoEnLineaDisponible()` en el servidor—, así que llegar aquí
    significa una petición directa al endpoint o un despliegue a medio camino. En
    los dos casos la respuesta es la misma: no se crea ninguna reserva.
  */
  if (!pagosActivos()) {
    return error(
      "Los pagos en línea no están habilitados todavía. Escríbenos por WhatsApp y cerramos tu reserva.",
      503,
    );
  }

  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return error("No pudimos leer la solicitud.", 400);
  }

  if (typeof cuerpo !== "object" || cuerpo === null) {
    return error("No pudimos leer la solicitud.", 400);
  }

  const datos = cuerpo as Record<string, unknown>;

  /*
    EL HONEYPOT (pendiente P-3 de la auditoría).

    El formulario lleva un campo que ninguna persona ve ni puede enfocar
    (`aria-hidden`, fuera de la pantalla, `tabindex=-1`). Un navegador humano lo
    deja vacío siempre; un bot que rellena todo lo que encuentra lo llena.

    La respuesta es un **200 con una reserva que no existe**, no un error: a un
    bot que recibe un 400 se le ajusta el script, y a uno que recibe «listo» se
    le deja creer que funcionó. No se escribe nada en la base y se deja una
    línea en el registro para poder contar cuántos llegan.
  */
  if (texto(datos.companiaWeb, 60) !== "") {
    console.info("[api/reservar] solicitud descartada por el honeypot.");
    return NextResponse.json(
      { ok: true, ignorado: true },
      { headers: { "cache-control": "no-store" } },
    );
  }

  /*
    LA AUTORIZACIÓN DE DATOS ES UNA PUERTA, NO UN CAMPO MÁS.

    Ley 1581 de 2012, art. 9: previa, expresa e informada. El selector ya
    deshabilita el botón sin ella, pero el endpoint **no puede confiar en eso**:
    sin la casilla no hay base legal para guardar un nombre y un teléfono, y la
    reserva ni se intenta.
  */
  if (datos.autorizaDatos !== true) {
    return error(
      "Para reservar necesitamos tu autorización para tratar tus datos personales. Marca la casilla e inténtalo de nuevo.",
      400,
    );
  }

  /* --- Datos del huésped ----------------------------------------------- */

  const nombre = texto(datos.nombre, MAXIMO.nombre);
  const correo = texto(datos.correo, MAXIMO.correo).toLowerCase();
  const telefono = texto(datos.telefono, MAXIMO.telefono);
  const notas = texto(datos.notas, MAXIMO.notas);

  if (nombre.length < 3) {
    return error("Escribe tu nombre completo.", 400);
  }
  if (!correoPlausible(correo)) {
    return error(
      "Revisa tu correo: ahí te llega la confirmación de la reserva.",
      400,
    );
  }
  if (!telefonoPlausible(telefono)) {
    return error("Revisa tu número de celular, con indicativo si es de fuera.", 400);
  }

  /* --- La solicitud, tal como la entiende el recálculo ------------------ */

  const tipo = datos.tipo === "dia" ? "dia" : "hospedaje";

  const extrasCrudos = Array.isArray(datos.extras) ? datos.extras : [];

  const solicitud: SolicitudDeReserva = {
    tipo,
    entrada: texto(datos.entrada, 10),
    salida: tipo === "dia" ? null : texto(datos.salida, 10),
    cabanaSlug: tipo === "dia" ? null : texto(datos.cabana, 80),
    planFinDeSemana: texto(datos.planFinDeSemana, 120) || null,
    personas: Number(datos.personas),
    porcentajeAnticipo: Number(datos.porcentajeAnticipo),
    extras: extrasCrudos.slice(0, 60).map((linea) => {
      const item = (typeof linea === "object" && linea !== null ? linea : {}) as Record<
        string,
        unknown
      >;
      return {
        extraId: texto(item.extraId, 40),
        noche: texto(item.noche, 10) || null,
        cantidad: Number(item.cantidad),
      };
    }),
  };

  /* --- Y a crear ------------------------------------------------------- */

  try {
    const supabase = crearClienteAdmin();
    const resultado = await crearReservaYCobro(supabase, {
      solicitud,
      huesped: { nombre, correo, telefono, notas: notas || null },
      /* Siempre https: Bold rechaza con BTN-001 cualquier URL de retorno que no
         lo sea, y en local el origen real es `http://localhost:3000`. */
      origen: origenParaBold(peticion),
    });

    if (!resultado.ok) {
      const estado =
        resultado.codigo === "ocupado"
          ? 409
          : resultado.codigo === "servidor"
            ? 503
            : 400;
      return error(resultado.motivo, estado);
    }

    const { datos: creada } = resultado;

    /*
      QUÉ SE DEVUELVE, Y POR QUÉ SOLO ESTO.

      Lo necesario para abrir el checkout y para enseñarle al huésped qué va a
      pagar. Nada de identificadores internos: el `reservaId` (un UUID de
      `reservas`) no sale, porque con él se podría intentar adivinar rutas del
      panel. La `referencia` sí: es lo que Bold va a devolver en la URL de
      retorno y lo que la página de confirmación necesita para preguntar el
      estado. El `codigo` también: es lo que el huésped va a dictar por
      teléfono.
    */
    return NextResponse.json(
      {
        ok: true,
        codigo: creada.codigo,
        referencia: creada.referencia,
        anticipo: creada.anticipo,
        saldo: creada.saldo,
        total: creada.total,
        porcentaje: creada.porcentaje,
        expiraAt: creada.expiraAt,
        checkout: creada.checkout,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (fallo) {
    console.error(
      "[api/reservar] fallo al crear la reserva:",
      fallo instanceof Error ? fallo.message : fallo,
    );
    return error(
      "No pudimos abrir el pago ahora mismo. Inténtalo de nuevo o escríbenos por WhatsApp.",
      503,
    );
  }
}
