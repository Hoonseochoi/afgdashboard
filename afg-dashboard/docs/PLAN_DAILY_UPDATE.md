## Supabase 데일리 업데이트 플로우 (MC_LIST + 1·2주차 상품)

이 문서는 **데일리 업데이트** 시  
1) **MC_LIST** 엑셀 기준 실적·주차·config·agent-order 반영,  
2) **PRIZE_SUM** 엑셀 기준 **1주차 상품**(AC열)·**2주차 상품**(AH열) 실적 반영  
이 동시에 이루어지도록 정리한 것입니다.

---

## 1. 사용 스크립트 및 전제

### 1.1 한 번에 실행 (권장)

- **실행**: `python scripts/run-daily-update.py`  
  - 1단계: `node scripts/supabase-upload-daily.js` (MC_LIST)
  - 2단계: `node scripts/supabase-upload-march-product-week1.js` (1·2주차 상품, PRIZE_SUM)
- **위치**: `afg-dashboard` 폴더에서 실행. `.env.local` 필요.

### 1.2 개별 스크립트

| 스크립트 | 용도 | 입력 파일 패턴 |
|----------|------|----------------|
| `node scripts/supabase-upload-daily.js` | 당월/전월 실적, 1~4주차, config, agent-order | `data/daily` 최신 `NNNNMC_LIST*.xlsx` |
| `node scripts/supabase-upload-march-product-week1.js` [경로] | 1주차 상품(AC)·2주차 상품(AH) → `product_week1`, `product_week2`, `weekly.productWeek1`, `weekly.productWeek2` | `data/daily` 최신 `NNNNPRIZE_SUM*.xlsx` 또는 인자로 경로 지정 |

- **필요 환경 변수 (`.env.local`)**
  - `SUPABASE_URL` 또는 `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

### 1.3 입력 파일 위치

- **MC_LIST**: `data/daily` 폴더, 파일명 패턴 `NNNNMC_LIST*.xlsx`  
  예: `0305MC_LIST_OUT_202603.xlsx`
- **1주차 상품(PRIZE_SUM)**: 같은 폴더, 파일명 패턴 `NNNNPRIZE_SUM*.xlsx`  
  예: `0305PRIZE_SUM_OUT_202603.xlsx`  
  - 날짜(앞 4자리)는 MC_LIST와 맞추면 데일리 업데이트 시 같은 기준일로 동시 반영됩니다.
  - PRIZE_SUM 파일이 없으면 1주차 상품 스크립트는 “파일 없음, 업데이트 생략” 후 정상 종료(exit 0)합니다.

스크립트는 각각 `data/daily`에서 **가장 최신(사전순 마지막)** 해당 패턴 파일을 사용합니다.

---

## 2. 1·2주차 상품(PRIZE_SUM) 반영

- **파일 패턴**: `data/daily` 아래 `NNNNPRIZE_SUM*.xlsx` (예: `0305PRIZE_SUM_OUT_202603.xlsx`).
- **선택**: 인자 없이 실행 시 위 패턴 중 **가장 최신 파일** 사용. `node scripts/supabase-upload-march-product-week1.js "경로"` 로 파일 지정 가능.
- **엑셀 매핑** (고정 인덱스):
  - **K열(인덱스 10)**: 설계사코드
  - **AC열(인덱스 28)**: 상품 1주차 실적 → `product_week1`, `weekly.productWeek1`
  - **AH열(인덱스 33)**: 상품 2주차 실적 → `product_week2`, `weekly.productWeek2`
- **Supabase 반영**:
  - `agents.product_week1` (컬럼), `agents.weekly.productWeek1` (JSON) 에 AC열 값 반영.
  - `agents.product_week2` (컬럼), `agents.weekly.productWeek2` (JSON) 에 AH열 값 반영.
  - 기존 `weekly` 의 나머지 키(week1~4 등)는 유지한 채 merge.
- **파일 없음**: 해당 패턴 파일이 없으면 스크립트는 “1주차 상품 업데이트 생략” 후 exit 0으로 종료합니다.

---

## 3. 파일 선택 및 기준 월 계산 (MC_LIST)

### 3.1 최신/전일 파일 찾기

```js
const dailyDir = path.join(__dirname, '..', '..', 'data', 'daily');
// ...
const files = fs.readdirSync(dailyDir)
  .filter((f) => /^\d{4}MC_LIST/i.test(f) && /\.xlsx?$/i.test(f))
  .sort();
