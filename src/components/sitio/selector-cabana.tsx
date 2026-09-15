"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { IconoCabana, IconoCheck, IconoChevron } from "./iconos";
import { useLadoDelPanel } from "./usar-lado-panel";

/**
 * El desplegable de cabañas del módulo de reserva, escrito a mano.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ DEJA DE SER UN `<select>`
 * ---------------------------------------------------------------------------
 * Al `<select>` se le puede quitar la piel del sistema (`appearance-none`) y
 * darle el radio, el borde y el alto del resto del formulario —eso ya se hizo
 * en la ronda anterior—, pero **la lista desplegada no se puede tocar**: la
 * dibuja el sistema operativo, con sus esquinas rectas, su tipografía y su
 * azul de selección. En escritorio, que es donde esa lista se ve, el control
 * seguía leyéndose como el de un formulario de 2009 al lado de un calendario
 * con radios de 12 px. Es lo que reportó Cesar: «se ve anticuado».
 *
 * Así que aquí la lista también es nuestra. Lo que NO se pierde por el camino:
 *
 * · **El teclado.** Patrón «combobox de solo selección» de las APG: cerrado,
 *   ↓ ↑ Inicio Fin Enter y Espacio lo abren; abierto, ↓ ↑ mueven la opción
 *   activa, Inicio y Fin van a la primera y la última, Enter y Espacio eligen
 *   y cierran, Escape cierra sin cambiar nada y Tab elige y sigue. Además, al
 *   teclear una letra salta a la primera cabaña que empieza por ella.
 * · **El lector de pantalla.** `role="combobox"` sobre el botón, `listbox` en
 *   la lista y `option` en cada ítem, con `aria-expanded`, `aria-controls`,
 *   `aria-activedescendant` —el foco NUNCA se va del botón— y `aria-selected`.
 * · **El envío sin JavaScript.** Ver la nota de abajo: mientras React no ha
 *   hidratado, lo que se pinta es el `<select>` nativo de siempre.
 *
 * ---------------------------------------------------------------------------
 * DOS PASADAS: PRIMERO EL `<select>`, DESPUÉS EL COMBOBOX
 * ---------------------------------------------------------------------------
 * El módulo de la portada es un `<form method="get">` de verdad y una de sus
 * reglas es que funcione sin JavaScript. Un botón con un `<input hidden>` al
 * lado no lo cumple: sin JavaScript no hay forma de cambiar ese valor.
 *
 * Por eso el primer render —el del servidor y el de la hidratación— es el
 * `<select name="cabana">` de siempre, con exactamente la misma piel, y solo
 * después de montarse se sustituye por el combobox. Quien tenga JavaScript no
 * ve el cambio (los dos controles son idénticos en pantalla); quien no lo
 * tenga se queda con un desplegable nativo que envía su valor. Y como solo uno
 * de los dos está en el árbol a la vez, nunca se envía `cabana` dos veces.
 */

export type OpcionCabana = { slug: string; nombre: string };

type Props = {
  cabanas: OpcionCabana[];
  /** `slug` elegido; cadena vacía = «Cualquier cabaña». */
  valor: string;
  alCambiar: (slug: string) => void;
  /** Nombre del campo en el formulario. */
  nombre?: string;
  /** `id` del texto que hace de etiqueta visible. */
  etiquetaId: string;
};

/** «Cualquier cabaña» va primero y es la opción por defecto. */
const CUALQUIERA = "Cualquier cabaña";

/*
  La piel del control, compartida por el `<select>` de la primera pasada y por
  el botón del combobox: el mismo radio, el mismo borde y el mismo alto que el
  campo de fechas de al lado (`CalendarioFechas`). Si un día cambia uno, tiene
  que cambiar el otro, y por eso está escrita una sola vez.
*/
const CLASE_CONTROL =
  "flex w-full min-h-11 items-center gap-2 rounded-[var(--radius-suave)] border border-crema-300/90 bg-white px-3.5 py-3 text-left " +
  "font-titulo text-[0.95rem] font-medium text-petroleo-900 shadow-[inset_0_1px_2px_rgba(41,37,33,0.04)] " +
  "transition-colors duration-200 outline-none hover:border-crema-400 focus-visible:border-petroleo-500";

