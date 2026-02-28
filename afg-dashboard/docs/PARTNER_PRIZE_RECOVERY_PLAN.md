# 파트너 시상 로직 복구·수정 계획

> 복구 과정에서 날아간 **미커밋 파트너 시상 수정 코드**를 찾지 못했을 때, 현재 코드·문서를 기준으로 다시 작업하기 위한 계획서입니다.

---

## 1. 복구 시도 결과 요약

| 확인 항목 | 결과 |
|-----------|------|
| **Git stash** | 비어 있음 (`git stash list` → 없음) |
| **page.tsx 최근 커밋** | "전일비 계산 및 정규시상 뱃지 개선" 등 — 파트너 시상 전용 커밋 없음 |
| **임시/백업 파일** | `.orig`, 백업 폴더 등 프로젝트 내에서 미발견 |
| **Cursor 로컬 히스토리** | 프로젝트 경로 내 history 관련 파일 미발견 |

**결론:** 어제 작업하던 파트너 시상 수정 코드는 **별도 백업이 없음**. 아래 **현재 코드베이스**와 **규칙 문서**를 기준으로 재작업해야 합니다.

---

## 2. 현재 코드베이스 기준 (복구 작업의 출발점)

### 2.1 참고 문서 (그대로 유지·참고)

- **`docs/PARTNER_PRIZE_RULES.md`** — 파트너 시상 구조, 연속가동 조건, 엑셀 컬럼 매핑, 업로드 흐름
- **`docs/PARTNER_PRIZE_JANUARY_MAPPING.md`** — 1월 전용 11항목, 엑셀 열 참조(K, AC, AD, AI, AJ, BJ, BK, BL 등), 1월/2월 데이터 구분

### 2.2 타입·데이터 (수정 시 여기와 맞출 것)

- **`src/lib/appwrite-server.ts`**
  - `PartnerPrizeData` 타입: `productWeek1`, `productWeek1Prize`, `productWeek2`, `productWeek2Prize`, `week34Sum`, `continuous12*`, `continuous12Extra*`, `continuous23Feb`, 1월 전용 `continuous121*`, `productWeek1PrizeJan`, `productWeek2PrizeJan`, `week3PrizeJan`, `week4PrizeJan` 등
  - `docToRecord()` 에서 `partner` JSON 문자열 파싱 후 `AppwriteAgentRecord.partner` 로 전달

### 2.3 업로드 스크립트

- **`scripts/upload-partner-prize.js`**
  - 202602: PRIZE_SUM 엑셀 → `agents.partner` 전체 덮어쓰기 (파트너 지사만)
  - 202601: 1월 전용 필드만 병합 (`productWeek1PrizeJan`, `productWeek2PrizeJan`, `continuous121*`, `week3PrizeJan`, `week4PrizeJan` 등)
  - 엑셀 열: K(코드), AD/AJ(1·2주차 시상금), BL/BM/BN, BR/BS/BT(연속가동)

### 2.4 대시보드 UI (수정 대상)

- **`src/app/page.tsx`**
  - **파트너 여부:** `isPartnerBranch = (selectedAgent?.branch || "").includes("파트너")`
  - **MY MERITZ PRIZE 섹션**
    - **1월 선택 시 (파트너):** 정규+파트너, 1주 인보험, 1주 상품, 2주 인보험, 2주 상품, 12~1월 연속가동, 3주 인보험, 4주 인보험, 1~2월 연속가동, 1~2월 추가 연속가동, 메리츠클럽+ (11개 카드)
    - **2월 선택 시 (파트너):** 정규+파트너, 1주 인보험, 1주 상품, 2주 인보험, 2주 상품, 1~2월 연속가동, 3~4주 인보험, 1~2월 추가 연속가동, 메리츠클럽+ (9개 카드)
  - **시상금 계산:** `regularPrize`, `meritzClubPlusPrize`, `getPartnerTierPrize(viewW2)` 등 사용. `totalEstimatedPrize` 는 파트너일 때 `p.*` 필드 합산으로 재계산

---

## 3. 복구·수정 작업 체크리스트 (MD 기반 진행용)

아래 순서대로 점검·수정하면, “날아간 코드” 없이도 현재 규칙서와 화면(예: MY MERITZ PRIZE 2월 9칸)과 일치시킬 수 있습니다.

### Phase 1: 데이터·타입 정합성

- [ ] **1.1** `PartnerPrizeData` 에 1월·2월 규칙서에 있는 모든 항목이 정의되어 있는지 확인  
  - 부족한 필드 있으면 `appwrite-server.ts` 에 추가 (예: 2~3월 연속가동용 `continuous23*` 등)
- [ ] **1.2** `upload-partner-prize.js` 가 202602/202601 파일에서 읽는 열이 `PARTNER_PRIZE_RULES.md`, `PARTNER_PRIZE_JANUARY_MAPPING.md` 와 일치하는지 확인
- [ ] **1.3** 1월 파일 업로드 시 `continuous121Dec`, `continuous121Jan`, `continuous121Prize`, `week3PrizeJan`, `week4PrizeJan` 등이 실제 엑셀 열과 맞게 채워지는지 확인

### Phase 2: 대시보드 표시·라벨

