import { Suspense } from "react";

import { Pastilla } from "@/components/admin/ui";
import { accesoEnEspanol } from "@/lib/reserva/diagnostico-calendarios";
import { diagnosticoDelCalendario } from "@/lib/reserva/ocupacion-externa";
import type { CalendarioDiagnosticado } from "@/lib/reserva/ocupacion-externa";

/**
 * «¿Qué calendarios de Google ve el sitio?», desplegable, en la pantalla de
 * Reservas.
 *
 * ---------------------------------------------------------------------------
 * PARA QUÉ SIRVE DE VERDAD
 * ---------------------------------------------------------------------------
 * Para responder, sin llamar a nadie, a dos preguntas del equipo del hotel:
 * «¿está el sitio leyendo nuestro calendario?» y «¿se van a apuntar aquí las
 * reservas que hagamos desde el panel?».
 *
 * Cada calendario configurado sale con el resultado de una **lectura de verdad**:
 * el nombre que tiene en Google, el permiso que la cuenta del sitio tiene sobre
 * él y si responde. Y sale la distinción que ahora es real: el hotel comparte
 * **uno** con permiso de escritura —donde se apuntan las reservas del panel— y
 * los demás en solo lectura, para calcular disponibilidad.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO SE MIRA `calendarList`
 * ---------------------------------------------------------------------------
 * Porque mintió. La primera versión daba por perdido todo lo que no saliera en
 * la lista de suscripciones de la cuenta de servicio, y esa lista está vacía aun
 * teniendo los siete calendarios del hotel compartidos y leyéndose bien: lo que
 * se concede al compartir es la ACL, no una suscripción. El panel decía
 * «ninguno todavía» y mandaba a buscar un problema inexistente. La historia
 * completa está en `src/lib/reserva/diagnostico-calendarios.ts`.
 *
 * Las suscripciones se siguen enseñando, al final y solo si hay alguna, por lo
 * único que sirven: descubrir el identificador de un calendario que nadie nos ha
 * dicho.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ VA PLEGADO Y DETRÁS DE UN SUSPENSE
 * ---------------------------------------------------------------------------
 * Comprobar los calendarios son varias llamadas de red. No pueden retrasar el
 * calendario del mes, que es lo que el equipo viene a ver: el `<details>` se
 * pinta enseguida y el contenido llega cuando llegue. La respuesta se guarda
 * cinco minutos (ver `ocupacion-externa.ts`), y el botón «Actualizar ahora» la
 * tira.
 *
 * El aviso grave —que el calendario de escritura esté compartido en solo
 * lectura— no se queda escondido aquí dentro: también sale como aviso en la
 * franja de estado, que está siempre a la vista (`estado-calendario.tsx`).
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
  tono?: "normal" | "aviso" | "grave";
}) {
  const fondo =
    tono === "grave"
      ? "bg-red-600/[0.06] ring-red-600/25"
      : tono === "aviso"
        ? "bg-dorado-500/[0.08] ring-dorado-500/25"
        : "bg-crema-50 ring-crema-900/[0.06]";
  return (
    <li className={`rounded-suave px-3 py-2.5 ring-1 ${fondo}`}>
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

/** El aviso que no puede pasar desapercibido. */
function Alarma({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-suave bg-red-600/[0.08] px-3 py-2.5 ring-1 ring-red-600/30">
      <p className="text-[0.75rem] font-semibold leading-snug text-red-700">
        {children}
      </p>
    </div>
  );
}

/** Qué se le explica a quien mira, según cómo haya respondido el calendario. */
function explicacion(calendario: CalendarioDiagnosticado): string {
  if (calendario.error) {
    return `No se pudo leer: ${calendario.error}`;
  }
  if (!calendario.responde) {
    return "Todavía no se ha comprobado.";
  }
  return calendario.cabana === null
    ? "Se mira el título de cada evento: si nombra una cabaña, ocupa esa. Si no nombra ninguna y dice «plan día», «día de calma» o «pasadía», es un Día de Calma: no ocupa cabaña y cuenta 2 personas en el cupo de ese día. Si no, se marcan las cinco por precaución."
    : `Todo lo que haya en este calendario ocupa la Cabaña ${calendario.cabana}, diga lo que diga el título.`;
}

