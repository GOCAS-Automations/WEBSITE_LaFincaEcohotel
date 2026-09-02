/**
 * CMS ligero + capa de acceso al contenido público.
 *
 * ---------------------------------------------------------------------------
 * CÓMO FUNCIONA
 * ---------------------------------------------------------------------------
 * La tabla `contenido` es un diccionario `(clave text primary key, valor jsonb)`.
 * Cada sección editable del sitio tiene UNA fila. Este módulo:
 *
 *   1. Lee TODAS las filas de una sola vez (`leerContenido()`), envuelto en
 *      `cache()` de React: dentro de un mismo render, todos los getters
 *      comparten una única consulta.
 *   2. Fusiona lo que venga de la base sobre un **respaldo escrito en código**.
 *
 * El respaldo es la pieza clave: si Supabase no responde durante el build —o si
 * el panel todavía no ha creado la fila, o alguien guarda un campo vacío— el
 * sitio se publica igual, con los textos reales del hotel, en vez de romper el
 * despliegue o mostrar huecos en blanco.
 *
 * La fusión SOLO copia claves que ya existen en el respaldo (ver `fusionar`).
 * Así el código manda sobre la forma del objeto: una fila del panel con una
 * clave inesperada no puede romper un componente.
 *
 * El contrato completo (todas las claves y la forma de su jsonb) está
 * documentado en `docs/CMS_CLAVES.md`. Ese documento es lo que usará el agente
 * del panel administrativo: si aquí se añade una clave, allí también.
 */
import { cache } from "react";

import { crearClientePublico } from "./supabase/public";
import { medio, SITIO } from "./sitio";
import type { Alojamiento, Extra, Plan } from "./tipos/basedatos";

/* ===========================================================================
 * Tipos del contenido editable
 * ======================================================================== */

export type ImagenGaleria = {
  url: string;
  /** Obligatorio por accesibilidad y SEO. Nunca se publica una foto sin él. */
  alt: string;
};

export type HeroInicio = {
  antetitulo: string;
  titulo: string;
  subtitulo: string;
  parrafo: string;
  cta_texto: string;
  cta_href: string;
  cta_secundario_texto: string;
  cta_secundario_href: string;
  /** Foto horizontal del hero (escritorio y tabletas). */
  imagen: string;
  /**
   * Foto vertical para móvil. Dirección de arte real: la horizontal recortada
   * a una pantalla de teléfono pierde justo las cabañas.
   */
  imagen_movil: string;
  imagen_alt: string;
};

export type IntroInicio = {
  antetitulo: string;
  titulo: string;
  parrafos: string[];
  imagen: string;
  imagen_alt: string;
  datos: { valor: string; etiqueta: string }[];
};

/** Encabezado reutilizable de las secciones de la portada. */
export type SeccionInicio = {
  antetitulo: string;
  titulo: string;
  descripcion: string;
  cta_texto: string;
  cta_href: string;
};

/** Igual que `SeccionInicio` pero con la nota legal de las tarifas. */
export type SeccionPlanes = SeccionInicio & { nota: string };

export type EsenciaInicio = {
  antetitulo: string;
  titulo: string;
  parrafos: string[];
  imagenes: ImagenGaleria[];
};

export type ReconocimientoInicio = {
  antetitulo: string;
  titulo: string;
  parrafos: string[];
  imagen: string;
  imagen_alt: string;
  cta_texto: string;
  cta_href: string;
};

export type Testimonio = { texto: string; autor: string };

export type TestimoniosInicio = {
  antetitulo: string;
  titulo: string;
  items: Testimonio[];
};

export type CtaFinal = {
  titulo: string;
  texto: string;
  cta_texto: string;
  cta_href: string;
  imagen: string;
  imagen_alt: string;
};

export type ContactoSitio = {
  /** Solo dígitos con indicativo: `573160476671`. */
  whatsapp: string;
  whatsapp_visible: string;
  mensaje_whatsapp: string;
  correo: string;
  direccion: string;
  ciudad: string;
  region: string;
  pais: string;
  direccion_completa: string;
  horario_restaurante: string;
  rnt: string;
  instagram: string;
  instagram_usuario: string;
  facebook: string;
  tiktok: string;
  tiktok_usuario: string;
  mapa_url: string;
  mapa_embed: string;
};

export type SeoSitio = {
  titulo: string;
  descripcion: string;
  palabras_clave: string[];
  imagen: { url: string; alt: string; ancho: number; alto: number };
};

export type HeroListado = {
  titulo: string;
  subtitulo: string;
  imagen: string;
  imagen_alt: string;
};

export type HeroesListados = {
  alojamientos: HeroListado;
  experiencias: HeroListado;
  el_lugar: HeroListado;
  galeria: HeroListado;
  faq: HeroListado;
  contacto: HeroListado;
  reservar: HeroListado;
};

export type ExperienciaAdicional = {
  nombre: string;
  descripcion: string;
  imagen: string;
  imagen_alt: string;
};

export type ContenidoExperiencias = {
  intro: string;
  adicionales_titulo: string;
  adicionales_descripcion: string;
  adicionales: ExperienciaAdicional[];
};

export type PreguntaFrecuente = { pregunta: string; respuesta: string };

export type ContenidoFaq = {
  intro: string;
  items: PreguntaFrecuente[];
};

export type Instalacion = {
  nombre: string;
  descripcion: string;
  imagen: string;
  imagen_alt: string;
};

export type ContenidoLugar = {
  antetitulo: string;
  titulo: string;
  parrafos: string[];
  imagen: string;
  imagen_alt: string;
  instalaciones_titulo: string;
  instalaciones_descripcion: string;
  instalaciones: Instalacion[];
  llegar_titulo: string;
  llegar_parrafos: string[];
  llegar_indicaciones: string[];
};

export type ContenidoGaleria = {
  intro: string;
  imagenes: ImagenGaleria[];
};

export type PasoReserva = { titulo: string; texto: string };

export type ContenidoReservar = {
  intro: string;
  pasos: PasoReserva[];
  nota: string;
};

export type ContenidoNoEncontrado = {
  titulo: string;
  mensaje: string;
  cta_texto: string;
  cta_href: string;
  imagen: string;
  imagen_alt: string;
};

/* ===========================================================================
 * Respaldos en código
 * ---------------------------------------------------------------------------
 * Los textos salen de `docs/CONTENIDO_ACTUAL.md` (extraídos del sitio en
 * producción). Lo que no existía allí y hubo que redactar está señalado.
 * ======================================================================== */

