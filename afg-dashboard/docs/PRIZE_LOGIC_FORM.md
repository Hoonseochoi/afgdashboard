# 시상 로직 폼 (Prize Logic Form)

**사용법**: 아래 표에서 **숫자만** 수정하면 됩니다. 단위는 각 표에 명시(만원/원/%).  
다른 시상안으로 바꿀 때도 이 폼을 복사해 구간·시상금·시상률만 바꾸면, AI가 동일 구조로 대시보드 코드에 반영합니다.

---

## UI 디자인 참조 (공통)

- **카드 컨테이너**: 둥근 모서리, 그림자 또는 테두리로 카드 구분. 배경은 대시보드 테마에 맞춤(밝은/어두운).
- **타이포그래피**: 제목(카드 제목) > 부제 > 블록 제목 > 본문/숫자. 굵기·크기로 위계 유지.
- **뱃지**: 회차·최대 시상률 등은 작은 뱃지/칩 형태. 연속가동·추가 연속가동 블록 내 뱃지는 블록 식별용(색/아이콘 구분 가능).
- **진행률 바**: 목표 대비 실적 비율(0~100%). 색상: 달성 시 강조색(예: 초록), 미달 시 중립색(회색/파랑).
- **상태 문구**: "조건 달성" = 성공 강조, "진행 중" = 중립, "달성 가능성 높음" = 경고/희망 톤. 필요 시 아이콘 병기.
- **숫자 표기**: 실적·시상금은 천 단위 콤마, 원화 단위(원) 표시. 큰 숫자는 강조(굵게/크게).

---

## 1. 파트너 시상 (대표 템플릿)

### 1-1. 파트너 구간 시상 (카드 상단 구간, 단순 구간→시상)

| 구간_실적_만원 | 시상금_만원 |
|----------------|-------------|
| 50             | 50          |
| 30             | 30          |
| 20             | 20          |
| 10             | 10          |

- **코드 매핑**: `constants.ts` → `PARTNER_TIERS`, `incentiveEngine.ts` → `getPartnerTierPrize`
- **단위**: 표는 만원. 코드에서는 원(×10000).

**UI 참조 (구간 시상 카드)**  
카드 상단에 세로 또는 가로 구간 바(10/20/30/50만 눈금). 현재 실적에 따라 채워진 구간까지 시각화. 달성 구간별 시상금은 구간 옆 또는 툴팁/라벨로 표시. 한 카드 안에 “구간 실적” + “해당 시상금”이 함께 보이도록 배치.

---

### 1-2. 파트너 1·2월 연속가동 시상 (구간 채운 뒤, 다음 달 10만원 추가 시 완성)

**로직**: 전월(1월)에 구간 실적을 채우면 → 다음 달(2월) 연속가동 구간에서 **추가 10만원**만 채우면 시상 확정.

| 전월_구간_실적_만원 | 시상금_만원 |
|---------------------|-------------|
| 50                  | 180         |
| 30                  | 80          |
| 20                  | 60          |
| 10                  | 20          |

| 항목 | 값 | 비고 |
|------|-----|------|
| 다음달_추가_목표_만원 | 10 | 2월 1~18일 구간에서 10만원 이상이면 "조건 달성" |

- **코드 매핑**: `incentiveEngine.ts` → `getPartnerContinuousPrize`, `ContinuousRun12Card.tsx` → `janTarget`(50만), `febTarget`(10만), 조건 `baseJan >= 100000 && baseFeb >= 100000`

**연속가동 카드 형식 (1·2월) — UI 구조 그대로 (시상 카드 폼·UI 디자인 참조용)**

