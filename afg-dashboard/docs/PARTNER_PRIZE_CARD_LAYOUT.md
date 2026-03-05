## 파트너 대시보드 카드 설계/구현 계획 (v2, Apple 테마)

이 문서는 **파트너 모드 전용 카드 UI를 다시 구현하기 위한 상세 스펙 + 구현 단계용 체크리스트**다.  
모든 변경은 이 문서를 먼저 수정한 뒤 코드에 반영한다.

---

### 1. 목표/원칙

- **시각적 아이덴티티**
  - direct 상단 카드와 맞춘 **Apple‑like 뉴트럴 카드**:  
    - 라이트: `from-white to-gray-50/90` + 얇은 `border-gray-200/80`  
    - 다크: `from-[#050509] to-[#050509]` + `border-gray-800`
  - 강하지만 부드러운 그림자: `shadow-[0_18px_45px_rgba(15,23,42,0.45)]`
  - 컨텐츠(텍스트·뱃지·수치)는 기존 색을 최대한 유지 (데이터 의미 변화 금지).

- **구조**
  - direct / partner 완전히 분리:
    - `showPartnerContent`가 true일 때 partner 전용 컴포넌트들만 렌더.
    - 하단 공통 그리드(3월 정규시상, MY HOT, 최근 실적 추이)는 **비파트너 전용**.
  - 파트너 카드 영역은 **독립 컴포넌트**로 분리:
    - `PartnerSummarySection` (상단 메인 카드 영역은 그대로)
    - `PartnerPrizeGrid` (정규+주차+연속가동)
    - `PartnerClubAndTrendSection` (메리츠클럽+ + 실적 추이)

- **사용성**
  - 2월 탭에서 **정규 + 1·2·3(3–4)주 + 연속가동 + 클럽** 정보가 한 화면에서 한눈에 들어오도록.
  - 연속가동 12/23 카드 내부 레이아웃은 Stitch 브릿지 카드 느낌 유지.

---

### 2. 레이아웃 개요 (파트너 모드)

#### 2-1. 상단: 메인 헤더 카드 (이미 구현, 확인만)

- 현재 상태 유지:
  - 흰 배경 `bg-gradient-to-br from-white to-gray-50/90 dark:from-[#050509] dark:to-[#050509]`
  - 텍스트:
    - 이름: `text-gray-900 dark:text-white`
    - 님, 브랜치: `text-gray-500/600 dark:text-gray-300/400`
  - 이 섹션은 **수정 금지** (단, 색상/폰트는 Apple 테마와 맞춰둔 상태 유지 확인).

#### 2-2. PartnerPrizeGrid (1·2월 공통 구조)

그리드 설정:

- 클래스: `grid grid-cols-1 gap-4 md:gap-5 mb-6 sm:grid-cols-2 lg:grid-cols-3`
  - 모바일: 1열
  - md: 2열
  - lg 이상: 3열

`selectedViewMonth === 1`일 때(1월 뷰):  
  (추후 필요 시, 2월과 동일 패턴으로 정리)

`selectedViewMonth === 2`일 때(2월 뷰 – 핵심):

- **1행 (3장, 각 1칸)**  
  1. `정규+파트너 추가` – `PartnerPrizeCardFull`
  2. `1주차 인보험·상품` – 1·2줄 통합 카드 (`PartnerWeekCombinedCard` v2)
  3. `2주차 인보험·상품` – 동일 컴포넌트, 주차만 2주차

- **2행**  
  4. `1~2월 연속가동` – `ContinuousRun12Card` (1칸, Apple 카드)  
  5. `3주차·3~4주차 인보험` – 인보험 3주차 + 3–4주차 인보험을 위/아래로 쌓는 카드 (`PartnerWeekCombinedCard` v2 재사용)

- **3행**  
  6. `2~3월 연속가동` – `ContinuousRun23Card` (1칸)  
  7. `메리츠클럽 플러스` – `MeritzClubPlusCard` (1칸, 아래 별도 섹션에서도 사용할 수 있으므로 재사용 가능성 유의)

> 구현 시에는 우선 **2월 탭**만 위 레이아웃을 완성하고, 필요하면 1월 탭도 통일.

---

### 3. 컴포넌트 설계 (파트너 전용)

#### 3-1. 공통 Apple 카드 스타일 토큰

공통 스타일 상수(유틸 함수 또는 변수):

