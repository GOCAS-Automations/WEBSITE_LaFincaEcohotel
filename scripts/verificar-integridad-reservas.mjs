/**
 * Pruebas de INTEGRIDAD DE RESERVAS contra la base de datos REAL.
 *
 *   npm run db:probar-integridad
 *   npm run db:probar-integridad -- --ensayar supabase/migrations/019_….sql [otra.sql …]
 *   npm run db:probar-integridad -- --concurrencia
 *
 * Comprueba lo que vive en Postgres y Vitest no puede ver (migraciones 019 en
 * adelante): el código de reserva atómico, el candado del cupo del Día de
 * Calma, las personas obligatorias de una reserva de día, que una reserva
 * pagada no se puede borrar, el guardado atómico de reserva y experiencias, y
 * la exclusión de bloqueos y completadas.
 *
 * ---------------------------------------------------------------------------
 * LA BASE QUEDA COMO ESTABA
 * ---------------------------------------------------------------------------
 * Todo lo de la primera parte ocurre dentro de UNA transacción que termina en
 * ROLLBACK, pase lo que pase. `--ensayar` aplica antes, dentro de esa misma
 * transacción, las migraciones que se le pasen: así se ensaya una migración
 * contra la base real sin que quede nada.
 *
 * `--concurrencia` añade las pruebas que necesitan DOS conexiones de verdad
 * (dos reservas simultáneas). Esas sí confirman filas —sin `commit` la otra
 * conexión no las vería—, así que usan fechas de 2031, códigos `PRUEBA-…` que
 * no tocan el contador, y las borran al terminar.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config as cargarEnv } from "dotenv";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
cargarEnv({ path: join(RAIZ, ".env.local"), quiet: true });

const urlBaseDatos = process.env.SUPABASE_DB_URL;
if (!urlBaseDatos) {
  console.error("Falta SUPABASE_DB_URL en .env.local.");
  process.exit(1);
}

const argumentos = process.argv.slice(2);
const ensayar = [];
for (let i = 0; i < argumentos.length; i += 1) {
  if (argumentos[i] === "--ensayar") {
    while (argumentos[i + 1] && !argumentos[i + 1].startsWith("--")) {
      ensayar.push(argumentos[i + 1]);
      i += 1;
    }
  }
}
const conConcurrencia = argumentos.includes("--concurrencia");

let pasadas = 0;
const fallos = [];

function comprobar(titulo, condicion, detalle = "") {
  if (condicion) {
    pasadas += 1;
    console.log(`  ✓ ${titulo}`);
  } else {
    fallos.push(titulo);
    console.log(`  ✗ ${titulo}${detalle ? ` — ${detalle}` : ""}`);
  }
}

/** Ejecuta algo que debe fallar y devuelve el error de Postgres (o `null`). */
async function esperarError(cliente, fn) {
  await cliente.query("savepoint intento");
  try {
    await fn();
    await cliente.query("release savepoint intento");
    return null;
  } catch (error) {
    await cliente.query("rollback to savepoint intento");
    return error;
  }
}

function nuevoCliente() {
  return new pg.Client({
    connectionString: urlBaseDatos,
    ssl: { rejectUnauthorized: false },
  });
}

async function existe(cliente, consulta) {
  const { rows } = await cliente.query(consulta);
  return rows.length > 0;
}

/**
 * Corre `fn` como una cuenta del panel con rol `equipo` (rol `authenticated`
 * y el JWT que pone Supabase Auth), sin iniciar sesión con nadie: así se prueba
 * lo que de verdad puede hacer el panel con sus políticas RLS.
 */
async function comoEquipo(cliente, fn) {
  return comoCuenta(cliente, "equipo", fn);
}

/** Igual, con el rol que se diga; `null` = una cuenta con sesión y SIN rol. */
async function comoCuenta(cliente, rol, fn) {
  await cliente.query("savepoint como_equipo");
  try {
    await cliente.query("set local role authenticated");
    await cliente.query(
      "select set_config('request.jwt.claims', $1, true)",
      [JSON.stringify({ role: "authenticated", sub: "00000000-0000-0000-0000-000000000000", app_metadata: rol ? { rol } : {} })],
    );
    const resultado = await fn();
    await cliente.query("reset role");
    await cliente.query("release savepoint como_equipo");
    return resultado;
  } catch (error) {
    await cliente.query("rollback to savepoint como_equipo");
    await cliente.query("reset role");
    throw error;
  }
}