```
<!-- 카드 전체: 카드형 컨테이너, 패딩·둥근 모서리·구분선으로 블록 분리 -->

[카드 제목] 1~2월 연속가동 · 추가 연속가동   <!-- H2 수준, 굵게 -->
[부제] 1월 16일~31일 · 2월 1일~18일          <!-- 보조 텍스트, 작은 글씨/회색 -->
[뱃지] 13회차, 최대 300%                     <!-- 칩/뱃지: 회차·시상률 상한 -->

[레이아웃: 왼쪽 1/3 | 오른쪽 2/3 세로 구분선]  <!-- 그리드 또는 flex, 세로선으로 시각적 분리 -->

왼쪽 영역:  <!-- 고정 비율(1/3), 세로 바가 메인 -->
  - 1월 연속가동 구간 (세로 바 차트)         <!-- 세로 막대: 10~50만 눈금, 채워진 높이=실적 -->
  - 구간 눈금: 10만, 20만, 30만, 50만 (원 단위 100000, 200000, 300000, 500000)
  - 라벨: "1월 연속가동 구간" / 실적 표시 (예: 30만)  <!-- 라벨 + 숫자(원화 포맷) -->

오른쪽 영역 (위쪽 블록: 연속가동):  <!-- 블록: 배경/테두리로 구분, 위-아래 간격 -->
  - 뱃지 "연속가동" + 기간 "2월 1~18일"      <!-- 블록 식별 뱃지 + 기간 텍스트 -->
  - 상태: "조건 달성" | "달성 가능성 높음"(2월 5만 이상) | "진행 중"  <!-- 상태별 색/아이콘 권장 -->
  - 진행률 바 (2월 실적 / 10만원 기준 100%)  <!-- 가로 progress bar, max=10만원 -->
  - "2월 연속가동 구간" / 실적 표시         <!-- 라벨 + 금액(원) -->
  - "예상 시상금" / 시상금 표시              <!-- 라벨 + 금액(원), 강조 가능 -->

오른쪽 영역 (아래쪽 블록: 추가 연속가동):
  - 뱃지 "추가 연속가동" + 기간 "2월 1~18일" (강조)  <!-- 연속가동과 시각적 구분(색/스타일) -->
  - 상태: "조건 달성" | "진행 중"
  - 진행률 바 (extraFeb / 10만원 기준)
  - "2월 추가 구간" / 실적 표시
  - "예상 시상금" / 시상금 표시
```

- **조건 달성**: 1월 실적 10만 이상 **그리고** 2월 실적 10만 이상.
- **다음달 추가 목표**: 10만원 (이만 채우면 시상 완성).

---

### 1-3. 파트너 정규 시상률 (월 실적 × 시상률)

| 항목     | 값  | 단위 |
|----------|-----|------|
| 시상률   | 450 | %    |

- **코드 매핑**: `incentiveEngine.ts` → `calculateRegularPrize(perf, isPartner)` (파트너일 때 `perf * 4.5`), `PartnerRegularPlusCard.tsx` → `PARTNER_RATE = 4.5`

**UI 참조 (정규 시상 카드)**  
실적(원)과 시상률(%)을 눈에 띄게 표시. “실적 × 시상률 = 예상 시상금” 구조가 보이도록 배치(예: 실적 한 줄, 시상률 한 줄, 예상 시상금 강조). 퍼센트 뱃지 또는 큰 숫자로 시상률(450%) 강조.

---

### 1-4. 파트너 2·3월 연속가동 시상 (구간 채운 뒤, 다음 달 10만원 추가 시 완성)

**로직**: 전월(2월)에 구간 실적을 채우면 → 다음 달(3월) 연속가동 구간에서 **추가 10만원**만 채우면 시상 확정.

| 전월_구간_실적_만원 | 시상금_만원 |
|---------------------|-------------|
| 50                  | 180         |
| 30                  | 80          |
| 20                  | 60          |
| 10                  | 20          |

| 항목 | 값 | 비고 |
|------|-----|------|
| 다음달_추가_목표_만원 | 10 | 3월 1~15일(연속가동) / 3월 1~8일(추가 연속가동)에서 10만원 이상이면 "조건 달성" |

- **코드 매핑**: `PartnerCards.tsx` → `run23Tiers`, `ContinuousRun23Card.tsx` → `febTarget`(50만), `marchTarget`(10만), 조건 `febPerf >= 100000 && march15Perf >= 100000`

