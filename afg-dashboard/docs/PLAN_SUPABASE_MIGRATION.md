# Appwrite → Supabase 마이그레이션 플랜

**✅ 완료**: Appwrite는 제거되었고, 로그인·대시보드·API·스크립트가 모두 Supabase를 사용합니다.

## 1. 개요

- **목적**: Appwrite 무료 한도 초과로 Supabase(유료)로 전환. 로그인·대시보드·스크립트가 모두 Supabase를 사용하도록 변경.
- **인증 방식**: 기존과 동일하게 **커스텀 세션**(사번+비밀번호 → 서버에서 DB 조회 후 `auth_session` 쿠키 설정). Supabase Auth는 사용하지 않음.
- **데이터**: `agents` 테이블(설계사), `config` 테이블(앱 설정)만 사용. 기존 Appwrite 컬렉션 구조를 Supabase 테이블로 1:1 매핑.

---

## 2. Supabase 프로젝트 정보 (환경 변수로만 관리)

- **URL**: `https://pteghzqcoetbkrdnkkmv.supabase.co`  
  → `.env.local` 에 `NEXT_PUBLIC_SUPABASE_URL` 또는 `SUPABASE_URL` 로 설정.
- **API Key**:  
  - 제공하신 키는 **클라이언트용 anon key** 또는 **publishable key**일 수 있음.  
  - **서버(API 라우트, 스크립트)** 에서는 **Service Role Key** 사용 권장(RLS 우회, 전체 agents 조회/수정).  
  - Supabase 대시보드 → Settings → API 에서 **anon key** / **service_role key** 확인 후 아래처럼 설정.

```env
# .env.local (절대 커밋 금지)
NEXT_PUBLIC_SUPABASE_URL=https://pteghzqcoetbkrdnkkmv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # 서버 전용 (대시보드에서 복사)
```

- 클라이언트에서 직접 DB 접근하지 않으면 `NEXT_PUBLIC_` 은 선택. 서버만 쓸 경우 `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` 만 있어도 됨.

---

## 3. Supabase 스키마 설계

### 3.1 테이블: `agents`

| 컬럼명 (Supabase) | 타입 | 제약 | 설명 |
|-------------------|------|------|------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | 기존 Appwrite `$id` 대체 |
| `code` | `text` | NOT NULL, UNIQUE | 사번 |
| `name` | `text` | NOT NULL | 설계사명 |
| `password` | `text` | | 평문 저장 (기존과 동일; 필요 시 추후 bcrypt 등으로 전환) |
| `role` | `text` | | `admin` \| `manager` \| `agent` |
| `performance` | `jsonb` | | `{"2025-08": 0, "2026-01": 123456, ...}` |
| `weekly` | `jsonb` | | `{"week1": 0, "week2": 0, "week3": 0, "week4": 0}` |
| `partner` | `jsonb` | | 파트너 시상 필드들 (PartnerPrizeData) |
| `manager_code` | `text` | | 매니저 사번 (Appwrite `managerCode`) |
| `manager_name` | `text` | | 매니저명 (Appwrite `managerName`) |
| `branch` | `text` | | 지사명 |
| `is_first_login` | `boolean` | default true | 최초 로그인 시 비밀번호 변경 유도 |
| `target_manager_code` | `text` | | 매니저가 담당하는 팀 필터용 |
| `created_at` | `timestamptz` | default now() | |
| `updated_at` | `timestamptz` | default now() | |

- Appwrite는 `performance`/`weekly`/`partner` 를 **JSON 문자열**로 저장했고, Supabase는 **jsonb** 로 저장해 조회 시 파싱 불필요.

### 3.2 테이블: `config`

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `key` | `text` | PK | `app` 등 |
| `update_date` | `text` | | MC_LIST 업데이트일(예: `0227`) |
| `updated_at` | `timestamptz` | default now() | |

- 기존 Appwrite config 문서 `key='app'`, `updateDate` → `config.key = 'app'`, `config.update_date`.

### 3.3 SQL (Supabase SQL Editor에서 실행)

```sql
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
```

- **RLS**: 서버만 Service Role로 접근하면 RLS 정책 없이 사용 가능. 나중에 클라이언트 직접 접근 시 RLS 추가.

---

## 4. 데이터 마이그레이션 (Appwrite → Supabase)

