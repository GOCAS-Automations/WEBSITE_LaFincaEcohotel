-- ============================================================================
-- SEED 002 — Contenido del sitio, galerías de las cabañas y descripciones
--
-- ORIGEN DE LOS TEXTOS: `docs/CONTENIDO_ACTUAL.md` (extraído del sitio en
-- producción lafincaecohotel.com). Las URLs de las fotos salen de
-- `supabase/seed/imagenes-manifest.json` (91 archivos ya en el bucket público
-- `imagenes`).
--
-- EL CONTRATO DE ESTAS CLAVES ESTÁ EN `docs/CMS_CLAVES.md`. Si aquí se añade
-- una clave, allí también: ese documento es lo que usa el panel administrativo.
--
-- IDEMPOTENTE: se puede re-ejecutar. `on conflict ... do update` actualiza en
-- vez de duplicar.
--
-- ⚠ OJO CUANDO EL PANEL ESTÉ EN LÍNEA: volver a correr este archivo SOBREESCRIBE
--   lo que el cliente haya editado desde el panel. A partir de ese momento este
--   seed es solo para reconstruir la base desde cero, no para desplegar.
--
-- Todos estos textos tienen su gemelo como respaldo en `src/lib/contenido.ts`:
-- si la base no responde durante el build, el sitio publica igual.
-- ============================================================================

set search_path to public, extensions;

-- ----------------------------------------------------------------------------
-- CONTENIDO EDITABLE DEL SITIO
-- ----------------------------------------------------------------------------
insert into contenido (clave, valor) values

-- --- Datos de contacto, redes y RNT ----------------------------------------
('sitio.contacto', $json${
  "whatsapp": "573160476671",
  "whatsapp_visible": "+57 316 047 6671",
  "mensaje_whatsapp": "¡Hola! Vengo del sitio web de La Finca Eco Hotel y me gustaría recibir más información sobre las opciones de hospedaje y disponibilidad. ✨",
  "correo": "",
  "direccion": "Km 18 vía Cali–Buenaventura, Vereda Loma Alta",
  "ciudad": "Cali",
  "region": "Valle del Cauca",
  "pais": "Colombia",
  "direccion_completa": "Km 18 vía Cali–Buenaventura, Vereda Loma Alta, Valle del Cauca, Colombia",
  "horario_restaurante": "8:00 a. m. – 11:00 p. m., todos los días",
  "rnt": "114565",
  "instagram": "https://www.instagram.com/lafinca_cali/",
  "instagram_usuario": "@lafinca_cali",
  "facebook": "https://www.facebook.com/share/1Pz1wCY8af/?mibextid=JRoKGi",
  "tiktok": "https://www.tiktok.com/@lafincacali",
  "tiktok_usuario": "@lafincacali",
  "mapa_url": "https://www.google.com/maps/search/?api=1&query=La+Finca+Eco+Hotel+Km+18+v%C3%ADa+Cali+Buenaventura",
  "mapa_embed": "https://maps.google.com/maps?q=La%20Finca%20Eco%20Hotel%20Km%2018%20v%C3%ADa%20Cali%20Buenaventura&t=&z=13&ie=UTF8&iwloc=&output=embed"
}$json$::jsonb),

-- --- SEO del sitio ----------------------------------------------------------
('sitio.seo', $json${
  "titulo": "La Finca Eco Hotel — Cabañas en el bosque de niebla cerca de Cali",
  "descripcion": "Ecohotel de montaña a 45 minutos de Cali, en el Km 18 vía Buenaventura. Cabañas para dos con jacuzzi, turco, piscina, restaurante y senderos.",
  "palabras_clave": [
    "ecohotel cerca de Cali",
    "cabañas con jacuzzi Valle del Cauca",
    "hotel Km 18 vía Buenaventura",
    "bosque de niebla Cali",
    "cabañas para parejas cerca de Cali"
  ],
  "imagen": {
    "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/sitio/home/banner-img-1075-baja-2.webp",
    "alt": "La Finca Eco Hotel, cabañas en el bosque de niebla del Valle del Cauca",
    "ancho": 1200,
    "alto": 630
  }
}$json$::jsonb),

-- --- Portada: hero ----------------------------------------------------------
('home.hero', $json${
  "antetitulo": "Ecohotel en el Valle del Cauca",
  "titulo": "Sumérgete en un bosque rodeado de neblina y aves",
  "subtitulo": "Somos un paraíso escondido en el Valle del Cauca a tan solo 45 minutos de Cali.",
  "parrafo": "Sumérgete en la esencia de la finca colombiana rodeado de bosque, neblina y aves. Disfruta de la comodidad y confort en un entorno de tranquilidad y serenidad.",
  "cta_texto": "Reservar ahora",
  "cta_href": "/reservar",
  "cta_secundario_texto": "Descubre nuestro paraíso",
  "cta_secundario_href": "/el-lugar",
  "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-1075.webp",
  "imagen_movil": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/sitio/home/banner-principal-home-movil-11.webp",
  "imagen_alt": "Cabañas de techo azul de La Finca Eco Hotel sobre la ladera, entre hortensias y bosque de montaña"
}$json$::jsonb),

