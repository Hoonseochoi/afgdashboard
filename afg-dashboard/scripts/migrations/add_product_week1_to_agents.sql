-- 3월 상품 1주차 실적 컬럼 추가 (PRIZE_SUM 엑셀 AC열 → 업로드 스크립트로 반영)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS product_week1 bigint DEFAULT NULL;
