import { Foto } from "@/components/ui/foto";
import Link from "next/link";

import {
  CorteOrganico,
  FondoBosque,
  Neblina,
  PatronColibri,
  RamaBotanica,
  Resplandor,
} from "@/components/sitio/atmosfera";
import {
  IconoFlecha,
  IconoHoja,
  IconoInstagram,
} from "@/components/sitio/iconos";
import { LectorResena } from "@/components/sitio/lector-resena";
import { ModuloReserva } from "@/components/sitio/modulo-reserva";
import { ReelInstagram } from "@/components/sitio/reel-instagram";
import { ResenasGoogle } from "@/components/sitio/resenas-google";
import { TarjetaCabana } from "@/components/sitio/tarjeta-cabana";
import { TarjetaPlan } from "@/components/sitio/tarjeta-plan";
import { Boton } from "@/components/ui/boton";
import { Revelar } from "@/components/ui/revelar";
import {
  EncabezadoSeccion,
  REJILLA,
  RITMO,
  Seccion,
} from "@/components/ui/seccion";
import {
  getAlojamientos,
  getContacto,
  getCtaFinal,
  getExperiencias,
  getHero,
  getInstagram,
  getIntro,
  getPlanesConPrecio,
  getSeccionCabanas,
  getSeccionExperiencias,
  getSeccionPlanes,
  getTestimonios,
} from "@/lib/contenido";
import { getResenasGoogle } from "@/lib/resenas-google";
import { CLASE_FOTO_CON_FLAG } from "@/lib/fotos";
import { tiposOfrecidosDe } from "@/lib/reserva/elegibilidad-calendario";
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
 *   7. ¿Cómo es esto de verdad?     → Instagram: fotos y el reel del hotel
 *   8. Reservar.                    → cierre
 *
 * «NUESTRA ESENCIA» YA NO ESTÁ. Era la séptima sección —la banda verde con las
 * frases del manual— y se retiró el 2026-09-15 para acortar la portada: lo que
 * contaba es el trabajo de «Sobre nosotros» en `/conocenos`.
 *
 * EL RECONOCIMIENTO DE LA COP16 YA NO ESTÁ AQUÍ. Era la octava sección y se
 * mudó a `/conocenos`: un video de dos minutos y cincuenta con locución pide
 * una atención que la portada no puede gastar, y encaja mucho mejor en la
 * página que cuenta quiénes somos. Su hueco lo ocupa Instagram, que es de donde
 * llega la mayoría de los huéspedes y lo que de verdad enseña el lugar.
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
    instagram,
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
    getInstagram(),
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
    /* Qué noches vende, de sus tarifas: con esto el calendario del módulo
       tacha los lunes a jueves de la 02, igual que en `/reservar`. */
    tipos: tiposOfrecidosDe(alojamiento),
  }));

  /*
    CUATRO FOTOS, NI UNA MÁS. Dos filas de dos en el teléfono, una fila de
    cuatro desde `sm`: con cinco o seis quedaría un hueco impar en alguna de
    las dos formas. La PRIMERA hace además de portada del reel, así que el
    póster sale del panel como el resto y no hay que acordarse de cambiarlo
    aparte.
  */
  const fotosInstagram = instagram.fotos.slice(0, 4);
  const posterInstagram = fotosInstagram[0];

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
      {/*
        `z-30`: EL CALENDARIO TIENE QUE FLOTAR SOBRE LA SECCIÓN DE ABAJO.

        El panel del calendario cuelga del campo con `absolute z-50`, pero ese
        50 se cuenta DENTRO del contexto de apilamiento que crea el `isolate`
        de este hero. La sección siguiente («Bienvenidos») es `relative` con
        `z-index: auto`, así que se pinta después —por orden del documento— y
        tapaba el calendario a partir del tercio inferior. Con el hero en un
        nivel propio por encima, el calendario flota sobre todo lo que viene
        detrás y sigue por debajo de la cápsula del nav (`z-50` fija) y del
        botón de WhatsApp (`z-40`), que es el orden correcto.
      */}
      <section className="relative isolate z-30 flex min-h-svh flex-col items-center justify-center">
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        {/*
          DIRECCIÓN DE ARTE CON UN `picture`, NO CON DOS `img` Y CSS.

          La foto horizontal recortada a una pantalla de teléfono pierde justo
          las cabañas, así que en móvil se sirve la vertical. Antes eran dos
          imágenes con `hidden` / `sm:block`, y eso costaba caro sin verse:
          **Chrome descarga igualmente una imagen en `display: none` si no es
          perezosa**, de modo que el escritorio se bajaba el hero vertical de
          1,2 MB para no pintarlo nunca. La de escritorio, para evitar lo
          contrario, iba en `lazy` — y perdía la prioridad que sí merece.

          Con `picture` el navegador evalúa la media ANTES de pedir nada:
          descarga una sola, la correcta, y con prioridad alta en los dos casos.
        */}
        <Foto
          src={hero.imagen}
          alt={hero.imagen_alt}
          fuentes={[{ media: "(max-width: 639px)", src: hero.imagen_movil }]}
          fill
          priority
          sizes="100vw"
          className="object-cover"
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
          {/* Guion que no parte: «CALI-BUENAVENTURA» se cortaba en el guion a
              320 px; ahí también se aprieta el interletrado para que quepa en
              una línea dentro de la píldora. */}
          <p className="rounded-full bg-white/12 px-4 py-1.5 font-titulo text-xs font-semibold tracking-[0.22em] text-brote-100 uppercase ring-1 ring-white/25 backdrop-blur-md max-[359px]:px-3 max-[359px]:tracking-[0.12em]">
            {hero.antetitulo.replaceAll("-", "\u2011")}
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
            className="group mt-1 inline-flex min-h-11 items-center gap-2 font-titulo text-sm font-semibold text-brote-100/90 underline-offset-[6px] transition-colors duration-200 hover:text-white hover:underline"
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
              <Foto
                src={intro.imagen}
                alt={intro.imagen_alt}
                fill
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
            <ul className={`${RITMO.trasTitulo} ${REJILLA.lista}`}>
              {alojamientos.map((alojamiento, indice) => (
                <Revelar
                  key={alojamiento.id}
                  como="li"
                  retraso={(indice % 3) * 90}
                  className={REJILLA.tercio}
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
            {/* El relleno es el color de la sección VECINA: la de experiencias
                pasó de blanco a crema al desmontarse la masa blanca del final
                de la portada. */}
            <CorteOrganico
              perfil="loma"
              color="fill-crema-50"
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
                de Calma, que no incluye noche. Desde `xl` van los cuatro en
                fila; hasta ahí, dos y dos (a 1024 px, cuatro columnas dejaban
                tarjetas de 200 px). El destacado es el Estándar, que es el que
                más se vende de viernes a domingo.
              */}
              <ul className={`${RITMO.trasTitulo} ${REJILLA.lista}`}>
                {planes.map((entrada, indice) => (
                  <Revelar
                    key={entrada.plan.id}
                    como="li"
                    retraso={(indice % 4) * 90}
                    className={REJILLA.cuarto}
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
      {/*
        LAS TRES ÚLTIMAS SECCIONES CLARAS, DESMONTADAS.

        Experiencias, Nuestra esencia e Instagram se leían como una sola masa
        blanca —y ni siquiera compartían el mismo blanco: dos eran `#ffffff` y
        la del medio, crema—. Ahora cada una tiene identidad propia, con
        recursos del manual y sin saturar:

          · **Experiencias** — crema, el fondo cálido base del sitio, con la
            rama botánica asomando por un lateral.
          · **Nuestra esencia** — el verde claro oficial `#E8F4D9` sin diluir,
            como una BANDA, con las dos ondas orgánicas que la separan de sus
            vecinas. Es la única sección de la portada que lo usa: repetirlo lo
            convertiría en otro fondo más.
          · **Instagram** — blanco, con el patrón de colibríes que ya tenía.

        Crema → verde de marca → blanco: tres tonos distintos, ninguno
        estridente, y el ojo vuelve a distinguir dónde acaba una y empieza otra.
      */}
      {experiencias.length > 0 ? (
        <Seccion
          fondo="crema"
          id="experiencias"
          className="relative overflow-hidden"
          /* La rama es un elemento posicionado y, sin esto, pintaría POR ENCIMA
             del contenido estático: al 15 % no se ve, pero está delante. */
          claseContenedor="relative z-10"
        >
          {/* La rama del manual, asomando por la izquierda. Decorativa y a muy
              baja opacidad: si se nota como «ilustración», sobra. */}
          <RamaBotanica
            className="absolute top-8 left-[-6%] hidden w-44 text-oliva-500/15 lg:block"
            ritmo="lenta"
          />

          <EncabezadoSeccion
            antetitulo={seccionExperiencias.antetitulo}
            titulo={seccionExperiencias.titulo}
            descripcion={seccionExperiencias.descripcion}
          />

          {/*
            CON FOTO, Y LAS TRES A LA MISMA ALTURA.

            Eran dos tarjetas de puro texto con un iconito de hoja: en una
            portada donde todo lo demás son fotografías del hotel, la sección
            que vende las celebraciones era la única sin enseñar nada. Ahora
            cada experiencia abre con su imagen.

            La foto va arriba con proporción fija (4/3) y el cuerpo crece con
            `flex-1`, así que las tres tarjetas empiezan y acaban a la misma
            altura aunque una descripción tenga una línea más (`REJILLA`, que además
            centra la última fila si las experiencias no son múltiplo de tres). Y va con
            `CLASE_FOTO_CON_FLAG`: el recorte se ancla arriba a la derecha,
            donde vive el sello de marca, y el radio grande se lleva a la
            esquina superior IZQUIERDA para no morderlo.
          */}
          <ul className={`mx-auto ${RITMO.trasTitulo} ${REJILLA.lista} max-w-5xl`}>
            {experiencias.map((experiencia, indice) => (
              <Revelar
                key={experiencia.id}
                como="li"
                retraso={(indice % 3) * 90}
                className={REJILLA.tercio}
              >
                <article className="flex h-full flex-col overflow-hidden rounded-[var(--radius-generoso)] rounded-tl-[3.5rem] bg-white ring-1 ring-crema-200/70 transition-shadow duration-300 hover:shadow-[var(--shadow-tarjeta)]">
                  {experiencia.imagen_url ? (
                    <div className="relative aspect-4/3 shrink-0 bg-crema-200">
                      <Foto
                        src={experiencia.imagen_url}
                        alt={`Experiencia ${experiencia.nombre} en una cabaña de La Finca`}
                        fill
                        sizes="(min-width: 1024px) 31vw, (min-width: 640px) 46vw, 92vw"
                        className={CLASE_FOTO_CON_FLAG}
                      />
                    </div>
                  ) : null}

                  <div className="flex flex-1 flex-col gap-3 p-6 sm:p-7">
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
                      className="mt-1 flex min-h-11 items-center gap-1.5 font-titulo text-sm font-semibold text-petroleo-600 underline-offset-4 hover:underline"
                    >
                      Añadir a mi reserva
                      <IconoFlecha className="size-4" />
                    </a>
                  </div>
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

      {/*
        AQUÍ ESTABA «NUESTRA ESENCIA», Y SE FUE EL 2026-09-15.

        Era la séptima sección: la banda del verde oficial con las tres
        fotos y las frases del manual. Cesar pidió acortar la portada, y esta
        es la que sobraba —no enseña el hotel, no da un precio y no lleva a
        reservar; cuenta la filosofía de la marca, que es exactamente el
        trabajo de «Sobre nosotros» en `/conocenos`—. Su clave del CMS
        (`home.esencia`) salió con ella del código, del panel y de
        `docs/CMS_CLAVES.md`: no la usaba ninguna otra página.

        El ritmo de color no se rompe: Experiencias sigue en crema e
        Instagram en blanco, y la costura entre las dos la cose ahora un
        banco de niebla en el borde superior de Instagram (antes lo hacían
        las dos ondas de la banda verde).
      */}

      {/* ---------------------------------------------------------------- 8 */}
      {/*
        INSTAGRAM — DONDE ESTABA LA COP16.

        El reconocimiento de la COP16 se mudó a `/conocenos` (§ «Somos COP16»):
        es un video de casi tres minutos con locución, y la portada no es el
        sitio para pedirle tres minutos a nadie. En su hueco entra lo que el
        hotel publica de verdad, que además es de donde llega la mayoría de sus
        huéspedes.

        EL PATRÓN ES EL DE LA MAIMA, EL DISEÑO NO. De allí se copia la lógica
        —fotos propias del bucket enlazadas al perfil, más el reel cargado bajo
        demanda con una fachada— porque ya está probada y evita la API de Meta,
        el token que caduca cada sesenta días y el widget de terceros que se
        rompe sin avisar. La forma es de La Finca: verde, con el patrón de
        colibríes y las curvas abiertas del resto del sitio.

        LAS CUATRO FOTOS NO SON NUEVAS. Son las que dejaron libres los heros al
        cambiar de fotografía —la piscina en la neblina, la fogata de noche y el
        balcón con hamaca eran las tres que no llegaban al ancho de una
        cabecera— más la ducha del bosque. En un cuadrado de 130 px sus 941 px
        de ancho sobran; en una banda a pantalla completa, no llegaban.
      */}
      <Seccion
        fondo="blanco"
        /* El relleno de arriba es el hueco del banco de niebla: sin él, el
           antetítulo se le monta. */
        className="relative isolate overflow-hidden pt-24 sm:pt-28"
      >
        {/* La costura con la sección de experiencias (crema). La hacían las dos
            ondas de la banda verde que vivía en medio; al retirarla, este
            borde se quedaba recto. */}
        <CorteOrganico
          perfil="bruma"
          color="fill-crema-50"
          borde="superior"
          alto={72}
        />
        <PatronColibri tono="claro" />

        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <Revelar className="flex flex-col gap-6 lg:col-span-6">
            <EncabezadoSeccion
              antetitulo={instagram.antetitulo}
              titulo={instagram.titulo}
              alineacion="izquierda"
            />
            <p className="max-w-lg text-base leading-relaxed text-crema-700 sm:text-lg">
              {instagram.descripcion}
            </p>

            {fotosInstagram.length > 0 ? (
              <>
                {/*
                  Cuadrados perfectos: dos filas de dos en el teléfono, una fila
                  de cuatro desde `sm`. Nunca queda un hueco impar.

                  Cada foto es un enlace al perfil, no un `lightbox`: quien pulsa
                  una foto de Instagram espera ir a Instagram. Y llevan
                  `object-right-top` porque el sello de marca vive en esa esquina
                  y un cuadrado recorta mucho: así se ve entero o no se ve, nunca
                  partido (ver `CLASE_FOTO_CON_FLAG`).
                */}
                <ul
                  aria-label="Fotos de La Finca en Instagram"
                  className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                >
                  {fotosInstagram.map((foto) => (
                    <li key={foto.url}>
                      <a
                        href={contacto.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative block aspect-square overflow-hidden rounded-[var(--radius-tarjeta)] bg-crema-200 ring-1 ring-crema-200/70 transition-shadow duration-300 hover:shadow-[var(--shadow-tarjeta)]"
                      >
                        <Foto
                          src={foto.url}
                          alt={foto.alt}
                          fill
                          sizes="(min-width: 1024px) 140px, (min-width: 640px) 22vw, 45vw"
                          fetchPriority="low"
                          className={`${CLASE_FOTO_CON_FLAG} transition-transform duration-500 group-hover:scale-[1.04]`}
                        />
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 flex items-center justify-center bg-petroleo-900/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        >
                          <IconoInstagram className="size-5 text-white" />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>

                {/* CENTRADO EN EL TELÉFONO. A 390 px el botón queda solo en su
                    línea y pegado al borde izquierdo se leía como un resto de
                    la columna de arriba; desde `sm` vuelve a la izquierda,
                    junto al arroba. */}
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5 sm:justify-start">
                  <Boton href={contacto.instagram} variante="primario" externo>
                    {instagram.cta_texto}
                  </Boton>
                  {contacto.instagram_usuario ? (
                    <p className="font-titulo text-sm font-semibold tracking-[0.14em] text-crema-600 uppercase">
                      {contacto.instagram_usuario}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
          </Revelar>

          {/*
            El reel, en su marco. No pide un solo byte a Instagram hasta que
            alguien lo pulsa: ver `ReelInstagram`.
          */}
          {posterInstagram ? (
            <Revelar retraso={110} className="lg:col-span-5 lg:col-start-8">
              <ReelInstagram
                permalink={instagram.reel_url}
                poster={posterInstagram.url}
                posterAlt={instagram.reel_alt || posterInstagram.alt}
              />
            </Revelar>
          ) : null}
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
        {/* Abajo, hacia el pie, NO hay corte: la transición es recta (petición
            de Cesar, 2026-09-15). Ver `CierreReserva`, que es la que hace este
            mismo remate en las ocho páginas internas. El `pb-16` se va con la
            onda: era el aire que el dibujo se comía y que, sin él, dejaba el
            bloque de texto descentrado hacia arriba. */}

        <div className="relative min-h-[62vh] w-full sm:min-h-[28rem]">
          <Foto
            src={ctaFinal.imagen}
            alt={ctaFinal.imagen_alt}
            fill
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
              {/* En el teléfono, el bloque entero va centrado: el botón queda
                  solo en su línea y alineado a la izquierda se leía descolgado.
                  Desde `sm` vuelve a la composición de la izquierda. */}
              <Revelar className="flex max-w-2xl flex-col items-center gap-5 text-center sm:items-start sm:text-left">
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