const RESPALDO_HERO: HeroInicio = {
  antetitulo: "Ecohotel en el Valle del Cauca",
  titulo: "Sumérgete en un bosque rodeado de neblina y aves",
  subtitulo:
    "Somos un paraíso escondido en el Valle del Cauca a tan solo 45 minutos de Cali.",
  parrafo:
    "Sumérgete en la esencia de la finca colombiana rodeado de bosque, neblina y aves. Disfruta de la comodidad y confort en un entorno de tranquilidad y serenidad.",
  cta_texto: "Reservar ahora",
  cta_href: "/reservar",
  cta_secundario_texto: "Descubre nuestro paraíso",
  cta_secundario_href: "/el-lugar",
  imagen: medio("galeria/img-1075.webp"),
  imagen_movil: medio("sitio/home/banner-principal-home-movil-11.webp"),
  imagen_alt:
    "Cabañas de techo azul de La Finca Eco Hotel sobre la ladera, entre hortensias y bosque de montaña",
};

const RESPALDO_INTRO: IntroInicio = {
  antetitulo: "Bienvenidos",
  titulo: "Un bosque de niebla a 45 minutos de Cali",
  parrafos: [
    "La Finca es un ecohotel de montaña en el Km 18 de la vía Cali–Buenaventura, en la Vereda Loma Alta. Aquí el día empieza con la neblina entre los árboles y el canto de las aves que habitan la reserva.",
    "Son pocas cabañas, pensadas para dos personas, con cama doble, baño privado y vista a la montaña. Pocas cabañas significan silencio, privacidad y una atención que se nota.",
  ],
  imagen: medio("galeria/img-5389.webp"),
  imagen_alt:
    "Huésped en el deck de La Finca junto a una hamaca, con el bosque y la montaña al fondo",
  datos: [
    { valor: "45 min", etiqueta: "desde Cali" },
    { valor: "5", etiqueta: "cabañas para dos" },
    { valor: "18 °C", etiqueta: "clima de montaña" },
  ],
};

const RESPALDO_CABANAS: SeccionInicio = {
  antetitulo: "Alojamiento",
  titulo: "Nuestras cabañas",
  descripcion:
    "Cabañas independientes para dos, con cama doble, baño privado y vista a la montaña. Algunas con jacuzzi privado.",
  cta_texto: "Ver todas las cabañas",
  cta_href: "/alojamientos",
};

const RESPALDO_PLANES: SeccionPlanes = {
  antetitulo: "Detalles & Tarifas",
  titulo: "Elige tu plan",
  descripcion:
    "La estadía se reserva por plan, no por cabaña: eliges el nivel de servicio que quieres y lo disfrutas en la cabaña que prefieras.",
  nota: "Tarifas referenciales para temporada baja. Pueden variar según temporada, festivos y alta demanda.",
  cta_texto: "Reservar ahora",
  cta_href: "/reservar",
};

const RESPALDO_EXPERIENCIAS: SeccionInicio = {
  antetitulo: "Experiencias",
  titulo: "Celebra en medio del bosque",
  descripcion:
    "Añade una experiencia a tu reserva y encuentra la cabaña lista: decoración, torta, vino y fotos para que la fecha quede marcada.",
  cta_texto: "Ver experiencias",
  cta_href: "/experiencias",
};

const RESPALDO_ESENCIA: EsenciaInicio = {
  antetitulo: "Naturaleza",
  titulo: "Encontramos un bosque de neblina",
  parrafos: [
    "Estamos dentro de una reserva natural: por eso los carros se quedan en el parqueadero externo y el bosque se recorre a pie. Es la forma de proteger a las especies que viven aquí.",
    "El clima es frío, con mínimas de 18 grados, y días templados que invitan a caminar por los senderos, quedarse en el deck o simplemente escuchar.",
  ],
  imagenes: [
    {
      url: medio("galeria/img-6088.webp"),
      alt: "Camino de tierra entre guaduas y helechos en la reserva de La Finca",
    },
    {
      url: medio("galeria/img-5568.webp"),
      alt: "Huésped apoyada en la baranda de un mirador, mirando el bosque de niebla",
    },
    {
      url: medio("galeria/img-5569.webp"),
      alt: "Sendero de piedra iluminado entre los helechos del bosque de La Finca",
    },
  ],
};

const RESPALDO_RECONOCIMIENTO: ReconocimientoInicio = {
  antetitulo: "Reconocimientos",
  titulo: "Somos COP16",
  parrafos: [
    "Somos COP16 y, junto con la Cámara de Comercio de Cali, nos preparamos para este evento donde mostramos la mejor imagen de nuestra región al mundo entero.",
    "La COP16 —la Conferencia de las Partes sobre Diversidad Biológica— se celebró en Cali, y La Finca hizo parte de la vitrina del Valle del Cauca.",
  ],
  imagen: medio("sitio/reconocimientos/somos-cop-16-mesa-de-trabajo-1.webp"),
  imagen_alt:
    "Camino entre hortensias hacia las cabañas de La Finca, con el bosque de niebla al fondo",
  cta_texto: "Reservar ahora",
  cta_href: "/reservar",
};

const RESPALDO_TESTIMONIOS: TestimoniosInicio = {
  antetitulo: "Testimonios",
  titulo: "Lo que cuentan quienes ya vinieron",
  items: [
    {
      texto:
        "Excelente experiencia! Un lugar hermoso, tranquilo, agradable, excelente atención por parte del anfitrión y en el restaurante. La comida es deliciosa, a tiempo y variada y calientica. El clima es delicioso y te brindan las comodidades para sentirte a gusto.",
      autor: "Angela Buitrago Schonhobel",
    },
    {
      texto:
        "El mejor lugar para desconectar! Excelente atención de parte de Nicolás & Jackeline hacen que la estadía sea placentera y no tengamos que preocuparnos por nada.",
      autor: "Sebastian Rojas T.",
    },
    {
      texto:
        "Me encantó, disfrute mucho la estadía, excelente servicio, el paisaje increíble, se respira paz y tranquilidad.",
      autor: "Laura Melissa Sanchez Serna",
    },
    {
      texto:
        "En general todo estuvo muy bien, la atención y el servicio, un lugar bastante privado, ya que son pocas cabañas, es un lugar que sirve perfectamente para salir del caos de la ciudad.",
      autor: "Diana Sandoval Cepeda",
    },
    {
      texto:
        "Bellísimo lugar, cabañas preciosas, acogedoras y decoradas con muy buen gusto; cuidan cada detalle. El personal super amable, comida deliciosa. Es el sitio ideal para una desconexión total.",
      autor: "Liliana Aranzazu",
    },
    {
      texto:
        "Excelente atención, son muy amables y atentos desde el primer momento de llegada, la comida es exquisita generosas porciones e increíble sazón, un espacio lleno de naturaleza y clima agradable.",
      autor: "Mariana Rios",
    },
  ],
};

