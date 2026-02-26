import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { readFileSync } from 'fs';
import { join } from 'path';

const DEV_MASTER_ID = 'develope';
/** 목록/랭킹에서 제외하는 테스트용 설계사 코드 (노연지 테스터) */
const RANK_EXCLUDE_CODE = '712345678';

function getAgentsFromLocalJson(): any[] {
  const path = join(process.cwd(), 'src', 'data', 'data.json');
  const raw = readFileSync(path, 'utf-8');
  const data = JSON.parse(raw) as any[];
  return data.filter((a) => a.code !== RANK_EXCLUDE_CODE).map((a) => ({ ...a, role: 'agent' }));
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

    // 개발용 마스터: Firebase 없이 로컬 data.json 사용
    if (session.code === DEV_MASTER_ID) {
      const agentsData = getAgentsFromLocalJson();
      return NextResponse.json({ agents: agentsData, updateDate: '0000' });
    }

    if (!adminDb) {
      console.error('Get agents: Firebase Admin not initialized. Check FIREBASE_SERVICE_ACCOUNT_KEY or firebase-admin-key.json');
      return NextResponse.json(
        { error: '서버 설정 오류: Firebase가 초기화되지 않았습니다. 환경 변수 또는 firebase-admin-key.json을 확인하세요.' },
        { status: 500 }
      );
    }

    const agentsRef = adminDb.collection('agents');

    let agentsData = [];

    if (session.role === 'admin') {
      // 관리자는 전체 설계사 조회 (role이 agent인 사람만, 테스터 712345678 제외)
      const snapshot = await agentsRef.where('role', '==', 'agent').get();
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.code === RANK_EXCLUDE_CODE) return;
        const { password, ...safeData } = data;
        agentsData.push(safeData);
      });
    } else if (session.role === 'manager') {
      // 매니저는 자신이 담당하는 설계사만 조회 (테스터 712345678 제외)
      const mCode = session.targetManagerCode || session.code;
      const snapshot = await agentsRef.where('managerCode', '==', mCode).get();
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.code === RANK_EXCLUDE_CODE) return;
        const { password, ...safeData } = data;
        agentsData.push(safeData);
      });
    } else {
      // 일반 설계사는 본인 데이터만 조회
      const doc = await agentsRef.doc(session.code).get();
      if (doc.exists) {
        const { password, ...safeData } = doc.data() as any;
        agentsData.push(safeData);
      }
    }

    // 업데이트 날짜 (daily MC_LIST 파일명 앞 4자리)
    let updateDate = '0000';
    try {
      const configDoc = await adminDb.collection('config').doc('app').get();
      if (configDoc.exists && configDoc.data()?.updateDate) {
        updateDate = configDoc.data()!.updateDate;
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ agents: agentsData, updateDate });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    const code = (error as { code?: number })?.code;
    console.error('Get agents error:', message, stack ?? '');
    if (code === 8 || String(message).includes('RESOURCE_EXHAUSTED') || String(message).includes('Quota exceeded')) {
      return NextResponse.json(
        { error: 'Firebase 일일 사용 한도를 초과했습니다. 내일 다시 시도하거나 Firebase 콘솔에서 사용량을 확인해 주세요.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
