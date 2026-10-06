"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import { claseBoton } from "@/components/admin/ui";

/**
 * Lo que se ve cuando una pantalla del panel no se puede cargar: se cayó la
 * lectura de la base, Google tardó demasiado, se cortó el internet del
 * celular a mitad de camino…
 *
 * Antes no existía y el equipo veía una pantalla en blanco con un error en
 * inglés. Ahora se pinta DENTRO del marco del panel —este archivo vive junto a
 * `layout.tsx`, así que la cabecera y el menú siguen ahí— con tres cosas: qué
 * pasó en palabras normales, un «Reintentar» y qué hacer si sigue fallando.
 *
 * «Reintentar» vuelve a pedirle los datos al servidor (`router.refresh()`) y
 * redibuja la pantalla (`reset()`): con solo `reset()` se repetiría lo mismo
 * que ya falló, porque los datos de un componente de servidor no se vuelven a
 * pedir.
 *
 * El código del error (`digest`) se muestra pequeño: al equipo no le dice nada,
 * pero si se lo pasan al desarrollador, con él encuentra la línea exacta en el
 * registro de Vercel. El mensaje técnico NUNCA se pinta.
 */
export default function ErrorDelPanel({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [reintentando, iniciar] = useTransition();

  useEffect(() => {
    console.error("[panel] una pantalla no se pudo cargar:", error);
  }, [error]);

  return (
    <section
      role="alert"
      aria-labelledby="titulo-error-panel"
      className="rounded-amplio bg-white px-5 py-8 shadow-tarjeta ring-1 ring-crema-900/[0.06] sm:px-10 sm:py-12"
    >
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-dorado-500/15 text-dorado-700"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-7"
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
        </span>

        <h1
          id="titulo-error-panel"
          className="mt-5 text-[1.5rem] text-crema-900 sm:text-[1.75rem]"
        >
          No se pudo cargar esta pantalla
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-crema-700">
          Suele ser la conexión a internet o una falla momentánea del servidor.
          No se perdió ni se cambió nada: lo último que guardaste sigue
          guardado.
        </p>

        <div className="mt-6 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() =>
              iniciar(() => {
                router.refresh();
                reset();
              })
            }
            disabled={reintentando}
            className={claseBoton("primario")}
          >
            {reintentando ? "Reintentando…" : "Reintentar"}
          </button>
          <Link href="/admin" className={claseBoton("secundario")}>
            Ir al resumen
          </Link>
        </div>

        <div className="mt-8 w-full rounded-tarjeta bg-crema-100/80 px-4 py-3.5 text-left text-[0.8125rem] leading-relaxed text-crema-800">
          <p className="font-semibold text-crema-900">Si sigue sin cargar</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-5">
            <li>Revisa que el celular o el computador tengan internet.</li>
            <li>Espera un par de minutos y toca «Reintentar» otra vez.</li>
            <li>
              Si nada de eso funciona, avísale al desarrollador: cuéntale en qué
              pantalla estabas, a qué hora pasó
              {error.digest ? " y este código" : ""}.
            </li>
          </ol>
          {error.digest ? (
            <p className="mt-2 font-mono text-[0.75rem] text-crema-600">
              Código del error: {error.digest}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
