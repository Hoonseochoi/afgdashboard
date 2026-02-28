# Appwrite 설정 (대시보드 백엔드)

이 프로젝트는 **Appwrite Cloud**를 백엔드 DB로 사용합니다. PocketBase / Pockethost는 사용하지 않습니다.

## 1. Appwrite 콘솔에서 할 일

1. [Appwrite Console](https://cloud.appwrite.io) 로그인 후 프로젝트 선택(또는 생성).
2. **Databases** → **Create database** → 이름 예: `afg` → 생성 후 **Database ID** 복사.
3. **Create collection** → 이름: `agents` → **Collection ID** 복사.
   - **Attributes** 추가 (타입은 콘솔에서 선택):
     - `code` (string, required)
     - `name` (string)
     - `password` (string)
     - `role` (string)
     - `performance` (string) — JSON 문자열
     - `weekly` (string) — JSON 문자열
     - `managerCode` (string)
     - `managerName` (string)
     - `branch` (string)
     - `isFirstLogin` (boolean)
     - `targetManagerCode` (string)
     - `partner` (string, 선택) — 파트너 시상용 JSON. 파트너 지사만 사용 시 추가. docs/PARTNER_PRIZE_RULES.md 참고.
4. 같은 데이터베이스에 **Create collection** → 이름: `config` → **Collection ID** 복사.
   - **Attributes**:
     - `key` (string, required)
     - `updateDate` (string)
5. **Settings** → **API Keys** → **Create API Key** → Scopes에 다음 권한을 **반드시** 부여 후 **Secret** 복사(한 번만 표시됨).
   - `databases.read`, `databases.write`
   - `collections.read`, `documents.read`, `documents.write`
   - *(오류: "The current user is not authorized to perform the requested action" → API Key에 위 Scope가 없거나, 컬렉션 권한에서 Read/Write가 막혀 있을 수 있음)*
6. **Databases** → 해당 DB → **agents** / **config** 컬렉션 각각 → **Settings** → **Permissions**: 서버(API Key)로 접근하려면 **Read** 권한에 `any` 또는 해당 API Key 역할 추가.

## 2. 환경 변수

로컬: `afg-dashboard/.env.local`  
배포(Vercel): 프로젝트 → Settings → Environment Variables

| 이름 | 설명 |
|------|------|
| `APPWRITE_ENDPOINT` | 예: `https://sgp.cloud.appwrite.io/v1` (리전에 맞게) |
| `APPWRITE_PROJECT_ID` | 콘솔 프로젝트 ID |
| `APPWRITE_API_KEY` | API Key Secret (서버 전용, 노출 금지) |
| `APPWRITE_DATABASE_ID` | 위에서 만든 Database ID |
| `APPWRITE_AGENTS_COLLECTION_ID` | `agents` 컬렉션 ID |
| `APPWRITE_CONFIG_COLLECTION_ID` | `config` 컬렉션 ID |

## 3. 데이터 넣기

- **최초 한 번**: `node scripts/appwrite-upload-agents.js` — `src/data/data.json` 설계사/매니저/관리자 업로드 + config 한 건 생성.
- **일일 실적 반영**: `node scripts/appwrite-upload-daily.js` — `data/daily/` 폴더의 최신 MC_LIST xlsx 파싱 후 실적·updateDate·agent-order.json 반영.
- **파트너 시상 반영**: `node scripts/upload-partner-prize.js` — `data/daily/` 내 PRIZE_SUM 엑셀 파싱 후 agents.partner 업데이트. (지사명에 "파트너" 포함 시 대시보드에 파트너 시상 블록 표시)

## 4. 연결 확인

- 로컬: `GET /api/appwrite-health` 호출 시 `ok: true` 이면 연결 성공.
- 개발자 계정 `develope` / `develope` 는 Appwrite 없이도 로그인 가능(로컬 JSON 폴백).