const RESPALDO_CTA_FINAL: CtaFinal = {
  titulo: "¿Necesitas más razones para reservar?",
  texto:
    "Escríbenos y te ayudamos a elegir la cabaña, el plan y la fecha. Respondemos por WhatsApp todos los días.",
  cta_texto: "Reservar ahora",
  cta_href: "/reservar",
  imagen: medio(
    "sitio/home/pw-finca-landing-banner-1-mesa-de-trabajo-1-copia-10.webp",
  ),
  imagen_alt:
    "Camino iluminado hacia la casa principal de La Finca, envuelto en la neblina del atardecer",
};

const RESPALDO_CONTACTO: ContactoSitio = {
  whatsapp: SITIO.contacto.whatsapp,
  whatsapp_visible: SITIO.contacto.whatsappVisible,
  mensaje_whatsapp:
    "¡Hola! Vengo del sitio web de La Finca Eco Hotel y me gustaría recibir más información sobre las opciones de hospedaje y disponibilidad. ✨",
  correo: SITIO.contacto.correo,
  direccion: SITIO.contacto.direccion,
  ciudad: SITIO.contacto.ciudad,
  region: SITIO.contacto.region,
  pais: SITIO.contacto.pais,
  direccion_completa: SITIO.contacto.direccionCompleta,
  horario_restaurante: SITIO.contacto.horarioRestaurante,
  rnt: SITIO.rnt,
  instagram: SITIO.redes.instagram,
  instagram_usuario: SITIO.redes.instagramUsuario,
  facebook: SITIO.redes.facebook,
  tiktok: SITIO.redes.tiktok,
  tiktok_usuario: SITIO.redes.tiktokUsuario,
  mapa_url: SITIO.mapa.url,
  mapa_embed: SITIO.mapa.embed,
};

const RESPALDO_SEO: SeoSitio = {
  titulo: "La Finca Eco Hotel — Cabañas en el bosque de niebla cerca de Cali",
  descripcion:
    "Ecohotel de montaña a 45 minutos de Cali, en el Km 18 vía Buenaventura. Cabañas para dos con jacuzzi, turco, piscina, restaurante y senderos.",
  palabras_clave: [
    "ecohotel cerca de Cali",
    "cabañas con jacuzzi Valle del Cauca",
    "hotel Km 18 vía Buenaventura",
    "bosque de niebla Cali",
    "cabañas para parejas cerca de Cali",
  ],
  imagen: {
    url: medio("sitio/home/banner-img-1075-baja-2.webp"),
    alt: "La Finca Eco Hotel, cabañas en el bosque de niebla del Valle del Cauca",
    ancho: 1200,
    alto: 630,
  },
};

const RESPALDO_HEROES: HeroesListados = {
  alojamientos: {
    titulo: "Nuestras cabañas",
    subtitulo:
      "Cabañas independientes para dos, con cama doble, baño privado y vista a la montaña.",
    imagen: medio("cabanas/cabanas-25.webp"),
    imagen_alt:
      "Habitación de una cabaña de La Finca con cama doble y ventanal hacia la terraza y el bosque",
  },
  experiencias: {
    titulo: "Experiencias",
    subtitulo:
      "Celebraciones listas al llegar: aniversarios, cumpleaños, picnic y veladas en medio del bosque.",
    imagen: medio("galeria/img-53960.webp"),
    imagen_alt:
      "Picnic sobre el pasto con canasta, vino y farol, frente a la vista del valle",
  },
  el_lugar: {
    titulo: "El lugar",
    subtitulo:
      "Una reserva natural en el Km 18, con zona húmeda, piscina, restaurante y senderos.",
    imagen: medio("galeria/37.png"),
    imagen_alt:
      "Deck techado de La Finca con bancas de madera y vista al valle entre nubes",
  },
  galeria: {
    titulo: "Galería",
    subtitulo: "El bosque, las cabañas y los rincones de La Finca en imágenes.",
    imagen: medio("galeria/img-5567.webp"),
    imagen_alt:
      "Huésped junto a una hamaca en la terraza de La Finca, envuelta en la neblina",
  },
  faq: {
    titulo: "Preguntas frecuentes",
    subtitulo:
      "Lo que más nos preguntan antes de llegar: ubicación, clima, mascotas, niños y servicios.",
    imagen: medio("galeria/img-6089.webp"),
    imagen_alt:
      "Huésped con ruana mirando el bosque desde una baranda de La Finca",
  },
  contacto: {
    titulo: "Contacto",
    subtitulo:
      "Escríbenos por WhatsApp: resolvemos dudas y confirmamos disponibilidad el mismo día.",
    imagen: medio("galeria/img-6087.webp"),
    imagen_alt:
      "Hortensias y bebedero de colibríes en los jardines de La Finca, con la montaña al fondo",
  },
  reservar: {
    titulo: "Reserva tu estadía",
    subtitulo:
      "Elige cabaña y plan, y confirmamos tu fecha por WhatsApp en pocos minutos.",
    imagen: medio("cabanas/cabanas-28.webp"),
    imagen_alt:
      "Terraza de una cabaña de La Finca con hamaca, mesa para dos y vista al bosque",
  },
};

/**
 * Experiencias que el sitio actual publica con pieza gráfica pero SIN precio
 * (Picnic en el bosque y Velada romántica). Las dos que sí tienen precio
 * —Aniversario y Cumpleaños con Amor— viven en la tabla `extras`, porque se
 * venderán dentro de la reserva.
 * TODO confirmar con el cliente el precio y el detalle de estas dos.
 */
