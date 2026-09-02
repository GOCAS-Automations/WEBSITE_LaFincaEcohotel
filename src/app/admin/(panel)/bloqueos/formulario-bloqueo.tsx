"use client";

import { useEffect, useState } from "react";

import { crearBloqueoAction } from "./acciones";
import { FormularioAccion } from "@/components/admin/formulario-accion";
import { Campo, Desplegable, Entrada } from "@/components/admin/ui";
import { hoyISO, nochesEntre, sumarDiasISO } from "@/lib/admin/fechas";
import type { OpcionAlojamiento } from "@/lib/admin/tipos";

const MOTIVOS = [
  "Mantenimiento",
  "Uso de los dueños",
  "Evento privado",
  "Reserva por otro canal",
];

export function FormularioBloqueo({
  alojamientos,
}: {
  alojamientos: OpcionAlojamiento[];
}) {
  const hoy = hoyISO();
  const [inicio, setInicio] = useState(hoy);
  const [fin, setFin] = useState(sumarDiasISO(hoy, 1));

  useEffect(() => {
    if (fin <= inicio) setFin(sumarDiasISO(inicio, 1));
  }, [inicio, fin]);

  const noches = inicio && fin ? Math.max(0, nochesEntre(inicio, fin)) : 0;

  return (
    <FormularioAccion
      accion={crearBloqueoAction}
      etiquetaEnviar="Bloquear estas fechas"
      etiquetaEnEspera="Bloqueando…"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo etiqueta="Cabaña" htmlFor="alojamiento_id" obligatorio>
          <Desplegable
            id="alojamiento_id"
            name="alojamiento_id"
            required
            defaultValue={alojamientos[0]?.id ?? ""}
          >
            {alojamientos.map((alojamiento) => (
              <option key={alojamiento.id} value={alojamiento.id}>
                {alojamiento.nombre}
                {alojamiento.activo ? "" : " (pausada)"}
              </option>
            ))}
          </Desplegable>
        </Campo>

        <Campo
          etiqueta="Motivo"
          htmlFor="motivo"
          ayuda="Para acordarte de por qué estaba bloqueada."
        >
          <Entrada
            id="motivo"
            name="motivo"
            list="motivos-bloqueo"
            maxLength={300}
            placeholder="Mantenimiento"
          />
          <datalist id="motivos-bloqueo">
            {MOTIVOS.map((motivo) => (
              <option key={motivo} value={motivo} />
            ))}
          </datalist>
        </Campo>

        <Campo etiqueta="Primera noche bloqueada" htmlFor="inicio" obligatorio>
          <Entrada
            id="inicio"
            name="inicio"
            type="date"
            value={inicio}
            onChange={(evento) => setInicio(evento.target.value)}
            required
          />
        </Campo>

        <Campo
          etiqueta="Vuelve a estar libre el"
          htmlFor="fin"
          obligatorio
          ayuda={
            noches > 0
              ? `Quedan bloqueadas ${noches} ${noches === 1 ? "noche" : "noches"}. Ese día ya se puede volver a reservar.`
              : "Tiene que ser un día posterior a la primera noche."
          }
        >
          <Entrada
            id="fin"
            name="fin"
            type="date"
            value={fin}
            min={inicio ? sumarDiasISO(inicio, 1) : undefined}
            onChange={(evento) => setFin(evento.target.value)}
            required
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}