### 4.1 옵션 A: 기존 덤프 JSON 사용 (권장)

- 이미 `data/capture/dashboard.json` 또는 동일 형식의 **agents 배열**이 있으면:
  - 스크립트 `scripts/supabase-seed-from-dashboard-json.js` 로 `agents` 테이블에 `INSERT` (code 기준 upsert).
  - `config` 는 `updateDate` 한 건만 `config.key='app'`, `update_date=...` 로 넣으면 됨.

### 4.2 옵션 B: Appwrite CSV Export 로 import (현재 구동 중 구조)

- Appwrite 대시보드에서 agents 컬렉션을 **CSV로 내보내기** 한 파일을 그대로 사용할 수 있음.
- 예시 경로: `C:\Users\chlgn\OneDrive\Desktop\AFG_DASHBOARD\appwrite.csv` (또는 프로젝트 루트 `appwrite.csv`).
- 아래 **4.4 CSV 컬럼 구조**를 참고해 스크립트 `scripts/supabase-import-from-appwrite-csv.js` 등에서 파싱 후 Supabase `agents` 로 upsert.

### 4.3 마이그레이션 스크립트가 할 일

- JSON/엑셀 등 소스에서 **code, name, password, role, performance, weekly, partner, manager_code, manager_name, branch, is_first_login, target_manager_code** 매핑.
- `performance`/`weekly`/`partner` 는 이미 객체면 그대로, 문자열이면 `JSON.parse` 후 jsonb 컬럼에 저장.
- **code** 가 UNIQUE 이므로 `INSERT ... ON CONFLICT (code) DO UPDATE` (upsert) 로 중복 방지.
- 마이그레이션 후: 로그인 한 번, 대시보드 로드, 일일 업로드 스크립트 1건 테스트로 검증.

### 4.4 Appwrite CSV Export 구조 (현재 구동 중)

Appwrite에서 agents 컬렉션을 CSV로 내보낸 파일의 **헤더 및 컬럼**은 다음과 같음.  
Supabase 컬럼과의 매핑만 맞추면 됨.

| CSV 컬럼 (Appwrite Export) | 타입/비고 | Supabase 컬럼 |
|----------------------------|-----------|----------------|
| `$id` | Appwrite 문서 ID | 사용 안 함 (Supabase는 `id` uuid 자동 생성) |
| `$permissions` | 빈 문자열 등 | 사용 안 함 |
| `$createdAt` | ISO 날짜 문자열 | 선택: `created_at` 에 파싱해서 넣을 수 있음 |
| `$updatedAt` | ISO 날짜 문자열 | 선택: `updated_at` 에 파싱해서 넣을 수 있음 |
| `code` | 사번 문자열 | `code` |
| `name` | 설계사명 | `name` |
| `password` | 평문 | `password` |
| `role` | `agent` 등 | `role` |
| `performance` | **JSON 문자열** (내부 `"` 는 `""` 로 이스케이프) | `performance` (jsonb) — `JSON.parse(셀값)` 후 저장 |
| `weekly` | **JSON 문자열** | `weekly` (jsonb) — `JSON.parse(셀값)` 후 저장 |
| `managerCode` | 매니저 사번 (또는 `UNKNOWN`) | `manager_code` |
| `managerName` | 매니저명 (또는 `소속없음`) | `manager_name` |
| `branch` | 지사명 | `branch` |
| `targetManagerCode` | 문자열 `null` 또는 값 | `target_manager_code` — `"null"` 이면 DB에는 `NULL` |
| `isFirstLogin` | 문자열 `true` / `false` | `is_first_login` — `셀 === 'true'` 로 boolean 변환 |
| `partner` | **JSON 문자열** 또는 빈값/`null` | `partner` (jsonb) — 있으면 `JSON.parse`, 없으면 `{}` |

**파싱 시 유의**

- CSV 필드 안에 쉼표·따옴표가 있으므로 **표준 CSV 파서** 사용 권장 (Node: `csv-parse` 또는 한 줄씩 읽어서 따옴표 묶인 필드 처리).
- `performance` / `weekly` / `partner` 는 **이중 따옴표 이스케이프** (`""`) 가 있을 수 있음. 파싱 후 `JSON.parse(필드값)` 하면 됨. 빈 셀이나 `null` 문자열이면 `{}` 로 넣기.
- `targetManagerCode` 가 문자열 `"null"` 이면 Supabase에는 `NULL` 로 insert.
- `managerCode` 에 `UNKNOWN` 같은 값이 올 수 있음 → 그대로 `manager_code` 에 저장해도 됨.

