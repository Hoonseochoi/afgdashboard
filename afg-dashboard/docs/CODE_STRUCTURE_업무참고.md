# AFG 대시보드 코드 구조 — 업무 참고 (오늘 업무용)

> 전체 코드 구조, 컴포넌트별 카드 구성, 데이터 소스·로직을 정리한 문서입니다.

---

## 1. 프로젝트 개요

- **앱**: Meritz Individual Agent Dashboard (메리츠 GA 성과 대시보드)
- **스택**: Next.js (App Router), React, TypeScript, Supabase
- **진입점**: `/` → `/direct` 리다이렉트
- **라우트**: `/direct`, `/partner`, `/login` + API 라우트

---

## 2. 라우팅·페이지 구조

| 경로 | 파일 | 역할 |
|------|------|------|
| `/` | `src/app/page.tsx` | `/direct`로 리다이렉트 |
| `/direct` | `src/app/direct/page.tsx` | 다이렉트(비파트너) 대시보드, `?code=` 지원 |
| `/partner` | `src/app/partner/page.tsx` | 파트너 대시보드, `?code=` 지원 |
| `/login` | `src/app/login/page.tsx` | 로그인 |

- **direct/partner** 모두 동일한 `Dashboard` 컴포넌트 사용, `mode`와 `initialCode`만 다름.
- `Dashboard`는 `useDashboardData` 훅으로 데이터·UI 상태를 관리하고, **선택 에이전트의 branch**에 따라 `PartnerCards` vs `DirectCards`를 분기.

---

## 3. 데이터가 어디서 오는지 (데이터 소스)

### 3.1 초기 로드 API

- **엔드포인트**: `GET /api/dashboard`
- **파일**: `src/app/api/dashboard/route.ts`
- **인증**: 쿠키 `auth_session` (JSON: `code`, `role`, `name`, `isFirstLogin`, `targetManagerCode` 등)
- **데이터 소스**:
  1. **Supabase** `agents` 테이블 (기본)
     - `supabase-server.ts`: `supabaseAgentsListAll`, `supabaseAgentGetByCode`, `supabaseConfigGetApp`
  2. **로컬 JSON** (Supabase 미설정 시)
     - 개발 마스터(`develope`) 전용: `src/data/data.json`
  3. **마감 Fix 데이터** (월별 덮어쓰기)
     - `src/data/january_closed.json` → `_janWeekly` 필드
     - `src/data/february_closed.json` → `performance` + `_febWeekly`
  4. **MC_LIST (선택)**  
     - `../data/daily/YYYYMC_LIST_OUT_*.xlsx` → code→지사명 맵 (현재는 `applyMcListBranch`에서 덮어쓰기 비활성)

### 3.2 API 응답 구조

- `user`: 로그인 사용자 정보
- `agents`: 에이전트 배열 (role, code, name, branch, performance, weekly_data 등)
- `updateDate`: config에서
- `ranks`, `directRanks`, `partnerRanks`: 월별 실적 내림차순 배열 (순위 계산용)
- (일부 세션) `partnerAgents`: 파트너만 필터된 목록

### 3.3 권한별 agents 필터

- **admin / develope**: 전체 에이전트 (RANK_EXCLUDE_CODE 제외)
- **manager**: `targetManagerCode` / `managerCode` 기준 하위만
- **특정 code** (예: 105203241, 722031500, 102203009): 허용 지사 배열로 필터
- **일반 에이전트**: 본인 1명만

### 3.4 캡처 모드 (로그인 없음)

- **엔드포인트**: `GET /api/capture-data`
- **파일**: `src/app/api/capture-data/route.ts`
- **데이터**: `data/capture/dashboard.json` (스크립트로 미리 덤프해 둔 JSON)

---

## 4. 데이터 로직 (클라이언트·계산)

### 4.1 훅: `useDashboardData`

- **파일**: `src/hooks/useDashboardData.ts`
- **역할**:
  - `mode`, `initialCode`, `exportAreaRef` 받음
  - **한 번에** `/api/dashboard` 또는 `/api/capture-data` 호출 → `agents`, `user`, `ranks`, `directRanks`, `partnerRanks`, `updateDate` 저장
  - `selectedAgent` 결정: `initialCode` 있으면 해당 code, 없으면 (테스트 제외) 3월 실적 1위
  - **파생 데이터**: `incentiveData` = `calculateIncentiveData(selectedAgent, agents, selectedViewMonth, globalRanks, updateDate)` + `preparePerformanceChartData(selectedAgent)`
  - GA 리다이렉트: direct/partner 모드와 branch 불일치 시 `/partner?code=` 또는 `/direct?code=` 로 이동
  - PNG 내보내기, 비밀번호 변경, PWA/모바일 감지 등 UI 핸들러 포함

### 4.2 인센티브 엔진 (계산의 핵심)

