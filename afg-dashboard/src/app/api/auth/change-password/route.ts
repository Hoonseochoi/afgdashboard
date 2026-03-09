import { NextResponse } from 'next/server';
import {
  supabaseAgentGetByCode,
  supabaseAgentUpdate,
  supabaseMAgentLoginUpsert,
  isSupabaseConfigured,
} from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth_session');

    if (!sessionCookie) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json({ error: '유효한 비밀번호를 입력해주세요.' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: '서버 설정 오류: Supabase가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // m_agent(지점) 로그인 계정 비밀번호 변경
    if (session.role === 'm_agent_manager' && session.m_agentValue) {
      await supabaseMAgentLoginUpsert(session.m_agentValue, newPassword);
      const newSession = { ...session, isFirstLogin: false };
      const response = NextResponse.json({ success: true });
      response.cookies.set('auth_session', JSON.stringify(newSession), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }

    const agent = await supabaseAgentGetByCode(session.code);
    if (!agent) {
      return NextResponse.json({ error: '계정을 찾을 수 없습니다.' }, { status: 404 });
    }
    await supabaseAgentUpdate(agent.code, {
      password: newPassword,
      isFirstLogin: false,
    });
    const newSession = { ...session, isFirstLogin: false };
    const response = NextResponse.json({ success: true });
    response.cookies.set('auth_session', JSON.stringify(newSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
