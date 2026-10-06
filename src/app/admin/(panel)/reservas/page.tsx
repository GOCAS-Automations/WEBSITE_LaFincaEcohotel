import type { Metadata } from "next";

import { CalendarioMes } from "./calendario";
import { BloqueDiagnosticoCalendario } from "./diagnostico-calendario";
import { EstadoCalendarioHotel } from "./estado-calendario";
import { ListadoReservas } from "./listado";
import { Aviso } from "@/components/admin/aviso";
import { EnlaceBoton, EncabezadoPagina } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import {
  bloqueosEnRango,
  listarReservas,
  opcionesAlojamiento,
  personasDeDiaPorFecha,
  reservasEnRango,
} from "@/lib/admin/datos";
import {
  claveMes,
  diasDelMes,
  isoDe,
  leerClaveMes,
  sumarDiasISO,
  tituloMes,
} from "@/lib/admin/fechas";
import {
  armarListado,
  leerFiltrosListado,
  parametrosDeFiltros,
} from "@/lib/admin/listado-reservas";
import { resumirPagoDeReserva, ultimoPagoPorReserva } from "@/lib/admin/pagos";
import { liberarReservasVencidas } from "@/lib/reserva/liberar-vencidas";
import { ocupacionDelCalendario } from "@/lib/reserva/ocupacion-externa";

