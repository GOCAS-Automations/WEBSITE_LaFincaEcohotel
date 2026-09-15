import { Boton } from "@/components/ui/boton";
import type { Plan } from "@/lib/tipos/basedatos";
import { formatearCOP } from "@/lib/utils/formato";

import { IconoCheck } from "./iconos";

/**
 * Tarjeta de un plan tarifario.
 *
 * La Finca cobra por PLAN, no por cabaña (§2.1 del plan de desarrollo): estas
 * tres tarjetas son, en la práctica, el catálogo del hotel. Por eso el precio
 * va grande y en el color de marca —petróleo sobre claro, verde claro sobre
 * bosque— y la lista de lo que incluye va completa, sin "ver más".
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
/** Días ISO (1 = lunes) en la frase más corta posible que siga siendo exacta. */
function frasesDeDias(dias: number[] | null): string | null {
  if (!dias || dias.length === 0 || dias.length === 7) return null;
  const ordenados = [...dias].sort((a, b) => a - b);
  const clave = ordenados.join(",");
  /* Los dos únicos repartos que usa el hotel (§3 de DATOS_CLIENTE.md) se
     escriben como los dice él, no como los deduciría un algoritmo. */
  if (clave === "1,2,3,4") return "Lunes a jueves";
  if (clave === "5,6,7") return "Viernes a domingo y festivos";

  const nombres = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  const lista = ordenados.map((dia) => nombres[dia - 1]).filter(Boolean);
  if (lista.length === 0) return null;
  const texto =
    lista.length === 1
      ? lista[0]
      : `${lista.slice(0, -1).join(", ")} y ${lista[lista.length - 1]}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function TarjetaPlan({
  plan,
  precio,
  precioUnaPersona = null,
  desde = false,
  destacado = false,
  sobreOscuro = false,
  href,
  ctaTexto = "Reservar este plan",
}: {
  plan: Plan;
  /** Precio en COP enteros: por noche, o por el día si el plan es de día. */
  precio: number | null;
  /** Precio para una sola persona, si el plan lo publica. */
  precioUnaPersona?: number | null;
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
   * Un plan de DÍA no se cobra por noche ni ocupa cabaña (el «Día de Calma»:
   * 10:00 a. m. – 5:00 p. m., sin hospedaje). Escribir «por noche» debajo de su
   * precio sería un error de hecho, no de estilo: quien lo lea creerá que
   * duerme en La Finca.
   */
  const esDeDia = plan.tipo === "dia";
  const unidad = esDeDia ? "por el día · 2 personas" : "por noche · 2 personas";
  const cuando = esDeDia ? plan.horario : frasesDeDias(plan.dias_aplica);

  /**
   * `claro` = la tarjeta se pinta con fondo claro y texto oscuro.
   * Sobre fondo oscuro solo la destacada es clara; sobre fondo claro, al revés.
   */
  const claro = sobreOscuro ? destacado : !destacado;

  const marco = sobreOscuro
    ? destacado
      ? "bg-crema-50 shadow-[var(--shadow-bosque)] ring-1 ring-white/70 lg:-my-2 lg:py-7"
      : "bg-bosque-800/55 ring-1 ring-bosque-600/50 backdrop-blur-sm transition-colors duration-300 hover:bg-bosque-800/75"
    : destacado
      ? "bg-petroleo-800 text-crema-50 shadow-[var(--shadow-elevada)] ring-1 ring-petroleo-700 lg:-my-2 lg:py-7"
      : "bg-white shadow-[var(--shadow-tarjeta)] ring-1 ring-crema-200/70 hover:-translate-y-1 hover:shadow-[var(--shadow-elevada)]";

  return (
    <article
      className={[
        "flex h-full flex-col rounded-[var(--radius-generoso)] p-5 transition-all duration-300 ease-out sm:p-6",
        /* La esquina superior izquierda más abierta rompe el rectángulo sin
           tocar la legibilidad de nada de lo que hay dentro. */
        "rounded-tl-[3rem]",
        marco,
      ].join(" ")}
    >
      {destacado ? (
        <p
          className={[
            "mb-2.5 self-start rounded-full px-2.5 py-0.5 font-titulo text-xs font-semibold tracking-wide uppercase",
            claro
              ? "bg-brote-100 text-oliva-700"
              : "bg-brote-100/20 text-brote-100",
          ].join(" ")}
        >
          El más pedido
        </p>
      ) : null}

      <h3
        className={[
          "font-titulo text-xl font-bold sm:text-[1.375rem]",
          claro ? "text-petroleo-900" : "text-white",
        ].join(" ")}
      >
        {plan.nombre}
      </h3>

      {/*
        Cuándo aplica el plan, justo debajo del nombre. Es el dato que más se
        pregunta por WhatsApp —«¿el de $350.000 sirve para un sábado?»— y
        esconderlo dentro de la lista de lo que incluye obligaba a leerla
        entera para descubrir que ese plan no sirve para esa fecha.
      */}
      {cuando ? (
        <p
          className={[
            "mt-1.5 font-titulo text-xs font-semibold tracking-wide",
            claro ? "text-oliva-600" : "text-brote-200",
          ].join(" ")}
        >
          {cuando}
        </p>
      ) : null}

      {plan.descripcion ? (
        <p
          className={[
            "mt-1.5 text-[0.8125rem] leading-snug",
            claro ? "text-crema-700" : "text-crema-200/90",
          ].join(" ")}
        >
          {plan.descripcion}
        </p>
      ) : null}

      <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
        {precio === null ? (
          <span
            className={[
              "font-titulo text-xl font-bold",
              claro ? "text-petroleo-700" : "text-brote-200",
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
                "font-titulo text-[1.75rem] font-extrabold tracking-tight sm:text-3xl",
                claro ? "text-petroleo-700" : "text-brote-100",
              ].join(" ")}
            >
              {formatearCOP(precio)}
            </span>
            <span
              className={
                claro ? "text-sm text-crema-600" : "text-sm text-crema-200/80"
              }
            >
              {unidad}
            </span>
          </>
        )}
      </p>

      {/* El precio de una sola persona (hoy, solo Entre Semana: $200.000). */}
      {precio !== null && precioUnaPersona !== null ? (
        <p
          className={[
            "mt-1 text-[0.8125rem]",
            claro ? "text-crema-600" : "text-crema-200/80",
          ].join(" ")}
        >
          <span className="font-titulo font-bold">
            {formatearCOP(precioUnaPersona)}
          </span>{" "}
          si viaja una sola persona
        </p>
      ) : null}

      {incluye.length > 0 ? (
        /*
          LISTA DENSA, NO AIREADA.
          Con `gap-2.5`, `text-sm` y `leading-relaxed`, los ocho puntos de
          «Entre Semana» estiraban la tarjeta hasta que las cuatro no cabían en
          una pantalla de escritorio y había que desplazarse para ver el botón
          de reservar. La lista es una enumeración de servicios, no un texto de
          lectura: se lee mejor apretada.
        */
        <ul className="mt-4 flex flex-1 flex-col gap-1.5">
          {incluye.map((item) => (
            <li key={item} className="flex gap-2 text-[0.8125rem] leading-snug">
              <IconoCheck
                className={[
                  "mt-px size-3.5 shrink-0",
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
        className="mt-5 w-full"
      >
        {ctaTexto}
      </Boton>
    </article>
  );
}
