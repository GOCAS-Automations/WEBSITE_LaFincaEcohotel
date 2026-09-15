"use client";

import {
  guardarCabecerasAction,
  guardarFaqAction,
  guardarGaleriaAction,
  guardarLugarAction,
  guardarNoEncontradoAction,
  guardarPaginaExperienciasAction,
  guardarReconocimientoAction,
  guardarReservarAction,
} from "./acciones";
import { comoTextarea, galeria, objeto, objetos, texto, textos } from "./lectura";
import { PAGINAS_CON_CABECERA } from "./secciones";
import { CampoImagen } from "@/components/admin/campo-imagen";
import { Chips } from "@/components/admin/chips";
import { EditorGaleria } from "@/components/admin/editor-galeria";
import { EditorLista } from "@/components/admin/editor-lista";
import { FormularioAccion } from "@/components/admin/formulario-accion";
import { AreaTexto, Campo, Divisor, Entrada } from "@/components/admin/ui";

type Valor = Record<string, unknown>;

/* ---------------------------------------------------------------------------
 * Cabeceras de las siete páginas internas
 * ------------------------------------------------------------------------- */

export function FormularioCabeceras({ valor }: { valor: Valor }) {
  return (
    <FormularioAccion
      accion={guardarCabecerasAction}
      etiquetaEnviar="Guardar las siete cabeceras"
    >
      <div className="space-y-6">
        {PAGINAS_CON_CABECERA.map((pagina) => {
          const datos = objeto(valor, pagina.clave);
          return (
            <div key={pagina.clave}>
              <Divisor titulo={pagina.nombre} />
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Campo
                  etiqueta="Título de la página"
                  htmlFor={`${pagina.clave}_titulo`}
                  ayuda="Es el encabezado principal que lee Google. Cambiarlo afecta al posicionamiento."
                >
                  <Entrada
                    id={`${pagina.clave}_titulo`}
                    name={`${pagina.clave}__titulo`}
                    defaultValue={texto(datos, "titulo")}
                    maxLength={200}
                  />
                </Campo>
                <Campo
                  etiqueta="Subtítulo"
                  htmlFor={`${pagina.clave}_subtitulo`}
                >
                  <Entrada
                    id={`${pagina.clave}_subtitulo`}
                    name={`${pagina.clave}__subtitulo`}
                    defaultValue={texto(datos, "subtitulo")}
                    maxLength={500}
                  />
                </Campo>
                <Campo etiqueta="Foto de la cabecera">
                  <CampoImagen
                    name={`${pagina.clave}__imagen`}
                    urlInicial={texto(datos, "imagen")}
                    proporcion="apaisada"
                  />
                </Campo>
                <Campo
                  etiqueta="Descripción de la foto"
                  htmlFor={`${pagina.clave}_alt`}
                >
                  <Entrada
                    id={`${pagina.clave}_alt`}
                    name={`${pagina.clave}__imagen_alt`}
                    defaultValue={texto(datos, "imagen_alt")}
                    maxLength={300}
                  />
                </Campo>
              </div>
            </div>
          );
        })}
      </div>
    </FormularioAccion>
  );
}

/* ---------------------------------------------------------------------------
 * Página de experiencias
 * ------------------------------------------------------------------------- */