-- --- Portada: presentación --------------------------------------------------
('home.intro', $json${
  "antetitulo": "Bienvenidos",
  "titulo": "Un bosque de niebla a 45 minutos de Cali",
  "parrafos": [
    "La Finca es un ecohotel de montaña en el Km 18 de la vía Cali–Buenaventura, en la Vereda Loma Alta. Aquí el día empieza con la neblina entre los árboles y el canto de las aves que habitan la reserva.",
    "Son pocas cabañas, pensadas para dos personas, con cama doble, baño privado y vista a la montaña. Pocas cabañas significan silencio, privacidad y una atención que se nota."
  ],
  "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-5389.webp",
  "imagen_alt": "Huésped en el deck de La Finca junto a una hamaca, con el bosque y la montaña al fondo",
  "datos": [
    { "valor": "45 min", "etiqueta": "desde Cali" },
    { "valor": "5", "etiqueta": "cabañas para dos" },
    { "valor": "18 °C", "etiqueta": "clima de montaña" }
  ]
}$json$::jsonb),

-- --- Portada: encabezado de cabañas ----------------------------------------
('home.cabanas', $json${
  "antetitulo": "Alojamiento",
  "titulo": "Nuestras cabañas",
  "descripcion": "Cabañas independientes para dos, con cama doble, baño privado y vista a la montaña. Algunas con jacuzzi privado.",
  "cta_texto": "Ver todas las cabañas",
  "cta_href": "/alojamientos"
}$json$::jsonb),

-- --- Portada: encabezado de planes -----------------------------------------
('home.planes', $json${
  "antetitulo": "Detalles & Tarifas",
  "titulo": "Elige tu plan",
  "descripcion": "La estadía se reserva por plan, no por cabaña: eliges el nivel de servicio que quieres y lo disfrutas en la cabaña que prefieras.",
  "nota": "Tarifas referenciales para temporada baja. Pueden variar según temporada, festivos y alta demanda.",
  "cta_texto": "Reservar ahora",
  "cta_href": "/reservar"
}$json$::jsonb),

-- --- Portada: encabezado de experiencias -----------------------------------
('home.experiencias', $json${
  "antetitulo": "Experiencias",
  "titulo": "Celebra en medio del bosque",
  "descripcion": "Añade una experiencia a tu reserva y encuentra la cabaña lista: decoración, torta, vino y fotos para que la fecha quede marcada.",
  "cta_texto": "Ver experiencias",
  "cta_href": "/experiencias"
}$json$::jsonb),

-- --- Portada: esencia / naturaleza -----------------------------------------
('home.esencia', $json${
  "antetitulo": "Naturaleza",
  "titulo": "Encontramos un bosque de neblina",
  "parrafos": [
    "Estamos dentro de una reserva natural: por eso los carros se quedan en el parqueadero externo y el bosque se recorre a pie. Es la forma de proteger a las especies que viven aquí.",
    "El clima es frío, con mínimas de 18 grados, y días templados que invitan a caminar por los senderos, quedarse en el deck o simplemente escuchar."
  ],
  "imagenes": [
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-6088.webp",
      "alt": "Camino de tierra entre guaduas y helechos en la reserva de La Finca"
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-5568.webp",
      "alt": "Huésped apoyada en la baranda de un mirador, mirando el bosque de niebla"
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-5569.webp",
      "alt": "Sendero de piedra iluminado entre los helechos del bosque de La Finca"
    }
  ]
}$json$::jsonb),

-- --- Portada: reconocimiento COP16 ------------------------------------------
('home.reconocimiento', $json${
  "antetitulo": "Reconocimientos",
  "titulo": "Somos COP16",
  "parrafos": [
    "Somos COP16 y, junto con la Cámara de Comercio de Cali, nos preparamos para este evento donde mostramos la mejor imagen de nuestra región al mundo entero.",
    "La COP16 —la Conferencia de las Partes sobre Diversidad Biológica— se celebró en Cali, y La Finca hizo parte de la vitrina del Valle del Cauca."
  ],
  "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/sitio/reconocimientos/somos-cop-16-mesa-de-trabajo-1.webp",
  "imagen_alt": "Camino entre hortensias hacia las cabañas de La Finca, con el bosque de niebla al fondo",
  "cta_texto": "Reservar ahora",
  "cta_href": "/reservar"
}$json$::jsonb),

