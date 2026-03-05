-- agents 테이블에 GA용 지사/대리점 컬럼 추가
ALTER TABLE agents ADD COLUMN IF NOT EXISTS ga_branch text;