export function FormularioPaginaExperiencias({ valor }: { valor: Valor }) {
  return (
    <FormularioAccion
      accion={guardarPaginaExperienciasAction}
      etiquetaEnviar="Guardar"
    >
      <div className="grid gap-5">
        <Campo
          etiqueta="Texto de entrada"
          htmlFor="exp_intro"
          ayuda="Aparece bajo la cabecera, antes de las experiencias con precio."
        >
          <AreaTexto
            id="exp_intro"
            name="intro"
            defaultValue={texto(valor, "intro")}
            maxLength={800}
            rows={3}
          />
        </Campo>

        <Divisor titulo="Otras experiencias (sin precio publicado)" />

        <p className="text-[0.8125rem] leading-relaxed text-crema-700">
          Las experiencias <strong>con precio</strong> —Aniversario y Cumpleaños
          con Amor— se editan en el módulo «Experiencias» del menú. Aquí van las
          que hoy se ofrecen a pedido, sin tarifa publicada. Si mañana el hotel
          les pone precio, lo correcto es pasarlas a «Experiencias» y quitarlas
          de esta lista.
        </p>

        <Campo etiqueta="Título del bloque" htmlFor="exp_ad_titulo">
          <Entrada
            id="exp_ad_titulo"
            name="adicionales_titulo"
            defaultValue={texto(valor, "adicionales_titulo")}
            maxLength={200}
          />
        </Campo>

        <Campo etiqueta="Descripción del bloque" htmlFor="exp_ad_desc">
          <AreaTexto
            id="exp_ad_desc"
            name="adicionales_descripcion"
            defaultValue={texto(valor, "adicionales_descripcion")}
            maxLength={600}
            rows={2}
          />
        </Campo>

        <Campo etiqueta="Experiencias a pedido">
          <EditorLista
            name="adicionales"
            inicial={objetos(valor, "adicionales", [
              "nombre",
              "descripcion",
              "imagen",
              "imagen_alt",
            ])}
            etiquetaElemento="experiencia"
            maximo={12}
            vacio="No hay experiencias a pedido publicadas."
            campos={[
              { clave: "nombre", etiqueta: "Nombre", tipo: "texto" },
              { clave: "descripcion", etiqueta: "Qué incluye", tipo: "parrafo" },
              {
                clave: "imagen",
                etiqueta: "Foto",
                tipo: "imagen",
                carpeta: "experiencias",
              },
              {
                clave: "imagen_alt",
                etiqueta: "Descripción de la foto",
                tipo: "texto",
              },
            ]}
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}

/* ---------------------------------------------------------------------------
 * Preguntas frecuentes
 * ------------------------------------------------------------------------- */

export function FormularioFaq({ valor }: { valor: Valor }) {
  return (
    <FormularioAccion accion={guardarFaqAction} etiquetaEnviar="Guardar preguntas">
      <div className="grid gap-5">
        <Campo etiqueta="Texto de entrada" htmlFor="faq_intro">
          <AreaTexto
            id="faq_intro"
            name="intro"
            defaultValue={texto(valor, "intro")}
            maxLength={800}
            rows={2}
          />
        </Campo>

        <div className="rounded-tarjeta bg-dorado-500/[0.09] px-4 py-3 text-[0.8125rem] leading-relaxed text-dorado-800 ring-1 ring-dorado-500/20">
          Estas respuestas también son las que puede mostrar Google directamente
          en sus resultados. Escríbelas completas y sin referencias a otras
          partes de la página («como se dijo arriba» no se entiende fuera de
          contexto).
        </div>

        <Campo etiqueta="Preguntas y respuestas">
          <EditorLista
            name="items"
            inicial={objetos(valor, "items", ["pregunta", "respuesta"])}
            etiquetaElemento="pregunta"
            maximo={40}
            vacio="Todavía no hay preguntas publicadas."
            campos={[
              {
                clave: "pregunta",
                etiqueta: "Pregunta",
                tipo: "texto",
                marcador: "¿Permiten mascotas?",
              },
              { clave: "respuesta", etiqueta: "Respuesta", tipo: "parrafo" },
            ]}
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}

/* ---------------------------------------------------------------------------
 * Conócenos
 * ------------------------------------------------------------------------- */

export function FormularioLugar({ valor }: { valor: Valor }) {
  return (
    <FormularioAccion accion={guardarLugarAction} etiquetaEnviar="Guardar">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo etiqueta="Texto pequeño de arriba" htmlFor="lugar_ante">
          <Entrada
            id="lugar_ante"
            name="antetitulo"
            defaultValue={texto(valor, "antetitulo")}
            maxLength={120}
          />
        </Campo>
        <Campo etiqueta="Titular" htmlFor="lugar_titulo" obligatorio>
          <Entrada
            id="lugar_titulo"
            name="titulo"
            defaultValue={texto(valor, "titulo")}
            required
            maxLength={200}
          />
        </Campo>
        <Campo
          etiqueta="Párrafos"
          htmlFor="lugar_parrafos"
          className="sm:col-span-2"
          ayuda="Deja una línea en blanco entre un párrafo y el siguiente."
        >
          <AreaTexto
            id="lugar_parrafos"
            name="parrafos"
            defaultValue={comoTextarea(textos(valor, "parrafos"))}
            rows={7}
          />
        </Campo>
        <Campo etiqueta="Foto principal">
          <CampoImagen
            name="imagen"
            urlInicial={texto(valor, "imagen")}
            proporcion="apaisada"
          />
        </Campo>
        <Campo etiqueta="Descripción de la foto" htmlFor="lugar_alt">
          <Entrada
            id="lugar_alt"
            name="imagen_alt"
            defaultValue={texto(valor, "imagen_alt")}
            maxLength={300}
          />
        </Campo>

        <Campo
          etiqueta="Segunda foto"
          ayuda="Va debajo de la principal. Entre las dos ocupan el alto del texto de al lado; si la dejas vacía, se muestra solo la principal."
        >
          <CampoImagen
            name="imagen_secundaria"
            urlInicial={texto(valor, "imagen_secundaria")}
            proporcion="apaisada"
          />
        </Campo>
        <Campo
          etiqueta="Descripción de la segunda foto"
          htmlFor="lugar_alt_2"
        >
          <Entrada
            id="lugar_alt_2"
            name="imagen_secundaria_alt"
            defaultValue={texto(valor, "imagen_secundaria_alt")}
            maxLength={300}
          />
        </Campo>

        <Divisor titulo="Instalaciones" />

        <Campo etiqueta="Título del bloque" htmlFor="lugar_inst_titulo">
          <Entrada
            id="lugar_inst_titulo"
            name="instalaciones_titulo"
            defaultValue={texto(valor, "instalaciones_titulo")}
            maxLength={200}
          />
        </Campo>
        <Campo etiqueta="Descripción del bloque" htmlFor="lugar_inst_desc">
          <Entrada
            id="lugar_inst_desc"
            name="instalaciones_descripcion"
            defaultValue={texto(valor, "instalaciones_descripcion")}
            maxLength={600}
          />
        </Campo>
        <Campo etiqueta="Lista de instalaciones" className="sm:col-span-2">
          <EditorLista
            name="instalaciones"
            inicial={objetos(valor, "instalaciones", [
              "nombre",
              "descripcion",
              "imagen",
              "imagen_alt",
              "imagen_posicion",
            ])}
            etiquetaElemento="instalación"
            maximo={12}
            campos={[
              { clave: "nombre", etiqueta: "Nombre", tipo: "texto" },
              { clave: "descripcion", etiqueta: "Descripción", tipo: "parrafo" },
              {
                clave: "imagen",
                etiqueta: "Foto",
                tipo: "imagen",
                carpeta: "sitio",
              },
              {
                clave: "imagen_alt",
                etiqueta: "Descripción de la foto",
                tipo: "texto",
              },
              {
                clave: "imagen_posicion",
                etiqueta: "Encuadre de la foto (opcional)",
                tipo: "texto",
                marcador: "center (por defecto), center bottom, center top…",
              },
            ]}
          />
        </Campo>

        <Divisor titulo="Cómo llegar" />

        <Campo
          etiqueta="Título del bloque"
          htmlFor="lugar_llegar_titulo"
          className="sm:col-span-2"
        >
          <Entrada
            id="lugar_llegar_titulo"
            name="llegar_titulo"
            defaultValue={texto(valor, "llegar_titulo")}
            maxLength={200}
          />
        </Campo>
        <Campo
          etiqueta="Párrafos"
          htmlFor="lugar_llegar_parrafos"
          className="sm:col-span-2"
          ayuda="Deja una línea en blanco entre un párrafo y el siguiente."
        >
          <AreaTexto
            id="lugar_llegar_parrafos"
            name="llegar_parrafos"
            defaultValue={comoTextarea(textos(valor, "llegar_parrafos"))}
            rows={4}
          />
        </Campo>
        <Campo
          etiqueta="Indicaciones sueltas"
          className="sm:col-span-2"
          ayuda="Salen como lista con viñetas. Escribe una y presiona Enter. El mapa no se configura aquí: sale de la sección de contacto."
        >
          <Chips
            name="llegar_indicaciones"
            inicial={textos(valor, "llegar_indicaciones")}
            marcador="Parqueadero externo vigilado 24 horas"
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}

/* ---------------------------------------------------------------------------
 * Reconocimiento (COP16)
 * ------------------------------------------------------------------------- */

export function FormularioReconocimiento({ valor }: { valor: Valor }) {
  return (
    <FormularioAccion
      accion={guardarReconocimientoAction}
      etiquetaEnviar="Guardar"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo etiqueta="Texto pequeño de arriba" htmlFor="recon_ante">
          <Entrada
            id="recon_ante"
            name="antetitulo"
            defaultValue={texto(valor, "antetitulo")}
            maxLength={120}
          />
        </Campo>
        <Campo etiqueta="Titular" htmlFor="recon_titulo" obligatorio>
          <Entrada
            id="recon_titulo"
            name="titulo"
            defaultValue={texto(valor, "titulo")}
            required
            maxLength={200}
          />
        </Campo>
        <Campo
          etiqueta="Párrafos"
          htmlFor="recon_parrafos"
          className="sm:col-span-2"
          ayuda="Deja una línea en blanco entre un párrafo y el siguiente."
        >
          <AreaTexto
            id="recon_parrafos"
            name="parrafos"
            defaultValue={comoTextarea(textos(valor, "parrafos"))}
            rows={4}
          />
        </Campo>
        <Campo
          etiqueta="Foto"
          ayuda="Si hay video, esta foto es la que se ve antes de reproducirlo."
        >
          <CampoImagen
            name="imagen"
            urlInicial={texto(valor, "imagen")}
            proporcion="apaisada"
          />
        </Campo>
        <Campo etiqueta="Descripción de la foto" htmlFor="recon_alt">
          <Entrada
            id="recon_alt"
            name="imagen_alt"
            defaultValue={texto(valor, "imagen_alt")}
            maxLength={300}
          />
        </Campo>
        <Campo
          etiqueta="Video (opcional)"
          htmlFor="recon_video"
          className="sm:col-span-2"
          ayuda="Dirección de un archivo .mp4 o .webm. Si la dejas vacía, la sección muestra la foto. El video se reproduce solo, silenciado y en bucle, con controles para subir el volumen."
        >
          <Entrada
            id="recon_video"
            name="video"
            type="url"
            defaultValue={texto(valor, "video")}
            maxLength={500}
            placeholder="https://…/videos/sitio/cop16-la-finca.mp4"
          />
        </Campo>
        <Campo etiqueta="Botón — texto" htmlFor="recon_cta">
          <Entrada
            id="recon_cta"
            name="cta_texto"
            defaultValue={texto(valor, "cta_texto")}
            maxLength={60}
          />
        </Campo>
        <Campo etiqueta="Botón — a dónde lleva" htmlFor="recon_href">
          <Entrada
            id="recon_href"
            name="cta_href"
            defaultValue={texto(valor, "cta_href")}
            maxLength={200}
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}

/* ---------------------------------------------------------------------------
 * Galería
 * ------------------------------------------------------------------------- */

export function FormularioGaleria({ valor }: { valor: Valor }) {
  return (
    <FormularioAccion accion={guardarGaleriaAction} etiquetaEnviar="Guardar galería">
      <div className="grid gap-5">
        <Campo etiqueta="Texto de entrada" htmlFor="gal_intro">
          <AreaTexto
            id="gal_intro"
            name="intro"
            defaultValue={texto(valor, "intro")}
            maxLength={800}
            rows={2}
          />
        </Campo>
        <Campo
          etiqueta="Fotos"
          ayuda="Se muestran en este orden. Conviene poner primero las de mayor resolución: la cuadrícula las muestra grandes y una foto pequeña estirada se ve borrosa."
        >
          <EditorGaleria
            name="imagenes"
            inicial={galeria(valor, "imagenes")}
            carpeta="galeria"
            conPortada={false}
            vacio="La galería está vacía. Sube fotos desde tu computador o pega direcciones."
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}

/* ---------------------------------------------------------------------------
 * Reservar
 * ------------------------------------------------------------------------- */

export function FormularioReservar({ valor }: { valor: Valor }) {
  return (
    <FormularioAccion accion={guardarReservarAction} etiquetaEnviar="Guardar">
      <div className="grid gap-5">
        <Campo etiqueta="Texto de entrada" htmlFor="res_intro">
          <AreaTexto
            id="res_intro"
            name="intro"
            defaultValue={texto(valor, "intro")}
            maxLength={800}
            rows={2}
          />
        </Campo>
        <Campo etiqueta="Pasos">
          <EditorLista
            name="pasos"
            inicial={objetos(valor, "pasos", ["titulo", "texto"])}
            etiquetaElemento="paso"
            maximo={8}
            campos={[
              {
                clave: "titulo",
                etiqueta: "Título del paso",
                tipo: "texto",
                marcador: "1. Elige tu cabaña",
              },
              { clave: "texto", etiqueta: "Explicación", tipo: "parrafo" },
            ]}
          />
        </Campo>
        <Campo
          etiqueta="Nota final"
          htmlFor="res_nota"
          ayuda="Cuando exista el pago en línea habrá que vaciar esta nota."
        >
          <AreaTexto
            id="res_nota"
            name="nota"
            defaultValue={texto(valor, "nota")}
            maxLength={400}
            rows={2}
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}

/* ---------------------------------------------------------------------------
 * Página no encontrada
 * ------------------------------------------------------------------------- */

export function FormularioNoEncontrado({ valor }: { valor: Valor }) {
  return (
    <FormularioAccion
      accion={guardarNoEncontradoAction}
      etiquetaEnviar="Guardar"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          etiqueta="Titular"
          htmlFor="ne_titulo"
          obligatorio
          className="sm:col-span-2"
        >
          <Entrada
            id="ne_titulo"
            name="titulo"
            defaultValue={texto(valor, "titulo")}
            required
            maxLength={200}
          />
        </Campo>
        <Campo etiqueta="Mensaje" htmlFor="ne_mensaje" className="sm:col-span-2">
          <AreaTexto
            id="ne_mensaje"
            name="mensaje"
            defaultValue={texto(valor, "mensaje")}
            maxLength={600}
            rows={2}
          />
        </Campo>
        <Campo etiqueta="Botón — texto" htmlFor="ne_cta">
          <Entrada
            id="ne_cta"
            name="cta_texto"
            defaultValue={texto(valor, "cta_texto")}
            maxLength={60}
          />
        </Campo>
        <Campo etiqueta="Botón — a dónde lleva" htmlFor="ne_href">
          <Entrada
            id="ne_href"
            name="cta_href"
            defaultValue={texto(valor, "cta_href")}
            maxLength={200}
          />
        </Campo>
        <Campo etiqueta="Foto">
          <CampoImagen
            name="imagen"
            urlInicial={texto(valor, "imagen")}
            proporcion="apaisada"
          />
        </Campo>
        <Campo etiqueta="Descripción de la foto" htmlFor="ne_alt">
          <Entrada
            id="ne_alt"
            name="imagen_alt"
            defaultValue={texto(valor, "imagen_alt")}
            maxLength={300}
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}