-- --- Portada: testimonios reales --------------------------------------------
('home.testimonios', $json${
  "antetitulo": "Testimonios",
  "titulo": "Lo que cuentan quienes ya vinieron",
  "items": [
    {
      "texto": "Excelente experiencia! Un lugar hermoso, tranquilo, agradable, excelente atención por parte del anfitrión y en el restaurante. La comida es deliciosa, a tiempo y variada y calientica. El clima es delicioso y te brindan las comodidades para sentirte a gusto.",
      "autor": "Angela Buitrago Schonhobel"
    },
    {
      "texto": "El mejor lugar para desconectar! Excelente atención de parte de Nicolás & Jackeline hacen que la estadía sea placentera y no tengamos que preocuparnos por nada.",
      "autor": "Sebastian Rojas T."
    },
    {
      "texto": "Me encantó, disfrute mucho la estadía, excelente servicio, el paisaje increíble, se respira paz y tranquilidad.",
      "autor": "Laura Melissa Sanchez Serna"
    },
    {
      "texto": "En general todo estuvo muy bien, la atención y el servicio, un lugar bastante privado, ya que son pocas cabañas, es un lugar que sirve perfectamente para salir del caos de la ciudad.",
      "autor": "Diana Sandoval Cepeda"
    },
    {
      "texto": "Bellísimo lugar, cabañas preciosas, acogedoras y decoradas con muy buen gusto; cuidan cada detalle. El personal super amable, comida deliciosa. Es el sitio ideal para una desconexión total.",
      "autor": "Liliana Aranzazu"
    },
    {
      "texto": "Excelente atención, son muy amables y atentos desde el primer momento de llegada, la comida es exquisita generosas porciones e increíble sazón, un espacio lleno de naturaleza y clima agradable.",
      "autor": "Mariana Rios"
    }
  ]
}$json$::jsonb),

-- --- Portada: llamada final -------------------------------------------------
('home.cta_final', $json${
  "titulo": "¿Necesitas más razones para reservar?",
  "texto": "Escríbenos y te ayudamos a elegir la cabaña, el plan y la fecha. Respondemos por WhatsApp todos los días.",
  "cta_texto": "Reservar ahora",
  "cta_href": "/reservar",
  "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/sitio/home/pw-finca-landing-banner-1-mesa-de-trabajo-1-copia-10.webp",
  "imagen_alt": "Camino iluminado hacia la casa principal de La Finca, envuelto en la neblina del atardecer"
}$json$::jsonb),

-- --- Cabeceras de las páginas internas --------------------------------------
('heroes.listados', $json${
  "alojamientos": {
    "titulo": "Nuestras cabañas",
    "subtitulo": "Cabañas independientes para dos, con cama doble, baño privado y vista a la montaña.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/cabanas/cabanas-25.webp",
    "imagen_alt": "Habitación de una cabaña de La Finca con cama doble y ventanal hacia la terraza y el bosque"
  },
  "experiencias": {
    "titulo": "Experiencias",
    "subtitulo": "Celebraciones listas al llegar: aniversarios, cumpleaños, picnic y veladas en medio del bosque.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-6086.webp",
    "imagen_alt": "Pareja compartiendo una botella de vino sobre el piso alfombrado de una cabaña de madera"
  },
  "el_lugar": {
    "titulo": "El lugar",
    "subtitulo": "Una reserva natural en el Km 18, con zona húmeda, piscina, restaurante y senderos.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/37.png",
    "imagen_alt": "Deck techado de La Finca con bancas de madera y vista al valle entre nubes"
  },
  "galeria": {
    "titulo": "Galería",
    "subtitulo": "El bosque, las cabañas y los rincones de La Finca en imágenes.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-53970.webp",
    "imagen_alt": "Camino iluminado entre la neblina de la noche en La Finca, con las farolas encendidas"
  },
  "faq": {
    "titulo": "Preguntas frecuentes",
    "subtitulo": "Lo que más nos preguntan antes de llegar: ubicación, clima, mascotas, niños y servicios.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-6088.webp",
    "imagen_alt": "Camino de tierra entre guaduas y helechos en la reserva de La Finca"
  },
  "contacto": {
    "titulo": "Contacto",
    "subtitulo": "Escríbenos por WhatsApp: resolvemos dudas y confirmamos disponibilidad el mismo día.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-6087.webp",
    "imagen_alt": "Hortensias y bebedero de colibríes en los jardines de La Finca, con la montaña al fondo"
  },
  "reservar": {
    "titulo": "Reserva tu estadía",
    "subtitulo": "Elige cabaña y plan, y confirmamos tu fecha por WhatsApp en pocos minutos.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/cabanas/cabanas-28.webp",
    "imagen_alt": "Terraza de una cabaña de La Finca con hamaca, mesa para dos y vista al bosque"
  }
}$json$::jsonb),

