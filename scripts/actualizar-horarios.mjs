#!/usr/bin/env node
/**
 * Lleva a la base real los horarios nuevos de la estadía, SIN pisar lo que el
 * hotel haya escrito desde el panel.
 *
 * ---------------------------------------------------------------------------
 * EL CAMBIO (confirmado por el hotel el 2026-10-05, todo el año, todos los
 * planes de hospedaje)
 * ---------------------------------------------------------------------------
 *   · Check-in (entrega de la cabaña): 3:00 p. m. — sin cambios.
 *   · Hora límite de llegada: 7:00 p. m. — nueva.
 *   · Check-out: 12:00 m. — antes, 1:00 p. m.
 *   · Desde la 1:00 p. m. se usan restaurante, senderos y zonas sociales, y el
 *     Día de Calma (10:00 a. m. – 5:00 p. m.): sin cambios.
 *
 * El código (`SITIO.estadia`, el correo, el respaldo de la FAQ y de los
 * legales) y el seed ya están al día; este script toca lo que vive en la BASE:
 *
 *   · `faq`: la respuesta de «¿A qué hora puedo llegar y a qué hora debo
 *     salir?». Se añade la hora límite de llegada.
 *   · `legal.terminos`: el párrafo de «5. Llegada, salida y estadía». Los
 *     legales están aprobados por el cliente: se cambia SOLO la hora de salida
 *     («13:00» → «12:00 m.»), ni una palabra más.
 *
 * Para cada texto: si es EXACTAMENTE el anterior, se reemplaza; si ya es el
 * nuevo, no hace nada (por eso se puede correr dos veces); si es otra cosa,
 * alguien lo editó desde el panel y NO se toca: se lista para revisarlo a mano.
 *
 * USO
 * ---
 *   node scripts/actualizar-horarios.mjs             # solo mira (dry-run)
 *   node scripts/actualizar-horarios.mjs --ejecutar  # escribe
 */
import process from "node:process";

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const ejecutar = process.argv.includes("--ejecutar");

const FAQ_PREGUNTA = "¿A qué hora puedo llegar y a qué hora debo salir?";
const FAQ_ANTERIOR =
  "Desde la 1:00 p. m. puedes usar el restaurante, los senderos, los decks y las zonas sociales. La cabaña se entrega a las 3:00 p. m. El check-out es a la 1:00 p. m.";
const FAQ_NUEVA =
  "Desde la 1:00 p. m. puedes usar el restaurante, los senderos, los decks y las zonas sociales. La cabaña se entrega a las 3:00 p. m. y puedes llegar hasta las 7:00 p. m. El check-out es a las 12:00 m.";

/* Las dos versiones previas del párrafo: la original (salida a las 13:00) y la
   de la primera pasada del 2026-10-05 (salida a las 12:00 m., sin la llegada). */
const LEGAL_ANTERIORES = [
  "Desde las 13:00 puedes usar el restaurante, los senderos, los decks y las zonas sociales. La cabaña se entrega a las 15:00 y la salida es hasta las 13:00. Los cambios de horario dependen de la disponibilidad y deben acordarse previamente.",
  "Desde las 13:00 puedes usar el restaurante, los senderos, los decks y las zonas sociales. La cabaña se entrega a las 15:00 y la salida es hasta las 12:00 m. Los cambios de horario dependen de la disponibilidad y deben acordarse previamente.",
];
const LEGAL_NUEVO =
  "Desde las 13:00 puedes usar el restaurante, los senderos, los decks y las zonas sociales. La cabaña se entrega a las 15:00, se puede llegar hasta las 19:00 y la salida es hasta las 12:00 m. Los cambios de horario dependen de la disponibilidad y deben acordarse previamente.";
/** «Última actualización» de los términos (igual que TERMINOS_ACTUALIZADO en src/lib/sitio.ts). */
const TERMINOS_FECHA = "2026-10-05";

/* ===========================================================================
 * Utilidades
 * ======================================================================== */

function exigir(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`Falta ${nombre} en .env.local`);
    process.exit(1);
  }
  return valor;
}

