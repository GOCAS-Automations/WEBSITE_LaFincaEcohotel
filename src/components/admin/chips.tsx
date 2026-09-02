"use client";

import { useState, type KeyboardEvent } from "react";

import { CLASE_INPUT } from "./ui";

/**
 * Editor de listas cortas de texto (amenidades, lo que incluye un plan)
 * presentado como pastillas.
 *
 * Lo que viaja al servidor es el JSON del arreglo, dentro de un input oculto:
 * así el formulario sigue siendo un `<form>` normal con Server Action, sin
 * `onSubmit` ni `fetch` a mano.
 */
export function Chips({
  name,
  inicial,
  marcador = "Escribe y presiona Enter",
  sugerencias = [],
}: {
  name: string;
  inicial: string[];
  marcador?: string;
  sugerencias?: string[];
}) {
  const [items, setItems] = useState<string[]>(inicial);
  const [borrador, setBorrador] = useState("");

  function anadir(crudo: string) {
    const valor = crudo.trim();
    if (!valor) return;
    // Sin distinguir mayúsculas, para no acabar con "Wifi" y "wifi".
    if (items.some((item) => item.toLowerCase() === valor.toLowerCase())) {
      setBorrador("");
      return;
    }
    setItems([...items, valor]);
    setBorrador("");
  }

  function quitar(indice: number) {
    setItems(items.filter((_, i) => i !== indice));
  }

  function alTeclear(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Enter" || evento.key === ",") {
      // Enter dentro de un input enviaría el formulario entero.
      evento.preventDefault();
      anadir(borrador);
      return;
    }
    if (evento.key === "Backspace" && !borrador && items.length) {
      setItems(items.slice(0, -1));
    }
  }

  const pendientes = sugerencias.filter(
    (item) =>
      !items.some((actual) => actual.toLowerCase() === item.toLowerCase()),
  );

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(items)} />

      {items.length > 0 && (
        <ul className="mb-2.5 flex flex-wrap gap-2">
          {items.map((item, indice) => (
            <li key={`${item}-${indice}`}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-petroleo-600/10 py-1 pl-3 pr-1.5 text-[0.8125rem] font-medium text-petroleo-800">
                {item}
                <button
                  type="button"
                  onClick={() => quitar(indice)}
                  aria-label={`Quitar ${item}`}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-petroleo-700/70 transition-colors hover:bg-petroleo-600/20 hover:text-petroleo-900"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
                    <path
                      d="M6 6l12 12M18 6 6 18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={borrador}
          onChange={(evento) => setBorrador(evento.target.value)}
          onKeyDown={alTeclear}
          onBlur={() => anadir(borrador)}
          placeholder={marcador}
          className={CLASE_INPUT}
        />
        <button
          type="button"
          onClick={() => anadir(borrador)}
          className="shrink-0 rounded-suave bg-crema-900/[0.06] px-4 text-[0.875rem] font-semibold text-crema-900 transition-colors hover:bg-crema-900/[0.1]"
        >
          Añadir
        </button>
      </div>

      {pendientes.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[0.75rem] text-crema-600">Sugerencias:</span>
          {pendientes.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => anadir(item)}
              className="rounded-full bg-crema-900/[0.05] px-2.5 py-1 text-[0.75rem] font-medium text-crema-700 transition-colors hover:bg-crema-900/[0.09]"
            >
              + {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