export const metadata: Metadata = { title: "Reservas" };
export const dynamic = "force-dynamic";

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function PaginaReservas({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    error?: string;
    mes?: string;
    /** Abre el detalle del Día de Calma de ese día (`AAAA-MM-DD`). */
    dia?: string;
    ver?: string;
    origen?: string;
    estado?: string;
  }>;
}) {
  const { supabase, rol } = await requireAdmin();
  const params = await searchParams;

  /* `?dia=` sin `?mes=` (el enlace de la ficha lo lleva, pero por si acaso):
     el mes es el de ese día. */
  const diaPedido =
    typeof params.dia === "string" && FECHA_ISO.test(params.dia) ? params.dia : null;
  const mes = leerClaveMes(params.mes ?? diaPedido?.slice(0, 7));
  const primerDia = isoDe(mes, 1);
  const finDeMes = sumarDiasISO(isoDe(mes, diasDelMes(mes)), 1);
  const diaAbierto =
    diaPedido && diaPedido >= primerDia && diaPedido < finDeMes ? diaPedido : null;

  const filtros = leerFiltrosListado(params);

  /*
    AL ENTRAR AL CALENDARIO SE BARREN LAS VENCIDAS.

    Es la pantalla que el hotel abre para saber qué días tiene libres, así que es
    justo donde una solicitud caducada que siguiera diciendo «pendiente» haría
    más daño: el equipo rechazaría por teléfono una noche que está libre.

    El barrido cancela las que ya vencieron, así que lo que se lee justo después
    ya está limpio. `ocupaCalendario()` sigue aplicándose encima —el barrido
    puede fallar y la página no puede depender de él—, pero con las dos cosas el
    listado y el calendario dicen lo mismo. Nunca lanza.
  */
  await liberarReservasVencidas(supabase);

  /* Un solo instante para toda la pantalla: dos `new Date()` distintos podrían
     dejar el calendario y el listado a lados opuestos de un vencimiento. */
  const ahora = new Date();

  /* La ocupación se pide desde la NOCHE ANTERIOR al día 1: la agenda del
     celular tiene que decir quién sale la mañana del 1, y esa estadía empezó
     el mes pasado. La cuadrícula no la pinta (no ocupa ninguna noche del mes). */
  const desdeNocheAnterior = sumarDiasISO(primerDia, -1);

  const [
    alojamientos,
    reservasDelMes,
    bloqueosDelMes,
    recientes,
    cupoDelMes,
    calendarioHotel,
  ] = await Promise.all([
    opcionesAlojamiento(supabase),
    reservasEnRango(supabase, desdeNocheAnterior, finDeMes),
    bloqueosEnRango(supabase, desdeNocheAnterior, finDeMes),
    /* «Todas las fechas»: la base, las últimas registradas primero. La vista
       del mes no la necesita: usa las reservas del mes de arriba. */
    filtros.vista === "todas"
      ? listarReservas(supabase, {
          estado: filtros.estado === "todos" ? "todas" : filtros.estado,
        })
      : Promise.resolve([]),
    personasDeDiaPorFecha(supabase, primerDia, finDeMes),
    /* La capa de Google. Nunca lanza: si no está configurada o falla, viene
       con estado y una lista vacía, y el mes se pinta igual. */
    ocupacionDelCalendario(desdeNocheAnterior, finDeMes),
  ]);

  /*
    EL LISTADO: la base y el calendario del hotel, sin repetir nada. La misma
    lectura de Google que el calendario de arriba (y que el Resumen).
  */
  const listado = armarListado({
    reservas: filtros.vista === "todas" ? recientes : reservasDelMes,
    franjas: calendarioHotel.ocupacion,
    diasDeCalma: calendarioHotel.diasDeCalma,
    alojamientos,
    rango: filtros.vista === "todas" ? null : { desde: primerDia, hasta: finDeMes },
    filtros,
    ahora,
  });

  /*
    EL ÚLTIMO PAGO DE CADA RESERVA DEL LISTADO, EN UNA SOLA CONSULTA.

    Una por fila serían hasta 300 viajes a la base para pintar una pastilla. Esto
    es un `in (…)` y un `Map`. Nunca lanza: si la consulta falla, el mapa viene
    vacío y el listado se pinta igual, con la pastilla que salga de lo que ya
    tiene la reserva (`monto_pagado`).
  */
  const reservasDelListado = listado.filas.flatMap((fila) =>
    fila.tipo === "reserva" ? [fila.reserva] : [],
  );
  const ultimosPagos = await ultimoPagoPorReserva(
    supabase,
    reservasDelListado.map((reserva) => reserva.id),
  );
  /*
    PAGADA O PENDIENTE DE COBRO, DE UN VISTAZO.

    El estado de la reserva («confirmada») y el del dinero son dos cosas
    distintas: una confirmada puede tener la mitad por cobrar, y una pendiente
    puede tener un pago en curso en la pasarela ahora mismo. El equipo necesita
    las dos, así que hay dos pastillas y no una que las mezcle.
  */
  const pagos = new Map(
    reservasDelListado.map((reserva) => [
      reserva.id,
      resumirPagoDeReserva(
        reserva.total,
        reserva.monto_pagado,
        ultimosPagos.get(reserva.id),
        reserva.estado,
      ),
    ]),
  );

  const [nombreMes] = tituloMes(mes).split(" ");
  const mesEnPalabras = `${nombreMes.toLowerCase()} de ${mes.anio}`;

  return (
    <>
      <EncabezadoPagina
        titulo="Reservas"
        descripcion="El calendario del mes con las cabañas y el cupo del Día de Calma y, más abajo, el listado de reservas de ese mes."
        accion={
          <EnlaceBoton href="/admin/reservas/nueva">Nueva reserva</EnlaceBoton>
        }
      />

      <Aviso ok={params.ok} error={params.error} />

      <CalendarioMes
        mes={mes}
        alojamientos={alojamientos}
        reservas={reservasDelMes}
        bloqueos={bloqueosDelMes}
        personasDeDia={cupoDelMes}
        ocupacionGoogle={calendarioHotel.ocupacion}
        diasDeCalmaGoogle={calendarioHotel.diasDeCalma}
        consulta={parametrosDeFiltros(filtros).toString()}
        diaAbierto={diaAbierto}
      />

      <EstadoCalendarioHotel
        estado={calendarioHotel.estado}
        mensaje={calendarioHotel.mensaje}
        consultado={calendarioHotel.consultado}
        mes={claveMes(mes)}
        avisos={calendarioHotel.avisos}
        lecturaIncompleta={calendarioHotel.lecturaIncompleta}
        escrituraSinPermiso={calendarioHotel.escrituraSinPermiso}
        /* Los identificadores de Google son cosa del propietario: a quien
           atiende el teléfono no le aportan nada. */
        detalle={rol === "propietario" ? <BloqueDiagnosticoCalendario /> : null}
      />

      <ListadoReservas
        listado={listado}
        filtros={filtros}
        mesClave={claveMes(mes)}
        mesEnPalabras={mesEnPalabras}
        calendario={{
          estado: calendarioHotel.estado,
          lecturaIncompleta: calendarioHotel.lecturaIncompleta,
        }}
        pagos={pagos}
        ahora={ahora}
      />
    </>
  );
}
