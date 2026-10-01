import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  LARGO_MAXIMO_REFERENCIA,
  MONTO_MINIMO_BOLD,
  calcularFirmaDeEvento,
  calcularFirmaDeIntegridad,
  construirReferencia,
  descripcionParaBold,
  esAprobado,
  esEstadoFinal,
  esRechazado,
  estaEnProceso,
  estadoDeEvento,
  etiquetaMetodoPago,
  leerConsultaEstado,
  leerEventoBold,
  normalizarEstadoBold,
  referenciaValida,
  verificarFirmaDeEvento,
} from "./bold";
import { calcularAnticipo, resumenDePago } from "../reserva/total";

/**
 * Las reglas de Bold que no se pueden mirar en una captura de pantalla.
 *
 * ===========================================================================
 * POR QUÉ ESTAS Y NO OTRAS
 * ===========================================================================
 * Un error en cualquiera de estas cuatro cosas **no se ve**: el sitio sigue
 * pintándose igual y lo que falla es el cobro, en producción, con un huésped
 * delante.
 *
 *   1. **El hash de integridad.** Si el orden de la concatenación se cambia, Bold
 *      devuelve un error genérico en la pasarela. Se fija contra el ejemplo
 *      EXACTO de la documentación oficial.
 *   2. **La firma del webhook.** Si se firmara el cuerpo en vez de su Base64, o
 *      con SHA256 en vez de HMAC, el webhook rechazaría **todos** los eventos de
 *      Bold y ninguna reserva se confirmaría nunca. Y al contrario: una
 *      comparación mal hecha dejaría confirmar reservas con un `curl`.
 *   3. **La referencia.** Si pasa de 60 caracteres o lleva un carácter que Bold
 *      no admite, la pasarela no abre.
 *   4. **El anticipo.** Es la cifra que se cobra. Se comprueba que suma con el
 *      saldo y que respeta el mínimo de Bold.
 */

/* ===========================================================================
 * 1. El hash de integridad
 * ======================================================================== */

describe("firma de integridad del checkout", () => {
  /*
    EL EJEMPLO LITERAL DE LA DOCUMENTACIÓN.

    «Aquí te mostramos un ejemplo para los siguientes valores: Identificador
    único de la venta: inv0334 · Monto de la transacción: 39400 · Divisa de la
    transacción: COP · Llave secreta: kgfq2nN0o52XqnuXZWIN2F», y la cadena a
    cifrar es `inv033439400COPkgfq2nN0o52XqnuXZWIN2F`.

    El hash esperado NO lo publica Bold, así que se fija el SHA256 de esa cadena
    exacta. Lo que esta prueba protege de verdad es **el orden y el formato de la
    concatenación**, que es lo único que Bold documenta y lo único que se puede
    romper por descuido.
  */
  const EJEMPLO = {
    referencia: "inv0334",
    monto: 39400,
    moneda: "COP",
    secreto: "kgfq2nN0o52XqnuXZWIN2F",
    cadena: "inv033439400COPkgfq2nN0o52XqnuXZWIN2F",
    hash: "620a64c6eab8858d0f96d4f818a1d77be5e9b9eb9dc681f527de1af54fc1b739",
  };

  it("reproduce el ejemplo de la documentación de Bold", () => {
    expect(
      calcularFirmaDeIntegridad(
        EJEMPLO.referencia,
        EJEMPLO.monto,
        EJEMPLO.moneda,
        EJEMPLO.secreto,
      ),
    ).toBe(EJEMPLO.hash);
  });

  it("concatena en el orden {referencia}{monto}{divisa}{secreto} y nada más", () => {
    /* Sin separadores, sin decimales y sin espacios: el mismo SHA256 que el de
       la cadena escrita a mano. */
    expect(EJEMPLO.hash).toBe(
      createHash("sha256").update(EJEMPLO.cadena, "utf8").digest("hex"),
    );
  });

  it("cambia si cambia el monto", () => {
    /* Es LA propiedad por la que existe la firma: que nadie pueda cambiar el
       monto en el navegador y seguir pasando la validación de Bold. */
    const original = calcularFirmaDeIntegridad("ref-1", 100000, "COP", "s3cr3t");
    const manipulada = calcularFirmaDeIntegridad("ref-1", 1000, "COP", "s3cr3t");
    expect(manipulada).not.toBe(original);
  });

  it("cambia si cambia la referencia, la divisa o la llave", () => {
    const base = calcularFirmaDeIntegridad("ref-1", 100000, "COP", "s3cr3t");
    expect(calcularFirmaDeIntegridad("ref-2", 100000, "COP", "s3cr3t")).not.toBe(base);
    expect(calcularFirmaDeIntegridad("ref-1", 100000, "USD", "s3cr3t")).not.toBe(base);
    expect(calcularFirmaDeIntegridad("ref-1", 100000, "COP", "otra")).not.toBe(base);
  });

  it("escribe el monto como entero, sin decimales", () => {
    /* `Math.round` dentro: 39400.0 y 39400 tienen que dar el mismo hash, porque
       lo que se manda en `amount` es «39400» en los dos casos. */
    expect(calcularFirmaDeIntegridad("ref", 39400.0, "COP", "k")).toBe(
      calcularFirmaDeIntegridad("ref", 39400, "COP", "k"),
    );
  });
});

