"use client";

import Link from "next/link";
import { useState } from "react";

import { guardarPlanAction } from "./acciones";
import { Chips } from "@/components/admin/chips";
import { FormularioAccion } from "@/components/admin/formulario-accion";
import {
  AreaTexto,
  Campo,
  CLASE_INPUT,
  Desplegable,
  Divisor,
  Entrada,
} from "@/components/admin/ui";
import {
  AYUDA_TIPO_PLAN,
  DIAS_SEMANA,
  ETIQUETA_TIPO_PLAN,
  TIPOS_PLAN,
} from "@/lib/admin/tipos";
import type { Plan, TipoPlan } from "@/lib/tipos/basedatos";

export function FormularioPlan({ plan }: { plan: Plan | null }) {
  const [tipo, setTipo] = useState<TipoPlan>(plan?.tipo ?? "hospedaje");
  const esDeDia = tipo === "dia";

  // Sin días marcados, el plan se puede reservar cualquier día. Se guarda en
  // estado solo para poder avisarlo mientras se edita.
  const [dias, setDias] = useState<number[]>(plan?.dias_aplica ?? []);

  function alternarDia(numero: number) {
    setDias((actuales) =>
      actuales.includes(numero)
        ? actuales.filter((dia) => dia !== numero)
        : [...actuales, numero].sort((a, b) => a - b),
    );
  }

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

        <Divisor titulo="Cómo se vende este plan" />

        <Campo
          etiqueta="Tipo de plan"
          htmlFor="tipo"
          className="sm:col-span-2"
          ayuda={AYUDA_TIPO_PLAN[tipo]}
        >
          <Desplegable
            id="tipo"
            name="tipo"
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value as TipoPlan)}
          >
            {TIPOS_PLAN.map((valor) => (
              <option key={valor} value={valor}>
                {ETIQUETA_TIPO_PLAN[valor]}
              </option>
            ))}
          </Desplegable>
        </Campo>

        <div className="sm:col-span-2">
          <p className="mb-1.5 text-[0.8125rem] font-semibold text-crema-900">
            Días en que aplica
          </p>
          <p className="mb-3 text-[0.75rem] leading-relaxed text-crema-600">
            Marca los días de la semana en que el huésped puede reservar este
            plan. Si no marcas ninguno, se podrá reservar{" "}
            <strong>todos los días</strong>.
          </p>
          <div className="flex flex-wrap gap-2">
            {DIAS_SEMANA.map((dia) => {
              const marcado = dias.includes(dia.numero);
              return (
                <label
                  key={dia.numero}
                  className={`flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-[0.8125rem] font-semibold ring-1 transition-colors ${
                    marcado
                      ? "bg-petroleo-600/[0.13] text-petroleo-800 ring-petroleo-600/25"
                      : "bg-crema-900/[0.04] text-crema-700 ring-crema-900/[0.07] hover:bg-crema-900/[0.07]"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="dias_aplica"
                    value={dia.numero}
                    checked={marcado}
                    onChange={() => alternarDia(dia.numero)}
                    className="h-4 w-4 accent-[var(--color-petroleo-600)]"
                  />
                  {dia.nombre}
                </label>
              );
            })}
          </div>
          {dias.length === 0 && (
            <p className="mt-2 text-[0.75rem] text-crema-600">
              Ahora mismo: se puede reservar todos los días.
            </p>
          )}
        </div>

        {esDeDia && (
          <>
            <Campo
              etiqueta="Horario (solo para planes de día)"
              htmlFor="horario"
              ayuda="Escríbelo tal como quieres que lo lea el huésped."
            >
              <Entrada
                id="horario"
                name="horario"
                defaultValue={plan?.horario ?? ""}
                maxLength={120}
                placeholder="10:00 a. m. – 5:00 p. m."
              />
            </Campo>

            <Campo
              etiqueta="Precio del plan (para planes sin cabaña)"
              htmlFor="precio_base"
              obligatorio
              ayuda="En pesos, sin centavos: 250000 o 250.000, como prefieras. Es el mismo precio para todo el hotel."
            >
              <div className="relative">
                <span
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[0.9375rem] text-crema-500"
                  aria-hidden="true"
                >
                  $
                </span>
                <input
                  id="precio_base"
                  name="precio_base"
                  type="text"
                  inputMode="numeric"
                  defaultValue={plan?.precio_base ?? ""}
                  placeholder="250000"
                  className={`${CLASE_INPUT} pl-8`}
                />
              </div>
            </Campo>
          </>
        )}

        {!esDeDia && (
          <div className="sm:col-span-2 rounded-tarjeta bg-crema-900/[0.03] p-3.5 text-[0.8125rem] leading-relaxed text-crema-700">
            Este plan se cobra por noche y el precio se pone{" "}
            <strong>cabaña por cabaña</strong>, en «Cabañas». Ahí mismo decides
            qué cabañas se ofrecen con este plan.
          </div>
        )}

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

        {!plan && !esDeDia && (
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
