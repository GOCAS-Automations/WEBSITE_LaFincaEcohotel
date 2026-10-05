import Link from "next/link";

import { IconoCheck, IconoWhatsapp } from "@/components/sitio/iconos";
import { Boton } from "@/components/ui/boton";
import { Seccion } from "@/components/ui/seccion";
import { getContacto } from "@/lib/contenido";
import { leerRangoFechas } from "@/lib/admin/fechas";
import { HORARIO_DIA_POR_DEFECTO } from "@/lib/reserva/dia-de-calma";
import {
  ETIQUETA_ESTADO_BOLD,
  boldConfigurado,
  esAprobado,
  esRechazado,
  etiquetaMetodoPago,
  normalizarEstadoBold,
  referenciaValida,
  type EstadoBold,
} from "@/lib/pagos/bold";
import { reconciliarPago } from "@/lib/pagos/reconciliar";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { formatearCOP, formatearEstadia, formatearFecha } from "@/lib/utils/formato";
import { enlaceWhatsapp } from "@/lib/whatsapp";
import { LLEGADA } from "@/lib/email/plantillas";

/**
 * Lo que ve el huésped al volver de la pasarela.
 *
 * ===========================================================================
 * ESTA PÁGINA **RECONCILIA** ANTES DE PINTAR (2026-10-02)
 * ===========================================================================
 * Antes solo leía, porque la reserva la confirmaba el webhook y solo el webhook.
 * Eso se rompió en pruebas de la peor manera: dos pagos reales en el sandbox de
 * Bold, **cero eventos de webhook**, y una reserva pagada cancelada sola al
 * vencer su hold. En producción eso es un huésped que paga y se queda sin
 * reserva, así que el webhook dejó de ser la única vía.
 *
 * Lo primero que hace esta página es `reconciliarPago()`: le **pregunta a la API
 * de Bold** con nuestra llave y, si dice `APPROVED`, aplica exactamente la misma
 * transición que el webhook (`src/lib/pagos/aplicar-estado.ts`). Así el huésped
 * que vuelve de pagar ve su reserva confirmada aunque no llegue ningún evento.
 *
 * **Y lo que dice la URL se sigue ignorando por completo.** Bold añade
 * `?bold-order-id=…&bold-tx-status=…` al volver, pero `bold-tx-status` es un
 * parámetro del navegador: cualquiera puede escribir `approved` a mano. Lo único
 * que se usa de la dirección es la **referencia**, que no es una afirmación sino
 * una pregunta; la respuesta la da Bold. Es la intención del requisito 2 de
 * `docs/AUDITORIA_SEGURIDAD.md`, no su contradicción.
 *
 * ---------------------------------------------------------------------------
 * «PENDIENTE» ES UN ESTADO DE PRIMERA CLASE, NO UN ERROR
 * ---------------------------------------------------------------------------
 * La documentación de Bold avisa de dos cosas que hacen que el caso normal sea,
 * a veces, «todavía no se sabe»:
 *
 *   · «La transacción puede demorar un tiempo en verse reflejada cuando el
 *     comprador finaliza y vuelve a tu tienda, por lo que la respuesta de la API
 *     puede que sea NO_TRANSACTION_FOUND».
 *   · «La transacción aparecerá disponible para consulta en **hasta 10
 *     minutos**».
 *
 * Así que el huésped puede volver con el pago hecho y nosotros sin saberlo
 * todavía. La pantalla lo dice tal cual —«puede tardar unos minutos y te llega
 * un correo»— en vez de inventar un «rechazado» que asustaría a alguien que
 * acaba de pagar. Y hay un enlace para recargar, porque a los treinta segundos
 * suele ya estar.
 *
 * ---------------------------------------------------------------------------
 * LO QUE SE PINTA SALE DE LA BASE, YA RECONCILIADA
 * ---------------------------------------------------------------------------
 * El orden es: reconciliar primero, leer después. Así no hay dos versiones que
 * comparar: cuando se pinta la pantalla, `pagos.estado` **ya es** lo que acaba de
 * decir Bold, y `reservas.estado` ya refleja lo que eso significa. Si la consulta
 * a Bold no se pudo hacer, no se escribe nada y se pinta lo que había, diciendo
 * en pantalla que no se pudo preguntar.
 *
 * Nunca se pinta una reserva como confirmada si no está confirmada en la base.
 */

