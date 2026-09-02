import Image from "next/image";

import {
  Colibri,
  DivisorOrganico,
  Motas,
  Neblina,
} from "@/components/sitio/atmosfera";
import { IconoFlecha, IconoHoja } from "@/components/sitio/iconos";
import { ModuloReserva } from "@/components/sitio/modulo-reserva";
import { TarjetaCabana } from "@/components/sitio/tarjeta-cabana";
import { TarjetaPlan } from "@/components/sitio/tarjeta-plan";
import { Boton } from "@/components/ui/boton";
import { Revelar } from "@/components/ui/revelar";
import { EncabezadoSeccion, Seccion } from "@/components/ui/seccion";
import {
  getAlojamientos,
  getCtaFinal,
  getEsencia,
  getHero,
  getIntro,
  getPlanesConPrecio,
  getReconocimiento,
  getSeccionCabanas,
  getSeccionExperiencias,
  getSeccionPlanes,
  getTestimonios,
  getExperiencias,
} from "@/lib/contenido";
import { hoyEnBogota } from "@/lib/utils/formato";
import { formatearCOP } from "@/lib/utils/formato";
import { mensajeExperiencia, enlaceWhatsapp } from "@/lib/whatsapp";
import { getContacto } from "@/lib/contenido";

/**
 * Portada.
 *
 * El orden de las secciones no es decorativo: responde a las preguntas que se
 * hace quien llega desde Instagram o WhatsApp, en el orden en que se las hace.
 *
 *   1. ¿Qué es esto y dónde queda?  → hero
 *   1b. Quiero fechas YA.           → módulo de reserva directa
 *   2. ¿Cómo es de verdad?          → presentación con cifras
 *   3. ¿Dónde voy a dormir?         → cabañas
 *   4. ¿Cuánto cuesta?              → planes con precio real de la base
 *   5. ¿Y si es una ocasión especial? → experiencias
 *   6. ¿Puedo confiar?              → naturaleza, COP16 y testimonios reales
 *   7. Reservar.                    → cierre
 *
 * Cada sección tiene UN mensaje y un camino a la reserva a la vista (§10).
 *
 * ---------------------------------------------------------------------------
 * EL RITMO CLARO / OSCURO
 * ---------------------------------------------------------------------------
 * La portada respiraba en un solo tono: crema, blanco, crema, blanco… correcto
 * y plano. Ahora la sección de planes —la que decide la venta— cae en verde
 * bosque profundo, y el cierre vuelve a la fotografía oscura. Ese golpe de
 * contraste en el medio es lo que convierte una lista de secciones en un
 * recorrido, y es también lo que hace que el precio en dorado se lea como una
 * pieza de joyería y no como una etiqueta más.
 *
 * Entre secciones ya no hay líneas rectas: hay laderas y bancos de niebla
 * (`DivisorOrganico`). Y hay bruma real moviéndose en el hero, en el bosque y
 * en el cierre. Ver `src/components/sitio/atmosfera.tsx`.
 */
