"use client";

import { guardarLegalAction } from "./acciones";
import { seccionesLegales, texto } from "./lectura";
import { EditorLista } from "@/components/admin/editor-lista";
import { FormularioAccion } from "@/components/admin/formulario-accion";
import { AreaTexto, Campo, Entrada } from "@/components/admin/ui";
import type { ClaveLegal } from "@/lib/legal";

type Valor = Record<string, unknown>;

/**
 * Editor de un documento legal.
 *
 * ---------------------------------------------------------------------------
 * UNA SECCIÓN, UNA CAJA DE TEXTO
 * ---------------------------------------------------------------------------
 * Un documento legal es una lista de secciones numeradas, y cada sección es
 * texto corrido. Por eso se edita con `EditorLista` —añadir, quitar, subir,
 * bajar— y cada sección lleva su título y UNA caja con todos sus párrafos,
 * separados por una línea en blanco. Es como se escribe un documento de verdad;
 * un editor de bloques con «párrafo» y «lista» habría sido más fiel al modelo y
 * mucho peor de usar.
 *
 * Las viñetas se escriben empezando cada línea por «- », dentro del mismo
 * párrafo. La convención está explicada en la propia pantalla y en
 * `src/lib/legal.ts`.
 */
export function FormularioLegal({
  clave,
  valor,
}: {
  clave: ClaveLegal;
  valor: Valor;
}) {
  const secciones = seccionesLegales(valor);

  return (
    <FormularioAccion
      accion={guardarLegalAction}
      etiquetaEnviar="Guardar documento"
    >
      <input type="hidden" name="clave_legal" value={clave} />

      <div className="grid gap-5">
        <div className="rounded-tarjeta bg-dorado-500/[0.09] px-4 py-3 text-[0.8125rem] leading-relaxed text-dorado-800 ring-1 ring-dorado-500/20">
          Este es un documento con efectos legales: lo lee quien reclama una
          cancelación y lo revisa la pasarela de pagos. Cambia solo lo que estés
          seguro de querer cambiar, y sube la fecha de actualización cada vez.
          <br />
          Ojo: el número de WhatsApp y la dirección que aparecen dentro del texto
          son texto normal. Si el hotel los cambia, hay que corregirlos también
          aquí, documento por documento.
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Título del documento"
            htmlFor={`${clave}_titulo`}
            obligatorio
          >
            <Entrada
              id={`${clave}_titulo`}
              name="titulo"
              defaultValue={texto(valor, "titulo")}
              maxLength={200}
              required
            />
          </Campo>

          <Campo
            etiqueta="Fecha de actualización"
            htmlFor={`${clave}_actualizado`}
            obligatorio
            ayuda="Es la fecha que se publica bajo el título, en «Última actualización»."
          >
            <Entrada
              id={`${clave}_actualizado`}
              name="actualizado"
              type="date"
              defaultValue={texto(valor, "actualizado")}
              required
            />
          </Campo>
        </div>

        <Campo
          etiqueta="Frase de entrada"
          htmlFor={`${clave}_entrada`}
          ayuda="La frase que resume el documento, debajo del título."
        >
          <AreaTexto
            id={`${clave}_entrada`}
            name="entrada"
            defaultValue={texto(valor, "entrada")}
            maxLength={600}
            rows={2}
          />
        </Campo>

        <Campo
          etiqueta="Descripción para Google"
          htmlFor={`${clave}_descripcion`}
          ayuda="No se ve en la página: es el resumen que aparece en los resultados de búsqueda."
        >
          <AreaTexto
            id={`${clave}_descripcion`}
            name="descripcion"
            defaultValue={texto(valor, "descripcion")}
            maxLength={400}
            rows={2}
          />
        </Campo>

        <Campo
          etiqueta="Secciones del documento"
          ayuda="Separa los párrafos con una línea en blanco. Para una lista de viñetas, escribe cada punto en su propia línea empezando por «- », todo dentro del mismo párrafo."
        >
          <EditorLista
            name="secciones"
            inicial={secciones}
            etiquetaElemento="sección"
            maximo={40}
            vacio="Este documento no tiene secciones."
            campos={[
              {
                clave: "titulo",
                etiqueta: "Título de la sección",
                tipo: "texto",
                marcador: "1. Quiénes somos",
              },
              {
                clave: "parrafos",
                etiqueta: "Texto de la sección",
                tipo: "parrafo",
                /* Diez líneas: una sección legal no cabe en tres, y con la caja
                   pequeña se edita a ciegas. */
                filas: 10,
              },
            ]}
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}
