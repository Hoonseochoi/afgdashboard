/**
 * 특정 설계사의 당월 인정실적만 Supabase에 반영 (단건 보정)
 * - .env.local 필요
 *
 * 실행: node scripts/supabase-fix-agent-performance.js <코드> <인정실적(원)>
 * 예: node scripts/supabase-fix-agent-performance.js 725070184 1020410
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
const amount = process.argv[3];
if (!code || amount === undefined) {
  console.error('사용: node scripts/supabase-fix-agent-performance.js <코드> <인정실적(원)>');
  process.exit(1);
}

const currentMonthKey = '2026-03';
const value = Number(amount);
if (isNaN(value) || value < 0) {
  console.error('인정실적은 0 이상 숫자여야 합니다:', amount);
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function main() {
  const codeStr = String(code).trim();
  const { data: agent, error: fetchErr } = await supabase
    .from('agents')
    .select('code, name, performance')
    .eq('code', codeStr)
    .limit(1)
    .maybeSingle();

  if (fetchErr) {
    console.error('조회 실패:', fetchErr.message);
    process.exit(1);
  }
  if (!agent) {
    console.error('해당 코드의 설계사가 없습니다:', codeStr);
    process.exit(1);
  }

  const performance = { ...(agent.performance || {}) };
  performance[currentMonthKey] = value;

  const { error: upErr } = await supabase
    .from('agents')
    .update({ performance })
    .eq('code', codeStr);

  if (upErr) {
    console.error('반영 실패:', upErr.message);
    process.exit(1);
  }

  console.log('[인정실적 반영] 코드:', codeStr, '→', currentMonthKey, '인정실적', value.toLocaleString(), '원');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