export async function PaginaInicio() {
  const [
    hero,
    intro,
    seccionCabanas,
    seccionPlanes,
    seccionExperiencias,
    esencia,
    reconocimiento,
    testimonios,
    ctaFinal,
    alojamientos,
    planes,
    experiencias,
    contacto,
  ] = await Promise.all([
    getHero(),
    getIntro(),
    getSeccionCabanas(),
    getSeccionPlanes(),
    getSeccionExperiencias(),
    getEsencia(),
    getReconocimiento(),
    getTestimonios(),
    getCtaFinal(),
    getAlojamientos(),
    getPlanesConPrecio(),
    getExperiencias(),
    getContacto(),
  ]);

  const destacadas = alojamientos.slice(0, 3);
  const opcionesCabana = alojamientos.map((alojamiento) => ({
    slug: alojamiento.slug,
    nombre: alojamiento.nombre,
  }));

  return (
    <>
      {/* ---------------------------------------------------------------- 1 */}
      <section className="relative isolate flex min-h-[82svh] flex-col justify-end overflow-hidden sm:min-h-[88svh]">
        {/*
          Dirección de arte real: la foto horizontal recortada a una pantalla de
          teléfono pierde justo las cabañas, así que en móvil se sirve la
          vertical. Las dos comparten texto alternativo; solo una se decodifica
          en cada dispositivo gracias a `sizes` y a las clases de visibilidad.
        */}
        <Image
          src={hero.imagen_movil}
          alt={hero.imagen_alt}
          fill
          priority
          quality={75}
          sizes="100vw"
          className="object-cover sm:hidden"
        />
        <Image
          src={hero.imagen}
          alt={hero.imagen_alt}
          fill
          priority
          quality={75}
          sizes="100vw"
          className="hidden object-cover sm:block"
        />

        {/*
          ORDEN IMPORTANTE: la bruma va DEBAJO del degradado.

          Puesta encima, el `mix-blend-screen` aclaraba justo la franja donde se
          apoya el titular y el contraste bajaba del 4.5:1 que exige AA. Debajo,
          la bruma aclara la fotografía —que es lo que se busca— y después el
          degradado la oscurece a ella también, así que la atmósfera se ve donde
          hay foto y desaparece donde hay texto.
        */}
        <Neblina tono="clara" className="mix-blend-screen" />

        {/*
          El degradado no es decoración: sin él, el titular blanco sobre una
          foto clara no llega al 4.5:1 que exige AA. El tinte verde bosque de la
          base (en vez del gris neutro de antes) es lo que ata la fotografía a
          la paleta en lugar de dejarla flotando encima.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-bosque-950/90 via-bosque-950/45 to-bosque-950/20"
        />

        {/*
          Un solo colibrí en el hero, arriba a la derecha, donde no compite con
          el titular ni con los botones. Se esconde por debajo de `sm`: en un
          teléfono, el texto ya ocupa la mitad de la foto y añadir un ave
          encima sería ruido.
        */}
        <Colibri
          className="absolute top-[15%] right-[7%] hidden w-32 text-white/70 sm:block lg:right-[10%] lg:w-44"
          ritmo="lento"
        />

        <div className="contenedor relative z-10 pt-24 pb-28 sm:pb-32 lg:pb-36">
          <div className="flex max-w-3xl flex-col items-start gap-5">
            <p className="rounded-full bg-white/15 px-3.5 py-1.5 font-titulo text-xs font-semibold tracking-[0.16em] text-crema-100 uppercase ring-1 ring-white/25 backdrop-blur-md">
              {hero.antetitulo}
            </p>

            <h1 className="text-4xl leading-[1.08] font-extrabold text-white sm:text-5xl lg:text-6xl">
              {hero.titulo}
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-crema-100/95 sm:text-xl">
              {hero.subtitulo}
            </p>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Boton href={hero.cta_href} tamano="grande">
                {hero.cta_texto}
              </Boton>
              <Boton
                href={hero.cta_secundario_href}
                variante="claro"
                tamano="grande"
              >
                {hero.cta_secundario_texto}
              </Boton>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- 1b */}
      {/*
        El módulo de reserva CABALGA sobre el borde del hero: sube dentro de la
        fotografía y baja sobre el crema. Es el gesto que rompe la rejilla —dos
        secciones dejan de ser dos rectángulos apilados— y, a la vez, el que
        pone la acción del sitio en el primer visor sin tapar el titular.
      */}
      {opcionesCabana.length > 0 ? (
        <div className="relative z-20 -mt-20 sm:-mt-24 lg:-mt-28">
          <div className="contenedor">
            <ModuloReserva cabanas={opcionesCabana} hoy={hoyEnBogota()} />
          </div>
        </div>
      ) : null}

      {/* ---------------------------------------------------------------- 2 */}
      <Seccion fondo="crema" className="relative overflow-hidden pt-16 sm:pt-20">
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <Revelar className="flex flex-col gap-6">
            <EncabezadoSeccion
              antetitulo={intro.antetitulo}
              titulo={intro.titulo}
              alineacion="izquierda"
            />

            <div className="flex flex-col gap-4">
              {intro.parrafos.map((parrafo) => (
                <p
                  key={parrafo.slice(0, 40)}
                  className="text-base leading-relaxed text-crema-700 sm:text-lg"
                >
                  {parrafo}
                </p>
              ))}
            </div>

            {intro.datos.length > 0 ? (
              <dl className="mt-2 grid grid-cols-3 gap-4 border-t border-crema-300/70 pt-6">
                {intro.datos.map((dato) => (
                  <div key={dato.etiqueta} className="flex flex-col gap-1">
                    <dt className="sr-only">{dato.etiqueta}</dt>
                    <dd className="font-titulo text-2xl font-extrabold text-petroleo-700 sm:text-3xl">
                      {dato.valor}
                    </dd>
                    <p className="text-xs leading-snug text-crema-600 sm:text-sm">
                      {dato.etiqueta}
                    </p>
                  </div>
                ))}
              </dl>
            ) : null}
          </Revelar>

          <Revelar retraso={120}>
            {/*
              Arco: la foto se corta en medio punto por arriba y en radio suave
              por abajo. Es la forma de una ventana de cabaña y de una entrada
              al bosque, y basta para que la imagen deje de ser "un rectángulo
              con las esquinas redondeadas" como cualquier otra.
            */}
            <div className="relative aspect-4/5 overflow-hidden rounded-t-[13rem] rounded-b-[var(--radius-generoso)] bg-crema-200 shadow-[var(--shadow-elevada)] sm:aspect-4/5">
              <Image
                src={intro.imagen}
                alt={intro.imagen_alt}
                fill
                quality={75}
                sizes="(min-width: 1024px) 45vw, 92vw"
                className="object-cover"
              />
            </div>
          </Revelar>
        </div>
      </Seccion>

      {/* ---------------------------------------------------------------- 3 */}
      {destacadas.length > 0 ? (
        <Seccion fondo="blanco" id="cabanas">
          <EncabezadoSeccion
            antetitulo={seccionCabanas.antetitulo}
            titulo={seccionCabanas.titulo}
            descripcion={seccionCabanas.descripcion}
          />

          {/*
            La tarjeta del medio va medio escalón más abajo en escritorio: tres
            tarjetas exactamente a la misma altura son una tabla; con el escalón
            se leen como una composición. En móvil, donde van una debajo de
            otra, el desfase no existe.

            El `lg:pb-10` de la lista NO es decorativo: la tarjeta desplazada
            lleva `h-full` MÁS un margen superior, así que se sale 40 px por
            debajo de su fila de la rejilla (en CSS Grid, `height: 100%` se
            resuelve contra el área de la celda y el margen se suma encima). Sin
            ese relleno, el botón de abajo se le montaba encima.
          */}
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:pb-10">
            {destacadas.map((alojamiento, indice) => (
              <Revelar
                key={alojamiento.id}
                como="li"
                retraso={indice * 90}
                className={indice === 1 ? "h-full lg:mt-10" : "h-full"}
              >
                <TarjetaCabana alojamiento={alojamiento} />
              </Revelar>
            ))}
          </ul>

          <div className="mt-10 flex justify-center lg:mt-6">
            <Boton href={seccionCabanas.cta_href} variante="contorno">
              {seccionCabanas.cta_texto}
              <IconoFlecha className="size-4" />
            </Boton>
          </div>
        </Seccion>
      ) : null}

      {/* ---------------------------------------------------------------- 4 */}
      {planes.length > 0 ? (
        <>
          {/* La ladera con la que el bosque entra en escena. */}
          <div className="relative bg-white">
            <DivisorOrganico
              perfil="cresta"
              color="fill-bosque-900"
              alto={110}
              className="-mb-px"
            />
          </div>

          <Seccion
            fondo="bosque"
            id="planes"
            className="relative overflow-hidden"
            espacio="amplio"
          >
            <Neblina tono="bosque" />
            <Motas />

            <div className="relative z-10">
              <EncabezadoSeccion
                antetitulo={seccionPlanes.antetitulo}
                titulo={seccionPlanes.titulo}
                descripcion={seccionPlanes.descripcion}
                claro
              />

              <ul className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
                {planes.map((entrada, indice) => (
                  <Revelar
                    key={entrada.plan.id}
                    como="li"
                    retraso={indice * 90}
                    className="h-full"
                  >
                    <TarjetaPlan
                      plan={entrada.plan}
                      precio={entrada.precio_minimo}
                      desde={entrada.varia}
                      destacado={indice === 1}
                      sobreOscuro
                      href="/reservar"
                    />
                  </Revelar>
                ))}
              </ul>

              {seccionPlanes.nota ? (
                <p className="mt-8 text-center text-sm text-crema-200/70 italic">
                  {seccionPlanes.nota}
                </p>
              ) : null}
            </div>
          </Seccion>

          {/* Y la ladera con la que vuelve la luz. */}
          <div className="relative bg-bosque-900">
            <DivisorOrganico
              perfil="loma"
              color="fill-white"
              alto={96}
              espejo
              className="-mb-px"
            />
          </div>
        </>
      ) : null}

      {/* ---------------------------------------------------------------- 5 */}
      {experiencias.length > 0 ? (
        <Seccion fondo="blanco" id="experiencias" className="relative">
          {/*
            Segundo colibrí, en el borde del bloque de experiencias. Va detrás
            del contenido (`-z-0`) y con muy poca opacidad: si se nota como
            "ilustración", sobra.
          */}
          <Colibri
            className="pointer-events-none absolute top-2 right-[4%] hidden w-28 text-oliva-500/45 lg:block"
            ritmo="pausado"
            mirando="derecha"
          />

          <EncabezadoSeccion
            antetitulo={seccionExperiencias.antetitulo}
            titulo={seccionExperiencias.titulo}
            descripcion={seccionExperiencias.descripcion}
          />

          <ul className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
            {experiencias.map((experiencia, indice) => (
              <Revelar
                key={experiencia.id}
                como="li"
                retraso={indice * 90}
                className="h-full"
              >
                <article className="flex h-full flex-col gap-3 rounded-[var(--radius-generoso)] rounded-tl-[3.5rem] bg-crema-50 p-6 ring-1 ring-crema-200/70 transition-shadow duration-300 hover:shadow-[var(--shadow-tarjeta)] sm:p-7">
                  <IconoHoja className="size-6 text-oliva-500" />
                  <h3 className="font-titulo text-xl font-bold text-petroleo-900">
                    {experiencia.nombre}
                  </h3>
                  {experiencia.descripcion ? (
                    <p className="text-sm leading-relaxed text-crema-700">
                      {experiencia.descripcion}
                    </p>
                  ) : null}
                  <p className="mt-auto pt-3 font-titulo text-lg font-bold text-dorado-600">
                    {formatearCOP(experiencia.precio)}
                    <span className="ml-1.5 text-sm font-medium text-crema-600">
                      por estadía
                    </span>
                  </p>
                  <a
                    href={enlaceWhatsapp(
                      mensajeExperiencia(experiencia.nombre),
                      contacto.whatsapp,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1.5 font-titulo text-sm font-semibold text-petroleo-600 underline-offset-4 hover:underline"
                  >
                    Añadir a mi reserva
                    <IconoFlecha className="size-4" />
                  </a>
                </article>
              </Revelar>
            ))}
          </ul>

          <div className="mt-10 flex justify-center">
            <Boton href={seccionExperiencias.cta_href} variante="contorno">
              {seccionExperiencias.cta_texto}
              <IconoFlecha className="size-4" />
            </Boton>
          </div>
        </Seccion>
      ) : null}

      {/* ---------------------------------------------------------------- 6 */}
      <Seccion fondo="crema" className="relative overflow-hidden">
        <Neblina tono="verde" className="opacity-70" />

        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <Revelar className="flex flex-col gap-6">
            <EncabezadoSeccion
              antetitulo={esencia.antetitulo}
              titulo={esencia.titulo}
              alineacion="izquierda"
            />
            <div className="flex flex-col gap-4">
              {esencia.parrafos.map((parrafo) => (
                <p
                  key={parrafo.slice(0, 40)}
                  className="text-base leading-relaxed text-crema-700 sm:text-lg"
                >
                  {parrafo}
                </p>
              ))}
            </div>
            <Boton href="/el-lugar" variante="contorno" className="self-start">
              Conoce el lugar
              <IconoFlecha className="size-4" />
            </Boton>
          </Revelar>

          {esencia.imagenes.length > 0 ? (
            <Revelar retraso={120}>
              {/*
                Tres fotos con radios asimétricos y alturas distintas: la
                primera manda, las otras dos se descuelgan una respecto de la
                otra. La rejilla sigue existiendo, pero deja de verse.
              */}
              <ul className="grid grid-cols-2 gap-4">
                {esencia.imagenes.slice(0, 3).map((imagen, indice) => (
                  <li
                    key={imagen.url}
                    className={[
                      indice === 0 ? "col-span-2" : "",
                      indice === 2 ? "mt-8" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div
                      className={[
                        "relative overflow-hidden bg-crema-200 shadow-[var(--shadow-tarjeta)]",
                        indice === 0
                          ? "aspect-16/10 rounded-[var(--radius-generoso)] rounded-tr-[6rem]"
                          : "aspect-3/4",
                        indice === 1
                          ? "rounded-[var(--radius-tarjeta)] rounded-bl-[4rem]"
                          : "",
                        indice === 2
                          ? "rounded-[var(--radius-tarjeta)] rounded-tr-[4rem]"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <Image
                        src={imagen.url}
                        alt={imagen.alt}
                        fill
                        quality={68}
                        sizes={
                          indice === 0
                            ? "(min-width: 1024px) 52vw, 92vw"
                            : "(min-width: 1024px) 26vw, 46vw"
                        }
                        className="object-cover"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Revelar>
          ) : null}
        </div>
      </Seccion>

      {/* ---------------------------------------------------------------- 7 */}
      <Seccion fondo="blanco" className="overflow-hidden">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Revelar retraso={80} className="order-2 lg:order-1">
            {/*
              La foto se sale del contenedor por la izquierda en escritorio: es
              la única del sitio que sangra, y con una sola basta para que la
              página deje de sentirse encajonada. El `overflow-hidden` de la
              sección impide que empuje la barra horizontal.
            */}
            <div className="relative aspect-16/10 overflow-hidden rounded-[var(--radius-generoso)] rounded-bl-[7rem] bg-crema-200 shadow-[var(--shadow-elevada)] lg:-ml-[max(0px,calc((100vw-76rem)/2+2.5rem))] lg:rounded-l-none">
              <Image
                src={reconocimiento.imagen}
                alt={reconocimiento.imagen_alt}
                fill
                quality={75}
                sizes="(min-width: 1024px) 52vw, 92vw"
                className="object-cover"
              />
            </div>
          </Revelar>

          <Revelar className="order-1 flex flex-col gap-6 lg:order-2">
            <EncabezadoSeccion
              antetitulo={reconocimiento.antetitulo}
              titulo={reconocimiento.titulo}
              alineacion="izquierda"
            />
            <div className="flex flex-col gap-4">
              {reconocimiento.parrafos.map((parrafo) => (
                <p
                  key={parrafo.slice(0, 40)}
                  className="text-base leading-relaxed text-crema-700 sm:text-lg"
                >
                  {parrafo}
                </p>
              ))}
            </div>
            <Boton
              href={reconocimiento.cta_href}
              variante="contorno"
              className="self-start"
            >
              {reconocimiento.cta_texto}
            </Boton>
          </Revelar>
        </div>
      </Seccion>

      {/* ---------------------------------------------------------------- 8 */}
      {testimonios.items.length > 0 ? (
        <Seccion fondo="niebla" className="relative overflow-hidden">
          <Neblina tono="verde" className="opacity-60" />

          <div className="relative z-10">
            <EncabezadoSeccion
              antetitulo={testimonios.antetitulo}
              titulo={testimonios.titulo}
            />

            <ul className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {testimonios.items.map((testimonio, indice) => (
                <Revelar
                  key={testimonio.autor}
                  como="li"
                  retraso={(indice % 3) * 90}
                  className="h-full"
                >
                  <figure className="flex h-full flex-col gap-4 rounded-[var(--radius-generoso)] rounded-tl-[3rem] bg-white p-6 shadow-[var(--shadow-tenue)] ring-1 ring-niebla-200/80">
                    <span
                      aria-hidden="true"
                      className="font-titulo text-4xl leading-none text-dorado-300"
                    >
                      &ldquo;
                    </span>
                    <blockquote className="flex-1 text-sm leading-relaxed text-crema-800">
                      {testimonio.texto}
                    </blockquote>
                    <figcaption className="flex items-center gap-3 border-t border-niebla-200 pt-4">
                      {/*
                        Iniciales, no foto: las imágenes de testimonios que trae
                        el sitio actual son retratos de archivo que NO
                        corresponden a estas personas, y una cara falsa junto a
                        un nombre real es engañosa.
                      */}
                      <span
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-petroleo-100 font-titulo text-sm font-bold text-petroleo-700"
                      >
                        {iniciales(testimonio.autor)}
                      </span>
                      <span className="font-titulo text-sm font-semibold text-petroleo-900">
                        {testimonio.autor}
                      </span>
                    </figcaption>
                  </figure>
                </Revelar>
              ))}
            </ul>
          </div>
        </Seccion>
      ) : null}

      {/* ---------------------------------------------------------------- 9 */}
      <section className="relative isolate overflow-hidden">
        {/* Banco de niebla que hace de costura con la sección anterior. */}
        <DivisorOrganico
          perfil="bruma"
          color="fill-niebla-100"
          alto={72}
          invertido
          espejo
          className="absolute inset-x-0 top-0 z-20 -mt-px"
        />

        <div className="relative min-h-[62vh] w-full sm:min-h-[28rem]">
          <Image
            src={ctaFinal.imagen}
            alt={ctaFinal.imagen_alt}
            fill
            quality={75}
            sizes="100vw"
            className="object-cover"
          />
          {/* La bruma, otra vez debajo del degradado (ver el hero). */}
          <Neblina tono="clara" className="mix-blend-screen" />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-bosque-950/92 via-bosque-950/65 to-bosque-950/35"
          />

          <Motas />

          <div className="absolute inset-0 z-10 flex items-center">
            <div className="contenedor">
              <Revelar className="flex max-w-2xl flex-col items-start gap-5">
                <h2 className="text-3xl leading-tight font-bold text-white sm:text-4xl lg:text-[2.75rem]">
                  {ctaFinal.titulo}
                </h2>
                <p className="text-base leading-relaxed text-crema-100/95 sm:text-lg">
                  {ctaFinal.texto}
                </p>
                <Boton href={ctaFinal.cta_href} tamano="grande">
                  {ctaFinal.cta_texto}
                </Boton>
              </Revelar>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/** "Angela Buitrago Schonhobel" → "AB". Se usa en lugar de una foto de archivo. */
function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join("");
}
