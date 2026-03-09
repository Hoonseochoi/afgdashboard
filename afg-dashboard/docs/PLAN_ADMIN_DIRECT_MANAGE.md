# Direct 관리자 모드 `/direct/manage` 플랜

> **관리자/매니저**가 상단 검색 헤더가 보이는 상태에서,  
> 기존 대시보드에 이미 로딩된 데이터를 기반으로 **전체 실적/시상 통계**를 보는 전용 화면을 추가합니다.

---

## 1. 목표

- **헤더 프로필 드롭다운에 관리자 전환 토글 추가**
  - 조건: `user.role === "admin" \|\| "manager" \|\| "m_agent_manager"` 이면서, 상단 검색창이 노출되는 경우(=관리 권한 계정).
  - 프로필(이름/원형 아바타)을 클릭하면 드롭다운이 열리고:
    - **"관리자 모드 열기"** → `/direct/manage` 로 이동.
    - **"대시보드로 돌아가기"** → 기존 `/direct` 대시보드로 복귀(선택 설계사/쿼리 유지 가능하면 유지).
- **신규 페이지 `/direct/manage` 추가**
  - 현재 `/direct` 대시보드에서 이미 fetch한 **agents / user / ranks / incentiveData 등 메모리 상 데이터**를 바탕으로,
  - **전체 실적 랭킹, 시상 랭킹, 지점/지사별 분포** 등을 한눈에 보는 관리자용 요약 화면 구성.
  - Supabase를 추가로 호출하지 않고, `/api/dashboard` 응답(및 파생 데이터)만 재가공.
- **접근 가능한 설계사만 통계에 포함**
  - `/api/dashboard` 응답에서 이미 필터링된 `agents` 배열을 그대로 사용.
  - 예: 유저가 엔타스 스튜디오만 접근 가능하면, 통계에도 엔타스 설계사만 포함.

---

## 2. UI/UX 개요

### 2.1 헤더 프로필 드롭다운

- 위치: 기존 `Header` 컴포넌트 상단 우측, 사용자 이름/원형 프로필 영역.
- 동작:
  - 프로필 영역 클릭 → 작은 메뉴 패널 오픈.
  - 메뉴 항목 예시:
    - `관리자 모드 열기` (아이콘: `leaderboard` 또는 `analytics`)
    - `대시보드로 돌아가기` (아이콘: `dashboard`)
  - 관리자 모드 진입 시:
    - 현재 경로가 `/direct` 또는 `/partner` 등이어도, 우선 `/direct/manage`로 이동 (1차 버전).
    - 필요 시 `?code=` 쿼리로 현재 선택 설계사 유지하거나, 관리자 모드에선 특정 설계사 고정 필요 없도록 설계.
- 디자인:
  - Stich MCP 프로젝트 **"Meritz GA Performance Management Dashboard"**의 상단 네비/프로필 UI를 참고.
  - 카드형 드롭다운, 가벼운 그림자, Tailwind 4 기반 현대적인 스타일 유지.

### 2.2 `/direct/manage` 레이아웃 (초안)

- 상단: 페이지 헤더
  - 제목: `관리자 통계 대시보드`
  - 서브텍스트: `현재 접속 계정이 접근 가능한 설계사들만 기준으로 집계됩니다.`
  - 우측: 간단한 필터 (월 선택, direct/partner 토글 등) — 1차 버전은 `selectedViewMonth` 재사용.
- 메인 콘텐츠 영역(2~3열 그리드):
  - **전체 실적 랭킹 Top N 카드**
    - 선택 월 기준 `agents`를 실적 내림차순 정렬.
    - Top 10 리스트(순위, 이름, 지사, 인정실적) 표시.
  - **시상 랭킹 카드**
    - `incentiveData`에서 계산 가능한 총 시상금 기준 Top N.
    - direct / partner 모두 포함하되, 현재 계정이 볼 수 있는 설계사만.
  - **지점/지사별 실적 분포**
    - `branch` 기준으로 그룹화 후 각 지점 총 실적, 인원 수, 평균 실적 등 보여주는 바 차트/테이블.
  - **기타 지표(차후 확장)**
    - 예: 목표 달성률 상위 설계사, 3월 조기가동 실적 상위, MY HOT 상위 등.
- 하단:
  - 데이터 기준일(`updateDate`) 표기.
  - "대시보드로 돌아가기" 버튼(헤더 드롭다운 외에 보조 액션).

---

## 3. 데이터 소스 및 범위

- **데이터 소스**
  - `/api/dashboard` 응답에서 이미 수신한:
    - `agents: Agent[]`
    - `user: User`
    - `globalRanks`, `directRanks`, `partnerRanks`
    - `updateDate`
  - `incentiveData`는 현재 선택 설계사 기준이므로,
    - 관리자 화면에서는 별도 **엔진 함수**를 추가해 `agents` 전체에 대해 필요한 파생지표를 계산.
