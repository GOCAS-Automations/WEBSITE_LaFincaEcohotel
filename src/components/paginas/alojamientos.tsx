import Image from "next/image";
import Link from "next/link";

import {
  ColibriesSueltos,
  Neblina,
  RamaBotanica,
} from "@/components/sitio/atmosfera";
import { CierreReserva } from "@/components/sitio/cierre-reserva";
import { HeroPagina } from "@/components/sitio/hero-pagina";
import { IconoCheck, IconoFlecha, IconoPersonas } from "@/components/sitio/iconos";
import { Boton } from "@/components/ui/boton";
import { Revelar } from "@/components/ui/revelar";
import { Seccion } from "@/components/ui/seccion";
import {
  getAlojamientos,
  getHeroesListados,
  getSeccionPlanes,
  portada,
  type AlojamientoPublico,
} from "@/lib/contenido";
import { formatearCOP } from "@/lib/utils/formato";

/**
 * Listado de cabañas — en zigzag.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ZIGZAG Y NO UNA REJILLA DE TARJETAS
 * ---------------------------------------------------------------------------
 * En la portada, la rejilla de cinco tarjetas está bien: ahí la pregunta es
 * «¿cuántas hay y cómo se ven?». Aquí la pregunta es otra —«¿cuál escojo?»— y
 * una rejilla de cinco tarjetas idénticas la responde mal: obliga a comparar
 * cinco descripciones recortadas a tres líneas.
 *
 * En filas alternas imagen/texto cada cabaña tiene su propio espacio: una foto
 * grande de su rasgo distintivo (los dos niveles, el jacuzzi bajo el árbol, el
 * comedor en el balcón, la chimenea) y al lado su descripción entera, lo que
 * incluye y su precio. Cinco filas se recorren igual de rápido que cinco
 * tarjetas y se deciden mucho mejor.
 *
 * La alternancia se hace con `lg:[&:nth-child(even)>*:first-child]:order-2`…
 * no: se hace con una prop explícita (`invertida`). Un selector estructural
 * habría atado el diseño al orden en que la base devuelve las cabañas, y basta
 * con que el cliente desactive una desde el panel para que el zigzag se
 * rompa a la mitad.
 *
 * En móvil NO hay zigzag: todas las filas van foto arriba, texto abajo.
 * Alternar en una sola columna no se percibe como ritmo, solo hace que unas
 * fichas empiecen por la foto y otras por el texto sin motivo aparente.
 */
export async function PaginaAlojamientos() {
  const [heroes, alojamientos, seccionPlanes] = await Promise.all([
    getHeroesListados(),
    getAlojamientos(),
    getSeccionPlanes(),
  ]);

  return (
    <>
      <HeroPagina
        hero={heroes.alojamientos}
        migas={[
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Cabañas", ruta: "/alojamientos" },
        ]}
      />

      <Seccion fondo="crema" className="relative overflow-hidden">
        <Neblina tono="verde" className="opacity-55" />
        {/*
          CINCO AVES, NO UN MOSAICO.
          Aquí estaba `PatronColibri`, que repite el isotipo cada 320 px. En una
          sección corta es una textura; en esta página, que mide cinco
          pantallas, se leía como una cuadrícula de logotipos. Ahora son cinco
          colibríes colocados a mano, sin dos a la misma altura ni del mismo
          tamaño.
        */}
        <ColibriesSueltos tono="claro" />
        <RamaBotanica
          className="absolute top-[12%] right-[-4%] hidden w-52 text-oliva-400/25 lg:block"
          ritmo="lenta"
          espejo
        />

        <div className="relative z-10">
          {alojamientos.length > 0 ? (
            <>
              <ul className="flex flex-col gap-16 sm:gap-20 lg:gap-24">
                {alojamientos.map((alojamiento, indice) => (
                  <Revelar key={alojamiento.id} como="li" retraso={60}>
                    <FilaCabana
                      alojamiento={alojamiento}
                      invertida={indice % 2 === 1}
                      prioridad={indice === 0}
                    />
                  </Revelar>
                ))}
              </ul>

              <p className="mt-14 text-center text-sm text-crema-600 italic">
                {seccionPlanes.nota}
              </p>
            </>
          ) : (
            <p className="py-12 text-center text-crema-700">
              Estamos actualizando la información de las cabañas. Escríbenos por
              WhatsApp y te contamos qué hay disponible.
            </p>
          )}
        </div>
      </Seccion>

      <CierreReserva
        imagen={seccionPlanes.imagen_fondo}
        fondoAnterior="bg-crema-50"
        titulo="Elige la tuya y cuéntanos las fechas"
        texto="Te confirmamos disponibilidad el mismo día, sin intermediarios ni comisiones."
        espejo
      />
    </>
  );
}

