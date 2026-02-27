# Firebase → PocketBase 마이그레이션 작업 플랜

[PocketBase](https://pocketbase.io/)는 단일 실행 파일 + SQLite 기반 오픈소스 백엔드로, 실시간 DB·인증·파일 저장·REST API·관리자 UI를 제공합니다. Firestore 읽기 할당량 이슈를 줄이기 위해 이전을 검토할 때 참고용 플랜입니다.

---

## 1. 현재 Firebase 사용 요약

| 구분 | 내용 |
|------|------|
| **컬렉션** | `agents` (설계사·매니저·관리자), `config` (doc: `app` → `updateDate`) |
| **agents 문서 필드** | `code`, `name`, `branch`, `password`, `performance`(월별), `weekly`(주차별), `managerCode`, `managerName`, `role`, `isFirstLogin`, `targetManagerCode` |
| **인증** | 쿠키 기반 세션. 로그인 시 `agents`에서 code/password 조회 후 세션 쿠키 설정 |
| **API** | `/api/agents`, `/api/ranks`, `/api/auth/login`, `/api/auth/change-password`, `/api/auth/me` |
| **업로드 스크립트** | `uploadFixData.js`, `uploadDaily.js`, `uploadDailyPerformance.js` (Node + firebase-admin) |

---

## 2. 당신이 준비할 것 (체크리스트)

### 2.1 PocketBase 서버

- [ ] **PocketBase 바이너리 다운로드**  
  - https://github.com/pocketbase/pocketbase/releases  
  - Windows: `pocketbase_*_windows_amd64.zip` 등
- [ ] **실행 환경**  
  - 로컬/개발: `./pocketbase serve` (기본 `http://127.0.0.1:8090`)  
  - 배포: 동일 바이너리로 서버(VPS, VM 등)에서 실행하거나, Docker 사용 가능
- [ ] **도메인/포트 결정**  
  - 예: `https://pb.yourdomain.com` 또는 `http://서버IP:8090`  
  - Next.js 앱에서 호출할 **PocketBase API URL**을 정해 두기

### 2.2 데이터 내보내기 (Firebase → 로컬)

- [ ] **agents 컬렉션 내보내기**  
  - Firebase Console에서 수동 export, 또는  
  - 기존 `data.json` + 최신 실적이 이미 Firestore와 동기화된 상태라면, **스크립트로 Firestore → JSON 덤프** 한 번 작성해 두면 이후 PocketBase 임포트에 유리
- [ ] **config**  
  - `config.app.updateDate` 값 확인(또는 export) — PocketBase `config` 컬렉션/레코드로 옮길 때 사용

### 2.3 인증 방식 결정

- [ ] **현재 방식 유지**  
  - PocketBase에는 “설계사 코드 + 비밀번호”를 **커스텀 컬렉션(agents)** 에만 두고,  
  - 로그인은 **Next.js API에서 PocketBase REST로 agents 조회 후 비밀번호 비교 → 세션 쿠키 설정** (지금 Firebase 로직과 동일하게 유지)
- [ ] **PocketBase 사용자 활용**  
  - 각 설계사를 PocketBase “users”로 만들면 이메일/비밀번호·OAuth 등 활용 가능하지만, **기존 code 기반 로그인·role 구조와 매핑 설계**가 필요

→ 초기 이전은 “커스텀 agents 컬렉션 + Next API에서 로그인 처리”로 가는 것을 권장.

---

## 3. PocketBase 쪽 설계 (컬렉션/필드)

### 3.1 컬렉션: `agents`

| 필드명 | 타입 | 비고 |
|--------|------|------|
| `code` | text (unique) | 사번, 로그인 ID로 사용 |
| `name` | text | |
| `branch` | text | |
| `password` | text | 암호는 나중에 해시 저장 권장 |
| `performance` | JSON | `{"2026-01": 123, "2026-02": 456}` 형태 |
| `weekly` | JSON | `{"week1": 0, "week2": 100, ...}` |
| `managerCode` | text | |
| `managerName` | text | |
| `role` | text | `agent` / `manager` / `admin` |
| `isFirstLogin` | bool | |
| `targetManagerCode` | text (nullable) | 매니저일 때 담당 팀 식별 |

- **API 규칙**:  
  - 목록/단건 조회: PocketBase REST API 사용 (필터·정렬 가능).  
  - 로그인/비밀번호 변경: Next.js API에서 PocketBase를 호출해 처리.

### 3.2 컬렉션: `config`

| 필드명 | 타입 | 비고 |
|--------|------|------|
| `key` | text | 예: `app` |
| `updateDate` | text | 예: `0227` |

- 단일 레코드만 쓸 경우 `key = 'app'` 한 건만 두고, 나머지 설정도 같은 레코드에 필드 추가 가능.

---

## 4. 작업 단계별 플랜

### Phase 0: 준비 (당신이 할 일)

1. PocketBase 다운로드·실행해 보기 (로컬 `http://127.0.0.1:8090`).
2. Admin UI (`http://127.0.0.1:8090/_/`) 접속해 컬렉션 `agents`, `config` 생성 (위 스키마대로).
3. (선택) Firestore에서 agents·config 내보내기 스크립트 실행해 JSON 확보.

### Phase 1: 데이터 이전

1. **agents**  
   - `data.json` 또는 Firestore export JSON을 사용해, PocketBase REST API로 `POST /api/collections/agents/records` 배치 업로드 (스크립트 작성 권장).
2. **config**  
   - `updateDate` 한 건 `POST /api/collections/config/records` 또는 Admin UI에서 입력.

### Phase 2: Next.js ↔ PocketBase 연동

1. **환경 변수**  
   - `NEXT_PUBLIC_POCKETBASE_URL` 또는 `POCKETBASE_URL` (서버 전용) 추가.  
   - 예: `http://127.0.0.1:8090` (개발), `https://pb.yourdomain.com` (운영).
2. **공통 PocketBase 클라이언트**  
   - `src/lib/pocketbase.ts` 등에서 `fetch(POCKETBASE_URL + '/api/...')` 래퍼 또는 PocketBase JS SDK 사용.
3. **API 라우트 교체**  
   - `src/app/api/agents/route.ts` → Firestore 대신 PocketBase에서 agents 목록/단건 조회.  
   - `src/app/api/ranks/route.ts` → agents 전체 조회 후 서버에서 순위 계산 (현재와 동일 로직).  
   - `src/app/api/auth/login/route.ts` → PocketBase에서 `code`로 1건 조회 후 비밀번호 비교, 세션 쿠키 설정.  
   - `src/app/api/auth/change-password/route.ts` → PocketBase 해당 레코드 `PATCH`로 password 필드만 갱신.

### Phase 3: 업로드 스크립트 전환

1. **uploadFixData.js**  
   - `data.json` 읽어서 PocketBase `agents` 컬렉션에 `POST`/`PATCH` (기존 Firestore set 대신).
2. **uploadDaily.js**  
   - `config` 컬렉션의 `updateDate` 필드만 갱신 (1회 PATCH).
3. **uploadDailyPerformance.js**  
   - daily 엑셀 파싱 후, 각 `code`별로 PocketBase `agents`의 `performance`/`weekly`만 `PATCH`.

(모두 Node에서 `fetch`로 PocketBase REST API 호출하면 됨.)

### Phase 4: 정리 및 배포

1. Firebase 관련 코드 제거: `firebase-admin`, `firebase`(클라이언트), `src/lib/firebase-admin.ts`, `FirebaseInit` 등.
2. 로그인/agents/ranks/비밀번호 변경 전부 PocketBase 경유하는지 확인.
3. 배포 시 PocketBase 서버를 같은 서버 또는 별도 서버에서 실행하고, Next.js에서 `POCKETBASE_URL`로 접근하도록 설정.

---

## 5. 참고 링크

- [PocketBase 공식](https://pocketbase.io/)
- [PocketBase 문서](https://pocketbase.io/docs/) — REST API, 스키마, 필터/정렬
- [JavaScript SDK 예제](https://pocketbase.io/) (사이트 내 코드 블록) — `pb.collection('example').getList()` 등

---

## 6. 요약: 당신이 준비할 것 한 줄 정리

1. **PocketBase 실행 파일** 받아서 로컬/서버에서 실행 가능하게 하기.  
2. **PocketBase에 `agents`, `config` 컬렉션** 스키마대로 생성.  
3. **Firebase(또는 data.json)에서 agents·config 데이터** 내보내기/확보.  
4. **PocketBase API URL** 정하고, Next.js용 환경 변수로 넣을 값 결정.  
5. (선택) **인증**은 당분간 “Next API + agents 컬렉션 code/password” 유지할지, PocketBase users로 갈지 결정.

이 플랜대로 Phase 0만 진행해 두면, 이후 Phase 1~4는 코드/스크립트 작업으로 단계별로 진행할 수 있습니다.