type Props = {
  referencia: string;
  /** `true` cuando el huésped volvió por la URL de abandono de Bold. */
  abandono: boolean;
};

/** Lo que esta pantalla necesita saber, ya resuelto. */
type Vista = {
  encontrada: boolean;
  codigo: string | null;
  tipo: "hospedaje" | "dia" | null;
  entrada: string | null;
  salida: string | null;
  alojamiento: string | null;
  plan: string | null;
  total: number;
  pagado: number;
  saldo: number;
  estadoReserva: string | null;
  estadoPago: EstadoBold;
  metodo: string | null;
  /** `true` si no se pudo preguntar a Bold. */
  consultaFallida: boolean;
};

export async function PaginaConfirmacion({ referencia, abandono }: Props) {
  const contacto = await getContacto();
  const vista = await resolver(referencia);

  const whatsapp = (mensaje: string) => enlaceWhatsapp(mensaje, contacto.whatsapp);

  /* --- Qué cara tiene esta página -------------------------------------- */

  const confirmada = vista.estadoReserva === "confirmada";
  const aprobado = confirmada || esAprobado(vista.estadoPago);
  /*
    LA RESERVA CANCELADA ES SU PROPIO CASO, Y HACE FALTA.

    Es lo que ve quien abandonó el checkout y vuelve media hora más tarde: el
    barrido ya canceló la solicitud y liberó las fechas. Enseñarle «estamos
    confirmando tu pago» sería mentirle —no hay nada que confirmar— y enseñarle
    «el pago fue rechazado» también, porque no hubo pago. Se le dice que caducó y
    se le ofrece volver a empezar.
  */
  const caducada = !aprobado && vista.estadoReserva === "cancelada";
  const rechazado = !aprobado && !caducada && esRechazado(vista.estadoPago);
  /* Todo lo demás —en proceso, sin transacción, no se pudo preguntar, o Bold
     dice aprobado pero el webhook aún no ha pasado— es «pendiente». */

  return (
    <Seccion fondo="crema" espacio="amplio">
      <div className="mx-auto flex max-w-2xl flex-col gap-7">
        {!vista.encontrada ? (
          <Tarjeta
            tono="neutro"
            titulo="No encontramos esa reserva"
            entrada={
              referencia
                ? "El enlace puede haber caducado o la referencia no corresponde a ninguna reserva nuestra."
                : "Llegaste a esta página sin una referencia de pago."
            }
          >
            <p className="text-sm leading-relaxed text-crema-700">
              Si acabas de pagar y ves esto, no vuelvas a pagar: escríbenos por
              WhatsApp con tu nombre y las fechas y lo revisamos en el momento.
            </p>
            <Acciones>
              <Boton
                href={whatsapp(
                  "Hola, acabo de hacer un pago en el sitio y no encuentro mi reserva. ¿Me ayudan a revisarla?",
                )}
                externo
                tamano="grande"
              >
                <IconoWhatsapp className="size-5" />
                Escribir por WhatsApp
              </Boton>
              <Boton href="/reservar" variante="contorno" tamano="grande">
                Volver a reservar
              </Boton>
            </Acciones>
          </Tarjeta>
        ) : aprobado ? (
          <Tarjeta
            tono="ok"
            titulo="¡Listo! Tu reserva está confirmada"
            entrada={
              vista.codigo
                ? `Tu código de reserva es ${vista.codigo}. Guárdalo: es lo que te vamos a preguntar cuando llegues.`
                : "Recibimos tu pago."
            }
          >
            <Resumen vista={vista} />

            <div className="flex flex-col gap-2">
              <p className="font-titulo text-sm font-bold text-petroleo-900">
                Qué sigue
              </p>
              <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-crema-700">
                <li className="flex gap-2">
                  <IconoCheck className="mt-0.5 size-4 shrink-0 text-petroleo-600" />
                  <span>
                    Te enviamos un correo con la confirmación, cómo llegar y los
                    horarios. Si no lo ves en unos minutos, revisa el correo no
                    deseado.
                  </span>
                </li>
                {vista.saldo > 0 ? (
                  <li className="flex gap-2">
                    <IconoCheck className="mt-0.5 size-4 shrink-0 text-petroleo-600" />
                    <span>
                      Queda un saldo de{" "}
                      <strong>{formatearCOP(vista.saldo)}</strong>. Lo pagas
                      antes de llegar, por un link de pago que te enviamos: en la
                      finca no hay datáfono ni se maneja efectivo.
                    </span>
                  </li>
                ) : (
                  <li className="flex gap-2">
                    <IconoCheck className="mt-0.5 size-4 shrink-0 text-petroleo-600" />
                    <span>
                      Pagaste el total: llegas sin nada pendiente.
                    </span>
                  </li>
                )}
                <li className="flex gap-2">
                  <IconoCheck className="mt-0.5 size-4 shrink-0 text-petroleo-600" />
                  <span>
                    {vista.tipo === "dia"
                      ? `El Día de Calma es de ${HORARIO_DIA_POR_DEFECTO}.`
                      : `Entrada desde las ${LLEGADA.checkIn}, con llegada a más tardar a las ${LLEGADA.hasta}, y salida hasta las ${LLEGADA.checkOut}` /* La hora ya termina en punto («12:00 m.»): otro punto aquí sería «m..». */}
                  </span>
                </li>
              </ul>
            </div>

            <Acciones>
              <Boton
                href={whatsapp(
                  `Hola, soy ${vista.codigo ?? "un huésped"} y tengo una pregunta sobre mi reserva.`,
                )}
                externo
                variante="contorno"
                tamano="grande"
              >
                <IconoWhatsapp className="size-5" />
                Escribirnos
              </Boton>
              <Boton href="/" variante="secundario" tamano="grande">
                Volver al inicio
              </Boton>
            </Acciones>
          </Tarjeta>
        ) : caducada ? (
          <Tarjeta
            tono="alerta"
            titulo="Esa solicitud ya caducó"
            entrada="Apartamos tus fechas 30 minutos mientras pagabas y el plazo se cumplió sin que el pago entrara, así que volvieron a quedar libres. No se te cobró nada."
          >
            <Resumen vista={vista} />

            <p className="text-sm leading-relaxed text-crema-700">
              Si todavía quieres esas fechas, vuelve a empezar: el proceso es el
              mismo y lo normal es que sigan disponibles. Si prefieres que te
              ayudemos, escríbenos y lo cerramos contigo por WhatsApp.
            </p>

            <Acciones>
              <Boton href="/reservar" tamano="grande">
                Volver a reservar
              </Boton>
              <Boton
                href={whatsapp(
                  `Hola, mi solicitud de reserva${vista.codigo ? ` (${vista.codigo})` : ""} caducó antes de que pudiera pagar. ¿Me ayudan a cerrarla?`,
                )}
                externo
                variante="contorno"
                tamano="grande"
              >
                <IconoWhatsapp className="size-5" />
                Escribir por WhatsApp
              </Boton>
            </Acciones>
          </Tarjeta>
        ) : rechazado ? (
          <Tarjeta
            tono="alerta"
            titulo={
              vista.estadoPago === "VOIDED"
                ? "El pago se anuló"
                : "El pago no se completó"
            }
            entrada={
              vista.estadoPago === "VOIDED"
                ? "La transacción quedó anulada, así que la reserva también. Si fue un error, escríbenos y la volvemos a armar."
                : "El banco no autorizó el cobro. No se te descontó nada."
            }
          >
            <Resumen vista={vista} />

            <div className="flex flex-col gap-2">
              <p className="font-titulo text-sm font-bold text-petroleo-900">
                Qué puedes hacer
              </p>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-crema-700">
                <li>
                  <strong>Intentarlo con otro medio de pago.</strong> Bold admite
                  tarjeta, PSE, Nequi y botón Bancolombia; a veces la tarjeta no
                  pasa y PSE sí.
                </li>
                <li>
                  <strong>Revisar el cupo o el límite de compras por internet</strong>{" "}
                  con tu banco. Es el motivo más común.
                </li>
                <li>
                  <strong>Escribirnos por WhatsApp.</strong> Cerramos la reserva
                  contigo y te enviamos un link de pago aparte.
                </li>
              </ul>
              <p className="text-sm leading-relaxed text-crema-700">
                Las fechas que habías elegido se liberan solas en unos minutos si
                no completas el pago, así que si quieres volver a intentarlo,
                hazlo ahora.
              </p>
            </div>

            <Acciones>
              <Boton href="/reservar" tamano="grande">
                Volver a intentarlo
              </Boton>
              <Boton
                href={whatsapp(
                  `Hola, intenté pagar mi reserva${vista.codigo ? ` (${vista.codigo})` : ""} y el pago no pasó. ¿Me ayudan?`,
                )}
                externo
                variante="contorno"
                tamano="grande"
              >
                <IconoWhatsapp className="size-5" />
                Escribir por WhatsApp
              </Boton>
            </Acciones>
          </Tarjeta>
        ) : (
          <Tarjeta
            tono="espera"
            titulo={
              abandono
                ? "Dejaste el pago a medias"
                : "Estamos confirmando tu pago"
            }
            entrada={
              abandono
                ? "Salimos de la pasarela antes de terminar. Tu solicitud sigue apartada unos minutos: si vuelves ahora, las fechas siguen siendo tuyas."
                : "La confirmación del banco puede tardar unos minutos en llegarnos. En cuanto llegue, te enviamos el correo con tu reserva confirmada."
            }
          >
            <Resumen vista={vista} />

            <div className="flex flex-col gap-2">
              <p className="font-titulo text-sm font-bold text-petroleo-900">
                Qué está pasando
              </p>
              <p className="text-sm leading-relaxed text-crema-700">
                {abandono
                  ? "Si cambiaste de idea, no tienes que hacer nada: la reserva se cancela sola y las fechas vuelven a quedar libres."
                  : "Tu banco nos está respondiendo. Mientras eso pasa, tu reserva queda apartada. No vuelvas a pagar: si el cobro pasó, lo veremos y te lo confirmamos por correo."}
              </p>
              {vista.consultaFallida ? (
                <p className="text-sm leading-relaxed text-crema-700">
                  Ahora mismo no pudimos preguntarle a la pasarela. Vuelve a
                  cargar la página en un minuto.
                </p>
              ) : null}
            </div>

            <Acciones>
              {/* Un enlace a esta misma dirección: recargar es exactamente lo
                  que hay que hacer, y así no hace falta JavaScript. */}
              <Boton
                href={`/reservar/confirmacion?ref=${encodeURIComponent(referencia)}`}
                tamano="grande"
              >
                Volver a comprobar
              </Boton>
              <Boton
                href={whatsapp(
                  `Hola, pagué mi reserva${vista.codigo ? ` (${vista.codigo})` : ""} y quiero confirmar que les llegó.`,
                )}
                externo
                variante="contorno"
                tamano="grande"
              >
                <IconoWhatsapp className="size-5" />
                Escribir por WhatsApp
              </Boton>
            </Acciones>
          </Tarjeta>
        )}

        <p className="text-center text-xs leading-relaxed text-crema-600">
          La Finca Eco Hotel · RNT 114565. ¿Dudas con tu reserva?{" "}
          <Link
            href="/contacto"
            className="font-semibold text-petroleo-700 underline decoration-petroleo-300 underline-offset-2 hover:decoration-petroleo-600"
          >
            Escríbenos
          </Link>
          .
        </p>
      </div>
    </Seccion>
  );
}

