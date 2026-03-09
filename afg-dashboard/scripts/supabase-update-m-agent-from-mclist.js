/**
 * MC_LIST_OUT 엑셀 기준으로 Supabase agents.m_agent 업데이트
 * - 대리점명(AL열, 지사명)이 "어센틱"인 행만 대상
 * - 코드: F열(현재대리점설계사조직코드, 0-based 5)
 * - AH열(0-based 33): m_agent 값
 *
 * 필요:
 * - .env.local (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 * - 옵션: DATABASE_URL 또는 SUPABASE_DB_URL → 있으면 m_agent 컬럼 자동 생성
 * - data/daily 폴더에 MC_LIST_OUT 엑셀 존재 (또는 인자로 경로 지정)
 *
 * 실행 예시:
 *   node scripts/supabase-update-m-agent-from-mclist.js
 *   node scripts/supabase-update-m-agent-from-mclist.js "..\\data\\daily\\0309MC_LIST_OUT_202603.xlsx"
 */
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const M_AGENT_MIGRATION_SQL = path.join(__dirname, 'migrations', 'add_m_agent_to_agents.sql');

// MC_LIST 파일 경로: 인자로 주면 그 파일, 아니면 data/daily 내 최신 NNNNMC_LIST*.xlsx
function findLatestDailyMcList() {
  const dailyDir = path.join(__dirname, '..', '..', 'data', 'daily');
  if (!fs.existsSync(dailyDir)) return null;
  const files = fs
    .readdirSync(dailyDir)
    .filter((f) => /^\d{4}MC_LIST/i.test(f) && /\.xlsx?$/i.test(f))
    .sort();
  if (files.length === 0) return null;
  return path.join(dailyDir, files[files.length - 1]);
}

const ARG_PATH = process.argv[2];
const EXCEL_PATH = ARG_PATH ? path.resolve(ARG_PATH) : findLatestDailyMcList();

// F열 = 코드(0-based 5), AH열 = m_agent (0-based 33), AL열 = 지사명/대리점명(0-based 37)
const IDX_CODE = 5;
const IDX_M_AGENT = 33;
const IDX_BRANCH = 37;

function normalizeCode(c) {
  const s = String(c).trim();
  const n = Number(s);
  if (!isNaN(n) && n >= 0 && n < 1e15) return String(Math.round(n));
  return s;
}

/** DATABASE_URL가 있으면 pg로 m_agent 컬럼 추가. 없으면 SQL 안내만. */
async function ensureMAgentColumn() {
  if (DATABASE_URL) {
    try {
      const { Client } = require('pg');
      const client = new Client({ connectionString: DATABASE_URL });
      await client.connect();
      await client.query('ALTER TABLE agents ADD COLUMN IF NOT EXISTS m_agent text;');
      await client.end();
      console.log('[m_agent] agents.m_agent 컬럼 확인/추가 완료 (DB 연결 사용)');
      return true;
    } catch (err) {
      console.warn('[m_agent] DB 연결로 m_agent 컬럼 추가 실패:', err.message);
    }
  }
  if (fs.existsSync(M_AGENT_MIGRATION_SQL)) {
    const sql = fs.readFileSync(M_AGENT_MIGRATION_SQL, 'utf8').trim();
    console.log('[m_agent] m_agent 컬럼이 없을 수 있습니다. Supabase Dashboard > SQL Editor에서 아래를 실행한 뒤 다시 실행하세요:\n');
    console.log(sql);
    console.log('');
  }
  return false;
}

function parseMcList(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('MC_LIST 파일을 찾을 수 없습니다:', filePath);
    process.exit(1);
  }
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const headerRow = 1;
  const header = rows[headerRow] || [];
  console.log(
    '[m_agent/MCLIST] 헤더(일부):',
    header.slice(0, 40).map((v, i) => `${i}:${v}`).join(' | ')
  );
  if (header[IDX_M_AGENT] !== undefined) {
    console.log('[m_agent/MCLIST] AH열(인덱스', IDX_M_AGENT, ') 헤더:', header[IDX_M_AGENT]);
  }

  const result = new Map();
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const branchRaw = String(row[IDX_BRANCH] ?? '').trim();
    if (!branchRaw.includes('어센틱')) continue; // 대리점명이 어센틱인 행만
    const codeRaw = row[IDX_CODE];
    const code = normalizeCode(codeRaw ?? '');
    if (!code || code.length < 4) continue;
    const mAgentRaw = row[IDX_M_AGENT];
    const mAgent = mAgentRaw != null ? String(mAgentRaw).trim() : '';
    result.set(code, mAgent || null);
  }
  return result;
}

async function main() {
  await ensureMAgentColumn();

  console.log('[m_agent/MCLIST] 엑셀:', EXCEL_PATH);
  const codeToMAgent = parseMcList(EXCEL_PATH);
  console.log('[m_agent/MCLIST] 엑셀에서 읽은 설계사코드→m_agent 쌍:', codeToMAgent.size, '건');

  if (codeToMAgent.size === 0) {
    console.log('[m_agent/MCLIST] 업데이트할 데이터 없음.');
    return;
  }

  let updated = 0;
  let notFound = 0;
  const BATCH = 100;
  const CONCURRENCY = 20;
  const codes = Array.from(codeToMAgent.keys());

  for (let i = 0; i < codes.length; i += BATCH) {
    const chunk = codes.slice(i, i + BATCH);
    const { data: agents, error: fetchErr } = await supabase
      .from('agents')
      .select('id, code')
      .in('code', chunk);

    if (fetchErr) {
      console.error('[m_agent/MCLIST] 조회 오류:', fetchErr.message);
      throw fetchErr;
    }

    const byCode = new Map((agents || []).map((a) => [normalizeCode(a.code), a]));
    const updates = [];
    for (const code of chunk) {
      const mAgent = codeToMAgent.get(code);
      const agent = byCode.get(code);
      if (!agent) {
        notFound++;
        continue;
      }
      updates.push({ id: agent.id, m_agent: mAgent });
    }

    for (let u = 0; u < updates.length; u += CONCURRENCY) {
      const group = updates.slice(u, u + CONCURRENCY);
      const results = await Promise.all(
        group.map(({ id, m_agent }) =>
          supabase.from('agents').update({ m_agent }).eq('id', id).then((r) => r.error)
        )
      );
      for (let k = 0; k < results.length; k++) {
        const err = results[k];
        if (err) {
          console.error('[m_agent/MCLIST] 업데이트 실패:', err.message);
        } else {
          updated++;
        }
      }
    }
    if ((i + BATCH) % 500 === 0 || i + BATCH >= codes.length) {
      console.log('[m_agent/MCLIST] 진행:', Math.min(i + BATCH, codes.length), '/', codes.length);
    }
  }

  console.log('[m_agent/MCLIST] 완료. 업데이트:', updated, '건, Supabase에 없는 코드:', notFound, '건');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
