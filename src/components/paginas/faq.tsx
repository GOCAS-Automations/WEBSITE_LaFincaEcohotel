import { HeroPagina } from "@/components/sitio/hero-pagina";
import { IconoWhatsapp } from "@/components/sitio/iconos";
import { Boton } from "@/components/ui/boton";
import { Revelar } from "@/components/ui/revelar";
import { Seccion } from "@/components/ui/seccion";
import { getContacto, getFaq, getHeroesListados } from "@/lib/contenido";
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
  const [heroes, faq, contacto] = await Promise.all([
    getHeroesListados(),
    getFaq(),
    getContacto(),
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

      <Seccion fondo="crema">
        <div className="mx-auto max-w-3xl">
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

          <div className="mt-12 flex flex-col items-center gap-4 rounded-[var(--radius-generoso)] bg-white p-8 text-center ring-1 ring-crema-200/70">
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
    </>
  );
}
