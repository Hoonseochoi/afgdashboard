# 2월 마감 fix 데이터 전환 계획

## 목표
2월이 마감됨에 따라, 2월 실적(월간·1~4주차)을 **daily** MC_LIST가 아닌 **fix** 데이터로 전환한다.

- **fix 파일**: `data/fix/2월마감MC_LIST_OUT_202602.xlsx`
- **적용 범위**: 월간 실적(`2026-02`), 전월 실적 참조용 `2026-01`, 1·2·3·4주차 실적(`weekly.week1~4`)

---

## 수정 대상 요약

| 구분 | 파일 | 수정 내용 |
|------|------|-----------|
| 1 | `docs/PLAN_FEBRUARY_FIX_DATA.md` | 본 계획서 (작성) |
| 2 | `scripts/parseFebruaryClosed.js` | **신규** — 2월 마감 MC_LIST 파싱 → `src/data/february_closed.json` 생성 |
| 3 | `src/app/api/agents/route.ts` | agents 반환 전에 `february_closed.json`으로 2월·주차 실적 병합 |
| 4 | `src/app/api/dashboard/route.ts` | 동일 — agents 반환 전 2월 fix 병합 |
| 5 | `src/app/page.tsx` | (선택) API에서 이미 병합된 데이터를 쓰므로, 2월은 추가 보정 없이 사용 가능. 필요 시 2월 표시 일부만 february_closed 참조 |

---

## 상세 수정 내용

### 1. `scripts/parseFebruaryClosed.js` (신규)
- **입력**: `data/fix/2월마감MC_LIST_OUT_202602.xlsx`
- **출력**: `src/data/february_closed.json`
- **구조**: 1월 마감 스크립트(`parseJanuaryClosed.js`)와 동일 패턴
  - 지사명 "어센틱금융그룹" 포함 행만
  - 컬럼: 사용인코드(5), 당월실적(10)=2월, 전월실적(18)=1월, 1주차(20), 2주차(21), 3주차(22), 4주차(23), 지사명(37)
- **JSON 형식**:
  - `performance["2026-01"]`, `performance["2026-02"]`
  - `weekly.week1`, `week2`, `week3`, `week4`

### 2. `src/app/api/agents/route.ts`
- Appwrite에서 agents 조회 후, `february_closed.json`을 읽어서:
  - 각 agent의 `code`가 fix 데이터에 있으면
  - `performance["2026-02"]`, `performance["2026-01"]` 덮어쓰기
  - `weekly` 전체를 fix의 week1~4로 덮어쓰기
- `computeRanks()`는 병합된 agents 기준으로 계산되므로 2월 랭킹이 fix 데이터 기준으로 반영됨.

### 3. `src/app/api/dashboard/route.ts`
- agents 목록 반환 전에 위와 동일하게 `february_closed.json`으로 2월·주차 병합.
- 대시보드 초기 로드 시 ranks도 병합된 데이터 기준으로 계산됨.

### 4. `src/app/page.tsx`
- 현재 2월 선택 시 `selectedAgent.performance["2026-02"]`, `selectedAgent.weekly` 사용.
- API에서 이미 2월 fix가 병합되어 반환되므로, **별도 import나 febData 분기 없이** 기존 코드만으로 2월 마감 데이터가 표시됨.
- 단, `january_closed`는 1월 선택 시에만 사용 중이므로 그대로 유지.

---

## 데이터 흐름 (변경 후)

```
[2월]
data/fix/2월마감MC_LIST_OUT_202602.xlsx
  → parseFebruaryClosed.js (실행 시)
  → src/data/february_closed.json

API (agents, dashboard):
  Appwrite agents + february_closed.json 병합 (2026-02, 2026-01, weekly)
  → 클라이언트에 반환

페이지:
  agents(이미 2월 fix 반영) → 월간실적, 1~4주차 실적, 랭킹, 시상금 계산 등 모두 2월 fix 기준
```

---

## 실행 순서

1. **플랜 확정** — 본 MD 검토
2. **parseFebruaryClosed.js 추가** — 스크립트 작성
3. **february_closed.json 생성** — `node scripts/parseFebruaryClosed.js` 실행 (프로젝트 루트: `afg-dashboard` 기준 상위에서 `data/fix/2월마감MC_LIST_OUT_202602.xlsx` 경로 사용)
4. **API 수정** — agents, dashboard 라우트에 2월 fix 병합 로직 추가
5. **동작 확인** — 2월 선택 시 월간/주차 실적이 fix 파일 기준으로 표시·랭킹 반영되는지 확인

---

## 참고
- 1월 마감: `data/fix/1월마감MC_LIST_OUT_202601.xlsx` → `january_closed.json` (페이지에서 1월 선택 시만 사용, API는 미병합)
- 2월 마감: API에서 병합하여 **전체 랭킹/대시보드**가 2월 fix 기준으로 통일됨.
