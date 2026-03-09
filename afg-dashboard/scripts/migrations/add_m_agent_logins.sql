-- m_agent(지점 ID) 로그인용 테이블. ID/초기 비밀번호 = "지점" 제외한 대리점명 (예: GA4-7, 충청GA-5)
CREATE TABLE IF NOT EXISTS m_agent_logins (
  m_agent_value text PRIMARY KEY,
  password text NOT NULL
);
