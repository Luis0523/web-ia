-- ============================================================
--  Historial de uso de practica (para dashboards / Power BI)
--  Genera registros en usage_logs desde el 2026-10-15 hasta hoy.
--  No llama a ningun proveedor de IA: solo deja el registro.
--
--  Uso:
--    psql "$DATABASE_URL" -f db/seed_history.sql
--
--  Es idempotente: si ya existe historial anterior al 2026-11-10
--  no inserta nada, para evitar duplicados al reejecutar.
-- ============================================================

DO $$
DECLARE
  -- Llamadas por dia, del 2026-10-15 al 2026-11-10 (27 dias).
  -- Hay dias con mucha actividad, dias flojos y dias en cero.
  plan int[] := ARRAY[
    6, 12, 15, 4, 0, 14, 18, 11, 16, 9, 3, 0, 17, 13, 19, 15, 8,  -- Oct 15-31
    2, 0, 12, 9, 14, 7, 11, 1, 0, 5                                 -- Nov 1-10
  ];
  d          date;
  idx        int := 1;
  n          int;
  i          int;
  r          double precision;
  s_key      text;
  s_id       int;
  v_user     int;
  v_kind     text;
  v_endpoint text;
  v_tin      int;
  v_tout     int;
  v_status   text;
  v_ts       timestamptz;
BEGIN
  IF EXISTS (
    SELECT 1 FROM usage_logs
     WHERE created_at < TIMESTAMPTZ '2026-11-10 00:00:00+00'
  ) THEN
    RAISE NOTICE 'Ya existe historial anterior al 2026-11-10; seed omitido.';
    RETURN;
  END IF;

  PERFORM setseed(0.4242);

  FOR d IN
    SELECT gs::date
      FROM generate_series(DATE '2026-10-15', DATE '2026-11-10', interval '1 day') AS gs
  LOOP
    n := plan[idx];
    idx := idx + 1;

    FOR i IN 1..n LOOP
      -- Servicio: 55% chat RAG, 30% agente itinerario, 15% agente ajuste.
      r := random();
      IF r < 0.55 THEN
        s_key := 'rag_chat';        v_kind := 'chat';  v_endpoint := '/api/chat';
      ELSIF r < 0.85 THEN
        s_key := 'agent_itinerary'; v_kind := 'agent'; v_endpoint := '/api/agents/itinerary';
      ELSE
        s_key := 'agent_adjust';    v_kind := 'agent'; v_endpoint := '/api/agents/adjust';
      END IF;

      SELECT id INTO s_id FROM services WHERE key = s_key;

      -- Usuarios: en noviembre se apoya mas en el admin para no agotar
      -- la cuota mensual del usuario demo.
      IF d >= DATE '2026-11-01' THEN
        v_user := CASE WHEN random() < 0.35 THEN 2 ELSE 1 END;
      ELSE
        v_user := CASE WHEN random() < 0.75 THEN 2 ELSE 1 END;
      END IF;

      v_tin    := 150 + floor(random() * 600)::int;
      v_tout   := 200 + floor(random() * 900)::int;
      v_status := CASE WHEN random() < 0.04 THEN 'error' ELSE 'ok' END;

      v_ts := d::timestamptz
              + make_interval(
                  hours => 8 + floor(random() * 14)::int,
                  mins  => floor(random() * 60)::int,
                  secs  => floor(random() * 60)::int
                );
      v_ts := LEAST(v_ts, now() - interval '5 minutes');

      INSERT INTO usage_logs
        (user_id, service_id, endpoint, kind, tokens_in, tokens_out, tokens_total, status, created_at)
      VALUES
        (v_user, s_id, v_endpoint, v_kind, v_tin, v_tout, v_tin + v_tout, v_status, v_ts);
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Historial de practica cargado.';
END $$;
