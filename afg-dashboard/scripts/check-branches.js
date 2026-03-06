/**
 * Supabase agents 테이블의 모든 지사명(branch) 목록을 출력하는 스크립트
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
  console.log('[CheckBranches] fetching branches...');
  const { data, error } = await supabase.from('agents').select('branch');
  if (error) {
    console.error('[CheckBranches] fetch error:', error.message);
    process.exit(1);
  }

  const branches = [...new Set(data.map(a => a.branch).filter(Boolean))].sort();
  console.log('[CheckBranches] Unique branch names:', branches);
  
  const matches = branches.filter(b => b.includes('엔타스'));
  console.log('[CheckBranches] Branches including "엔타스":', matches);

  const count = data.filter(a => a.branch === '엔타스5스튜디오').length;
  console.log('[CheckBranches] Count for exactly "엔타스5스튜디오":', count);
}

main().catch((e) => {
  console.error('[CheckBranches] error:', e);
  process.exit(1);
});
