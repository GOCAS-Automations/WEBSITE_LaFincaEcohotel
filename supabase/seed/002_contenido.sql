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
  "correo": "fincavillarrealcali@gmail.com",
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
  "mapa_embed": "https://maps.google.com/maps?q=3.5068719,-76.6267478(La+Finca+Eco+Hotel)&z=15&hl=es&ie=UTF8&output=embed",
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
    "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/sitio/social/tarjeta-og-marca-oficial-1200x630.webp",
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
  "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/heroes/portada-escritorio.webp",
  "imagen_movil": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/heroes/portada-movil.webp",
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

('home.instagram', $json${
  "antetitulo": "Instagram",
  "titulo": "La Finca, día a día",
  "descripcion": "La neblina de las seis, la fogata de las nueve y los colibríes del bebedero. Así se ve esto cuando no hay nadie fotografiándolo para un folleto.",
  "cta_texto": "Síguenos en Instagram",
  "reel_url": "https://www.instagram.com/reel/DbO8x0SxnFX/",
  "reel_alt": "Reel de La Finca Eco Hotel en Instagram: el bosque de niebla desde el mirador",
  "fotos": [
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/08.webp",
      "alt": "Pareja abrigada frente a la fogata encendida de La Finca, de noche",
      "ancho": 941,
      "alto": 1421
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-01/03.webp",
      "alt": "Balcón de la Cabaña 01 con hamaca, mesa para dos y vista al bosque de niebla",
      "ancho": 1086,
      "alto": 1231
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/06.webp",
      "alt": "Piscina de agua fría de La Finca con su chorrera, frente a las montañas y las nubes",
      "ancho": 1086,
      "alto": 1231
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/04.webp",
      "alt": "Ducha de madera al aire libre de La Finca, en medio del bosque",
      "ancho": 1086,
      "alto": 1231
    }
  ]
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
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/heroes/alojamientos.webp",
    "imagen_alt": "Balcón techado de la Cabaña 03 con hamaca y comedor, frente al bosque de niebla"
  },
  "experiencias": {
    "titulo": "Experiencias",
    "subtitulo": "Aniversarios y cumpleaños listos al llegar, y los detalles que se añaden a tu reserva.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/heroes/experiencias.webp",
    "imagen_alt": "Jacuzzi privado de la Cabaña 02 bajo el árbol, rodeado de guadua, con toallas dobladas"
  },
  "conocenos": {
    "titulo": "Conócenos",
    "subtitulo": "Una reserva natural en el Km 18, con jacuzzi, turco, piscina de agua fría, restaurante y senderos.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/heroes/conocenos.webp",
    "imagen_alt": "Las cabañas de techo azul de La Finca Eco Hotel sobre la ladera, con los senderos y los jardines"
  },
  "galeria": {
    "titulo": "Galería",
    "subtitulo": "El bosque, las cabañas y los rincones de La Finca en imágenes.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/heroes/galeria.webp",
    "imagen_alt": "Mesa y sillas de piedra bajo las farolas de La Finca, entre la neblina del atardecer"
  },
  "faq": {
    "titulo": "Preguntas frecuentes",
    "subtitulo": "Lo que más nos preguntan antes de llegar: cómo llegar, el clima, las mascotas, los pagos y las reglas de la casa.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/heroes/faq.webp",
    "imagen_alt": "Terraza de la Cabaña 02 con hamaca, hortensias y vista a las montañas"
  },
  "contacto": {
    "titulo": "Contacto",
    "subtitulo": "Escríbenos por WhatsApp: resolvemos dudas y confirmamos disponibilidad el mismo día.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/heroes/contacto.webp",
    "imagen_alt": "Chimenea encendida de la Cabaña 05 de La Finca Eco Hotel, con cojines y juegos de mesa"
  },
  "reservar": {
    "titulo": "Reserva tu estadía",
    "subtitulo": "Elige cabaña y plan, y confirmamos tu fecha por WhatsApp en pocos minutos.",
    "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/heroes/reservar.webp",
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
      "respuesta": "Desde la 1:00 p. m. puedes usar el restaurante, los senderos, los decks y las zonas sociales. La cabaña se entrega a las 3:00 p. m. y puedes llegar hasta las 7:00 p. m. El check-out es a las 12:00 m."
    },
    {
      "pregunta": "¿Cómo se reserva y cómo se paga?",
      "respuesta": "Con un anticipo del 50 % se confirma la reserva, y al reservar puedes elegir adelantar más —hasta el 100 %— si prefieres llegar sin nada pendiente. Lo que quede se paga antes de la llegada con un link de pago que te enviamos con anticipación. En La Finca no hay datáfono ni manejamos efectivo. Nunca te pediremos los datos de tu tarjeta por WhatsApp."
    },
    {
      "pregunta": "¿Puedo reservar para el mismo día?",
      "respuesta": "Por el sitio, no: las reservas en línea —de hospedaje y de Día de Calma— son a partir del día siguiente, así alcanzamos a alistar todo y recibirte como se debe. Si quieres venir hoy mismo, escríbenos por WhatsApp: si hay disponibilidad, lo resolvemos ahí mismo."
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
      "pregunta": "¿Pueden ir menores de edad?",
      "respuesta": "No. La Finca es una experiencia exclusiva para adultos: no recibimos menores de edad en ninguna de las cabañas ni en las zonas comunes. Las cabañas son para dos personas y todo el lugar —el silencio, la zona de hidroterapia, los senderos— está pensado para parejas que vienen a desconectarse."
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
  "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/02.webp",
  "imagen_alt": "Corredor techado de La Finca con jardineras y baranda de madera, abierto al bosque de niebla del Km 18",
  "imagen_secundaria": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-01/06.webp",
  "imagen_secundaria_alt": "Jacuzzi privado al aire libre de la Cabaña 01, con toallas y vista a las montañas",
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
      "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/heroes/portada-escritorio.webp",
      "imagen_alt": "Corredor techado de La Finca Eco Hotel abierto al bosque de niebla del Km 18, con jardineras y baranda de madera"
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
      "imagen": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/zonas-comunes/01.webp",
      "imagen_alt": "Deck techado de La Finca con comedor de vidrio y sillas, frente a las montañas",
      "imagen_posicion": "center bottom"
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

('conocenos.reconocimiento', $json${
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
      "alt": "Rincón de estar y estación de café de la Cabaña 04, con ventana al bosque de niebla",
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
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-01/04.webp",
      "alt": "Baño privado de la Cabaña 01, con azulejos azules y hortensias",
      "ancho": 1448,
      "alto": 923
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-03/03.webp",
      "alt": "Interior de la Cabaña 03 con mininevera, estación de café y ventana al bosque",
      "ancho": 1086,
      "alto": 1231
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-02/02.webp",
      "alt": "Baño privado de la Cabaña 02 con ducha, lavamanos y espejo",
      "ancho": 1448,
      "alto": 923
    },
    {
      "url": "https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-05/02.webp",
      "alt": "Baño privado de la Cabaña 05 con ducha, lavamanos y plantas",
      "ancho": 1122,
      "alto": 1192
    }
  ]
}$json$::jsonb),