**예시 헤더 한 줄**

```csv
$id,$permissions,$createdAt,$updatedAt,code,name,password,role,performance,weekly,managerCode,managerName,branch,targetManagerCode,isFirstLogin,partner
```

이 구조를 기준으로 `appwrite.csv` → Supabase `agents` import 스크립트를 작성하면 됨.

---

## 5. 코드 변경 계획 (이슈 없이 전환)

### 5.1 패키지

- **제거**: `appwrite`, `node-appwrite`.
- **추가**: `@supabase/supabase-js` (서버·스크립트에서 사용).

### 5.2 공통 Supabase 클라이언트 (서버 전용)

- **파일**: `src/lib/supabase-server.ts` (신규).
- **역할**:
  - `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` 로 Admin 클라이언트 생성.
  - `getAgentByCode(code)`, `listAgents({ filterRole, filterManagerCode })`, `getConfigApp()`, `updateAgent(id, { password, is_first_login })` 등 **기존 appwrite-server.ts 와 동일 시그니처**의 함수로 구현.
- **반환 타입**: 기존 `AppwriteAgentRecord` 와 호환되는 타입 유지 (이름만 `AgentRecord` 등으로 통일).  
  - `id` → uuid 문자열, `performance`/`weekly`/`partner` → 객체 (Supabase jsonb는 자동 파싱).

### 5.3 API 라우트 교체

| 파일 | 변경 내용 |
|------|------------|
| `src/app/api/auth/login/route.ts` | `appwriteAgentGetByCode` → `getAgentByCode`(Supabase), `isAppwriteConfigured` → `isSupabaseConfigured` |
| `src/app/api/auth/change-password/route.ts` | `appwriteAgentGetByCode` / `appwriteAgentUpdate` → Supabase 동일 함수로 교체 |
| `src/app/api/dashboard/route.ts` | `appwriteAgentsListAll`, `appwriteAgentGetByCode`, `appwriteConfigGetApp` → Supabase 버전으로 교체. **mergeFebruaryFix / sortByMcListOrder / computeRanks / toSafeAgent** 로직은 그대로 유지 |
| `src/app/api/agents/route.ts` | 동일하게 Supabase list/get 으로 교체 |
| `src/app/api/ranks/route.ts` | `appwriteAgentsListAll` → Supabase |
| `src/app/api/appwrite-health/route.ts` | `supabase-health` 등으로 이름 변경, Supabase 연결 체크 (예: `supabase.from('config').select('key').limit(1)` ) |

- **세션/쿠키**: 그대로 유지. `auth_session` 에 담는 `{ code, name, role, targetManagerCode, isFirstLogin }` 구조 변경 없음.

### 5.4 클라이언트

- `src/lib/appwrite.ts`: 현재 로그인은 **서버 API 호출**만 하고, Appwrite SDK는 health 체크 등에만 쓰일 수 있음.  
  - Supabase 전환 후에는 **제거**하거나, health만 Supabase API로 옮기고 해당 파일 삭제.

### 5.5 스크립트

| 스크립트 | 변경 |
|----------|------|
| `scripts/appwrite-upload-daily.js` | Supabase 클라이언트로 `agents` upsert, `config` update. `agent-order.json` 생성 로직 유지 |
| `scripts/appwrite-add-agent-105203241.js` | Supabase `agents` insert/update |
| `scripts/upload-partner-prize.js` | Supabase `agents` 에서 code로 조회 후 `partner` jsonb 업데이트 |
| `scripts/appwrite-upload-agents.js` | Supabase bulk insert/upsert (배치 시 500건 단위 등) |
| `scripts/appwrite-create-database.js` | Supabase는 SQL로 테이블 생성하므로 이 스크립트는 **삭제** 또는 “Supabase 스키마는 docs/PLAN_SUPABASE_MIGRATION.md 참고” 로 대체 |

- 공통: `.env` / `.env.local` 에서 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 읽어서 사용.  
  Appwrite env 변수는 단계적으로 제거.

### 5.6 환경 변수 정리