- [ ] **2.1** **2월** 파트너 카드 9개 순서·라벨이 기대와 같은지 확인  
  - 현재 코드: 정규+파트너 → 1주 인보험 → 1주 상품 → 2주 인보험 → 2주 상품 → 1~2월 연속가동 → 3~4주 인보험 → 1~2월 추가 연속가동 → 메리츠클럽+
  - (참고: 제공해주신 화면에는 “1~2일 연속가동”이 있었을 수 있음 — 규칙서에는 “1~2월 연속가동”이므로, 요구사항이 “1~2일”이면 별도 항목 추가 검토)
- [ ] **2.2** **1월** 파트너 카드 11개가 `PARTNER_PRIZE_JANUARY_MAPPING.md` 표와 동일한지 확인 (12~1월 연속가동, 3주/4주 인보험 등)
- [ ] **2.3** 각 카드의 `value` 에 들어가는 필드가 올바른지 확인  
  - 예: 2월 “2주 인보험” = `getPartnerTierPrize(viewW2)` 또는 `p.productWeek2Prize`, “2주 상품” 동일 여부 등

### Phase 3: 시상금 합산 로직

- [ ] **3.1** 파트너 1월 총 시상금:  
  `productWeek1PrizeJan` + `productWeek2PrizeJan` + `continuous121Prize` + `week3PrizeJan` + `week4PrizeJan` + `continuous12Prize` + `continuous12ExtraPrize` + `meritzClubPlusPrize` + `regularPrize`  
  가 `totalEstimatedPrize` 와 일치하는지 확인
- [ ] **3.2** 파트너 2월 총 시상금:  
  1주 시상 + 2주 시상 + 3~4주 시상 + 1~2월 연속가동 + 1~2월 추가 연속가동 + 메리츠클럽+ + 정규+파트너  
  와 `totalEstimatedPrize` 일치 여부 확인
- [ ] **3.3** “정규+파트너” 값이 규칙서(예: 월간 실적 × 450% 등)와 맞는지 확인 — 현재는 `regularPrize = currentMonthPerf` 로 되어 있을 수 있음. 450% 적용 여부는 규칙서·요구사항에 따라 수정

### Phase 4: 엑셀·업로드 재검증

- [ ] **4.1** 2월 PRIZE_SUM 한 개로 테스트 업로드 후, 파트너 한 명 선택해 MY MERITZ PRIZE 2월 카드 값이 엑셀과 일치하는지 샘플로 확인
- [ ] **4.2** 1월 파일 업로드 후 1월 선택 시 11개 카드가 모두 채워지는지 확인

### Phase 5: (선택) UI/UX

- [ ] **5.1** “1~2일 연속가동” 등 추가 항목이 요구사항에 있다면, 규칙서에 정의 추가 후 `PartnerPrizeData`·카드·합산 로직 반영
- [ ] **5.2** 2월 시 “전월 대비 시상금 차이” (`prizeDiff`) 가 파트너일 때도 올바르게 계산되는지 확인

---

## 4. 빠른 참조: 현재 파트너 카드 ↔ 필드 매핑

| 카드 라벨 (2월) | 사용 필드/함수 |
|-----------------|----------------|
| 정규+파트너 | `regularPrize` |
| 1주 인보험 | `p?.productWeek1Prize` |
| 1주 상품 | `p?.productWeek1Prize` |
| 2주 인보험 | `getPartnerTierPrize(viewW2)` |
| 2주 상품 | `getPartnerTierPrize(viewW2)` |
| 1~2월 연속가동 | `p?.continuous12Prize` |
| 3~4주 인보험 | `getPartnerTierPrize(p?.week34Sum ?? 0)` |
| 1~2월 추가 연속가동 | `p?.continuous12ExtraPrize` |
| 메리츠클럽+ | `meritzClubPlusPrize` |

| 카드 라벨 (1월) | 사용 필드 |
|-----------------|-----------|
| 정규+파트너 | `regularPrize` |
| 1주 인보험 / 1주 상품 | `p?.productWeek1PrizeJan` |
| 2주 인보험 / 2주 상품 | `p?.productWeek2PrizeJan` |
| 12~1월 연속가동 | `p?.continuous121Prize` |
| 3주 인보험 | `p?.week3PrizeJan` |
| 4주 인보험 | `p?.week4PrizeJan` |
| 1~2월 연속가동 | `p?.continuous12Prize` |
| 1~2월 추가 연속가동 | `p?.continuous12ExtraPrize` |
| 메리츠클럽+ | `meritzClubPlusPrize` |

---

## 5. 다음 단계

1. 위 **Phase 1~4** 체크리스트를 순서대로 진행해, 현재 저장된 코드가 규칙서·엑셀과 일치하는지 검증합니다.
2. 불일치하는 부분(라벨, 필드명, 합산 식, 엑셀 열 등)을 이 MD에 메모해 두고, 수정 시 `page.tsx`, `appwrite-server.ts`, `upload-partner-prize.js` 를 함께 수정합니다.
3. “1~2일 연속가동” 등 추가 항목이 필요하면 `PARTNER_PRIZE_RULES.md` 에 정의를 추가한 뒤, 타입·업로드·UI를 동일하게 반영합니다.

이 문서를 **파트너 시상 로직 복구·수정의 단일 계획 파일**로 사용하면, 날아간 코드 없이도 현재 코드 기반으로 작업을 이어갈 수 있습니다.