-- --- Página de experiencias: intro y experiencias sin precio publicado ------
('experiencias', $json${
  "intro": "Preparamos la cabaña antes de que llegues: decoración, torta, vino y los detalles de la celebración listos. Se añaden a tu reserva.",
  "adicionales_titulo": "Otras experiencias",
  "adicionales_descripcion": "También armamos estos planes a pedido. Escríbenos y te contamos qué incluye cada uno y cuánto cuesta.",
  "adicionales": [
    {
      "nombre": "Picnic en el bosque",
      "descripcion": "Mantel, canasta, cojines y una mesa baja montados en el pasto, frente a la montaña.",
      "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/experiencias/experiencia-picnic-30.webp",
      "imagen_alt": "Picnic montado sobre un mantel de cuadros rojos con canasta, pan y flores"
    },
    {
      "nombre": "Velada romántica",
      "descripcion": "Cena servida en una mesa decorada, con vino, flores y farol, solo para ustedes dos.",
      "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/experiencias/experiencia-velada-30.webp",
      "imagen_alt": "Mesa para dos servida con cena, vino tinto, rosas y farol para una velada romántica"
    }
  ]
}$json$::jsonb),

-- --- Preguntas frecuentes (las 11 del sitio actual) -------------------------
-- NOTA: la respuesta original decía "6 cabañas" mientras el resto del sitio
-- muestra 5. Se publica sin la cifra para que el sitio no se contradiga.
-- TODO confirmar con el cliente cuántas cabañas hay realmente.
('faq', $json${
  "intro": "Si tu pregunta no está aquí, escríbenos por WhatsApp: respondemos todos los días.",
  "items": [
    {
      "pregunta": "¿Dónde estamos ubicados?",
      "respuesta": "Nos encontramos en el km 18, vía Cali–Buenaventura, Vereda Loma Alta, a aproximadamente 45 minutos al oeste de Cali."
    },
    {
      "pregunta": "¿Tienen zona de parqueadero?",
      "respuesta": "Sí, contamos con un parqueadero externo vigilado las 24 horas. Por estar en una reserva natural, no se permite el ingreso de vehículos a La Finca, con el propósito de proteger a las especies que habitan el lugar."
    },
    {
      "pregunta": "¿Cómo es el clima?",
      "respuesta": "Estamos ubicados en un bosque de niebla del Valle del Cauca, lo que nos brinda un clima frío con temperaturas mínimas de 18 grados centígrados. Sin embargo, también disfrutamos de días templados."
    },
    {
      "pregunta": "¿Cuentan con restaurante?",
      "respuesta": "Sí, ofrecemos servicio de restaurante todos los días de 8:00 a. m. a 11:00 p. m."
    },
    {
      "pregunta": "¿Permiten el ingreso de mascotas?",
      "respuesta": "¡Por supuesto! Las mascotas son bienvenidas en todas nuestras áreas. Solo pedimos que sus cuidadores sean responsables, para garantizar la seguridad y comodidad tanto de las mascotas como de los demás huéspedes."
    },
    {
      "pregunta": "¿Tienen cabañas para familias grandes?",
      "respuesta": "Nuestras cabañas están diseñadas principalmente para parejas: cada una tiene capacidad para 2 personas."
    },
    {
      "pregunta": "¿Permiten niños?",
      "respuesta": "Sí, los niños son bienvenidos. Sin embargo, ten en cuenta que nuestras instalaciones y experiencias están enfocadas principalmente en adultos y parejas."
    },
    {
      "pregunta": "¿Cada cabaña tiene zona húmeda privada?",
      "respuesta": "Algunas de nuestras cabañas cuentan con jacuzzi privado. Además, ofrecemos una zona húmeda social disponible para todos los huéspedes."
    },
    {
      "pregunta": "¿Cuentan con pasadía?",
      "respuesta": "Actualmente no ofrecemos servicio de pasadía."
    },
    {
      "pregunta": "¿Se pueden realizar eventos en sus instalaciones?",
      "respuesta": "Sí, disponemos de un salón multifuncional ideal para retiros, cumpleaños y reuniones empresariales, con capacidad máxima para 30 personas."
    },
    {
      "pregunta": "¿Hay zonas para hacer deporte?",
      "respuesta": "En los alrededores se pueden realizar caminatas. Sin embargo, no está permitido ingresar al bosque para actividades como senderismo, con el fin de preservar el entorno natural."
    }
  ]
}$json$::jsonb),

