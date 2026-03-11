-- 2주차 상품 실적 컬럼 추가 (PRIZE_SUM 엑셀 AH열 → 데일리 업데이트 스크립트로 반영)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS product_week2 bigint DEFAULT NULL;
