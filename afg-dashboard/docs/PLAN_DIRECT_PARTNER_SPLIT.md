# Direct / Partner 페이지 분리 플랜

> 현재 단일 `page.tsx`(~1900줄)를 **GA별로** 나누어 유지보수를 쉽게 합니다.  
> **direct** = 비파트너(그동안 작업하던 대시보드), **partner** = 파트너 지사 전용 UI.

---

## 1. 목표

- **direct**: 비파트너 전용 — 1·2월 NonPartnerCards, 3월 MarchCards, MY HOT, 정규시상 등.
- **partner**: 파트너 전용 — 파트너 시상 카드 그리드(1월 11장, 2월 12장), 연속가동/주차 시상 등.
- 라우트로 진입점 분리: `/direct`, `/partner`. 루트 `/`는 `/direct`로 리다이렉트.

---

## 2. 현재 구조 요약

- **app/page.tsx**: 하나의 `Dashboard` 컴포넌트가 전부 담당.
- **분기**: `isPartnerBranch = (selectedAgent?.branch || "").includes("파트너")`
  - `!isPartnerBranch` → 비파트너: NonPartnerCards, MarchCards, MY HOT, 실적 추이 차트 등.
  - `isPartnerBranch` → 파트너: PartnerPrizeCardFull 그리드만, MY HOT 없음.
- **공통**: 로그인/세션, 헤더(검색·설계사 목록·내보내기/앱설치), 비밀번호 변경, 시상안 가이드, 하단 업데이트 날짜, 캡처 모드.

---

## 3. 목표 디렉터리 구조

```
src/app/
├── layout.tsx                 # 유지 (전역 레이아웃, RegisterSW 등)
├── page.tsx                   # 루트: redirect to /direct (또는 빈 페이지 + 링크)
├── login/
│   └── page.tsx               # 유지. 로그인 성공 시 /direct 로 이동 (기본)
├── direct/
│   └── page.tsx               # 비파트너 전용 대시보드 (현재 page.tsx 에서 비파트너 분기만)
├── partner/
│   └── page.tsx               # 파트너 전용 대시보드 (현재 page.tsx 에서 파트너 분기만)
├── api/                       # 변경 없음
├── MarchCards.tsx             # direct 전용으로 이동 또는 components 로
├── NonPartnerCards.tsx        # direct 전용
├── LoadingLines.tsx           # 공용 유지
├── TierBadges.tsx             # 공용 또는 direct/partner 각자
├── GlowEffect.tsx             # 공용 유지
└── ...
```

---

## 4. 공유 vs 전용 정리

| 구분 | 내용 |
|------|------|
| **공유** | 로그인·세션, `/api/dashboard`·`/api/auth/*`, 레이아웃, `LoadingLines`, `globals.css`. 공통 타입·상수(`RANK_EXCLUDE_CODE`, `januaryClosed`/`februaryClosed` 등)는 `@/lib` 또는 `@/components` 로 분리해 두 페이지에서 import. |
| **direct 전용** | `MarchCards`, `NonPartnerCards`, 1·2·3월 탭 중 비파트너 시상 카드, MY HOT 섹션, 비파트너용 실적/순위/목표 계산 로직. |
| **partner 전용** | `PartnerPrizeCard` / `PartnerPrizeCardFull`, 파트너 시상 그리드(1월 11장·2월 12장), `partner` 데이터·연속가동/주차 시상 계산 로직. |

---

## 5. 데이터·API

- **동일 API 사용**: `/api/dashboard` 는 그대로 두고, direct/partner 각 페이지에서 동일하게 호출.
- **필터링**:
  - **direct**: 설계사 목록은 비파트너만 보여도 됨 (선택). 또는 전부 보여주고 선택된 설계사가 파트너면 “파트너 전용 화면은 /partner 에서 확인하세요” 안내 가능.
  - **partner**: 설계사 목록은 파트너 지사만 필터링해 표시.
- **로그인 후 진입**: 로그인 시 기본 `router.push("/direct")`. (선택) 응답에 따라 파트너 계정이면 `router.push("/partner")` 로 보내도 됨.

---

## 5.5 선택 시 GA별 리다이렉트

