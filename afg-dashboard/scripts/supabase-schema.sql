-- Supabase agents / config 테이블 생성
-- Supabase 대시보드 → SQL Editor 에서 이 파일 내용 붙여넣고 Run 실행

-- agents
CREATE TABLE IF NOT EXISTS public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  password text,
  role text,
  performance jsonb DEFAULT '{}',
  weekly jsonb DEFAULT '{}',
  partner jsonb DEFAULT '{}',
  manager_code text,
  manager_name text,
  branch text,
  is_first_login boolean DEFAULT true,
  target_manager_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agents_code ON public.agents(code);
CREATE INDEX IF NOT EXISTS idx_agents_role ON public.agents(role);
CREATE INDEX IF NOT EXISTS idx_agents_manager_code ON public.agents(manager_code);
CREATE INDEX IF NOT EXISTS idx_agents_branch ON public.agents(branch);

-- config
CREATE TABLE IF NOT EXISTS public.config (
  key text PRIMARY KEY,
  update_date text,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.config (key, update_date) VALUES ('app', '0000')
ON CONFLICT (key) DO NOTHING;