- **파일**: `src/lib/engines/incentiveEngine.ts`
- **주요 함수**:
  - `calculateIncentiveData(agent, allAgents, selectedMonth, globalRanks, updateDate)`  
    → 한 에이전트에 대한 **한 달치** 인센티브 통합 결과 (주차 시상, 월간, 2배 메리츠, 클럽+, 정규, 순위, 목표, 파타야/3월 특별 등)
  - `preparePerformanceChartData(agent)`  
    → 차트용 `{ name, value, prize }[]` (월별 실적·예상 시상금)
  - 티어/시상 상수: `JAN_W1_PRIZES`, `FEB_W1_PRIZES`, `MAR_W1_SPECIAL_PRIZES`, `MAR_W1_PATAYA_PRIZES`, `MONTHLY_PRIZE_TIERS`, `PLUS_TIERS` 등
  - `calculateDoubleMeritzPrize`, `calculateMeritzClubPlusPrize`, `calculateMonthlyPrize`, `getWeekPrize`, `calculateGoalAndProgress`, `calculateMYHOTRank` 등

### 4.3 주간 실적 소스 (선택 월 기준)

- `agent.weekly_data` 있으면 그대로 사용
- 없으면:
  - 1월: `_janWeekly` (january_closed) → week1, week2, week3
  - 2월: `_febWeekly` (february_closed)
  - 그 외: `agent.weekly` (week1, week2, week3)

### 4.4 월간 실적 vs 주차 실적 (Supabase 사용 시)

**다이렉트 3월 예시** — 두 값이 다르게 나오면 아래 소스를 각각 확인하면 됨.

| 표시 항목 | 데이터 소스 (API → 엔진) | Supabase 저장 위치 |
|----------|--------------------------|---------------------|
| **월간 실적** (당월 실적, 118만 등) | `agent.performance[monthKey]`<br/>예: `performance["2026-03"]` | `agents.performance` (JSON)<br/>키: `"2026-01"`, `"2026-02"`, `"2026-03"` |
| **1주차 전체 실적** (주차 시상·파타야·조기가동 계산용) | `getWeekDataForMonth()` → 3월이면 **`agent.weekly.week1`** (또는 `weekly_data`) | `agents.weekly` (JSON)<br/>키: `week1`, `week2`, `week3`, `week4` |
| **1주차 상품별 실적** (파트너 1주차 상품 카드만) | `agent.productWeek1` | `agents.product_week1` 또는 `weekly.productWeek1` |

- **1주차 전체 실적**에는 `weekly.week1`만 사용함. **productWeek1은 상품별(통합·간편·어린이) 실적**이므로 주차 시상/조기가동 로직에서는 사용하지 않음.
- 월간은 **월별 누적**용 컬럼(`performance`), 주차 전체는 **주차별 실적**용 컬럼(`weekly`)이라 서로 다른 필드임.
- 1주차인데 “1주차 실적 = 월간 실적”이어야 하면, **데이터 적재 시** `weekly.week1`을 당월 누적(또는 1주차 구간 합계)과 맞춰 넣어주는 쪽을 점검해야 함. (대시보드에서 월간으로 주차를 덮어쓰지 않음.)

---

## 5. 컴포넌트별 카드 구성

### 5.1 공통 레이아웃 (Dashboard)

- **파일**: `src/app/_components/Dashboard.tsx`
- **순서**:
  1. `PasswordModal`, `PrizeGuideModal`
  2. `Header` (에이전트 선택, 월 선택, 시상 가이드, 내보내기, 로그아웃 등)
  3. **내보내기 영역** (`exportAreaRef`):
     - `AgentBanner`: 프로필, 당월 실적, 순위, 목표, 예상 총 시상금
     - **MY MERITZ PRIZE** 섹션: 월 선택 드롭다운 + **카드 그리드**
       - **파트너 지사** → `PartnerCards`
       - **비파트너** → `DirectCards`
     - `PerformanceChart`: 7개월 실적·시상금 추이, 월 클릭 시 해당 월 시상 기준

### 5.2 Direct(비파트너) 카드 — `DirectCards`

- **파일**: `src/app/direct/_components/cards/DirectCards.tsx`
- **분기**:
  - **3월 선택 시** → `MarchCards` (3월 전용 카드 세트)
  - **1월/2월** → `NonPartnerCards` (주차/월간/2배/클럽+/정규 통합)

#### MarchCards (3월)

- **파일**: `src/app/direct/_components/cards/MarchCards.tsx`
- **카드 구성** (그리드: 1열 모바일, 3열 md 이상):
  1. **파타야 여행시상** (큰 카드, 2행): 3월 실적 기준 티어, 현재 실적, “~까지 n만원”
  2. **1주차 특별 현금시상**: viewW1, week1SpecialPrize, TierBadges
  3. **1주차 PATTAYA 특별 현금 시상**: viewW1, week1PatayaPrize, TierBadges
  4. **2배 메리츠클럽**: `DirectDoubleMeritzCard`
  5. **메리츠 클럽+**: `DirectMeritzClubPlusCard`
  6. **3월 정규 시상**: `DirectRegularPrizeCard`

