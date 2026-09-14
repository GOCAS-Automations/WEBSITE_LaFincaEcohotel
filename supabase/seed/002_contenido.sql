-- ============================================================================
-- SEED 002 — Contenido del sitio y galerías de las cabañas
--
-- ⚠ ARCHIVO GENERADO. NO EDITAR A MANO.
--    Se produce con `npm run seed:contenido` a partir de los respaldos de
--    `src/lib/contenido.ts` y del catálogo de fotos de `src/lib/fotos.ts`.
--    Si hay que cambiar un texto o una foto, se cambia ALLÍ y se regenera:
--    cualquier edición directa de este archivo se pierde en la siguiente
--    ejecución y, mientras tanto, hace que el código y la base digan cosas
--    distintas.
--
-- FUENTE DE VERDAD DEL CONTENIDO: `docs/DATOS_CLIENTE.md`.
-- CONTRATO DE LAS CLAVES: `docs/CMS_CLAVES.md`.
--
-- IDEMPOTENTE: `on conflict … do update` actualiza en vez de duplicar.
--
-- ⚠ OJO CUANDO EL PANEL ESTÉ EN LÍNEA: volver a correr este archivo SOBREESCRIBE
--   lo que el cliente haya editado desde el panel. A partir de ese momento es
--   solo para reconstruir la base desde cero, no para desplegar.
-- ============================================================================

set search_path to public, extensions;

-- ----------------------------------------------------------------------------
-- CONTENIDO EDITABLE DEL SITIO
-- ----------------------------------------------------------------------------
insert into contenido (clave, valor) values
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
  "horario_restaurante": "9:00 a. m. – 8:00 p. m., todos los días · exclusivo para huéspedes",
  "rnt": "114565",
  "instagram": "https://www.instagram.com/lafinca_cali/",
  "instagram_usuario": "@lafinca_cali",
  "facebook": "https://www.facebook.com/share/1Pz1wCY8af/?mibextid=JRoKGi",
  "tiktok": "https://www.tiktok.com/@lafincacali",
  "tiktok_usuario": "@lafincacali",
  "mapa_url": "https://www.google.com/maps/search/?api=1&query=La%20Finca%20Eco%20Hotel&query_place_id=ChIJeyNhUdivMI4Rk9zjFWJ_Hrk",
  "mapa_embed": "https://maps.google.com/maps?q=place_id:ChIJeyNhUdivMI4Rk9zjFWJ_Hrk&z=15&hl=es&ie=UTF8&output=embed",
  "mapa_como_llegar": "https://www.google.com/maps/dir/?api=1&origin=Cali,+Valle+del+Cauca&destination=La+Finca+Eco+Hotel&destination_place_id=ChIJeyNhUdivMI4Rk9zjFWJ_Hrk"
}$json$::jsonb),

('sitio.seo', $json${
  "titulo": "La Finca Eco Hotel — Cabañas con jacuzzi cerca de Cali",
  "descripcion": "Ecohotel en el bosque de niebla, Km 18 vía Cali–Buenaventura. Cinco cabañas para dos con jacuzzi, turco, piscina y restaurante, a 45 minutos de Cali.",
  "palabras_clave": [
    "ecohotel cerca de Cali",
    "cabañas con jacuzzi Valle del Cauca",
    "hotel Km 18 vía Buenaventura",
    "bosque de niebla Cali",
    "plan romántico para parejas cerca de Cali"
  ],
  "imagen": {
    "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/sitio/social/tarjeta-og-1200x630.webp",
    "alt": "La Finca Eco Hotel — cabañas en el bosque de niebla del Km 18, cerca de Cali",
    "ancho": 1200,
    "alto": 630
  }
}$json$::jsonb),

('home.hero', $json${
  "antetitulo": "Km 18 vía Cali–Buenaventura",
  "titulo": "Vive despacio. Respira profundo. Estás en La Finca.",
  "subtitulo": "Cinco cabañas para dos en un bosque de niebla del Valle del Cauca, a 45 minutos de Cali.",
  "parrafo": "Te invitamos a respirar más despacio, a escuchar lo que el bosque quiere contarte y a dejar que la neblina te devuelva la calma.",
  "cta_texto": "Reservar",
  "cta_href": "/reservar",
  "cta_secundario_texto": "Conócenos",
  "cta_secundario_href": "/conocenos",
  "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/hero-escritorio.webp",
  "imagen_movil": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/hero-movil.webp",
  "imagen_alt": "Corredor techado de La Finca Eco Hotel abierto al bosque de niebla del Km 18, con jardineras y baranda de madera"
}$json$::jsonb),

