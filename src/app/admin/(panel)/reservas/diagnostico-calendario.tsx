import { Suspense } from "react";

import { Pastilla } from "@/components/admin/ui";
import { diagnosticoDelCalendario } from "@/lib/reserva/ocupacion-externa";

/**
 * «¿Qué calendarios de Google ve el sitio?», desplegable, en la pantalla de
 * Reservas.
 *
 * ---------------------------------------------------------------------------
 * PARA QUÉ SIRVE DE VERDAD
 * ---------------------------------------------------------------------------
 * Para no tener que pedirle al hotel el identificador de su calendario. En
 * cuanto alguien del hotel comparta un calendario con la cuenta de servicio,
 * aparece aquí con su **identificador completo**, listo para copiar en
 * `GOOGLE_CALENDAR_ID`. Antes de esto el camino era: explicarle por WhatsApp
 * dónde está «Integrar calendario», esperar, y confiar en que pegó bien una
 * cadena de sesenta caracteres.
 *
 * También dice lo contrario: un calendario que está en la variable pero que la
 * cuenta **no ve** (porque nadie lo compartió, o se dejó de compartir) es la
 * causa número uno de «el sitio no muestra lo que apuntamos».
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ VA PLEGADO Y DETRÁS DE UN SUSPENSE
 * ---------------------------------------------------------------------------
 * Preguntarle a Google qué calendarios ve la cuenta es una llamada de red más.
 * No puede retrasar el calendario del mes, que es lo que el equipo viene a ver:
 * el `<details>` se pinta enseguida y el contenido llega cuando llegue. La
 * respuesta se guarda cinco minutos (ver `ocupacion-externa.ts`), y el botón
 * «Actualizar ahora» la tira.
 *
 * Solo lo ve el **propietario**: son identificadores y nombres de variables, y a
 * quien atiende el teléfono no le aportan nada.
 */

/** Identificador tal cual, en una tipografía donde se distinga la l del 1. */
function Identificador({ id }: { id: string }) {
  return (
    <code
      title="Toca el identificador para seleccionarlo y poder copiarlo"
      className="select-all break-all rounded-[6px] bg-crema-900/[0.05] px-1.5 py-0.5 font-mono text-[0.6875rem] text-crema-800"
    >
      {id}
    </code>
  );
}

function Fila({
  children,
  tono = "normal",
}: {
  children: React.ReactNode;
  tono?: "normal" | "aviso";
}) {
  return (
    <li
      className={`rounded-suave px-3 py-2.5 ring-1 ${
        tono === "aviso"
          ? "bg-dorado-500/[0.08] ring-dorado-500/25"
          : "bg-crema-50 ring-crema-900/[0.06]"
      }`}
    >
      <div className="flex flex-col gap-1.5">{children}</div>
    </li>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[0.75rem] font-semibold text-crema-900">{children}</h3>
  );
}

function Nota({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.6875rem] leading-snug text-crema-600">{children}</p>
  );
}

