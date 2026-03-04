import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseConfigGetApp } from '@/lib/supabase-server';

/** DB 연결 상태 확인 (Supabase, 기존 /api/appwrite-health 경로 유지) */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Supabase env not configured (URL, service_role key)' },
      { status: 503 }
    );
  }
  try {
    const config = await supabaseConfigGetApp();
    return NextResponse.json({
      ok: true,
      message: 'Supabase connected',
      updateDate: config?.updateDate ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