/** Lo mínimo para insertar una reserva válida. */
function fila(datos) {
  return {
    tipo: "hospedaje",
    huesped_nombre: "Prueba de integridad",
    huesped_email: "prueba@example.com",
    huesped_telefono: "+57 300 000 0000",
    subtotal_alojamiento: 100000,
    total: 100000,
    num_personas: 2,
    estado: "cancelada",
    origen: "manual",
    ...datos,
  };
}

async function insertarReserva(cliente, datos) {
  const columnas = Object.keys(datos);
  const valores = Object.values(datos);
  const { rows } = await cliente.query(
    `insert into reservas (${columnas.join(", ")})
     values (${columnas.map((_, i) => `$${i + 1}`).join(", ")})
     returning id, codigo`,
    valores,
  );
  return rows[0];
}

/* ===========================================================================
 * Las comprobaciones, por migración
 * ======================================================================== */

async function codigoAtomico(cliente, ctx) {
  console.log("\n019 · El código de reserva sale de un contador, no de contar filas");
  if (!(await existe(cliente, "select 1 from pg_proc where proname = 'siguiente_codigo_reserva'"))) {
    console.log("  (sin aplicar: se salta)");
    return;
  }

  const anio = Number(
    (await cliente.query("select extract(year from now() at time zone 'America/Bogota')::int as a")).rows[0].a,
  );
  const patron = new RegExp(`^LF-${anio}-\\d{4,}$`);
  const numero = (codigo) => Number(codigo.split("-")[2]);

  const a = await insertarReserva(cliente, fila({ alojamiento_id: ctx.cabana, estancia: "[2031-01-05,2031-01-06)" }));
  comprobar("una reserva sin código recibe uno con el formato LF-AAAA-NNNN", patron.test(a.codigo), a.codigo);

  const b = await insertarReserva(cliente, fila({ alojamiento_id: ctx.cabana, estancia: "[2031-01-06,2031-01-07)" }));
  const c = await insertarReserva(cliente, fila({ alojamiento_id: ctx.cabana, estancia: "[2031-01-07,2031-01-08)" }));
  comprobar(
    "los números siguen en orden",
    numero(b.codigo) === numero(a.codigo) + 1 && numero(c.codigo) === numero(b.codigo) + 1,
    `${a.codigo}, ${b.codigo}, ${c.codigo}`,
  );

  /* El fallo de antes: borrar hacía bajar el conteo y el siguiente se repetía. */
  await cliente.query("delete from reservas where id = any($1)", [[b.id, c.id]]);
  const d = await insertarReserva(cliente, fila({ alojamiento_id: ctx.cabana, estancia: "[2031-01-08,2031-01-09)" }));
  comprobar(
    "tras borrar reservas, el siguiente código no repite ninguno y es mayor",
    numero(d.codigo) > numero(c.codigo),
    `borradas ${b.codigo} y ${c.codigo}, sale ${d.codigo}`,
  );

  /* Un código escrito por otro camino (el código desplegado hoy) sube el contador. */
  const alto = `LF-${anio}-${String(numero(d.codigo) + 50).padStart(4, "0")}`;
  await insertarReserva(cliente, fila({ codigo: alto, alojamiento_id: ctx.cabana, estancia: "[2031-01-09,2031-01-10)" }));
  const e = await insertarReserva(cliente, fila({ alojamiento_id: ctx.cabana, estancia: "[2031-01-10,2031-01-11)" }));
  comprobar(
    "un código puesto a mano más alto empuja el contador: el siguiente es mayor",
    numero(e.codigo) === numero(alto) + 1,
    `${alto} → ${e.codigo}`,
  );

  const delPanel = await comoEquipo(cliente, () =>
    insertarReserva(cliente, fila({ alojamiento_id: ctx.cabana, estancia: "[2031-01-11,2031-01-12)" })),
  );
  comprobar(
    "una cuenta del panel (rol equipo) también recibe el código de la base",
    numero(delPanel.codigo) === numero(e.codigo) + 1,
    delPanel.codigo,
  );

  const { rows: permiso } = await cliente.query(
    `select has_function_privilege('anon', 'siguiente_codigo_reserva()', 'execute') as anon,
            has_function_privilege('authenticated', 'siguiente_codigo_reserva()', 'execute') as autenticado`,
  );
  comprobar("el rol anónimo no puede pedir códigos", permiso[0].anon === false);

  /* Migración 022: ni una cuenta con sesión puede pedir códigos sueltos. */
  const migracion022 = permiso[0].autenticado === false;
  if (!migracion022) {
    console.log("  (022 sin aplicar: una cuenta con sesión todavía puede pedir códigos)");
    return;
  }
  const sinRol = await esperarError(cliente, () =>
    comoCuenta(cliente, null, () => cliente.query("select siguiente_codigo_reserva()")),
  );
  comprobar(
    "una cuenta con sesión y sin rol no puede pedir códigos (gastaría números)",
    sinRol?.code === "42501",
    sinRol ? sinRol.code : "pudo",
  );
  const delEquipo = await esperarError(cliente, () =>
    comoEquipo(cliente, () => cliente.query("select siguiente_codigo_reserva()")),
  );
  comprobar(
    "tampoco el panel la llama suelta: el código lo pone el trigger",
    delEquipo?.code === "42501",
    delEquipo ? delEquipo.code : "pudo",
  );
  const { rows: antes } = await cliente.query("select ultimo from reservas_contador where anio = $1", [anio]);
  const insertSinRol = await esperarError(cliente, () =>
    comoCuenta(cliente, null, () =>
      insertarReserva(cliente, fila({ alojamiento_id: ctx.cabana, estancia: "[2031-01-12,2031-01-13)" })),
    ),
  );
  const { rows: despues } = await cliente.query("select ultimo from reservas_contador where anio = $1", [anio]);
  comprobar(
    "una cuenta sin rol no puede insertar reservas, y el intento no gasta número",
    insertSinRol !== null && antes[0]?.ultimo === despues[0]?.ultimo,
    insertSinRol ? `${antes[0]?.ultimo} → ${despues[0]?.ultimo}` : "pudo insertar",
  );
}