('home.intro', $json${
  "antetitulo": "Bienvenidos",
  "titulo": "Un suspiro del bosque convertido en descanso",
  "parrafos": [
    "La Finca Eco Hotel está en el Km 18 de la vía Cali–Buenaventura, en la Vereda Loma Alta, dentro de un bosque de niebla del Valle del Cauca. Son cinco cabañas pensadas para dos personas, cada una independiente, con cama doble, baño privado y vista a la montaña.",
    "No hay televisor en ninguna cabaña, y es a propósito. Hay estación de café y aromáticas ilimitadas, batas y cobijas térmicas para el frío, y el canto de las aves a las seis de la mañana."
  ],
  "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/05.webp",
  "imagen_alt": "Las cabañas de techo azul de La Finca Eco Hotel sobre la ladera, con los senderos y los jardines de la reserva",
  "datos": [
    {
      "valor": "45 min",
      "etiqueta": "desde Cali"
    },
    {
      "valor": "5",
      "etiqueta": "cabañas para dos"
    },
    {
      "valor": "18 °C",
      "etiqueta": "clima de montaña"
    }
  ]
}$json$::jsonb),

('home.cabanas', $json${
  "antetitulo": "Alojamiento",
  "titulo": "Nuestras cinco cabañas",
  "descripcion": "Cada una tiene algo que las otras no: dos niveles, un jacuzzi bajo un árbol, un comedor en el balcón o la única chimenea de La Finca. Todas para dos personas.",
  "cta_texto": "Ver todas las cabañas",
  "cta_href": "/alojamientos"
}$json$::jsonb),

('home.planes', $json${
  "antetitulo": "Planes y tarifas",
  "titulo": "Elige tu plan",
  "descripcion": "El precio lo pone el plan, no la cabaña: eliges el nivel de servicio que quieres y lo disfrutas en la cabaña que prefieras.",
  "nota": "Tarifas referenciales de temporada baja. Pueden variar en festivos y alta demanda. IVA incluido.",
  "imagen_fondo": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/03.webp",
  "cta_texto": "Reservar ahora",
  "cta_href": "/reservar"
}$json$::jsonb),

('home.experiencias', $json${
  "antetitulo": "Experiencias",
  "titulo": "Celebra en medio del bosque",
  "descripcion": "Añade una experiencia a tu reserva y encuentra la cabaña lista al llegar: torta, vino, decoración y fotos instantáneas para que la fecha quede marcada.",
  "cta_texto": "Ver experiencias",
  "cta_href": "/experiencias"
}$json$::jsonb),

('home.esencia', $json${
  "antetitulo": "Nuestra esencia",
  "titulo": "Un lugar donde el lujo no brilla: se siente",
  "parrafos": [
    "Donde la belleza no se muestra: se respira. Cada rincón ha sido creado para recordarte que la vida también puede ser lenta, suave y serena.",
    "Nuestra misión es crear espacios donde el descanso se vuelva un ritual natural, donde el confort moderno se mezcle con la tierra húmeda y la neblina que abraza las montañas.",
    "Soñamos con ser un refugio de bienestar y sostenibilidad, un símbolo del eco-lujo consciente, donde la comodidad y el respeto por la tierra caminen de la mano."
  ],
  "imagenes": [
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/03.webp",
      "alt": "Deck de inmersión metálico suspendido entre los árboles del bosque de niebla",
      "ancho": 1086,
      "alto": 1231
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/10.webp",
      "alt": "Comedor en el balcón de la Cabaña 03, con hamaca y vista al valle",
      "ancho": 1086,
      "alto": 1231
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/01.webp",
      "alt": "Deck techado de La Finca con comedor de vidrio y sillas, frente a las montañas",
      "ancho": 2400,
      "alto": 2720
    }
  ]
}$json$::jsonb),

('home.reconocimiento', $json${
  "antetitulo": "Reconocimientos",
  "titulo": "Somos COP16",
  "parrafos": [
    "Somos COP16 y, junto con la Cámara de Comercio de Cali, nos preparamos para este evento donde mostramos la mejor imagen de nuestra región al mundo entero.",
    "La reserva funciona con respaldo de paneles solares y los vehículos se quedan en el parqueadero externo: dentro de La Finca solo se entra a pie, para no alterar a las especies que viven aquí."
  ],
  "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/sitio/video/cop16-poster.webp",
  "imagen_alt": "Bebedero de colibríes de La Finca Eco Hotel entre la neblina, con las cabañas al fondo",
  "video": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/videos/sitio/cop16-la-finca.mp4",
  "cta_texto": "Reservar ahora",
  "cta_href": "/reservar"
}$json$::jsonb),

