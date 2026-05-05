CREATE TABLE cafes (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(255) NOT NULL,
  address    VARCHAR(500),
  location   GEOGRAPHY(Point, 4326) NOT NULL,
  menu_tags  TEXT[]       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 반경 공간 검색 (ST_DWithin) 최적화
CREATE INDEX idx_cafes_location  ON cafes USING GIST(location);

-- 다중 태그 교집합/합집합 검색 (&&, @>) 최적화
CREATE INDEX idx_cafes_menu_tags ON cafes USING GIN(menu_tags);