const RESPALDO_EXPERIENCIAS_PAGINA: ContenidoExperiencias = {
  intro:
    "Preparamos la cabaña antes de que llegues: decoración, torta, vino y los detalles de la celebración listos. Se añaden a tu reserva.",
  adicionales_titulo: "Otras experiencias",
  adicionales_descripcion:
    "También armamos estos planes a pedido. Escríbenos y te contamos qué incluye cada uno y cuánto cuesta.",
  adicionales: [
    {
      nombre: "Picnic en el bosque",
      descripcion:
        "Mantel, canasta, cojines y una mesa baja montados en el pasto, frente a la montaña.",
      imagen: medio("experiencias/experiencia-picnic-30.webp"),
      imagen_alt:
        "Picnic montado sobre un mantel de cuadros rojos con canasta, pan y flores",
    },
    {
      nombre: "Velada romántica",
      descripcion:
        "Cena servida en una mesa decorada, con vino, flores y farol, solo para ustedes dos.",
      imagen: medio("experiencias/experiencia-velada-30.webp"),
      imagen_alt:
        "Mesa para dos servida con cena, vino tinto, rosas y farol para una velada romántica",
    },
  ],
};

/**
 * Las 11 preguntas del sitio actual, con las respuestas tal cual las publica
 * el hotel. Única corrección: la respuesta original decía "6 cabañas" mientras
 * el resto del sitio muestra 5. Se publica el número que coincide con el
 * catálogo real para que el sitio no se contradiga a sí mismo.
 * TODO confirmar con el cliente cuál es el número correcto.
 */
const RESPALDO_FAQ: ContenidoFaq = {
  intro:
    "Si tu pregunta no está aquí, escríbenos por WhatsApp: respondemos todos los días.",
  items: [
    {
      pregunta: "¿Dónde estamos ubicados?",
      respuesta:
        "Nos encontramos en el km 18, vía Cali–Buenaventura, Vereda Loma Alta, a aproximadamente 45 minutos al oeste de Cali.",
    },
    {
      pregunta: "¿Tienen zona de parqueadero?",
      respuesta:
        "Sí, contamos con un parqueadero externo vigilado las 24 horas. Por estar en una reserva natural, no se permite el ingreso de vehículos a La Finca, con el propósito de proteger a las especies que habitan el lugar.",
    },
    {
      pregunta: "¿Cómo es el clima?",
      respuesta:
        "Estamos ubicados en un bosque de niebla del Valle del Cauca, lo que nos brinda un clima frío con temperaturas mínimas de 18 grados centígrados. Sin embargo, también disfrutamos de días templados.",
    },
    {
      pregunta: "¿Cuentan con restaurante?",
      respuesta:
        "Sí, ofrecemos servicio de restaurante todos los días de 8:00 a. m. a 11:00 p. m.",
    },
    {
      pregunta: "¿Permiten el ingreso de mascotas?",
      respuesta:
        "¡Por supuesto! Las mascotas son bienvenidas en todas nuestras áreas. Solo pedimos que sus cuidadores sean responsables, para garantizar la seguridad y comodidad tanto de las mascotas como de los demás huéspedes.",
    },
    {
      pregunta: "¿Tienen cabañas para familias grandes?",
      respuesta:
        "Nuestras cabañas están diseñadas principalmente para parejas: cada una tiene capacidad para 2 personas.",
    },
    {
      pregunta: "¿Permiten niños?",
      respuesta:
        "Sí, los niños son bienvenidos. Sin embargo, ten en cuenta que nuestras instalaciones y experiencias están enfocadas principalmente en adultos y parejas.",
    },
    {
      pregunta: "¿Cada cabaña tiene zona húmeda privada?",
      respuesta:
        "Algunas de nuestras cabañas cuentan con jacuzzi privado. Además, ofrecemos una zona húmeda social disponible para todos los huéspedes.",
    },
    {
      pregunta: "¿Cuentan con pasadía?",
      respuesta: "Actualmente no ofrecemos servicio de pasadía.",
    },
    {
      pregunta: "¿Se pueden realizar eventos en sus instalaciones?",
      respuesta:
        "Sí, disponemos de un salón multifuncional ideal para retiros, cumpleaños y reuniones empresariales, con capacidad máxima para 30 personas.",
    },
    {
      pregunta: "¿Hay zonas para hacer deporte?",
      respuesta:
        "En los alrededores se pueden realizar caminatas. Sin embargo, no está permitido ingresar al bosque para actividades como senderismo, con el fin de preservar el entorno natural.",
    },
  ],
};

const RESPALDO_LUGAR: ContenidoLugar = {
  antetitulo: "Sobre nosotros",
  titulo: "Una finca colombiana dentro de una reserva natural",
  parrafos: [
    "La Finca Eco Hotel está en el Km 18 de la vía Cali–Buenaventura, en la Vereda Loma Alta, dentro de un bosque de niebla del Valle del Cauca. Se llega en unos 45 minutos desde Cali y, apenas se sube, el clima cambia: entra el frío, la neblina y el sonido de las aves.",
    "El lugar se pensó al revés de un hotel grande: pocas cabañas, mucho bosque y un equipo pequeño que conoce a cada huésped por su nombre. Nicolás y Jackeline reciben personalmente a quienes llegan.",
    "Cuidar la reserva es parte del plan. Los vehículos se quedan en el parqueadero externo y el bosque solo se recorre por los senderos habilitados, para no alterar a las especies que viven aquí.",
  ],
  imagen: medio("sitio/home/banner-img-1075-baja-4.webp"),
  imagen_alt:
    "Las cabañas de techo azul de La Finca sobre la ladera, entre hortensias y bosque de montaña",
  instalaciones_titulo: "Instalaciones",
  instalaciones_descripcion:
    "Todo lo que está incluido con tu estadía, además de la cabaña.",
  instalaciones: [
    {
      nombre: "Zona húmeda",
      descripcion:
        "Jacuzzi y turco de uso social para todos los huéspedes. Algunas cabañas, además, tienen jacuzzi privado.",
      imagen: medio("galeria/img-6091.webp"),
      imagen_alt:
        "Huéspedes en el jacuzzi social de La Finca, con el bosque de montaña al fondo",
    },
    {
      nombre: "Piscina y decks",
      descripcion:
        "Piscina y decks de madera con vista a la montaña, abiertos durante toda la estadía.",
      imagen: medio("galeria/img-5390.webp"),
      imagen_alt:
        "Escaleras que bajan a la piscina de La Finca, rodeadas de jardines y con vista al bosque",
    },
    {
      nombre: "Restaurante",
      descripcion:
        "Servicio todos los días de 8:00 a. m. a 11:00 p. m. Desayuno incluido en los tres planes, y carta para almuerzo y cena.",
      imagen: medio("lugar/restaurante-24.webp"),
      imagen_alt:
        "Comedor del restaurante de La Finca con mesas de madera y ventanales hacia el bosque",
    },
    {
      nombre: "Salón multifuncional",
      descripcion:
        "Espacio para retiros, cumpleaños y reuniones empresariales, con capacidad máxima para 30 personas.",
      imagen: medio("lugar/salon-la-finca-24.webp"),
      imagen_alt:
        "Salón techado y abierto de La Finca, con bancas y vista al valle entre nubes",
    },
    {
      nombre: "Senderos",
      descripcion:
        "Caminos habilitados para recorrer el bosque de niebla y avistar las aves de la reserva.",
      imagen: medio("galeria/img-5569.webp"),
      imagen_alt:
        "Sendero de piedra entre los helechos del bosque de niebla de La Finca",
    },
    {
      nombre: "Fogata",
      descripcion:
        "Al caer la tarde encendemos la fogata en el deck. Los planes Entre Semana y Premium incluyen los pinchos de masmelos.",
      imagen: medio("galeria/img-53920.webp"),
      imagen_alt:
        "Huéspedes abrigados frente a una fogata encendida en el deck del bosque",
    },
  ],
  llegar_titulo: "Cómo llegar",
  llegar_parrafos: [
    "Desde Cali se toma la vía a Buenaventura y se sube hasta el Km 18. Son unos 45 minutos en carro desde el occidente de la ciudad.",
    "Al llegar, el vehículo se deja en el parqueadero externo vigilado y el ingreso a las cabañas se hace a pie: estamos dentro de una reserva natural y no permitimos el ingreso de carros para proteger a las especies del bosque.",
  ],
  llegar_indicaciones: [
    "Km 18, vía Cali–Buenaventura, Vereda Loma Alta (Valle del Cauca).",
    "Aproximadamente 45 minutos desde Cali.",
    "Parqueadero externo vigilado 24 horas.",
    "Si vienes en transporte público o taxi, escríbenos por WhatsApp y te damos el punto exacto de llegada.",
  ],
};

