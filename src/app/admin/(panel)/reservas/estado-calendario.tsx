import type { ReactNode } from "react";

import { refrescarCalendarioAction } from "./acciones";
import { Pastilla, claseBoton } from "@/components/admin/ui";
import { fechaHora } from "@/lib/admin/fechas";
import type { EstadoConexion } from "@/lib/reserva/ocupacion-externa";

/**
 * «Calendario del hotel: conectado / sin configurar / error».
 *
 * El equipo tiene que poder saber, sin preguntar, si lo que está viendo
 * incluye lo que ellos apuntan a mano en su Google Calendar. Un calendario que
 * a veces trae esas fechas y a veces no, sin decirlo, es peor que no traerlas
 * nunca: se confía en él y se vende una noche ocupada.
 *
 * El botón «Actualizar ahora» existe porque la lectura se guarda cinco minutos
 * (ver `src/lib/reserva/ocupacion-externa.ts`). Quien acaba de apuntar algo en
 * su teléfono no debería esperar a que caduque la caché para verlo aquí.
 *
 * Debajo caben dos cosas más: los **avisos** (un calendario que no se pudo leer,
 * una configuración que no se entendió) y, solo para el propietario, el
 * desplegable con los calendarios de Google (`diagnostico-calendario.tsx`).
 */

const TONOS: Record<
  EstadoConexion,
  { tono: "verde" | "gris" | "rojo"; etiqueta: string }
> = {
  conectado: { tono: "verde", etiqueta: "Conectado" },
  sin_configurar: { tono: "gris", etiqueta: "Sin configurar" },
  error: { tono: "rojo", etiqueta: "Con problemas" },
};

export function EstadoCalendarioHotel({
  estado,
  mensaje,
  consultado,
  mes,
  avisos = [],
  lecturaIncompleta = false,
  detalle = null,
}: {
  estado: EstadoConexion;
  mensaje: string;
  /** ISO de la última lectura; `null` si nunca se llegó a consultar. */
  consultado: string | null;
  /** Mes que se está mirando, para volver a él tras actualizar. */
  mes: string;
  /** Cosas que revisar, en español. Vacío = todo en orden. */
  avisos?: string[];
  /** Cierto si alguno de los calendarios configurados no se pudo leer. */
  lecturaIncompleta?: boolean;
  /** El desplegable de diagnóstico, si quien mira puede verlo. */
  detalle?: ReactNode;
}) {
  const { tono, etiqueta } = TONOS[estado];
  /* Conectado pero a medias no es «conectado» a secas: si falta un calendario,
     hay fechas que el sitio no está viendo y eso tiene que destacar. */
  const conAvisos = estado === "conectado" && lecturaIncompleta;

  return (
    <section
      aria-label="Estado del calendario del hotel"
      className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-amplio bg-white px-4 py-3 shadow-tarjeta ring-1 ring-crema-900/[0.06] sm:px-6"
    >
      <div className="flex items-center gap-2">
        <span className="text-[0.8125rem] font-semibold text-crema-900">
          Calendario del hotel
        </span>
        <Pastilla tono={conAvisos ? "ambar" : tono}>
          {conAvisos ? "Conectado a medias" : etiqueta}
        </Pastilla>
      </div>

      <p className="min-w-0 flex-1 text-[0.75rem] leading-snug text-crema-600">
        {mensaje}
        {consultado && (
          <span className="block text-crema-500">
            Última consulta: {fechaHora(consultado)}.
          </span>
        )}
      </p>

      <form action={refrescarCalendarioAction}>
        <input type="hidden" name="mes" value={mes} />
        <button type="submit" className={claseBoton("secundario", "sm")}>
          Actualizar ahora
        </button>
      </form>

      {avisos.length > 0 && (
        <ul className="w-full list-none space-y-1.5">
          {avisos.map((aviso) => (
            <li
              key={aviso}
              className="rounded-suave bg-dorado-500/[0.1] px-3 py-2 text-[0.75rem] leading-snug text-dorado-800 ring-1 ring-dorado-500/25"
            >
              {aviso}
            </li>
          ))}
        </ul>
      )}

      {detalle}
    </section>
  );
}