const supabase = createClient(
  exigir("NEXT_PUBLIC_SUPABASE_URL"),
  exigir("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } },
);

async function leer(clave) {
  const { data, error } = await supabase
    .from("contenido")
    .select("valor")
    .eq("clave", clave)
    .maybeSingle();
  if (error) {
    console.error(`No pude leer «${clave}»: ${error.message}`);
    process.exit(1);
  }
  return data?.valor ?? null;
}

async function escribir(clave, valor) {
  const { error } = await supabase.from("contenido").update({ valor }).eq("clave", clave);
  if (error) {
    console.error(`No pude guardar «${clave}»: ${error.message}`);
    process.exit(1);
  }
}

/** Resultado de cada texto, para el resumen del final. */
const resumen = [];

/* ===========================================================================
 * FAQ
 * ======================================================================== */

{
  const faq = await leer("faq");
  const items = Array.isArray(faq?.items) ? faq.items : null;
  if (!items) {
    resumen.push(["faq", "sin la lista de preguntas en la base: revísalo a mano"]);
  } else {
    const indice = items.findIndex((item) => String(item?.respuesta ?? "").trim() === FAQ_ANTERIOR);
    const yaNueva = items.some((item) => String(item?.respuesta ?? "").trim() === FAQ_NUEVA);
    if (yaNueva) {
      resumen.push(["faq", "ya está al día"]);
    } else if (indice >= 0) {
      if (ejecutar) {
        const nuevos = items.map((item, i) => (i === indice ? { ...item, respuesta: FAQ_NUEVA } : item));
        await escribir("faq", { ...faq, items: nuevos });
        resumen.push(["faq", "actualizada"]);
      } else {
        resumen.push(["faq", "se ACTUALIZARÍA"]);
      }
    } else {
      const editada = items.find((item) => String(item?.pregunta ?? "").trim() === FAQ_PREGUNTA);
      resumen.push([
        "faq",
        editada
          ? `NO se toca: el hotel la editó desde el panel. Texto actual: «${editada.respuesta}»`
          : "NO se toca: no encontré la pregunta de los horarios (¿la borraron o la renombraron?)",
      ]);
    }
  }
}

/* ===========================================================================
 * Términos y condiciones
 * ======================================================================== */

{
  const terminos = await leer("legal.terminos");
  const secciones = Array.isArray(terminos?.secciones) ? terminos.secciones : null;
  if (!secciones) {
    resumen.push(["legal.terminos", "sin secciones en la base: revísalo a mano"]);
  } else {
    let encontrado = null;
    let yaNuevo = false;
    secciones.forEach((seccion, s) => {
      (Array.isArray(seccion?.parrafos) ? seccion.parrafos : []).forEach((parrafo, p) => {
        const texto = String(parrafo ?? "").trim();
        if (LEGAL_ANTERIORES.includes(texto)) encontrado = [s, p];
        if (texto === LEGAL_NUEVO) yaNuevo = true;
      });
    });

    if (yaNuevo && terminos.actualizado === TERMINOS_FECHA) {
      resumen.push(["legal.terminos", "ya está al día"]);
    } else if (yaNuevo) {
      if (ejecutar) {
        await escribir("legal.terminos", { ...terminos, actualizado: TERMINOS_FECHA });
        resumen.push(["legal.terminos", `fecha de actualización puesta en ${TERMINOS_FECHA}`]);
      } else {
        resumen.push(["legal.terminos", `se pondría la fecha de actualización en ${TERMINOS_FECHA}`]);
      }
    } else if (encontrado) {
      if (ejecutar) {
        const [s, p] = encontrado;
        const nuevas = secciones.map((seccion, i) =>
          i === s
            ? { ...seccion, parrafos: seccion.parrafos.map((texto, j) => (j === p ? LEGAL_NUEVO : texto)) }
            : seccion,
        );
        await escribir("legal.terminos", { ...terminos, actualizado: TERMINOS_FECHA, secciones: nuevas });
        resumen.push(["legal.terminos", `actualizado (solo el párrafo de horarios y la fecha, ${TERMINOS_FECHA})`]);
      } else {
        resumen.push(["legal.terminos", `se ACTUALIZARÍA (solo el párrafo de horarios y la fecha, ${TERMINOS_FECHA})`]);
      }
    } else {
      const seccion = secciones.find((item) => /Llegada, salida/i.test(String(item?.titulo ?? "")));
      resumen.push([
        "legal.terminos",
        `NO se toca: el párrafo de llegada y salida no es el que esperaba (¿editado desde el panel?). Texto actual: «${seccion?.parrafos?.[0] ?? "no encontrado"}»`,
      ]);
    }
  }
}

/* ===========================================================================
 * Resumen
 * ======================================================================== */

console.log(
  ejecutar
    ? "Modo EJECUTAR: se escribió en la base real.\n"
    : "Modo de prueba: no se escribió nada (añade --ejecutar para escribir).\n",
);
for (const [clave, estado] of resumen) console.log(`  · ${clave}: ${estado}`);
console.log(
  "\nEl sitio público lo muestra al regenerarse (como mucho una hora) o en el próximo despliegue.",
);