/**
 * Galería general: las 31 fotos de la carpeta `galeria/` del bucket.
 *
 * Van ordenadas por resolución: las diez últimas (`fotos-landing-*`) vienen del
 * WordPress actual a 225×300 px y se ven blandas si se muestran grandes, así
 * que cierran la cuadrícula en las casillas pequeñas.
 * TODO: reemplazarlas cuando llegue la carpeta de fotos en alta calidad (§12).
 */
const RESPALDO_GALERIA: ContenidoGaleria = {
  intro:
    "El bosque, las cabañas y las zonas sociales de La Finca, tal como las encuentran nuestros huéspedes.",
  imagenes: [
    { url: medio("galeria/img-1075.webp"), alt: "Vista de las cabañas de techo azul de La Finca sobre la ladera, entre hortensias" },
    { url: medio("galeria/37.png"), alt: "Deck techado de La Finca con bancas de madera y vista al valle entre nubes" },
    { url: medio("galeria/41.png"), alt: "Comedor del restaurante de La Finca con mesas de madera y ventanales hacia la niebla" },
    { url: medio("galeria/img-5389.webp"), alt: "Huésped en el deck junto a una hamaca, con el bosque y el cielo despejado al fondo" },
    { url: medio("galeria/img-5390.webp"), alt: "Escaleras que bajan a la piscina de La Finca, rodeadas de jardines" },
    { url: medio("galeria/img-5391.webp"), alt: "Huésped y su perro en el jacuzzi al aire libre, con la montaña detrás" },
    { url: medio("galeria/img-5394.webp"), alt: "Huésped en bata en la terraza de una cabaña, mirando el bosque de montaña" },
    { url: medio("galeria/img-53920.webp"), alt: "Pareja abrigada frente a una fogata encendida en el deck del bosque" },
    { url: medio("galeria/img-53950.webp"), alt: "Pareja en bata junto a la fogata de noche, con copas de vino y masmelos" },
    { url: medio("galeria/img-53960.webp"), alt: "Picnic sobre el pasto con canasta, vino y farol, frente a la vista del valle" },
    { url: medio("galeria/img-53970.webp"), alt: "Pareja abrazada entre la neblina de la noche, junto a las farolas del camino" },
    { url: medio("galeria/img-5567.webp"), alt: "Huésped junto a una hamaca en la terraza, envuelta en la neblina" },
    { url: medio("galeria/img-5568.webp"), alt: "Huésped apoyada en la baranda de un mirador, mirando el bosque de niebla" },
    { url: medio("galeria/img-5569.webp"), alt: "Sendero de piedra entre los helechos del bosque de niebla de La Finca" },
    { url: medio("galeria/img-6086.webp"), alt: "Pareja compartiendo una botella de vino en el piso alfombrado de una cabaña de madera" },
    { url: medio("galeria/img-6087.webp"), alt: "Huésped junto a las hortensias y el bebedero de colibríes, con la montaña al fondo" },
    { url: medio("galeria/img-6088.webp"), alt: "Camino de tierra entre guaduas y helechos en la reserva de La Finca" },
    { url: medio("galeria/img-6089.webp"), alt: "Huésped con ruana mirando el bosque desde una baranda de La Finca" },
    { url: medio("galeria/img-6091.webp"), alt: "Huéspedes en el jacuzzi social de La Finca, con el bosque de montaña al fondo" },
    { url: medio("galeria/img-4424.webp"), alt: "Perro cocker spaniel sentado en el deck techado, con el valle detrás" },
    { url: medio("galeria/49.png"), alt: "Jacuzzi encendido de noche, con toallas dobladas y una mesa iluminada al lado" },
    { url: medio("galeria/fotos-landing-mesa-de-trabajo-1.webp"), alt: "Huésped con ruana fucsia mirando el bosque desde la baranda" },
    { url: medio("galeria/fotos-landing-mesa-de-trabajo-1-copia.webp"), alt: "Huésped caminando por el camino de tierra que cruza la reserva" },
    { url: medio("galeria/fotos-landing-mesa-de-trabajo-1-copia-2.webp"), alt: "Huésped sonriendo junto a las hortensias del jardín, con la montaña al fondo" },
    { url: medio("galeria/fotos-landing-mesa-de-trabajo-1-copia-3.webp"), alt: "Pareja sentada en el piso de una cabaña de madera con una mesita y copas" },
    { url: medio("galeria/fotos-landing-mesa-de-trabajo-1-copia-4.webp"), alt: "Huésped caminando por el sendero del bosque entre los helechos" },
    { url: medio("galeria/fotos-landing-mesa-de-trabajo-1-copia-5.webp"), alt: "Huésped de espaldas apoyada en la baranda frente al bosque de niebla" },
    { url: medio("galeria/fotos-landing-mesa-de-trabajo-1-copia-6.webp"), alt: "Huésped sentada junto a la hamaca de la terraza, entre la niebla" },
    { url: medio("galeria/fotos-landing-mesa-de-trabajo-1-copia-7.webp"), alt: "Huésped y su perro en el jacuzzi al aire libre, bajo el cielo despejado" },
    { url: medio("galeria/fotos-landing-mesa-de-trabajo-1-copia-8.webp"), alt: "Perro cocker spaniel sobre una rampa en el deck, con el valle al fondo" },
    { url: medio("galeria/fotos-landing-mesa-de-trabajo-1-copia-9.webp"), alt: "Grupo de amigas en el jacuzzi social de La Finca" },
  ],
};