- **direct 페이지에서 파트너 설계사를 검색·선택한 경우**  
  선택된 설계사의 `branch`에 "파트너"가 포함되면 → **`/partner`로 리다이렉트** (선택한 설계사 유지: 쿼리 예 `?code=724001882` 또는 partner 쪽에서 동일 code로 자동 선택).
- **partner 페이지에서 비파트너 설계사를 검색·선택한 경우**  
  선택된 설계사의 `branch`에 "파트너"가 없으면 → **`/direct`로 리다이렉트** (동일하게 code 유지).
- **구현**: `selectedAgent`가 바뀔 때마다(또는 설계사 클릭/검색 확정 시) `branch`를 보고, 현재 경로(`/direct` vs `/partner`)와 맞지 않으면 `router.replace("/partner?code=...")` 또는 `router.replace("/direct?code=...")` 호출. 각 페이지 진입 시 `searchParams.get("code")`가 있으면 해당 설계사를 초기 선택 상태로 두면 됨.

---

## 6. 구현 단계 제안

| 단계 | 작업 | 비고 |
|------|------|------|
| **1** | **공용 모듈 정리** | 상수·타입·닫힌 데이터(januaryClosed 등)를 `lib/` 또는 `data/` 로 분리. 헤더·푸터·공통 훅(useDashboard 등)을 공용 컴포넌트로 추출할지 결정. |
| **2** | **app/direct/page.tsx 생성** | 현재 `page.tsx` 에서 `!isPartnerBranch` 분기만 남긴 UI/로직으로 새 파일 작성. `MarchCards`, `NonPartnerCards`, MY HOT, 내보내기/앱설치, 비밀번호 변경 등 포함. **설계사 선택 시** `branch`에 "파트너" 포함이면 `router.replace("/partner?code=...")` 로 리다이렉트. |
| **3** | **app/partner/page.tsx 생성** | 현재 `page.tsx` 에서 `isPartnerBranch` 분기만 남긴 UI/로직으로 새 파일 작성. 파트너 카드 그리드, 파트너 전용 계산만 포함. **설계사 선택 시** `branch`에 "파트너" 없으면 `router.replace("/direct?code=...")` 로 리다이렉트. |
| **4** | **루트 app/page.tsx** | `redirect("/direct")` 또는 `<Link href="/direct">비파트너</Link>`, `<Link href="/partner">파트너</Link>` 안내 페이지로 변경. |
| **5** | **login 성공 후** | `router.push("/")` → `router.push("/direct")` 로 변경. (파트너 자동 진입 시 로그인 응답 보고 `/partner` 로 보내기) |
| **6** | **GA별 리다이렉트** | direct에서 파트너 설계사 선택 시 `/partner?code=...`, partner에서 비파트너 선택 시 `/direct?code=...` 로 `router.replace`. 각 페이지는 `searchParams.code` 로 초기 선택 설계사 처리. |
| **7** | **기존 page.tsx 제거** | direct/partner 동작 확인 후, 루트 `app/page.tsx` 는 리다이렉트만 두고 이전 단일 대시보드 코드는 삭제. |

---

## 7. 주의사항

- **admin/manager**: 두 페이지 모두에서 설계사 목록·검색이 필요하면, direct/partner 각각 동일한 헤더·목록 로직을 두거나, 공용 `DashboardHeader` + `AgentList` 컴포넌트로 빼서 재사용.
- **캡처 모드** (`?capture=1`): direct/partner 각 페이지에서 동일하게 쿼리 처리해 export 영역만 캡처하도록 유지.
- **105203241 등 특수 계정**: `/api/dashboard` 필터링은 그대로 두고, direct 페이지에서만 노출되도록 하면 됨 (또는 필요 시 partner 에서도 동일 계정 허용).

---

## 8. 정리

- **direct** = 비파트너 전용 페이지 (`/direct`).
- **partner** = 파트너 전용 페이지 (`/partner`).
- **코드 분리**: 한 파일에서 `isPartnerBranch` 로 나뉜 두 블록을 각각 `app/direct/page.tsx`와 `app/partner/page.tsx`로 옮기고, 공통 부분은 공용 컴포넌트/라이브러리로 추출.
- 이 플랜대로 진행하면 `page.tsx` 복잡도가 줄고, GA별로 수정·배포 시 충돌을 줄일 수 있습니다.