async function diaDeCalma(cliente, ctx) {
  console.log("\n020 · Una reserva de Día de Calma dice cuántas personas son (1 o 2)");
  const { rows } = await cliente.query(
    "select pg_get_constraintdef(oid) as def from pg_constraint where conname = 'reservas_dia_maximo_dos_personas'",
  );
  if (!rows[0] || !rows[0].def.includes("IS NOT NULL")) {
    console.log("  (sin aplicar: se salta)");
    return;
  }
  const dia = (personas, fecha = "2031-05-10") =>
    fila({ tipo: "dia", plan_id: ctx.planDia, estancia: `[${fecha},${fecha.slice(0, 8)}${String(Number(fecha.slice(8)) + 1).padStart(2, "0")})`, num_personas: personas, estado: "confirmada" });

  const sinPersonas = await esperarError(cliente, () => insertarReserva(cliente, dia(null)));
  comprobar(
    "sin número de personas se rechaza (antes un NULL saltaba el cupo)",
    sinPersonas?.code === "23514",
    sinPersonas ? `${sinPersonas.code}: ${sinPersonas.message}` : "se aceptó",
  );
  comprobar(
    "y el mensaje está en español",
    /cuántas personas/.test(sinPersonas?.message ?? ""),
    sinPersonas?.message,
  );
  const tres = await esperarError(cliente, () => insertarReserva(cliente, dia(3)));
  comprobar("tres personas se rechazan", tres?.code === "23514", tres?.code ?? "se aceptó");
  const cero = await esperarError(cliente, () => insertarReserva(cliente, dia(0)));
  comprobar("cero personas se rechazan", cero?.code === "23514", cero?.code ?? "se aceptó");

  /* El cupo de siempre sigue: 5 reservas de 2 llenan el día; la sexta no entra. */
  for (let i = 0; i < 5; i += 1) await insertarReserva(cliente, dia(2, "2031-05-11"));
  const sexta = await esperarError(cliente, () => insertarReserva(cliente, dia(1, "2031-05-11")));
  comprobar("con el día lleno (10), una más se rechaza con LF010", sexta?.code === "LF010", sexta?.code ?? "se aceptó");

  const hospedaje = await esperarError(cliente, () =>
    insertarReserva(cliente, fila({ alojamiento_id: ctx.cabana, estancia: "[2031-05-12,2031-05-13)", num_personas: null })),
  );
  comprobar(
    "las reservas de hospedaje no cambian (la regla es solo del Día de Calma)",
    hospedaje === null,
    hospedaje?.message,
  );
}