/* ===========================================================================
 * Leer el estado real
 * ======================================================================== */

const VACIA: Vista = {
  encontrada: false,
  codigo: null,
  tipo: null,
  entrada: null,
  salida: null,
  alojamiento: null,
  plan: null,
  total: 0,
  pagado: 0,
  saldo: 0,
  estadoReserva: null,
  estadoPago: "DESCONOCIDO",
  metodo: null,
  consultaFallida: false,
};

async function resolver(referencia: string): Promise<Vista> {
  /* Una referencia con una forma que Bold no admitiría no puede existir en
     `pagos`: se corta antes de consultar nada. También evita que alguien use
     este parámetro para inyectar algo en la URL de la API. */
  if (!referencia || !referenciaValida(referencia)) return VACIA;
  if (!boldConfigurado()) return VACIA;

  try {
    const supabase = crearClienteAdmin();

    /*
      ================================================================
      PRIMERO RECONCILIAR, DESPUÉS LEER. **Este orden es la corrección.**
      ================================================================
      Le pregunta a Bold por esta referencia y, si el pago está aprobado, aplica
      la misma transición que el webhook: reserva `confirmada`, `monto_pagado`,
      `expira_at` a nulo, correos y evento del calendario.

      Es idempotente: si el webhook ya pasó, `reconciliarPago()` ve el pago en un
      estado final coherente, **ni llama a Bold ni escribe nada** y no reenvía
      ningún correo. Recargar esta página cien veces no duplica nada.

      Nunca lanza, así que un fallo de Bold no deja al huésped sin comprobante:
      se pinta lo que haya en la base y se le dice que no se pudo preguntar.
    */
    const reconciliacion = await reconciliarPago(referencia, { supabase });

    /* La fila de `pagos` se lee DESPUÉS, para que refleje lo que se acabó de
       escribir. */
    const filaPago = await supabase
      .from("pagos")
      .select("reserva_id, monto, estado, metodo")
      .eq("referencia", referencia)
      .maybeSingle();

    if (filaPago.error || !filaPago.data) return VACIA;

    const reservaId = filaPago.data.reserva_id
      ? String(filaPago.data.reserva_id)
      : null;

    let reserva:
      | {
          codigo: string;
          tipo: string;
          estancia: string;
          total: number;
          monto_pagado: number;
          estado: string;
          alojamiento_id: string | null;
          plan_id: string | null;
        }
      | null = null;

    if (reservaId) {
      const { data } = await supabase
        .from("reservas")
        .select(
          "codigo, tipo, estancia, total, monto_pagado, estado, alojamiento_id, plan_id",
        )
        .eq("id", reservaId)
        .maybeSingle();
      if (data) {
        reserva = {
          codigo: String(data.codigo),
          tipo: String(data.tipo),
          estancia: String(data.estancia),
          total: Number(data.total ?? 0),
          monto_pagado: Number(data.monto_pagado ?? 0),
          estado: String(data.estado),
          alojamiento_id: data.alojamiento_id ? String(data.alojamiento_id) : null,
          plan_id: data.plan_id ? String(data.plan_id) : null,
        };
      }
    }

    /* Los nombres de la cabaña y del plan: dos consultas pequeñas y solo si hay
       algo que nombrar. */
    const [alojamiento, plan] = await Promise.all([
      reserva?.alojamiento_id
        ? supabase
            .from("alojamientos")
            .select("nombre")
            .eq("id", reserva.alojamiento_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      reserva?.plan_id
        ? supabase
            .from("planes")
            .select("nombre")
            .eq("id", reserva.plan_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const rango = reserva ? leerRangoFechas(reserva.estancia) : null;

    /*
      QUÉ ESTADO DE PAGO SE MUESTRA: **el de la base, ya reconciliado.**

      Después de `reconciliarPago()`, `pagos.estado` es lo que acaba de decir
      Bold (o lo que ya había, si Bold no respondió o todavía no ve la
      transacción). No hay nada que comparar: una sola fuente, y es la que el
      panel y los correos también leen.

      La única corrección que sigue hecha falta es la de abajo: una reserva
      `confirmada` se pinta como pago aprobado aunque su fila de `pagos` diga otra
      cosa, porque el dinero puede haber entrado por otra vía (una transferencia
      que el equipo apuntó a mano, o una confirmación hecha desde el panel).
    */
    const estadoGuardado = normalizarEstadoBold(filaPago.data.estado);

    const estadoPago: EstadoBold =
      reserva?.estado === "confirmada" ? "APPROVED" : estadoGuardado;

    const total = reserva?.total ?? 0;
    const pagado = reserva?.monto_pagado ?? 0;

    return {
      encontrada: true,
      codigo: reserva?.codigo ?? null,
      tipo: reserva ? (reserva.tipo === "dia" ? "dia" : "hospedaje") : null,
      entrada: rango?.inicio ?? null,
      salida: rango?.fin ?? null,
      alojamiento: alojamiento.data?.nombre ? String(alojamiento.data.nombre) : null,
      plan: plan.data?.nombre ? String(plan.data.nombre) : null,
      total,
      pagado,
      saldo: Math.max(0, total - pagado),
      estadoReserva: reserva?.estado ?? null,
      estadoPago,
      metodo:
        etiquetaMetodoPago(reconciliacion.consulta?.metodo) ??
        etiquetaMetodoPago(
          typeof filaPago.data.metodo === "string" ? filaPago.data.metodo : null,
        ),
      /* Solo cuando de verdad no se pudo preguntar. Un «Bold todavía no ve la
         transacción» no es un fallo: es el caso normal del primer minuto, y la
         pantalla ya lo cuenta como «estamos confirmando tu pago». */
      consultaFallida: reconciliacion.clave === "sin_respuesta",
    };
  } catch (error) {
    console.error(
      "[confirmacion] no se pudo resolver el estado del pago:",
      error instanceof Error ? error.message : error,
    );
    return VACIA;
  }
}

/* ===========================================================================
 * Piezas
 * ======================================================================== */

const TONOS = {
  ok: "bg-petroleo-50 ring-petroleo-200",
  espera: "bg-dorado-50 ring-dorado-200",
  alerta: "bg-crema-100 ring-crema-300",
  neutro: "bg-white ring-crema-200",
} as const;

function Tarjeta({
  tono,
  titulo,
  entrada,
  children,
}: {
  tono: keyof typeof TONOS;
  titulo: string;
  entrada: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-5 rounded-[var(--radius-generoso)] p-6 ring-1 sm:p-8 ${TONOS[tono]}`}
    >
      <div className="flex flex-col gap-2">
        <h1 className="font-titulo text-2xl leading-tight font-bold text-petroleo-900 sm:text-3xl">
          {titulo}
        </h1>
        <p className="leading-relaxed text-crema-700">{entrada}</p>
      </div>
      {children}
    </div>
  );
}

function Acciones({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-3 pt-1">{children}</div>;
}

/** El resumen de qué se reservó y cómo va el dinero. */
function Resumen({ vista }: { vista: Vista }) {
  if (!vista.codigo) return null;

  const filas: { etiqueta: string; valor: string }[] = [
    { etiqueta: "Código", valor: vista.codigo },
  ];

  if (vista.tipo === "dia" && vista.entrada) {
    filas.push({ etiqueta: "Día", valor: formatearFecha(vista.entrada) });
    if (vista.plan) filas.push({ etiqueta: "Plan", valor: vista.plan });
  } else if (vista.entrada && vista.salida) {
    filas.push({
      etiqueta: "Estadía",
      valor: formatearEstadia(vista.entrada, vista.salida),
    });
    if (vista.alojamiento) {
      filas.push({ etiqueta: "Cabaña", valor: vista.alojamiento });
    }
    if (vista.plan) filas.push({ etiqueta: "Plan", valor: vista.plan });
  }

  filas.push({ etiqueta: "Total de la reserva", valor: formatearCOP(vista.total) });
  filas.push({ etiqueta: "Pagado", valor: formatearCOP(vista.pagado) });
  if (vista.saldo > 0) {
    filas.push({ etiqueta: "Saldo pendiente", valor: formatearCOP(vista.saldo) });
  }
  filas.push({
    etiqueta: "Estado del pago",
    valor:
      ETIQUETA_ESTADO_BOLD[vista.estadoPago] +
      (vista.metodo ? ` · ${vista.metodo}` : ""),
  });

  return (
    <dl className="grid gap-x-6 gap-y-2.5 rounded-[var(--radius-tarjeta)] bg-white/70 p-4 text-sm sm:grid-cols-2">
      {filas.map((fila) => (
        <div key={fila.etiqueta} className="flex flex-col gap-0.5">
          <dt className="text-xs font-semibold tracking-wide text-crema-600 uppercase">
            {fila.etiqueta}
          </dt>
          <dd className="font-medium text-petroleo-900">{fila.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
