/**
 * 데일리 업데이트 반영 여부 확인용 경량 API.
 * 세션 유효 시 config의 updateDate만 반환 (폴링용).
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseConfigGetApp, isSupabaseConfigured } from '@/lib/supabase-server';

const DEV_MASTER_ID = 'develope';

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('auth_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  let session: { code?: string };
  try {
    session = JSON.parse(sessionCookie.value);
  } catch {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  if (session?.code === DEV_MASTER_ID && !isSupabaseConfigured()) {
    return NextResponse.json({ updateDate: '0000' });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ updateDate: '0000' });
  }

  const configApp = await supabaseConfigGetApp();
  const updateDate = configApp?.updateDate ?? '0000';
  return NextResponse.json({ updateDate });
}
