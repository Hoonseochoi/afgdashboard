import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth_session');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const agentsRef = adminDb.collection('agents');

    let agentsData = [];

    if (session.role === 'admin') {
      // 관리자는 전체 설계사 조회 (role이 agent인 사람만)
      const snapshot = await agentsRef.where('role', '==', 'agent').get();
      snapshot.forEach((doc: any) => {
        const { password, ...safeData } = doc.data();
        agentsData.push(safeData);
      });
    } else if (session.role === 'manager') {
      // 매니저는 자신이 담당하는 설계사만 조회
      // 테스트 매니저의 경우 targetManagerCode를 사용, 아니면 본인 코드 사용
      const mCode = session.targetManagerCode || session.code;
      const snapshot = await agentsRef.where('managerCode', '==', mCode).get();
      snapshot.forEach((doc: any) => {
        const { password, ...safeData } = doc.data();
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
  } catch (error) {
    console.error('Get agents error:', error);
    return NextResponse.json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