- `APPLE_CARD_BASE = "relative rounded-2xl p-4 md:p-5 flex flex-col overflow-hidden bg-gradient-to-br from-white to-gray-50/90 dark:from-[#050509] dark:to-[#050509] border border-gray-200/80 dark:border-gray-800 shadow-[0_18px_45px_rgba(15,23,42,0.45)]"`  
- 각 카드 컴포넌트의 최상위 `div`는 `className={APPLE_CARD_BASE + " " + extraClasses}` 형태로 사용.

#### 3-2. PartnerPrizeCardFull (기본 카드)

역할:
- 정규+파트너, 12~1월 연속가동 요약 등 **단일 시상** 카드.

변경 포인트:

- 배경: 기존 variant별 그라디언트 → **APPLE_CARD_BASE** 로 통일.
  - `variant`는 상단 배지/인덱스 컬러만 제어.
- 패딩: `p-5 → p-4 md:p-5` (세로 조금 줄이기).
- 티어 버튼 뱃지:
  - `gap-1.5 → gap-2`
  - `py-2 text-xs → px-2.5 py-1.5 text-[11px] rounded-xl`

#### 3-3. PartnerWeekCombinedCard (1·2주차, 3·3–4주차 공통)

프롭:

- `index: number`
- `title: string`
- `badges?: string[]`
- `line1Label: string` (ex: `"1주차 인보험"`, `"3주차 인보험"`)
- `line2Label: string` (ex: `"1주차 상품"`, `"3~4주 인보험"`)
- `tierPerf1: number` (윗줄 실적)
- `tierPerf2: number` (아랫줄 실적)
- `prize1: number`
- `prize2: number`
- `rateLabel1: string` (ex: `"인보험 200%"`)
- `rateLabel2: string`

레이아웃:

- 상단: 인덱스 + 타이틀 + (옵션)배지.
- 본문:
  - 윗블록:
    - `line1Label` + 우측 시상금/비율
    - PARTNER_TIERS 뱃지 (티어 달성 여부 하이라이트)
    - `실적 X만`
  - 아랫블록:
    - `pt-2 border-t`, 이후 구조 동일.

#### 3-4. ContinuousRun12Card / ContinuousRun23Card

공통:

- 컨테이너: `APPLE_CARD_BASE + " gap-3"`  
- 내부 그리드: `grid grid-cols-[1fr_2fr] gap-0 min-h-[164px]`  
- 좌측 세로 그래프:
  - 높이: `h-24` 정도로 조정 (페이지에 맞추어 이미 줄인 값).
  - 눈금 레이블(10·20·30·50만), 달성 구간만 `text-red-600` 강조 유지.

각 카드별 텍스트:

- `ContinuousRun12Card`:
  - 헤더 타이틀: `1~2월 연속가동 · 추가 연속가동`
  - 왼쪽 설명: `1월 구간 + 2월 구간 실적...`
  - 오른쪽 상/하: **연속가동 / 추가 연속가동** 2개 게이지.

- `ContinuousRun23Card`:
  - 헤더 타이틀: `2~3월 연속가동 · 추가 연속가동`
  - 좌측: 2월 16~28일 선행 구간 세로 그래프.
  - 우측 상단: 3/1~3/15 (기본 연속가동), 하단: 3/1~3/8 (추가).

#### 3-5. MeritzClubPlusCard

역할:

- Q1 메리츠클럽 플러스 1·2·3월 달성 상태를 **리스트 3줄**로.

레이아웃:

- 상단 헤더:
  - 좌: 아이콘 박스(검정/다크 서브톤 + 골드 크라운 아이콘).
  - 우: `메리츠 클럽` + `Meritz Club Plus (Q1)`.
- 본문 리스트 (3줄):
  1. `1월 (Jan)` – 기준: 200k 구간; 달성 여부에 따라 아이콘/텍스트.
  2. `2월 (Feb)` – 기준: 500k.
  3. `3월 (Mar)` – 기준: `plusTarget` (Q1 구간);  
     - 미달 시 우측 텍스트 빨간 `진행중`.

각 줄:

- 좌측:  
  - 동그라미 안 `✓` (달성) 또는 `…` (미달).
- 우측:
  - 달성: `200k 달성`, `500k 달성`, `{plusTargetK} 달성`.
  - 미달(3월): `진행중` (빨간색).

---

### 4. 파트너 전용 섹션 컴포넌트 구조

#### 4-1. `PartnerPrizeSection` (메인 본문에서 호출)

역할:

