/**
 * 대시보드 초기 로드용 - 세션 + agents + updateDate + ranks 를 한 번에 반환.
 * Supabase agents 테이블 사용.
 */
import { NextResponse } from 'next/server';
import {
  supabaseAgentGetByCode,
  supabaseAgentsListAll,
  supabaseConfigGetApp,
  isSupabaseConfigured,
  type SupabaseAgentRecord,
} from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const DEV_MASTER_ID = 'develope';
const RANK_EXCLUDE_CODE = '712345678';
const RANK_MONTHS = ['2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'];

type AgentWithPerf = { code?: string; performance?: Record<string, number> | null; weekly?: Record<string, number> | null };

/** 2월 마감 fix 데이터(february_closed.json)로 2026-01, 2026-02만 덮어쓰기. weekly는 덮지 않음(3월 탭 당월 1주차 유지) */
function mergeFebruaryFix<T extends AgentWithPerf>(agents: T[]): T[] {
  try {
    const fixPath = join(process.cwd(), 'src', 'data', 'february_closed.json');
    const raw = readFileSync(fixPath, 'utf-8');
    const fix = JSON.parse(raw) as Record<string, { performance: Record<string, number>; weekly?: Record<string, number> }>;
    return agents.map((a) => {
      const code = a.code ?? '';
      const closed = fix[code];
      if (!closed) return a;
      const performance = { ...a.performance, ...closed.performance };
      return { ...a, performance };
    });
  } catch {
    return agents;
  }
}

function normalizeCode(c: string | number | null | undefined): string {
  const s = String(c ?? '').trim();
  const n = Number(s);
  if (!Number.isNaN(n) && n >= 0 && n < 1e15) return String(Math.round(n));
  return s;
}

let mcListBranchCache:
  | {
      latestFile: string;
      map: Map<string, string>;
    }
  | null = null;

