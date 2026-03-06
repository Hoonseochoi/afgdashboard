# 전체 설계사 캡처 플랜 (JS · 로컬 데이터 · 로그인 없음)

## 방향
- **자동화(로그인 + 클릭) 대신**: 로컬에 넣어둔 JSON만 쓰고, **같은 UI를 그대로 써서** 한 번에 많이 찍어낸다.
- **로그인 없음**: 캡처 단계에서는 인증 없이, 이미 준비된 데이터만 사용.
- **속도**: 페이지 한 번 띄운 뒤, 메모리에서 `selectedAgent`만 바꿔가며 캡처 → UI 탐색/네트워크 없이 빠르게 처리.

---

## 1. 데이터 준비 (1회)

- **목적**: 전체 설계사 + 대시보드에 필요한 보조 데이터를 로컬 JSON으로 확보.
- **방법 (택 1)**  
  - **A)** 한 번만 로그인해서 `/api/dashboard` 결과를 저장하는 **작은 Node 스크립트** 실행  
    → `data/capture/dashboard.json` (또는 `agents.json` + `updateDate`, `ranks` 등 필요한 필드만).
  - **B)** 이미 있는 내보내기/백업용 JSON이 있으면 그걸 `data/capture/` 아래에 두고 사용.
- **형식**:  
  - 최소한 `agents: [{ code, name, branch, managerName, performance, weekly, ... }]`  
  - 필요하면 `updateDate`, `ranks`, `partnerAgents` 등 기존 대시보드 API와 동일 구조.
- **캡처 시**: 이 JSON만 읽어서 사용 → **캡처 루프에서는 로그인/API 호출 없음.**

---

## 2. 캡처 전용 진입점 (UI 그대로 사용)

- **역할**: 지금 쓰는 대시보드 “카드” UI를 그대로 쓰되, **데이터 소스만** 로컬 JSON으로 바꾼다.
- **구현 옵션**  
  - **옵션 A) 전용 라우트**  
    - 예: `/capture` (또는 `/capture-all`).  
    - 이 라우트는:
      - 쿼리/초기 props로 “캡처 모드” 여부와 **로컬 데이터 경로**만 받거나,
      - 빌드 시/서빙 시 `public/data/capture/dashboard.json` 같은 고정 경로에서 `fetch`로 읽음.
    - 로그인 체크 없음 (또는 dev 전용으로만 열어둠).
  - **옵션 B) 기존 `/` + 쿼리**  
    - 예: `/?capture=1&data=file`  
    - `capture=1` 이면 “캡처 모드”: 인증 건너뛰고, `public/.../dashboard.json` 등에서 데이터 로드.
- **공통**  
  - `agents` 배열을 state에 올려두고,  
  - “현재 찍을 설계사” 한 명만 `selectedAgent`로 두고,  
  - **기존과 동일한** `[data-capture-area]` 블록만 렌더링 (헤더/검색 등은 캡처 시 필요하면 숨기거나 단순화).
  - 캡처 시에는 **지금 “내보내기”에서 쓰는 것과 같은 로직** 사용:  
    `html-to-image` 등으로 `[data-capture-area]`만 PNG로 만들기.

---

## 3. 캡처 실행 (Node 스크립트)

- **실행부**: Node에서 **Puppeteer(또는 Playwright)** 로 로컬 서버(예: `http://localhost:3001`)에 접속.
- **흐름**  
  1. `data/capture/dashboard.json` (또는 동일 형식) 읽기.  
  2. 브라우저 한 번 띄우고, 캡처 전용 URL 로 이동  
     (예: `http://localhost:3001/capture` 또는 `/?capture=1`).  
  3. `page.evaluate()` 로 **전체 `agents` + 보조 데이터**를 프론트에 주입  
     (예: `window.__CAPTURE_PAYLOAD__ = { agents, updateDate, ranks }` 후 앱이 이걸 읽어서 state 초기화).  
  4. **루프**: `i = 0 .. agents.length - 1`  
     - `page.evaluate((index) => { setSelectedAgent(agents[index]); return index; }, i)`  
       → 앱이 해당 설계사만 그리도록 함.  
     - 잠깐 대기 (리플로우/애니메이션 안정화).  
     - 캡처:  
       - **방법 1)** 페이지에서 `[data-capture-area]`에 대해 기존 `toPng` 호출 후 **base64** 반환 → Node가 buffer로 받아서 파일 저장.  
       - **방법 2)** Puppeteer의 `page.locator('[data-capture-area]').screenshot()` 로 해당 영역만 PNG로 받아서 Node가 저장.  
  5. **저장 경로**:  
     `[출력폴더] / [지사명] / [매니저명] / [설계사명].png`  
     (지사/매니저/설계사명은 파일명 불가 문자 치환, 빈 값은 `"미지정"` 등).
