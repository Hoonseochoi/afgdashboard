/**
 * Supabase agents 테이블 코드 722031500 지점장 계정 보정
 * - 이름: 이도경, 직함: 지점장(role=manager), branch: 우리
 * - "우리" 지점 설계사만 접근 가능하도록 API에서 별도 처리됨
 *
 * 실행: node scripts/supabase-update-agent-722031500.js
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

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function main() {
  const code = '722031500';
  const name = '이도경';
  const role = 'manager';
  const branch = '우리';
  const defaultPassword = code;

  const { data: existing, error: fetchErr } = await supabase.from('agents').select('*').eq('code', code).limit(1).maybeSingle();
  if (fetchErr) {
    console.error('[UpdateAgent] fetch error:', fetchErr.message);
    process.exit(1);
  }

  if (existing) {
    const { error: upErr } = await supabase
      .from('agents')
      .update({ name, role, branch, ...(existing.password ? {} : { password: defaultPassword }) })
      .eq('code', code);
    if (upErr) {
      console.error('[UpdateAgent] update error:', upErr.message);
      process.exit(1);
    }
    console.log('[UpdateAgent] updated:', code, { name, role, branch });
  } else {
    const { error: insErr } = await supabase.from('agents').insert({
      code,
      name,
      password: defaultPassword,
      branch,
      role,
      is_first_login: true,
      performance: {},
      weekly: {},
      partner: {},
    });
    if (insErr) {
      console.error('[UpdateAgent] insert error:', insErr.message);
      process.exit(1);
    }
    console.log('[UpdateAgent] created:', code, { name, role, branch });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
