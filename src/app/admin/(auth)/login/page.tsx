import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { FormularioLogin } from "./formulario-login";
import { Banner } from "@/components/admin/ui";
import { MENSAJE_SIN_ACCESO } from "@/lib/admin/roles";
import {
  destinoAdminSeguro,
  MOTIVO_SIN_ACCESO,
} from "@/lib/supabase/middleware";

export const metadata: Metadata = {
  title: "Entrar al panel",
  robots: { index: false, follow: false },
};

/** El formulario depende de `?next=`: no tiene sentido prerenderizarlo. */
export const dynamic = "force-dynamic";

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; motivo?: string }>;
}) {
  const params = await searchParams;
  const destino = destinoAdminSeguro(params.next);
  /* Llega aquí desde el middleware o desde `requireAdmin()` cuando la sesión
     era de una cuenta sin rol del panel. En la URL solo viaja la clave. */
  const sinAcceso = params.motivo === MOTIVO_SIN_ACCESO;

  return (
    <main className="flex min-h-screen items-center justify-center bg-crema-100 px-4 py-12">
      <div className="w-full max-w-[26rem]">
        <div className="rounded-generoso bg-white p-7 shadow-elevada ring-1 ring-crema-900/[0.05] sm:p-9">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/marca/logo-principal.png"
              alt="La Finca Eco Hotel"
              width={512}
              height={512}
              priority
              className="h-14 w-auto"
            />
            <h1 className="mt-5 text-[1.5rem] text-crema-900">
              Panel de La Finca
            </h1>
            <p className="mt-1.5 text-[0.875rem] leading-relaxed text-crema-700">
              Desde aquí se manejan las reservas, las cabañas y los textos del
              sitio web.
            </p>
          </div>

          {sinAcceso && (
            <div className="mt-6">
              <Banner tono="error">{MENSAJE_SIN_ACCESO}</Banner>
            </div>
          )}

          <div className="mt-7">
            <FormularioLogin destino={destino} />
          </div>
        </div>

        <p className="mt-6 text-center text-[0.8125rem] leading-relaxed text-crema-700">
          <Link
            href="/"
            className="font-medium text-petroleo-700 underline-offset-4 hover:underline"
          >
            Volver al sitio
          </Link>
          <span className="mx-2 text-crema-400">·</span>
          ¿Olvidaste la contraseña? Escríbele al desarrollador.
        </p>
      </div>
    </main>
  );
}
