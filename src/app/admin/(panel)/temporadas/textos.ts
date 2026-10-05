/** El texto que confirma el borrado: dice qué pasa, no solo «¿seguro?». */
export function confirmacionBorrado(nombre: string): string {
  return `¿Borrar «${nombre}»? Esas fechas vuelven a cobrarse con el precio base desde este momento. Las reservas ya hechas no cambian: conservan el precio con que se reservaron.`;
}
