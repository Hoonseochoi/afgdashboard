# 구글 드라이브 연동 + 매일 10시 데일리 업데이트 계획

구글 드라이브 폴더에 매일 올라오는 엑셀을 기준으로 데일리 업데이트를 **매일 오전 10시**에 자동 실행하기 위한 설계입니다.

- **구글 드라이브 폴더**: [daily_update](https://drive.google.com/drive/folders/10177TYChiirxIIrrwFX33Yxi2UnLpSCF?usp=sharing)  
  - 매일 `NNNNMC_LIST_OUT_YYYYMM.xlsx`, `NNNNPRIZE_SUM_OUT_YYYYMM.xlsx` 형태로 최신 파일이 업로드됨 (예: 0310, 0311 …)

- **기존 플로우**: [PLAN_DAILY_UPDATE.md](./PLAN_DAILY_UPDATE.md) 참고  
  - `data/daily` 최신 MC_LIST → Supabase 실적·주차·config·agent-order  
  - `data/daily` 최신 PRIZE_SUM → 1주차 상품 실적

---

## 1. 전체 흐름

```
[구글 드라이브 daily_update 폴더]
         │
         ▼ (1) 동기화/다운로드
   [로컬 data/daily/]
         │
         ▼ (2) 기존 run-daily-update.py
   [Supabase 반영]
```

- **매일 10:00**에 (1) 구글 드라이브 → `data/daily` 동기화 후 (2) `run-daily-update.py` 실행.

---

## 2. 구글 드라이브 → 로컬 동기화 (1단계)

`data/daily` 경로는 기존 스크립트와 동일하게 **프로젝트 루트 기준 `data/daily`** (afg-dashboard와 형제 폴더)를 사용합니다.

### 2.1 방식 A: rclone (권장)

- **역할**: 구글 드라이브 폴더를 로컬 `data/daily`와 동기화.
- **설정**:
  1. [rclone](https://rclone.org/) 설치.
  2. `rclone config`로 Google Drive 리모트 추가 (OAuth 또는 서비스 계정).
  3. 동기화 예시:
     ```bash
     rclone sync "gdrive:daily_update" "C:\Users\chlgn\OneDrive\Desktop\AFG_DASHBOARD\data\daily" --include "*.xlsx"
     ```

- **명령어 해석**:
  | 요소 | 의미 |
  |------|------|
  | `rclone sync` | **동기화**: 소스(구글 드라이브)를 목적지(로컬)와 **한 방향**으로 맞춤. 목적지에만 있는 파일은 삭제될 수 있음 (소스 기준으로 목적지가 동일해짐). |
  | `"gdrive:daily_update"` | **소스**. `gdrive` = rclone config로 만든 구글 드라이브 리모트 이름, `daily_update` = 드라이브 안의 폴더 이름. |
  | `"C:\Users\chlgn\OneDrive\Desktop\AFG_DASHBOARD\data\daily"` | **목적지**. 엑셀 파일이 저장될 로컬 폴더 (프로젝트의 `data/daily`). |
  | `--include "*.xlsx"` | **필터**. 확장자가 `.xlsx`인 파일만 가져옴. MC_LIST, PRIZE_SUM 엑셀만 동기화하고 그 외 파일은 제외. |

  (`gdrive`는 rclone config 시 정한 리모트 이름으로 바꿀 것.)

- **장점**: 한 번 설정 후 스크립트에서 `rclone sync`만 호출하면 됨. 증분 동기화 지원.
- **단점**: PC/서버에 rclone 설치 및 드라이브 인증 필요.

### 2.2 방식 B: Google Drive API (Python)

- **역할**: 폴더 ID로 파일 목록 조회 후, `NNNNMC_LIST*.xlsx` / `NNNNPRIZE_SUM*.xlsx` 패턴 중 **가장 최신(날짜 최대)** 파일만 다운로드해 `data/daily`에 저장.
- **필요**: 서비스 계정 JSON 또는 OAuth 클라이언트, `pip install google-api-python-client google-auth`.
- **장점**: “최신 파일만” 골라서 받을 수 있어 용량/파일 수 제어에 유리.
- **단점**: API 키·서비스 계정 설정 필요.

### 2.3 방식 C: Google Drive 데스크톱 앱 + 로컬 경로

- 구글 드라이브 앱으로 해당 폴더를 **내 PC의 특정 경로**(예: `C:\Users\chlgn\OneDrive\Desktop\AFG_DASHBOARD\data\daily`)에 동기화.
- 데일리 업데이트 스크립트에서 (1) 해당 경로를 `data/daily`로 **복사**하거나 (2) `data/daily`를 그 경로의 심볼릭 링크로 두고, 기존 `run-daily-update.py`는 그대로 `data/daily`만 참조.
- **장점**: 별도 API/인증 없이 앱 동기화만으로 가능.
- **단점**: 10시에 “앱 동기화가 이미 끝난 상태”가 되도록 해야 함 (동기화 시각 제어는 앱/OS 설정에 따름).

---

## 3. 통합 실행 스크립트 (1단계 + 2단계)

아래는 “동기화(1) → run-daily-update(2)”를 한 번에 돌리는 예시입니다.

### 3.1 rclone 사용 시 (예: Windows 배치)

`scripts/run-daily-with-sync.bat` (또는 동일 내용의 `.cmd`):

```batch
@echo off
set REPO_ROOT=%~dp0..
set DATA_DAILY=%REPO_ROOT%\data\daily
set RCLONE_REMOTE=gdrive_remote
set RCLONE_FOLDER=daily_update

echo [1/2] 구글 드라이브 -> data/daily 동기화
rclone sync "%RCLONE_REMOTE%:%RCLONE_FOLDER%" "%DATA_DAILY%" --include "*.xlsx"
if errorlevel 1 (
  echo rclone 실패
  exit /b 1
)

echo [2/2] 데일리 업데이트 실행
cd /d "%REPO_ROOT%\afg-dashboard"
python scripts/run-daily-update.py
exit /b %errorlevel%
```

- `RCLONE_REMOTE`, `RCLONE_FOLDER`는 실제 rclone 설정에 맞게 수정.
- `REPO_ROOT`이 `AFG_DASHBOARD`(afg-dashboard 상위)를 가리키도록 해야 함.

### 3.2 Python만 사용 시 (Drive API로 다운로드 후 실행)

- `scripts/sync-daily-from-gdrive.py` 같은 스크립트에서:
  1. Google Drive API로 폴더 ID `10177TYChiirxIIrrwFX33Yxi2UnLpSCF` 목록 조회.
  2. `^\d{4}MC_LIST.*\.xlsx$`, `^\d{4}PRIZE_SUM.*\.xlsx$` 패턴으로 필터 후, 파일명(날짜) 기준 최신 1개씩 선택.
  3. 해당 파일을 `data/daily`에 다운로드 (기존 파일 덮어쓰기).
  4. `subprocess.run(["python", "scripts/run-daily-update.py"], cwd="afg-dashboard")` 호출.

이렇게 하면 “최신 파일만 받고 → 기존 run-daily-update 로직 그대로 사용”이 가능합니다.

---

## 4. 매일 오전 10시 실행 (스케줄)

### 4.1 Windows (작업 스케줄러)

1. **작업 스케줄러** 열기.
2. “기본 작업 만들기” → 이름 예: `AFG 데일리 업데이트`.
3. 트리거: **매일**, 오전 **10:00**.
4. 동작: **프로그램 시작**  
   - 프로그램: `cmd.exe` (또는 `rclone`/`python`이 들어 있는 전체 경로).  
   - 인수: `/c "C:\Users\chlgn\OneDrive\Desktop\AFG_DASHBOARD\afg-dashboard\scripts\run-daily-with-sync.bat"`  
     (또는 통합 Python 스크립트: `python C:\Users\chlgn\OneDrive\Desktop\AFG_DASHBOARD\afg-dashboard\scripts\sync-daily-from-gdrive.py`)
5. “시작 위치”는 배치/스크립트가 있는 디렉터리 또는 repo 루트로 설정.
6. `.env.local` 등 환경 변수가 필요하면 작업의 “환경 변수” 또는 배치 파일 내에서 `set`으로 지정.

### 4.2 macOS / Linux (cron)

- 매일 10시에 실행 예시:
  ```cron
  0 10 * * * /path/to/AFG_DASHBOARD/afg-dashboard/scripts/run-daily-with-sync.sh
  ```
- `run-daily-with-sync.sh` 내용은 위 배치와 동일하게 1) rclone sync, 2) `python scripts/run-daily-update.py` (afg-dashboard에서 실행).