- **삭제**: `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_DATABASE_ID`, `APPWRITE_AGENTS_COLLECTION_ID`, `APPWRITE_CONFIG_COLLECTION_ID`.
- **추가**: `SUPABASE_URL` (또는 `NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY`.
- Vercel 등 배포 환경에도 동일 키 설정.

---

## 6. 구현 순서 (이슈 최소화)

1. **Supabase 프로젝트**  
   - 테이블 `agents`, `config` 생성 (위 SQL).  
   - Service Role Key 확인.

2. **환경 변수**  
   - `.env.local` 에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 설정.  
   - 기존 Appwrite 변수는 아직 유지해 두어도 됨.

3. **데이터 이전**  
   - `dashboard.json` 또는 Appwrite export → `scripts/supabase-seed-from-dashboard-json.js` (또는 동일 목적 스크립트)로 Supabase `agents` + `config` 채우기.  
   - 로그인/대시보드가 기대대로 동작하는지 **로컬에서** 확인.

4. **서버 라이브러리**  
   - `src/lib/supabase-server.ts` 작성 (기존 appwrite-server.ts 함수와 1:1 대응).  
   - `isSupabaseConfigured()` 추가.

5. **API 라우트**  
   - login → dashboard → agents → ranks → change-password → health 순으로 하나씩 `appwrite-*` → `supabase-*` 로 교체.  
   - 각 단계에서 로그인/목록/순위/비밀번호 변경 테스트.

6. **스크립트**  
   - `appwrite-upload-daily.js` → Supabase 버전으로 수정 후, 일일 데이터 1건으로 테스트.  
   - 그 다음 partner prize, add-agent 등 순서대로 전환.

7. **클라이언트/정리**  
   - `appwrite.ts` 제거 또는 사용처 제거.  
   - `package.json` 에서 `appwrite`, `node-appwrite` 제거.  
   - 문서/README 에서 Appwrite 참조를 Supabase로 수정.

8. **배포**  
   - Vercel(등)에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 설정 후 배포.  
   - 프로덕션에서 로그인·대시보드·캡처 덤프 한 번씩 검증.

---

## 7. 주의사항·리스크

- **API 키**: 제공하신 키가 anon인 경우, 서버에서 **전체 agents 조회** 등은 Service Role Key가 필요합니다. Supabase 대시보드 → Settings → API에서 **service_role** 복사 후 `SUPABASE_SERVICE_ROLE_KEY` 에 넣어야 합니다.  
  **service_role 키는 절대 클라이언트/프론트에 노출하지 마세요.**
- **비밀번호**: 현재와 같이 평문 저장 시, DB 유출 시 위험. 전환 후 안정화되면 **bcrypt 등 해시 저장**으로 바꾸는 것을 권장.
- **인덱스**: `code`, `role`, `manager_code`, `branch` 인덱스로 대시보드/로그인 쿼리 속도 유지.
- **캡처 플로우**: `capture-dump-dashboard.js` 는 `/api/dashboard` 를 호출하므로, 대시보드 API를 Supabase로 바꾸면 자동으로 Supabase 데이터를 덤프하게 됨. 별도 수정 불필요.

---

## 8. 체크리스트 (완료 시 체크)

- [ ] Supabase 테이블 `agents`, `config` 생성 및 인덱스
- [ ] `.env.local` 에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 설정
- [ ] 마이그레이션 스크립트로 기존 데이터 Supabase에 적재
- [ ] `src/lib/supabase-server.ts` 구현 및 기존 타입 호환
- [ ] `api/auth/login`, `api/auth/change-password` Supabase 전환
- [ ] `api/dashboard`, `api/agents`, `api/ranks` Supabase 전환
- [ ] `api/appwrite-health` → `api/supabase-health` (또는 health 내용만 Supabase로) 전환
- [ ] `appwrite-upload-daily.js` 등 스크립트 Supabase 전환
- [ ] `src/lib/appwrite.ts` 제거, `appwrite` / `node-appwrite` 패키지 제거
- [ ] 로그인·대시보드·비밀번호 변경·캡처 덤프·일일 업로드 E2E 검증
- [ ] 배포 환경 env 설정 및 프로덕션 검증

이 플랜대로 진행하면 Appwrite 제거 후 Supabase만 사용해도 기존 기능에서 이슈 없이 동작하도록 맞출 수 있습니다.
