# 관리자 기능용 Supabase 테이블

`direct/admin` 페이지(develope 계정 전용)에서 사용하는 테이블입니다. Supabase SQL Editor에서 아래 스크립트를 실행해 생성하세요.

## 1. 공지사항 (notices)

```sql
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  body text not null default '',
  enabled boolean not null default true,
  target_audience text not null default 'all',  -- 'all' | 'direct' | 'partner'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS는 서버에서 Service Role로 접근하므로 필요 시에만 설정
-- alter table public.notices enable row level security;
```

## 2. 개인별 프로필 이미지 (agent_profile_images)

```sql
create table if not exists public.agent_profile_images (
  agent_code text primary key,
  image_url text not null,  -- data URL (base64) 또는 외부 URL
  updated_at timestamptz not null default now()
);

comment on table public.agent_profile_images is '설계사별 커스텀 프로필 이미지. 관리자 페이지에서 설정.';
```

## 3. 업로드 로그 (선택)

관리자 페이지의 "업로드 기록"에서 확인하려면 아래 테이블이 있으면 됩니다. 없어도 config 조회는 동작합니다.

- `upload_log` – 컬럼에 `created_at` 있으면 최근 100건 조회
- `upload_history` – 컬럼에 `created_at` 있으면 최근 100건 조회

이미 다른 이름으로 로그 테이블을 쓰고 있다면, API(`/api/admin/upload-logs`)에서 테이블명을 맞춰 수정하면 됩니다.
