CREATE OR REPLACE FUNCTION search_cafes_by_name(
  search_text TEXT,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id         UUID,
  name       VARCHAR,
  address    VARCHAR,
  lat        DOUBLE PRECISION,
  lng        DOUBLE PRECISION,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    c.id,
    c.name,
    c.address,
    ST_Y(c.location::geometry) AS lat,
    ST_X(c.location::geometry) AS lng,
    c.created_at
  FROM cafes c
  WHERE c.name ILIKE '%' || search_text || '%'
  ORDER BY c.name ASC
  LIMIT LEAST(GREATEST(limit_count, 1), 50);
$$;
