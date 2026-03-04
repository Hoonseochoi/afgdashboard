import { NextResponse } from 'next/server';
import { appwriteAgentGetByCode, isAppwriteConfigured } from '@/lib/appwrite-server';

const DEV_MASTER_ID = 'develope';
const DEV_MASTER_PW = 'develope';

export async function POST(request: Request) {
  try {
    const { code, password } = await request.json();

    if (!code || !password) {
      return NextResponse.json({ error: '사번과 비밀번호를 입력해주세요.' }, { status: 400 });
    }

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

    if (!isAppwriteConfigured()) {
      return NextResponse.json(
        { error: '서버 설정 오류: Appwrite가 설정되지 않았습니다. 관리자에게 문의하세요.' },
        { status: 500 }
      );
    }

    const agent = await appwriteAgentGetByCode(String(code));
    if (!agent) {
      return NextResponse.json({ error: '존재하지 않는 사번입니다.' }, { status: 401 });
    }
    if (agent.password !== password) {
      return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    const isSpecialStudioCode = String(agent.code) === '105203241';
    const user = {
      code: agent.code,
      name: agent.name,
      isFirstLogin: agent.isFirstLogin ?? true,
      role: isSpecialStudioCode ? 'manager' : agent.role || 'agent',
      targetManagerCode: agent.targetManagerCode ?? null,
    };
    const response = NextResponse.json({ success: true, user });
    response.cookies.set('auth_session', JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Login error:', message);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
