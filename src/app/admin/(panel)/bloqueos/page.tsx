import type { Metadata } from "next";

import { eliminarBloqueoAction } from "./acciones";
import { FormularioBloqueo } from "./formulario-bloqueo";
import { Aviso } from "@/components/admin/aviso";
import { BotonEnviar } from "@/components/admin/boton-enviar";
import {
  CabeceraTarjeta,
  CuerpoTarjeta,
  EnlaceBoton,
  EncabezadoPagina,
  EstadoVacio,
  Tarjeta,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { listarBloqueos, opcionesAlojamiento } from "@/lib/admin/datos";
import { fechaLarga, hoyISO, nochesEntre, rangoCorto } from "@/lib/admin/fechas";

export const metadata: Metadata = { title: "Bloqueos" };
export const dynamic = "force-dynamic";

export default async function PaginaBloqueos({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const [alojamientos, bloqueos] = await Promise.all([
    opcionesAlojamiento(supabase),
    listarBloqueos(supabase),
  ]);

  const hoy = hoyISO();
  const vigentes = bloqueos.filter((bloqueo) => bloqueo.fin > hoy);
  const pasados = bloqueos.filter((bloqueo) => bloqueo.fin <= hoy);

  return (
    <>
      <EncabezadoPagina
        titulo="Bloqueos"
        descripcion="Días en los que una cabaña no se puede reservar: mantenimiento, un evento privado o porque la usan ustedes. Se ven en el calendario en gris."
      />

      <Aviso ok={params.ok} error={params.error} />

      {alojamientos.length === 0 ? (
        <Tarjeta>
          <CuerpoTarjeta>
            <EstadoVacio
              titulo="Falta crear cabañas"
              descripcion="Para bloquear fechas hace falta al menos una cabaña."
              accion={
                <EnlaceBoton href="/admin/alojamientos">Ir a Cabañas</EnlaceBoton>
              }
            />
          </CuerpoTarjeta>
        </Tarjeta>
      ) : (
        <div className="space-y-6">
          <Tarjeta>
            <CabeceraTarjeta
              titulo="Bloquear fechas"
              descripcion="Elige la cabaña y el rango de noches que quieres cerrar."
            />
            <CuerpoTarjeta>
              <FormularioBloqueo alojamientos={alojamientos} />
            </CuerpoTarjeta>
          </Tarjeta>

          <Tarjeta>
            <CabeceraTarjeta
              titulo="Bloqueos vigentes"
              descripcion={
                vigentes.length === 0
                  ? undefined
                  : "Estas noches están cerradas ahora mismo."
              }
            />
            {vigentes.length === 0 ? (
              <CuerpoTarjeta>
                <EstadoVacio
                  titulo="No hay ninguna fecha bloqueada"
                  descripcion="Todas las cabañas están disponibles, salvo lo que ya esté reservado."
                />
              </CuerpoTarjeta>
            ) : (
              <ul className="divide-y divide-crema-900/[0.07]">
                {vigentes.map((bloqueo) => {
                  const noches = nochesEntre(bloqueo.inicio, bloqueo.fin);
                  return (
                    <li
                      key={bloqueo.id}
                      className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-6"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.9375rem] font-semibold text-crema-900">
                          {bloqueo.alojamiento_nombre ?? "Cabaña"}
                          <span className="mx-2 font-normal text-crema-400">
                            ·
                          </span>
                          <span className="font-normal">
                            {rangoCorto(bloqueo.inicio, bloqueo.fin)}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[0.75rem] text-crema-600">
                          {bloqueo.motivo ?? "Sin motivo anotado"}
                          <span className="mx-1.5">·</span>
                          {noches} {noches === 1 ? "noche" : "noches"}
                          <span className="mx-1.5">·</span>
                          libre desde el {fechaLarga(bloqueo.fin)}
                        </p>
                      </div>
                      <form action={eliminarBloqueoAction}>
                        <input type="hidden" name="id" value={bloqueo.id} />
                        <BotonEnviar
                          tono="peligro"
                          tamano="sm"
                          etiquetaEnEspera="Quitando…"
                          confirmar="¿Quitar este bloqueo? Esas noches volverán a estar disponibles."
                        >
                          Quitar
                        </BotonEnviar>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </Tarjeta>

          {pasados.length > 0 && (
            <Tarjeta>
              <CabeceraTarjeta
                titulo="Bloqueos que ya pasaron"
                descripcion="Se conservan como historial. Puedes borrarlos si estorban."
              />
              <ul className="divide-y divide-crema-900/[0.07]">
                {pasados.slice(0, 20).map((bloqueo) => (
                  <li
                    key={bloqueo.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6"
                  >
                    <p className="min-w-0 flex-1 text-[0.8125rem] text-crema-600">
                      {bloqueo.alojamiento_nombre ?? "Cabaña"}
                      <span className="mx-1.5">·</span>
                      {rangoCorto(bloqueo.inicio, bloqueo.fin)}
                      <span className="mx-1.5">·</span>
                      {bloqueo.motivo ?? "sin motivo"}
                    </p>
                    <form action={eliminarBloqueoAction}>
                      <input type="hidden" name="id" value={bloqueo.id} />
                      <BotonEnviar
                        tono="fantasma"
                        tamano="sm"
                        etiquetaEnEspera="Quitando…"
                      >
                        Borrar
                      </BotonEnviar>
                    </form>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}
        </div>
      )}
    </>
  );
}
