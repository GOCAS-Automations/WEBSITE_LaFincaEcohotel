/** El texto que confirma el borrado: dice qué pasa, no solo «¿seguro?». */
export function confirmacionBorrado(nombre: string): string {
  return `¿Borrar la tarifa diferencial «${nombre}»? Esas fechas vuelven a cobrarse con el precio base desde este momento. Las reservas ya hechas no cambian: se quedan con el precio con que se reservaron.`;
}
