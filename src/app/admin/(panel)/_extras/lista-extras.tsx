import Link from "next/link";

import { alternarActivoExtraAction, eliminarExtraAction } from "./acciones";
import { TEXTOS_EXTRA, rutaDeTipo } from "./rutas";
import { Aviso } from "@/components/admin/aviso";
import { BotonEnviar } from "@/components/admin/boton-enviar";
import {
  CabeceraTarjeta,
  CuerpoTarjeta,
  EnlaceBoton,
  EncabezadoPagina,
  EstadoVacio,
  Pastilla,
  Tarjeta,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { listarExtras } from "@/lib/admin/datos";
import { formatearCOP } from "@/lib/utils/formato";
import type { TipoExtra } from "@/lib/tipos/basedatos";

/**
 * Listado de experiencias o adicionales. Las dos secciones del panel son la
 * misma pantalla con distinto `tipo`: la tabla es una sola.
 */
export async function ListaExtras({
  tipo,
  aviso,
}: {
  tipo: TipoExtra;
  aviso: { ok?: string; error?: string };
}) {
  const { supabase } = await requireAdmin();
  const extras = await listarExtras(supabase, tipo);
  const textos = TEXTOS_EXTRA[tipo];
  const ruta = rutaDeTipo(tipo);

  return (
    <>
      <EncabezadoPagina
        titulo={textos.titulo}
        descripcion={textos.descripcion}
        accion={
          <EnlaceBoton href={`${ruta}/nueva`}>
            Añadir {textos.singular}
          </EnlaceBoton>
        }
      />

      <Aviso ok={aviso.ok} error={aviso.error} />

      {extras.length === 0 ? (
        <Tarjeta>
          <CuerpoTarjeta>
            <EstadoVacio
              titulo={`Todavía no hay ${textos.plural}`}
              descripcion={textos.explicacionVacio}
              accion={
                <EnlaceBoton href={`${ruta}/nueva`}>
                  Añadir la primera
                </EnlaceBoton>
              }
            />
          </CuerpoTarjeta>
        </Tarjeta>
      ) : (
        <Tarjeta>
          <CabeceraTarjeta
            titulo={`${extras.length} ${extras.length === 1 ? textos.singular : textos.plural}`}
            descripcion="Se muestran en el sitio en el orden de esta lista."
          />
          <ul className="divide-y divide-crema-900/[0.07]">
            {extras.map((extra) => (
              <li
                key={extra.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:flex-nowrap sm:px-6"
              >
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-suave bg-crema-900/10">
                  {extra.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={extra.imagen_url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[0.625rem] text-crema-600">
                      Sin foto
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`${ruta}/${extra.id}`}
                      className="font-titulo text-[0.9375rem] font-semibold text-crema-900 underline-offset-4 hover:underline"
                    >
                      {extra.nombre}
                    </Link>
                    {extra.activo ? (
                      <Pastilla tono="verde">Visible</Pastilla>
                    ) : (
                      <Pastilla tono="gris">Pausada</Pastilla>
                    )}
                  </div>
                  <p className="mt-0.5 text-[0.75rem] text-crema-600">
                    {formatearCOP(extra.precio)}
                    <span className="mx-1.5">·</span>orden {extra.orden}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  <Link
                    href={`${ruta}/${extra.id}`}
                    className="rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold text-petroleo-700 transition-colors hover:bg-petroleo-600/10"
                  >
                    Editar
                  </Link>
                  <form action={alternarActivoExtraAction}>
                    <input type="hidden" name="tipo" value={tipo} />
                    <input type="hidden" name="id" value={extra.id} />
                    <input
                      type="hidden"
                      name="activo"
                      value={extra.activo ? "false" : "true"}
                    />
                    <BotonEnviar
                      tono="fantasma"
                      tamano="sm"
                      etiquetaEnEspera="Cambiando…"
                    >
                      {extra.activo ? "Pausar" : "Mostrar"}
                    </BotonEnviar>
                  </form>
                  <form action={eliminarExtraAction}>
                    <input type="hidden" name="tipo" value={tipo} />
                    <input type="hidden" name="id" value={extra.id} />
                    <BotonEnviar
                      tono="peligro"
                      tamano="sm"
                      etiquetaEnEspera="Borrando…"
                      confirmar={`¿Seguro que quieres borrar «${extra.nombre}»? Esta acción no se puede deshacer.`}
                    >
                      Borrar
                    </BotonEnviar>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </>
  );
}