**연속가동 카드 형식 (2·3월) — UI 구조 그대로 (시상 카드 폼·UI 디자인 참조용)**

```
<!-- 카드 전체: 1·2월 카드와 동일한 레이아웃·스타일 패턴(왼쪽 구간 바, 오른쪽 두 블록) -->

[카드 제목] 2~3월 연속가동 · 추가 연속가동   <!-- H2 수준, 굵게 -->
[부제] 2월 16일~28일 · 3월 1일~15일          <!-- 보조 텍스트, 작은 글씨/회색 -->
[뱃지] 13회차, 최대 300%                     <!-- 칩/뱃지: 회차·시상률 상한 -->

[레이아웃: 왼쪽 1/3 | 오른쪽 2/3 세로 구분선]  <!-- 그리드 또는 flex, 세로선으로 시각적 분리 -->

왼쪽 영역:  <!-- 고정 비율(1/3), 세로 바가 메인 -->
  - 2월 연속가동 구간 (세로 바 차트)         <!-- 세로 막대: 10~50만 눈금, 채워진 높이=2월 실적 -->
  - 구간 눈금: 10만, 20만, 30만, 50만 (원 단위)
  - 라벨: "2월 연속가동 구간" / 실적 표시   <!-- 라벨 + 숫자(원화 포맷) -->

오른쪽 영역 (위쪽 블록: 연속가동):  <!-- 블록: 배경/테두리로 구분 -->
  - 뱃지 "연속가동" + 기간 "3월 1~15일"      <!-- 블록 식별 뱃지 + 기간 -->
  - 상태: "조건 달성" | "진행 중" (2월 10만 이상 && 3월 10만 이상 → 조건 달성)  <!-- 상태별 색/아이콘 -->
  - 진행률 바 (3월 실적 / 10만원 기준 100%)  <!-- 가로 progress bar, max=10만원 -->
  - "현재 3월 실적" / 실적 표시             <!-- 라벨 + 금액(원) -->
  - "예상 시상금" / 시상금 표시              <!-- 라벨 + 금액(원), 강조 가능 -->

오른쪽 영역 (아래쪽 블록: 추가 연속가동):
  - 뱃지 "추가 연속가동" + 기간 "3월 1~8일"  <!-- 연속가동과 시각적 구분(색/스타일) -->
  - 상태: "조건 달성" | "진행 중"
  - 진행률 바 (3월 1~8일 실적 / 10만원 기준)
  - "현재 3월 실적" / 실적 표시
  - "예상 시상금" / 시상금 표시
```

- **조건 달성**: 2월 실적 10만 이상 **그리고** 3월(1~15일 또는 1~8일) 실적 10만 이상.
- **다음달 추가 목표**: 10만원.

---

## 2. 다이렉트/공통 시상 (참고용 – 같은 폼 형식으로 확장)

### 2-1. 주차 시상 (1월 1주차 예시)

| 구간_실적_만원 | 시상금_만원 |
|----------------|-------------|
| 120            | 600         |
| 100            | 400         |
| 80             | 240         |
| 50             | 100         |
| 30             | 30          |
| 20             | 20          |

- **코드 매핑**: `incentiveEngine.ts` → `JAN_W1_PRIZES` (원 단위 배열 `[number, number][]`)

**UI 참조 (주차 시상 카드)**  
주차별 카드 또는 한 카드 내 탭/블록으로 주차 구분. 구간(실적) → 시상금 매핑을 세로 바 또는 표 형태로 표시. 현재 실적이 어느 구간에 해당하는지 강조(막대 채움·라벨).

### 2-2. 3월 AFG 조기가동 시상률 (주차별 %)

| 주차 | 시상률_% |
|------|----------|
| 1주  | 400      |
| 2주  | 300      |
| 3주  | 250      |
| 4주  | 200      |

- **코드 매핑**: `incentiveEngine.ts` → `EARLY_RUN_WEEK_RATES`, `EARLY_RUN_TIERS` (구간 10/20/30/40/50만원)

