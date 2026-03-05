/**
 * Supabase agents 비밀번호 초기화 (사번으로 되돌리기)
 * - .env.local 의 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 사용
 *
 * 실행: node scripts/supabase-reset-password.js <코드>
 * 예: node scripts/supabase-reset-password.js 325005323
 */
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요');
  process.exit(1);
}

const code = process.argv[2];
if (!code) {
  console.error('사용: node scripts/supabase-reset-password.js <코드>');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function main() {
  const { data: agent, error: fetchErr } = await supabase.from('agents').select('code, name').eq('code', String(code)).limit(1).maybeSingle();
  if (fetchErr) {
    console.error('조회 실패:', fetchErr.message);
    process.exit(1);
  }
  if (!agent) {
    console.error('해당 코드의 설계사가 없습니다:', code);
    process.exit(1);
  }

  const { error: upErr } = await supabase.from('agents').update({ password: String(code) }).eq('code', String(code));
  if (upErr) {
    console.error('비밀번호 초기화 실패:', upErr.message);
    process.exit(1);
  }

  console.log('[비밀번호 초기화] 코드:', code, '→ 비밀번호를 사번과 동일하게 설정했습니다.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