async function concurrenciaDia(ctx) {
  console.log("\n020 · Dos reservas de Día de Calma a la vez no pasan del cupo");
  const [uno, dos, limpieza] = [nuevoCliente(), nuevoCliente(), nuevoCliente()];
  await Promise.all([uno.connect(), dos.connect(), limpieza.connect()]);
  const FECHA = "[2031-06-14,2031-06-15)";
  const prefijo = "PRUEBA-DIA-";
  const dia = (n, personas) =>
    fila({ codigo: `${prefijo}${n}-${Date.now()}`, tipo: "dia", plan_id: ctx.planDia, estancia: FECHA, num_personas: personas, estado: "confirmada" });
  try {
    /* 8 personas ya apuntadas (confirmado, para que las dos conexiones lo vean). */
    for (let i = 0; i < 4; i += 1) await insertarReserva(limpieza, dia(`base${i}`, 2));

    await uno.query("begin");
    await dos.query("begin");
    await insertarReserva(uno, dia("a", 2)); // 8 + 2 = 10: cabe
    let segundaTermino = false;
    const segunda = insertarReserva(dos, dia("b", 2)).then(
      () => { segundaTermino = true; return null; },
      (error) => { segundaTermino = true; return error; },
    );
    await new Promise((listo) => setTimeout(listo, 500));
    comprobar("la segunda espera a que la primera termine (candado del día)", segundaTermino === false);
    await uno.query("commit");
    const error = await segunda;
    await dos.query(error ? "rollback" : "commit");
    comprobar(
      "la segunda se rechaza con LF010: el día no pasa de 10",
      error?.code === "LF010",
      error ? error.code : "ENTRARON LAS DOS (12 personas)",
    );
    const { rows } = await limpieza.query(
      "select coalesce(sum(num_personas), 0)::int as n from reservas where codigo like $1",
      [`${prefijo}%`],
    );
    comprobar("quedan exactamente 10 personas ese día", rows[0].n === 10, `hay ${rows[0].n}`);
  } finally {
    await uno.query("rollback").catch(() => {});
    await dos.query("rollback").catch(() => {});
    await limpieza.query("delete from reservas where codigo like $1", [`${prefijo}%`]);
    await Promise.all([uno.end(), dos.end(), limpieza.end()]);
  }
}


async function reservaPagada(cliente, ctx) {
  console.log("\n021 · Una reserva con un pago aprobado no se puede borrar");
  if (!(await existe(cliente, "select 1 from pg_trigger where tgname = 'reservas_no_borrar_pagadas'"))) {
    console.log("  (sin aplicar: se salta)");
    return;
  }
  const pagada = await insertarReserva(cliente, fila({ alojamiento_id: ctx.cabana, estancia: "[2031-07-01,2031-07-03)", estado: "confirmada" }));
  await cliente.query(
    "insert into pagos (reserva_id, referencia, monto, estado) values ($1, $2, 50000, 'APPROVED')",
    [pagada.id, `PRUEBA-PAGO-${Date.now()}`],
  );
  const error = await esperarError(cliente, () => cliente.query("delete from reservas where id = $1", [pagada.id]));
  comprobar("borrarla falla con LF020", error?.code === "LF020", error ? error.code : "se borró");
  comprobar("y el mensaje está en español", /pago aprobado/.test(error?.message ?? ""), error?.message);
  const { rows: siguen } = await cliente.query("select count(*)::int as n from pagos where reserva_id = $1", [pagada.id]);
  comprobar("el pago sigue ahí", siguen[0].n === 1);

  const sinDinero = await insertarReserva(cliente, fila({ alojamiento_id: ctx.cabana, estancia: "[2031-07-05,2031-07-06)" }));
  await cliente.query(
    "insert into pagos (reserva_id, referencia, monto, estado) values ($1, $2, 50000, 'DECLINED')",
    [sinDinero.id, `PRUEBA-PAGO-R-${Date.now()}`],
  );
  const sinError = await esperarError(cliente, () => cliente.query("delete from reservas where id = $1", [sinDinero.id]));
  const { rows: rechazados } = await cliente.query("select count(*)::int as n from pagos where reserva_id = $1", [sinDinero.id]);
  comprobar(
    "una reserva con solo un intento rechazado sí se borra (y el intento se va con ella)",
    sinError === null && rechazados[0].n === 0,
    sinError?.message,
  );
}