**UI 참조 (조기가동 시상률)**  
주차별 시상률(%)을 뱃지·칩 또는 작은 카드로 나열. 1주차가 가장 높은 %이므로 시각적 위계(크기/색)로 구분 가능. 구간 실적(2-3)과 함께 사용 시 “구간 달성 + 해당 주차 시상률”이 한눈에 보이도록 배치.

### 2-3. 3월 조기가동 구간 (만원)

| 구간_실적_만원 |
|----------------|
| 10             |
| 20             |
| 30             |
| 40             |
| 50             |

- **코드 매핑**: `incentiveEngine.ts` → `EARLY_RUN_TIERS` (원: 100000, 200000, …)

**UI 참조 (조기가동 구간)**  
10~50만원 눈금의 세로/가로 구간 바. 현재 실적이 어느 구간(티어)에 해당하는지 채워진 막대 + 라벨로 표시. 주차별 시상률(2-2)과 연결해 “이 구간 + 이 주차 = 시상금” 구조 노출.

---

## 3. 코드 매핑 요약 (AI 적용 시 참고)

| 시상_이름           | 파일 | 상수/함수/컴포넌트 |
|---------------------|------|---------------------|
| 파트너 구간 시상    | constants.ts | PARTNER_TIERS |
| 파트너 구간 시상금  | incentiveEngine.ts | getPartnerTierPrize |
| 파트너 1·2월 연속가동(구간+다음달 10만) | incentiveEngine.ts, ContinuousRun12Card.tsx | getPartnerContinuousPrize, janTarget(50만), febTarget(10만), 조건 baseJan≥10만&&baseFeb≥10만 |
| 파트너 2·3월 연속가동(구간+다음달 10만) | PartnerCards.tsx, ContinuousRun23Card.tsx | run23Tiers, febTarget(50만), marchTarget(10만), 조건 feb≥10만&&march≥10만 |
| 파트너 정규 시상률  | incentiveEngine.ts, PartnerRegularPlusCard.tsx | calculateRegularPrize, PARTNER_RATE (4.5 = 450%) |
| 1월 주차 시상       | incentiveEngine.ts | JAN_W1_PRIZES, JAN_W2_PRIZES, JAN_W3_PRIZES |
| 2월 주차 시상       | incentiveEngine.ts | FEB_W1_PRIZES, FEB_W2_PRIZES |
| 3월 1주 특별        | incentiveEngine.ts | MAR_W1_SPECIAL_PRIZES |
| 3월 파타야          | incentiveEngine.ts | MAR_W1_PATAYA_PRIZES |
| 3월 2주 특별        | incentiveEngine.ts | MAR_W2_SPECIAL_PRIZES |
| 조기가동 구간       | incentiveEngine.ts | EARLY_RUN_TIERS |
| 조기가동 주차 시상률| incentiveEngine.ts | EARLY_RUN_WEEK_RATES |

---

## 4. 단위 규칙

- **표에서 만원**: 코드에 반영 시 `값 * 10000` (원).
- **표에서 %**: 코드에 반영 시 `값 / 100` (예: 450% → 4.5).
- **구간**: 실적 이상(이상) 기준. 내림차순으로 나열하면 코드와 동일한 순서.

---

## 5. 데이터 끌어오는 로직 및 매핑 (시상용)

시상 카드에 쓰는 값은 **Supabase agents** 테이블 + **일일 엑셀(MC_LIST, PRIZE_SUM)** 업로드 결과에서 옵니다.  
대시보드 API(`/api/dashboard`)는 Supabase에서 agents 조회 후, 필요 시 `february_closed.json` / `january_closed.json`으로 performance·주차 실적을 덮어쓰고, MC_LIST는 현재 branch 덮어쓰기에만 사용(훅만 유지, 실제 반영은 Supabase branch 사용).

### 5.1 데이터 흐름 요약

