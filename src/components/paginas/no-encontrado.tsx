import { Foto } from "@/components/ui/foto";

import { IconoWhatsapp } from "@/components/sitio/iconos";
import { Boton } from "@/components/ui/boton";
import { getContacto, getNoEncontrado } from "@/lib/contenido";
import { NAVEGACION } from "@/lib/sitio";
import { enlaceWhatsapp } from "@/lib/whatsapp";
import Link from "next/link";

/**
 * Contenido de la página 404.
 *
 * Una página de error que solo dice "no encontrado" deja al visitante en un
 * callejón sin salida: esta ofrece las tres salidas que realmente sirven —el
 * inicio, el menú completo y WhatsApp— porque quien llega aquí suele venir de
 * un enlace viejo del sitio anterior y sigue queriendo reservar.
 */
export async function ContenidoNoEncontrado() {
  const [contenido, contacto] = await Promise.all([
    getNoEncontrado(),
    getContacto(),
  ]);

  return (
    <section className="contenedor bajo-nav flex flex-col items-center gap-8 pb-16 text-center sm:pb-24">
      <div className="relative size-56 sm:size-72">
        <Foto
          src={contenido.imagen}
          alt={contenido.imagen_alt}
          fill
          priority
          sizes="(min-width: 640px) 18rem, 14rem"
          className="object-contain"
        />
      </div>

      <div className="flex flex-col items-center gap-4">
        <p className="font-titulo text-sm font-semibold tracking-[0.18em] text-oliva-600 uppercase">
          Error 404
        </p>
        <h1 className="max-w-2xl text-3xl leading-tight font-extrabold text-petroleo-900 sm:text-4xl">
          {contenido.titulo}
        </h1>
        <p className="max-w-md text-base leading-relaxed text-crema-700">
          {contenido.mensaje}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Boton href={contenido.cta_href} tamano="grande">
          {contenido.cta_texto}
        </Boton>
        <Boton
          href={enlaceWhatsapp(contacto.mensaje_whatsapp, contacto.whatsapp)}
          variante="contorno"
          tamano="grande"
          externo
        >
          <IconoWhatsapp className="size-5" />
          Escribir por WhatsApp
        </Boton>
      </div>

      <nav aria-label="Secciones del sitio" className="mt-4">
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {NAVEGACION.map((enlace) => (
            <li key={enlace.href}>
              <Link
                href={enlace.href}
                className="text-sm text-petroleo-700 underline-offset-4 transition-colors duration-200 hover:text-petroleo-900 hover:underline"
              >
                {enlace.etiqueta}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