function FilaDeCalendario({ calendario }: { calendario: CalendarioDiagnosticado }) {
  /* Un calendario de solo lectura es lo normal aquí: cuatro de cada cinco lo
     son. Lo que sí es un problema es que lo sea el de escritura. */
  const sinPermisoDeEscritura = calendario.deEscritura && calendario.responde &&
    !calendario.puedeEscribir;
  const tono = calendario.error
    ? "aviso"
    : sinPermisoDeEscritura
      ? "grave"
      : "normal";

  return (
    <Fila tono={tono}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pastilla tono={calendario.cabana === null ? "azul" : "verde"}>
          {calendario.cabana === null ? "General" : `Cabaña ${calendario.cabana}`}
        </Pastilla>
        {calendario.deEscritura && (
          <Pastilla tono={sinPermisoDeEscritura ? "rojo" : "dorado"}>
            Aquí se apuntan las reservas
          </Pastilla>
        )}
        {calendario.error ? (
          <Pastilla tono="rojo">No responde</Pastilla>
        ) : calendario.responde ? (
          <Pastilla tono="gris">
            {calendario.puedeEscribir ? "Lectura y escritura" : "Solo lectura"}
          </Pastilla>
        ) : null}
      </div>

      {calendario.nombre && (
        <p className="text-[0.75rem] font-semibold text-crema-900">
          {calendario.nombre}
        </p>
      )}
      <Identificador id={calendario.id} />
      <Nota>{explicacion(calendario)}</Nota>
      {calendario.responde && (
        <Nota>Permiso que el hotel le dio al sitio: {accesoEnEspanol(calendario.acceso)}.</Nota>
      )}
    </Fila>
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

  const sueltos = diagnostico.suscritosSinConfigurar ?? [];
  const leen = diagnostico.configurados.filter(
    (calendario) => !calendario.deEscritura,
  );

  return (
    <div className="flex flex-col gap-4">
      {diagnostico.escrituraSinPermiso && diagnostico.escritura && (
        <Alarma>
          El calendario donde el panel apunta las reservas está compartido en modo
          «{accesoEnEspanol(diagnostico.escritura.acceso)}». Mientras siga así,
          las reservas que se creen aquí no se apuntarán en ningún calendario del
          hotel. Hay que volver a compartirlo con la cuenta del sitio dándole
          «Hacer cambios en eventos».
        </Alarma>
      )}

      <div className="flex flex-col gap-1.5">
        <Titulo>Cuenta de Google del sitio</Titulo>
        <Nota>
          Es el correo con el que el hotel comparte sus calendarios. Para los que
          el sitio solo consulta basta «Ver todos los eventos»; el calendario
          donde se apuntan las reservas necesita «Hacer cambios en eventos».
        </Nota>
        <Identificador id={diagnostico.correoCuenta ?? "—"} />
      </div>

      <div className="flex flex-col gap-2">
        <Titulo>Aquí se apuntan las reservas del panel</Titulo>
        {diagnostico.escritura === null ? (
          <Nota>
            En ninguno: no hay calendarios configurados, así que las reservas
            viven solo en el panel. Están a salvo, pero no se ven desde el
            teléfono.
          </Nota>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              <FilaDeCalendario calendario={diagnostico.escritura} />
            </ul>
            <Nota>
              Es uno solo, a propósito: si una reserva se apuntara en el general y
              además en el de su cabaña, el equipo la vería dos veces.{" "}
              {diagnostico.escrituraForzada
                ? "Lo fija la variable GOOGLE_CALENDAR_ESCRIBIR_EN."
                : "Es el primero de la lista GOOGLE_CALENDAR_ID."}
              {diagnostico.escrituraFueraDeLista &&
                " Ojo: no está entre los que el sitio lee, así que lo que se apunte ahí no cuenta para la disponibilidad."}
            </Nota>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Titulo>Calendarios que el sitio solo consulta</Titulo>
        {leen.length === 0 ? (
          <Nota>
            Ninguno más. El sitio calcula la disponibilidad únicamente con lo que
            haya en el calendario de arriba.
          </Nota>
        ) : (
          <>
            <Nota>
              De aquí sale la disponibilidad: lo que el hotel apunte en estos
              calendarios bloquea fechas en el sitio. Comprobado leyendo sus
              eventos, que es lo que el sitio hace de verdad.
            </Nota>
            <ul className="flex flex-col gap-2">
              {leen.map((calendario) => (
                <FilaDeCalendario key={calendario.id} calendario={calendario} />
              ))}
            </ul>
          </>
        )}
      </div>

      {sueltos.length > 0 && (
        <div className="flex flex-col gap-2">
          <Titulo>Otros calendarios en la lista de la cuenta</Titulo>
          <Nota>
            La cuenta del sitio los tiene en su propia lista pero no están
            configurados. Para empezar a usar uno hay que añadir su identificador
            a la variable GOOGLE_CALENDAR_ID (con «=3» detrás si es el calendario
            de la Cabaña 3).
          </Nota>
          <ul className="flex flex-col gap-2">
            {sueltos.map((calendario) => (
              <Fila key={calendario.id}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[0.75rem] font-semibold text-crema-900">
                    {calendario.nombre}
                  </span>
                  <Pastilla tono="gris">Sin configurar</Pastilla>
                </div>
                <Identificador id={calendario.id} />
                <Nota>
                  Permiso que tiene el sitio sobre él:{" "}
                  {accesoEnEspanol(calendario.acceso)}.
                </Nota>
              </Fila>
            ))}
          </ul>
        </div>
      )}

      <Nota>
        Esta lista no se saca de «los calendarios que Google dice que la cuenta
        tiene»: esa lista se queda vacía aunque el hotel haya compartido todo
        —una cuenta de servicio no «acepta» invitaciones—. Cada calendario de
        arriba está comprobado pidiéndole sus eventos.
      </Nota>
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
          fallback={<Nota>Comprobando los calendarios del hotel…</Nota>}
        >
          <DetalleCalendarios />
        </Suspense>
      </div>
    </details>
  );
}