export function SelectorCabana({
  cabanas,
  valor,
  alCambiar,
  nombre = "cabana",
  etiquetaId,
}: Props) {
  const idLista = useId();
  const idBoton = useId();

  const [montado, setMontado] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);

  const contenedor = useRef<HTMLDivElement>(null);
  const disparador = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  /** Búsqueda por letras: lo tecleado y cuándo, para agrupar pulsaciones. */
  const escrito = useRef({ texto: "", cuando: 0 });

  useEffect(() => setMontado(true), []);

  /* Memorizado para que `elegir` no se rehaga en cada pintado: es la lista
     completa, con «Cualquier cabaña» al frente. */
  const opciones: OpcionCabana[] = useMemo(
    () => [{ slug: "", nombre: CUALQUIERA }, ...cabanas],
    [cabanas],
  );

  /*
    HACIA ARRIBA SI ABAJO NO CABE.
    El módulo vive dentro del hero, así que la lista se abre a media pantalla y
    con seis cabañas mide 276 px: a 1440×900 su último ítem caía en y = 929, ya
    fuera de la ventana. Ver `useLadoDelPanel`. El alto estimado se calcula con
    los 44 px de cada ítem más el relleno, para acertar el lado ya en el primer
    pintado; después manda el alto real del panel.
  */
  const { lado, espacio } = useLadoDelPanel({
    abierto,
    disparador,
    panel: lista,
    altoEstimado: opciones.length * 44 + 12,
  });
  const indiceElegido = Math.max(
    0,
    opciones.findIndex((opcion) => opcion.slug === valor),
  );
  const elegida = opciones[indiceElegido];

  /* --- Cierre por clic fuera ------------------------------------------- */
  useEffect(() => {
    if (!abierto) return;
    function alPulsarFuera(evento: MouseEvent) {
      if (!contenedor.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", alPulsarFuera);
    return () => document.removeEventListener("mousedown", alPulsarFuera);
  }, [abierto]);

  /* La opción activa siempre a la vista: con cinco cabañas y «Cualquiera» la
     lista cabe entera, pero el hotel puede añadir más desde el panel. */
  useEffect(() => {
    if (!abierto) return;
    lista.current
      ?.querySelector<HTMLLIElement>(`[data-indice="${activo}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [abierto, activo]);

  const abrir = useCallback(
    (indice: number) => {
      setActivo(indice);
      setAbierto(true);
    },
    [],
  );

  const elegir = useCallback(
    (indice: number) => {
      const opcion = opciones[indice];
      if (!opcion) return;
      alCambiar(opcion.slug);
      setActivo(indice);
      setAbierto(false);
      disparador.current?.focus();
    },
    [opciones, alCambiar],
  );

  function buscarPorLetra(letra: string) {
    const ahora = Date.now();
    /* Medio segundo para encadenar letras: «ca», «cab»… Pasado ese tiempo se
       empieza una búsqueda nueva, como en cualquier lista del sistema. */
    const texto =
      ahora - escrito.current.cuando < 500
        ? escrito.current.texto + letra
        : letra;
    escrito.current = { texto, cuando: ahora };

    const normalizar = (valor: string) =>
      valor
        .toLocaleLowerCase("es")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");

    const buscado = normalizar(texto);
    const encontrado = opciones.findIndex((opcion) =>
      normalizar(opcion.nombre).startsWith(buscado),
    );
    if (encontrado >= 0) {
      if (abierto) setActivo(encontrado);
      else elegir(encontrado);
    }
  }

  function teclas(evento: React.KeyboardEvent<HTMLButtonElement>) {
    const ultima = opciones.length - 1;

    if (evento.key === "Escape") {
      if (abierto) {
        evento.preventDefault();
        evento.stopPropagation();
        setAbierto(false);
      }
      return;
    }

    if (evento.key === "Tab") {
      /* Tab elige lo que esté activo y sigue su camino, como el nativo. */
      if (abierto) elegir(activo);
      return;
    }

    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      evento.preventDefault();
      const paso = evento.key === "ArrowDown" ? 1 : -1;
      if (!abierto) {
        abrir(Math.min(ultima, Math.max(0, indiceElegido + paso)));
        return;
      }
      setActivo((indice) => Math.min(ultima, Math.max(0, indice + paso)));
      return;
    }

    if (evento.key === "Home" || evento.key === "End") {
      evento.preventDefault();
      const destino = evento.key === "Home" ? 0 : ultima;
      if (!abierto) abrir(destino);
      else setActivo(destino);
      return;
    }

    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      if (!abierto) abrir(indiceElegido);
      else elegir(activo);
      return;
    }

    /* Una letra sola: búsqueda. Con Ctrl o Alt no, que son atajos. */
    if (evento.key.length === 1 && !evento.ctrlKey && !evento.altKey && !evento.metaKey) {
      buscarPorLetra(evento.key);
    }
  }

  /* ---------------------------------------------------------------------
     PRIMERA PASADA: el `<select>` nativo, para que el formulario funcione
     aunque JavaScript no llegue nunca. Ver la nota de la cabecera.
  --------------------------------------------------------------------- */
  if (!montado) {
    return (
      <span className="relative block">
        <IconoCabana className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-oliva-600" />
        <select
          name={nombre}
          defaultValue={valor}
          aria-labelledby={etiquetaId}
          className={`${CLASE_CONTROL} cursor-pointer appearance-none truncate pr-10 pl-9`}
        >
          {opciones.map((opcion) => (
            <option key={opcion.slug || "cualquiera"} value={opcion.slug}>
              {opcion.nombre}
            </option>
          ))}
        </select>
        <IconoChevron className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-crema-600" />
      </span>
    );
  }

  return (
    <div ref={contenedor} className="relative">
      {/* El valor que viaja en la dirección al enviar el formulario. */}
      <input type="hidden" name={nombre} value={valor} />

      <button
        ref={disparador}
        id={idBoton}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-labelledby={`${etiquetaId} ${idBoton}`}
        aria-activedescendant={abierto ? `${idLista}-${activo}` : undefined}
        onClick={() => (abierto ? setAbierto(false) : abrir(indiceElegido))}
        onKeyDown={teclas}
        className={`${CLASE_CONTROL} cursor-pointer pr-10 pl-9 ${
          abierto ? "border-petroleo-500" : ""
        }`}
      >
        <IconoCabana className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-oliva-600" />
        <span className="truncate">{elegida.nombre}</span>
        <IconoChevron
          className={`pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-crema-600 transition-transform duration-200 ${
            abierto ? "rotate-180" : ""
          }`}
        />
      </button>

      {abierto ? (
        <ul
          ref={lista}
          id={idLista}
          role="listbox"
          aria-labelledby={etiquetaId}
          tabIndex={-1}
          /* El tope de alto sale del espacio que de verdad queda en ese lado:
             si no cabe entera ni arriba ni abajo, se desplaza dentro de sí
             misma en vez de salirse de la pantalla. Nunca por debajo de 176 px,
             que son cuatro ítems: una lista de dos líneas no es una lista. */
          style={{ maxHeight: Math.max(176, espacio) }}
          className={[
            "absolute left-0 z-50 w-full overflow-y-auto overscroll-contain rounded-[var(--radius-tarjeta)] bg-white p-1.5 shadow-[var(--shadow-elevada)] ring-1 ring-crema-200",
            lado === "arriba"
              ? "bottom-[calc(100%+0.375rem)]"
              : "top-[calc(100%+0.375rem)]",
          ].join(" ")}
        >
          {opciones.map((opcion, indice) => {
            const seleccionada = indice === indiceElegido;
            const enFoco = indice === activo;
            return (
              <li
                key={opcion.slug || "cualquiera"}
                id={`${idLista}-${indice}`}
                data-indice={indice}
                role="option"
                aria-selected={seleccionada}
                /* `mousedown` y no `click`: el cierre por clic fuera escucha
                   `mousedown`, y con `click` la lista ya se habría cerrado. */
                onMouseDown={(evento) => {
                  evento.preventDefault();
                  elegir(indice);
                }}
                onMouseEnter={() => setActivo(indice)}
                /* 44 px de alto: el mínimo que se acierta con el pulgar. */
                className={[
                  "flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-[10px] px-3 py-2.5",
                  "font-titulo text-[0.95rem] transition-colors duration-150",
                  seleccionada
                    ? "bg-brote-100 font-semibold text-petroleo-900"
                    : enFoco
                      ? "bg-brote-50 text-petroleo-900"
                      : "text-crema-800",
                  enFoco && seleccionada ? "bg-brote-200" : "",
                ].join(" ")}
              >
                <span className="truncate">{opcion.nombre}</span>
                {seleccionada ? (
                  <IconoCheck className="size-4 shrink-0 text-oliva-600" />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