async function DetalleCalendarios() {
  const diagnostico = await diagnosticoDelCalendario();

  if (!diagnostico.credencial) {
    return (
      <Nota>
        Falta la credencial de Google del sitio (la variable
        GOOGLE_CALENDAR_CREDENCIALES). Hasta que esté, el sitio no puede mirar
        ningún calendario. Lo pone quien administra el despliegue.
      </Nota>
    );
  }

  /* Los que la cuenta ve pero nadie puso en la variable: el hallazgo útil. */
  const sinConfigurar = (diagnostico.visibles ?? []).filter(
    (calendario) => !calendario.configurado,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Titulo>Cuenta de Google del sitio</Titulo>
        <Nota>
          Para que el sitio vea un calendario, hay que compartirlo con este
          correo y darle permiso de «Hacer cambios en eventos»:
        </Nota>
        <Identificador id={diagnostico.correoCuenta ?? "—"} />
      </div>

      <div className="flex flex-col gap-2">
        <Titulo>Calendarios configurados en el sitio</Titulo>
        {diagnostico.configurados.length === 0 ? (
          <Nota>
            Ninguno todavía. Cuando el hotel comparta su calendario, aparecerá
            más abajo con su identificador y bastará con copiarlo en la variable
            GOOGLE_CALENDAR_ID.
          </Nota>
        ) : (
          <ul className="flex flex-col gap-2">
            {diagnostico.configurados.map((calendario) => {
              const perdido = diagnostico.visibles !== null && !calendario.visible;
              return (
                <Fila key={calendario.id} tono={perdido ? "aviso" : "normal"}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pastilla tono={calendario.cabana === null ? "azul" : "verde"}>
                      {calendario.cabana === null
                        ? "General"
                        : `Cabaña ${calendario.cabana}`}
                    </Pastilla>
                    {calendario.deEscritura && (
                      <Pastilla tono="dorado">Aquí se apuntan las reservas</Pastilla>
                    )}
                    {perdido && <Pastilla tono="rojo">El sitio no lo ve</Pastilla>}
                  </div>
                  <Identificador id={calendario.id} />
                  <Nota>
                    {perdido
                      ? "Está en la configuración, pero la cuenta del sitio no lo tiene compartido. Revisa en Google Calendar que siga compartido con el correo de arriba, y que el identificador esté bien escrito."
                      : calendario.cabana === null
                        ? "Se mira el título de cada evento: si nombra una cabaña, ocupa esa; si no, se marcan las cinco por precaución."
                        : `Todo lo que haya en este calendario ocupa la Cabaña ${calendario.cabana}, diga lo que diga el título.`}
                  </Nota>
                </Fila>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Titulo>Calendarios que el sitio ya puede ver</Titulo>
        {diagnostico.errorVisibles ? (
          <Nota>
            No se pudo preguntar a Google qué calendarios están compartidos:{" "}
            {diagnostico.errorVisibles}
          </Nota>
        ) : sinConfigurar.length === 0 ? (
          <Nota>
            {diagnostico.visibles && diagnostico.visibles.length > 0
              ? "Todos los calendarios compartidos con la cuenta del sitio están ya configurados."
              : "Todavía no hay ningún calendario compartido con la cuenta del sitio. En Google Calendar: junto al nombre del calendario, «Configuración y uso compartido» → «Compartir con determinadas personas» → añadir el correo de arriba."}
          </Nota>
        ) : (
          <>
            <Nota>
              Están compartidos con la cuenta del sitio pero todavía no se usan.
              Para empezar a usar uno, hay que añadir su identificador a la
              variable GOOGLE_CALENDAR_ID (con «=3» detrás si es el calendario de
              la Cabaña 3).
            </Nota>
            <ul className="flex flex-col gap-2">
              {sinConfigurar.map((calendario) => (
                <Fila key={calendario.id}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[0.75rem] font-semibold text-crema-900">
                      {calendario.nombre}
                    </span>
                    <Pastilla tono="gris">Sin configurar</Pastilla>
                  </div>
                  <Identificador id={calendario.id} />
                  <Nota>Permiso que tiene el sitio sobre él: {calendario.acceso}.</Nota>
                </Fila>
              ))}
            </ul>
          </>
        )}
      </div>

      {diagnostico.escribirEn && (
        <Nota>
          Las reservas que se creen o confirmen desde el panel se apuntan en{" "}
          <Identificador id={diagnostico.escribirEn} />
          {diagnostico.escrituraForzada
            ? " (fijado con la variable GOOGLE_CALENDAR_ESCRIBIR_EN)"
            : " (el primero de la lista)"}
          . En uno solo, para que ninguna reserva se vea dos veces.
        </Nota>
      )}
    </div>
  );
}

/** El desplegable completo, listo para meter en la pantalla de Reservas. */
export function BloqueDiagnosticoCalendario() {
  return (
    <details className="group w-full rounded-suave bg-crema-900/[0.02] ring-1 ring-crema-900/[0.06]">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[0.75rem] font-semibold text-petroleo-700 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="transition-transform duration-200 group-open:rotate-90"
        >
          ›
        </span>
        Ver los calendarios de Google
      </summary>
      <div className="px-3 pb-3 pt-1">
        <Suspense
          fallback={
            <Nota>Preguntándole a Google qué calendarios puede ver…</Nota>
          }
        >
          <DetalleCalendarios />
        </Suspense>
      </div>
    </details>
  );
}
