import { Foto } from "@/components/ui/foto";

import { Neblina, PatronColibri, RamaBotanica } from "@/components/sitio/atmosfera";
import { CierreReserva } from "@/components/sitio/cierre-reserva";
import { HeroPagina } from "@/components/sitio/hero-pagina";
import { IconoUbicacion } from "@/components/sitio/iconos";
import { VideoSeccion } from "@/components/sitio/video-seccion";
import { Boton } from "@/components/ui/boton";
import { Revelar } from "@/components/ui/revelar";
import { EncabezadoSeccion, RITMO, Seccion } from "@/components/ui/seccion";
import { CLASE_FOTO_CON_FLAG } from "@/lib/fotos";
import {
  getContacto,
  getHeroesListados,
  getLugar,
  getReconocimiento,
  getSeccionPlanes,
} from "@/lib/contenido";

/**
 * Conócenos: quiénes somos, el reconocimiento de la COP16, instalaciones y
 * cómo llegar.
 *
 * El mapa va embebido en modo búsqueda pública de Google Maps: no necesita
 * clave de API ni facturación, y se carga con `loading="lazy"` para que un
 * iframe de un tercero no compita con el contenido por el ancho de banda del
 * primer visor.
 */
export async function PaginaConocenos() {
  const [heroes, lugar, contacto, reconocimiento, seccionPlanes] =
    await Promise.all([
      getHeroesListados(),
      getLugar(),
      getContacto(),
      getReconocimiento(),
      getSeccionPlanes(),
    ]);

  return (
    <>
      <HeroPagina
        hero={heroes.conocenos}
        migas={[
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Conócenos", ruta: "/conocenos" },
        ]}
      />

      {/* Sobre nosotros */}
      <Seccion fondo="crema" className="relative overflow-hidden">
        <Neblina tono="verde" className="opacity-60" />
        <PatronColibri tono="claro" />
        <RamaBotanica
          className="absolute top-[8%] right-[-5%] hidden w-56 text-oliva-400/25 lg:block"
          ritmo="lenta"
          espejo
        />

      {/*
        DOS FOTOS, Y LAS DOS CUADRADAS CON EL TEXTO.

        Había una sola fotografía con proporción fija (`aspect-16/11`): en
        escritorio la columna de la derecha acababa mucho antes que la de texto
        y la sección se leía descuadrada. Ahora son dos apiladas dentro de una
        columna `h-full`, con `flex-[1.45]` y `flex-1` sobre base cero: la
        altura total la fija la columna de al lado —`items-stretch`— y las dos
        fotos se reparten ese alto. El resultado es que el borde de arriba de la
        primera y el de abajo de la segunda caen exactamente donde empieza y
        acaba el texto, a 1024, 1440 y 1920 px.

        En el teléfono la rejilla es de una columna y las fotos recuperan su
        proporción (`aspect-16/11` y `aspect-16/10`), que es lo que hay que
        hacer cuando ya no hay nada al lado con lo que alinearse.

        RADIOS Y SELLO: la curva grande de la foto de arriba abre en la esquina
        SUPERIOR IZQUIERDA y la de la de abajo en la INFERIOR DERECHA, en
        diagonal (petición de Cesar, 2026-09-15; antes iban las dos abajo y el
        gesto se leía plano). Las dos son mayores que las anteriores —8 rem y
        7 rem frente a 6 y 5— y en el teléfono bajan a 5 y 4,5 rem, que es lo
        que aguanta una caja de 358 px de ancho sin comerse la foto.

        Ninguna de las dos toca la esquina SUPERIOR DERECHA: ahí es donde todas
        las fotos del hotel llevan impreso el sello de marca (ver `ZONA_FLAG` en
        `src/lib/fotos.ts`), y el encuadre se ancla con `CLASE_FOTO_CON_FLAG`
        para que se vea entero.
      */}
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-2 lg:items-stretch lg:gap-16">
          <Revelar className="flex flex-col justify-center gap-6">
            <EncabezadoSeccion
              antetitulo={lugar.antetitulo}
              titulo={lugar.titulo}
              alineacion="izquierda"
            />
            <div className="flex flex-col gap-4">
              {lugar.parrafos.map((parrafo) => (
                <p
                  key={parrafo.slice(0, 40)}
                  className="text-base leading-relaxed text-crema-700 sm:text-lg"
                >
                  {parrafo}
                </p>
              ))}
            </div>
          </Revelar>

          <Revelar retraso={110} className="lg:h-full">
            <div className="flex h-full flex-col gap-4 sm:gap-5">
              <div className="relative aspect-16/11 min-h-0 shrink-0 overflow-hidden rounded-[var(--radius-generoso)] rounded-tl-[5rem] bg-crema-200 shadow-[var(--shadow-elevada)] sm:rounded-tl-[8rem] lg:aspect-auto lg:shrink lg:basis-0 lg:grow-[1.45]">
                <Foto
                  src={lugar.imagen}
                  alt={lugar.imagen_alt}
                  fill
                  sizes="(min-width: 1024px) 45vw, 92vw"
                  className={CLASE_FOTO_CON_FLAG}
                />
              </div>

              {lugar.imagen_secundaria ? (
                <div className="relative aspect-16/10 min-h-0 shrink-0 overflow-hidden rounded-[var(--radius-generoso)] rounded-br-[4.5rem] bg-crema-200 shadow-[var(--shadow-elevada)] sm:rounded-br-[7rem] lg:aspect-auto lg:shrink lg:basis-0 lg:grow">
                  <Foto
                    src={lugar.imagen_secundaria}
                    alt={lugar.imagen_secundaria_alt}
                    fill
                    sizes="(min-width: 1024px) 45vw, 92vw"
                    className={CLASE_FOTO_CON_FLAG}
                  />
                </div>
              ) : null}
            </div>
          </Revelar>
        </div>
      </Seccion>


      {/*
        SOMOS COP16 — ESTABA EN LA PORTADA Y VIVE AQUÍ DESDE EL 2026-09-14.

        En la portada era la octava sección: un video de dos minutos y cincuenta
        segundos, con locución, en la única página cuyo trabajo es llevar a
        reservar sin que nadie tenga que desplazarse tres pantallas. Cesar pidió
        moverlo y el sitio natural es este: va justo después de «Sobre nosotros»
        —quiénes somos— y antes de las instalaciones, que es el orden en que se
        hacen las preguntas. Un reconocimiento contado por quien lo recibió vale
        más que un párrafo, pero solo si quien lo escucha ya sabe de qué lugar le
        están hablando.

        Fondo `brote` (el verde claro de la paleta oficial) y no blanco: entre la
        sección crema de arriba y la blanca de abajo, un blanco más habría
        fundido las tres en una sola mancha clara.
      */}
      <Seccion fondo="brote" className="relative overflow-hidden">
        <RamaBotanica
          className="absolute bottom-[-6%] left-[-4%] hidden w-52 text-oliva-400/25 lg:block"
          ritmo="lenta"
        />

        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Revelar retraso={80} className="order-2 lg:order-1">
            {/*
              La curva grande abre ABAJO A LA IZQUIERDA: en la esquina superior
              derecha no se toca nada, que es donde el material del hotel lleva
              impreso el sello de marca.
            */}
            <div className="relative aspect-16/10 overflow-hidden rounded-[var(--radius-generoso)] rounded-bl-[7rem] bg-crema-200 shadow-[var(--shadow-elevada)]">
              {reconocimiento.video ? (
                /*
                  Arranca solo, silenciado y en bucle, pero NO en la carga
                  inicial: espera a estar en pantalla. Ver `VideoSeccion` —un
                  `autoplay` a secas descargaba los 3,3 MB del clip nada más
                  abrir la página, con el video dos pantallas más abajo.
                */
                <VideoSeccion
                  src={reconocimiento.video}
                  poster={reconocimiento.imagen}
                  etiqueta={`Video: ${reconocimiento.titulo}`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <Foto
                  src={reconocimiento.imagen}
                  alt={reconocimiento.imagen_alt}
                  fill
                  sizes="(min-width: 1024px) 45vw, 92vw"
                  className="object-cover"
                />
              )}
            </div>
          </Revelar>

          <Revelar className="order-1 flex flex-col gap-6 lg:order-2">
            <EncabezadoSeccion
              antetitulo={reconocimiento.antetitulo}
              titulo={reconocimiento.titulo}
              alineacion="izquierda"
            />
            <div className="flex flex-col gap-4">
              {reconocimiento.parrafos.map((parrafo) => (
                <p
                  key={parrafo.slice(0, 40)}
                  className="text-base leading-relaxed text-crema-700 sm:text-lg"
                >
                  {parrafo}
                </p>
              ))}
            </div>
            {/* Centrado en el teléfono: va solo en su línea y pegado a la
                izquierda se leía como un resto del párrafo de arriba. */}
            <Boton
              href={reconocimiento.cta_href}
              variante="contorno"
              className="self-center sm:self-start"
            >
              {reconocimiento.cta_texto}
            </Boton>
          </Revelar>
        </div>
      </Seccion>

      {/* Instalaciones */}
      {lugar.instalaciones.length > 0 ? (
        <Seccion fondo="blanco" id="instalaciones">
          <EncabezadoSeccion
            antetitulo="Servicios"
            titulo={lugar.instalaciones_titulo}
            descripcion={lugar.instalaciones_descripcion}
          />

          <ul className={`${RITMO.trasTitulo} grid gap-6 sm:grid-cols-2 lg:grid-cols-3`}>
            {lugar.instalaciones.map((instalacion, indice) => (
              <Revelar
                key={instalacion.nombre}
                como="li"
                retraso={(indice % 3) * 90}
                className="h-full"
              >
                <article className="flex h-full flex-col overflow-hidden rounded-[var(--radius-generoso)] rounded-tl-[3rem] bg-crema-50 shadow-[var(--shadow-tenue)] ring-1 ring-crema-200/70 transition-shadow duration-300 hover:shadow-[var(--shadow-tarjeta)]">
                  <div className="relative aspect-4/3 bg-crema-200">
                    <Foto
                      src={instalacion.imagen}
                      alt={instalacion.imagen_alt}
                      fill
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                      className="object-cover"
                      style={
                        instalacion.imagen_posicion
                          ? { objectPosition: instalacion.imagen_posicion }
                          : undefined
                      }
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5 sm:p-6">
                    <h3 className="font-titulo text-lg font-bold text-petroleo-900">
                      {instalacion.nombre}
                    </h3>
                    <p className="text-sm leading-relaxed text-crema-700">
                      {instalacion.descripcion}
                    </p>
                  </div>
                </article>
              </Revelar>
            ))}
          </ul>
        </Seccion>
      ) : null}

      {/* Cómo llegar */}
      <Seccion fondo="crema" id="como-llegar">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Revelar className="flex flex-col gap-6">
            <EncabezadoSeccion
              antetitulo="Ubicación"
              titulo={lugar.llegar_titulo}
              alineacion="izquierda"
            />

            <div className="flex flex-col gap-4">
              {lugar.llegar_parrafos.map((parrafo) => (
                <p
                  key={parrafo.slice(0, 40)}
                  className="text-base leading-relaxed text-crema-700"
                >
                  {parrafo}
                </p>
              ))}
            </div>

            {lugar.llegar_indicaciones.length > 0 ? (
              <ul className="flex flex-col gap-3 rounded-[var(--radius-generoso)] bg-white p-5 ring-1 ring-crema-200/70 sm:p-6">
                {lugar.llegar_indicaciones.map((indicacion) => (
                  <li
                    key={indicacion.slice(0, 30)}
                    className="flex gap-3 text-sm leading-relaxed text-crema-800"
                  >
                    <IconoUbicacion className="mt-0.5 size-4 shrink-0 text-petroleo-500" />
                    {indicacion}
                  </li>
                ))}
              </ul>
            ) : null}

            {/* Centrados en el teléfono: a 390 px cada botón cae en su propia
                línea y la fila se leía escalonada contra el borde izquierdo. */}
            <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
              <Boton
                href={contacto.mapa_como_llegar || contacto.mapa_url}
                variante="contorno"
                externo
              >
                Cómo llegar desde Cali
              </Boton>
              <Boton href={contacto.mapa_url} variante="secundario" externo>
                Ver la ficha en Google Maps
              </Boton>
            </div>
          </Revelar>

          <Revelar retraso={110}>
            <div className="h-80 overflow-hidden rounded-[var(--radius-generoso)] shadow-[var(--shadow-tarjeta)] ring-1 ring-crema-200/70 sm:h-96 lg:h-full lg:min-h-[26rem]">
              <iframe
                src={contacto.mapa_embed}
                title="Mapa con la ubicación de La Finca Eco Hotel"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full w-full border-0"
              />
            </div>
          </Revelar>
        </div>
      </Seccion>

      <CierreReserva
        imagen={seccionPlanes.imagen_fondo}
        fondoAnterior="bg-crema-50"
        titulo="Ven a conocerlo"
        texto="Cinco cabañas, un bosque de niebla y 45 minutos de camino desde Cali."
        perfil="cresta"
      />
    </>
  );
}