const RESPALDO_RESERVAR: ContenidoReservar = {
  intro:
    "Elige la cabaña y el plan que quieres. Te llevamos a WhatsApp con el mensaje ya escrito y confirmamos disponibilidad el mismo día.",
  pasos: [
    {
      titulo: "1. Elige tu cabaña",
      texto:
        "Cinco cabañas independientes para dos personas. Algunas con jacuzzi privado.",
    },
    {
      titulo: "2. Elige tu plan",
      texto:
        "Entre Semana, Estándar o Premium. Cambia lo que incluye la estadía, no la cabaña.",
    },
    {
      titulo: "3. Confirmamos por WhatsApp",
      texto:
        "Te respondemos con la disponibilidad, el total y la forma de pago. Sin intermediarios.",
    },
  ],
  nota: "Muy pronto vas a poder reservar y pagar en línea desde esta misma página.",
};

const RESPALDO_NO_ENCONTRADO: ContenidoNoEncontrado = {
  titulo: "Esta página se perdió en la neblina",
  mensaje:
    "La dirección que buscas no existe o cambió de lugar. Vuelve al inicio o escríbenos por WhatsApp y te orientamos.",
  cta_texto: "Volver al inicio",
  cta_href: "/",
  imagen: medio("sitio/home/pajaro-banner-3-22.webp"),
  imagen_alt:
    "Ave de pecho amarillo posada sobre un tronco cubierto de musgo, en la reserva de La Finca",
};

/* ===========================================================================
 * Lectura de la tabla `contenido`
 * ======================================================================== */

/** Todas las claves que este módulo conoce. Ver `docs/CMS_CLAVES.md`. */
export const CLAVES_CONTENIDO = [
  "sitio.contacto",
  "sitio.seo",
  "home.hero",
  "home.intro",
  "home.cabanas",
  "home.planes",
  "home.experiencias",
  "home.esencia",
  "home.reconocimiento",
  "home.testimonios",
  "home.cta_final",
  "heroes.listados",
  "experiencias",
  "faq",
  "lugar",
  "galeria",
  "reservar",
  "no_encontrado",
] as const;

export type ClaveContenido = (typeof CLAVES_CONTENIDO)[number];

/**
 * Lee la tabla entera de una vez.
 *
 * Son menos de veinte filas de jsonb: una sola consulta cuesta menos que
 * diecisiete y, envuelta en `cache()`, todos los getters de un mismo render la
 * comparten. Si la consulta falla, devuelve un mapa vacío y CADA getter cae a
 * su respaldo — el build nunca se rompe por esto.
 */
const leerContenido = cache(
  async (): Promise<Map<string, Record<string, unknown>>> => {
    const mapa = new Map<string, Record<string, unknown>>();

    try {
      const supabase = crearClientePublico();
      const { data, error } = await supabase
        .from("contenido")
        .select("clave, valor");

      if (error) {
        console.error("[contenido] lectura:", error.message);
        return mapa;
      }

      for (const fila of data ?? []) {
        if (
          fila.valor &&
          typeof fila.valor === "object" &&
          !Array.isArray(fila.valor)
        ) {
          mapa.set(fila.clave, fila.valor as Record<string, unknown>);
        }
      }
    } catch (error) {
      console.error(
        "[contenido] lectura:",
        error instanceof Error ? error.message : error,
      );
    }

    return mapa;
  },
);

/**
 * Superpone el jsonb de la base sobre el respaldo en código.
 *
 * Reglas:
 *   · Solo se copian claves que EXISTEN en el respaldo (el código manda sobre
 *     la forma; una clave inesperada del panel no puede romper un componente).
 *   · Las cadenas vacías o en blanco no sustituyen: se lee mejor el texto de
 *     respaldo que un hueco.
 *   · Los arreglos se reemplazan ENTEROS o no se reemplazan. Mezclar elemento
 *     a elemento produciría listas de largo distinto y frases descolocadas.
 *   · Los objetos anidados se fusionan en profundidad (`heroes.listados`).
 */
function fusionar<T extends Record<string, unknown>>(
  respaldo: T,
  valor: Record<string, unknown> | undefined,
): T {
  if (!valor) return respaldo;

  const salida: Record<string, unknown> = { ...respaldo };

  for (const [clave, base] of Object.entries(respaldo)) {
    const nuevo = valor[clave];
    if (nuevo === undefined || nuevo === null) continue;

    if (typeof base === "string") {
      if (typeof nuevo === "string" && nuevo.trim()) salida[clave] = nuevo.trim();
      continue;
    }

    if (typeof base === "number") {
      if (typeof nuevo === "number" && Number.isFinite(nuevo)) {
        salida[clave] = nuevo;
      }
      continue;
    }

    if (typeof base === "boolean") {
      if (typeof nuevo === "boolean") salida[clave] = nuevo;
      continue;
    }

    if (Array.isArray(base)) {
      if (Array.isArray(nuevo) && nuevo.length > 0) salida[clave] = nuevo;
      continue;
    }

    if (base && typeof base === "object") {
      if (nuevo && typeof nuevo === "object" && !Array.isArray(nuevo)) {
        salida[clave] = fusionar(
          base as Record<string, unknown>,
          nuevo as Record<string, unknown>,
        );
      }
    }
  }

  return salida as T;
}

