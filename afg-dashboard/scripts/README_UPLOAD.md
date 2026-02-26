# 데이터 업로드 가이드

## 업데이트 날짜는 언제 바뀌나요?

**자동으로 바뀌지 않습니다.** `node scripts/uploadData.js`를 실행할 때마다 `data/daily` 폴더의 MC_LIST 파일명 앞 4자리(예: 0226)를 읽어 Firestore에 저장합니다.

## 매일 업데이트 절차

1. **daily 폴더에 새 파일 추가**  
   예: `0227MC_LIST_OUT_202602.xlsx` (2월 27일 데이터)

2. **데이터 병합** (Python 스크립트)  
   - `data.json`을 새 daily 파일 기준으로 갱신

3. **Firebase 업로드**  
   ```bash
   cd afg-dashboard
   node scripts/uploadData.js
   ```
   - 이때 업데이트 날짜가 `0227`로 갱신됩니다.

즉, **매일 업로드 스크립트를 실행**해야 날짜와 데이터가 최신으로 유지됩니다.
