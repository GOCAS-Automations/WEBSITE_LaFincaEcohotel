/**
 * Pruebas del modelo de reservas contra la base de datos REAL.
 *
 *   npm run db:probar
 *
 * Comprueba lo que no se puede probar con Vitest porque vive en Postgres:
 * el cupo del Día de Calma, la forma de la estancia de un día, que las
 * reservas de día NO bloquean cabañas, y la unicidad de los extras por noche.
 *
 * TODO ocurre dentro de una transacción que termina en ROLLBACK: la base
 * queda exactamente como estaba, incluso si una comprobación falla. Por eso
 * se puede correr contra la base de trabajo sin ensuciarla.
 */

import { dirname, join } from "node:path";
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

/** Código SQLSTATE con el que el trigger anuncia que se pasó el cupo. */
const ERROR_CUPO = "LF010";

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

/** Ejecuta algo que debe fallar y devuelve el error de Postgres. */
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

async function principal() {
  const cliente = new pg.Client({
    connectionString: urlBaseDatos,
    ssl: { rejectUnauthorized: false },
    application_name: "lafinca-pruebas-dia",
  });

  await cliente.connect();
  console.log("Conectado. Todo lo que sigue va dentro de una transacción que se deshace.\n");

  await cliente.query("begin");

  try {
    /* Una fecha lejana y fija: no se cruza con nada real y, aunque se cruzara,
       la transacción se deshace igual. */
    const DIA = "2099-04-15";
    const { rows: cabanas } = await cliente.query(
      "select id, nombre from alojamientos order by orden limit 1",
    );
    const { rows: planes } = await cliente.query(
      "select id, nombre, tipo from planes order by tipo, orden",
    );
    const planDia = planes.find((p) => p.tipo === "dia");
    const planHospedaje = planes.find((p) => p.tipo === "hospedaje");
    const { rows: extras } = await cliente.query(
      "select id, nombre from extras order by orden limit 1",
    );

    if (!cabanas.length || !planDia || !planHospedaje || !extras.length) {
      throw new Error("Falta catálogo (cabañas, planes o extras) para probar.");
    }

    const cabana = cabanas[0];
    const extra = extras[0];

    /** Inserta una reserva de día y devuelve su id. */
    async function reservaDeDia(codigo, personas, dia = DIA, estado = "confirmada") {
      const { rows } = await cliente.query(
        `insert into reservas
           (codigo, tipo, alojamiento_id, plan_id, estancia, huesped_nombre,
            huesped_email, huesped_telefono, num_personas,
            subtotal_alojamiento, subtotal_extras, total, estado, origen)
         values ($1,'dia',null,$2,daterange($3::date, ($3::date + 1),'[)'),
                 $4,'prueba@lafinca.test','+57 300 000 0000',$5,
                 250000,0,250000,$6,'manual')
         returning id`,
        [codigo, planDia.id, dia, `Prueba ${codigo}`, personas, estado],
      );
      return rows[0].id;
    }

    /* ---------------------------------------------------------------- */
    console.log("Cupo del Día de Calma (10 personas por día):");

    await reservaDeDia("PRB-DIA-1", 4);
    await reservaDeDia("PRB-DIA-2", 4);
    comprobar("caben 4 + 4 personas el mismo día", true);

    const sobrepasa = await esperarError(cliente, () =>
      reservaDeDia("PRB-DIA-3", 3),
    );
    comprobar(
      "rechaza la persona 11 del día",
      sobrepasa !== null && sobrepasa.code === ERROR_CUPO,
      sobrepasa ? `código ${sobrepasa.code}` : "no falló",
    );
    comprobar(
      "el mensaje del rechazo está en español y dice cuántos cupos quedan",
      Boolean(sobrepasa?.message?.includes("Día de Calma")) &&
        Boolean(sobrepasa?.message?.includes("Quedan 2 cupos")),
      sobrepasa?.message ?? "",
    );

    const idJusto = await reservaDeDia("PRB-DIA-4", 2);
    comprobar("las 2 personas que quedan sí entran", Boolean(idJusto));

    const alSubir = await esperarError(cliente, () =>
      cliente.query("update reservas set num_personas = 3 where id = $1", [
        idJusto,
      ]),
    );
    comprobar(
      "también se controla al EDITAR una reserva de día",
      alSubir !== null && alSubir.code === ERROR_CUPO,
      alSubir ? `código ${alSubir.code}` : "no falló",
    );

    await cliente.query(
      "update reservas set estado = 'cancelada' where id = $1",
      [idJusto],
    );
    const idTrasCancelar = await reservaDeDia("PRB-DIA-5", 2);
    comprobar(
      "cancelar una reserva de día libera su cupo",
      Boolean(idTrasCancelar),
    );

    const otroDia = await reservaDeDia("PRB-DIA-6", 10, "2099-04-16");
    comprobar("el cupo es por día: el día siguiente arranca en cero", Boolean(otroDia));

    /* ---------------------------------------------------------------- */
    console.log("\nForma de la reserva de día:");

    const dosDias = await esperarError(cliente, () =>
      cliente.query(
        `insert into reservas
           (codigo, tipo, alojamiento_id, plan_id, estancia, huesped_nombre,
            huesped_email, huesped_telefono, num_personas,
            subtotal_alojamiento, subtotal_extras, total, estado, origen)
         values ('PRB-DIA-7','dia',null,$1,'[2099-05-01,2099-05-03)','Prueba',
                 'prueba@lafinca.test','+57 300 000 0000',2,250000,0,250000,
                 'confirmada','manual')`,
        [planDia.id],
      ),
    );
    comprobar(
      "una reserva de día no puede durar dos días",
      dosDias !== null && dosDias.code === "23514",
      dosDias ? `código ${dosDias.code}` : "no falló",
    );

    const diaConCabana = await esperarError(cliente, () =>
      cliente.query(
        `insert into reservas
           (codigo, tipo, alojamiento_id, plan_id, estancia, huesped_nombre,
            huesped_email, huesped_telefono, num_personas,
            subtotal_alojamiento, subtotal_extras, total, estado, origen)
         values ('PRB-DIA-8','dia',$1,$2,'[2099-05-01,2099-05-02)','Prueba',
                 'prueba@lafinca.test','+57 300 000 0000',2,250000,0,250000,
                 'confirmada','manual')`,
        [cabana.id, planDia.id],
      ),
    );
    comprobar(
      "una reserva de día no puede llevar cabaña",
      diaConCabana !== null && diaConCabana.code === "23514",
      diaConCabana ? `código ${diaConCabana.code}` : "no falló",
    );

    const hospedajeSinCabana = await esperarError(cliente, () =>
      cliente.query(
        `insert into reservas
           (codigo, tipo, alojamiento_id, plan_id, estancia, huesped_nombre,
            huesped_email, huesped_telefono, num_personas,
            subtotal_alojamiento, subtotal_extras, total, estado, origen)
         values ('PRB-DIA-9','hospedaje',null,$1,'[2099-05-01,2099-05-03)','Prueba',
                 'prueba@lafinca.test','+57 300 000 0000',2,700000,0,700000,
                 'confirmada','manual')`,
        [planHospedaje.id],
      ),
    );
    comprobar(
      "un hospedaje sin cabaña se rechaza",
      hospedajeSinCabana !== null && hospedajeSinCabana.code === "23514",
      hospedajeSinCabana ? `código ${hospedajeSinCabana.code}` : "no falló",
    );

    /* ---------------------------------------------------------------- */
    console.log("\nLas reservas de día NO bloquean cabañas:");

    const { rows: hospedaje } = await cliente.query(
      `insert into reservas
         (codigo, tipo, alojamiento_id, plan_id, estancia, huesped_nombre,
          huesped_email, huesped_telefono, num_personas,
          subtotal_alojamiento, subtotal_extras, total, estado, origen,
          porcentaje_anticipo, monto_anticipo)
       values ('PRB-HOS-1','hospedaje',$1,$2,
               daterange($3::date, ($3::date + 2),'[)'),'Prueba hospedaje',
               'prueba@lafinca.test','+57 300 000 0000',2,960000,0,960000,
               'confirmada','web',50,480000)
       returning id`,
      [cabana.id, planHospedaje.id, DIA],
    );
    comprobar(
      "se puede dormir en la cabaña el mismo día que hay 10 personas de día",
      hospedaje.length === 1,
    );

    const choque = await esperarError(cliente, () =>
      cliente.query(
        `insert into reservas
           (codigo, tipo, alojamiento_id, plan_id, estancia, huesped_nombre,
            huesped_email, huesped_telefono, num_personas,
            subtotal_alojamiento, subtotal_extras, total, estado, origen)
         values ('PRB-HOS-2','hospedaje',$1,$2,
                 daterange($3::date, ($3::date + 1),'[)'),'Prueba choque',
                 'prueba@lafinca.test','+57 300 000 0000',2,480000,0,480000,
                 'confirmada','web')`,
        [cabana.id, planHospedaje.id, DIA],
      ),
    );
    comprobar(
      "dos hospedajes que se cruzan en la misma cabaña siguen chocando",
      choque !== null && choque.code === "23P01",
      choque ? `código ${choque.code}` : "no falló",
    );

    /* ---------------------------------------------------------------- */
    console.log("\nExtras por noche:");

    const reservaId = hospedaje[0].id;
    const noche1 = DIA;
    const { rows: fechaSiguiente } = await cliente.query(
      "select ($1::date + 1)::text as dia",
      [DIA],
    );
    const noche2 = fechaSiguiente[0].dia;

    await cliente.query(
      `insert into reserva_extras (reserva_id, extra_id, cantidad, precio_unitario, noche)
       values ($1,$2,1,150000,$3), ($1,$2,2,150000,$4), ($1,$2,1,150000,null)`,
      [reservaId, extra.id, noche1, noche2],
    );
    comprobar(
      "el mismo extra cabe en dos noches distintas y una vez sin noche",
      true,
    );

    const repetido = await esperarError(cliente, () =>
      cliente.query(
        `insert into reserva_extras (reserva_id, extra_id, cantidad, precio_unitario, noche)
         values ($1,$2,1,150000,$3)`,
        [reservaId, extra.id, noche1],
      ),
    );
    comprobar(
      "el mismo extra no se puede repetir en la misma noche",
      repetido !== null && repetido.code === "23505",
      repetido ? `código ${repetido.code}` : "no falló",
    );

    const repetidoSinNoche = await esperarError(cliente, () =>
      cliente.query(
        `insert into reserva_extras (reserva_id, extra_id, cantidad, precio_unitario, noche)
         values ($1,$2,1,150000,null)`,
        [reservaId, extra.id],
      ),
    );
    comprobar(
      "dos extras «sin noche» iguales tampoco se repiten (nulls not distinct)",
      repetidoSinNoche !== null && repetidoSinNoche.code === "23505",
      repetidoSinNoche ? `código ${repetidoSinNoche.code}` : "no falló",
    );

    /* ---------------------------------------------------------------- */
    console.log("\nAnticipo y origen nuevo:");

    const anticipoRaro = await esperarError(cliente, () =>
      cliente.query("update reservas set porcentaje_anticipo = 30 where id = $1", [
        reservaId,
      ]),
    );
    comprobar(
      "el anticipo solo admite 50 o 100",
      anticipoRaro !== null && anticipoRaro.code === "23514",
      anticipoRaro ? `código ${anticipoRaro.code}` : "no falló",
    );

    await cliente.query(
      "update reservas set origen = 'google_calendar', referencia_externa = 'evt_prueba_1' where id = $1",
      [reservaId],
    );
    comprobar("se admite el origen 'google_calendar' con su referencia externa", true);

    const referenciaRepetida = await esperarError(cliente, () =>
      cliente.query(
        "update reservas set referencia_externa = 'evt_prueba_1' where codigo = 'PRB-DIA-1'",
      ),
    );
    comprobar(
      "dos reservas no pueden apuntar al mismo evento externo",
      referenciaRepetida !== null && referenciaRepetida.code === "23505",
      referenciaRepetida ? `código ${referenciaRepetida.code}` : "no falló",
    );
  } finally {
    await cliente.query("rollback");
    const { rows } = await cliente.query("select count(*)::int as total from reservas");
    console.log(`\nTransacción deshecha. Reservas en la base: ${rows[0].total}.`);
    await cliente.end();
  }

  console.log(
    `\n${pasadas} comprobación(es) en verde${fallos.length ? `, ${fallos.length} fallo(s)` : ""}.`,
  );
  if (fallos.length) {
    for (const fallo of fallos) console.log(`  · ${fallo}`);
    process.exit(1);
  }
}

principal().catch((error) => {
  console.error(`\nFalló: ${error.message}`);
  process.exit(1);
});