- **로그인 없음**: 캡처용 URL이 로컬 데이터만 쓰고 인증을 타지 않으므로, 이 스크립트는 **로그인 API를 호출하지 않음.**

---

## 4. 폴더/파일 구조 요약

| 단계 | 내용 |
|------|------|
| **데이터** | `data/capture/dashboard.json` (또는 `agents.json` + 필요한 메타) — 1회 준비. |
| **캡처 진입** | `/capture` 또는 `/?capture=1` — 로컬 JSON 로드, UI는 기존 대시보드 카드 그대로. |
| **실행** | `node scripts/bulk-capture.js` — Puppeteer가 localhost 열고, 데이터 주입 후 루프로 캡처. |
| **출력** | `[OUTPUT_DIR]/[지사명]/[매니저명]/[설계사명].png` |

---

## 5. 장점

- 캡처 시 **로그인·검색·클릭 없음** → 네트워크/UI 의존 최소.  
- **같은 UI**로 찍으므로 “내보내기”와 동일한 영역·품질 유지.  
- 데이터만 미리 준비해 두면, 캡처는 **로컬 JSON + 로컬 서버**만 있어도 동작.

---

## 6. 구현 시 체크리스트 (구현 완료)

- [x] 데이터 1회 수집 스크립트: `scripts/capture-dump-dashboard.js` (로그인 → `/api/dashboard` → `data/capture/dashboard.json` 저장).  
- [x] `/?capture=1` 분기: 인증 생략, `/api/capture-data` 로 로컬 JSON 로드.  
- [x] 해당 화면에서 `window.__CAPTURE_SELECT(index)` / `window.__CAPTURE_GET_PNG()` 로 `selectedAgent` 전환 및 PNG base64 반환.  
- [x] `scripts/bulk-capture.js`: Puppeteer로 `/?capture=1` 열고, 루프에서 `__CAPTURE_SELECT(i)` → `__CAPTURE_GET_PNG()` → `지사/매니저/설계사.png` 저장.  
- [x] 경로 sanitize, 에러 시 스킵 후 로그.

---

## 7. 사용 방법 (구현됨)

1. **데이터 1회 덤프** (dev 서버 실행 중이어야 함)  
   ```bash
   npm run dev
   # 다른 터미널에서
   npm run capture:dump
   # 또는: node scripts/capture-dump-dashboard.js [사번] [비밀번호]
   ```
   → `data/capture/dashboard.json` 생성.

2. **일괄 캡처** (dev 서버 실행 중)  
   ```bash
   npm run capture:bulk
   # 또는: node scripts/bulk-capture.js [출력폴더]
   ```
   → 기본 출력: `data/capture/output/[지사명]/[매니저명]/[설계사명].png`

3. **캡처 데이터 API** (로그인 없음)  
   - `GET /api/capture-data` → `data/capture/dashboard.json` 내용 반환.

4. **지사별 벌크 캡처 (엔타스4스튜디오 + 파트너채널)**  
   ```bash
   npm run capture:branches
   # 또는: node scripts/bulk-capture-branches.js [출력베이스폴더]
   ```
   - 대상: 지사명에 **엔타스4스튜디오** 또는 **파트너채널** 포함, 3월 실적 > 0인 설계사만.
   - 출력 경로: **날짜 > 지사 > 매니저 > 설계사.png**
     - 기본 베이스: `afg-dashboard/OUTPUT` (또는 프로젝트 기준 `OUTPUT` 폴더).
     - 예: `OUTPUT/20260306/엔타스4스튜디오/매니저명/설계사명.png`, `OUTPUT/20260306/파트너채널/...`
     - 날짜는 실행일 기준 YYYYMMDD.
   - 데이터·진입 경로: 위 1~2와 동일 (`data/capture/dashboard.json`, dev 서버 `/direct?capture=1`).