-- --- Página "El lugar" ------------------------------------------------------
('lugar', $json${
  "antetitulo": "Sobre nosotros",
  "titulo": "Una finca colombiana dentro de una reserva natural",
  "parrafos": [
    "La Finca Eco Hotel está en el Km 18 de la vía Cali–Buenaventura, en la Vereda Loma Alta, dentro de un bosque de niebla del Valle del Cauca. Se llega en unos 45 minutos desde Cali y, apenas se sube, el clima cambia: entra el frío, la neblina y el sonido de las aves.",
    "El lugar se pensó al revés de un hotel grande: pocas cabañas, mucho bosque y un equipo pequeño que conoce a cada huésped por su nombre. Nicolás y Jackeline reciben personalmente a quienes llegan.",
    "Cuidar la reserva es parte del plan. Los vehículos se quedan en el parqueadero externo y el bosque solo se recorre por los senderos habilitados, para no alterar a las especies que viven aquí."
  ],
  "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/sitio/home/banner-img-1075-baja-4.webp",
  "imagen_alt": "Las cabañas de techo azul de La Finca sobre la ladera, entre hortensias y bosque de montaña",
  "instalaciones_titulo": "Instalaciones",
  "instalaciones_descripcion": "Todo lo que está incluido con tu estadía, además de la cabaña.",
  "instalaciones": [
    {
      "nombre": "Zona húmeda",
      "descripcion": "Jacuzzi y turco de uso social para todos los huéspedes. Algunas cabañas, además, tienen jacuzzi privado.",
      "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-6091.webp",
      "imagen_alt": "Huéspedes en el jacuzzi social de La Finca, con el bosque de montaña al fondo"
    },
    {
      "nombre": "Piscina y decks",
      "descripcion": "Piscina y decks de madera con vista a la montaña, abiertos durante toda la estadía.",
      "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-5390.webp",
      "imagen_alt": "Escaleras que bajan a la piscina de La Finca, rodeadas de jardines y con vista al bosque"
    },
    {
      "nombre": "Restaurante",
      "descripcion": "Servicio todos los días de 8:00 a. m. a 11:00 p. m. Desayuno incluido en los tres planes, y carta para almuerzo y cena.",
      "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/lugar/restaurante-24.webp",
      "imagen_alt": "Comedor del restaurante de La Finca con mesas de madera y ventanales hacia el bosque"
    },
    {
      "nombre": "Salón multifuncional",
      "descripcion": "Espacio para retiros, cumpleaños y reuniones empresariales, con capacidad máxima para 30 personas.",
      "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/lugar/salon-la-finca-24.webp",
      "imagen_alt": "Salón techado y abierto de La Finca, con bancas y vista al valle entre nubes"
    },
    {
      "nombre": "Senderos",
      "descripcion": "Caminos habilitados para recorrer el bosque de niebla y avistar las aves de la reserva.",
      "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-5569.webp",
      "imagen_alt": "Sendero de piedra entre los helechos del bosque de niebla de La Finca"
    },
    {
      "nombre": "Fogata",
      "descripcion": "Al caer la tarde encendemos la fogata en el deck. Los planes Entre Semana y Premium incluyen los pinchos de masmelos.",
      "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-53920.webp",
      "imagen_alt": "Huéspedes abrigados frente a una fogata encendida en el deck del bosque"
    }
  ],
  "llegar_titulo": "Cómo llegar",
  "llegar_parrafos": [
    "Desde Cali se toma la vía a Buenaventura y se sube hasta el Km 18. Son unos 45 minutos en carro desde el occidente de la ciudad.",
    "Al llegar, el vehículo se deja en el parqueadero externo vigilado y el ingreso a las cabañas se hace a pie: estamos dentro de una reserva natural y no permitimos el ingreso de carros para proteger a las especies del bosque."
  ],
  "llegar_indicaciones": [
    "Km 18, vía Cali–Buenaventura, Vereda Loma Alta (Valle del Cauca).",
    "Aproximadamente 45 minutos desde Cali.",
    "Parqueadero externo vigilado 24 horas.",
    "Si vienes en transporte público o taxi, escríbenos por WhatsApp y te damos el punto exacto de llegada."
  ]
}$json$::jsonb),

