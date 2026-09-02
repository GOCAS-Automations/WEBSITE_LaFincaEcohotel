export default function PaginaInicio() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-24">
      <p className="text-sm font-medium tracking-wide text-[var(--verde-claro)] uppercase">
        La Finca Eco Hotel
      </p>
      <h1 className="text-4xl leading-tight font-semibold text-balance text-[var(--verde-bosque)] sm:text-5xl">
        Sumérgete en un bosque rodeado de neblina y aves
      </h1>
      <p className="max-w-xl text-lg text-pretty opacity-80">
        Ecohotel de montaña a 45 minutos de Cali. Estamos construyendo el nuevo
        sitio: cabañas, planes, experiencias y reservas en línea.
      </p>
      <p className="text-sm opacity-60">
        Sitio en construcción — Fase 1 completada (base de datos y contenido
        inicial).
      </p>
    </main>
  );
}
