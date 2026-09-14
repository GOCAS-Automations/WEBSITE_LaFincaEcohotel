"use client";

import { guardarContactoAction, guardarSeoAction } from "./acciones";
import { numero, objeto, texto, textos } from "./lectura";
import { CampoImagen } from "@/components/admin/campo-imagen";
import { Chips } from "@/components/admin/chips";
import { FormularioAccion } from "@/components/admin/formulario-accion";
import { AreaTexto, Campo, Divisor, Entrada } from "@/components/admin/ui";

type Valor = Record<string, unknown>;

/* ---------------------------------------------------------------------------
 * Contacto, WhatsApp y redes
 * ------------------------------------------------------------------------- */

export function FormularioContacto({ valor }: { valor: Valor }) {
  return (
    <FormularioAccion
      accion={guardarContactoAction}
      etiquetaEnviar="Guardar datos de contacto"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Divisor titulo="WhatsApp" />

        <Campo
          etiqueta="Número de WhatsApp"
          htmlFor="whatsapp"
          ayuda="Solo números, con el indicativo del país y sin espacios: 573160476671."
        >
          <Entrada
            id="whatsapp"
            name="whatsapp"
            inputMode="numeric"
            defaultValue={texto(valor, "whatsapp")}
            maxLength={30}
            placeholder="573160476671"
          />
        </Campo>

        <Campo
          etiqueta="Cómo se muestra el número"
          htmlFor="whatsapp_visible"
          ayuda="Como lo lee el visitante: +57 316 047 6671."
        >
          <Entrada
            id="whatsapp_visible"
            name="whatsapp_visible"
            defaultValue={texto(valor, "whatsapp_visible")}
            maxLength={40}
          />
        </Campo>

        <Campo
          etiqueta="Mensaje que se escribe solo"
          htmlFor="mensaje_whatsapp"
          className="sm:col-span-2"
          ayuda="Aparece ya escrito cuando alguien toca el botón flotante de WhatsApp."
        >
          <AreaTexto
            id="mensaje_whatsapp"
            name="mensaje_whatsapp"
            defaultValue={texto(valor, "mensaje_whatsapp")}
            maxLength={500}
            rows={2}
          />
        </Campo>

        <Divisor titulo="Dónde estamos" />

        <Campo etiqueta="Dirección" htmlFor="direccion">
          <Entrada
            id="direccion"
            name="direccion"
            defaultValue={texto(valor, "direccion")}
            maxLength={200}
          />
        </Campo>

        <Campo
          etiqueta="Dirección completa en una línea"
          htmlFor="direccion_completa"
          ayuda="Es la que sale en el pie de página y la que lee Google."
        >
          <Entrada
            id="direccion_completa"
            name="direccion_completa"
            defaultValue={texto(valor, "direccion_completa")}
            maxLength={300}
          />
        </Campo>

        <Campo etiqueta="Ciudad" htmlFor="ciudad">
          <Entrada
            id="ciudad"
            name="ciudad"
            defaultValue={texto(valor, "ciudad")}
            maxLength={100}
          />
        </Campo>

        <Campo etiqueta="Departamento" htmlFor="region">
          <Entrada
            id="region"
            name="region"
            defaultValue={texto(valor, "region")}
            maxLength={100}
          />
        </Campo>

        <Campo etiqueta="País" htmlFor="pais">
          <Entrada
            id="pais"
            name="pais"
            defaultValue={texto(valor, "pais")}
            maxLength={100}
          />
        </Campo>

        <Campo
          etiqueta="Horario del restaurante"
          htmlFor="horario_restaurante"
        >
          <Entrada
            id="horario_restaurante"
            name="horario_restaurante"
            defaultValue={texto(valor, "horario_restaurante")}
            maxLength={200}
          />
        </Campo>

        <Campo
          etiqueta="Correo"
          htmlFor="correo"
          ayuda="Si lo dejas vacío, el correo no se muestra en ninguna parte del sitio."
        >
          <Entrada
            id="correo"
            name="correo"
            type="email"
            defaultValue={texto(valor, "correo")}
            maxLength={200}
          />
        </Campo>

        <Campo
          etiqueta="RNT"
          htmlFor="rnt"
          obligatorio
          ayuda="Registro Nacional de Turismo. Publicarlo en el pie es una obligación legal: no puede quedar vacío."
        >
          <Entrada
            id="rnt"
            name="rnt"
            defaultValue={texto(valor, "rnt")}
            required
            maxLength={40}
          />
        </Campo>

        <Divisor titulo="Mapa" />

        <Campo
          etiqueta="Enlace a la ficha en Google Maps"
          htmlFor="mapa_url"
          className="sm:col-span-2"
          ayuda="Abre la ficha del hotel en Google Maps, con su pin."
        >
          <Entrada
            id="mapa_url"
            name="mapa_url"
            defaultValue={texto(valor, "mapa_url")}
            maxLength={800}
          />
        </Campo>

        <Campo
          etiqueta="Enlace del botón «Cómo llegar»"
          htmlFor="mapa_como_llegar"
          className="sm:col-span-2"
          ayuda="Indicaciones desde Cali hasta el hotel. Si se deja vacío, el botón abre la ficha del mapa."
        >
          <Entrada
            id="mapa_como_llegar"
            name="mapa_como_llegar"
            defaultValue={texto(valor, "mapa_como_llegar")}
            maxLength={800}
          />
        </Campo>

        <Campo
          etiqueta="Mapa incrustado"
          htmlFor="mapa_embed"
          className="sm:col-span-2"
          ayuda="Tiene que ser una dirección de Google Maps que termine en output=embed. No necesita ninguna clave."
        >
          <Entrada
            id="mapa_embed"
            name="mapa_embed"
            defaultValue={texto(valor, "mapa_embed")}
            maxLength={800}
          />
        </Campo>

        <Divisor titulo="Redes sociales" />

        <p className="text-[0.8125rem] leading-relaxed text-crema-700 sm:col-span-2">
          Una red que dejes vacía simplemente desaparece del pie y de la página
          de contacto; no queda un icono roto.
        </p>

        <Campo etiqueta="Instagram — enlace" htmlFor="instagram">
          <Entrada
            id="instagram"
            name="instagram"
            defaultValue={texto(valor, "instagram")}
            maxLength={300}
          />
        </Campo>

        <Campo etiqueta="Instagram — usuario" htmlFor="instagram_usuario">
          <Entrada
            id="instagram_usuario"
            name="instagram_usuario"
            defaultValue={texto(valor, "instagram_usuario")}
            maxLength={100}
            placeholder="@lafinca_cali"
          />
        </Campo>

        <Campo
          etiqueta="Facebook — enlace"
          htmlFor="facebook"
          className="sm:col-span-2"
        >
          <Entrada
            id="facebook"
            name="facebook"
            defaultValue={texto(valor, "facebook")}
            maxLength={300}
          />
        </Campo>

        <Campo etiqueta="TikTok — enlace" htmlFor="tiktok">
          <Entrada
            id="tiktok"
            name="tiktok"
            defaultValue={texto(valor, "tiktok")}
            maxLength={300}
          />
        </Campo>

        <Campo etiqueta="TikTok — usuario" htmlFor="tiktok_usuario">
          <Entrada
            id="tiktok_usuario"
            name="tiktok_usuario"
            defaultValue={texto(valor, "tiktok_usuario")}
            maxLength={100}
            placeholder="@lafincacali"
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}

/* ---------------------------------------------------------------------------
 * Google y redes sociales
 * ------------------------------------------------------------------------- */

export function FormularioSeo({ valor }: { valor: Valor }) {
  const imagen = objeto(valor, "imagen");

  return (
    <FormularioAccion accion={guardarSeoAction} etiquetaEnviar="Guardar">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          etiqueta="Título en Google"
          htmlFor="seo_titulo"
          obligatorio
          className="sm:col-span-2"
          ayuda="Es el titular azul que aparece en los resultados. Debe incluir el nombre del hotel."
        >
          <Entrada
            id="seo_titulo"
            name="titulo"
            defaultValue={texto(valor, "titulo")}
            required
            maxLength={200}
          />
        </Campo>

        <Campo
          etiqueta="Descripción en Google"
          htmlFor="seo_descripcion"
          className="sm:col-span-2"
          ayuda="El texto gris debajo del título. Unos 155 caracteres es lo que cabe sin que se corte."
        >
          <AreaTexto
            id="seo_descripcion"
            name="descripcion"
            defaultValue={texto(valor, "descripcion")}
            maxLength={400}
            rows={3}
          />
        </Campo>

        <Campo
          etiqueta="Palabras clave"
          className="sm:col-span-2"
          ayuda="Cómo busca la gente el hotel. Escribe una y presiona Enter."
        >
          <Chips
            name="palabras_clave"
            inicial={textos(valor, "palabras_clave")}
            marcador="ecohotel cerca de Cali"
          />
        </Campo>

        <Divisor titulo="Imagen al compartir el enlace" />

        <p className="text-[0.8125rem] leading-relaxed text-crema-700 sm:col-span-2">
          Es la foto que se ve cuando alguien pega el enlace del sitio en
          WhatsApp o en Facebook. Lo ideal es un recorte propio de 1200 × 630
          píxeles.
        </p>

        <Campo etiqueta="Imagen">
          <CampoImagen
            name="imagen_url"
            urlInicial={texto(imagen, "url")}
            proporcion="apaisada"
          />
        </Campo>

        <Campo etiqueta="Descripción de la imagen" htmlFor="seo_alt">
          <Entrada
            id="seo_alt"
            name="imagen_alt"
            defaultValue={texto(imagen, "alt")}
            maxLength={300}
          />
        </Campo>

        <Campo
          etiqueta="Ancho de la imagen"
          htmlFor="seo_ancho"
          ayuda="En píxeles. Debe coincidir con el archivo real."
        >
          <Entrada
            id="seo_ancho"
            name="imagen_ancho"
            type="number"
            min={1}
            max={5000}
            defaultValue={numero(imagen, "ancho", 1200)}
          />
        </Campo>

        <Campo etiqueta="Alto de la imagen" htmlFor="seo_alto">
          <Entrada
            id="seo_alto"
            name="imagen_alto"
            type="number"
            min={1}
            max={5000}
            defaultValue={numero(imagen, "alto", 630)}
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}
