import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const DEV_MASTER_ID = 'develope';
const DEV_MASTER_PW = 'develope';

export async function POST(request: Request) {
  try {
    const { code, password } = await request.json();

    if (!code || !password) {
      return NextResponse.json({ error: '사번과 비밀번호를 입력해주세요.' }, { status: 400 });
    }

    // 개발용 마스터 계정: Firebase 없이 로그인 (개발/배포 모두 사용 가능)
    if (code === DEV_MASTER_ID && password === DEV_MASTER_PW) {
      const response = NextResponse.json({
        success: true,
        user: {
          code: DEV_MASTER_ID,
          name: '개발자',
          isFirstLogin: false,
          role: 'admin',
          targetManagerCode: null,
        },
      });
      response.cookies.set('auth_session', JSON.stringify({
        code: DEV_MASTER_ID,
        name: '개발자',
        isFirstLogin: false,
        role: 'admin',
        targetManagerCode: null,
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }

    if (!adminDb) {
      console.error('Login: Firebase Admin not initialized. Check FIREBASE_SERVICE_ACCOUNT_KEY or firebase-admin-key.json');
      return NextResponse.json(
        { error: '서버 설정 오류: Firebase가 초기화되지 않았습니다. 관리자에게 문의하세요.' },
        { status: 500 }
      );
    }

    const docRef = adminDb.collection('agents').doc(code);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: '존재하지 않는 사번입니다.' }, { status: 401 });
    }

    const agentData = doc.data();

    if (!agentData) {
      return NextResponse.json({ error: '데이터를 불러올 수 없습니다.' }, { status: 500 });
    }

    if (agentData.password !== password) {
      return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    // 로그인 성공 시 쿠키 설정
    const response = NextResponse.json({
      success: true,
      user: {
        code: agentData.code,
        name: agentData.name,
        isFirstLogin: agentData.isFirstLogin,
        role: agentData.role || 'agent',
        targetManagerCode: agentData.targetManagerCode || null
      }
    });

    response.cookies.set('auth_session', JSON.stringify({
      code: agentData.code,
      name: agentData.name,
      isFirstLogin: agentData.isFirstLogin,
      role: agentData.role || 'agent',
      targetManagerCode: agentData.targetManagerCode || null
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 1주일
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const code = (error as { code?: number })?.code;
    console.error('Login error:', message, error instanceof Error ? error.stack : '');
    // Firestore 할당량 초과 (무료 한도 초과)
    if (code === 8 || String(message).includes('RESOURCE_EXHAUSTED') || String(message).includes('Quota exceeded')) {
      return NextResponse.json(
        { error: 'Firebase 일일 사용 한도를 초과했습니다. 내일 다시 시도하거나 Firebase 콘솔에서 사용량을 확인해 주세요.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