('reservar', $json${
  "intro": "Empieza por tu cabaña: con ella te mostramos sus fechas libres y el precio noche por noche. Te llevamos a WhatsApp con el mensaje ya escrito y confirmamos disponibilidad el mismo día.",
  "pasos": [
    {
      "titulo": "Tu cabaña",
      "texto": "Elige una de las cinco, todas para dos. ¿Vienes solo de día? Elige el Día de Calma, sin hospedaje."
    },
    {
      "titulo": "Tus fechas",
      "texto": "El calendario te muestra las fechas libres de esa cabaña: las noches ocupadas salen tachadas."
    },
    {
      "titulo": "Tu plan",
      "texto": "Si tu estadía toca fin de semana o festivo, eliges entre Estándar y Premium. Entre semana el plan es automático."
    },
    {
      "titulo": "Tus experiencias",
      "texto": "Torta, fondue o arreglo floral, la noche que tú digas. Puedes dejarlo en blanco: nada de esto es obligatorio."
    },
    {
      "titulo": "Cuánto pagas ahora",
      "texto": "Eliges entre el 50 % —el mínimo que confirma— y el 100 %. El resto se paga por link antes de llegar."
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
}$json$::jsonb),

('legal.privacidad', $json${
  "titulo": "Política de privacidad",
  "entrada": "Cómo tratamos la información de quienes visitan este sitio y se comunican con nosotros.",
  "descripcion": "Política de privacidad de La Finca Eco Hotel: qué información recogemos en el sitio web, para qué la usamos y con quién la compartimos.",
  "actualizado": "2026-09-30",
  "secciones": [
    {
      "titulo": "1. Quiénes somos",
      "parrafos": [
        "La Finca Eco Hotel (titular: Raquel Lenis García, persona natural · NIT 66830269-5 · RNT 114565) es el responsable de la información personal que se recoge a través de este sitio web. Nuestro domicilio es Km 18 vía Cali–Buenaventura, Vereda Loma Alta, Valle del Cauca, Colombia y nuestro canal de atención es WhatsApp +57 316 047 6671 o el correo fincavillarrealcali@gmail.com."
      ]
    },
    {
      "titulo": "2. Qué información recogemos",
      "parrafos": [
        "Este sitio no tiene formularios de registro ni de contacto: no pedimos datos para navegarlo. La información personal llega por dos vías:",
        "- La que nos escribes voluntariamente por WhatsApp o por nuestras redes sociales cuando consultas disponibilidad o haces una reserva: nombre, número de teléfono y los datos de la estadía.\n- La que entregas al reservar y pagar, cuando ese servicio esté disponible en el sitio: nombre, documento de identidad, correo electrónico, teléfono y los datos de la transacción.",
        "También recogemos información técnica anónima de navegación (páginas visitadas, tipo de dispositivo, ciudad aproximada) mediante herramientas de analítica, con el único fin de entender qué contenido resulta útil y mejorar el sitio."
      ]
    },
    {
      "titulo": "3. Para qué la usamos",
      "parrafos": [
        "- Responder tus consultas y confirmar tu reserva.\n- Prestar el servicio de alojamiento y los servicios adicionales que contrates.\n- Cumplir las obligaciones legales de un prestador de servicios turísticos en Colombia, incluido el registro de huéspedes.\n- Enviarte información sobre tu reserva (confirmación, instrucciones de llegada, cambios).\n- Mejorar el sitio y nuestros servicios con información estadística agregada.",
        "No vendemos ni cedemos tu información a terceros con fines publicitarios."
      ]
    },
    {
      "titulo": "4. Con quién la compartimos",
      "parrafos": [
        "Solo con los proveedores que hacen posible el servicio, y únicamente con lo que necesitan para prestarlo:",
        "- El proveedor de alojamiento del sitio y de la base de datos, para almacenar la información de forma segura.\n- La pasarela de pagos, cuando hagas un pago en línea. Los datos de tu tarjeta se procesan directamente en la pasarela: nosotros nunca los recibimos ni los guardamos.\n- El proveedor de correo transaccional, para enviarte la confirmación de tu reserva.\n- Las autoridades competentes, cuando una norma nos obligue a entregarla."
      ]
    },
    {
      "titulo": "5. Cookies y analítica",
      "parrafos": [
        "El sitio usa cookies técnicas necesarias para funcionar y, cuando estén activas, cookies de analítica que nos ayudan a medir el tráfico de forma agregada. Puedes bloquearlas o borrarlas desde la configuración de tu navegador; el sitio seguirá funcionando.",
        "El mapa de la página de contacto es un servicio de Google incrustado: al cargarlo, Google puede recoger información según sus propias políticas."
      ]
    },
    {
      "titulo": "6. Tus derechos",
      "parrafos": [
        "Puedes conocer, actualizar, rectificar y suprimir tu información, y revocar la autorización que nos diste para tratarla, en los términos de la Ley 1581 de 2012. El detalle del procedimiento está en nuestra política de tratamiento de datos personales.",
        "Para ejercerlos, escríbenos al correo fincavillarrealcali@gmail.com."
      ]
    },
    {
      "titulo": "7. Cambios en esta política",
      "parrafos": [
        "Si modificamos esta política publicaremos la nueva versión en esta misma página, con su fecha de actualización. Te recomendamos revisarla de vez en cuando."
      ]
    }
  ]
}$json$::jsonb),

('legal.terminos', $json${
  "titulo": "Términos y condiciones",
  "entrada": "Las reglas de uso del sitio y las condiciones de la reserva y la estadía.",
  "descripcion": "Términos y condiciones de La Finca Eco Hotel: uso del sitio, reservas, tarifas, pagos y normas de la estadía en la reserva natural.",
  "actualizado": "2026-10-05",
  "secciones": [
    {
      "titulo": "1. Objeto y aceptación",
      "parrafos": [
        "Estos términos regulan el uso del sitio web de La Finca Eco Hotel (titular: Raquel Lenis García, persona natural · NIT 66830269-5 · RNT 114565) y la contratación de los servicios de alojamiento y experiencias que ofrecemos. Al usar el sitio o al hacer una reserva, aceptas estas condiciones."
      ]
    },
    {
      "titulo": "2. Información del sitio",
      "parrafos": [
        "Procuramos que la información publicada —descripciones, fotografías, servicios y tarifas— sea exacta y esté al día. Las fotografías son de nuestras instalaciones reales y son ilustrativas: la decoración y la dotación pueden variar entre cabañas y con el tiempo.",
        "Las tarifas publicadas son referenciales para temporada baja y pueden variar según la temporada, los días festivos y la demanda. La tarifa aplicable es la que se confirme al momento de cerrar la reserva."
      ]
    },
    {
      "titulo": "3. Reservas",
      "parrafos": [
        "- Una solicitud de reserva no es una reserva confirmada. La reserva queda en firme cuando la confirmamos expresamente y se cumple la condición de pago acordada.\n- Las cabañas están diseñadas para dos personas. Cualquier ocupación distinta debe acordarse antes de la llegada.\n- Para hacer una reserva debes ser mayor de edad y entregar información veraz.\n- Al llegar, todos los huéspedes deben presentar un documento de identidad válido, como exige la normativa turística colombiana."
      ]
    },
    {
      "titulo": "4. Tarifas y pagos",
      "parrafos": [
        "- Todos los precios se expresan en pesos colombianos (COP) e incluyen los impuestos aplicables, salvo que se indique lo contrario.\n- La tarifa corresponde al plan elegido (Entre Semana, Estándar o Premium) por noche y para dos personas. El plan Día de Calma se cobra por el día y no incluye hospedaje.\n- Las experiencias y servicios adicionales se cobran aparte de la tarifa de alojamiento.\n- Para confirmar la reserva se paga un anticipo de mínimo el 50 % del total; al reservar puedes elegir adelantar más, hasta el 100 %. Lo que quede pendiente se paga antes de la llegada, mediante un link de pago que enviamos con anticipación.\n- En La Finca no hay datáfono ni se maneja efectivo. Nunca solicitamos datos de tarjeta por WhatsApp ni por ningún otro canal de mensajería.\n- Los pagos en línea se procesan a través de una pasarela autorizada. No almacenamos los datos de tu medio de pago."
      ]
    },
    {
      "titulo": "5. Llegada, salida y estadía",
      "parrafos": [
        "Desde las 13:00 puedes usar el restaurante, los senderos, los decks y las zonas sociales. La cabaña se entrega a las 15:00, se puede llegar hasta las 19:00 y la salida es hasta las 12:00 m. Los cambios de horario dependen de la disponibilidad y deben acordarse previamente.",
        "El restaurante atiende todos los días en el horario publicado en el sitio y es de uso exclusivo para huéspedes. El desayuno está incluido en los tres planes de hospedaje.",
        "La Finca es un establecimiento para adultos. No se permite el ingreso ni el alojamiento de menores de edad en ninguna de las cabañas ni en las zonas comunes, sin excepción. La reserva se entiende hecha para huéspedes mayores de dieciocho (18) años, y el incumplimiento de esta condición faculta al hotel para no prestar el servicio, sin derecho a reembolso."
      ]
    },
    {
      "titulo": "6. Normas de la reserva natural",
      "parrafos": [
        "La Finca está dentro de una reserva natural. Estas normas existen para proteger el bosque y a las especies que lo habitan, y su incumplimiento puede dar lugar a la terminación de la estadía sin reembolso:",
        "- No se permite el ingreso de vehículos a la propiedad. El parqueadero es externo y vigilado 24 horas.\n- El recorrido del bosque se hace únicamente por los senderos habilitados. No está permitido internarse en el bosque.\n- Las mascotas son bienvenidas en todas las áreas, bajo la responsabilidad y el cuidado permanente de sus acompañantes. La primera no tiene costo; a partir de la segunda se cobra el valor publicado por estadía.\n- No está permitido fumar dentro de las cabañas ni en las zonas cerradas.\n- No se permite encender fuego fuera de los espacios dispuestos para ello.\n- Te pedimos cuidar el descanso de los demás huéspedes: somos pocas cabañas y el silencio es parte de lo que se viene a buscar."
      ]
    },
    {
      "titulo": "7. Responsabilidad",
      "parrafos": [
        "Respondemos por la correcta prestación de los servicios contratados. No respondemos por los objetos de valor que dejes sin custodia, ni por los daños derivados del incumplimiento de las normas de seguridad y de la reserva natural, ni por hechos de fuerza mayor o caso fortuito, como cierres de vía, fenómenos climáticos o cortes prolongados de servicios públicos.",
        "El uso de la piscina, el jacuzzi, el turco y los senderos es bajo tu propia responsabilidad."
      ]
    },
    {
      "titulo": "8. Propiedad intelectual",
      "parrafos": [
        "Los textos, fotografías, marcas y demás contenidos de este sitio son propiedad de La Finca Eco Hotel o se usan con autorización. No pueden reproducirse ni usarse con fines comerciales sin nuestro permiso escrito."
      ]
    },
    {
      "titulo": "9. Ley aplicable y solución de controversias",
      "parrafos": [
        "Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia se intentará resolver de buena fe entre las partes y, de no lograrse, se someterá a los jueces competentes del país."
      ]
    },
    {
      "titulo": "10. Cambios",
      "parrafos": [
        "Podemos actualizar estos términos. La versión vigente es siempre la publicada en esta página, con su fecha de actualización. Los cambios no afectan las reservas ya confirmadas."
      ]
    }
  ]
}$json$::jsonb),

('legal.datos', $json${
  "titulo": "Política de tratamiento de datos personales",
  "entrada": "Política adoptada conforme a la Ley 1581 de 2012 y al Decreto 1074 de 2015.",
  "descripcion": "Política de tratamiento de datos personales de La Finca Eco Hotel, conforme a la Ley 1581 de 2012: finalidades, derechos del titular y procedimiento de consultas y reclamos.",
  "actualizado": "2026-09-30",
  "secciones": [
    {
      "titulo": "1. Responsable del tratamiento",
      "parrafos": [
        "La Finca Eco Hotel (titular: Raquel Lenis García, persona natural · NIT 66830269-5 · RNT 114565), con domicilio en Km 18 vía Cali–Buenaventura, Vereda Loma Alta, Valle del Cauca, Colombia, es el responsable del tratamiento de los datos personales que recolecta en desarrollo de su actividad de alojamiento turístico. Canal de atención: WhatsApp +57 316 047 6671 o el correo fincavillarrealcali@gmail.com.",
        "Razón social: Raquel Lenis García, persona natural. NIT 66830269-5. Nombre comercial: La Finca Eco Hotel. Registro Nacional de Turismo (RNT): 114565."
      ]
    },
    {
      "titulo": "2. Marco normativo",
      "parrafos": [
        "Esta política se adopta en cumplimiento de la Ley 1581 de 2012, del Decreto 1074 de 2015 (que compiló el Decreto 1377 de 2013) y de las demás normas que los modifiquen o complementen."
      ]
    },
    {
      "titulo": "3. Datos que tratamos",
      "parrafos": [
        "- Datos de identificación: nombre completo, tipo y número de documento.\n- Datos de contacto: teléfono, correo electrónico y ciudad de residencia.\n- Datos de la reserva: fechas de estadía, cabaña, plan, número de acompañantes y solicitudes especiales.\n- Datos de la transacción: valor, medio de pago y estado. Los datos de la tarjeta los procesa directamente la pasarela de pagos y no quedan en nuestros sistemas.",
        "No solicitamos datos sensibles. Si por alguna necesidad de la estadía nos compartes información de salud o alimentación, la trataremos únicamente para atender esa solicitud, con tu autorización expresa y sabiendo que no estás obligado a entregarla."
      ]
    },
    {
      "titulo": "4. Finalidades del tratamiento",
      "parrafos": [
        "- Gestionar la reserva, el pago y la prestación del servicio de alojamiento y de las experiencias contratadas.\n- Enviar comunicaciones relacionadas con la reserva y la estadía.\n- Cumplir las obligaciones legales, contables y tributarias, incluido el registro de huéspedes exigido a los prestadores de servicios turísticos.\n- Atender peticiones, quejas y reclamos.\n- Evaluar la calidad del servicio.\n- Enviar información comercial sobre promociones y novedades, únicamente si nos autorizas expresamente para ello."
      ]
    },
    {
      "titulo": "5. Autorización del titular",
      "parrafos": [
        "La autorización es previa, expresa e informada, y se obtiene ANTES de que nos entregues tus datos. En el sitio web, antes de enviar una solicitud de reserva tienes que marcar una casilla —que nunca viene marcada— en la que autorizas el tratamiento y desde la que puedes abrir esta política.",
        "Si la reserva se hace por teléfono o en el hotel, te informamos de las finalidades y te pedimos la autorización de viva voz antes de tomar tus datos. Nunca entendemos el silencio ni el simple uso del sitio como una autorización.",
        "Conservamos prueba de la autorización otorgada, en los términos del artículo 2.2.2.25.2.4 del Decreto 1074 de 2015: de cada reserva queda registrada la fecha en que autorizaste, el canal por el que lo hiciste y la versión de esta política que estaba publicada en ese momento.",
        "Puedes revocar la autorización en cualquier momento escribiéndonos por los canales de la sección 7, salvo que exista un deber legal o contractual que nos obligue a conservar algún dato (por ejemplo, las facturas)."
      ]
    },
    {
      "titulo": "6. Derechos del titular",
      "parrafos": [
        "Como titular de los datos, y de acuerdo con el artículo 8 de la Ley 1581 de 2012, tienes derecho a:",
        "- Conocer, actualizar y rectificar tus datos personales.\n- Solicitar prueba de la autorización que otorgaste.\n- Ser informado, previa solicitud, sobre el uso que le hemos dado a tus datos.\n- Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la ley.\n- Revocar la autorización y solicitar la supresión de tus datos, cuando no exista un deber legal o contractual que obligue a conservarlos.\n- Acceder de forma gratuita a los datos que hayan sido objeto de tratamiento."
      ]
    },
    {
      "titulo": "7. Consultas y reclamos",
      "parrafos": [
        "Toda consulta o reclamo puede presentarse al correo fincavillarrealcali@gmail.com, que es el canal dispuesto para que los titulares ejerzan sus derechos sobre sus datos personales (Ley 1581 de 2012), o por WhatsApp +57 316 047 6671, indicando tu nombre, tu documento, la descripción de los hechos y los datos de contacto para responderte.",
        "- Consultas: se atienden en un término máximo de diez (10) días hábiles. Si no fuera posible, te informaremos los motivos y la fecha en que se atenderá, dentro de los cinco (5) días hábiles siguientes al vencimiento del primer plazo.\n- Reclamos: se atienden en un término máximo de quince (15) días hábiles contados desde el día siguiente a su recepción. Si no fuera posible, te informaremos los motivos y la nueva fecha, que no superará los ocho (8) días hábiles siguientes al vencimiento del primer término.\n- Si el reclamo llega incompleto, te pediremos que lo completes dentro de los cinco (5) días siguientes; transcurridos dos (2) meses sin respuesta, se entenderá desistido."
      ]
    },
    {
      "titulo": "8. Seguridad y conservación",
      "parrafos": [
        "Aplicamos medidas técnicas, humanas y administrativas razonables para proteger los datos contra el acceso no autorizado, la pérdida o la alteración. El acceso está restringido al personal que lo necesita para prestar el servicio.",
        "Los datos se conservan durante el tiempo necesario para cumplir las finalidades descritas y los plazos de conservación legales y contables aplicables. Estos son los plazos que aplicamos:",
        "- Solicitudes de reserva que no llegan a concretarse: se eliminan a los seis (6) meses.\n- Datos de una reserva cumplida (nombre, contacto y detalle de la estadía): cinco (5) años desde la salida, que es el plazo de prescripción de las obligaciones civiles y comerciales en Colombia.\n- Documento de identidad del registro de huéspedes: el tiempo que exija la normativa turística y tributaria aplicable, y no más.\n- Soportes contables y de pago: diez (10) años, por el artículo 28 de la Ley 962 de 2005 y las normas contables.\n- Prueba de la autorización de tratamiento: mientras conservemos los datos a los que se refiere, y dos (2) años más.\n- Conversaciones de WhatsApp con solicitudes de reserva: dos (2) años.",
        "Cumplido el plazo, los datos se eliminan o se anonimizan de forma que ya no permitan identificar al titular. Puedes pedir la supresión antes de esos plazos y la atenderemos salvo que exista un deber legal o contractual de conservarlos."
      ]
    },
    {
      "titulo": "9. Encargados y transferencias",
      "parrafos": [
        "Para prestar el servicio usamos proveedores tecnológicos (alojamiento del sitio, base de datos, pasarela de pagos y correo transaccional) que actúan como encargados del tratamiento y que pueden operar servidores fuera de Colombia. En esos casos exigimos que apliquen estándares de protección equivalentes a los de la normativa colombiana."
      ]
    },
    {
      "titulo": "10. Vigencia",
      "parrafos": [
        "Esta política rige desde el 2026-09-30 y permanecerá vigente mientras desarrollemos nuestra actividad. Las bases de datos se conservarán por el tiempo necesario para cumplir las finalidades autorizadas."
      ]
    }
  ]
}$json$::jsonb),

('legal.cancelacion', $json${
  "titulo": "Política de cancelación y reembolsos",
  "entrada": "Qué pasa si necesitas cambiar tu reserva, y en qué casos no hay devolución.",
  "descripcion": "Política de cancelación de La Finca Eco Hotel: cambios de fecha, no presentación y derecho de retracto.",
  "actualizado": "2026-09-30",
  "secciones": [
    {
      "titulo": "1. Antes de reservar",
      "parrafos": [
        "Somos un hotel pequeño: cada cancelación deja una cabaña vacía que difícilmente se vuelve a vender con poca antelación. Por eso nuestra política es estricta y te pedimos leerla antes de confirmar.",
        "Las condiciones aplicables son las vigentes al momento de confirmar tu reserva y quedan indicadas en el mensaje de confirmación."
      ]
    },
    {
      "titulo": "2. La reserva no es reembolsable",
      "parrafos": [
        "Una vez confirmada la reserva no hay reembolsos, ni totales ni parciales, del anticipo ni de ningún otro pago.",
        "Lo que sí ofrecemos es un cambio de fecha, en las condiciones del punto siguiente."
      ]
    },
    {
      "titulo": "3. Cambio de fecha",
      "parrafos": [
        "- Se solicita con mínimo tres (3) días calendario de anticipación a la fecha de llegada.\n- Se permite un (1) solo cambio por reserva.\n- Está sujeto a disponibilidad. Si la nueva fecha corresponde a una tarifa más alta, se cobra la diferencia; si es más baja, no se reembolsa la diferencia.\n- La solicitud debe hacerse por escrito a nuestro canal de atención. La fecha que cuenta es la de recepción del mensaje."
      ]
    },
    {
      "titulo": "4. No presentación y salida anticipada",
      "parrafos": [
        "Cancelar el mismo día de la llegada, o no presentarse, se considera un incumplimiento de la reserva: no da lugar a devolución ni a reprogramación.",
        "Si decides marcharte antes de terminar la estadía, tampoco se reembolsan las noches no utilizadas."
      ]
    },
    {
      "titulo": "5. Cancelación por parte del hotel",
      "parrafos": [
        "Si por una causa que nos sea imputable no pudiéramos prestarte el servicio, te ofreceremos una fecha alternativa o el reembolso íntegro de lo pagado, a tu elección.",
        "En casos de fuerza mayor o caso fortuito ajenos a las dos partes —cierre prolongado de la vía, emergencia climática, orden de autoridad— te ofreceremos el cambio de fecha sin costo o un saldo a favor por el valor pagado, válido durante doce (12) meses."
      ]
    },
    {
      "titulo": "6. Derecho de retracto",
      "parrafos": [
        "En las compras hechas a distancia se aplica el derecho de retracto del artículo 47 de la Ley 1480 de 2011 (Estatuto del Consumidor): puedes retractarte dentro de los cinco (5) días hábiles siguientes a la compra y recibir el reembolso de lo pagado. Este derecho es de orden público y prevalece sobre el punto 2 de esta política.",
        "No aplica cuando la prestación del servicio comienza, de común acuerdo, antes de que venza ese plazo: es decir, cuando la fecha de llegada está dentro de esos cinco días hábiles."
      ]
    },
    {
      "titulo": "7. Cómo se hacen los reembolsos",
      "parrafos": [
        "Cuando corresponda un reembolso —por retracto, o por una cancelación nuestra—:",
        "- Se hace por el mismo medio de pago con el que se hizo la transacción.\n- El tiempo de acreditación depende de la entidad financiera y de la pasarela de pagos; normalmente toma entre cinco (5) y quince (15) días hábiles.\n- Los costos de la transacción que la pasarela no devuelva podrán descontarse del valor a reembolsar."
      ]
    },
    {
      "titulo": "8. Cómo solicitarlo",
      "parrafos": [
        "Escríbenos por WhatsApp +57 316 047 6671 o el correo fincavillarrealcali@gmail.com indicando el nombre de la reserva, las fechas y el motivo. Te confirmaremos por el mismo canal el trámite y el valor que corresponda."
      ]
    }
  ]
}$json$::jsonb)
on conflict (clave) do update set
  valor          = excluded.valor,
  actualizado_at = now();


-- ----------------------------------------------------------------------------
-- CLAVES RETIRADAS DEL CMS
-- ----------------------------------------------------------------------------
delete from contenido where clave in ('home.esencia');


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
update extras set imagen_url = 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-05/04.webp'
 where nombre = 'Fondue';

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
  ('cabana-04', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/09.webp', 'Rincón de estar y estación de café de la Cabaña 04, con ventana al bosque de niebla', 1),
  ('cabana-04', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/05.webp', 'Balcón de la Cabaña 04 con hamaca, comedor redondo y vista al bosque de niebla', 2),
  ('cabana-04', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/04.webp', 'Habitación de la Cabaña 04 con cama doble y ventanal al balcón', 3),
  ('cabana-04', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/11.webp', 'Jacuzzi exterior de las cabañas 03 y 04, rodeado de guadua, con toallas', 4),
  ('cabana-04', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/06.webp', 'Zona social techada de las cabañas 03 y 04, con cocina de isla y comedor', 5),
  ('cabana-04', 'https://yyfuhytmoiehqmnrekkq.supabase.co/storage/v1/object/public/imagenes/web/cabana-04/07.webp', 'Sala compartida de las cabañas 03 y 04, con sillones de madera y ventanales al bosque', 6),
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

