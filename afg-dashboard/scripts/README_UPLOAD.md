# 데이터 업로드 가이드

Fix(고정) 데이터와 Daily(일별) 데이터는 **스크립트가 분리**되어 있습니다.  
불필요한 Firestore 쓰기를 줄이려면 용도에 맞게 나눠서 실행하세요.

---

## 스크립트 구분

| 스크립트 | 용도 | 실행 시점 |
|----------|------|------------|
| **uploadFixData.js** | 설계사 목록, 매니저/관리자 계정 (고정값) | 데이터·계정 구조가 바뀔 때만 |
| **uploadDaily.js** | `config.app.updateDate` (daily 폴더 MC_LIST 파일명 앞 4자리) | 매일 새 MC_LIST 넣었을 때 |
| **uploadDailyPerformance.js** | 당월/전월 인정실적, 1~4주차실적만 Firestore `agents`에 merge | 매일 새 MC_LIST 넣었을 때 (실적 반영) |
| **uploadData.js** | 위 두 가지 모두 실행 (편의용) | Fix + Daily 한 번에 돌리고 싶을 때 |

---

## 1. Fix(고정) 데이터만 올리기

고정값이므로 **한 번 올려두고, 바뀔 때만** 실행하면 됩니다.

```bash
cd afg-dashboard
node scripts/uploadFixData.js
```

- `src/data/data.json` 기준으로 설계사 + 매니저 + 관리자 계정을 Firestore에 저장합니다.
- fix 폴더 등 고정 데이터만 바뀌었을 때 실행하세요.

---

## 2. Daily(일별)만 반영하기

매일 새 MC_LIST가 들어오면 **날짜만** 갱신할 때 사용합니다. 쓰기 1건만 발생합니다.

```bash
cd afg-dashboard
node scripts/uploadDaily.js
```

- `data/daily` 폴더에서 `NNNNMC_LIST...` 형태 파일명의 앞 4자리(예: 0226)를 읽어  
  `config.app.updateDate`에만 저장합니다.

---

## 2-2. Daily 실적(2월 인정실적, 주차실적)만 반영하기

매일 새 MC_LIST 엑셀이 들어오면 **실적 숫자만** Firestore에 반영할 때 사용합니다.

```bash
cd afg-dashboard
node scripts/uploadDailyPerformance.js
```

- `data/daily` 폴더에서 파일명이 가장 최신인 `NNNNMC_LIST*.xlsx`를 자동 선택해 파싱합니다.
- **당월실적**(2월 인정실적), **전월실적**, **1~4주차실적**만 `agents` 문서에 merge 합니다.
- 설계사 추가/삭제나 계정 정보는 건드리지 않습니다. (쓰기 건수 = 설계사 수)

---

## 3. Fix + Daily 한 번에 실행

예전처럼 한 번에 올리고 싶을 때:

```bash
cd afg-dashboard
node scripts/uploadData.js
```

- 내부에서 `uploadFixData` → `uploadDaily` 순서로 실행합니다.

---

## 업데이트 날짜는 언제 바뀌나요?

**자동으로 바뀌지 않습니다.**  
`uploadDaily.js`(또는 `uploadData.js`)를 실행할 때마다 `data/daily` 폴더의 MC_LIST 파일명 앞 4자리를 읽어 Firestore에 저장합니다.

## 매일 업데이트 절차 (권장)

1. **daily 폴더에 새 파일 추가**  
   예: `0227MC_LIST_OUT_202602.xlsx`

2. **데이터 병합** (Python 등)  
   - `data.json`을 새 daily 파일 기준으로 갱신한 경우에만 `uploadFixData.js` 실행  
   - 고정 데이터가 안 바뀌었으면 **uploadFixData는 생략**

3. **날짜만 반영**  
   ```bash
   node scripts/uploadDaily.js
   ```
   - 업데이트 날짜만 `0227`로 갱신됩니다 (쓰기 1건).

4. **실적 반영 (2월 인정실적, 4주차실적 등)**  
   ```bash
   node scripts/uploadDailyPerformance.js
   ```
   - `data/daily` 폴더의 **가장 최신** `NNNNMC_LIST*.xlsx`를 파싱해, 당월/전월 실적과 1~4주차 실적만 Firestore `agents` 문서에 merge 합니다.
   - 설계사 추가/삭제는 하지 않고, 실적 숫자만 갱신합니다.