-- --- Galería general (las 31 fotos de la carpeta `galeria/`) ----------------
-- Ordenadas por resolución: las diez últimas vienen del WordPress actual a
-- 225×300 px. TODO reemplazarlas cuando llegue la carpeta en alta calidad.
('galeria', $json${
  "intro": "El bosque, las cabañas y las zonas sociales de La Finca, tal como las encuentran nuestros huéspedes.",
  "imagenes": [
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-1075.webp", "alt": "Vista de las cabañas de techo azul de La Finca sobre la ladera, entre hortensias" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/37.png", "alt": "Deck techado de La Finca con bancas de madera y vista al valle entre nubes" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/41.png", "alt": "Comedor del restaurante de La Finca con mesas de madera y ventanales hacia la niebla" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-5389.webp", "alt": "Huésped en el deck junto a una hamaca, con el bosque y el cielo despejado al fondo" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-5390.webp", "alt": "Escaleras que bajan a la piscina de La Finca, rodeadas de jardines" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-5391.webp", "alt": "Huésped y su perro en el jacuzzi al aire libre, con la montaña detrás" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-5394.webp", "alt": "Huésped en bata en la terraza de una cabaña, mirando el bosque de montaña" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-53920.webp", "alt": "Pareja abrigada frente a una fogata encendida en el deck del bosque" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-53950.webp", "alt": "Pareja en bata junto a la fogata de noche, con copas de vino y masmelos" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-53960.webp", "alt": "Picnic sobre el pasto con canasta, vino y farol, frente a la vista del valle" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-53970.webp", "alt": "Pareja abrazada entre la neblina de la noche, junto a las farolas del camino" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-5567.webp", "alt": "Huésped junto a una hamaca en la terraza, envuelta en la neblina" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-5568.webp", "alt": "Huésped apoyada en la baranda de un mirador, mirando el bosque de niebla" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-5569.webp", "alt": "Sendero de piedra entre los helechos del bosque de niebla de La Finca" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-6086.webp", "alt": "Pareja compartiendo una botella de vino en el piso alfombrado de una cabaña de madera" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-6087.webp", "alt": "Huésped junto a las hortensias y el bebedero de colibríes, con la montaña al fondo" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-6088.webp", "alt": "Camino de tierra entre guaduas y helechos en la reserva de La Finca" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-6089.webp", "alt": "Huésped con ruana mirando el bosque desde una baranda de La Finca" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-6091.webp", "alt": "Huéspedes en el jacuzzi social de La Finca, con el bosque de montaña al fondo" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/img-4424.webp", "alt": "Perro cocker spaniel sentado en el deck techado, con el valle detrás" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/49.png", "alt": "Jacuzzi encendido de noche, con toallas dobladas y una mesa iluminada al lado" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/fotos-landing-mesa-de-trabajo-1.webp", "alt": "Huésped con ruana fucsia mirando el bosque desde la baranda" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/fotos-landing-mesa-de-trabajo-1-copia.webp", "alt": "Huésped caminando por el camino de tierra que cruza la reserva" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/fotos-landing-mesa-de-trabajo-1-copia-2.webp", "alt": "Huésped sonriendo junto a las hortensias del jardín, con la montaña al fondo" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/fotos-landing-mesa-de-trabajo-1-copia-3.webp", "alt": "Pareja sentada en el piso de una cabaña de madera con una mesita y copas" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/fotos-landing-mesa-de-trabajo-1-copia-4.webp", "alt": "Huésped caminando por el sendero del bosque entre los helechos" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/fotos-landing-mesa-de-trabajo-1-copia-5.webp", "alt": "Huésped de espaldas apoyada en la baranda frente al bosque de niebla" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/fotos-landing-mesa-de-trabajo-1-copia-6.webp", "alt": "Huésped sentada junto a la hamaca de la terraza, entre la niebla" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/fotos-landing-mesa-de-trabajo-1-copia-7.webp", "alt": "Huésped y su perro en el jacuzzi al aire libre, bajo el cielo despejado" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/fotos-landing-mesa-de-trabajo-1-copia-8.webp", "alt": "Perro cocker spaniel sobre una rampa en el deck, con el valle al fondo" },
    { "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/galeria/fotos-landing-mesa-de-trabajo-1-copia-9.webp", "alt": "Grupo de amigas en el jacuzzi social de La Finca" }
  ]
}$json$::jsonb),

-- --- Página de reserva (hub previo al motor) --------------------------------
('reservar', $json${
  "intro": "Elige la cabaña y el plan que quieres. Te llevamos a WhatsApp con el mensaje ya escrito y confirmamos disponibilidad el mismo día.",
  "pasos": [
    {
      "titulo": "1. Elige tu cabaña",
      "texto": "Cinco cabañas independientes para dos personas. Algunas con jacuzzi privado."
    },
    {
      "titulo": "2. Elige tu plan",
      "texto": "Entre Semana, Estándar o Premium. Cambia lo que incluye la estadía, no la cabaña."
    },
    {
      "titulo": "3. Confirmamos por WhatsApp",
      "texto": "Te respondemos con la disponibilidad, el total y la forma de pago. Sin intermediarios."
    }
  ],
  "nota": "Muy pronto vas a poder reservar y pagar en línea desde esta misma página."
}$json$::jsonb),

-- --- Página 404 -------------------------------------------------------------
('no_encontrado', $json${
  "titulo": "Esta página se perdió en la neblina",
  "mensaje": "La dirección que buscas no existe o cambió de lugar. Vuelve al inicio o escríbenos por WhatsApp y te orientamos.",
  "cta_texto": "Volver al inicio",
  "cta_href": "/",
  "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/sitio/home/pajaro-banner-3-22.webp",
  "imagen_alt": "Ave de pecho amarillo posada sobre un tronco cubierto de musgo, en la reserva de La Finca"
}$json$::jsonb)

on conflict (clave) do update set valor = excluded.valor;


