import {
  ColibriesSueltos,
  Neblina,
  PatronColibri,
  RamaBotanica,
  Resplandor,
} from "@/components/sitio/atmosfera";
import { CierreReserva } from "@/components/sitio/cierre-reserva";
import { HeroPagina } from "@/components/sitio/hero-pagina";
import { IconoWhatsapp } from "@/components/sitio/iconos";
import { Boton } from "@/components/ui/boton";
import { Revelar } from "@/components/ui/revelar";
import { RITMO, Seccion } from "@/components/ui/seccion";
import {
  getContacto,
  getFaq,
  getHeroesListados,
  getSeccionPlanes,
} from "@/lib/contenido";
import { enlaceWhatsapp } from "@/lib/whatsapp";

/**
 * Preguntas frecuentes.
 *
 * El acordeón usa `<details>`/`<summary>` nativos: sin una línea de JavaScript
 * ya se abre y se cierra, se enfoca con el tabulador, se activa con Intro, el
 * navegador anuncia el estado a los lectores de pantalla y el buscador del
 * navegador (Ctrl+F) encuentra el texto de dentro. Reimplementarlo con `useState`
 * habría costado más código y menos accesibilidad.
 *
 * El mismo contenido alimenta los datos estructurados `FAQPage` de la página.
 */
export async function PaginaFaq() {
  const [heroes, faq, contacto, seccionPlanes] = await Promise.all([
    getHeroesListados(),
    getFaq(),
    getContacto(),
    getSeccionPlanes(),
  ]);

  return (
    <>
      <HeroPagina
        hero={heroes.faq}
        migas={[
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Preguntas", ruta: "/faq" },
        ]}
      />

      {/*
        LA PÁGINA TENÍA EL FONDO MÁS POBRE DEL SITIO: crema plano y una columna
        de acordeones blancos, sin una sola señal de dónde está el visitante.
        Ahora lleva las cuatro texturas del manual sobre el verde claro de la
        marca (`brote-50`, el tercer color oficial):

        · **Rama botánica en los DOS laterales** (Cesar, 2026-09-15), y dos por
          lado a distinta altura y escala, una en espejo: una sola rama por
          borde se leía como una calcomanía pegada en la esquina.
        · **Patrón de colibríes** al 40 % de su opacidad ya baja — el mosaico
          horneado en PNG, nunca `mask-image`: por ahí se fue el Lighthouse a
          42 en la portada (ver `docs/MEMORIA.md`, 2026-09-11).
        · **Un par de colibríes sueltos**, que son los que se leen como un ave.
        · **Resplandor** de luz entrando por la derecha, como en el manual.

        Todo va por DEBAJO del contenido (`z-10` en la columna) y a opacidades
        de una cifra: una página de preguntas se lee, no se contempla. Las
        tarjetas del acordeón siguen en blanco sólido, así que el contraste del
        texto —el dato que importa— no cambia ni un punto respecto a antes.
        Las ramas laterales y el patrón se esconden por debajo de `lg`: en el
        teléfono el ancho es del texto, no del adorno.
      */}
      <Seccion fondo="brote" className="relative overflow-hidden">
        <Neblina tono="verde" className="opacity-40" />
        <Resplandor className="opacity-70" />
        <PatronColibri tono="claro" className="hidden opacity-40 lg:block" />
        <ColibriesSueltos tono="claro" className="opacity-70" />
        <RamaBotanica
          className="absolute top-[4%] left-[-5%] hidden w-56 text-oliva-500/25 lg:block"
          ritmo="lenta"
        />
        <RamaBotanica
          className="absolute bottom-[6%] left-[-7%] hidden w-40 text-oliva-400/20 lg:block"
          espejo
        />
        <RamaBotanica
          className="absolute right-[-6%] bottom-[2%] hidden w-64 text-oliva-500/20 lg:block"
          espejo
        />
        <RamaBotanica
          className="absolute top-[8%] right-[-4%] hidden w-44 text-oliva-400/20 lg:block"
          ritmo="lenta"
        />

        <div className="relative z-10 mx-auto max-w-3xl">
          <p className="mb-10 text-center text-base leading-relaxed text-crema-700 sm:text-lg">
            {faq.intro}
          </p>

          <ul className="flex flex-col gap-3">
            {faq.items.map((item, indice) => (
              <Revelar
                key={item.pregunta}
                como="li"
                retraso={Math.min(indice, 4) * 60}
              >
                <details className="group rounded-[var(--radius-tarjeta)] bg-white ring-1 ring-crema-200/70 transition-shadow duration-300 open:shadow-[var(--shadow-tarjeta)]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
                    <h2 className="font-titulo text-base font-semibold text-petroleo-900 sm:text-lg">
                      {item.pregunta}
                    </h2>
                    <span
                      aria-hidden="true"
                      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-petroleo-50 text-petroleo-600 transition-transform duration-300 ease-out group-open:rotate-45"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </summary>
                  <p className="px-5 pb-5 text-sm leading-relaxed text-crema-700 sm:px-6 sm:pb-6 sm:text-base">
                    {item.respuesta}
                  </p>
                </details>
              </Revelar>
            ))}
          </ul>

          <div className={`${RITMO.trasTitulo} flex flex-col items-center gap-4 rounded-[var(--radius-generoso)] rounded-tl-[3.5rem] bg-white p-8 text-center ring-1 ring-crema-200/70`}>
            <h2 className="font-titulo text-xl font-bold text-petroleo-900">
              ¿Te quedó alguna duda?
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-crema-700">
              Escríbenos por WhatsApp y te respondemos hoy mismo.
            </p>
            <Boton
              href={enlaceWhatsapp(
                contacto.mensaje_whatsapp,
                contacto.whatsapp,
              )}
              externo
            >
              <IconoWhatsapp className="size-5" />
              Escribir por WhatsApp
            </Boton>
          </div>
        </div>
      </Seccion>

      <CierreReserva
        imagen={seccionPlanes.imagen_fondo}
        fondoAnterior="bg-brote-50"
        titulo="Ya sabes cómo es. Solo faltan las fechas."
        perfil="bruma"
      />
    </>
  );
}
