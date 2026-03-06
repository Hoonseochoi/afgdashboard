# 백데이터(마감 데이터) 파싱 규칙

마감된 월의 실적 데이터를 `MC_LIST_OUT_YYYYMM.xlsx`에서 추출해 JSON으로 변환하는 표준 규칙.

---

## 1. 소스 파일 위치

```
AFG_DASHBOARD/data/fix/
  ├── 1월마감MC_LIST_OUT_202601.xlsx
  ├── 2월마감MC_LIST_OUT_202602.xlsx
  ├── 3월마감MC_LIST_OUT_202603.xlsx   ← 마감 후 추가
  └── ...
```

> **규칙**: 파일명은 반드시 `N월마감MC_LIST_OUT_YYYYMM.xlsx` 패턴 유지.

---

## 2. 엑셀 컬럼 매핑 (MC_LIST_OUT 표준)

| 엑셀 열 | 0-based 인덱스 | 내용 | JSON 필드 |
|---------|--------------|------|-----------|
| **F** | 5 | 설계사코드 | `code` (키) |
| **K** | 10 | 해당월 실적 | `performance["YYYY-MM"]` |
| **S** | 18 | 이전월 실적 | `performance["YYYY-M1"]` |
| **T** | 19 | 전전월 실적 | `performance["YYYY-M2"]` |
| **U** | 20 | 1주차 실적 | `weekly.week1` |
| **V** | 21 | 2주차 실적 | `weekly.week2` |
| **W** | 22 | 3주차 실적 | `weekly.week3` |
| **X** | 23 | 4주차 실적 | `weekly.week4` |
| **AL** | 37 | 대리점지사명 | 필터링 기준 |

> 헤더 행이 최상단이 아닐 수 있으므로, 스크립트에서 자동 감지.

---

## 3. 필터링 기준

- `AL열(대리점지사명)`에 `"어센틱금융그룹"` 포함 행만 추출
- 설계사코드가 비어있거나 5자리 미만인 행 제외

---

## 4. 출력 JSON 구조

```json
{
  "7XXXXXXXXX": {
    "code": "7XXXXXXXXX",
    "performance": {
      "YYYY-MM": 500000,   // 해당월 (K열)
      "YYYY-M1": 400000,   // 이전월 (S열)
      "YYYY-M2": 350000    // 전전월 (T열)
    },
    "weekly": {
      "week1": 100000,
      "week2": 200000,
      "week3": 150000,
      "week4": 50000
    }
  }
}
```

---

## 5. 파싱 스크립트 목록

| 스크립트 | 입력 | 출력 | 설명 |
|---------|------|------|------|
| `scripts/parseBackdata.js` | `data/fix/N월마감MC_LIST_OUT_YYYYMM.xlsx` | `src/data/YYYYMM_closed.json` | **범용** 스크립트 (월 인수로 실행) |
| `scripts/parseJanuaryClosed.js` | 1월마감 | `src/data/january_closed.json` | 1월 전용 |
| `scripts/parseFebruaryClosed.js` | 2월마감 | `src/data/february_closed.json` | 2월 전용 |

---

## 6. 실행 방법

```bash
# afg-dashboard 디렉토리에서 실행

# 1월 마감 데이터 재파싱
node scripts/parseJanuaryClosed.js

# 2월 마감 데이터 재파싱
node scripts/parseFebruaryClosed.js

# 범용 (향후 추가 월)
node scripts/parseBackdata.js --month 3 --year 2026
```

> 마감 데이터는 변경되지 않으므로 **한 번만 실행** 후 커밋.

---

## 7. API 병합 방식

| 월 | 병합 위치 | 병합 대상 필드 |
|----|----------|--------------|
| 1월 | `api/agents/route.ts` (`mergeJanuaryFix`) | `_janWeekly` (별도 첨부) |
| 2월 | `api/agents/route.ts` (`mergeFebruaryFix`) | `performance` 덮어쓰기 |
| 3월~ | 동일 패턴으로 함수 추가 | 해당월 performance + weekly |

---

## 8. 향후 월 추가 절차

1. `data/fix/` 에 `N월마감MC_LIST_OUT_YYYYMM.xlsx` 파일 추가
2. `scripts/parseXxxClosed.js` 복사 후 월/연도/키 수정
3. `node scripts/parseXxxClosed.js` 실행 → JSON 생성
4. `api/agents/route.ts` 에 `mergeXxxFix()` 함수 추가
5. 모든 GET 경로에 적용
6. 커밋

---

*최종 업데이트: 2026-03-06*
