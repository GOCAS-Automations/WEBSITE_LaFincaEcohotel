import Image from "next/image";
import Link from "next/link";

import type { HeroListado } from "@/lib/contenido";

import { Neblina } from "./atmosfera";

/**
 * Banda de cabecera de las páginas internas.
 *
 * Una sola foto, el título de la página y —si hace falta— las migas de pan.
 * El degradado no es decorativo: sin él, un titular blanco sobre una foto clara
 * baja del contraste 4.5:1 que exige la accesibilidad AA. Se pinta desde abajo
 * para oscurecer justo la franja donde va el texto y dejar la foto limpia
 * arriba.
 *
 * El tinte del degradado es verde bosque, no gris neutro: es lo que hace que la
 * fotografía pertenezca a la paleta en vez de estar pegada encima. Y lleva la
 * misma bruma a la deriva que el hero de la portada, en `mix-blend-screen`
 * para que aclare la foto sin lavarla.
 */

export type Miga = { nombre: string; ruta: string };

type PropsHero = {
  hero: HeroListado;
  /** Migas visibles. La última es la página actual y no lleva enlace. */
  migas?: Miga[];
  /** `priority` cuando esta imagen es la más grande del primer visor. */
  prioridad?: boolean;
};

export function HeroPagina({ hero, migas, prioridad = true }: PropsHero) {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="relative h-[46vh] min-h-72 w-full sm:h-[52vh] sm:min-h-88 lg:min-h-[26rem]">
        {/*
          CALIDAD 90, NO 75.

          Esta foto se ve al ancho entero de la ventana: es, con el hero de la
          portada, la única superficie del sitio donde se aprecia la compresión.
          Y el material del hotel ya viene comprimido de Instagram, así que cada
          pasada de WebP encima se nota. A 75 los heros se veían blandos —es lo
          que reportó Cesar—; a 90, y partiendo de los archivos de
          `web/heroes/` (cortados del original a calidad 90 en vez de heredar la
          copia de `web/`, ver `src/lib/fotos.ts`), la foto llega con una sola
          generación de pérdida.

          El coste en bytes es real pero acotado: son unos 40-60 kB más en una
          imagen que ya estaba en el primer visor. No entra ninguna petición
          nueva.
        */}
        <Image
          src={hero.imagen}
          alt={hero.imagen_alt}
          fill
          priority={prioridad}
          quality={90}
          sizes="100vw"
          className="object-cover"
        />
        {/* La bruma va DEBAJO del degradado: encima aclararía justo la franja
            del titular y hundiría su contraste. */}
        <Neblina tono="clara" className="mix-blend-screen" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-bosque-950/88 via-bosque-950/48 to-bosque-950/15"
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="contenedor pb-8 sm:pb-10 lg:pb-12">
          {migas && migas.length > 0 ? (
            <nav aria-label="Ruta de navegación" className="mb-3">
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-crema-200/90">
                {migas.map((miga, indice) => {
                  const ultima = indice === migas.length - 1;
                  return (
                    <li key={miga.ruta} className="flex items-center gap-2">
                      {ultima ? (
                        <span aria-current="page" className="text-white/95">
                          {miga.nombre}
                        </span>
                      ) : (
                        <>
                          <Link
                            href={miga.ruta}
                            className="underline-offset-4 transition-colors duration-200 hover:text-white hover:underline"
                          >
                            {miga.nombre}
                          </Link>
                          <span aria-hidden="true" className="text-crema-300/60">
                            /
                          </span>
                        </>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          ) : null}

          <h1 className="max-w-3xl text-3xl leading-[1.12] font-bold text-white sm:text-4xl lg:text-5xl">
            {hero.titulo}
          </h1>

          {hero.subtitulo ? (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-crema-100/95 sm:text-lg">
              {hero.subtitulo}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
