import Image from "next/image";
import Link from "next/link";

import { salirAction } from "./acciones";
import { BotonEnviar } from "@/components/admin/boton-enviar";
import { NavPanel } from "@/components/admin/nav-panel";
import { requireAdmin } from "@/lib/admin/auth";

/**
 * Marco del panel: cabecera con la sesión y navegación (lateral en escritorio,
 * pestañas en el celular).
 *
 * `requireAdmin()` corre en cada navegación. El middleware ya filtra, pero
 * repetir la comprobación aquí evita que una ruta quede al aire si algún día
 * cambia el `matcher`.
 */
export default async function LayoutPanel({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { usuario, rol } = await requireAdmin();

  return (
    <div className="min-h-screen bg-crema-100">
      <header className="sticky top-0 z-40 border-b border-crema-900/[0.07] bg-crema-50/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Image
              src="/marca/icono.png"
              alt=""
              width={128}
              height={128}
              priority
              className="h-8 w-8 rounded-lg object-contain"
            />
            <span className="font-titulo text-[0.9375rem] font-semibold text-crema-900">
              La Finca
              <span className="ml-1.5 font-normal text-crema-600">· Panel</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold text-petroleo-700 transition-colors hover:bg-petroleo-600/10 sm:inline-flex"
            >
              Ver el sitio
            </Link>
            {/* «Mi cuenta» (con «Cambiar mi contraseña») para cualquier rol.
                En escritorio se lee el correo; en el celular, la palabra. */}
            <Link
              href="/admin/cuenta"
              title={`Mi cuenta${usuario.email ? ` · ${usuario.email}` : ""}`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold text-crema-700 transition-colors hover:bg-crema-900/[0.06] hover:text-crema-900"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 shrink-0"
              >
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20a7 7 0 0 1 14 0" />
              </svg>
              <span className="md:hidden">Mi cuenta</span>
              <span className="hidden max-w-[14rem] truncate font-normal md:inline">
                {usuario.email ?? "Mi cuenta"}
              </span>
            </Link>
            <form action={salirAction}>
              <BotonEnviar
                tono="secundario"
                tamano="sm"
                etiquetaEnEspera="Saliendo…"
              >
                Salir
              </BotonEnviar>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[88rem] gap-8 px-4 py-5 sm:px-6 lg:flex lg:px-8 lg:py-10">
        <aside className="lg:w-60 lg:shrink-0">
          <div className="lg:sticky lg:top-24">
            <NavPanel rol={rol} />
          </div>
        </aside>

        <main className="min-w-0 flex-1 pt-6 lg:pt-0">{children}</main>
      </div>
    </div>
  );
}