const latest = files[files.length - 1]; // 가장 마지막(가장 최신) 파일
const prevPrefix = String(latestNum - 1).padStart(4, '0');
const prev = files.find((f) => f.startsWith(prevPrefix)) ?? null;
```

- `0227MC_LIST...`, `0228MC_LIST...`, `0301MC_LIST...` 처럼 파일이 쌓여 있으면
  - 정렬 후 **가장 마지막 파일**을 `latest` 로 사용합니다.
  - `latest` 의 앞 4자리(예: `0301`)에서 **하루 전 날짜**(`0300`)를 계산해,  
    그 접두어로 시작하는 파일이 있으면 `prev`(전일 파일)로 사용합니다.  
    (실제 운영에서는 `0228 → 0227` 처럼 존재하는 조합만 의미 있게 사용됨)

### 3.2 월 키 계산 (`currentMonthKey`, `prevMonthKey`)

```js
const { current: currentMonthKey, prev: prevMonthKey } = parseMonthFromFilename(fileName);
```

`parseMonthFromFilename` 는 파일명에서 `YYYYMM` 부분을 뽑아 아래처럼 변환합니다.

- 예: `0227MC_LIST_OUT_202602.xlsx`
  - `202602` →  
    - `currentMonthKey = "2026-02"`
    - `prevMonthKey = "2026-01"`
- 예: **내일 새로 들어올 3월 MC_LIST**: `0301MC_LIST_OUT_202603.xlsx` (가정)
  - `202603` →  
    - `currentMonthKey = "2026-03"`
    - `prevMonthKey = "2026-02"`

추가로, 일별 차이를 위한 키:

```js
const dailyDiffKey = `${currentMonthKey}-diff`; // 예: "2026-03-diff"
```

---

## 4. 엑셀 파싱 로직 (MC_LIST, 어센틱 설계사만 필터)

### 4.1 컬럼 위치 (고정 인덱스)

`parseDailyXlsx(filePath)` 에서 **고정 인덱스**로만 읽습니다. 헤더 검색 없음.  
엑셀 열 정의는 **`docs/DAILY_EXCEL_MAPPING.md`** 를 기준으로 합니다.

| 용도 | 엑셀 열 | 인덱스(0-based) |
|------|--------|----------------|
| 코드(사번) | F | 5 |
| 설계사명 | G | 6 |
| 인정실적(당월) | K | 10 |
| 전월실적 | S | 18 |
| 1~4주차 | U~X | 20~23 |
| 지사명 | AL | 37 |

- 헤더 행: **1** 고정 (데이터는 2행부터).
- 열 배치가 바뀌면 `supabase-upload-daily.js` 의 `IDX_*` 상수와 이 문서를 함께 수정할 것.

### 4.2 행 필터 조건

각 행에 대해 다음 조건을 만족하는 경우만 유효 데이터로 봅니다.

- `branch`(지사명) 문자열에 **"어센틱"** 이 포함되어야 함
- `code`(설계사 코드)가 비어있지 않고 길이가 5 이상

이후 숫자 컬럼들은 문자열/쉼표 등을 정리해 숫자로 변환합니다.

```js
result.push({
  code,
  name,
  branch,
  currentMonth, // 당월 인정실적
  prevMonth,    // 전월 실적
  week1,
  week2,
  week3,
  week4,
});
```

---

## 5. Supabase에 반영되는 내용 (MC_LIST)

### 5.1 config 테이블 (`update_date`)

스크립트 시작 시, 선택된 최신 파일명을 기준으로 `updateDate` 값을 정합니다.

```js
const fileName = path.basename(filePath);
const updateDate = fileName.substring(0, 4); // 예: "0227", "0301"

await supabase.from("config").upsert(
  { key: "app", update_date: updateDate },
  { onConflict: "key" }
);
```

- **config.app.update_date** 에는 **파일명 앞 4자리**(예: `0227`, `0301`)가 저장됩니다.
- 대시보드 API (`/api/dashboard`) 에서는 이 값을 그대로 `updateDate` 로 반환합니다.

따라서 **내일 3월 MC_LIST(예: `0301MC_LIST_OUT_202603.xlsx`)가 들어와 스크립트를 돌리면**:

- `config.app.update_date = "0301"` 로 갱신되고
- `/api/dashboard` 응답의 `updateDate` 도 `"0301"` 으로 보이게 됩니다.

### 5.2 agents 테이블 (performance / weekly)

각 설계사 코드별로 Supabase `agents`를 조회한 뒤, 다음과 같이 갱신합니다.

```js
const agent = await getAgentByCode(row.code);
const performance = agent?.performance ? { ...agent.performance } : {};

