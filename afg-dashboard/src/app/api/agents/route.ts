import { NextResponse } from 'next/server';
import {
  appwriteAgentGetByCode,
  appwriteAgentsListAll,
  appwriteConfigGetApp,
  isAppwriteConfigured,
  type AppwriteAgentRecord,
} from '@/lib/appwrite-server';
import { cookies } from 'next/headers';
import { readFileSync } from 'fs';
import { join } from 'path';

const DEV_MASTER_ID = 'develope';
const RANK_EXCLUDE_CODE = '712345678';
const RANK_MONTHS = ['2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'];

type AgentWithPerf = { code?: string; performance?: Record<string, number>; weekly?: Record<string, number> };

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

function toSafeAgent(d: AppwriteAgentRecord) {
  const { password, ...rest } = d;
  return rest;
}

function computeRanks(items: AppwriteAgentRecord[]): Record<string, number[]> {
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

/** MC_LIST 파일 순서(agent-order.json)로 정렬. 없으면 그대로 반환 */
function sortByMcListOrder<T extends { code?: string }>(agents: T[]): T[] {
  try {
    const orderPath = join(process.cwd(), 'src', 'data', 'agent-order.json');
    const raw = readFileSync(orderPath, 'utf-8');
    const { codes } = JSON.parse(raw) as { codes?: string[] };
    if (!Array.isArray(codes) || codes.length === 0) return agents;
    const orderMap = new Map(codes.map((c, i) => [c, i]));
    return [...agents].sort((a, b) => {
      const ia = orderMap.get(a.code ?? '') ?? 999999;
      const ib = orderMap.get(b.code ?? '') ?? 999999;
      return ia - ib;
    });
  } catch {
    return agents;
  }
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

    if (session.code === DEV_MASTER_ID && !isAppwriteConfigured()) {
      const agentsData = getAgentsFromLocalJson();
      return NextResponse.json({ agents: agentsData, updateDate: '0000' });
    }

    if (!isAppwriteConfigured()) {
      return NextResponse.json(
        { error: '서버 설정 오류: Appwrite가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const configApp = await appwriteConfigGetApp();
    const updateDate = configApp?.updateDate ?? '0000';

    if (session.role === 'admin' || session.code === DEV_MASTER_ID) {
      let items = await appwriteAgentsListAll({ filterRole: 'agent' });
      items = mergeFebruaryFix(items);
      const filtered = items.filter((a) => a.code !== RANK_EXCLUDE_CODE);
      let agentsData = filtered.map(toSafeAgent);
      agentsData = sortByMcListOrder(agentsData);
      const ranks = computeRanks(items);
      return NextResponse.json({ agents: agentsData, updateDate, ranks });
    }

    if (session.role === 'manager') {
      const mCode = session.targetManagerCode || session.code || '';
      let items = await appwriteAgentsListAll({ filterManagerCode: mCode });
      items = mergeFebruaryFix(items);
      const filtered = items.filter((a) => a.code !== RANK_EXCLUDE_CODE);
      let agentsData = filtered.map(toSafeAgent);
      agentsData = sortByMcListOrder(agentsData);
      return NextResponse.json({ agents: agentsData, updateDate });
    }

    let agent = await appwriteAgentGetByCode(session.code!);
    if (agent && agent.code !== RANK_EXCLUDE_CODE) {
      const merged = mergeFebruaryFix([agent]);
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