/** data/daily 폴더의 최신 MC_LIST_OUT 엑셀에서 code→현재대리점지사명 맵 생성 (DB는 변경하지 않음, 응답에서만 branch 덮어쓰기) */
function loadMcListBranchMap(): Map<string, string> {
  try {
    const dailyDir = join(process.cwd(), '..', 'data', 'daily');
    const files = readdirSync(dailyDir)
      .filter((f) => /^\d{4}MC_LIST_OUT_.*\.xlsx$/i.test(f))
      .sort();
    if (files.length === 0) return new Map();
    const latestFile = join(dailyDir, files[files.length - 1]);
    if (mcListBranchCache && mcListBranchCache.latestFile === latestFile) {
      return mcListBranchCache.map;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require('xlsx');
    const wb = XLSX.readFile(latestFile);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const headerRow = 1;
    const map = new Map<string, string>();
    for (let r = headerRow + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      const codeRaw = row[5]; // 현재대리점설계사조직코드 (F열, 0-based 5)
      const branchRaw = row[37]; // 현재대리점지사명 (AL열, 0-based 37)
      const code = normalizeCode(codeRaw);
      const branch = String(branchRaw ?? '').trim();
      if (!code || code.length < 4 || !branch) continue;
      map.set(code, branch);
    }
    mcListBranchCache = { latestFile, map };
    return map;
  } catch {
    return new Map();
  }
}

function applyMcListBranch<T extends { code?: string; branch?: string | null }>(items: T[]): T[] {
  // 현재는 Supabase agents.branch 에 이미 스튜디오/지사명이 들어 있으므로,
  // MC_LIST 기반으로 branch 를 덮어쓰지 않는다. (향후 필요 시를 대비해 훅만 남김)
  return items;
}

function getAgentsFromLocalJson(): any[] {
  const dataPath = join(process.cwd(), 'src', 'data', 'data.json');
  const raw = readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(raw) as any[];
  return data.filter((a) => a.code !== RANK_EXCLUDE_CODE).map((a) => ({ ...a, role: 'agent' }));
}

function toSafeAgent(d: SupabaseAgentRecord) {
  const { password, ...rest } = d;
  return rest;
}

function computeRanks(items: SupabaseAgentRecord[]): Record<string, number[]> {
  const allPerformances: Record<string, number[]> = Object.fromEntries(RANK_MONTHS.map((m) => [m, []]));
  items.forEach((data) => {
    if (data.code === RANK_EXCLUDE_CODE) return;
    if (data.performance) {
      RANK_MONTHS.forEach((month) => {
        allPerformances[month].push(data.performance![month] ?? 0);
      });
    }
  });
  RANK_MONTHS.forEach((month) => {
    allPerformances[month].sort((a, b) => b - a);
  });
  return allPerformances;
}

/** 3월(2026-03) 매출 순 정렬: 당월 인정실적 높은 순 */
const SORT_MONTH = '2026-03';
function sortByMarchPerformance<T extends { code?: string; performance?: Record<string, number> | null }>(agents: T[]): T[] {
  return [...agents].sort((a, b) => {
    const va = a.performance?.[SORT_MONTH] ?? 0;
    const vb = b.performance?.[SORT_MONTH] ?? 0;
    if (vb !== va) return vb - va;
    return (a.code ?? '').localeCompare(b.code ?? '');
  });
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth_session');

    if (!sessionCookie) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    let session: { role?: string; code?: string; targetManagerCode?: string; name?: string; isFirstLogin?: boolean };
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const user = {
      code: session.code,
      name: session.name,
      isFirstLogin: session.isFirstLogin,
      role: session.role,
      targetManagerCode: session.targetManagerCode,
    };

    if (session.code === DEV_MASTER_ID && !isSupabaseConfigured()) {
      const agentsData = getAgentsFromLocalJson();
      return NextResponse.json({ user, agents: agentsData, updateDate: '0000' });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: '서버 설정 오류: Supabase가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const configApp = await supabaseConfigGetApp();
    const updateDate = configApp?.updateDate ?? '0000';

    // 특수 코드: 105203241 → 지정된 지사만 조회
    if (session.code === '105203241') {
      const allowedBranches = ['송도스튜디오', '에이스스튜디오', '엔타스2스튜디오'];
      let allItems = await supabaseAgentsListAll({ filterRole: 'agent' });
      allItems = mergeFebruaryFix(allItems) as SupabaseAgentRecord[];
      allItems = applyMcListBranch(allItems);
      const filtered = allItems.filter((a) => {
        if (a.code === RANK_EXCLUDE_CODE || !a.branch) return false;
        const branchName = String(a.branch);
        return allowedBranches.some((b) => branchName.includes(b));
      });
      let agentsData = filtered.map(toSafeAgent);
      agentsData = sortByMarchPerformance(agentsData);

      let allForRanks = await supabaseAgentsListAll({ filterRole: 'agent' });
      allForRanks = mergeFebruaryFix(allForRanks) as SupabaseAgentRecord[];
      allForRanks = applyMcListBranch(allForRanks);
      const ranks = computeRanks(allForRanks);
      const partnerAgents = allForRanks
        .filter(
          (a) =>
            a.code !== RANK_EXCLUDE_CODE &&
            a.branch &&
            String(a.branch).includes('파트너'),
        )
        .map(toSafeAgent);

      return NextResponse.json({
        user,
        agents: agentsData,
        updateDate,
        ranks,
        partnerAgents,
      });
    }

    // 특수 코드: 722031500 (이도경 지점장) → "우리" 지점 설계사만 조회, 검색/리스트 오픈
    if (session.code === '722031500') {
      const allowedBranches = ['우리'];
      let allItems = await supabaseAgentsListAll({ filterRole: 'agent' });
      allItems = mergeFebruaryFix(allItems) as SupabaseAgentRecord[];
      allItems = applyMcListBranch(allItems);
      const filtered = allItems.filter((a) => {
        if (a.code === RANK_EXCLUDE_CODE || !a.branch) return false;
        const branchName = String(a.branch);
        return allowedBranches.some((b) => branchName.includes(b));
      });
      let agentsData = filtered.map(toSafeAgent);
      agentsData = sortByMarchPerformance(agentsData);

      let allForRanks = await supabaseAgentsListAll({ filterRole: 'agent' });
      allForRanks = mergeFebruaryFix(allForRanks) as SupabaseAgentRecord[];
      allForRanks = applyMcListBranch(allForRanks);
      const ranks = computeRanks(allForRanks);
      const partnerAgents = allForRanks
        .filter(
          (a) =>
            a.code !== RANK_EXCLUDE_CODE &&
            a.branch &&
            String(a.branch).includes('파트너'),
        )
        .map(toSafeAgent);

      return NextResponse.json({
        user,
        agents: agentsData,
        updateDate,
        ranks,
        partnerAgents,
      });
    }

    // 특수 코드: 102203009 (손영상 지점장) → "엔타스5스튜디오" 지사 설계사만 조회
    if (session.code === '102203009') {
      const allowedBranches = ['엔타스5스튜디오'];
      let allItems = await supabaseAgentsListAll({ filterRole: 'agent' });
      allItems = mergeFebruaryFix(allItems) as SupabaseAgentRecord[];
      allItems = applyMcListBranch(allItems);
      const filtered = allItems.filter((a) => {
        if (a.code === RANK_EXCLUDE_CODE || !a.branch) return false;
        const branchName = String(a.branch);
        return allowedBranches.some((b) => branchName.includes(b));
      });
      let agentsData = filtered.map(toSafeAgent);
      agentsData = sortByMarchPerformance(agentsData);

      let allForRanks = await supabaseAgentsListAll({ filterRole: 'agent' });
      allForRanks = mergeFebruaryFix(allForRanks) as SupabaseAgentRecord[];
      allForRanks = applyMcListBranch(allForRanks);
      const ranks = computeRanks(allForRanks);
      const partnerAgents = allForRanks
        .filter(
          (a) =>
            a.code !== RANK_EXCLUDE_CODE &&
            a.branch &&
            String(a.branch).includes('파트너'),
        )
        .map(toSafeAgent);

      return NextResponse.json({
        user,
        agents: agentsData,
        updateDate,
        ranks,
        partnerAgents,
      });
    }

    if (session.role === 'admin' || session.code === DEV_MASTER_ID) {
      let items = await supabaseAgentsListAll({ filterRole: 'agent' });
      items = mergeFebruaryFix(items) as SupabaseAgentRecord[];
      items = applyMcListBranch(items);
      const filtered = items.filter((a) => a.code !== RANK_EXCLUDE_CODE);
      let agentsData = filtered.map(toSafeAgent);
      agentsData = sortByMarchPerformance(agentsData);
      const ranks = computeRanks(items);
      const partnerAgents = agentsData.filter((a) => a.branch && String(a.branch).includes('파트너'));
      return NextResponse.json({ user, agents: agentsData, updateDate, ranks, partnerAgents });
    }

    if (session.role === 'manager') {
      const mCode = session.targetManagerCode || session.code || '';
      let items = await supabaseAgentsListAll({ filterManagerCode: mCode });
      items = mergeFebruaryFix(items) as SupabaseAgentRecord[];
      items = applyMcListBranch(items);
      const filtered = items.filter((a) => a.code !== RANK_EXCLUDE_CODE);
      let agentsData = filtered.map(toSafeAgent);
      agentsData = sortByMarchPerformance(agentsData);
      let allForRanks = await supabaseAgentsListAll({ filterRole: 'agent' });
      allForRanks = mergeFebruaryFix(allForRanks) as SupabaseAgentRecord[];
      allForRanks = applyMcListBranch(allForRanks);
      const ranks = computeRanks(allForRanks);
      const partnerAgents = allForRanks
        .filter((a) => a.code !== RANK_EXCLUDE_CODE && a.branch && String(a.branch).includes('파트너'))
        .map(toSafeAgent);
      return NextResponse.json({ user, agents: agentsData, updateDate, ranks, partnerAgents });
    }

    let agent = await supabaseAgentGetByCode(session.code!);
    if (agent && agent.code !== RANK_EXCLUDE_CODE) {
      const merged = mergeFebruaryFix([agent]) as SupabaseAgentRecord[];
      agent = applyMcListBranch(merged)[0];
      let allForRanks = await supabaseAgentsListAll({ filterRole: 'agent' });
      allForRanks = mergeFebruaryFix(allForRanks) as SupabaseAgentRecord[];
      allForRanks = applyMcListBranch(allForRanks);
      const ranks = computeRanks(allForRanks);
      const partnerAgents = allForRanks
        .filter((a) => a.code !== RANK_EXCLUDE_CODE && a.branch && String(a.branch).includes('파트너'))
        .map(toSafeAgent);
      return NextResponse.json({ user, agents: [toSafeAgent(agent)], updateDate, ranks, partnerAgents });
    }
    return NextResponse.json({ user, agents: [], updateDate, partnerAgents: [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Dashboard GET error:', message);
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: '데이터를 불러오는 중 오류가 발생했습니다.',
        ...(isDev && { detail: message }),
      },
      { status: 500 }
    );
  }
}
