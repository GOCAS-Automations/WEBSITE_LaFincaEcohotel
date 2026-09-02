"use client";

import Link from "next/link";

import { guardarPlanAction } from "./acciones";
import { Chips } from "@/components/admin/chips";
import { FormularioAccion } from "@/components/admin/formulario-accion";
import { AreaTexto, Campo, Entrada } from "@/components/admin/ui";
import type { Plan } from "@/lib/tipos/basedatos";

export function FormularioPlan({ plan }: { plan: Plan | null }) {
  return (
    <FormularioAccion
      accion={guardarPlanAction}
      etiquetaEnviar={plan ? "Guardar cambios" : "Crear plan"}
      secundario={
        <Link
          href="/admin/planes"
          className="text-[0.875rem] font-semibold text-crema-700 underline-offset-4 hover:underline"
        >
          Cancelar
        </Link>
      }
    >
      {plan && <input type="hidden" name="id" value={plan.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo etiqueta="Nombre del plan" htmlFor="nombre" obligatorio>
          <Entrada
            id="nombre"
            name="nombre"
            defaultValue={plan?.nombre ?? ""}
            required
            maxLength={80}
            placeholder="Estándar"
          />
        </Campo>

        <Campo
          etiqueta="Orden en el listado"
          htmlFor="orden"
          ayuda="El número más bajo aparece primero (de menor a mayor precio, normalmente)."
        >
          <Entrada
            id="orden"
            name="orden"
            type="number"
            min={0}
            max={9999}
            defaultValue={plan?.orden ?? 0}
          />
        </Campo>

        <Campo
          etiqueta="Descripción"
          htmlFor="descripcion"
          className="sm:col-span-2"
          ayuda="Es el texto corto que lee el huésped al comparar los planes."
        >
          <AreaTexto
            id="descripcion"
            name="descripcion"
            defaultValue={plan?.descripcion ?? ""}
            maxLength={2000}
            rows={4}
            placeholder="Nuestro plan más completo: desayuno, almuerzo y cena incluidos."
          />
        </Campo>

        <Campo
          etiqueta="Qué incluye"
          className="sm:col-span-2"
          ayuda="Escribe uno y presiona Enter. Salen como lista al comparar los planes en el sitio."
        >
          <Chips
            name="incluye"
            inicial={plan?.incluye ?? []}
            marcador="Desayuno, almuerzo y cena"
          />
        </Campo>

        <div className="sm:col-span-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-tarjeta bg-crema-900/[0.03] p-3.5">
            <input
              type="checkbox"
              name="activo"
              defaultChecked={plan?.activo ?? true}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-petroleo-600)]"
            />
            <span>
              <span className="block text-[0.875rem] font-semibold text-crema-900">
                Mostrar este plan en el sitio web
              </span>
              <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-crema-600">
                Si lo desmarcas, el plan deja de ofrecerse en el sitio y en
                /reservar, pero no se borra nada: sus precios y reservas
                pasadas siguen aquí.
              </span>
            </span>
          </label>
        </div>

        {!plan && (
          <div className="sm:col-span-2 rounded-tarjeta bg-dorado-500/[0.1] p-3.5 text-[0.8125rem] leading-relaxed text-dorado-800 ring-1 ring-dorado-500/25">
            Al crear el plan no se le asigna precio en ninguna cabaña. Después
            de guardarlo, entra a cada cabaña (en «Cabañas») y ponle su tarifa
            para este plan; mientras no la tenga, no podrá reservarse en esa
            cabaña.
          </div>
        )}
      </div>
    </FormularioAccion>
  );
}
