-- agents 테이블에 SM(조직장) 정보 저장용 컬럼 추가
ALTER TABLE agents ADD COLUMN IF NOT EXISTS sm text;

