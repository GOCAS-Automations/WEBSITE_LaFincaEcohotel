import Link from "next/link";

import { Seccion } from "@/components/ui/seccion";
import { getContacto } from "@/lib/contenido";
import { documentosLegales, type ClaveLegal } from "@/lib/legal";
import { DOCUMENTOS_LEGALES } from "@/lib/sitio";
import { formatearFecha } from "@/lib/utils/formato";

/**
 * Documentos legales.
 *
 * Sin foto de cabecera: es un texto que se lee, no una página de venta. Se
 * limita el ancho a ~68 caracteres por línea, que es donde la lectura larga
 * deja de cansar, y se deja al final la navegación entre los cuatro documentos
 * porque quien llega a uno suele necesitar otro.
 */
export async function PaginaLegal({ clave }: { clave: ClaveLegal }) {
  const contacto = await getContacto();
  const documento = documentosLegales(contacto)[clave];

  return (
    <>
      <div className="border-b border-crema-200/70 bg-white">
        <div className="contenedor bajo-nav pb-10 sm:pb-14">
          <nav aria-label="Ruta de navegación" className="mb-4">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-crema-600">
              <li className="flex items-center gap-2">
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center underline-offset-4 transition-colors duration-200 hover:text-petroleo-700 hover:underline"
                >
                  Inicio
                </Link>
                <span aria-hidden="true">/</span>
              </li>
              <li aria-current="page" className="text-petroleo-800">
                {documento.titulo}
              </li>
            </ol>
          </nav>

          <h1 className="max-w-3xl text-3xl leading-tight font-extrabold text-petroleo-900 sm:text-4xl">
            {documento.titulo}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-crema-700">
            {documento.entrada}
          </p>
          <p className="mt-4 text-sm text-crema-600">
            Última actualización:{" "}
            <time dateTime={documento.actualizado}>
              {formatearFecha(documento.actualizado)}
            </time>
          </p>
        </div>
      </div>

      <Seccion fondo="crema">
        <article className="mx-auto flex max-w-[68ch] flex-col gap-10">
          {documento.secciones.map((seccion) => (
            <section key={seccion.titulo} className="flex flex-col gap-4">
              <h2 className="font-titulo text-xl font-bold text-petroleo-900">
                {seccion.titulo}
              </h2>

              {seccion.bloques.map((bloque, indice) =>
                bloque.tipo === "parrafo" ? (
                  <p
                    key={indice}
                    className="text-base leading-relaxed text-crema-800"
                  >
                    {bloque.texto}
                  </p>
                ) : (
                  <ul key={indice} className="flex flex-col gap-2.5 pl-1">
                    {bloque.items.map((item) => (
                      <li
                        key={item.slice(0, 40)}
                        className="flex gap-3 text-base leading-relaxed text-crema-800"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2.5 size-1.5 shrink-0 rounded-full bg-petroleo-400"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ),
              )}
            </section>
          ))}

          <nav
            aria-label="Otros documentos legales"
            className="mt-4 border-t border-crema-300/70 pt-8"
          >
            <h2 className="font-titulo text-sm font-semibold tracking-[0.16em] text-oliva-600 uppercase">
              Otros documentos
            </h2>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              {DOCUMENTOS_LEGALES.filter(
                (otro) => otro.href !== documento.ruta,
              ).map((otro) => (
                <li key={otro.href}>
                  <Link
                    href={otro.href}
                    className="text-sm text-petroleo-700 underline-offset-4 transition-colors duration-200 hover:text-petroleo-900 hover:underline"
                  >
                    {otro.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </article>
      </Seccion>
    </>
  );
}
