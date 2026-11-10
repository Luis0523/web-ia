-- ============================================================
--  Datos de demostración - Plataforma de servicios de IA (Turismo)
--  Usuarios demo:
--    admin@webia.test / Admin123!   (administrador)
--    demo@webia.test  / User123!    (usuario)
-- ============================================================

-- ---------- Usuarios ----------
INSERT INTO users (name, email, password_hash, role, token_limit)
VALUES
  ('Administrador', 'admin@webia.test', crypt('Admin123!', gen_salt('bf')), 'admin', 999999),
  ('Usuario Demo',  'demo@webia.test',  crypt('User123!',  gen_salt('bf')), 'user',  60000)
ON CONFLICT (email) DO NOTHING;

-- ---------- Servicios de IA ----------
INSERT INTO services (key, name, description, provider, model, system_prompt, config)
VALUES
  ('rag_chat', 'Chatbot con RAG', 'Responde consultas sobre destinos y actividades usando informacion recuperada de la base de datos.',
    'groq', 'openai/gpt-oss-120b',
    'Eres un asesor turistico. Responde en espanol usando UNICAMENTE el contexto entregado. Si el contexto no alcanza para responder, dilo explicitamente y sugiere reformular la pregunta. Cita las fuentes entre corchetes.',
    '{"kind":"rag"}'::jsonb),
  ('agent_itinerary', 'Agente Planificador de Itinerario', 'Busca destinos, consulta clima y distancias, y arma un itinerario de varios dias.',
    'groq', 'openai/gpt-oss-120b',
    'Eres un planificador de viajes. Usa las herramientas disponibles para obtener datos reales antes de recomendar. Explica el itinerario dia por dia con costos estimados.',
    '{"kind":"agent","tools":["search_destinos","get_actividades","get_clima","get_distancia"]}'::jsonb),
  ('agent_adjust', 'Agente Ajuste de Viaje', 'Recalcula un itinerario ante cambios de presupuesto o clima, buscando alternativas.',
    'groq', 'openai/gpt-oss-120b',
    'Eres un asesor de viajes. Ante un cambio de condiciones, consulta alternativas y clima, recalcula el presupuesto y propone un plan ajustado.',
    '{"kind":"agent","tools":["buscar_alternativas","get_clima","recalcular_presupuesto"]}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------- Destinos ----------
INSERT INTO destinos (nombre, region, pais, lat, lon, descripcion, precio_promedio, clima)
VALUES
  ('Cartagena', 'Bolivar', 'Colombia', 10.3910, -75.4794,
   'Ciudad amurallada del Caribe colombiano, conocida por su arquitectura colonial, playas cercanas y vida nocturna. Ideal para viajes culturales y de descanso.',
   1800, 'Tropical calido, 27-32 C'),
  ('Ciudad de Mexico', 'CDMX', 'Mexico', 19.4326, -99.1332,
   'Capital cultural con museos, gastronomia y zonas arqueologicas cercanas. Base para visitar Teotihuacan, Xochimilco y Coyoacan.',
   2200, 'Templado, 12-24 C'),
  ('Cusco', 'Cusco', 'Peru', -13.5319, -71.9675,
   'Antigua capital inca, puerta de entrada al Valle Sagrado y Machu Picchu. Altitud de 3400 msnm, requiere aclimatacion.',
   1600, 'Frio seco, 5-20 C'),
  ('San Andres', 'San Andres y Providencia', 'Colombia', 12.5847, -81.7006,
   'Isla caribena con arrecifes, playas de arena blanca y mar de siete colores. Popular para buceo y snorkel.',
   2400, 'Tropical, 26-31 C'),
  ('Medellin', 'Antioquia', 'Colombia', 6.2442, -75.5812,
   'Ciudad de la eterna primavera, con telefericos, parques y vida cultural. Base para visitar Guatape y el Penol.',
   1500, 'Primaveral, 16-26 C'),
  ('Bariloche', 'Rio Negro', 'Argentina', -41.1335, -71.3103,
   'Destino de montana en la Patagonia, lagos, bosques y centros de esqui. Ideal en invierno para nieve y en verano para senderismo.',
   2100, 'Frio, -2 a 18 C'),
  ('Antigua Guatemala', 'Sacatepequez', 'Guatemala', 14.5586, -90.7295,
   'Ciudad colonial patrimonio de la humanidad, rodeada de volcanes y cafetales. Famosa por Semana Santa.',
   1300, 'Templado, 14-25 C'),
  ('Punta Cana', 'La Altagracia', 'Republica Dominicana', 18.5601, -68.3725,
   'Zona de resorts todo incluido con playas de arena blanca y aguas turquesa. Enfocada en descanso y deportes acuaticos.',
   2800, 'Tropical, 25-31 C')
ON CONFLICT (nombre) DO NOTHING;

-- ---------- Actividades ----------
INSERT INTO actividades (destino_id, nombre, tipo, descripcion, costo, duracion_hrs)
SELECT d.id, v.nombre, v.tipo, v.descripcion, v.costo, v.duracion
FROM destinos d
JOIN (VALUES
  ('Cartagena', 'Tour ciudad amurallada', 'cultural', 'Recorrido guiado por plazas, murallas y el barrio Getsemani.', 120, 3),
  ('Cartagena', 'Islas del Rosario', 'playa', 'Paseo en lancha y dia de playa en el archipielago.', 350, 8),
  ('Cartagena', 'Clase de cocina caribena', 'gastronomia', 'Preparacion de platos tipicos con chef local.', 180, 3),
  ('Ciudad de Mexico', 'Teotihuacan', 'arqueologia', 'Visita a las piramides del Sol y la Luna con guia.', 250, 6),
  ('Ciudad de Mexico', 'Museo de Antropologia', 'cultural', 'Recorrido por las salas de culturas prehispanicas.', 90, 4),
  ('Ciudad de Mexico', 'Xochimilco en trajinera', 'recreativo', 'Paseo en embarcacion por los canales.', 150, 3),
  ('Cusco', 'Valle Sagrado', 'arqueologia', 'Recorrido por Pisac, Ollantaytambo y mercados andinos.', 300, 9),
  ('Cusco', 'Machu Picchu', 'arqueologia', 'Tren, bus y visita guiada a la ciudadela inca.', 900, 12),
  ('Cusco', 'City tour Cusco', 'cultural', 'Qorikancha, Sacsayhuaman y centro historico.', 120, 4),
  ('San Andres', 'Snorkel en arrecife', 'acuatico', 'Salida en lancha a puntos de snorkel con equipo incluido.', 280, 4),
  ('San Andres', 'Vuelta a la isla', 'recreativo', 'Recorrido en vehiculo por las principales playas y miradores.', 200, 5),
  ('San Andres', 'Buceo bautismo', 'acuatico', 'Primera inmersion con instructor certificado.', 450, 4),
  ('Medellin', 'Comuna 13 y grafitis', 'cultural', 'Recorrido por escaleras electricas y arte urbano.', 100, 3),
  ('Medellin', 'Guatape y Penol', 'recreativo', 'Paseo a la piedra del Penol y pueblo de colores.', 300, 10),
  ('Medellin', 'Parque Arvi', 'naturaleza', 'Senderismo y picnic en bosque de niebla.', 80, 5),
  ('Bariloche', 'Circuito Chico', 'naturaleza', 'Recorrido por lagos, miradores y bosques.', 150, 5),
  ('Bariloche', 'Cerro Catedral', 'nieve', 'Dia de esqui con alquiler de equipo.', 500, 8),
  ('Bariloche', 'Ruta del chocolate', 'gastronomia', 'Visita a fabricas artesanales de chocolate.', 70, 3),
  ('Antigua Guatemala', 'Volcan Pacaya', 'aventura', 'Caminata guiada a un volcan activo.', 220, 6),
  ('Antigua Guatemala', 'Tour de cafetales', 'gastronomia', 'Proceso del cafe y degustacion en finca.', 140, 4),
  ('Antigua Guatemala', 'Centro colonial', 'cultural', 'Iglesias, conventos y Arco de Santa Catalina.', 60, 3),
  ('Punta Cana', 'Safari buggy', 'aventura', 'Recorrido en buggy por senderos y cuevas.', 320, 4),
  ('Punta Cana', 'Isla Saona', 'playa', 'Excursion en catamaran a la isla con almuerzo.', 600, 9),
  ('Punta Cana', 'Snorkel y parasailing', 'acuatico', 'Combinacion de snorkel y vuelo en parasail.', 400, 3)
) AS v(destino, nombre, tipo, descripcion, costo, duracion)
  ON v.destino = d.nombre
WHERE NOT EXISTS (
  SELECT 1 FROM actividades a WHERE a.destino_id = d.id AND a.nombre = v.nombre
);

-- ---------- Documentos para RAG ----------
INSERT INTO rag_documents (title, source, category, content)
SELECT v.title, v.source, v.category, v.content
FROM (VALUES
  ('Guia general de Cartagena', 'Base de datos interna', 'destinos',
   'Cartagena de Indias esta en la costa caribena de Colombia. La ciudad amurallada y Getsemani son patrimonio historico. El clima es tropical calido todo el ano, con temporada seca entre diciembre y abril. El costo promedio de un viaje de 4 dias es de 1800 USD incluyendo hospedaje, alimentacion y tours. Actividades recomendadas: tour de ciudad amurallada, islas del Rosario, clase de cocina caribena. Se recomienda reservar las islas con anticipacion en temporada alta.'),
  ('Guia general de Cusco y Machu Picchu', 'Base de datos interna', 'destinos',
   'Cusco se ubica a 3400 metros sobre el nivel del mar, por lo que se recomienda aclimatarse al menos un dia. La mejor temporada para visitar Machu Picchu es de mayo a septiembre (temporada seca). El costo promedio de un viaje de 5 dias es de 1600 USD. El Valle Sagrado incluye Pisac y Ollantaytambo. El ingreso a Machu Picchu requiere reserva anticipada y documento de identidad. Llevar ropa de abrigo y protector solar.'),
  ('Guia general de Ciudad de Mexico', 'Base de datos interna', 'destinos',
   'Ciudad de Mexico ofrece museos, gastronomia y sitios arqueologicos. Teotihuacan esta a una hora y media del centro. El Museo de Antropologia es uno de los mas importantes de America Latina. Xochimilco es ideal para paseos en trajinera. El clima es templado, con lluvias de junio a septiembre. Presupuesto promedio de 2200 USD para 4 dias.'),
  ('Guia de playa: San Andres y Punta Cana', 'Base de datos interna', 'destinos',
   'San Andres es una isla colombiana con el mar de siete colores, ideal para snorkel y buceo; presupuesto de 2400 USD para 4 dias. Punta Cana, en Republica Dominicana, se especializa en resorts todo incluido y playas de arena blanca; presupuesto de 2800 USD. Ambas tienen clima tropical con temporada de huracanes entre junio y noviembre, por lo que se recomienda viajar entre diciembre y abril.'),
  ('Guia de Medellin y Antioquia', 'Base de datos interna', 'destinos',
   'Medellin es conocida como la ciudad de la eterna primavera, con clima entre 16 y 26 grados. La Comuna 13 destaca por su arte urbano y escaleras electricas. Guatape y la piedra del Penol estan a dos horas. El Parque Arvi ofrece senderismo en bosque de niebla. Presupuesto promedio de 1500 USD para 4 dias.'),
  ('Guia de Bariloche y la Patagonia', 'Base de datos interna', 'destinos',
   'Bariloche esta en la Patagonia argentina, rodeada de lagos y montanas. En invierno (junio a septiembre) es destino de esqui en el Cerro Catedral; en verano es ideal para senderismo y el Circuito Chico. El costo promedio de 5 dias es de 2100 USD. Se recomienda ropa termica y reservar alquiler de equipos.'),
  ('Guia de Antigua Guatemala', 'Base de datos interna', 'destinos',
   'Antigua Guatemala es ciudad colonial patrimonio de la humanidad, rodeada de volcanes y cafetales. La caminata al volcan Pacaya es una de las actividades mas solicitadas. El tour de cafetales muestra el proceso del cafe de especialidad. Presupuesto de 1300 USD para 4 dias. Clima templado entre 14 y 25 grados.'),
  ('Politicas de viaje y presupuesto', 'Base de datos interna', 'politicas',
   'Todos los presupuestos incluyen hospedaje, alimentacion y actividades, pero no vuelos internacionales salvo que se indique. Se recomienda un margen de 15 por ciento para imprevistos. Para viajes con ninos se priorizan actividades de menos de 5 horas. Las actividades de aventura requieren seguro de viaje. La temporada alta en Latinoamerica coincide con diciembre, Semana Santa y julio.'),
  ('Clima y mejores temporadas', 'Base de datos interna', 'clima',
   'El Caribe colombiano y Republica Dominicana tienen temporada seca de diciembre a abril y temporada de huracanes de junio a noviembre. La region andina (Cusco, Ciudad de Mexico, Antigua) tiene temporada seca de mayo a septiembre. La Patagonia argentina tiene invierno frio de junio a septiembre y verano fresco de diciembre a marzo. Consultar el pronostico actual antes de viajar.'),
  ('Recomendaciones segun tipo de viajero', 'Base de datos interna', 'recomendaciones',
   'Para viajeros culturales se recomiendan Cartagena, Cusco, Ciudad de Mexico y Antigua Guatemala. Para viajeros de playa y descanso, San Andres y Punta Cana. Para aventura y naturaleza, Bariloche y Medellin (Parque Arvi). Para presupuestos ajustados, Antigua Guatemala y Medellin. Para viajes con ninos, Punta Cana y Cartagena por sus actividades cortas y playas. Para esqui, Bariloche entre junio y septiembre.')
) AS v(title, source, category, content)
WHERE NOT EXISTS (SELECT 1 FROM rag_documents rd WHERE rd.title = v.title);

-- ---------- API key para consumidores externos ----------
INSERT INTO api_keys (name, key_hash)
VALUES ('Power BI / Postman', encode(digest('demo-bi-key-123', 'sha256'), 'hex'))
ON CONFLICT (key_hash) DO NOTHING;
