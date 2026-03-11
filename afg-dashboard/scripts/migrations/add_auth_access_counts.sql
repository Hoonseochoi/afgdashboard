-- 사용자별 로그인·리다이렉트(페이지뷰) 횟수 집계 (auth_activity_log와 별개)
-- 로그인/대시보드 로드 시마다 해당 user_code의 카운트 +1
CREATE TABLE IF NOT EXISTS auth_access_counts (
  user_code text PRIMARY KEY,
  user_name text,
  login_count int NOT NULL DEFAULT 0,
  page_view_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_access_counts_updated_at ON auth_access_counts (updated_at DESC);
