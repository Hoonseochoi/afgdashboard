# Vercel 환경 변수 설정 (배포 시 로그인 동작)

Vercel 대시보드에서 프로젝트 선택 → **Settings** → **Environment Variables** 에서 아래를 추가하세요.

| 이름 | 값 | 비고 |
|------|-----|------|
| `APPWRITE_ENDPOINT` | `https://sgp.cloud.appwrite.io/v1` | 리전에 맞게 변경 가능 |
| `APPWRITE_PROJECT_ID` | (Appwrite 프로젝트 ID) | 콘솔에서 확인 |
| `APPWRITE_API_KEY` | (API Key Secret) | Settings → API Keys에서 생성, 한 번만 표시됨 |
| `APPWRITE_DATABASE_ID` | (Database ID) | Databases에서 생성한 DB ID |
| `APPWRITE_AGENTS_COLLECTION_ID` | (agents 컬렉션 ID) | |
| `APPWRITE_CONFIG_COLLECTION_ID` | (config 컬렉션 ID) | |

- **Environment**: Production, Preview, Development 모두 체크 권장.
- 저장 후 **Deployments** 탭에서 최신 배포에 **Redeploy** 한 번 실행하세요.

자세한 설정은 [APPWRITE_SETUP.md](./APPWRITE_SETUP.md) 를 참고하세요.
