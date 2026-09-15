import { Foto } from "@/components/ui/foto";
import Link from "next/link";

import { portada, type AlojamientoPublico } from "@/lib/contenido";
import { formatearCOP } from "@/lib/utils/formato";

import { IconoFlecha, IconoPersonas } from "./iconos";

/**
 * Tarjeta de una cabaña.
 *
 * TODA la tarjeta es un enlace, no solo el botón: en móvil, tocar la foto es el
 * gesto natural y obligar a acertarle a un botón de 100 px es una fricción
 * gratuita justo en el camino a la reserva. La flecha del pie es decorativa; el
 * nombre de la cabaña es el texto accesible del enlace.
 *
 * El precio se muestra con "desde" porque es el más bajo de los tres planes de
 * esa cabaña: prometer el precio del plan Premium en la tarjeta sería mentir, y
 * mostrar solo el más caro espanta.
 */
export function TarjetaCabana({
  alojamiento,
  prioridad = false,
}: {
  alojamiento: AlojamientoPublico;
  prioridad?: boolean;
}) {
  const foto = portada(
    alojamiento.galeria,
    `${alojamiento.nombre} de La Finca Eco Hotel`,
  );
  const amenidades = (alojamiento.amenidades ?? []).slice(0, 3);

  return (
    <Link
      href={`/alojamientos/${alojamiento.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-generoso)] bg-white shadow-[var(--shadow-tarjeta)] ring-1 ring-crema-200/60 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--shadow-elevada)]"
    >
      {/* 3:2: las fotos publicadas son 4:3 recortadas, y una casilla algo más
          apaisada hace que las tarjetas se lean como un catálogo y no como un
          álbum. El recorte que sobra es mínimo. */}
      <div className="relative aspect-3/2 overflow-hidden bg-crema-200">
        <Foto
          src={foto.url}
          alt={foto.alt}
          fill
          priority={prioridad}
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        {/*
          La etiqueta del precio lleva fondo OPACO, no translúcido: se apoya
          sobre la foto de la cabaña, que casi siempre es madera anaranjada, y
          un blanco al 90 % se tiñe de naranja y hunde el contraste del texto.
        */}
        {alojamiento.precio_desde !== null ? (
          <p className="absolute top-3 right-3 rounded-full bg-white px-3.5 py-1.5 font-titulo text-sm font-bold text-petroleo-700 shadow-[var(--shadow-tarjeta)]">
            desde {formatearCOP(alojamiento.precio_desde)}
          </p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-titulo text-xl font-bold text-petroleo-900">
            {alojamiento.nombre}
          </h3>
          <p className="flex shrink-0 items-center gap-1.5 text-sm text-crema-600">
            <IconoPersonas className="size-4" />
            {alojamiento.capacidad}
          </p>
        </div>

        {alojamiento.descripcion ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-crema-700">
            {alojamiento.descripcion}
          </p>
        ) : null}

        {amenidades.length > 0 ? (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {amenidades.map((amenidad) => (
              <li
                key={amenidad}
                className="rounded-full bg-petroleo-50 px-2.5 py-1 text-xs font-medium text-petroleo-700"
              >
                {amenidad}
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-2 flex items-center gap-1.5 font-titulo text-sm font-semibold text-petroleo-600 transition-colors duration-200 group-hover:text-petroleo-700">
          Ver la cabaña
          <IconoFlecha className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-1" />
        </p>
      </div>
    </Link>
  );
}