- **접근 범위 제한**
  - 추가 Supabase 쿼리 없이, 프론트에 로딩된 `agents` 배열만 사용.
  - 서버에서 이미 계정별 접근 제어가 되어 있다는 가정 하에, **별도의 필터링 없이 `agents` 전체 = 접근 가능한 설계사 전체**로 본다.
  - 추후 필요 시, `user.allowedBranches` 또는 `user.manager_code` 등에 따라 클라이언트단 2차 필터링 가능.

---

## 4. 디렉터리/컴포넌트 구조 제안

```bash
src/app/direct/
├── page.tsx                     # 기존 Direct 대시보드
├── manage/
│   └── page.tsx                 # 관리자 모드 진입점 (/direct/manage)
└── _components/
    └── manage/
        ├── ManageLayout.tsx     # 헤더/필터/그리드 래퍼
        ├── OverallRankCard.tsx  # 전체 실적 랭킹 카드
        ├── PrizeRankCard.tsx    # 시상 랭킹 카드
        ├── BranchStatsCard.tsx  # 지점/지사별 통계 카드
        └── ...                  # 추가 지표 카드
```

- `Dashboard.tsx` / `useDashboardData`는 그대로 유지하고,
  - `/direct/manage` 에서는 **새 훅** 또는 **엔진 함수**를 통해 `agents`·`globalRanks`를 재사용해 통계 계산.
- 관리자 모드용 엔진:
  - 위치: `src/lib/engines/adminStatsEngine.ts` (신규)
  - 책임: `agents` 배열과 월/필터 정보를 받아 랭킹/집계용 데이터 구조를 반환.

---

## 5. 구현 단계

| 단계 | 작업 | 비고 |
|------|------|------|
| **1** | `Header`에 프로필 드롭다운 상태/레이아웃 추가 | `user?.role`로 관리자 여부 판단, 메뉴 클릭 시 `router.push` 또는 `window.location.href` 사용. |
| **2** | `/direct/manage/page.tsx` 생성 | `useDashboardData`를 재사용해 `agents`, `user`, `selectedViewMonth`, `globalRanks` 등을 받아오는 클라이언트 컴포넌트. |
| **3** | `adminStatsEngine.ts` 설계 | (1) 월별 전체 실적 랭킹, (2) 시상 랭킹, (3) 지점별 집계 등 계산 함수 정의. |
| **4** | `_components/manage/*Card.tsx` 구현 | 엔진이 반환한 데이터 구조를 카드·테이블·차트 형태로 보여주는 프레젠테이션 컴포넌트들. |
| **5** | Stich MCP 레퍼런스 반영 | `user-stitch` MCP의 `get_screen`으로 해당 프로젝트/스크린 HTML·스크린샷을 받아, 카드/그리드 배치·색감을 Tailwind로 재현. |
| **6** | "대시보드로 돌아가기" 링크/버튼 연결 | 헤더 드롭다운 + `/direct/manage` 내 상단/하단에 `/direct` 로 돌아가는 액션 노출. |
| **7** | 권한 및 가드 처리 | 관리자·매니저가 아닌 경우 `/direct/manage` 진입 시 `/direct`로 리다이렉트 또는 403 메시지. |

---

## 6. 주의사항

- **Dashboard 비대화 방지 원칙 준수**
  - 관리자 통계 로직은 `src/lib/engines/adminStatsEngine.ts` 로 분리해, `Dashboard.tsx` / `/direct/manage` 양쪽에서 필요 시 재사용 가능하게 설계.
- **성능**
  - 통계는 모두 브라우저 메모리상의 `agents` 배열을 기준으로 계산하므로, N(설계사 수)이 많아질 경우를 고려해 `useMemo` 등으로 캐싱.
- **권한/보안**
  - 프론트에서만 통계 범위를 제한하기보다는, `/api/dashboard`가 이미 계정별로 `agents`를 제한하고 있다는 가정을 유지.  
  - 추가적인 관리자-only 지표(예: 노출되면 안 되는 민감 데이터)는 추후 별도 API로 설계.

---

## 7. 정리

- 헤더 프로필 드롭다운을 통해 **대시보드 ↔ 관리자 통계 모드**를 토글할 수 있는 UX를 제공.
- `/direct/manage` 페이지에서는 Supabase를 추가 호출하지 않고, 기존 `/api/dashboard` 응답과 `agents` 파생 데이터만으로 전체 랭킹/시상/지점 통계를 구성.
- 모든 통계는 **현재 로그인 사용자가 접근 가능한 설계사 집합**만을 기준으로 계산된다.

