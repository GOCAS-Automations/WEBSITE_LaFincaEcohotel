"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import { Neblina } from "@/components/sitio/atmosfera";
import { CaminosDeSalida } from "@/components/sitio/caminos-de-salida";
import { IconoHoja, IconoWhatsapp } from "@/components/sitio/iconos";
import { clasesBoton } from "@/components/ui/boton";
import { MENSAJE_GENERAL, enlaceWhatsapp } from "@/lib/whatsapp";

/**
 * Lo que ve el visitante si una página del sitio no se puede cargar (se cayó
 * la base, se cortó la conexión a mitad de camino).
 *
 * Vive dentro del grupo `(publico)`, así que el encabezado, el pie con el RNT y
 * el botón flotante de WhatsApp siguen en pantalla. Igual que la 404, no es un
 * callejón sin salida: quien llega aquí casi siempre quiere reservar, así que
 * tiene «Reintentar», el inicio y WhatsApp —el canal que nunca depende de que
 * la página cargue—.
 *
 * Es un componente de cliente (así lo exige Next), y por eso no lee el número
 * del panel: usa el de `SITIO.contacto`, el respaldo en código, que es
 * justamente el que sirve cuando la base no responde.
 *
 * Se ve como la 404 (neblina, titular corto y la lista de caminos de
 * `CaminosDeSalida`) porque para el visitante es lo mismo: no llegó a donde
 * iba. Lo distinto es «Reintentar», que va como botón principal encima de la
 * lista; no lleva el «404» grande, que aquí sería mentira.
 */
export default function ErrorDelSitio({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [reintentando, iniciar] = useTransition();

  useEffect(() => {
    console.error("[sitio] una página no se pudo cargar:", error);
  }, [error]);

  return (
    <section role="alert" className="relative overflow-hidden bg-crema-50">
      <Neblina tono="verde" className="opacity-60" />

      <div className="contenedor bajo-nav relative z-10 flex flex-col items-center pb-20 text-center sm:pb-28">
        <div className="flex flex-col items-center gap-4 pt-6 sm:pt-10">
          <p className="font-titulo text-sm font-semibold tracking-[0.18em] text-oliva-600 uppercase">
            Un momento
          </p>
          <h1 className="max-w-xl text-3xl leading-tight font-extrabold text-balance text-petroleo-900 sm:text-4xl">
            Esta página no cargó como debía
          </h1>
          <p className="max-w-md text-base leading-relaxed text-pretty text-crema-700">
            Puede ser la conexión o una falla momentánea de nuestro lado. Vuelve
            a intentarlo en unos segundos. Si quieres reservar ya, escríbenos
            por WhatsApp: te respondemos con disponibilidad y precio.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            iniciar(() => {
              router.refresh();
              reset();
            })
          }
          disabled={reintentando}
          className={clasesBoton(
            "primario",
            "grande",
            "mt-10 w-full max-w-md disabled:opacity-60",
          )}
        >
          {reintentando ? "Reintentando…" : "Reintentar"}
        </button>

        <CaminosDeSalida
          className="mt-4 w-full max-w-md"
          caminos={[
            {
              etiqueta: "Volver al inicio",
              detalle: "La portada de La Finca",
              href: "/",
              icono: <IconoHoja className="size-5" />,
            },
            {
              etiqueta: "Escribir por WhatsApp",
              detalle: "Funciona aunque el sitio no cargue",
              href: enlaceWhatsapp(MENSAJE_GENERAL),
              icono: <IconoWhatsapp className="size-5" />,
              externo: true,
              claseIcono: "bg-[#25D366]",
            },
          ]}
        />
      </div>
    </section>
  );
}
