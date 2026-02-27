import { NextResponse } from 'next/server';
import { appwriteAgentsListAll, isAppwriteConfigured } from '@/lib/appwrite-server';
import { cookies } from 'next/headers';
import { readFileSync } from 'fs';
import { join } from 'path';

const DEV_MASTER_ID = 'develope';
const RANK_EXCLUDE_CODE = '712345678';
const RANK_MONTHS = ['2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02'];

function getRanksFromLocalJson(): Record<string, number[]> {
  const dataPath = join(process.cwd(), 'src', 'data', 'data.json');
  const raw = readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(raw) as any[];
  const allPerformances: Record<string, number[]> = Object.fromEntries(RANK_MONTHS.map((m) => [m, []]));
  data.forEach((agent) => {
    if (agent.code === RANK_EXCLUDE_CODE) return;
    if (agent.performance) {
      RANK_MONTHS.forEach((month) => {
        allPerformances[month].push(agent.performance[month] || 0);
      });
    }
  });
  RANK_MONTHS.forEach((month) => {
    allPerformances[month].sort((a, b) => b - a);
  });
  return allPerformances;
}

function computeRanks(
  items: { code?: string; performance?: Record<string, number> }[]
): Record<string, number[]> {
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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth_session');
    let session: { code?: string } | null = null;
    if (sessionCookie) {
      try {
        session = JSON.parse(sessionCookie.value);
      } catch {
        // ignore
      }
    }

    if (session?.code === DEV_MASTER_ID && !isAppwriteConfigured()) {
      return NextResponse.json({ ranks: getRanksFromLocalJson() });
    }

    if (!isAppwriteConfigured()) {
      return NextResponse.json(
        { error: '서버 설정 오류: Appwrite가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const items = await appwriteAgentsListAll({ filterRole: 'agent' });
    const ranks = computeRanks(items);
    return NextResponse.json({ ranks });
  } catch (error) {
    console.error('Get ranks error:', error);
    return NextResponse.json({ error: '순위 데이터를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