| 단계 | 내용 |
|------|------|
| 1 | Supabase `agents` 조회 (performance, weekly, product_week1, partner, branch, manager_name 등) |
| 2 | (선택) `mergeFebruaryFix` / `mergeJanuaryFix`: `src/data/february_closed.json`, `january_closed.json`으로 월별 실적·주차 실적 덮어쓰기 |
| 3 | (선택) `applyMcListBranch`: MC_LIST 기반 code→branch 맵으로 branch 덮어쓰기 — 현재는 미적용(훅만 유지) |
| 4 | 파트너 여부: `branch`에 "파트너" 포함 여부로 판별. 파트너 시상 카드는 `agent.partner` + `performance`/`weekly` 사용 |

- **월별 실적·주차 실적**: 주로 Supabase `performance`, `weekly` (일일 업데이트 스크립트가 MC_LIST 등에서 적재).
- **파트너 전용 시상 실적·시상금**: Supabase `agents.partner` (PRIZE_SUM 엑셀 → `upload-partner-prize.js`로 업로드).

### 5.2 MC_LIST 매핑 (무엇을 붙이는지)

| 항목 | 값 | 비고 |
|------|-----|------|
| **파일 패턴** | `data/daily/{NNNN}MC_LIST_OUT_{YYYYMM}.xlsx` | 예: `0310MC_LIST_OUT_202603.xlsx` |
| **용도** | 설계사 코드별 **현재대리점지사명(branch)** 맵 생성, **매니저명(manager_name)** DB 반영 | 대시보드 API는 branch 맵만 읽음(현재 미적용). DB 갱신은 스크립트 별도 실행 |

| 엑셀 열 (0-based) | 엑셀 열 (알파벳) | 내용 | 붙이는 곳 |
|-------------------|------------------|------|-----------|
| 5 | **F** | 현재대리점설계사조직코드 (설계사 code) | 매칭 키 |
| 37 | **AL** | 현재대리점지사명 | `code → branch` 맵 (API에서 사용 시 agent.branch 덮어쓰기) |
| 4 | **E** | 매니저명 | 스크립트 `supabase-update-manager-from-mclist.js`로만 **Supabase agents.manager_name**에 반영 |

- **대시보드 API** (`src/app/api/dashboard/route.ts`): `loadMcListBranchMap()`으로 F열(code), AL열(branch) 읽어 code→branch 맵 생성. 현재는 `applyMcListBranch()`가 덮어쓰지 않음(Supabase branch 사용).
- **스크립트**: `supabase-update-manager-from-mclist.js` — E열(매니저명) → `agents.manager_name`, F열(code), AL열(지사, "어센틱" 포함 행만).

### 5.3 PRIZE_SUM 매핑 (무엇을 붙이는지)

PRIZE_SUM 엑셀은 **파트너 전용** 시상 실적·시상금을 `agents.partner` JSON에 넣습니다.  
업로드: `node scripts/upload-partner-prize.js [파일경로]` (경로 생략 시 `data/daily` 최신 `*PRIZE_SUM*.xlsx` 사용).

| 항목 | 값 |
|------|-----|
| **파일 패턴 (2월)** | `data/daily/{MMDD}PRIZE_SUM_OUT_202602.xlsx` |
| **파일 패턴 (1월 병합)** | `data/fix/1월마감PRIZE_SUM_OUT_202601.xlsx` (1월 전용 필드만 partner에 병합) |
| **매칭 키** | **K열 (0-based 10)** = 설계사코드 |

