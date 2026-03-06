/**
 * Supabase agents 테이블에 코드 102203009 (손영상 지점장) 추가/보정
 * - .env.local 의 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 사용
 * - 이미 존재하면 name/branch/password/role/is_first_login만 보정
 * - 없으면 기본 값으로 새 행 생성
 *
 * 실행: node scripts/supabase-add-agent-102203009.js
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
  const code = '102203009';
  const name = '손영상 지점장';
  const branch = '엔타스5스튜디오';
  const defaultPassword = code; // 초기 비번은 코드와 동일하게 설정

  console.log('[AddAgent] checking agent code:', code);
  const { data: existing, error: fetchErr } = await supabase.from('agents').select('*').eq('code', code).limit(1).maybeSingle();
  if (fetchErr) {
    console.error('[AddAgent] fetch error:', fetchErr.message);
    process.exit(1);
  }

  const payload = {
    name,
    branch,
    password: defaultPassword,
    role: 'manager', // 지점장이므로 manager 권한 부여 (필요시 조정)
    is_first_login: true,
  };

  if (existing) {
    console.log('[AddAgent] existing row found, id:', existing.id);
    const { error: upErr } = await supabase.from('agents').update(payload).eq('code', code);
    if (upErr) {
      console.error('[AddAgent] update error:', upErr.message);
      process.exit(1);
    }
    console.log('[AddAgent] row updated:', payload);
  } else {
    console.log('[AddAgent] no row found. Creating new one...');
    const { error: insErr } = await supabase.from('agents').insert({
      code,
      ...payload,
      performance: {},
      weekly: {},
      partner: {},
    });
    if (insErr) {
      console.error('[AddAgent] insert error:', insErr.message);
      process.exit(1);
    }
    console.log('[AddAgent] new agent row created for code', code);
  }
}

main().catch((e) => {
  console.error('[AddAgent] error:', e);
  process.exit(1);
});
