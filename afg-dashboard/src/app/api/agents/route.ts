import { NextResponse } from 'next/server';
import {
  supabaseAgentGetByCode,
  supabaseAgentsListAll,
  supabaseConfigGetApp,
  isSupabaseConfigured,
  type SupabaseAgentRecord,
} from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { readFileSync } from 'fs';
import { join } from 'path';

const DEV_MASTER_ID = 'develope';
const RANK_EXCLUDE_CODE = '712345678';
const RANK_MONTHS = ['2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'];

type AgentWithPerf = { code?: string; performance?: Record<string, number> | null; weekly?: Record<string, number> | null };

/** 2월 마감 fix 데이터(february_closed.json)로 2026-01, 2026-02만 덮어쓰기. weekly는 덮지 않음(3월 탭에서 당월 1주차 등이 유지되도록) */
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

/** 3월(2026-03) 매출 순 정렬 */
function sortByMarchPerformance<T extends { code?: string; performance?: Record<string, number> | null }>(agents: T[]): T[] {
  return [...agents].sort((a, b) => {
    const va = a.performance?.['2026-03'] ?? 0;
    const vb = b.performance?.['2026-03'] ?? 0;
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

    let session: { role?: string; code?: string; targetManagerCode?: string };
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    if (session.code === DEV_MASTER_ID && !isSupabaseConfigured()) {
      const agentsData = getAgentsFromLocalJson();
      return NextResponse.json({ agents: agentsData, updateDate: '0000' });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: '서버 설정 오류: Supabase가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const configApp = await supabaseConfigGetApp();
    const updateDate = configApp?.updateDate ?? '0000';

    if (session.role === 'admin' || session.code === DEV_MASTER_ID) {
      let items = await supabaseAgentsListAll({ filterRole: 'agent' });
      items = mergeFebruaryFix(items) as SupabaseAgentRecord[];
      const filtered = items.filter((a) => a.code !== RANK_EXCLUDE_CODE);
      let agentsData = filtered.map(toSafeAgent);
      agentsData = sortByMarchPerformance(agentsData);
      const ranks = computeRanks(items);
      return NextResponse.json({ agents: agentsData, updateDate, ranks });
    }

    if (session.code === '722031500') {
      const allowedBranches = ['우리'];
      let items = await supabaseAgentsListAll({ filterRole: 'agent' });
      items = mergeFebruaryFix(items) as SupabaseAgentRecord[];
      const filtered = items.filter((a) => {
        if (a.code === RANK_EXCLUDE_CODE || !a.branch) return false;
        return allowedBranches.some((b) => String(a.branch).includes(b));
      });
      let agentsData = filtered.map(toSafeAgent);
      agentsData = sortByMarchPerformance(agentsData);
      return NextResponse.json({ agents: agentsData, updateDate });
    }

    if (session.role === 'manager') {
      const mCode = session.targetManagerCode || session.code || '';
      let items = await supabaseAgentsListAll({ filterManagerCode: mCode });
      items = mergeFebruaryFix(items) as SupabaseAgentRecord[];
      const filtered = items.filter((a) => a.code !== RANK_EXCLUDE_CODE);
      let agentsData = filtered.map(toSafeAgent);
      agentsData = sortByMarchPerformance(agentsData);
      return NextResponse.json({ agents: agentsData, updateDate });
    }

    let agent = await supabaseAgentGetByCode(session.code!);
    if (agent && agent.code !== RANK_EXCLUDE_CODE) {
      const merged = mergeFebruaryFix([agent]) as SupabaseAgentRecord[];
      agent = merged[0];
      return NextResponse.json({ agents: [toSafeAgent(agent)], updateDate });
    }
    return NextResponse.json({ agents: [], updateDate });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Get agents error:', message);
    return NextResponse.json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
