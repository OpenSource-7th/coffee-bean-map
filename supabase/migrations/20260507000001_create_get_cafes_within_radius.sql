CREATE OR REPLACE FUNCTION get_cafes_within_radius(
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION
)
RETURNS TABLE (
  id         UUID,
  name       VARCHAR,
  address    VARCHAR,
  lat        DOUBLE PRECISION,
  lng        DOUBLE PRECISION,
  menu_tags  TEXT[],
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
    c.menu_tags,
    c.created_at
  FROM cafes c
  WHERE ST_DWithin(
    c.location,
    ST_MakePoint(lng, lat)::geography,
    radius_meters
  )
  ORDER BY c.location <-> ST_MakePoint(lng, lat)::geography;
$$;
