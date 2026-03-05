-- agents 테이블에 branch 컬럼 추가 (텍스트, nullable)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS branch text;