/* ===========================================================================
 * Concurrencia: dos conexiones de verdad
 * ======================================================================== */

async function concurrenciaCodigos(ctx) {
  console.log("\n019 · Dos reservas a la vez no reciben el mismo código");
  const [uno, dos, limpieza] = [nuevoCliente(), nuevoCliente(), nuevoCliente()];
  await Promise.all([uno.connect(), dos.connect(), limpieza.connect()]);
  const anio = Number(
    (await limpieza.query("select extract(year from now() at time zone 'America/Bogota')::int as a")).rows[0].a,
  );
  const antes = (await limpieza.query("select ultimo from reservas_contador where anio = $1", [anio])).rows[0];
  const creadas = [];
  try {
    await uno.query("begin");
    await dos.query("begin");
    const r1 = await insertarReserva(uno, fila({ alojamiento_id: ctx.cabana, estancia: "[2031-02-01,2031-02-02)" }));
    /* La segunda espera el candado de la fila del contador hasta que la primera termine. */
    const pendiente = insertarReserva(dos, fila({ alojamiento_id: ctx.cabana, estancia: "[2031-02-02,2031-02-03)" }));
    await new Promise((listo) => setTimeout(listo, 300));
    await uno.query("commit");
    const r2 = await pendiente;
    await dos.query("commit");
    creadas.push(r1.id, r2.id);
    comprobar("las dos reservas simultáneas tienen códigos distintos", r1.codigo !== r2.codigo, `${r1.codigo} / ${r2.codigo}`);
  } finally {
    await uno.query("rollback").catch(() => {});
    await dos.query("rollback").catch(() => {});
    if (creadas.length) await limpieza.query("delete from reservas where id = any($1)", [creadas]);
    /* El contador vuelve a donde estaba (o al código más alto que exista, si
       entretanto alguien creó una reserva de verdad). */
    const { rows: maximo } = await limpieza.query(
      `select coalesce(max((regexp_match(codigo, '^LF-\\d{4}-(\\d+)$'))[1]::int), 0) as n
         from reservas where codigo like $1`,
      [`LF-${anio}-%`],
    );
    if (antes) {
      await limpieza.query("update reservas_contador set ultimo = greatest($2::int, $3::int) where anio = $1", [
        anio,
        antes.ultimo,
        maximo[0].n,
      ]);
    } else if (maximo[0].n === 0) {
      await limpieza.query("delete from reservas_contador where anio = $1", [anio]);
    } else {
      await limpieza.query("update reservas_contador set ultimo = $2 where anio = $1", [anio, maximo[0].n]);
    }
    await Promise.all([uno.end(), dos.end(), limpieza.end()]);
  }
}

/* ===========================================================================
 * Principal
 * ======================================================================== */

async function principal() {
  const cliente = nuevoCliente();
  await cliente.connect();

  const { rows: cabanas } = await cliente.query(
    "select id from alojamientos order by orden nulls last, nombre limit 2",
  );
  const { rows: planes } = await cliente.query(
    "select id, tipo from planes order by orden nulls last, nombre",
  );
  const ctx = {
    cabana: cabanas[0]?.id,
    otraCabana: cabanas[1]?.id,
    planHospedaje: planes.find((plan) => plan.tipo !== "dia")?.id,
    planDia: planes.find((plan) => plan.tipo === "dia")?.id,
  };

  await cliente.query("begin");
  try {
    for (const archivo of ensayar) {
      const ruta = resolve(RAIZ, archivo);
      process.stdout.write(`\nEnsayando ${archivo} … `);
      await cliente.query(readFileSync(ruta, "utf8"));
      console.log("se aplica sin errores (se deshará al terminar)");
    }

    await codigoAtomico(cliente, ctx);
    await diaDeCalma(cliente, ctx);
    await reservaPagada(cliente, ctx);
  } finally {
    await cliente.query("rollback");
    await cliente.end();
  }

  if (conConcurrencia) {
    await concurrenciaCodigos(ctx);
    await concurrenciaDia(ctx);
  }

  console.log(
    `\n${fallos.length === 0 ? "✓" : "✗"} ${pasadas} comprobaciones pasadas, ${fallos.length} fallidas. La base quedó como estaba.`,
  );
  if (fallos.length > 0) process.exit(1);
}

principal().catch((error) => {
  console.error("\nError inesperado:", error.message);
  process.exit(1);
});