- 기존 `showPartnerContent && (...)` 블록을 통째로 분리:
  - 파라미터: `selectedViewMonth`, `p`(PartnerPrizeData), `currentMonthPerf`, `viewW1/2/3`, `febPerf`, `marchPerf`, `plusTarget`, `plusProgress` 등 필요한 값만 받기.
  - 내부에서:
    1. `PartnerPrizeGrid` 렌더.
    2. `PartnerClubAndTrendSection` 렌더.

#### 4-2. `PartnerPrizeGrid`

- 위 **2-2 섹션** 레이아웃을 그대로 구현.
- 1월/2월 분기는 컴포넌트 안에서 처리:
  - `if (selectedViewMonth === 1) { ... } else if (selectedViewMonth === 2) { ... }`.

#### 4-3. `PartnerClubAndTrendSection`

- 레이아웃:
  - 클래스: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mb-6`
  - 좌측: `MeritzClubPlusCard` (1칸)
  - 우측: `최근 7개월 실적 추이` 카드 (`col-span-1 lg:col-span-2`)
- 이 섹션은 **showPartnerContent일 때만** 렌더 (direct 용 하단 그리드와 중복되지 않게).

---

### 5. 구현 단계 체크리스트

1. **준비**
   - `Dashboard.tsx`에서 파트너 관련 변수들(`p`, `viewW*`, `plusTarget`, `febPerf`, `marchPerf` 등)을 한 군데로 정리.
   - 이 문서 내용 최신 여부 확인 후 필요한 수정 반영.

2. **공통 스타일 도입**
   - `APPLE_CARD_BASE` 상수를 파일 상단 또는 별도 유틸로 정의.
   - `PartnerPrizeCardFull`, 연속가동 카드, 메리츠클럽 카드 등 컨테이너를 Apple 스타일로 변경.

3. **PartnerWeekCombinedCard 구현**
   - 기존 1주차/2주차/3·3–4주차 통합 카드 로직을 이 컴포넌트로 교체.
   - 1월/2월 탭 각각에서 `PartnerPrizeCardFull` 두 장이 있던 곳을 하나의 `PartnerWeekCombinedCard`로 대체.

4. **연속가동 카드 리뉴얼**
   - `ContinuousRun12Card`, `ContinuousRun23Card`를 최소 높이/그래프 높이/Apple 테마 기준으로 수정.
   - 2월 탭에서 레이아웃에 맞게 1칸 카드로 배치.

5. **MeritzClubPlusCard 구현**
   - 현재 plus 로직(`plusTarget`, `febPerf`, `marchPerf`)을 이용해 세 줄 상태 계산.
   - 기존 정사각형 MC+ 카드 대신 이 카드로 교체.

6. **파트너 전용 섹션 분리**
   - `PartnerPrizeSection`, `PartnerPrizeGrid`, `PartnerClubAndTrendSection` 컴포넌트 생성.
   - `Dashboard` 본문에서 `showPartnerContent` 블록을 이 컴포넌트 호출로 교체.

7. **하단 공통 그리드 정리**
   - 하단 3월 정규시상 + 2026 MY HOT + 최근 실적 추이 그리드는  
     `!showPartnerContent` 조건으로 감싸서 비파트너 전용으로 유지.

8. **마지막 검증**
   - `mode="partner"` + 1월/2월 뷰, 파트너/비파트너 케이스 각각 시각 확인.
   - 총 카드 개수, 값(시상금/실적)이 기존 로직과 동일하게 나오는지 비교.
   - 필요 시 이 md 파일에 **실제 구현과 달라진 부분을 다시 반영**해서 문서와 코드를 동기화.

## 파트너 시상 카드 레이아웃/사이즈 정리

### 1. 파트너 시상 전체 그리드

- **그리드 컨테이너**
  - 클래스: `grid grid-cols-1 gap-4 md:gap-5 mb-6 md:grid-cols-4`
  - **모바일**: 1열
  - **md 이상**: 4열
  - **카드 간 간격**
    - 모바일: `gap-4`
    - md 이상: `gap-5`
  - **아래 여백**: `mb-6`

- **연속가동 카드 래퍼 (`ContinuousRun12Card`, `ContinuousRun23Card`)**
  - 클래스: `md:col-span-2`
  - **md 이상**: 그리드 4칸 중 2칸(가로 절반) 사용
  - 모바일: 한 줄 전체 폭

---

### 2. 기본 파트너 카드 (`PartnerPrizeCardFull`)

- **컨테이너**
  - 공통 클래스:
    - `relative rounded-2xl border p-5 flex flex-col overflow-hidden`
    - `transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5`
  - **패딩**: `p-5` (상하좌우 약 20px)
  - **모서리**: `rounded-2xl`
  - **테두리/배경(variant별 예시)**
    - green: `bg-gradient-to-br from-emerald-50 to-emerald-100/80 ... border-emerald-200/80 ...`
    - sky: `bg-gradient-to-br from-sky-50 to-sky-100/80 ...`
    - purple: `bg-gradient-to-br from-violet-50 to-violet-100/80 ...`
    - yellow: `bg-gradient-to-br from-amber-50 to-amber-100/80 ...`

- **티어 버튼 영역**
  - 상수: `const tierAreaHeight = "min-h-[52px] flex items-center";`
  - **최소 높이**: `min-h-[52px]`

---

### 3. 1·2주차 인보험/상품 통합 카드 (`PartnerWeek1CombinedCard`)

- **컨테이너**
  - 클래스:  
    `relative rounded-2xl border p-5 flex flex-col overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 ${variantBg[variant]}`
  - 기본 카드와 동일한 폭/모양, **세로만 조금 더 김** (인보험/상품 2블록)

- **내부 레이아웃**
  - 상단 인덱스/타이틀/배지: `mb-3`
  - 본문 래퍼: `div className="space-y-3 text-[11px] text-gray-700 dark:text-gray-100"`
  - **윗블록 (예: 인보험)**:
    - 라벨/시상금 줄: `flex items-baseline justify-between`
    - 구간 뱃지: `flex flex-wrap gap-1`
    - 실적: `text-[10px] text-gray-600 dark:text-gray-400`
  - **아랫블록 (예: 상품)**:
    - 컨테이너: `pt-2 border-t border-white/60 dark:border-gray-700/60`
    - 나머지 구조는 윗블록과 동일

---

### 4. 연속가동 카드

#### 4-1. 1~2월 연속가동 (`ContinuousRun12Card`)

- **컨테이너**
  - 클래스:  
    `relative rounded-2xl border p-5 flex flex-col gap-4 overflow-hidden bg-gradient-to-br from-violet-50 to-violet-100/80 dark:from-violet-950/40 dark:to-violet-900/30 border-violet-200/80 dark:border-violet-700/60 shadow-lg shadow-violet-200/20 dark:shadow-violet-900/20`
  - **패딩**: `p-5`
  - **세로 간격**: `gap-4`

- **내부 그리드**
  - 클래스: `grid grid-cols-[1fr_2fr] gap-0 min-h-[220px]`
  - 좌측: 1월 세로 그래프 (1fr)
  - 우측: 2월 게이지(연속/추가) (2fr)
  - **최소 높이**: `min-h-[220px]`

#### 4-2. 2~3월 연속가동 (`ContinuousRun23Card`)

- **컨테이너/그리드**
  - 동일: `rounded-2xl border p-5 flex flex-col gap-4 ...`
  - 내부: `grid grid-cols-[1fr_2fr] gap-0 min-h-[220px]`

- **가운데 선**
  - 세로 경계선:  
    `absolute inset-y-3 left-[33.33%] border-l border-violet-200/70 dark:border-violet-700/70`
  - 우측만 가로 중앙선:  
    `absolute top-1/2 left-[33.33%] right-3 border-t border-violet-200/70 dark:border-violet-700/70`

---

### 5. 2월 탭 파트너 카드 배치

- **그리드**: `grid grid-cols-1 gap-4 md:gap-5 mb-6 md:grid-cols-4`

- **카드 순서 (md 기준)**
  1. `index=1` 정규+파트너 추가 (`PartnerPrizeCardFull`) → **1칸**
  2. `index=2` 1주차 인보험·상품 (`PartnerWeek1CombinedCard`) → **1칸**
  3. `index=3` 2주차 인보험·상품 (`PartnerWeek1CombinedCard`) → **1칸**
  4. `ContinuousRun12Card` → `md:col-span-2` (**가로 2칸**)
  5. `index=4` 3주차·3~4주 인보험 (`PartnerWeek1CombinedCard`) → **1칸**
  6. `ContinuousRun23Card` → `md:col-span-2` (**가로 2칸**)
  7. `index=11` 메리츠클럽 플러스 (`PartnerPrizeCardFull`) → **1칸**

---

### 6. 공통 여백/타이포

- **그리드 간격**
  - 모바일: `gap-4`
  - md 이상: `md:gap-5`
- **그리드 아래 마진**: `mb-6`
- **카드 내부 글꼴 크기**
  - 타이틀: `text-xs sm:text-sm`
  - 배지: `text-[10px]`
  - 본문/설명: `text-[11px]`
  - 실적/서브텍스트: `text-[10px]`

