import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BloqueContenido } from "../bloque";
import {
  FormularioCtaFinal,
  FormularioEsencia,
  FormularioHero,
  FormularioIntro,
  FormularioPlanes,
  FormularioReconocimiento,
  FormularioSeccionSimple,
  FormularioTestimonios,
} from "../formularios-portada";
import {
  FormularioCabeceras,
  FormularioFaq,
  FormularioGaleria,
  FormularioLugar,
  FormularioNoEncontrado,
  FormularioPaginaExperiencias,
  FormularioReservar,
} from "../formularios-paginas";
import {
  FormularioContacto,
  FormularioSeo,
} from "../formularios-sitio";
import { buscarSeccion } from "../secciones";
import { EncabezadoPagina } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { leerContenidoPanel } from "@/lib/admin/datos";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ seccion: string }>;
}): Promise<Metadata> {
  const { seccion } = await params;
  const encontrada = buscarSeccion(seccion);
  return { title: encontrada ? encontrada.titulo : "Contenido del sitio" };
}

export default async function PaginaSeccionContenido({
  params,
}: {
  params: Promise<{ seccion: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { seccion: slug } = await params;

  const seccion = buscarSeccion(slug);
  if (!seccion) notFound();

  const filas = await leerContenidoPanel(supabase);
  const valor = (clave: string) => filas.get(clave) ?? {};

  return (
    <>
      <EncabezadoPagina
        titulo={seccion.titulo}
        descripcion={seccion.descripcion}
        accion={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={seccion.verEn}
              target="_blank"
              rel="noreferrer"
              className="text-[0.875rem] font-semibold text-petroleo-700 underline-offset-4 hover:underline"
            >
              Ver en el sitio ↗
            </Link>
            <Link
              href="/admin/contenido"
              className="text-[0.875rem] font-semibold text-crema-700 underline-offset-4 hover:underline"
            >
              ← Todas las secciones
            </Link>
          </div>
        }
      />

      <div className="space-y-6">
        {slug === "portada" && (
          <>
            <BloqueContenido
              titulo="Primera pantalla"
              descripcion="Lo primero que se ve al entrar al sitio: la foto grande, el titular y los dos botones."
            >
              <FormularioHero valor={valor("home.hero")} />
            </BloqueContenido>

            <BloqueContenido
              titulo="Bienvenida"
              descripcion="El bloque que presenta La Finca, con su foto y las cifras destacadas."
            >
              <FormularioIntro valor={valor("home.intro")} />
            </BloqueContenido>

            <BloqueContenido
              titulo="Encabezado del bloque de cabañas"
              descripcion="El texto que va encima de las tarjetas de las cabañas. Las cabañas se editan en su propia sección."
            >
              <FormularioSeccionSimple
                clave="home.cabanas"
                valor={valor("home.cabanas")}
              />
            </BloqueContenido>

            <BloqueContenido
              titulo="Encabezado del bloque de planes"
              descripcion="El texto que va encima de los tres planes. Los precios salen de lo que pongas en cada cabaña."
            >
              <FormularioPlanes valor={valor("home.planes")} />
            </BloqueContenido>

            <BloqueContenido
              titulo="Encabezado del bloque de experiencias"
              descripcion="El texto que va encima de las experiencias de la portada."
            >
              <FormularioSeccionSimple
                clave="home.experiencias"
                valor={valor("home.experiencias")}
              />
            </BloqueContenido>

            <BloqueContenido
              titulo="Naturaleza"
              descripcion="El bloque del bosque de niebla, con sus tres fotos."
            >
              <FormularioEsencia valor={valor("home.esencia")} />
            </BloqueContenido>

            <BloqueContenido
              titulo="Reconocimientos"
              descripcion="El bloque de la COP16."
            >
              <FormularioReconocimiento valor={valor("home.reconocimiento")} />
            </BloqueContenido>

            <BloqueContenido
              titulo="Testimonios"
              descripcion="Las reseñas de huéspedes que se muestran en la portada."
            >
              <FormularioTestimonios valor={valor("home.testimonios")} />
            </BloqueContenido>

            <BloqueContenido
              titulo="Cierre de la portada"
              descripcion="La última llamada a reservar, con foto a todo el ancho."
            >
              <FormularioCtaFinal valor={valor("home.cta_final")} />
            </BloqueContenido>
          </>
        )}

        {slug === "cabeceras" && (
          <BloqueContenido
            titulo="Las siete cabeceras"
            descripcion="Se guardan todas juntas con el botón del final."
          >
            <FormularioCabeceras valor={valor("heroes.listados")} />
          </BloqueContenido>
        )}

        {slug === "experiencias" && (
          <BloqueContenido titulo="Página de experiencias">
            <FormularioPaginaExperiencias valor={valor("experiencias")} />
          </BloqueContenido>
        )}

        {slug === "preguntas" && (
          <BloqueContenido titulo="Preguntas frecuentes">
            <FormularioFaq valor={valor("faq")} />
          </BloqueContenido>
        )}

        {slug === "lugar" && (
          <BloqueContenido titulo="El lugar">
            <FormularioLugar valor={valor("lugar")} />
          </BloqueContenido>
        )}

        {slug === "galeria" && (
          <BloqueContenido titulo="Galería">
            <FormularioGaleria valor={valor("galeria")} />
          </BloqueContenido>
        )}

        {slug === "reservar" && (
          <>
            <BloqueContenido
              titulo="Página de reserva"
              descripcion="Los pasos que se le explican al huésped mientras no exista el pago en línea."
            >
              <FormularioReservar valor={valor("reservar")} />
            </BloqueContenido>

            <BloqueContenido
              titulo="Página no encontrada"
              descripcion="Lo que ve alguien que llega a una dirección del sitio que no existe."
            >
              <FormularioNoEncontrado valor={valor("no_encontrado")} />
            </BloqueContenido>
          </>
        )}

        {slug === "contacto" && (
          <BloqueContenido
            titulo="Contacto, WhatsApp y redes"
            descripcion="Estos datos alimentan el pie de todas las páginas, la página de contacto, el botón flotante de WhatsApp y la ficha del hotel en Google."
          >
            <FormularioContacto valor={valor("sitio.contacto")} />
          </BloqueContenido>
        )}

        {slug === "buscadores" && (
          <BloqueContenido titulo="Google y redes sociales">
            <FormularioSeo valor={valor("sitio.seo")} />
          </BloqueContenido>
        )}
      </div>
    </>
  );
}
