-- 로그인 기록·대시보드 접속(새로고침) 기록용 테이블
-- event_type: 'login' = 로그인 성공, 'page_view' = 대시보드 로드(새로고침 포함)
CREATE TABLE IF NOT EXISTS auth_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('login', 'page_view')),
  user_code text,
  user_name text,
  role text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_activity_log_created_at ON auth_activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_activity_log_event_type ON auth_activity_log (event_type);
