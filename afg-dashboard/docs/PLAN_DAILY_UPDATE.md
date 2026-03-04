## Supabase 데일리 업데이트 플로우 (MC_LIST)

이 문서는 `supabase-upload-daily.js` 기준으로 **일일 MC_LIST 엑셀을 업로드했을 때**  
어떤 순서로 데이터가 갱신되는지, 특히 **3월 MC_LIST가 새로 들어오는 상황**을 가정하여 설명합니다.

---

## 1. 사용 스크립트 및 전제

- **스크립트**: `node scripts/supabase-upload-daily.js`
- **필요 환경 변수 (`.env.local`)**
  - `SUPABASE_URL` 또는 `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- **입력 파일 위치**
  - `data/daily` 폴더
  - 파일명 패턴: `NNNNMC_LIST*.xlsx`
    - 예: `0227MC_LIST_OUT_202602.xlsx`

스크립트는 항상 `data/daily` 폴더에서 **가장 최신(사전순으로 마지막)** `NNNNMC_LIST*.xlsx` 파일을 찾아 사용합니다.

---

## 2. 파일 선택 및 기준 월 계산

### 2.1 최신/전일 파일 찾기

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

### 2.2 월 키 계산 (`currentMonthKey`, `prevMonthKey`)

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

## 3. 엑셀 파싱 로직 (어센틱 설계사만 필터)

### 3.1 컬럼 위치 탐색

`parseDailyXlsx(filePath)` 에서 XLSX를 읽고, 헤더를 기준으로 주요 컬럼 인덱스를 찾습니다.

- 코드: `"사용인코드"`, `"코드"` 등의 텍스트가 포함된 컬럼
- 이름: `"설계사명"`, `"이름"`
- 당월 실적: `"인정실적"`, `"당월실적"`
- 전월 실적: `"전월실적"`
- 주차 실적: `"1주차"`, `"2주차"`, `"3주차"`, `"4주차"`
- 지사명: `"지사명"`

헤더에서 찾지 못할 경우를 대비해 기본 인덱스도 설정되어 있습니다.

### 3.2 행 필터 조건

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

## 4. Supabase에 반영되는 내용

### 4.1 config 테이블 (`update_date`)

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

### 4.2 agents 테이블 (performance / weekly)

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

### 4.3 일별 증감(`YYYY-MM-diff`) 계산 방식

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

### 4.4 신규 설계사 vs 기존 설계사

#### 4.4.1 기존 설계사(`agents`에 이미 존재)

```js
await supabase
  .from("agents")
  .update({ performance, weekly })
  .eq("code", row.code);
```

- `performance` / `weekly` 만 갱신합니다.
- 이름/지사/매니저 정보 등은 바꾸지 않습니다.

#### 4.4.2 신규 설계사(처음 등장)

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

## 5. agent-order.json (MC_LIST 순서 반영)

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

## 6. "내일 3월 MC_LIST" 시나리오 정리

가정:

- 오늘까지는 `0227MC_LIST_OUT_202602.xlsx` 기준으로 데이터가 들어가 있음
- 내일 새 파일 `0228MC_LIST_OUT_202602.xlsx` 또는  
  **3월 첫 파일** `0301MC_LIST_OUT_202603.xlsx` 가 `data/daily` 폴더에 추가됨
- 이후 `node scripts/supabase-upload-daily.js` 실행

### 6.1 2월 마지막 날 (예: 0228) MC_LIST가 들어오는 경우

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

### 6.2 3월 첫 MC_LIST (예: 0301) 가 들어오는 경우

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

## 7. 점검 포인트

내일 3월 MC_LIST를 올린 뒤 아래를 빠르게 확인할 수 있습니다.

1. **config 테이블**
   - `SELECT * FROM config WHERE key = 'app';`
   - `update_date` 가 `"0301"` 처럼 새 날짜로 바뀌었는지 확인
2. **agents 테이블**
   - 특정 설계사 코드로 조회:
     - `performance->>'2026-03'` 값이 예상 3월 실적과 일치하는지
     - `performance->>'2026-03-diff'` 가 당일 증감과 일치하는지
     - `weekly->>'week1'` 등 주차 값이 엑셀과 맞는지
3. **대시보드 화면**
   - 상단 `updateDate` 표시가 `"0301"` 인지
   - 3월 실적/순위/파트너 시상 카드가 최신 MC_LIST 기준으로 보이는지

이 흐름대로라면, **새로운 3월 MC_LIST가 업로드되고 스크립트를 실행했을 때**  
Supabase와 대시보드는 자동으로 **3월 기준 데이터로 전환**되며,  
일별 증감 및 주차 실적 역시 정상적으로 갱신됩니다.

