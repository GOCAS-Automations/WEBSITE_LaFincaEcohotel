import { Boton } from "@/components/ui/boton";
import type { Plan } from "@/lib/tipos/basedatos";
import { formatearCOP } from "@/lib/utils/formato";

import { IconoCheck } from "./iconos";

/**
 * Tarjeta de un plan tarifario.
 *
 * La Finca cobra por PLAN, no por cabaña (§2.1 del plan de desarrollo): estas
 * tres tarjetas son, en la práctica, el catálogo del hotel. Por eso el precio
 * va grande y en dorado —el mismo acento que el sitio actual usa para el plan
 * Premium— y la lista de lo que incluye va completa, sin "ver más".
 *
 * `destacado` levanta visualmente uno de los tres. Se usa para el plan del
 * medio, que es el que el equipo quiere que se elija.
 */
export function TarjetaPlan({
  plan,
  precio,
  desde = false,
  destacado = false,
  href,
  ctaTexto = "Reservar este plan",
}: {
  plan: Plan;
  /** Precio por noche en COP enteros. `null` = tarifa por confirmar. */
  precio: number | null;
  /** `true` cuando el precio varía entre cabañas y se muestra el más bajo. */
  desde?: boolean;
  destacado?: boolean;
  href: string;
  ctaTexto?: string;
}) {
  const incluye = plan.incluye ?? [];

  return (
    <article
      className={[
        "flex h-full flex-col rounded-[var(--radius-generoso)] p-6 transition-all duration-300 ease-out sm:p-7",
        destacado
          ? "bg-petroleo-800 text-crema-50 shadow-[var(--shadow-elevada)] ring-1 ring-petroleo-700 lg:-my-3 lg:py-10"
          : "bg-white shadow-[var(--shadow-tarjeta)] ring-1 ring-crema-200/70 hover:-translate-y-1 hover:shadow-[var(--shadow-elevada)]",
      ].join(" ")}
    >
      {destacado ? (
        <p className="mb-3 self-start rounded-full bg-dorado-500/20 px-3 py-1 font-titulo text-xs font-semibold tracking-wide text-dorado-200 uppercase">
          El más pedido
        </p>
      ) : null}

      <h3
        className={[
          "font-titulo text-2xl font-bold",
          destacado ? "text-white" : "text-petroleo-900",
        ].join(" ")}
      >
        {plan.nombre}
      </h3>

      {plan.descripcion ? (
        <p
          className={[
            "mt-2 text-sm leading-relaxed",
            destacado ? "text-crema-200/90" : "text-crema-700",
          ].join(" ")}
        >
          {plan.descripcion}
        </p>
      ) : null}

      <p className="mt-5 flex flex-wrap items-baseline gap-x-2">
        {precio === null ? (
          <span
            className={[
              "font-titulo text-xl font-bold",
              destacado ? "text-dorado-200" : "text-dorado-600",
            ].join(" ")}
          >
            Consulta la tarifa
          </span>
        ) : (
          <>
            {desde ? (
              <span
                className={
                  destacado ? "text-sm text-crema-200/80" : "text-sm text-crema-600"
                }
              >
                desde
              </span>
            ) : null}
            <span
              className={[
                "font-titulo text-3xl font-extrabold tracking-tight sm:text-4xl",
                destacado ? "text-dorado-200" : "text-dorado-600",
              ].join(" ")}
            >
              {formatearCOP(precio)}
            </span>
            <span
              className={
                destacado ? "text-sm text-crema-200/80" : "text-sm text-crema-600"
              }
            >
              por noche · 2 personas
            </span>
          </>
        )}
      </p>

      {incluye.length > 0 ? (
        <ul className="mt-6 flex flex-1 flex-col gap-2.5">
          {incluye.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
              <IconoCheck
                className={[
                  "mt-0.5 size-4 shrink-0",
                  destacado ? "text-dorado-300" : "text-petroleo-500",
                ].join(" ")}
              />
              <span className={destacado ? "text-crema-100" : "text-crema-800"}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex-1" />
      )}

      <Boton
        href={href}
        variante={destacado ? "claro" : "primario"}
        className="mt-7 w-full"
      >
        {ctaTexto}
      </Boton>
    </article>
  );
}