performance[currentMonthKey] = row.currentMonth; // 예: 2026-03
performance[prevMonthKey] = row.prevMonth;       // 예: 2026-02
performance[dailyDiffKey] = dailyDiff;           // 예: 2026-03-diff

const weekly = {
  week1: row.week1,
  week2: row.week2,
  week3: row.week3,
  week4: row.week4,
};
```

- **기존 performance 객체를 복사**한 뒤, 해당 월 키만 덮어씁니다:
  - `performance["2026-03"]` = 이번 MC_LIST의 3월 당월 실적
  - `performance["2026-02"]` = 전월(2월) 실적
  - `performance["2026-03-diff"]` = **당일 기준 증감** (아래 4.3 참고)
- `weekly` 는 단순히 `week1~4` 를 이번 MC_LIST 값으로 세팅합니다.

### 5.3 일별 증감(`YYYY-MM-diff`) 계산 방식

전일 파일(`prev`)이 있는 경우:

```js
const prevRow = prevMap.get(row.code);
const prevCurrent = prevRow ? prevRow.currentMonth : row.currentMonth;
const dailyDiff = row.currentMonth - prevCurrent;
performance[dailyDiffKey] = dailyDiff;
```

- `prevRow.currentMonth`: 전일 MC_LIST에서 같은 설계사의 **당월 인정실적**
- `row.currentMonth`: 오늘 MC_LIST의 당월 인정실적
- `dailyDiff = 오늘 당월실적 - 전일 당월실적`
- 결과는 `performance["2026-03-diff"]` 같은 키에 저장됩니다.

전일 파일이 없을 경우:

- `prevCurrent` 를 **오늘 값(row.currentMonth)** 으로 간주 → `dailyDiff = 0`
- 즉, 첫 날(또는 이전 파일이 없는 상황)에는 `*-diff` 값이 0이 됩니다.

### 5.4 신규 설계사 vs 기존 설계사

#### 5.4.1 기존 설계사(`agents`에 이미 존재)

```js
await supabase
  .from("agents")
  .update({ performance, weekly })
  .eq("code", row.code);
