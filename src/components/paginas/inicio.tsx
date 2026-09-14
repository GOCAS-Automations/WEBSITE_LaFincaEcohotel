import Image from "next/image";
import Link from "next/link";

import {
  CorteOrganico,
  FondoBosque,
  Neblina,
  PatronColibri,
  RamaBotanica,
  Resplandor,
} from "@/components/sitio/atmosfera";
import { IconoFlecha, IconoHoja } from "@/components/sitio/iconos";
import { LectorResena } from "@/components/sitio/lector-resena";
import { ModuloReserva } from "@/components/sitio/modulo-reserva";
import { ResenasGoogle } from "@/components/sitio/resenas-google";
import { TarjetaCabana } from "@/components/sitio/tarjeta-cabana";
import { TarjetaPlan } from "@/components/sitio/tarjeta-plan";
import { Boton } from "@/components/ui/boton";
import { Revelar } from "@/components/ui/revelar";
import { EncabezadoSeccion, RITMO, Seccion } from "@/components/ui/seccion";
import {
  getAlojamientos,
  getContacto,
  getCtaFinal,
  getEsencia,
  getExperiencias,
  getHero,
  getIntro,
  getPlanesConPrecio,
  getReconocimiento,
  getSeccionCabanas,
  getSeccionExperiencias,
  getSeccionPlanes,
  getTestimonios,
} from "@/lib/contenido";
import { getResenasGoogle } from "@/lib/resenas-google";
import { CLASE_FOTO_CON_FLAG } from "@/lib/fotos";
import { formatearCOP, hoyEnBogota } from "@/lib/utils/formato";
import { mensajeExperiencia, enlaceWhatsapp } from "@/lib/whatsapp";

