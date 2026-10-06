"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import { IconoWhatsapp } from "@/components/sitio/iconos";
import { Boton, clasesBoton } from "@/components/ui/boton";
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
    <section
      role="alert"
      className="contenedor bajo-nav flex flex-col items-center gap-8 pb-16 text-center sm:pb-24"
    >
      <div className="flex flex-col items-center gap-4">
        <p className="font-titulo text-sm font-semibold tracking-[0.18em] text-oliva-600 uppercase">
          Un momento
        </p>
        <h1 className="max-w-2xl text-3xl leading-tight font-extrabold text-petroleo-900 sm:text-4xl">
          Esta página no cargó como debía
        </h1>
        <p className="max-w-md text-base leading-relaxed text-crema-700">
          Puede ser la conexión o una falla momentánea de nuestro lado. Vuelve a
          intentarlo en unos segundos. Si quieres reservar ya, escríbenos por
          WhatsApp: te respondemos con disponibilidad y precio.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() =>
            iniciar(() => {
              router.refresh();
              reset();
            })
          }
          disabled={reintentando}
          className={clasesBoton("primario", "grande", "disabled:opacity-60")}
        >
          {reintentando ? "Reintentando…" : "Reintentar"}
        </button>
        <Boton
          href={enlaceWhatsapp(MENSAJE_GENERAL)}
          variante="contorno"
          tamano="grande"
          externo
        >
          <IconoWhatsapp className="size-5" />
          Escribir por WhatsApp
        </Boton>
      </div>

      <Link
        href="/"
        className="text-sm text-petroleo-700 underline-offset-4 transition-colors duration-200 hover:text-petroleo-900 hover:underline"
      >
        Volver al inicio
      </Link>
    </section>
  );
}