### 4.3 실행 환경 요구사항

- **Node.js**, **Python 3** 설치.
- **afg-dashboard** 기준 `.env.local` (Supabase 등) 존재.
- 10시에 PC 또는 서버가 켜져 있거나, 작업 스케줄러/크론이 돌아가는 머신이 네트워크에 연결되어 있어야 함.
- rclone/API 사용 시, 해당 계정이 [daily_update 폴더](https://drive.google.com/drive/folders/10177TYChiirxIIrrwFX33Yxi2UnLpSCF?usp=sharing)에 접근 가능해야 함.

---

## 5. 구현 순서 제안

| 단계 | 내용 |
|------|------|
| 1 | **동기화 방식 선택**: rclone / Drive API / 데스크톱 앱 중 하나 결정. |
| 2 | **동기화 스크립트 작성**: 선택한 방식으로 `data/daily`에 최신 MC_LIST, PRIZE_SUM만 오도록 구현. |
| 3 | **통합 스크립트**: “동기화 → `run-daily-update.py`” 한 번에 실행하는 배치/쉘/Python 스크립트 작성. |
| 4 | **로컬 수동 테스트**: 통합 스크립트를 직접 실행해 Supabase 반영 및 `updateDate` 확인. |
| 5 | **스케줄 등록**: Windows 작업 스케줄러 또는 cron에 매일 10:00 실행으로 등록. |
| 6 | **모니터링**: 실패 시 로그/메일 알림(선택) 또는 작업 스케줄러 “기록”으로 확인. |

---

## 6. 방식 D: Google Apps Script (드라이브 → Supabase 직접)

로컬 PC/서버 없이 **구글 드라이브 폴더의 xlsx만**으로 Supabase를 갱신하려면 Google Apps Script를 사용할 수 있다.

- **스크립트 파일**: [DailyUpdateGoogleAppsScript.txt](./DailyUpdateGoogleAppsScript.txt)  
  → [script.google.com](https://script.google.com)에서 새 프로젝트를 만들고, 해당 텍스트 파일 내용을 붙여넣어 사용한다.
- **동작 요약**  
  1. 지정한 드라이브 폴더에서 최신 `NNNNMC_LIST*.xlsx`, `NNNNPRIZE_SUM*.xlsx` 조회  
  2. xlsx를 임시 구글 시트로 변환 후 파싱 (Drive API 사용)  
  3. Supabase REST API로 `config.update_date`, `agents`(performance, weekly, product_week1) 반영  
  4. 시간 기반 트리거로 **매일 10:00(한국시간)** 실행 가능
- **필요 설정**  
  - 스크립트 속성: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`  
  - 확장 프로그램에서 **Drive API** 사용 설정  
  - `installDailyTrigger()` 한 번 실행 후 매일 자동 실행
- **주의**  
  - `agent-order.json`은 로컬 파일이므로 이 스크립트에서는 갱신하지 않는다. 대시보드 API는 3월 매출 순 정렬 등을 사용하므로 동작에는 지장 없다.

---

## 7. 참고

- 기존 데일리 업데이트 상세: [PLAN_DAILY_UPDATE.md](./PLAN_DAILY_UPDATE.md)
- 구글 드라이브 폴더: https://drive.google.com/drive/folders/10177TYChiirxIIrrwFX33Yxi2UnLpSCF?usp=sharing
- **로컬 `data/daily` 경로**: `C:\Users\chlgn\OneDrive\Desktop\AFG_DASHBOARD\data\daily` (프로젝트 루트 기준, afg-dashboard와 형제). 기존 `supabase-upload-daily.js` 등이 이 경로를 사용함.