/**
 * Portada.
 *
 * El orden de las secciones no es decorativo: responde a las preguntas que se
 * hace quien llega desde Instagram o WhatsApp, en el orden en que se las hace.
 *
 *   1. ¿Qué es esto y dónde queda?  → hero
 *   1b. Quiero fechas YA.           → módulo de reserva directa
 *   2. ¿Cómo es de verdad?          → presentación con cifras
 *   3. ¿Puedo confiar?              → reseñas reales de Google
 *   4. ¿Dónde voy a dormir?         → cabañas
 *   5. ¿Cuánto cuesta?              → planes con precio real de la base
 *   6. ¿Y si es una ocasión especial? → experiencias
 *   7. ¿Quiénes son?                → esencia
 *   8. ¿Alguien más lo avala?       → COP16, en video
 *   9. Reservar.                    → cierre
 *
 * LAS RESEÑAS SUBIERON AL TERCER LUGAR. Estaban al final, después de todo el
 * catálogo: quien llega desde Instagram sin conocer el hotel tenía que
 * atravesar la página entera antes de encontrar una sola prueba de que el
 * lugar es lo que dice ser. La confianza va antes del precio, no después.
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
 * recorrido, y es también lo que hace que el precio se lea como una pieza de
 * joyería y no como una etiqueta más.
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
    resenas,
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
    /* Puede devolver `null` (sin clave, Google caído, ninguna reseña de 4★ o
       más). En ese caso la portada cae a los testimonios del CMS: el bloque de
       confianza nunca desaparece del recorrido. */
    getResenasGoogle(),
  ]);

  /*
    LAS CINCO CABAÑAS, NO TRES.
    Antes la portada mostraba tres y dejaba las otras dos para la página de
    alojamientos. Con cinco cabañas en total, esconder el 40 % del catálogo en
    la única pantalla que casi todo el mundo ve no tenía defensa.
  */
  const opcionesCabana = alojamientos.map((alojamiento) => ({
    slug: alojamiento.slug,
    nombre: alojamiento.nombre,
  }));

  return (
    <>
      {/* ---------------------------------------------------------------- 1 */}
      {/*
        HERO CENTRADO, CON LA RESERVA DENTRO
        -----------------------------------------------------------------
        Antes el hero alineaba todo a la izquierda y el módulo de reserva
        colgaba entre dos secciones, medio dentro de la foto y medio fuera. El
        gesto era vistoso y costaba caro: en el teléfono el módulo tapaba el
        pie del titular, y en escritorio la página empezaba con una composición
        descentrada que no se repetía en ninguna otra parte del sitio.

        Ahora el hero es una sola columna centrada —antetítulo, titular, frase
        y el módulo de reserva— dentro de la misma fotografía. Es la
        composición del manual de marca (todas sus portadas están centradas) y
        deja el camino a reservar en el primer visor, sin desplazarse y sin
        tapar nada.

        El botón de reserva del módulo ES la acción principal, así que los dos
        botones grandes de antes sobraban: se queda uno solo, secundario y
        discreto, debajo.
      */}
      {/*
        SIN `overflow-hidden` EN LA SECCIÓN.
        Lo tenía para recortar la bruma y las ramas, y de paso recortaba el
        calendario del módulo de reserva, que cuelga por debajo del campo. El
        recorte se baja ahora a una capa que envuelve SOLO la decoración: la
        bruma sigue entrando y saliendo del encuadre y el calendario ya no se
        corta.
      */}
      <section className="relative isolate flex min-h-svh flex-col items-center justify-center">
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
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
        {/*
          La de escritorio NO lleva `priority`.
          `priority` añade un `<link rel="preload">` que el navegador respeta
          aunque la imagen esté en `display: none`, así que en un teléfono se
          descargaban las DOS fotos del hero —130 kB de más— y competían entre
          ellas por el ancho de banda del primer visor. Con `loading="eager"`
          se sigue pidiendo de inmediato en escritorio, pero sin adelantarse a
          la que de verdad se va a ver. La mayoría de los huéspedes llega desde
          el celular (por Instagram y WhatsApp): si hay que elegir a quién
          favorecer, es a ellos.
        */}
        <Image
          src={hero.imagen}
          alt={hero.imagen_alt}
          fill
          loading="eager"
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
          foto clara no llega al 4.5:1 que exige AA. Con el texto CENTRADO hay
          que oscurecer también el medio, no solo la base: por eso ahora son
          dos capas —una vertical para los bordes y una radial que apaga el
          centro justo donde se apoyan el titular y el módulo—.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-petroleo-950/70 via-petroleo-950/40 to-petroleo-950/85"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(70%_58%_at_50%_46%,rgba(5,37,36,0.62),transparent_78%)]"
        />

        {/* El resplandor del manual, entrando por arriba a la derecha. */}
        <Resplandor className="opacity-70" />

        {/*
          Un colibrí a cada lado del titular, muy tenues y a ritmos distintos, y
          una rama botánica en la esquina inferior: los tres motivos del manual,
          colocados donde NO compiten con el texto. Se esconden por debajo de
          `lg`: en un teléfono el contenido ya ocupa la foto entera y cualquier
          añadido es ruido.
        */}
        <RamaBotanica
          className="absolute -bottom-6 left-[-2%] hidden w-44 text-brote-100/20 lg:block"
          ritmo="lenta"
        />
        <RamaBotanica
          className="absolute right-[-3%] bottom-[-8%] hidden w-52 text-brote-100/15 lg:block"
          espejo
        />
        </div>

        <div className="contenedor relative z-10 flex flex-col items-center gap-6 pt-28 pb-16 text-center sm:gap-7 sm:pt-32 sm:pb-20">
          <p className="rounded-full bg-white/12 px-4 py-1.5 font-titulo text-[0.68rem] font-semibold tracking-[0.22em] text-brote-100 uppercase ring-1 ring-white/25 backdrop-blur-md sm:text-xs">
            {hero.antetitulo}
          </p>

          <h1 className="max-w-4xl text-[2.1rem] leading-[1.08] font-extrabold text-white sm:text-5xl lg:text-6xl">
            {hero.titulo}
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-crema-100/95 sm:text-lg lg:text-xl">
            {hero.subtitulo}
          </p>

          {/*
            EL MÓDULO DE RESERVA, DENTRO DEL HERO.
            No cabalga entre dos secciones ni se apoya en el borde: vive en la
            misma columna centrada que el titular, como una pieza más de la
            primera pantalla. Es lo que pide §10 del plan —el camino a reservar
            evidente desde el primer visor— sin un solo gesto de desplazamiento.
          */}
          {opcionesCabana.length > 0 ? (
            <div className="mt-2 w-full max-w-4xl text-left">
              <ModuloReserva
                cabanas={opcionesCabana}
                hoy={hoyEnBogota()}
                ctaTexto={hero.cta_texto}
              />
            </div>
          ) : null}

          <Link
            href={hero.cta_secundario_href}
            className="group mt-1 inline-flex items-center gap-2 font-titulo text-sm font-semibold text-brote-100/90 underline-offset-[6px] transition-colors duration-200 hover:text-white hover:underline"
          >
            {hero.cta_secundario_texto}
            <IconoFlecha className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

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

            {/*
              Un `<dl>` solo admite `<dt>`, `<dd>` y `<div>` que los agrupen: el
              `<p>` con la etiqueta que había aquí lo invalidaba (lo cazó
              Lighthouse) y, de paso, obligaba a repetir el texto en un `<dt>`
              oculto. Ahora el `<dt>` ES la etiqueta visible y va DEBAJO del
              `<dd>` gracias a `flex-col-reverse`: el orden del documento es el
              correcto —término y luego definición— y el visual es el que pide
              el diseño, la cifra grande primero.
            */}
            {intro.datos.length > 0 ? (
              <dl className="mt-2 grid grid-cols-3 gap-4 border-t border-crema-300/70 pt-6">
                {intro.datos.map((dato) => (
                  <div
                    key={dato.etiqueta}
                    className="flex flex-col-reverse gap-1"
                  >
                    <dt className="text-xs leading-snug text-crema-600 sm:text-sm">
                      {dato.etiqueta}
                    </dt>
                    <dd className="font-titulo text-2xl font-extrabold text-petroleo-700 sm:text-3xl">
                      {dato.valor}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </Revelar>

          <Revelar retraso={120}>
            {/*
              ARCO A LA IZQUIERDA, NO DE MEDIO PUNTO.
              Era un arco completo (`rounded-t-[13rem]`) y se comía la esquina
              superior derecha de la foto —justo donde TODAS las fotos del
              hotel llevan impreso el sello de marca—: el logo aparecía partido
              por la mitad. Ahora la curva grande abre por arriba a la izquierda
              y se responde con otra abajo a la derecha: sigue sin ser un
              rectángulo, y la esquina del sello queda intacta.
              Ver `ZONA_FLAG` en `src/lib/fotos.ts`.
            */}
            <div className="relative aspect-4/5 overflow-hidden rounded-tl-[13rem] rounded-br-[7rem] rounded-tr-[var(--radius-tarjeta)] rounded-bl-[var(--radius-tarjeta)] bg-crema-200 shadow-[var(--shadow-elevada)]">
              <Image
                src={intro.imagen}
                alt={intro.imagen_alt}
                fill
                quality={75}
                sizes="(min-width: 1024px) 45vw, 92vw"
                /* El recorte se ancla arriba a la derecha: con el encuadre
                   centrado, la caja 4/5 le cortaba un dedo al sello. */
                className={CLASE_FOTO_CON_FLAG}
              />
            </div>
          </Revelar>
        </div>
      </Seccion>

      {/* ---------------------------------------------------------------- 3 */}
      {/*
        RESEÑAS REALES DE GOOGLE.
        Los testimonios del CMS eran texto copiado a mano: ciertos, pero sin
        forma de comprobarlos y congelados el día que se transcribieron. Ahora
        se leen en vivo de la ficha de Google Business (4,7 ★ con 50
        calificaciones), con foto, enlace al perfil de quien escribe y la
        atribución que exigen los términos de Google.

        Si la API falla, si falta la clave o si no queda ninguna reseña de 4★ o
        más, `getResenasGoogle()` devuelve `null` y la sección cae a los
        testimonios del CMS de abajo. El bloque de confianza nunca desaparece.
      */}
      {resenas ? (
        <Seccion fondo="niebla" className="relative overflow-hidden">
          <Neblina tono="verde" className="opacity-60" />
          <RamaBotanica
            className="absolute right-[-4%] -bottom-10 hidden w-56 text-oliva-400/25 lg:block"
            ritmo="lenta"
            espejo
          />

          <div className="relative z-10">
            <EncabezadoSeccion
              antetitulo={testimonios.antetitulo}
              titulo={testimonios.titulo}
            />
            <ResenasGoogle
              resumen={resenas}
              titulo={null}
              className={RITMO.trasTitulo}
            />
          </div>
        </Seccion>
      ) : testimonios.items.length > 0 ? (
        <Seccion fondo="niebla" className="relative overflow-hidden">
          <Neblina tono="verde" className="opacity-60" />

          <div className="relative z-10">
            <EncabezadoSeccion
              antetitulo={testimonios.antetitulo}
              titulo={testimonios.titulo}
            />

            <ul className={`${RITMO.trasTitulo} grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3`}>
              {testimonios.items.map((testimonio, indice) => (
                <Revelar
                  key={testimonio.autor}
                  como="li"
                  retraso={(indice % 3) * 90}
                  className="h-full"
                >
                  <figure className="flex h-full flex-col gap-3 rounded-[var(--radius-generoso)] rounded-tl-[3rem] bg-white p-6 shadow-[var(--shadow-tenue)] ring-1 ring-niebla-200/80">
                    <span
                      aria-hidden="true"
                      className="font-titulo text-4xl leading-none text-brote-200"
                    >
                      &ldquo;
                    </span>
                    {/* Recortado siempre a cinco líneas, como en el bloque de
                        Google: es lo que mantiene todas las tarjetas al mismo
                        alto. El texto completo se lee en la ventana. */}
                    <blockquote className="flex-1 text-sm leading-relaxed text-crema-800 line-clamp-5">
                      {testimonio.texto}
                    </blockquote>
                    <LectorResena
                      autor={testimonio.autor}
                      texto={testimonio.texto}
                      meta="Reseña de Google"
                    />
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

      {/* ---------------------------------------------------------------- 4 */}
      {alojamientos.length > 0 ? (
        <Seccion fondo="blanco" id="cabanas" className="relative overflow-hidden">
          {/* El patrón de colibríes del manual, a la opacidad más baja que
              todavía se distingue. Da textura al blanco sin competir con las
              fotos de las cabañas. */}
          <PatronColibri tono="claro" className="opacity-90" />

          <div className="relative z-10">
            <EncabezadoSeccion
              antetitulo={seccionCabanas.antetitulo}
              titulo={seccionCabanas.titulo}
              descripcion={seccionCabanas.descripcion}
            />

            {/*
              REJILLA ALINEADA, NO ESCALONADA.
              La versión anterior bajaba medio escalón la tarjeta del medio. La
              idea era "composición en vez de tabla"; el resultado real era una
              fila descuadrada que en cuanto una descripción tenía una línea más
              se leía como un fallo de maquetación, y que obligaba a añadir
              relleno inferior a la lista para que el botón no se montara.

              Cinco tarjetas iguales, del mismo alto, a la misma altura. La
              variedad la ponen las fotos, no el desorden.

              Es un FLEX con anchos calculados, no un `grid`: cinco elementos en
              una rejilla de tres columnas dejan la última fila pegada a la
              izquierda con un hueco a la derecha. Con flex y `justify-center`,
              esas dos últimas tarjetas quedan centradas bajo las tres de
              arriba, que es como se ve un catálogo y no un inventario a medio
              llenar. Los `li` se estiran solos al alto de su línea.
            */}
            <ul className={`${RITMO.trasTitulo} flex flex-wrap justify-center gap-6`}>
              {alojamientos.map((alojamiento, indice) => (
                <Revelar
                  key={alojamiento.id}
                  como="li"
                  retraso={(indice % 3) * 90}
                  className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"
                >
                  {/* Sin `priority`: están por debajo del primer visor y
                      competirían con la foto del hero por el ancho de banda
                      inicial, que es justo lo que mide el LCP. */}
                  <TarjetaCabana alojamiento={alojamiento} />
                </Revelar>
              ))}
            </ul>

            <div className={`${RITMO.trasContenido} flex justify-center`}>
              <Boton href={seccionCabanas.cta_href} variante="contorno">
                {seccionCabanas.cta_texto}
                <IconoFlecha className="size-4" />
              </Boton>
            </div>
          </div>
        </Seccion>
      ) : null}

      {/* ---------------------------------------------------------------- 5 */}
      {planes.length > 0 ? (
        <>
          <Seccion
            fondo="bosque"
            id="planes"
            /*
              LAS DOS LADERAS VAN DENTRO, NO FUERA.
              Antes se dibujaban en la sección blanca de arriba y de abajo,
              rellenas de verde: se veía una franja de color plano con forma de
              ladera y, pegado a ella, el borde RECTO de la fotografía del
              fondo. Ahora la foto llega hasta el borde mismo de la sección y
              las ondas se pintan encima en blanco, así que la que queda
              recortada es la imagen. Ver `CorteOrganico`.

              El relleno vertical extra es el hueco de las dos ondas (110 px
              arriba, 96 abajo): sin él, el antetítulo y la nota se les montan.
            */
            className="relative isolate overflow-hidden pt-32 pb-28 sm:pt-40 sm:pb-36 lg:pt-44 lg:pb-40"
            espacio="amplio"
          >
            {/*
              Aquí estaba el verde plano. Ahora es una fotografía real de las
              zonas comunes bajo el velo de petróleo, con la bruma encima y el
              resplandor y el patrón de colibríes del manual. La sección que
              decide la venta tiene que oler a bosque, no a rectángulo verde.
            */}
            <FondoBosque imagen={seccionPlanes.imagen_fondo} velo="denso" />

            <CorteOrganico
              perfil="cresta"
              color="fill-white"
              borde="superior"
              alto={110}
            />
            <CorteOrganico
              perfil="loma"
              color="fill-white"
              borde="inferior"
              alto={96}
              espejo
            />

            <div className="relative z-10">
              <EncabezadoSeccion
                antetitulo={seccionPlanes.antetitulo}
                titulo={seccionPlanes.titulo}
                descripcion={seccionPlanes.descripcion}
                claro
              />

              {/*
                CUATRO planes, no tres: a los tres de hospedaje se suma el Día
                de Calma, que no incluye noche. En `lg` van los cuatro en fila;
                en tabletas, dos y dos. El destacado es el Estándar, que es el
                que más se vende de viernes a domingo.
              */}
              <ul className={`${RITMO.trasTitulo} grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6`}>
                {planes.map((entrada, indice) => (
                  <Revelar
                    key={entrada.plan.id}
                    como="li"
                    retraso={(indice % 3) * 90}
                    className="h-full"
                  >
                    <TarjetaPlan
                      plan={entrada.plan}
                      precio={entrada.precio_minimo}
                      precioUnaPersona={entrada.precio_1_persona}
                      desde={entrada.varia}
                      destacado={indice === 1}
                      sobreOscuro
                      href="/reservar"
                    />
                  </Revelar>
                ))}
              </ul>

              {seccionPlanes.nota ? (
                <p className={`${RITMO.nota} text-center text-sm text-crema-200/70 italic`}>
                  {seccionPlanes.nota}
                </p>
              ) : null}
            </div>
          </Seccion>
        </>
      ) : null}

      {/* ---------------------------------------------------------------- 6 */}
      {experiencias.length > 0 ? (
        <Seccion fondo="blanco" id="experiencias" className="relative">
          {/*
            Segundo colibrí, en el borde del bloque de experiencias. Va detrás
            del contenido (`-z-0`) y con muy poca opacidad: si se nota como
            "ilustración", sobra.
          */}

          <EncabezadoSeccion
            antetitulo={seccionExperiencias.antetitulo}
            titulo={seccionExperiencias.titulo}
            descripcion={seccionExperiencias.descripcion}
          />

          <ul className={`mx-auto ${RITMO.trasTitulo} grid max-w-4xl gap-6 sm:grid-cols-2`}>
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
                  <p className="mt-auto pt-3 font-titulo text-lg font-bold text-petroleo-700">
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

          <div className={`${RITMO.trasContenido} flex justify-center`}>
            <Boton href={seccionExperiencias.cta_href} variante="contorno">
              {seccionExperiencias.cta_texto}
              <IconoFlecha className="size-4" />
            </Boton>
          </div>
        </Seccion>
      ) : null}

      {/* ---------------------------------------------------------------- 7 */}
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
            <Boton href="/conocenos" variante="contorno" className="self-start">
              Conócenos
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
                        /*
                          NINGÚN RADIO GRANDE EN LA ESQUINA SUPERIOR DERECHA:
                          es donde todas las fotos del hotel llevan el sello de
                          marca, y la curva lo partía en diagonal (se veía en la
                          tercera foto, la de la fogata). Las curvas abiertas se
                          reparten entre la superior izquierda y las dos de
                          abajo, que es donde no hay nada que cortar.
                        */
                        indice === 0
                          ? "aspect-16/10 rounded-[var(--radius-generoso)] rounded-tl-[6rem]"
                          : "aspect-3/4",
                        indice === 1
                          ? "rounded-[var(--radius-tarjeta)] rounded-bl-[4rem]"
                          : "",
                        indice === 2
                          ? "rounded-[var(--radius-tarjeta)] rounded-br-[4rem]"
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

      {/* ---------------------------------------------------------------- 8 */}
      <Seccion fondo="blanco" className="overflow-hidden">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Revelar retraso={80} className="order-2 lg:order-1">
            {/*
              EL VIDEO DEL RECONOCIMIENTO, NO UNA FOTO.
              Aquí había una fotografía de la ducha del bosque, que además
              aparecía en otros cuatro puntos del sitio y no tenía nada que ver
              con la COP16. Ahora va el clip que el propio hotel publicaba en
              esta misma sección de su sitio anterior. Un reconocimiento
              contado por quien lo recibió vale más que un párrafo.

              Sangra por la izquierda en escritorio: es la única pieza del
              sitio que se sale del contenedor, y con una basta para que la
              página no se sienta encajonada. El `overflow-hidden` de la
              sección impide que empuje la barra horizontal.
            */}
            <div className="relative aspect-16/10 overflow-hidden rounded-[var(--radius-generoso)] rounded-bl-[7rem] bg-crema-200 shadow-[var(--shadow-elevada)] lg:-ml-[max(0px,calc((100vw-76rem)/2+2.5rem))] lg:rounded-l-none">
              {reconocimiento.video ? (
                /*
                  `preload="metadata"`: en móvil no se descargan 7 MB antes de
                  que nadie haya decidido mirarlo; lo que se ve mientras tanto
                  es el póster, que pesa 39 kB.

                  `controls` a propósito, aunque arranque silenciado: el clip
                  NO es un plano de ambiente, es una persona hablando. Sin un
                  control para subir el volumen, el visitante ve a alguien
                  mover los labios y no se entera de nada.
                */
                <video
                  src={reconocimiento.video}
                  poster={reconocimiento.imagen}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  preload="metadata"
                  aria-label={`Video: ${reconocimiento.titulo}`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={reconocimiento.imagen}
                  alt={reconocimiento.imagen_alt}
                  fill
                  quality={75}
                  sizes="(min-width: 1024px) 52vw, 92vw"
                  className="object-cover"
                />
              )}
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

      {/* ---------------------------------------------------------------- 9 */}
      <section className="relative isolate overflow-hidden">
        {/* Banco de niebla que hace de costura con la sección anterior, que
            desde el cambio de orden es la del video (fondo blanco). */}
        <CorteOrganico
          perfil="bruma"
          color="fill-white"
          borde="superior"
          alto={72}
          espejo
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
            className="absolute inset-0 bg-gradient-to-t from-petroleo-950/94 via-petroleo-950/72 to-petroleo-950/45"
          />

          {/* El resplandor del manual, esta vez entrando por la izquierda para
              no repetir la misma esquina que el hero, y el patrón de colibríes
              apenas insinuado sobre la foto. */}
          <Resplandor desde="izquierda" className="opacity-60" />
          <PatronColibri className="opacity-70" />

          <div className="absolute inset-0 z-10 flex items-center">
            <div className="contenedor">
              <Revelar className="flex max-w-2xl flex-col items-start gap-5">
                <h2 className="text-3xl leading-tight font-bold text-white sm:text-4xl lg:text-[2.75rem]">
                  {ctaFinal.titulo}
                </h2>
                <p className="text-base leading-relaxed text-crema-100/95 sm:text-lg">
                  {ctaFinal.texto}
                </p>
                <Boton href={ctaFinal.cta_href} variante="marca" tamano="grande">
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
