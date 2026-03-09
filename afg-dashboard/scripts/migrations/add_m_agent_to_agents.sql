-- agents 테이블에 MC LIST AH열(담당 매니저/에이전트) 저장용 컬럼 추가
ALTER TABLE agents ADD COLUMN IF NOT EXISTS m_agent text;
