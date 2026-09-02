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
 *
 * ---------------------------------------------------------------------------
 * LOS DOS ESCENARIOS DE FONDO
 * ---------------------------------------------------------------------------
 * · **Sobre claro** (ficha de cabaña): tarjetas blancas y la destacada en
 *   petróleo oscuro. Es la jerarquía de toda la vida.
 * · **Sobre oscuro** (`sobreOscuro`, portada): se INVIERTE. Las dos normales
 *   se vuelven cristal verde sobre el bosque y la destacada es la única de
 *   color crema. Sobre un fondo profundo, lo que destaca es la luz, no otra
 *   caja oscura; tres tarjetas blancas sobre verde, en cambio, habrían anulado
 *   el fondo entero y desperdiciado el único momento oscuro de la portada.
 */
export function TarjetaPlan({
  plan,
  precio,
  desde = false,
  destacado = false,
  sobreOscuro = false,
  href,
  ctaTexto = "Reservar este plan",
}: {
  plan: Plan;
  /** Precio por noche en COP enteros. `null` = tarifa por confirmar. */
  precio: number | null;
  /** `true` cuando el precio varía entre cabañas y se muestra el más bajo. */
  desde?: boolean;
  destacado?: boolean;
  /** La tarjeta se apoya sobre una sección de bosque profundo. */
  sobreOscuro?: boolean;
  href: string;
  ctaTexto?: string;
}) {
  const incluye = plan.incluye ?? [];

  /**
   * `claro` = la tarjeta se pinta con fondo claro y texto oscuro.
   * Sobre fondo oscuro solo la destacada es clara; sobre fondo claro, al revés.
   */
  const claro = sobreOscuro ? destacado : !destacado;

  const marco = sobreOscuro
    ? destacado
      ? "bg-crema-50 shadow-[var(--shadow-bosque)] ring-1 ring-white/70 lg:-my-4 lg:py-10"
      : "bg-bosque-800/55 ring-1 ring-bosque-600/50 backdrop-blur-sm transition-colors duration-300 hover:bg-bosque-800/75"
    : destacado
      ? "bg-petroleo-800 text-crema-50 shadow-[var(--shadow-elevada)] ring-1 ring-petroleo-700 lg:-my-3 lg:py-10"
      : "bg-white shadow-[var(--shadow-tarjeta)] ring-1 ring-crema-200/70 hover:-translate-y-1 hover:shadow-[var(--shadow-elevada)]";

  return (
    <article
      className={[
        "flex h-full flex-col rounded-[var(--radius-generoso)] p-6 transition-all duration-300 ease-out sm:p-7",
        /* La esquina superior izquierda más abierta rompe el rectángulo sin
           tocar la legibilidad de nada de lo que hay dentro. */
        "rounded-tl-[3rem]",
        marco,
      ].join(" ")}
    >
      {destacado ? (
        <p
          className={[
            "mb-3 self-start rounded-full px-3 py-1 font-titulo text-xs font-semibold tracking-wide uppercase",
            claro
              ? "bg-dorado-100 text-dorado-800"
              : "bg-dorado-500/20 text-dorado-200",
          ].join(" ")}
        >
          El más pedido
        </p>
      ) : null}

      <h3
        className={[
          "font-titulo text-2xl font-bold",
          claro ? "text-petroleo-900" : "text-white",
        ].join(" ")}
      >
        {plan.nombre}
      </h3>

      {plan.descripcion ? (
        <p
          className={[
            "mt-2 text-sm leading-relaxed",
            claro ? "text-crema-700" : "text-crema-200/90",
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
              claro ? "text-dorado-600" : "text-dorado-200",
            ].join(" ")}
          >
            Consulta la tarifa
          </span>
        ) : (
          <>
            {desde ? (
              <span
                className={
                  claro ? "text-sm text-crema-600" : "text-sm text-crema-200/80"
                }
              >
                desde
              </span>
            ) : null}
            <span
              className={[
                "font-titulo text-3xl font-extrabold tracking-tight sm:text-4xl",
                claro ? "text-dorado-600" : "text-dorado-300",
              ].join(" ")}
            >
              {formatearCOP(precio)}
            </span>
            <span
              className={
                claro ? "text-sm text-crema-600" : "text-sm text-crema-200/80"
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
                  claro ? "text-petroleo-500" : "text-bosque-300",
                ].join(" ")}
              />
              <span className={claro ? "text-crema-800" : "text-crema-100"}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex-1" />
      )}

      {/*
        El botón NO puede ser el `claro` de cristal translúcido cuando la
        tarjeta es oscura: sobre un color sólido (y no sobre fotografía) el
        blanco al 15 % se vuelve un gris apagado y el botón se lee como
        DESHABILITADO. Justo el de la tarjeta destacada, que es el que más se
        pulsa. Sobre tarjeta oscura destacada va el crema sólido (casi 10:1) y
        sobre las de cristal del bosque, un contorno claro: así queda además la
        jerarquía correcta —una acción llena y dos con contorno—.
      */}
      <Boton
        href={href}
        variante={claro ? "primario" : destacado ? "crema" : "contornoClaro"}
        className="mt-7 w-full"
      >
        {ctaTexto}
      </Boton>
    </article>
  );
}