-- ----------------------------------------------------------------------------
-- DESCRIPCIONES DE LAS CABAÑAS
--
-- El sitio actual NO publica descripción por cabaña (ver CONTENIDO_ACTUAL.md):
-- solo el nombre y la galería. Estos textos se redactaron a partir de las fotos
-- oficiales de cada cabaña, describiendo únicamente lo que se ve en ellas.
-- Sustituyen el marcador de posición de `001_datos_iniciales.sql`.
--
-- TODO confirmar con el cliente: son borradores y pueden no reflejar cambios
-- recientes de mobiliario o dotación.
-- ----------------------------------------------------------------------------
update alojamientos set descripcion = $t$Cabaña de dos ambientes. La sala tiene sillones de madera con cojines y una barra con cocineta, nevera y estación de café; al lado, un rincón de estar con mesa baja para el vino de bienvenida. La habitación tiene cama doble y el baño privado, ducha con amenidades.$t$
 where slug = 'cabana-01';

update alojamientos set descripcion = $t$Cabaña con terraza propia: hamaca y mesa para dos con vista abierta al valle, ideal para el café de la mañana entre la neblina. Adentro, habitación con cama doble, cómoda de bienvenida con vino y copas, y baño privado con ducha.$t$
 where slug = 'cabana-02';

update alojamientos set descripcion = $t$La cabaña más amplia: además de la habitación con cama doble, tiene una sala-terraza techada con muebles de madera, cocina abierta con isla y comedor, un balcón con banca frente al bosque y una hamaca colgada mirando la montaña.$t$
 where slug = 'cabana-03';

update alojamientos set descripcion = $t$Cabaña independiente de fachada blanca y techo azul, con salida directa de la habitación a la terraza: hamaca, mesa para dos y el bosque justo enfrente. Adentro, un rincón alfombrado con mesa baja y baño privado con ducha.$t$
 where slug = 'cabana-04';

update alojamientos set descripcion = $t$Cabaña con vista panorámica desde casi todos los rincones: sala con muebles de madera frente al ventanal, chimenea para las noches frías, mesa para dos junto a la ventana y cocineta con estación de café. La habitación tiene cama doble y ventanal a la montaña.$t$
 where slug = 'cabana-05';


-- ----------------------------------------------------------------------------
-- EXPERIENCIAS: detalle real y foto
--
-- El sitio actual publica el contenido de las dos experiencias como una lista
-- (torta, topper, vela, vino, fotos instantáneas…). La tabla `extras` solo
-- tiene un campo de texto, así que la lista se escribe en prosa, que es como
-- se lee mejor en la tarjeta.
-- ----------------------------------------------------------------------------
update extras set
  descripcion = $t$Incluye torta para dos, topper de feliz aniversario, vela, botella de vino, 3 fotos instantáneas y arreglo floral o fondue de frutas. Con el plan Premium te llevamos la cena hasta la cabaña.$t$,
  imagen_url  = 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/experiencias/pw-finca-aniversario-con-amor-21-2-21.webp'
 where nombre = 'Aniversario con Amor';

update extras set
  descripcion = $t$Incluye torta para dos, topper de feliz cumpleaños, vela, botella de vino, 3 fotos instantáneas y arreglo floral o fondue de frutas. Con el plan Premium te llevamos la cena hasta la cabaña.$t$,
  imagen_url  = 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/experiencias/experiencia-cumpleanos-30.webp'
 where nombre = 'Cumpleaños con Amor';


-- ----------------------------------------------------------------------------
-- GALERÍAS DE LAS CABAÑAS
--
-- Se cruzan los archivos `CABANA-N-XX.webp` del manifiesto con la cabaña que
-- les corresponde. El `orden` no sigue el nombre del archivo sino el criterio
-- de una ficha de alojamiento: primero la habitación (es la foto que decide la
-- reserva), después las zonas comunes y la terraza, y al final el baño.
--
-- Idempotente gracias al índice único `imagenes_url_unica` (migración 005).
-- ----------------------------------------------------------------------------
insert into imagenes (alojamiento_id, url, alt, orden)
select
  a.id,
  'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/cabanas/' || f.archivo,
  f.alt,
  f.orden