/* ===========================================================================
 * 2. La firma de los eventos del webhook
 * ======================================================================== */

describe("firma de los eventos (x-bold-signature)", () => {
  const CUERPO = '{"id":"evt-1","type":"SALE_APPROVED"}';
  const SECRETO = "kgfq2nN0o52XqnuXZWIN2F";

  it("es HMAC-SHA256 sobre el BASE64 del cuerpo, en hexadecimal", () => {
    /* Los cinco ejemplos de la documentación hacen exactamente esto:
         encoded = base64(body); hashed = hmac_sha256(secret, encoded).hex() */
    const esperado = createHmac("sha256", SECRETO)
      .update(Buffer.from(CUERPO, "utf8").toString("base64"))
      .digest("hex");

    expect(calcularFirmaDeEvento(CUERPO, SECRETO)).toBe(esperado);
  });

  it("NO es un HMAC sobre el cuerpo sin codificar", () => {
    /* El error más fácil de cometer, y el que haría que el webhook rechazara
       todos los eventos reales de Bold sin que nadie entienda por qué. */
    const sinBase64 = createHmac("sha256", SECRETO).update(CUERPO).digest("hex");
    expect(calcularFirmaDeEvento(CUERPO, SECRETO)).not.toBe(sinBase64);
  });

  it("NO es un SHA256 a secas", () => {
    const soloHash = createHash("sha256")
      .update(Buffer.from(CUERPO, "utf8").toString("base64"))
      .digest("hex");
    expect(calcularFirmaDeEvento(CUERPO, SECRETO)).not.toBe(soloHash);
  });

  it("acepta la firma correcta", () => {
    const firma = calcularFirmaDeEvento(CUERPO, SECRETO);
    expect(verificarFirmaDeEvento(CUERPO, firma, SECRETO)).toBe(true);
  });

  it("rechaza una firma inventada", () => {
    expect(verificarFirmaDeEvento(CUERPO, "a".repeat(64), SECRETO)).toBe(false);
  });

  it("rechaza la firma de OTRO cuerpo: el cuerpo no se puede tocar", () => {
    const firma = calcularFirmaDeEvento(CUERPO, SECRETO);
    const alterado = '{"id":"evt-1","type":"SALE_APPROVED","monto":999}';
    expect(verificarFirmaDeEvento(alterado, firma, SECRETO)).toBe(false);
  });

  it("rechaza la firma hecha con otra llave", () => {
    const firma = calcularFirmaDeEvento(CUERPO, "llave-del-atacante");
    expect(verificarFirmaDeEvento(CUERPO, firma, SECRETO)).toBe(false);
  });

  it("rechaza cuando no llega firma", () => {
    expect(verificarFirmaDeEvento(CUERPO, null, SECRETO)).toBe(false);
    expect(verificarFirmaDeEvento(CUERPO, undefined, SECRETO)).toBe(false);
    expect(verificarFirmaDeEvento(CUERPO, "", SECRETO)).toBe(false);
  });

  it("rechaza una firma de largo distinto sin reventar", () => {
    /* `timingSafeEqual` lanza si los búferes no miden lo mismo. Si eso
       escapara, el webhook devolvería un 500 y Bold reintentaría cinco veces. */
    expect(() => verificarFirmaDeEvento(CUERPO, "abc", SECRETO)).not.toThrow();
    expect(verificarFirmaDeEvento(CUERPO, "abc", SECRETO)).toBe(false);
  });

  it("tolera espacios alrededor de la firma", () => {
    const firma = calcularFirmaDeEvento(CUERPO, SECRETO);
    expect(verificarFirmaDeEvento(CUERPO, ` ${firma} `, SECRETO)).toBe(true);
  });

  it("verifica con la llave VACÍA, que es la del ambiente de pruebas", () => {
    /*
      «En modo pruebas la firma usa una clave vacía, es decir cuando se quiere
      verificar una transacción que se realizó con las llaves de pruebas, el
      atributo donde va tu LLAVE_SECRETA no se ingresa, debe ir como un String
      vacío. Ejemplo: $secretKey = '';»

      Se prueba porque es una rama real del código (`modoBold()`), y porque si
      `createHmac` no aceptara una llave vacía el sandbox no se podría probar.
    */
    const firma = calcularFirmaDeEvento(CUERPO, "");
    expect(verificarFirmaDeEvento(CUERPO, firma, "")).toBe(true);
    /* Y la de pruebas NO vale en producción. */
    expect(verificarFirmaDeEvento(CUERPO, firma, SECRETO)).toBe(false);
  });
});

