import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { code, password } = await request.json();

    if (!code || !password) {
      return NextResponse.json({ error: '사번과 비밀번호를 입력해주세요.' }, { status: 400 });
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
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
