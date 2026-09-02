import Image from "next/image";

import { IconoFlecha, IconoHoja } from "@/components/sitio/iconos";
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
 *   2. ¿Cómo es de verdad?          → presentación con cifras
 *   3. ¿Dónde voy a dormir?         → cabañas
 *   4. ¿Cuánto cuesta?              → planes con precio real de la base
 *   5. ¿Y si es una ocasión especial? → experiencias
 *   6. ¿Puedo confiar?              → naturaleza, COP16 y testimonios reales
 *   7. Reservar.                    → cierre
 *
 * Cada sección tiene UN mensaje y un camino a la reserva a la vista (§10).
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

  return (
    <>
      {/* ---------------------------------------------------------------- 1 */}
      <section className="relative isolate flex min-h-[78svh] flex-col justify-end overflow-hidden sm:min-h-[86svh]">
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

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-crema-950/85 via-crema-950/40 to-crema-950/25"
        />

        <div className="contenedor relative pt-24 pb-14 sm:pb-20 lg:pb-24">
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

      {/* ---------------------------------------------------------------- 2 */}
      <Seccion fondo="crema">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
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
            <div className="relative aspect-4/5 overflow-hidden rounded-[var(--radius-generoso)] bg-crema-200 shadow-[var(--shadow-elevada)] sm:aspect-4/3 lg:aspect-4/5">
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

          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {destacadas.map((alojamiento, indice) => (
              <Revelar
                key={alojamiento.id}
                como="li"
                retraso={indice * 90}
                className="h-full"
              >
                <TarjetaCabana alojamiento={alojamiento} />
              </Revelar>
            ))}
          </ul>

          <div className="mt-10 flex justify-center">
            <Boton href={seccionCabanas.cta_href} variante="contorno">
              {seccionCabanas.cta_texto}
              <IconoFlecha className="size-4" />
            </Boton>
          </div>
        </Seccion>
      ) : null}

      {/* ---------------------------------------------------------------- 4 */}
      {planes.length > 0 ? (
        <Seccion fondo="crema" id="planes">
          <EncabezadoSeccion
            antetitulo={seccionPlanes.antetitulo}
            titulo={seccionPlanes.titulo}
            descripcion={seccionPlanes.descripcion}
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
                  href="/reservar"
                />
              </Revelar>
            ))}
          </ul>

          {seccionPlanes.nota ? (
            <p className="mt-8 text-center text-sm text-crema-600 italic">
              {seccionPlanes.nota}
            </p>
          ) : null}
        </Seccion>
      ) : null}

      {/* ---------------------------------------------------------------- 5 */}
      {experiencias.length > 0 ? (
        <Seccion fondo="blanco" id="experiencias">
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
                <article className="flex h-full flex-col gap-3 rounded-[var(--radius-generoso)] bg-crema-50 p-6 ring-1 ring-crema-200/70 transition-shadow duration-300 hover:shadow-[var(--shadow-tarjeta)] sm:p-7">
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
      <Seccion fondo="crema">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
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
              <ul className="grid grid-cols-2 gap-4">
                {esencia.imagenes.slice(0, 3).map((imagen, indice) => (
                  <li
                    key={imagen.url}
                    className={indice === 0 ? "col-span-2" : undefined}
                  >
                    <div
                      className={[
                        "relative overflow-hidden rounded-[var(--radius-tarjeta)] bg-crema-200 shadow-[var(--shadow-tarjeta)]",
                        indice === 0 ? "aspect-16/10" : "aspect-3/4",
                      ].join(" ")}
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
      <Seccion fondo="blanco">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Revelar retraso={80} className="order-2 lg:order-1">
            <div className="relative aspect-16/10 overflow-hidden rounded-[var(--radius-generoso)] bg-crema-200 shadow-[var(--shadow-elevada)]">
              <Image
                src={reconocimiento.imagen}
                alt={reconocimiento.imagen_alt}
                fill
                quality={75}
                sizes="(min-width: 1024px) 45vw, 92vw"
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
        <Seccion fondo="crema">
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
                <figure className="flex h-full flex-col gap-4 rounded-[var(--radius-generoso)] bg-white p-6 shadow-[var(--shadow-tenue)] ring-1 ring-crema-200/70">
                  <span
                    aria-hidden="true"
                    className="font-titulo text-4xl leading-none text-dorado-300"
                  >
                    &ldquo;
                  </span>
                  <blockquote className="flex-1 text-sm leading-relaxed text-crema-800">
                    {testimonio.texto}
                  </blockquote>
                  <figcaption className="flex items-center gap-3 border-t border-crema-200 pt-4">
                    {/*
                      Iniciales, no foto: las imágenes de testimonios que trae el
                      sitio actual son retratos de archivo que NO corresponden a
                      estas personas, y una cara falsa junto a un nombre real es
                      engañosa.
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
        </Seccion>
      ) : null}

      {/* ---------------------------------------------------------------- 9 */}
      <section className="relative isolate overflow-hidden">
        <div className="relative min-h-[60vh] w-full sm:min-h-[26rem]">
          <Image
            src={ctaFinal.imagen}
            alt={ctaFinal.imagen_alt}
            fill
            quality={75}
            sizes="100vw"
            className="object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-petroleo-950/90 via-petroleo-950/60 to-petroleo-950/30"
          />

          <div className="absolute inset-0 flex items-center">
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
