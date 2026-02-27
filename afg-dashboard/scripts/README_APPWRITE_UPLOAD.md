# Appwrite 설계사/매니저·일일 실적 업로드

## 사전 준비

1. **Appwrite 콘솔**  
   Database + `agents` / `config` 컬렉션 생성, API Key 생성.  
   → [docs/APPWRITE_SETUP.md](../docs/APPWRITE_SETUP.md) 참고.

2. **환경 변수**  
   `afg-dashboard/.env.local` 에 다음을 설정합니다.

   ```env
   APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
   APPWRITE_PROJECT_ID=your-project-id
   APPWRITE_API_KEY=your-api-key-secret
   APPWRITE_DATABASE_ID=your-database-id
   APPWRITE_AGENTS_COLLECTION_ID=agents-collection-id
   APPWRITE_CONFIG_COLLECTION_ID=config-collection-id
   ```

## 스크립트

- **최초 데이터**: `node scripts/appwrite-upload-agents.js`  
  - `src/data/data.json` 설계사 + 매니저 + 관리자 계정을 Appwrite `agents` 에 업로드(또는 업데이트).  
  - `config` 에 `key=app`, `updateDate=0000` 한 건 생성(없을 때만).

- **일일 실적**: `node scripts/appwrite-upload-daily.js`  
  - `data/daily/` 폴더의 최신 `NNNNMC_LIST*.xlsx` 파싱.  
  - config `updateDate` 갱신, agents 당월/전월·주차 실적 반영, 없으면 설계사 생성.  
  - `src/data/agent-order.json` 저장(MC_LIST 순서).

## 로그인

- `.env.local` 에 Appwrite 변수가 모두 있으면 **로그인/agents/ranks/비밀번호 변경** 은 Appwrite를 사용합니다.
- 개발자 계정 `develope` / `develope` 는 Appwrite 없이도 로그인 가능(로컬 JSON 폴백).
