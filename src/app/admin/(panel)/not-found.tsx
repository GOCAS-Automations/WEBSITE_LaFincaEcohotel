import type { Metadata } from "next";

import { EnlaceBoton } from "@/components/admin/ui";

/**
 * 404 del panel: una ficha que no existe (`/admin/reservas/no-es-uuid`, una
 * reserva borrada, un enlace recortado al copiarlo por WhatsApp) o una
 * dirección del panel que no lleva a ninguna parte.
 *
 * Antes caía en la 404 del sitio público: el equipo salía del panel, sin menú
 * y con un botón de «Escribir por WhatsApp» al propio hotel. Esta vive junto
 * al `layout.tsx` del panel, así que la cabecera y el menú siguen a la vista y
 * volver es un toque.
 */
export const metadata: Metadata = {
  title: "No encontrado",
};

export default function NoEncontradoPanel() {
  return (
    <section
      aria-labelledby="titulo-no-encontrado-panel"
      className="rounded-amplio bg-white px-5 py-8 shadow-tarjeta ring-1 ring-crema-900/[0.06] sm:px-10 sm:py-12"
    >
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-petroleo-600/10 text-petroleo-700"
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
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
            <path d="M8.5 11h5" />
          </svg>
        </span>

        <p className="mt-5 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-crema-600">
          Página no encontrada
        </p>
        <h1
          id="titulo-no-encontrado-panel"
          className="mt-1.5 text-[1.5rem] text-crema-900 sm:text-[1.75rem]"
        >
          Eso no está en el panel
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-crema-700">
          Puede que lo hayan borrado o que el enlace llegara incompleto (pasa
          al copiarlo por WhatsApp). Búscalo desde el menú: las reservas están
          en «Reservas», con el calendario y el listado.
        </p>

        <div className="mt-6 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:justify-center">
          <EnlaceBoton href="/admin/reservas">Ver las reservas</EnlaceBoton>
          <EnlaceBoton href="/admin" tono="secundario">
            Ir al resumen
          </EnlaceBoton>
        </div>
      </div>
    </section>
  );
}