/** Getter genérico: lee la fila, la fusiona con el respaldo y la devuelve. */
async function obtener<T extends Record<string, unknown>>(
  clave: ClaveContenido,
  respaldo: T,
): Promise<T> {
  const filas = await leerContenido();
  return fusionar(respaldo, filas.get(clave));
}

/* ===========================================================================
 * Getters del contenido editable
 * ======================================================================== */

export const getHero = cache(() => obtener("home.hero", RESPALDO_HERO));
export const getIntro = cache(() => obtener("home.intro", RESPALDO_INTRO));
export const getSeccionCabanas = cache(() =>
  obtener("home.cabanas", RESPALDO_CABANAS),
);
export const getSeccionPlanes = cache(() =>
  obtener("home.planes", RESPALDO_PLANES),
);
export const getSeccionExperiencias = cache(() =>
  obtener("home.experiencias", RESPALDO_EXPERIENCIAS),
);
export const getEsencia = cache(() => obtener("home.esencia", RESPALDO_ESENCIA));
export const getReconocimiento = cache(() =>
  obtener("home.reconocimiento", RESPALDO_RECONOCIMIENTO),
);
export const getTestimonios = cache(() =>
  obtener("home.testimonios", RESPALDO_TESTIMONIOS),
);
export const getCtaFinal = cache(() =>
  obtener("home.cta_final", RESPALDO_CTA_FINAL),
);
export const getContacto = cache(() =>
  obtener("sitio.contacto", RESPALDO_CONTACTO),
);
export const getSeoSitio = cache(() => obtener("sitio.seo", RESPALDO_SEO));
export const getHeroesListados = cache(() =>
  obtener("heroes.listados", RESPALDO_HEROES),
);
export const getContenidoExperiencias = cache(() =>
  obtener("experiencias", RESPALDO_EXPERIENCIAS_PAGINA),
);
export const getFaq = cache(() => obtener("faq", RESPALDO_FAQ));
export const getLugar = cache(() => obtener("lugar", RESPALDO_LUGAR));
export const getGaleria = cache(() => obtener("galeria", RESPALDO_GALERIA));
export const getReservar = cache(() => obtener("reservar", RESPALDO_RESERVAR));
export const getNoEncontrado = cache(() =>
  obtener("no_encontrado", RESPALDO_NO_ENCONTRADO),
);

/* ===========================================================================
 * Catálogo: cabañas, planes, tarifas y extras
 * ======================================================================== */

/** Tarifa de un plan concreto para una cabaña concreta. */
export type TarifaDePlan = {
  plan: Plan;
  precio_noche: number;
  /** Días ISO en los que aplica (1 = lunes). `null` = todos. */
  dias_semana: number[] | null;
};

export type AlojamientoPublico = Alojamiento & {
  galeria: ImagenGaleria[];
  /** Tarifas base ordenadas por el orden de los planes. */
  tarifas: TarifaDePlan[];
  /** Precio más bajo publicado, para el "desde". `null` si no hay tarifas. */
  precio_desde: number | null;
};

const COLUMNAS_ALOJAMIENTO =
  "id, nombre, slug, descripcion, capacidad, amenidades, orden, activo, created_at";

/** Galerías de todas las cabañas, agrupadas por `alojamiento_id`. */
const getGaleriasPorAlojamiento = cache(
  async (): Promise<Map<string, ImagenGaleria[]>> => {
    const agrupadas = new Map<string, ImagenGaleria[]>();

    try {
      const supabase = crearClientePublico();
      const { data, error } = await supabase
        .from("imagenes")
        .select("alojamiento_id, url, alt, orden")
        .not("alojamiento_id", "is", null)
        .order("orden", { ascending: true });

      if (error) {
        console.error("[contenido] galerías:", error.message);
        return agrupadas;
      }

      for (const fila of data ?? []) {
        if (!fila.alojamiento_id) continue;
        const lista = agrupadas.get(fila.alojamiento_id) ?? [];
        lista.push({ url: fila.url, alt: fila.alt ?? "" });
        agrupadas.set(fila.alojamiento_id, lista);
      }
    } catch (error) {
      console.error(
        "[contenido] galerías:",
        error instanceof Error ? error.message : error,
      );
    }

    return agrupadas;
  },
);

