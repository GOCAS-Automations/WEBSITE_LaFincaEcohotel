/**
 * ¿Puede pasar esta llamada al latido diario (`/api/salud`)?
 *
 * Vercel Cron firma sus llamadas con `Authorization: Bearer <CRON_SECRET>`
 * cuando la variable existe en el proyecto. Aquí se decide qué hacer con eso:
 *
 *   · Con `CRON_SECRET`: solo pasa quien trae exactamente esa cabecera.
 *   · Sin `CRON_SECRET` en **producción** (`VERCEL_ENV === "production"`):
 *     **no pasa nadie**. Antes quedaba abierto, y bastaba con que alguien
 *     borrara la variable en Vercel —o no la copiara al mudar el proyecto— para
 *     que cualquiera pudiera disparar el barrido de reservas y el refresco de
 *     reseñas, que escriben con la clave de servicio. Falla cerrado y lo dice
 *     en el registro, para que se note en el primer cron que no corre.
 *   · Sin `CRON_SECRET` fuera de producción (local, previews): pasa, para poder
 *     probar el endpoint sin configurar nada.
 *
 * Módulo puro: recibe el entorno y la cabecera en vez de leerlos, para poder
 * probar las cuatro combinaciones sin tocar `process.env`.
 */
export type DecisionCron = "permitido" | "rechazado" | "falta-secreto";

export function decidirAccesoCron({
  secreto,
  entornoVercel,
  cabecera,
}: {
  secreto: string | undefined;
  entornoVercel: string | undefined;
  cabecera: string | null;
}): DecisionCron {
  if (secreto) {
    return cabecera === `Bearer ${secreto}` ? "permitido" : "rechazado";
  }
  return entornoVercel === "production" ? "falta-secreto" : "permitido";
}
