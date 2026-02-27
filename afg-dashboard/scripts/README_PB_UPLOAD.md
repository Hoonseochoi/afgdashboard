# PocketBase 설계사/매니저 업로드

## 사전 준비

1. **PocketBase 실행**  
   `pocketbase serve` 로 서버가 떠 있어야 합니다 (기본: http://127.0.0.1:8090).

2. **Admin(슈퍼유저) 생성**  
   브라우저에서 http://127.0.0.1:8090/_/ 접속 후, 첫 설정 화면에서 **이메일**과 **비밀번호**로 슈퍼유저를 만듭니다.

3. **환경 변수**  
   `afg-dashboard/.env.local` 에 다음을 추가합니다.

   ```env
   POCKETBASE_URL=http://127.0.0.1:8090
   POCKETBASE_ADMIN_EMAIL=방금_설정한_이메일
   POCKETBASE_ADMIN_PASSWORD=방금_설정한_비밀번호
   ```

## 실행

```bash
cd afg-dashboard
node scripts/pb-upload-agents.js
```

- `agents` 컬렉션이 없으면 생성한 뒤, `src/data/data.json` 설계사 + 매니저 + 관리자 계정을 업로드합니다.
- `config` 컬렉션이 없으면 생성하고 `updateDate` 한 건 넣습니다.
- 이미 컬렉션이 있으면 데이터만 추가하므로, **같은 스크립트를 여러 번 실행하면 레코드가 중복**됩니다. 처음 한 번만 실행하거나, 기존 데이터를 비운 뒤 실행하세요.

## 로그인

- `.env.local` 에 `POCKETBASE_ADMIN_EMAIL`, `POCKETBASE_ADMIN_PASSWORD` 가 있으면 **로그인 API는 PocketBase**를 사용합니다.
- 설계사/매니저/관리자 계정: 업로드된 `code`(사번) / 비밀번호(기본값은 사번과 동일)로 로그인하면 됩니다.