export const getPlanes = cache(async (): Promise<Plan[]> => {
  try {
    const supabase = crearClientePublico();
    const { data, error } = await supabase
      .from("planes")
      .select("id, nombre, descripcion, incluye, orden, activo")
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (error) {
      console.error("[contenido] planes:", error.message);
      return [];
    }
    return (data ?? []) as Plan[];
  } catch (error) {
    console.error(
      "[contenido] planes:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
});

/** Tarifas base (sin vigencia) agrupadas por cabaña. */
const getTarifasPorAlojamiento = cache(
  async (): Promise<Map<string, TarifaDePlan[]>> => {
    const agrupadas = new Map<string, TarifaDePlan[]>();

    const [planes, filas] = await Promise.all([
      getPlanes(),
      (async () => {
        try {
          const supabase = crearClientePublico();
          const { data, error } = await supabase
            .from("tarifas")
            .select("alojamiento_id, plan_id, precio_noche, dias_semana, vigencia")
            .is("vigencia", null);

          if (error) {
            console.error("[contenido] tarifas:", error.message);
            return [];
          }
          return data ?? [];
        } catch (error) {
          console.error(
            "[contenido] tarifas:",
            error instanceof Error ? error.message : error,
          );
          return [];
        }
      })(),
    ]);

    const planesPorId = new Map(planes.map((plan) => [plan.id, plan]));

    for (const fila of filas) {
      const plan = planesPorId.get(fila.plan_id);
      if (!plan || !fila.alojamiento_id) continue;
      const lista = agrupadas.get(fila.alojamiento_id) ?? [];
      lista.push({
        plan,
        precio_noche: fila.precio_noche,
        dias_semana: fila.dias_semana,
      });
      agrupadas.set(fila.alojamiento_id, lista);
    }

    for (const lista of agrupadas.values()) {
      lista.sort((a, b) => a.plan.orden - b.plan.orden);
    }

    return agrupadas;
  },
);

export const getAlojamientos = cache(
  async (): Promise<AlojamientoPublico[]> => {
    let filas: Alojamiento[] = [];

    try {
      const supabase = crearClientePublico();
      const { data, error } = await supabase
        .from("alojamientos")
        .select(COLUMNAS_ALOJAMIENTO)
        .eq("activo", true)
        .order("orden", { ascending: true });

      if (error) {
        console.error("[contenido] alojamientos:", error.message);
        return [];
      }
      filas = (data ?? []) as Alojamiento[];
    } catch (error) {
      console.error(
        "[contenido] alojamientos:",
        error instanceof Error ? error.message : error,
      );
      return [];
    }

    const [galerias, tarifas] = await Promise.all([
      getGaleriasPorAlojamiento(),
      getTarifasPorAlojamiento(),
    ]);

    return filas.map((fila) => {
      const suTarifas = tarifas.get(fila.id) ?? [];
      const precios = suTarifas.map((t) => t.precio_noche);
      return {
        ...fila,
        amenidades: fila.amenidades ?? [],
        galeria: galerias.get(fila.id) ?? [],
        tarifas: suTarifas,
        precio_desde: precios.length ? Math.min(...precios) : null,
      };
    });
  },
);

export const getAlojamientoPorSlug = cache(
  async (slug: string): Promise<AlojamientoPublico | null> => {
    const todos = await getAlojamientos();
    return todos.find((alojamiento) => alojamiento.slug === slug) ?? null;
  },
);

export const getExtras = cache(async (): Promise<Extra[]> => {
  try {
    const supabase = crearClientePublico();
    const { data, error } = await supabase
      .from("extras")
      .select("id, tipo, nombre, descripcion, precio, imagen_url, activo, orden")
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (error) {
      console.error("[contenido] extras:", error.message);
      return [];
    }
    return (data ?? []) as Extra[];
  } catch (error) {
    console.error(
      "[contenido] extras:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
});

export const getExperiencias = cache(async (): Promise<Extra[]> => {
  const extras = await getExtras();
  return extras.filter((extra) => extra.tipo === "experiencia");
});

/** Precio más bajo publicado en todo el hotel: el "desde" de la portada. */
export const getPrecioDesde = cache(async (): Promise<number | null> => {
  const alojamientos = await getAlojamientos();
  const precios = alojamientos
    .map((alojamiento) => alojamiento.precio_desde)
    .filter((precio): precio is number => typeof precio === "number");
  return precios.length ? Math.min(...precios) : null;
});

/**
 * Precio de un plan a lo largo de todas las cabañas.
 *
 * Hoy todas las cabañas comparten precio, pero el modelo permite que difieran:
 * si difieren, la portada muestra el más bajo con un "desde".
 */
export type PlanConPrecio = {
  plan: Plan;
  precio_minimo: number | null;
  /** `true` si no todas las cabañas cobran lo mismo por este plan. */
  varia: boolean;
};

export const getPlanesConPrecio = cache(async (): Promise<PlanConPrecio[]> => {
  const [planes, alojamientos] = await Promise.all([
    getPlanes(),
    getAlojamientos(),
  ]);

  return planes.map((plan) => {
    const precios = alojamientos
      .flatMap((alojamiento) => alojamiento.tarifas)
      .filter((tarifa) => tarifa.plan.id === plan.id)
      .map((tarifa) => tarifa.precio_noche);

    return {
      plan,
      precio_minimo: precios.length ? Math.min(...precios) : null,
      varia: new Set(precios).size > 1,
    };
  });
});

/* ===========================================================================
 * Fechas de última modificación (para el `lastmod` del sitemap)
 * ======================================================================== */

export type UltimaModificacion = {
  /** Por slug de cabaña. */
  alojamientos: Map<string, Date>;
  alojamientosMasReciente: Date | null;
  extras: Date | null;
  contenido: Date | null;
};

function aFechaONulo(valor: unknown): Date | null {
  if (typeof valor !== "string") return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function masReciente(...fechas: (Date | null | undefined)[]): Date | null {
  const validas = fechas.filter((f): f is Date => f instanceof Date);
  if (!validas.length) return null;
  return new Date(Math.max(...validas.map((f) => f.getTime())));
}

export const getUltimaModificacion = cache(
  async (): Promise<UltimaModificacion> => {
    const vacio: UltimaModificacion = {
      alojamientos: new Map(),
      alojamientosMasReciente: null,
      extras: null,
      contenido: null,
    };

    try {
      const supabase = crearClientePublico();
      const [alojamientos, tarifas, extras, contenido] = await Promise.all([
        supabase
          .from("alojamientos")
          .select("id, slug, created_at")
          .eq("activo", true),
        supabase.from("tarifas").select("alojamiento_id, created_at"),
        supabase.from("extras").select("id").eq("activo", true).limit(1),
        supabase.from("contenido").select("actualizado_at"),
      ]);

      const porAlojamiento = new Map<string, Date>();
      for (const fila of tarifas.data ?? []) {
        const fecha = aFechaONulo(fila.created_at);
        if (!fecha || !fila.alojamiento_id) continue;
        const actual = porAlojamiento.get(fila.alojamiento_id);
        porAlojamiento.set(
          fila.alojamiento_id,
          masReciente(actual, fecha) ?? fecha,
        );
      }

      const porSlug = new Map<string, Date>();
      for (const fila of alojamientos.data ?? []) {
        const fecha = masReciente(
          aFechaONulo(fila.created_at),
          porAlojamiento.get(fila.id),
        );
        if (fecha) porSlug.set(fila.slug, fecha);
      }

      const fechaContenido = masReciente(
        ...(contenido.data ?? []).map((fila) =>
          aFechaONulo(fila.actualizado_at),
        ),
      );

      return {
        alojamientos: porSlug,
        alojamientosMasReciente: masReciente(...porSlug.values()),
        /* `extras` no guarda fecha de actualización; su contenido lo edita el
           panel a través de la tabla `contenido`, así que se usa esa. */
        extras: extras.error ? null : fechaContenido,
        contenido: fechaContenido,
      };
    } catch (error) {
      console.error(
        "[contenido] última modificación:",
        error instanceof Error ? error.message : error,
      );
      return vacio;
    }
  },
);

/* ===========================================================================
 * Utilidades
 * ======================================================================== */

/** Portada de una galería, con respaldo seguro si viene vacía. */
export function portada(
  galeria: ImagenGaleria[],
  altRespaldo: string,
): ImagenGaleria {
  return (
    galeria[0] ?? {
      url: medio("cabanas/cabanas-25.webp"),
      alt: altRespaldo,
    }
  );
}
