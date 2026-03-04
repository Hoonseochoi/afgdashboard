/**
 * Supabase agents 테이블에 코드 105203241 레코드 보정/추가
 * - .env.local 의 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 사용
 * - 이미 존재하면 name/password/role/is_first_login만 보정
 * - 없으면 기본 값으로 새 행 생성
 *
 * 실행: node scripts/supabase-add-agent-105203241.js
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
  const code = '105203241';
  const name = '이진영 지점장';
  const defaultPassword = '105203241';

  console.log('[AddAgent] checking agent code:', code);
  const { data: existing, error: fetchErr } = await supabase.from('agents').select('*').eq('code', code).limit(1).maybeSingle();
  if (fetchErr) {
    console.error('[AddAgent] fetch error:', fetchErr.message);
    process.exit(1);
  }

  if (existing) {
    console.log('[AddAgent] existing row found, id:', existing.id);
    const update = { name };
    if (!existing.password) update.password = defaultPassword;
    if (!existing.role) update.role = 'agent';
    if (existing.is_first_login === undefined) update.is_first_login = true;
    if (Object.keys(update).length > 1) {
      const { error: upErr } = await supabase.from('agents').update(update).eq('code', code);
      if (upErr) {
        console.error('[AddAgent] update error:', upErr.message);
        process.exit(1);
      }
      console.log('[AddAgent] document updated:', update);
    } else {
      console.log('[AddAgent] nothing to update.');
    }
  } else {
    console.log('[AddAgent] no row found. Creating new one...');
    const { error: insErr } = await supabase.from('agents').insert({
      code,
      name,
      password: defaultPassword,
      branch: '',
      role: 'agent',
      is_first_login: true,
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