/* ===========================================================================
 * 3. La referencia
 * ======================================================================== */

describe("referencia de la venta (order-id)", () => {
  it("lleva el código de la reserva delante y una marca de tiempo detrás", () => {
    const ahora = new Date("2026-10-01T15:00:00.000Z");
    const referencia = construirReferencia("LF-2026-0042", ahora);
    expect(referencia).toBe(`LF-2026-0042-${ahora.getTime()}`);
  });

  it("cumple el formato que Bold admite", () => {
    const referencia = construirReferencia("LF-2026-0042");
    expect(referenciaValida(referencia)).toBe(true);
    expect(referencia.length).toBeLessThanOrEqual(LARGO_MAXIMO_REFERENCIA);
  });

  it("da una referencia distinta en cada intento de pago", () => {
    /*
      «Evita reutilizar identificadores que ya estén en tu base de datos ya que
      se podría generar un error al intentar abrir la pasarela de pagos de Bold
      si se usa un identificador asociado a una orden de compra ya pagada».

      Pasa de verdad: tarjeta rechazada y segundo intento con otra.
    */
    const primera = construirReferencia("LF-2026-0042", new Date(1_700_000_000_000));
    const segunda = construirReferencia("LF-2026-0042", new Date(1_700_000_060_000));
    expect(primera).not.toBe(segunda);
  });

  it("sanea un código con caracteres que Bold no admite", () => {
    const referencia = construirReferencia("LF/2026 #0042", new Date(1_700_000_000_000));
    expect(referenciaValida(referencia)).toBe(true);
    expect(referencia).not.toMatch(/[/# ]/);
  });

  it("nunca pasa de 60 caracteres, aunque el código sea absurdo", () => {
    const referencia = construirReferencia("X".repeat(200), new Date(1_700_000_000_000));
    expect(referencia.length).toBeLessThanOrEqual(LARGO_MAXIMO_REFERENCIA);
    expect(referenciaValida(referencia)).toBe(true);
  });

  it("rechaza referencias con forma inválida", () => {
    expect(referenciaValida("")).toBe(false);
    expect(referenciaValida("con espacio")).toBe(false);
    expect(referenciaValida("con/barra")).toBe(false);
    expect(referenciaValida("a".repeat(61))).toBe(false);
    /* Lo que sí admite: alfanumérico, guion bajo y guion medio. */
    expect(referenciaValida("INV2023-1001")).toBe(true);
    expect(referenciaValida("j1k2l3_m4n5o6")).toBe(true);
  });
});

/* ===========================================================================
 * 4. El anticipo que se cobra
 * ======================================================================== */

describe("el anticipo que se le manda a Bold", () => {
  it("el anticipo y el saldo suman siempre el total", () => {
    /* Es la propiedad que impide perder o inventar un peso entre lo que se cobra
       ahora y lo que se cobra en la finca. */
    for (const total of [200000, 350000, 777777, 1_234_567]) {
      for (const porcentaje of [50, 55, 65, 85, 100]) {
        const { anticipo, saldo } = calcularAnticipo(total, porcentaje);
        expect(anticipo + saldo).toBe(total);
      }
    }
  });

  it("al 100 % no queda saldo y se cobra el total exacto", () => {
    const { anticipo, saldo } = calcularAnticipo(777777, 100);
    expect(anticipo).toBe(777777);
    expect(saldo).toBe(0);
  });

  it("el monto en pesos enteros es lo que entra en la firma", () => {
    /*
      Bold pide PESOS, no centavos: «si deseas cobrar $95.000 COP, deberás
      ingresar: 95000». Esta prueba fija ese contrato: la firma de un anticipo de
      $175.000 se calcula sobre «175000» y no sobre «17500000».
    */
    const pago = resumenDePago({ subtotalAlojamiento: 350000, porcentaje: 50 });
    expect(pago.anticipo).toBe(175000);

    const firma = calcularFirmaDeIntegridad("ref", pago.anticipo, "COP", "k");
    expect(firma).toBe(
      createHash("sha256").update("ref175000COPk", "utf8").digest("hex"),
    );
    /* Y NO la de los centavos. */
    expect(firma).not.toBe(
      createHash("sha256").update("ref17500000COPk", "utf8").digest("hex"),
    );
  });

  it("una noche entre semana para una persona pasa el mínimo de Bold", () => {
    /* La tarifa más baja del hotel es $200.000 (Entre Semana, una persona) y su
       anticipo del 50 % son $100.000: cien veces el mínimo de $1.000. El día que
       el hotel publique una tarifa pequeña, esta prueba sigue valiendo como
       recordatorio de que el tope existe. */
    const pago = resumenDePago({ subtotalAlojamiento: 200000, porcentaje: 50 });
    expect(pago.anticipo).toBeGreaterThanOrEqual(MONTO_MINIMO_BOLD);
  });
});

/* ===========================================================================
 * 5. Los estados
 * ======================================================================== */

describe("estados de una transacción", () => {
  it("solo APPROVED es aprobado", () => {
    expect(esAprobado("APPROVED")).toBe(true);
    for (const estado of [
      "PROCESSING",
      "PENDING",
      "REJECTED",
      "FAILED",
      "VOIDED",
      "NO_TRANSACTION_FOUND",
      "DESCONOCIDO",
    ] as const) {
      expect(esAprobado(estado)).toBe(false);
    }
  });

  it("rechazado, fallido y anulado no se van a cobrar", () => {
    expect(esRechazado("REJECTED")).toBe(true);
    expect(esRechazado("FAILED")).toBe(true);
    expect(esRechazado("VOIDED")).toBe(true);
    expect(esRechazado("PROCESSING")).toBe(false);
  });

  it("PROCESSING, PENDING y «sin transacción» siguen en proceso", () => {
    expect(estaEnProceso("PROCESSING")).toBe(true);
    expect(estaEnProceso("PENDING")).toBe(true);
    expect(estaEnProceso("NO_TRANSACTION_FOUND")).toBe(true);
    expect(estaEnProceso("APPROVED")).toBe(false);
  });

  it("los estados finales son los cuatro que dice la documentación", () => {
    expect(esEstadoFinal("APPROVED")).toBe(true);
    expect(esEstadoFinal("REJECTED")).toBe(true);
    expect(esEstadoFinal("FAILED")).toBe(true);
    expect(esEstadoFinal("VOIDED")).toBe(true);
    expect(esEstadoFinal("PROCESSING")).toBe(false);
    expect(esEstadoFinal("PENDING")).toBe(false);
  });

  it("un estado que Bold añada mañana NO se trata como aprobado", () => {
    /* Esta es la propiedad importante: degradar a `DESCONOCIDO` en vez de
       aceptar cualquier cadena. */
    expect(normalizarEstadoBold("ALGO_NUEVO")).toBe("DESCONOCIDO");
    expect(normalizarEstadoBold(null)).toBe("DESCONOCIDO");
    expect(normalizarEstadoBold(42)).toBe("DESCONOCIDO");
    expect(esAprobado(normalizarEstadoBold("ALGO_NUEVO"))).toBe(false);
  });

  it("normaliza minúsculas y espacios", () => {
    expect(normalizarEstadoBold(" approved ")).toBe("APPROVED");
  });

  it("cada tipo de evento implica su estado", () => {
    expect(estadoDeEvento("SALE_APPROVED")).toBe("APPROVED");
    expect(estadoDeEvento("SALE_REJECTED")).toBe("REJECTED");
    expect(estadoDeEvento("VOID_APPROVED")).toBe("VOIDED");
    /* Una anulación que falla deja el cobro como estaba: aprobado. */
    expect(estadoDeEvento("VOID_REJECTED")).toBe("APPROVED");
  });
});

/* ===========================================================================
 * 6. Leer el evento del webhook
 * ======================================================================== */

describe("lectura del evento del webhook", () => {
  /* El ejemplo de «Tarjeta Web», que es la integración del Botón de pagos. */
  const EVENTO = {
    id: "e4f8c1b9-3d02-4a7c-8e51-f672a9b3d0e4",
    type: "SALE_APPROVED",
    subject: "F8A5D6B7G2H1",
    source: "/payments",
    spec_version: "1.0",
    time: 1761060600000000000,
    data: {
      payment_id: "F8A5D6B7G2H1",
      merchant_id: "PQR6Y4T8Z3",
      created_at: "2026-10-01T11:30:15-05:00",
      amount: { currency: "COP", total: 175000, taxes: [], tip: 0 },
      metadata: { reference: "LF-2026-0042-1759340000000" },
      bold_code: "B000",
      payer_email: "huesped@ejemplo.com",
      payment_method: "CARD_WEB",
      card: { brand: "VISA", masked_pan: "451732******0019", installments: 1 },
      integration: "BUTTON",
    },
    datacontenttype: "application/json",
  };

  it("saca la referencia de data.metadata.reference", () => {
    /*
      Es el campo que une el evento con nuestra fila de `pagos`, y la
      documentación lo dice literalmente para esta integración: «Botón de pagos →
      valor del atributo `order-id`».
    */
    const leido = leerEventoBold(EVENTO);
    expect(leido?.referencia).toBe("LF-2026-0042-1759340000000");
  });

  it("saca el id de la notificación, la transacción, el monto y el método", () => {
    const leido = leerEventoBold(EVENTO);
    expect(leido?.id).toBe("e4f8c1b9-3d02-4a7c-8e51-f672a9b3d0e4");
    expect(leido?.transaccionId).toBe("F8A5D6B7G2H1");
    expect(leido?.monto).toBe(175000);
    expect(leido?.moneda).toBe("COP");
    expect(leido?.metodo).toBe("CARD_WEB");
    expect(leido?.integracion).toBe("BUTTON");
  });

  it("cae a `subject` cuando no hay data.payment_id", () => {
    const sinPaymentId = {
      ...EVENTO,
      data: { ...EVENTO.data, payment_id: undefined },
    };
    expect(leerEventoBold(sinPaymentId)?.transaccionId).toBe("F8A5D6B7G2H1");
  });

  it("devuelve null para lo que no es un evento de Bold", () => {
    /* El webhook tiene que poder responder 200 a un cuerpo basura sin caerse:
       un 500 hace que Bold reintente cinco veces algo que nunca va a servir. */
    expect(leerEventoBold(null)).toBeNull();
    expect(leerEventoBold("texto")).toBeNull();
    expect(leerEventoBold({})).toBeNull();
    expect(leerEventoBold({ type: "ALGO_RARO" })).toBeNull();
    expect(leerEventoBold({ type: 7 })).toBeNull();
  });

  it("no revienta con un evento sin referencia (los del datáfono)", () => {
    const deDatafono = {
      ...EVENTO,
      data: { ...EVENTO.data, metadata: { reference: null } },
    };
    const leido = leerEventoBold(deDatafono);
    expect(leido).not.toBeNull();
    expect(leido?.referencia).toBeNull();
  });

  it("no revienta con un evento sin `data`", () => {
    const leido = leerEventoBold({ id: "x", type: "SALE_REJECTED" });
    expect(leido?.tipo).toBe("SALE_REJECTED");
    expect(leido?.monto).toBeNull();
    expect(leido?.referencia).toBeNull();
  });
});

/* ===========================================================================
 * 7. Leer la respuesta de la API de estado
 * ======================================================================== */

describe("lectura de la API de consulta de estado", () => {
  it("lee la forma plana que documenta Bold", () => {
    const leido = leerConsultaEstado({
      link_id: "BTN_8NSUASQINB",
      transaction_id: "CNPVI70CQC0EY",
      total: 175000,
      subtotal: 175000,
      description: "LF-2026-0042",
      reference_id: "LF-2026-0042-1759340000000",
      payment_method: "CREDIT_CARD",
      payer_email: "huesped@ejemplo.com",
      transaction_date: "2026-10-01 17:27:16-05:00",
      payment_status: "APPROVED",
    });

    expect(leido.fallo).toBe(false);
    expect(leido.estado).toBe("APPROVED");
    expect(leido.transaccionId).toBe("CNPVI70CQC0EY");
    expect(leido.total).toBe(175000);
  });

  it("lee también la forma envuelta en `payload`", () => {
    /* Observado contra el ambiente de pruebas el 2026-10-01: Bold usa las dos. */
    const leido = leerConsultaEstado({
      payload: { payment_status: "REJECTED", total: 175000 },
      errors: [],
    });
    expect(leido.estado).toBe("REJECTED");
    expect(leido.total).toBe(175000);
  });

  it("una venta sin intentos de pago es NO_TRANSACTION_FOUND, no un fallo", () => {
    const leido = leerConsultaEstado({
      link_id: "BTN_BJDNPZZDC5",
      total: 200000,
      reference_id: "ABCD2000",
      payment_status: "NO_TRANSACTION_FOUND",
    });
    expect(leido.fallo).toBe(false);
    expect(leido.estado).toBe("NO_TRANSACTION_FOUND");
  });

  it("marca `fallo` cuando la respuesta no trae estado", () => {
    /* Y `fallo: true` nunca se traduce en «aprobado». */
    expect(leerConsultaEstado({}).fallo).toBe(true);
    expect(leerConsultaEstado(null).fallo).toBe(true);
    expect(leerConsultaEstado({ errors: [{ message: "no encontrada" }] }).fallo).toBe(
      true,
    );
    expect(esAprobado(leerConsultaEstado({}).estado)).toBe(false);
  });
});

/* ===========================================================================
 * 8. Textos
 * ======================================================================== */

describe("textos para la pasarela y el panel", () => {
  it("la descripción respeta los 100 caracteres de Bold", () => {
    const larga = descripcionParaBold("A".repeat(300));
    expect(larga.length).toBeLessThanOrEqual(100);
  });

  it("la descripción no puede llevar una URL", () => {
    /* «No puede contener ninguna URL». Si se cuela, Bold rechaza la venta. */
    const limpia = descripcionParaBold(
      "Reserva en https://lafincaecohotel.com y en www.otro.com",
    );
    expect(limpia).not.toContain("http");
    expect(limpia).not.toContain("www.");
  });

  it("nunca devuelve una descripción de menos de 2 caracteres", () => {
    /* «deberá tener un mínimo de 2». Una descripción que se queda vacía tras
       limpiar una URL caería por debajo. */
    expect(descripcionParaBold("https://solo-una-url.com").length).toBeGreaterThanOrEqual(
      2,
    );
    expect(descripcionParaBold("").length).toBeGreaterThanOrEqual(2);
  });

  it("traduce los métodos de pago al español", () => {
    expect(etiquetaMetodoPago("CARD_WEB")).toBe("Tarjeta");
    expect(etiquetaMetodoPago("PSE")).toBe("PSE");
    expect(etiquetaMetodoPago("BOTON_BANCOLOMBIA")).toBe("Botón Bancolombia");
    expect(etiquetaMetodoPago(null)).toBeNull();
    /* Lo que no esté en el mapa se devuelve tal cual, que es más útil que
       «Otro»: al menos se puede buscar en la documentación de Bold. */
    expect(etiquetaMetodoPago("METODO_NUEVO")).toBe("METODO_NUEVO");
  });
});