/**
 * Una fila del zigzag.
 *
 * La foto ocupa algo más de la mitad (`1.15fr` contra `1fr`): a partes iguales,
 * el bloque de texto —que casi siempre es más corto— deja un hueco de aire
 * abajo que descuadra la fila. Con la foto un poco más ancha, las dos columnas
 * terminan pareciendo del mismo peso, que es lo que el ojo mide.
 *
 * El radio asimétrico de la foto se voltea con la fila: la esquina abierta
 * siempre queda del lado de fuera, mirando al borde de la página. Si no se
 * volteara, en las filas invertidas apuntaría hacia el texto y se leería como
 * un error.
 */
function FilaCabana({
  alojamiento,
  invertida,
  prioridad,
}: {
  alojamiento: AlojamientoPublico;
  invertida: boolean;
  prioridad: boolean;
}) {
  const foto = portada(
    alojamiento.galeria,
    `${alojamiento.nombre} de La Finca Eco Hotel`,
  );
  const amenidades = (alojamiento.amenidades ?? []).slice(0, 5);
  const ruta = `/alojamientos/${alojamiento.slug}`;

  return (
    <article className="grid items-center gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
      {/*
        La foto enlaza a la ficha —en móvil, tocarla es el gesto natural— pero
        con `tabIndex={-1}`: quien navega con teclado no tiene que pasar dos
        veces por el mismo destino (la foto y el título van al mismo sitio).
        NO lleva `aria-hidden`: el texto alternativo describe la cabaña y tiene
        que llegar a los lectores de pantalla y a Google.
      */}
      <Link
        href={ruta}
        tabIndex={-1}
        className={[
          "group relative block overflow-hidden bg-crema-200 shadow-[var(--shadow-elevada)]",
          "aspect-4/3 rounded-[var(--radius-generoso)] sm:aspect-16/10",
          invertida
            ? "rounded-br-[5rem] lg:order-2"
            : "rounded-bl-[5rem] lg:order-1",
        ].join(" ")}
      >
        <Image
          src={foto.url}
          alt={foto.alt}
          fill
          priority={prioridad}
          quality={75}
          sizes="(min-width: 1024px) 55vw, 92vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      </Link>

      <div
        className={[
          "flex flex-col gap-4",
          invertida ? "lg:order-1" : "lg:order-2",
        ].join(" ")}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="font-titulo text-2xl font-extrabold text-petroleo-900 sm:text-3xl">
            <Link
              href={ruta}
              className="underline-offset-4 transition-colors duration-200 hover:text-petroleo-700 hover:underline"
            >
              {alojamiento.nombre}
            </Link>
          </h2>
          <p className="flex items-center gap-1.5 rounded-full bg-brote-100 px-3 py-1 text-xs font-medium text-oliva-700">
            <IconoPersonas className="size-3.5" />
            {alojamiento.capacidad} personas
          </p>
        </div>

        {alojamiento.descripcion ? (
          <p className="text-base leading-relaxed text-crema-700">
            {alojamiento.descripcion}
          </p>
        ) : null}

        {amenidades.length > 0 ? (
          <ul className="mt-1 grid gap-2 sm:grid-cols-2">
            {amenidades.map((amenidad) => (
              <li
                key={amenidad}
                className="flex gap-2 text-sm leading-snug text-crema-800"
              >
                <IconoCheck className="mt-0.5 size-4 shrink-0 text-petroleo-500" />
                {amenidad}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-crema-300/70 pt-5">
          {alojamiento.precio_desde !== null ? (
            <p className="flex flex-col gap-0.5">
              <span className="text-xs tracking-wide text-crema-600 uppercase">
                Desde
              </span>
              <span className="font-titulo text-2xl font-extrabold text-petroleo-700">
                {formatearCOP(alojamiento.precio_desde)}
                <span className="ml-1.5 text-sm font-medium text-crema-600">
                  por noche
                </span>
              </span>
            </p>
          ) : null}

          <Boton href={ruta} variante="contorno" className="ml-auto">
            Ver la cabaña
            <IconoFlecha className="size-4" />
          </Boton>
        </div>
      </div>
    </article>
  );
}