from (values
  -- Cabaña 01
  ('cabana-01', 'cabana-1-08.webp', 'Habitación de la Cabaña 01 con cama doble, lámparas de noche y baúl a los pies', 1),
  ('cabana-01', 'cabana-1-07.webp', 'Rincón de estar de la Cabaña 01 con sofá, mesa redonda y vino de bienvenida', 2),
  ('cabana-01', 'cabana-1-02.webp', 'Sala de la Cabaña 01 con sillones de madera, cojines turquesa y mesa de centro', 3),
  ('cabana-01', 'cabana-1-01.webp', 'Barra de la Cabaña 01 con cocineta, nevera, cafetera y sillas altas', 4),
  ('cabana-01', 'cabana-1-05.webp', 'Ducha de la Cabaña 01 con grifería de cobre y amenidades de baño', 5),
  ('cabana-01', 'cabana-1-04.webp', 'Lavamanos y espejo del baño de la Cabaña 01, con toallas dobladas', 6),
  ('cabana-01', 'cabana-1-03.webp', 'Baño de la Cabaña 01 con pared de azulejos azules', 7),
  ('cabana-01', 'cabana-1-06.webp', 'Cómoda de la Cabaña 01 con batas colgadas y toallas listas para los huéspedes', 8),

  -- Cabaña 02
  ('cabana-02', 'cabana-2-01.webp', 'Habitación de la Cabaña 02 con cama doble y mesas de noche con lámparas', 1),
  ('cabana-02', 'cabana-2-04.webp', 'Mesa para dos en la terraza de la Cabaña 02, con vista al valle', 2),
  ('cabana-02', 'cabana-2-05.webp', 'Hamaca blanca en la terraza de la Cabaña 02, frente al bosque', 3),
  ('cabana-02', 'cabana-2-06.webp', 'Cómoda de bienvenida de la Cabaña 02 con vino, copas y letrero de bienvenida', 4),
  ('cabana-02', 'cabana-2-02.webp', 'Terraza de la Cabaña 02 con mesa redonda y sillas turquesa entre la neblina', 5),
  ('cabana-02', 'cabana-2-03.webp', 'Rincón del corredor de la Cabaña 02 con mesa, sillas turquesa y hortensias', 6),
  ('cabana-02', 'cabana-2-07.webp', 'Ducha de la Cabaña 02 con grifería de cobre y eucalipto colgado', 7),
  ('cabana-02', 'cabana-2-08.webp', 'Baño de la Cabaña 02 con lavamanos sobre mesón de madera', 8),

  -- Cabaña 03
  ('cabana-03', 'cabana-3-01.webp', 'Habitación de la Cabaña 03 con cama doble, cómoda y ventana al bosque', 1),
  ('cabana-03', 'cabana-3-07.webp', 'Terraza de la Cabaña 03 con hamaca y sillas, frente al bosque de montaña', 2),
  ('cabana-03', 'cabana-3-03.webp', 'Sala techada de la Cabaña 03 con muebles de madera y cojines amarillos', 3),
  ('cabana-03', 'cabana-3-04.webp', 'Balcón de la Cabaña 03 con banca de madera y vista al bosque de niebla', 4),
  ('cabana-03', 'cabana-3-05.webp', 'Cocina abierta de la Cabaña 03 con isla de concreto y comedor junto al ventanal', 5),
  ('cabana-03', 'cabana-3-02.webp', 'Rincón alfombrado de la Cabaña 03 con mesita, farol y vino', 6),
  ('cabana-03', 'cabana-3-06.webp', 'Baño de la Cabaña 03 con ducha, planta colgante y toallas', 7),

  -- Cabaña 04
  ('cabana-04', 'cabana-4-05.webp', 'Habitación de la Cabaña 04 con cama doble y salida directa a la terraza con hamaca', 1),
  ('cabana-04', 'cabana-4-04.webp', 'Terraza de la Cabaña 04 con hamaca, mesa para dos y vista al bosque', 2),
  ('cabana-04', 'cabana-4-02.webp', 'Fachada blanca de la Cabaña 04 con techo azul y ventanales al jardín', 3),
  ('cabana-04', 'cabana-4-01.webp', 'Rincón alfombrado de la Cabaña 04 con mesita, copas y canasta de bienvenida', 4),
  ('cabana-04', 'cabana-4-03.webp', 'Baño de la Cabaña 04 con lavamanos, toallas y planta colgante', 5),

  -- Cabaña 05
  ('cabana-05', 'cabana-5-01.webp', 'Cama doble de la Cabaña 05 junto al ventanal, con vista a la montaña', 1),
  ('cabana-05', 'cabana-5-05.webp', 'Sala de la Cabaña 05 con muebles de madera, cojines turquesa y ventanales al valle', 2),
  ('cabana-05', 'cabana-5-04.webp', 'Mesa para dos de la Cabaña 05 junto a la ventana, frente al bosque', 3),
  ('cabana-05', 'cabana-5-06.webp', 'Chimenea encendida de la Cabaña 05, con vino, copas y juegos de mesa', 4),
  ('cabana-05', 'cabana-5-03.webp', 'Cocina de la Cabaña 05 con isla, estufa y vista al bosque', 5),
  ('cabana-05', 'cabana-5-02.webp', 'Estación de café de la Cabaña 05 con nevera pequeña y cafetera', 6),
  ('cabana-05', 'cabana-5-07.webp', 'Baño de la Cabaña 05 con ducha, lavamanos y planta colgante', 7)
) as f(slug, archivo, alt, orden)
join alojamientos a on a.slug = f.slug
on conflict (url) do update set
  alojamiento_id = excluded.alojamiento_id,
  alt            = excluded.alt,
  orden          = excluded.orden;
