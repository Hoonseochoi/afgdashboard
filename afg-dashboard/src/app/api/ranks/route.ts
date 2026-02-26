import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { readFileSync } from 'fs';
import { join } from 'path';

const DEV_MASTER_ID = 'develope';
/** 랭킹/목록에서 제외하는 테스트용 설계사 코드 (노연지 테스터) */
const RANK_EXCLUDE_CODE = '712345678';

function getRanksFromLocalJson(): Record<string, number[]> {
  const path = join(process.cwd(), 'src', 'data', 'data.json');
  const raw = readFileSync(path, 'utf-8');
  const data = JSON.parse(raw) as any[];
  const allPerformances: Record<string, number[]> = {
    '2025-08': [],
    '2025-09': [],
    '2025-10': [],
    '2025-11': [],
    '2025-12': [],
    '2026-01': [],
    '2026-02': [],
  };
  data.forEach((agent) => {
    if (agent.code === RANK_EXCLUDE_CODE) return;
    if (agent.performance) {
      Object.keys(allPerformances).forEach((month: string) => {
        allPerformances[month].push(agent.performance[month] || 0);
      });
    }
  });
  Object.keys(allPerformances).forEach((month: string) => {
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

    if (session?.code === DEV_MASTER_ID) {
      const ranks = getRanksFromLocalJson();
      return NextResponse.json({ ranks });
    }

    const agentsRef = adminDb.collection('agents');
    const snapshot = await agentsRef.where('role', '==', 'agent').get();

    const allPerformances: Record<string, number[]> = {
      '2025-08': [],
      '2025-09': [],
      '2025-10': [],
      '2025-11': [],
      '2025-12': [],
      '2026-01': [],
      '2026-02': [],
    };

    snapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.code === RANK_EXCLUDE_CODE) return;
      if (data.performance) {
        Object.keys(allPerformances).forEach((month: string) => {
          allPerformances[month].push(data.performance[month] || 0);
        });
      }
    });

    Object.keys(allPerformances).forEach((month: string) => {
      allPerformances[month].sort((a, b) => b - a);
    });

    return NextResponse.json({ ranks: allPerformances });
  } catch (error) {
    console.error('Get ranks error:', error);
    return NextResponse.json({ error: '순위 데이터를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