#### NonPartnerCards (1·2월)

- **파일**: `src/app/direct/_components/cards/NonPartnerCards.tsx`
- **카드 구성**:
  1. 1주차 현금시상 (실적, 진행률, 예상 시상금)
  2. 2주차 현금시상
  3. 3주차 현금시상 (1월만 표시)
  4. 월간 현금시상
  5. 2배 메리츠클럽
  6. 메리츠클럽 PLUS
  7. 정규시상

#### Direct 하위 카드 컴포넌트

- `DirectDoubleMeritzCard.tsx`: 전월·당월 각 20만 이상 시 2배 시상
- `DirectMeritzClubPlusCard.tsx`: 1·2·3월 실적, 목표, 클럽+ 시상금
- `DirectRegularPrizeCard.tsx`: 정규 시상 (실적 100%)

### 5.3 Partner(파트너) 카드 — `PartnerCards`

- **파일**: `src/app/partner/_components/PartnerCards.tsx`
- **그리드**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- **카드 구성** (순서대로):
  1. **PartnerPrizeCardFull**: “N월 정규/월간/주간 시상금” 전체 합계, 티어 버튼, 녹색 변형
  2. **PartnerWeekCombinedCard**: 1·2주차 주간 시상 현황 (sky 변형)
  3. **MeritzClubPlusCard**: 1·2·3월 실적
  4. **PartnerDoubleMeritzCard**: 전월·당월 2배 메리츠
  5. **ContinuousRun12Card**: 1·2월 연속가동 (현재 basePrize/extraPrize 0)
  6. **ContinuousRun23Card**: 2·3월 연속가동 (현재 basePrize/extraPrize 0)

- **내보내기**: `src/app/partner/_components/cards/index.ts`에서 위 카드들 export

### 5.4 공통·공유 컴포넌트

- **AgentBanner** (`_components/shared/cards/AgentBanner.tsx`): 상단 배너 — 에이전트명, 지사, 순위, 목표, 예상 총 시상금, 프로필 이미지(Top3/Top30)
- **TierBadges** (`_components/shared/cards/TierBadges.tsx`): 만원 단위 티어 뱃지
- **PerformanceChart** (`_components/shared/PerformanceChart.tsx`): Recharts 막대+선, 월 클릭 시 `setSelectedViewMonth` 호출
- **Header**: 에이전트 검색/선택, 월/시상 가이드, PNG 내보내기, 로그아웃
- **LoadingLines**, **GlowEffect**, **Footer**

---

## 6. 타입 정의

- **파일**: `src/types/index.ts`
- **주요 타입**:
  - `Agent`: code, name, branch, performance (월키→실적), weekly_data?, partner?
  - `User`: id, name, email, isFirstLogin, role?, code?
  - `PerformanceData`, `WeeklyPerformance`
  - `DashboardMode`: `"direct" | "partner" | "all"`
  - `ViewMonth`: 1 | 2 | 3

- **Supabase** 에이전트 스키마: `src/lib/supabase-server.ts` — `SupabaseAgentRecord`, `PartnerPrizeData`

---

## 7. 상수·유틸

- **순위 제외 코드**: `RANK_EXCLUDE_CODE` = `'712345678'` (dashboard constants 및 API)
- **대시보드 상수**: `src/app/_components/dashboard/constants.ts`
- **표시/포맷**: `src/app/_components/dashboard/utils.ts` — `displayBranch`, `formatMan` 등

---

## 8. 오늘 업무 시 참고 포인트

1. **카드 추가/수정**
   - Direct: `DirectCards` → `MarchCards` 또는 `NonPartnerCards` + 개별 카드 컴포넌트
   - Partner: `PartnerCards` + `partner/_components/cards/*.tsx`
   - 새 데이터가 필요하면 `incentiveEngine.ts`의 `calculateIncentiveData` 반환값 또는 별도 계산 함수 추가 후 카드에 props로 전달

2. **데이터 소스 변경**
   - 서버: `src/app/api/dashboard/route.ts`, Supabase 조회/필터/merge 로직
   - 마감 데이터: `src/data/january_closed.json`, `src/data/february_closed.json` 및 파싱 스크립트

3. **인센티브 규칙 변경**
   - `src/lib/engines/incentiveEngine.ts`의 상수·함수 수정
   - 주차/월간/2배/클럽+/정규 등 모두 여기서 계산되므로, 카드에서는 “표시”만 담당

4. **새 API**
   - `src/app/api/` 아래 라우트 추가 (auth: 쿠키, 데이터: Supabase 또는 로컬 JSON)

5. **차트/배너**
   - 데이터: `incentiveData.performanceData`, `incentiveData.goalInfo` 등
   - 차트: `PerformanceChart`는 `performanceData` + `directRanks`/`partnerRanks` 사용

이 문서를 오늘 업무 시작 시 참고용으로 사용하시면 됩니다.
