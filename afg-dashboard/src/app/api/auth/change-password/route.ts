import { NextResponse } from 'next/server';
import { pbAdminAuth, pbAgentGetByCode, pbRecordUpdateWithAuth } from '@/lib/pocketbase';
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

    if (!process.env.POCKETBASE_ADMIN_EMAIL || !process.env.POCKETBASE_ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: '서버 설정 오류: PocketBase가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const agent = await pbAgentGetByCode(session.code);
    if (!agent) {
      return NextResponse.json({ error: '계정을 찾을 수 없습니다.' }, { status: 404 });
    }
    const token = await pbAdminAuth();
    await pbRecordUpdateWithAuth('agents', agent.id, token, {
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