```

- `performance` / `weekly` 만 갱신합니다.
- 이름/지사/매니저 정보 등은 바꾸지 않습니다.

#### 5.4.2 신규 설계사(처음 등장)

```js
await supabase.from("agents").insert({
  code: row.code,
  name: row.name,
  branch: row.branch || "",
  password: row.code,
  role: "agent",
  is_first_login: true,
  performance,
  weekly,
  manager_code: null,
  manager_name: null,
  target_manager_code: null,
});
```

- 새 설계사 레코드가 `agents`에 생성됩니다.
- 기본 비밀번호는 **코드와 동일**하게 들어가며, `is_first_login` 은 `true` 로 설정됩니다.

---

## 6. agent-order.json (MC_LIST 순서 반영)

모든 행을 순회하면서 설계사 코드를 `orderedCodes` 배열에 쌓습니다.

```js
const orderedCodes = [];
// ...
orderedCodes.push(row.code);
// ...
fs.writeFileSync(
  orderPath,
  JSON.stringify({ updateDate, codes: orderedCodes }, null, 2),
  "utf8"
);
```

- 저장 위치: `src/data/agent-order.json`
- 내용:
  - `updateDate`: MC_LIST 파일명 앞 4자리 (예: `"0301"`)
  - `codes`: 해당 MC_LIST에서 나온 **설계사 코드 순서 전체**

대시보드 API에서는 이 파일을 읽어 **정렬 기준**으로 사용합니다.

```ts
// /api/dashboard/route.ts
const orderPath = join(process.cwd(), "src", "data", "agent-order.json");
const { codes } = JSON.parse(raw) as { codes?: string[] };
// ...
return [...agents].sort((a, b) => {
  const ia = orderMap.get(a.code ?? "") ?? 999999;
  const ib = orderMap.get(b.code ?? "") ?? 999999;
  return ia - ib;
});
```

즉, **내일 3월 MC_LIST를 돌리면**:

- `agent-order.json.codes` 가 새 MC_LIST 순서로 갱신되고
- 대시보드에서 설계사 리스트는 **항상 최신 MC_LIST 순서**로 노출됩니다.

---

## 7. "내일 3월 MC_LIST" 시나리오 정리

가정:

- 오늘까지는 `0227MC_LIST_OUT_202602.xlsx` 기준으로 데이터가 들어가 있음
- 내일 새 파일 `0228MC_LIST_OUT_202602.xlsx` 또는  
  **3월 첫 파일** `0301MC_LIST_OUT_202603.xlsx` 가 `data/daily` 폴더에 추가됨
- 이후 `node scripts/supabase-upload-daily.js` 실행

### 7.1 2월 마지막 날 (예: 0228) MC_LIST가 들어오는 경우

1. `data/daily`에서 가장 마지막 파일을 `latest` 로 선택  
   - 예: `0228MC_LIST_OUT_202602.xlsx`
2. `updateDate = "0228"` 로 계산되어 `config.app.update_date` 에 저장
3. `currentMonthKey = "2026-02"`, `prevMonthKey = "2026-01"`
4. 전일 파일(`0227...`)이 있으면:
   - 각 설계사별로 `2026-02-diff = (오늘 2월 실적) - (어제 2월 실적)` 으로 계산
5. `agents.performance`:
   - `"2026-02"` / `"2026-01"` / `"2026-02-diff"` 가 갱신
6. `agents.weekly`:
   - 2월 기준 1~4주차 실적이 갱신
7. `agent-order.json`:
   - `updateDate: "0228"`
   - `codes`: 0228 MC_LIST 기준 설계사 순서로 갱신

### 7.2 3월 첫 MC_LIST (예: 0301) 가 들어오는 경우

1. `latest` = `0301MC_LIST_OUT_202603.xlsx`
2. `updateDate = "0301"` → `config.app.update_date = "0301"`
3. `currentMonthKey = "2026-03"`, `prevMonthKey = "2026-02"`
4. 전일 파일 존재 여부에 따라:
   - 0228 파일이 있다면:
     - `2026-03-diff = (0301 기준 3월 실적) - (0228 기준 3월 실적)`
   - 없다면:
     - `2026-03-diff = 0` 으로 저장
5. 각 설계사별로:
   - `performance["2026-03"]` = 3월 당월 실적
   - `performance["2026-02"]` = 2월 실적 (엑셀 전월열에서 가져옴)
   - `performance["2026-03-diff"]` = 위에서 계산한 일별 증감
   - `weekly.week1~4` = 3월 기준 주차 실적
6. 기존에 없던 설계사는 `agents`에 새로 생성
7. `agent-order.json`:
   - `updateDate: "0301"`
   - `codes`: 3월 MC_LIST 순서로 갱신

결과적으로 **대시보드 입장에서는**:

- `/api/dashboard` 의 `updateDate` 가 `"0301"` 으로 보이고
- 3월 탭에서 사용하는 `2026-03` 실적과 `2026-03-diff`(일별 증감),  
  주차 실적(week1~4)이 모두 **새 MC_LIST 기준으로 반영**됩니다.

---

## 8. 발생 이슈 및 조치 (참고)

데일리 배치·대시보드 운영 중 발생한 이슈와 조치를 정리했습니다.  
**내일부터는 아래 점검 포인트로 동일 이슈가 반복되지 않도록 확인할 것.**

### 8.1 Supabase API 1000행 제한으로 상위 실적자가 목록에 안 보임

- **증상**: 김정리, 이현승 등 매출 상위자·Supabase agents 1페이지에 있는 사람이 대시보드 설계사 선택 목록에 아예 안 나옴.
- **원인**: PostgREST 기본이 **요청당 최대 1000행**. `supabaseAgentsListAll` 이 1000명만 가져와서, id 순 앞쪽(1페이지) 설계사만 응답에 포함됨.
- **조치**: `src/lib/supabase-server.ts` 의 `supabaseAgentsListAll` 에서 **1000행씩 페이지네이션**으로 전부 수집 (0–999, 1000–1999, … 병합).
- **점검**: 배치/배포 후 대시보드에서 **매출 1위·2위**가 설계사 선택 드롭다운 상위에 보이는지 확인.

### 8.2 엑셀 인정실적(K열)이 DB에 반영 안 됨

- **증상**: MC_LIST 엑셀 K열이 인정실적인데 대시보드/Supabase에 0 또는 예전 값만 보임.
- **원인**: 컬럼을 헤더 텍스트로만 찾다 보니, 엑셀 형식이 다르면 잘못된 열을 읽음.
- **조치**: **고정 인덱스** 사용. `DAILY_EXCEL_MAPPING.md` 기준으로 F=5, G=6, **K=10**(인정실적), S=18, AL=37 등 고정. 헤더 검색 제거.
- **점검**: 배치 로그에 `[파싱] 고정 인덱스 | 인정실적: 10` 확인. 특정 코드(예: 725070184)로 디버그 로그에 엑셀 당월 실적 값이 찍히는지 확인.

### 8.3 방금 등록한 설계사가 리스트에서 사라짐

- **증상**: Supabase에만 있고 MC_LIST 엑셀에는 없는 “방금 등록한” 설계사가 대시보드 목록에서 안 보임.
- **원인**: `agent-order.json` 을 **엑셀에 있는 코드만**으로 덮어써서, DB에만 있는 코드가 순서 목록에서 빠짐.
- **조치**: `agent-order.json` 저장 시 **엑셀 순서(중복 제거) + DB에만 있는 코드**를 뒤에 붙여서 저장. 리스트 정렬은 API에서 **3월 매출 순**으로 하므로 이 파일은 “누가 나올지”만 보장.
- **점검**: 신규 등록 후 배치 돌린 뒤, 해당 설계사가 목록 맨 뒤라도 보이는지 확인.

### 8.4 리스트 순서가 3월 매출 순이 아님

- **증상**: 설계사 선택 목록이 MC_LIST 순서나 예전 순서로만 보임.
- **조치**: 대시보드/agents API에서 **`sortByMarchPerformance`** 사용 (performance['2026-03'] 내림차순). `agent-order.json` 은 정렬에 사용하지 않음.
- **점검**: 설계사 드롭다운에서 3월 실적 높은 순으로 상위 80명이 나오는지 확인.

---

## 9. 데일리 배치 후 점검 포인트 (매일 확인)

**배치 실행 후** 아래 순서로 확인하면 이슈 재발을 막을 수 있습니다.

1. **스크립트 로그**
   - `[파싱] 고정 인덱스 | 코드: 5 인정실적: 10 전월: 18 지사: 37` → 엑셀 열 매핑 정상.
   - `→ update 대상: N 명, insert 대상: M 명` → 예상 인원 수 대략 일치하는지.
   - `[Supabase Daily] 완료. updateDate: ... 실적 반영: N 건` → 에러 없이 완료되었는지.

2. **Supabase config**
   - `config` 테이블 `key = 'app'` 의 `update_date` 가 **오늘 반영한 파일 날짜**(예: 0305)인지.

3. **Supabase agents (샘플 1~2명)**
   - 매출 상위자 한 명(예: 1위) 코드로 조회:
     - `performance->>'2026-03'` 이 엑셀 K열(인정실적)과 일치하는지.
   - 필요 시 `performance->>'2026-03-diff'`, `weekly` 주차 값도 엑셀과 비교.

4. **대시보드**
   - 상단 업데이트 날짜가 방금 반영한 날짜로 보이는지.
   - **설계사 선택 드롭다운**에서 **매출 1위·2위**(예: 김정리 등)가 **상위에** 보이는지 (Supabase 1000행 이슈 재발 여부).
   - 3월 탭에서 실적/순위/카드가 최신 MC_LIST와 맞는지.
   - 3월 탭 **1주차 상품** 카드가 PRIZE_SUM 기준으로 보이는지 (해당일 PRIZE_SUM 파일을 넣었다면).

5. **신규 등록자**
   - 당일 Supabase에만 추가한 설계사가 있다면, 목록 맨 뒤라도 노출되는지 확인.

이 흐름대로라면, **새 MC_LIST 업로드 후 스크립트 실행** 시  
Supabase와 대시보드가 최신 데이터로 전환되고,  
위 점검으로 **동일 이슈 없이** 운영할 수 있습니다.

