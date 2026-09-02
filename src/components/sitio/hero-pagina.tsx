import Image from "next/image";
import Link from "next/link";

import type { HeroListado } from "@/lib/contenido";

/**
 * Banda de cabecera de las páginas internas.
 *
 * Una sola foto, el título de la página y —si hace falta— las migas de pan.
 * El degradado no es decorativo: sin él, un titular blanco sobre una foto clara
 * baja del contraste 4.5:1 que exige la accesibilidad AA. Se pinta desde abajo
 * para oscurecer justo la franja donde va el texto y dejar la foto limpia
 * arriba.
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
        <Image
          src={hero.imagen}
          alt={hero.imagen_alt}
          fill
          priority={prioridad}
          quality={75}
          sizes="100vw"
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-crema-950/85 via-crema-950/45 to-crema-950/15"
        />
      </div>

      <div className="absolute inset-x-0 bottom-0">
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