('home.testimonios', $json${
  "antetitulo": "Reseñas",
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

('home.cta_final', $json${
  "titulo": "Deja que la neblina te devuelva la calma",
  "texto": "Escríbenos y te ayudamos a elegir la cabaña, el plan y la fecha. Respondemos por WhatsApp todos los días.",
  "cta_texto": "Reservar ahora",
  "cta_href": "/reservar",
  "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/07.webp",
  "imagen_alt": "Mesa y sillas de piedra bajo las farolas de La Finca Eco Hotel, entre la neblina del atardecer"
}$json$::jsonb),

('heroes.listados', $json${
  "alojamientos": {
    "titulo": "Nuestras cabañas",
    "subtitulo": "Cinco cabañas independientes para dos, con cama doble, baño privado y vista al bosque de niebla.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/02.webp",
    "imagen_alt": "Balcón techado de la Cabaña 03 con hamaca y comedor, frente al bosque de niebla"
  },
  "experiencias": {
    "titulo": "Experiencias",
    "subtitulo": "Aniversarios y cumpleaños listos al llegar, y los detalles que se añaden a tu reserva.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-05/05.webp",
    "imagen_alt": "Chimenea encendida de la Cabaña 05, la única cabaña que tiene, con cojines y juegos de mesa"
  },
  "conocenos": {
    "titulo": "Conócenos",
    "subtitulo": "Una reserva natural en el Km 18, con jacuzzi, turco, piscina de agua fría, restaurante y senderos.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/06.webp",
    "imagen_alt": "Piscina de agua fría de La Finca Eco Hotel con su chorrera, frente a las montañas y las nubes"
  },
  "galeria": {
    "titulo": "Galería",
    "subtitulo": "El bosque, las cabañas y los rincones de La Finca en imágenes.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/07.webp",
    "imagen_alt": "Mesa y sillas de piedra bajo las farolas de La Finca, entre la neblina del atardecer"
  },
  "faq": {
    "titulo": "Preguntas frecuentes",
    "subtitulo": "Lo que más nos preguntan antes de llegar: cómo llegar, el clima, las mascotas, los pagos y las reglas de la casa.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-01/03.webp",
    "imagen_alt": "Balcón de la Cabaña 01 con hamaca, mesa para dos y vista al bosque de niebla"
  },
  "contacto": {
    "titulo": "Contacto",
    "subtitulo": "Escríbenos por WhatsApp: resolvemos dudas y confirmamos disponibilidad el mismo día.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/08.webp",
    "imagen_alt": "Pareja abrigada frente a la fogata encendida de La Finca Eco Hotel, de noche"
  },
  "reservar": {
    "titulo": "Reserva tu estadía",
    "subtitulo": "Elige cabaña y plan, y confirmamos tu fecha por WhatsApp en pocos minutos.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-01/01.webp",
    "imagen_alt": "Habitación de la Cabaña 01 en el nivel superior, con cama doble bajo el techo de madera"
  }
}$json$::jsonb),

('experiencias', $json${
  "intro": "Preparamos la cabaña antes de que llegues: decoración, torta, vino y los detalles de la celebración listos. Se añaden a tu reserva y se cobran una sola vez por estadía.",
  "adicionales_titulo": "Otras experiencias",
  "adicionales_descripcion": "¿Tienes algo distinto en mente? Escríbenos por WhatsApp y lo armamos contigo.",
  "adicionales": []
}$json$::jsonb),

('faq', $json${
  "intro": "Si tu pregunta no está aquí, escríbenos por WhatsApp: respondemos todos los días.",
  "items": [
    {
      "pregunta": "¿Dónde están ubicados y cómo se llega?",
      "respuesta": "En el Km 18 de la vía Cali–Buenaventura, Vereda Loma Alta, a unos 45 minutos al occidente de Cali. La vía no está pavimentada en el último tramo, pero es apta para cualquier carro. El punto exacto y el video de llegada te los enviamos cuando confirmes el pago."
    },
    {
      "pregunta": "¿Cuántas cabañas tienen?",
      "respuesta": "Cinco. Todas son independientes, con capacidad máxima para 2 personas, cama doble, baño privado y vista a la montaña. Pocas cabañas significan silencio, privacidad y una atención que se nota."
    },
    {
      "pregunta": "¿Todas las cabañas tienen jacuzzi privado?",
      "respuesta": "Las cabañas 01, 02 y 05 tienen jacuzzi privado en zona exterior. Las cabañas 03 y 04 comparten uno de uso privado por turnos: se reserva con Nicolás, nuestro anfitrión, para que cada pareja lo disfrute sola. Todos son climatizados, con burbujas y luces."
    },
    {
      "pregunta": "¿A qué hora puedo llegar y a qué hora debo salir?",
      "respuesta": "Desde la 1:00 p. m. puedes usar el restaurante, los senderos, los decks y las zonas sociales. La cabaña se entrega a las 3:00 p. m. El check-out es a la 1:00 p. m."
    },
    {
      "pregunta": "¿Cómo se reserva y cómo se paga?",
      "respuesta": "Con un anticipo del 50 % se confirma la reserva; el 50 % restante se paga el día de la llegada con un link de pago que te enviamos con anticipación. En La Finca no hay datáfono ni manejamos efectivo. Nunca te pediremos los datos de tu tarjeta por WhatsApp."
    },
    {
      "pregunta": "¿Puedo cancelar o cambiar la fecha?",
      "respuesta": "Una vez confirmada la reserva no hay reembolsos. Sí puedes cambiar la fecha una sola vez, avisando con mínimo 3 días de anticipación. Cancelar el mismo día o no presentarse se considera incumplimiento y no da lugar a devolución ni reprogramación."
    },
    {
      "pregunta": "¿Cómo es el clima y qué debo llevar?",
      "respuesta": "Estamos en un bosque de niebla, con temperaturas que bajan hasta los 18 °C y días templados. Trae ropa abrigada, algo impermeable y zapatos cómodos para los senderos. En la cabaña encontrarás batas y cobijas térmicas."
    },
    {
      "pregunta": "¿Tienen parqueadero?",
      "respuesta": "Sí, un parqueadero externo vigilado las 24 horas en la entrada. Los vehículos no ingresan a la reserva natural, para proteger a las especies que habitan el lugar: desde el parqueadero se entra a pie."
    },
    {
      "pregunta": "¿Puedo llevar a mi mascota?",
      "respuesta": "¡Claro! Las mascotas son bienvenidas en todas nuestras áreas, con cuidado responsable de sus acompañantes. La primera no tiene costo; a partir de la segunda hay un valor de $50.000 por estadía."
    },
    {
      "pregunta": "¿Pueden ir niños?",
      "respuesta": "La experiencia está diseñada para parejas adultas. Recibimos bebés de hasta 10 meses, que duermen con la mamá y no tienen costo. No contamos con cuna ni silla alta."
    },
    {
      "pregunta": "¿Cuentan con restaurante?",
      "respuesta": "Sí, de 9:00 a. m. a 8:00 p. m. todos los días, exclusivo para huéspedes. El desayuno se sirve desde las 9:00 a. m. y tenemos opciones vegetarianas, veganas y sin gluten."
    },
    {
      "pregunta": "¿Qué horarios tienen las zonas comunes?",
      "respuesta": "El jacuzzi está disponible de 3:00 p. m. a 12:00 a. m. y se solicita con anticipación para alistarlo. La fogata con masmelos se enciende a las 9:00 p. m. La piscina de agua fría con chorrera y el turco por turnos están disponibles durante el día."
    },
    {
      "pregunta": "¿Se puede visitar sin quedarse a dormir?",
      "respuesta": "Sí, con el plan Día de Calma: de 10:00 a. m. a 5:00 p. m., con almuerzo a la carta, refrigerio y acceso a piscina, turco, decks, senderos y salón. No incluye hospedaje."
    },
    {
      "pregunta": "¿Hay televisor en las cabañas?",
      "respuesta": "No, y es a propósito. Las cabañas están pensadas para desconectarse. Sí hay WiFi, estación de café y aromáticas ilimitadas, mininevera, agua caliente, secador, amenities de baño y botiquín."
    },
    {
      "pregunta": "¿Se pueden hacer eventos?",
      "respuesta": "Sí. Tenemos un salón multifuncional para hasta 30 personas, ideal para retiros, cumpleaños y reuniones. Los talleres de yoga o meditación se programan desde 10 personas."
    },
    {
      "pregunta": "¿Se puede caminar por el bosque?",
      "respuesta": "Hay senderos y miradores habilitados dentro de la reserva, además de caminatas por los alrededores. No se permite el senderismo fuera de los senderos, por conservación del bosque."
    },
    {
      "pregunta": "¿Es accesible para personas con movilidad reducida?",
      "respuesta": "El terreno es de montaña y no es plano: hay escaleras y pendientes entre las cabañas y las zonas comunes, así que no lo recomendamos para personas con movilidad reducida. Escríbenos y te contamos con detalle cómo es el recorrido."
    }
  ]
}$json$::jsonb),

('lugar', $json${
  "antetitulo": "Sobre nosotros",
  "titulo": "Una reserva natural en el bosque de niebla",
  "parrafos": [
    "La Finca Eco Hotel está en el Km 18 de la vía Cali–Buenaventura, en la Vereda Loma Alta. Se llega en unos 45 minutos desde Cali y, apenas se sube, el clima cambia: entra el frío, la neblina y el canto de las aves.",
    "El lugar se pensó al revés de un hotel grande: cinco cabañas, mucho bosque y un equipo pequeño. Nicolás, nuestro anfitrión, recibe a cada pareja, coordina los turnos de jacuzzi y turco y resuelve lo que haga falta.",
    "Cuidar la reserva es parte del plan. La energía tiene respaldo de paneles solares, los vehículos se quedan en el parqueadero externo y el bosque solo se recorre por los senderos habilitados. Somos COP16, en alianza con la Cámara de Comercio de Cali."
  ],
  "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/05.webp",
  "imagen_alt": "Las cabañas de techo azul de La Finca Eco Hotel sobre la ladera, con los senderos y los jardines",
  "instalaciones_titulo": "Zonas comunes",
  "instalaciones_descripcion": "Todo esto está incluido con tu estadía, además de la cabaña.",
  "instalaciones": [
    {
      "nombre": "Zona de hidroterapia",
      "descripcion": "Jacuzzi climatizado de 3:00 p. m. a 12:00 a. m. (se solicita con anticipación), turco por turnos y piscina de agua fría con chorrera para alternar frío y calor.",
      "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/06.webp",
      "imagen_alt": "Piscina de agua fría de La Finca con su chorrera, frente a las montañas y las nubes"
    },
    {
      "nombre": "Restaurante",
      "descripcion": "De 9:00 a. m. a 8:00 p. m. todos los días, exclusivo para huéspedes. Desayuno desde las 9:00 a. m., con opciones vegetarianas, veganas y sin gluten.",
      "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/01.webp",
      "imagen_alt": "Deck techado de La Finca con comedor de vidrio y sillas, frente a las montañas"
    },
    {
      "nombre": "Decks de inmersión",
      "descripcion": "Plataformas suspendidas entre los árboles para sentarse a mirar el bosque, respirar y no hacer nada más.",
      "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/03.webp",
      "imagen_alt": "Deck de inmersión metálico suspendido entre los árboles del bosque de niebla"
    },
    {
      "nombre": "Ducha al aire libre",
      "descripcion": "Una ducha de madera en medio del bosque, para terminar el recorrido por los senderos como se debe.",
      "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/04.webp",
      "imagen_alt": "Ducha de madera al aire libre de La Finca, en medio del bosque"
    },
    {
      "nombre": "Fogata con masmelos",
      "descripcion": "A las 9:00 p. m. encendemos la fogata. Está incluida en todos los planes de hospedaje.",
      "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/08.webp",
      "imagen_alt": "Pareja abrigada frente a la fogata encendida de La Finca, de noche"
    },
    {
      "nombre": "Salón multifuncional",
      "descripcion": "Espacio para retiros, cumpleaños y reuniones, con capacidad máxima para 30 personas. Talleres de yoga o meditación desde 10 personas.",
      "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/07.webp",
      "imagen_alt": "Mesa y sillas de piedra bajo las farolas de La Finca, entre la neblina del atardecer"
    }
  ],
  "llegar_titulo": "Cómo llegar",
  "llegar_parrafos": [
    "Desde Cali se toma la vía a Buenaventura y se sube hasta el Km 18. Son unos 45 minutos en carro desde el occidente de la ciudad. El último tramo no está pavimentado, pero es apto para cualquier vehículo.",
    "Al llegar, el carro se deja en el parqueadero externo vigilado y se entra a pie: estamos dentro de una reserva natural y no permitimos el ingreso de vehículos, para no alterar a las especies del bosque."
  ],
  "llegar_indicaciones": [
    "Km 18, vía Cali–Buenaventura, Vereda Loma Alta (Valle del Cauca).",
    "Aproximadamente 45 minutos desde Cali.",
    "Parqueadero externo vigilado 24 horas; los vehículos no ingresan a la reserva.",
    "El pin exacto y el video de llegada se envían al confirmar el pago."
  ]
}$json$::jsonb),

('galeria', $json${
  "intro": "El bosque, las cabañas y las zonas comunes de La Finca, tal como las encuentran nuestros huéspedes.",
  "imagenes": [
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/02.webp",
      "alt": "Corredor techado de La Finca con jardineras y baranda de madera, abierto al bosque de niebla del Km 18",
      "ancho": 2400,
      "alto": 1530
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-01/01.webp",
      "alt": "Habitación de la Cabaña 01 en el nivel superior, con cama doble bajo el techo de madera",
      "ancho": 1448,
      "alto": 923
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/06.webp",
      "alt": "Piscina de agua fría de La Finca con su chorrera, frente a las montañas y las nubes",
      "ancho": 1086,
      "alto": 1231
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-02/05.webp",
      "alt": "Jacuzzi privado de la Cabaña 02 bajo el árbol, rodeado de guadua, con toallas dobladas",
      "ancho": 1448,
      "alto": 923
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/01.webp",
      "alt": "Deck techado de La Finca con comedor de vidrio y sillas, frente a las montañas",
      "ancho": 2400,
      "alto": 2720
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-05/05.webp",
      "alt": "Chimenea encendida de la Cabaña 05, la única cabaña que tiene, con cojines y juegos de mesa",
      "ancho": 1448,
      "alto": 923
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/05.webp",
      "alt": "Las cabañas de techo azul de La Finca sobre la ladera, con los senderos y los jardines",
      "ancho": 1536,
      "alto": 1741
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/02.webp",
      "alt": "Balcón techado de la Cabaña 03 con hamaca y comedor, frente al bosque de niebla",
      "ancho": 1448,
      "alto": 923
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/03.webp",
      "alt": "Deck de inmersión metálico suspendido entre los árboles del bosque de niebla",
      "ancho": 1086,
      "alto": 1231
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-01/03.webp",
      "alt": "Balcón de la Cabaña 01 con hamaca, mesa para dos y vista al bosque de niebla",
      "ancho": 1086,
      "alto": 1231
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/07.webp",
      "alt": "Mesa y sillas de piedra bajo las farolas de La Finca, entre la neblina del atardecer",
      "ancho": 1448,
      "alto": 923
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/09.webp",
      "alt": "Rincón de estar y estación de café de la Cabaña 04, con vista al bosque",
      "ancho": 1448,
      "alto": 923
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/04.webp",
      "alt": "Ducha de madera al aire libre de La Finca, en medio del bosque",
      "ancho": 1086,
      "alto": 1231
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-05/03.webp",
      "alt": "Cama doble de la Cabaña 05 junto al ventanal, con vista panorámica a la montaña",
      "ancho": 1122,
      "alto": 1192
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/08.webp",
      "alt": "Pareja abrigada frente a la fogata encendida de La Finca, de noche",
      "ancho": 941,
      "alto": 1421
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/09.webp",
      "alt": "Jacuzzi exterior de las cabañas 03 y 04, con toallas y vista al bosque",
      "ancho": 1086,
      "alto": 1231
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-01/06.webp",
      "alt": "Jacuzzi privado al aire libre de la Cabaña 01, con toallas y vista a las montañas",
      "ancho": 1448,
      "alto": 923
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-02/04.webp",
      "alt": "Terraza de la Cabaña 02 con hamaca, mesa para dos y vista a las montañas",
      "ancho": 1448,
      "alto": 923
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/06.webp",
      "alt": "Zona social techada de las cabañas 03 y 04, con cocina de isla y comedor",
      "ancho": 1086,
      "alto": 1231
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-05/04.webp",
      "alt": "Comedor para dos de la Cabaña 05 frente al ventanal, con vista al valle",
      "ancho": 1122,
      "alto": 1192
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/10.webp",
      "alt": "Fachada blanca y techo azul de la Cabaña 04, con jardineras de flores",
      "ancho": 1122,
      "alto": 1192
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-01/05.webp",
      "alt": "Cocina y comedor del nivel inferior de la Cabaña 01, con barra, sillas altas y sillones",
      "ancho": 1448,
      "alto": 923
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/07.webp",
      "alt": "Sala compartida de las cabañas 03 y 04, con sillones de madera y ventanales al bosque",
      "ancho": 1086,
      "alto": 1231
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-02/01.webp",
      "alt": "Habitación de la Cabaña 02 con cama doble, paredes de madera y mininevera",
      "ancho": 1448,
      "alto": 923
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-05/01.webp",
      "alt": "Sala y cocina de la Cabaña 05, con barra de piedra y ventanal al bosque",
      "ancho": 1031,
      "alto": 1296
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/08.webp",
      "alt": "Fachada blanca y techo azul de la Cabaña 03, con jardineras de flores",
      "ancho": 1122,
      "alto": 1192
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-01/02.webp",
      "alt": "Sala del nivel inferior de la Cabaña 01, con cojines, tapete y plantas",
      "ancho": 1448,
      "alto": 923
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/08.webp",
      "alt": "Batas térmicas y lámpara junto al ventanal de la Cabaña 04",
      "ancho": 1086,
      "alto": 1231
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-05/06.webp",
      "alt": "Jacuzzi privado exterior de la Cabaña 05, con toallas y vista al jardín",
      "ancho": 1086,
      "alto": 1231
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/04.webp",
      "alt": "Rincón de la Cabaña 03 con batas, cojines y mesa baja junto al ventanal",
      "ancho": 1086,
      "alto": 1231
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-02/03.webp",
      "alt": "Estación de café y aromáticas de la Cabaña 02, junto a la ventana",
      "ancho": 1086,
      "alto": 1231
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/11.webp",
      "alt": "Habitación de la Cabaña 03 con cama doble y ventanal al balcón",
      "ancho": 1448,
      "alto": 923
    }
  ]
}$json$::jsonb),

('reservar', $json${
  "intro": "Elige la cabaña y el plan que quieres. Te llevamos a WhatsApp con el mensaje ya escrito y confirmamos disponibilidad el mismo día.",
  "pasos": [
    {
      "titulo": "1. Elige tu cabaña",
      "texto": "Cinco cabañas independientes para dos personas. Cada una con su rasgo propio: jacuzzi privado, comedor en el balcón o chimenea."
    },
    {
      "titulo": "2. Elige tu plan",
      "texto": "Entre Semana de lunes a jueves; Estándar y Premium de viernes a domingo y festivos. También está el Día de Calma, sin hospedaje."
    },
    {
      "titulo": "3. Confirmamos y reservas con el 50 %",
      "texto": "Te respondemos con la disponibilidad y el total. Con el 50 % de anticipo queda confirmada; el resto se paga el día de la llegada por link."
    }
  ],
  "nota": ""
}$json$::jsonb),

('no_encontrado', $json${
  "titulo": "Esta página se perdió en la neblina",
  "mensaje": "La dirección que buscas no existe o cambió de lugar. Vuelve al inicio o escríbenos por WhatsApp y te orientamos.",
  "cta_texto": "Volver al inicio",
  "cta_href": "/",
  "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/03.webp",
  "imagen_alt": "Deck de inmersión metálico suspendido entre los árboles del bosque de niebla"
}$json$::jsonb)
on conflict (clave) do update set
  valor          = excluded.valor,
  actualizado_at = now();


-- ----------------------------------------------------------------------------
-- FOTOS DE LAS EXPERIENCIAS
--
-- Son las únicas imágenes del sitio anterior que se conservan: el Drive no trae
-- ninguna foto de la mesa de aniversario ni de la bandeja de cumpleaños, y
-- estas dos sí muestran lo que el hotel monta en la cabaña. Revisadas una por
-- una: no llevan el nombre antiguo del hotel.
-- ----------------------------------------------------------------------------
update extras set imagen_url = 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/experiencias/pw-finca-aniversario-con-amor-21-2-21.webp'
 where nombre = 'Aniversario con Amor';
update extras set imagen_url = 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/experiencias/experiencia-cumpleanos-30.webp'
 where nombre = 'Cumpleaños con Amor';

-- ----------------------------------------------------------------------------
-- GALERÍAS DE LAS CABAÑAS
--
-- Las fotos oficiales que el cliente entregó en septiembre de 2026, ya subidas
-- al bucket bajo `drive/`. El orden es el de `src/lib/fotos.ts`: primero el
-- rasgo que hace única a esa cabaña (es la portada de las tarjetas y del
-- zigzag), después la habitación y las zonas de estar, y el baño al final.
--
-- Las fichas gráficas «0. PORTADA …» NO entran: son texto dentro de una imagen
-- y llevan impreso el nombre antiguo del hotel.
--
-- Se BORRA la galería entera antes de insertar. No basta con un
-- `on conflict do update`: eso actualiza las filas que vuelven a aparecer pero
-- deja vivas las que ya no están, y así es como acabaron mezcladas en la misma
-- galería las fotos del WordPress viejo, las de `drive/` y las de `web/`.
--
-- Consecuencia asumida: si el cliente añade fotos desde el panel, volver a
-- correr este seed se las lleva. Es el mismo aviso de la cabecera del archivo.
-- ----------------------------------------------------------------------------
delete from imagenes where alojamiento_id is not null;

insert into imagenes (alojamiento_id, url, alt, orden)
select a.id, f.url, f.alt, f.orden
from (values
  ('cabana-01', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-01/01.webp', 'Habitación de la Cabaña 01 en el nivel superior, con cama doble bajo el techo de madera', 1),
  ('cabana-01', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-01/06.webp', 'Jacuzzi privado al aire libre de la Cabaña 01, con toallas y vista a las montañas', 2),
  ('cabana-01', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-01/03.webp', 'Balcón de la Cabaña 01 con hamaca, mesa para dos y vista al bosque de niebla', 3),
  ('cabana-01', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-01/05.webp', 'Cocina y comedor del nivel inferior de la Cabaña 01, con barra, sillas altas y sillones', 4),
  ('cabana-01', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-01/02.webp', 'Sala del nivel inferior de la Cabaña 01, con cojines, tapete y plantas', 5),
  ('cabana-01', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-01/04.webp', 'Baño privado de la Cabaña 01, con azulejos azules y hortensias', 6),
  ('cabana-02', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-02/05.webp', 'Jacuzzi privado de la Cabaña 02 bajo el árbol, rodeado de guadua, con toallas dobladas', 1),
  ('cabana-02', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-02/04.webp', 'Terraza de la Cabaña 02 con hamaca, mesa para dos y vista a las montañas', 2),
  ('cabana-02', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-02/01.webp', 'Habitación de la Cabaña 02 con cama doble, paredes de madera y mininevera', 3),
  ('cabana-02', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-02/03.webp', 'Estación de café y aromáticas de la Cabaña 02, junto a la ventana', 4),
  ('cabana-02', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-02/02.webp', 'Baño privado de la Cabaña 02 con ducha, lavamanos y espejo', 5),
  ('cabana-03', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/02.webp', 'Balcón techado de la Cabaña 03 con hamaca y comedor, frente al bosque de niebla', 1),
  ('cabana-03', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/11.webp', 'Habitación de la Cabaña 03 con cama doble y ventanal al balcón', 2),
  ('cabana-03', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/10.webp', 'Comedor en el balcón de la Cabaña 03, con hamaca y vista al valle', 3),
  ('cabana-03', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/09.webp', 'Jacuzzi exterior de las cabañas 03 y 04, con toallas y vista al bosque', 4),
  ('cabana-03', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/06.webp', 'Zona social techada de las cabañas 03 y 04, con cocina de isla y comedor', 5),
  ('cabana-03', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/07.webp', 'Sala compartida de las cabañas 03 y 04, con sillones de madera y ventanales al bosque', 6),
  ('cabana-03', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/04.webp', 'Rincón de la Cabaña 03 con batas, cojines y mesa baja junto al ventanal', 7),
  ('cabana-03', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/03.webp', 'Interior de la Cabaña 03 con mininevera, estación de café y ventana al bosque', 8),
  ('cabana-03', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/01.webp', 'Estación de café de la Cabaña 03, con cafetera, jarra y vasos', 9),
  ('cabana-03', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/08.webp', 'Fachada blanca y techo azul de la Cabaña 03, con jardineras de flores', 10),
  ('cabana-03', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/05.webp', 'Baño privado de la Cabaña 03 con ducha, lavamanos y espejo', 11),
  ('cabana-04', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/05.webp', 'Balcón de la Cabaña 04 con hamaca, comedor redondo y vista al bosque de niebla', 1),
  ('cabana-04', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/04.webp', 'Habitación de la Cabaña 04 con cama doble y ventanal al balcón', 2),
  ('cabana-04', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/11.webp', 'Jacuzzi exterior de las cabañas 03 y 04, rodeado de guadua, con toallas', 3),
  ('cabana-04', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/06.webp', 'Zona social techada de las cabañas 03 y 04, con cocina de isla y comedor', 4),
  ('cabana-04', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/07.webp', 'Sala compartida de las cabañas 03 y 04, con sillones de madera y ventanales al bosque', 5),
  ('cabana-04', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/09.webp', 'Rincón de estar y estación de café de la Cabaña 04, con vista al bosque', 6),
  ('cabana-04', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/02.webp', 'Rincón de la Cabaña 04 con cojines y mesa baja junto a la ventana', 7),
  ('cabana-04', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/08.webp', 'Batas térmicas y lámpara junto al ventanal de la Cabaña 04', 8),
  ('cabana-04', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/01.webp', 'Estación de café de la Cabaña 04, con cafetera, jarra y vasos', 9),
  ('cabana-04', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/10.webp', 'Fachada blanca y techo azul de la Cabaña 04, con jardineras de flores', 10),
  ('cabana-04', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/03.webp', 'Baño privado de la Cabaña 04 con ducha, lavamanos y toallas', 11),
  ('cabana-05', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-05/05.webp', 'Chimenea encendida de la Cabaña 05, la única cabaña que tiene, con cojines y juegos de mesa', 1),
  ('cabana-05', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-05/03.webp', 'Cama doble de la Cabaña 05 junto al ventanal, con vista panorámica a la montaña', 2),
  ('cabana-05', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-05/04.webp', 'Comedor para dos de la Cabaña 05 frente al ventanal, con vista al valle', 3),
  ('cabana-05', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-05/01.webp', 'Sala y cocina de la Cabaña 05, con barra de piedra y ventanal al bosque', 4),
  ('cabana-05', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-05/06.webp', 'Jacuzzi privado exterior de la Cabaña 05, con toallas y vista al jardín', 5),
  ('cabana-05', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-05/02.webp', 'Baño privado de la Cabaña 05 con ducha, lavamanos y plantas', 6)
) as f(slug, url, alt, orden)
join alojamientos a on a.slug = f.slug
on conflict (url) do update set
  alojamiento_id = excluded.alojamiento_id,
  alt            = excluded.alt,
  orden          = excluded.orden;