| 엑셀 열 (0-based) | 엑셀 열 | 내용 | agent.partner 필드 |
|-------------------|--------|------|---------------------|
| 10 | K | 설계사코드 | 매칭 키 (code) |
| 27 | AB | 1주차 인보험 시상금 | `productWeek1InsPrize` |
| 28 | AC | 1주차 상품 실적 | `productWeek1` |
| 29 | AD | 1주차 상품 시상금 | `productWeek1Prize` |
| 32 | AG | 2주차 인보험 시상금 | `productWeek2InsPrize` |
| 33 | AH | 2주차 상품 실적 | `productWeek2` |
| 34 | AI | 2주차 상품 시상금 | `productWeek2Prize` |
| 37 | AL | 3주차 인보험 시상금 | `week3Prize` |
| 38 | AM | 3–4주차 합산 실적 | `week34Sum` |
| 39 | AN | 3–4주차 인보험 시상금 | `week34Prize` |
| 63 | BL | 1–2월 연속가동 실적 (1월) | `continuous12Jan` |
| 64 | BM | 1–2월 연속가동 실적 (2월) | `continuous12Feb` |
| 65 | BN | 1–2월 연속가동 시상금 | `continuous12Prize` |
| 69 | BR | 1–2월 추가 연속가동 실적 (1월) | `continuous12ExtraJan` |
| 70 | BS | 1–2월 추가 연속가동 실적 (2월) | `continuous12ExtraFeb` |
| 71 | BT | 1–2월 추가 연속가동 시상금 | `continuous12ExtraPrize` |
| 75 | BX | 2–3월 연속가동 실적 (2월) | `continuous23Feb` |
| 76 | BY | 2–3월 연속가동 실적 (3월, 3/1~15) | `continuous23Mar` |
| 77 | BZ | 2–3월 연속가동 시상금 | `continuous23Prize` |
| 79 | CB | 2–3월 추가 연속가동 실적 (2월) | `continuous23ExtraFeb` |
| 80 | CC | 2–3월 추가 연속가동 실적 (3월, 3/1~8) | `continuous23ExtraMar` |
| 81 | CD | 2–3월 추가 연속가동 시상금 | `continuous23ExtraPrize` |

- **월간/주차 기본 실적**: `performance`, `weekly`는 MC_LIST 등 일일 업데이트로 채워지며, PRIZE_SUM은 **시상금·연속가동 구간 실적**만 `partner`로 보강합니다 (기본 실적 대체 아님).
- 상세 컬럼 설명: `docs/PARTNER_PRIZE_RULES.md` §3.3 참고.

### 5.4 파트너 카드별 시상금 표시 매핑 체크

UI에 표시되는 시상금은 **원 단위**로 카드에 전달되고, `formatMan(원)`으로 "만원" 문자열로 표시됩니다. 엑셀에 만원 단위(예: 20)로 들어오면 `PartnerCards.tsx`에서 `toPrizeWon`(1~9999 → ×10000)으로 원으로 변환 후 사용합니다.

| 카드 | 표시 시상금 출처 | 비고 |
|------|-------------------|------|
| **PartnerRegularPlusCard** | 카드 내부 계산: `currentPerf × 4.5` (450%) | incentiveData 미사용 |
| **PartnerWeekCombinedCard** (1주차 인보험/상품) | 실적: 1주차 인보험=Supabase `weekly.week1`, 1주차 상품=`productWeek1`. 시상금: PRIZE_SUM(AB/AD) 우선, 없으면 구간별 달성금액 `getPartnerTierPrize(실적)` (10/20/30/50만원) | toPrizeWon 적용 후 fallback |
| **DirectMeritzClubPlusCard** | `incentiveData.clubPlusPrize` | incentiveEngine 계산 |
| **DirectDoubleMeritzCard** | `incentiveData.doubleMeritzPrize` | incentiveEngine 계산 |
| **ContinuousRun12Card** | `partner.continuous12Prize`, `partner.continuous12ExtraPrize` (PRIZE_SUM BN/BT) | toPrizeWon 적용 |
| **ContinuousRun23Card** | `partner.continuous23Prize`/`continuous23ExtraPrize` 우선, 없으면 run23Tiers(2월 구간+3월 10만)로 계산 | 원 단위 유지 |

- **toPrizeWon**: `v > 0 && v < 10000`이면 `v * 10000` (만원→원), 아니면 그대로. 엑셀에 만원 단위로 적힌 시상금이 올바르게 "만원"으로 표시되도록 함.
- 코드 위치: `src/app/partner/_components/PartnerCards.tsx` (카드별 매핑 주석 동일 내용).

---

이 폼만 수정한 뒤 "PRIZE_LOGIC_FORM.md 반영해줘"라고 하면, 위 매핑대로 대시보드 코드에 숫자 반영하면 됩니다.
