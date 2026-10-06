import { Neblina } from "@/components/sitio/atmosfera";
import {
  CaminosDeSalida,
  type Camino,
} from "@/components/sitio/caminos-de-salida";
import {
  IconoCabana,
  IconoCalendario,
  IconoHoja,
  IconoWhatsapp,
} from "@/components/sitio/iconos";
import { getContacto, getNoEncontrado } from "@/lib/contenido";
import { enlaceWhatsapp } from "@/lib/whatsapp";

/**
 * Contenido de la página 404.
 *
 * Una página de error que solo dice "no encontrado" deja al visitante en un
 * callejón sin salida. Quien llega aquí suele venir de un enlace viejo del
 * sitio anterior y sigue queriendo reservar, así que la página es corta —un
 * titular, una frase— y lo que manda son los cuatro caminos: el que se edita
 * en el panel (por defecto, el inicio), las cabañas, reservar y WhatsApp.
 *
 * SIN FOTO desde el 2026-10-06. Era una foto de las zonas comunes metida en un
 * cuadrado con `object-contain`, que la dejaba con franjas vacías y no decía
 * nada de «te perdiste». La identidad la ponen ahora la neblina de marca y un
 * «404» grande y tenue en la tipografía de títulos. El campo «imagen» de esta
 * sección en el panel queda sin uso.
 */
export async function ContenidoNoEncontrado() {
  const [contenido, contacto] = await Promise.all([
    getNoEncontrado(),
    getContacto(),
  ]);

  const fijos: Camino[] = [
    {
      etiqueta: "Ver las cabañas",
      detalle: "Las cinco cabañas, sus fotos y sus planes",
      href: "/alojamientos",
      icono: <IconoCabana className="size-5" />,
    },
    {
      etiqueta: "Reservar",
      detalle: "Elige tu cabaña y tus fechas",
      href: "/reservar",
      icono: <IconoCalendario className="size-5" />,
      claseIcono: "bg-oliva-600",
    },
  ];

  const caminos: Camino[] = [
    {
      etiqueta: contenido.cta_texto,
      detalle:
        contenido.cta_href === "/"
          ? "La portada de La Finca"
          : "El camino que te recomendamos",
      href: contenido.cta_href,
      icono: <IconoHoja className="size-5" />,
    },
    /* Si desde el panel el botón principal apunta a las cabañas o a reservar,
       esa fila no se repite. */
    ...fijos.filter((camino) => camino.href !== contenido.cta_href),
    {
      etiqueta: "Escribir por WhatsApp",
      detalle: "Te orientamos y te contamos qué hay libre",
      href: enlaceWhatsapp(contacto.mensaje_whatsapp, contacto.whatsapp),
      icono: <IconoWhatsapp className="size-5" />,
      externo: true,
      claseIcono: "bg-[#25D366]",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-crema-50">
      <Neblina tono="verde" className="opacity-60" />

      <div className="contenedor bajo-nav relative z-10 flex flex-col items-center pb-20 text-center sm:pb-28">
        <p
          aria-hidden="true"
          className="font-titulo text-[clamp(6rem,30vw,11rem)] leading-none font-extrabold tracking-tight text-petroleo-700/10 select-none"
        >
          404
        </p>

        <div className="-mt-6 flex flex-col items-center gap-4 sm:-mt-10">
          <p className="font-titulo text-sm font-semibold tracking-[0.18em] text-oliva-600 uppercase">
            Página no encontrada
          </p>
          <h1 className="max-w-xl text-3xl leading-tight font-extrabold text-balance text-petroleo-900 sm:text-4xl">
            {contenido.titulo}
          </h1>
          <p className="max-w-md text-base leading-relaxed text-pretty text-crema-700">
            {contenido.mensaje}
          </p>
        </div>

        <CaminosDeSalida caminos={caminos} className="mt-10 w-full max-w-md" />
      </div>
    </section>
  );
}
