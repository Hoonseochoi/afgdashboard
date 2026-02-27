import { NextResponse } from 'next/server';
import { isAppwriteConfigured, appwriteConfigGetApp } from '@/lib/appwrite-server';

/** Appwrite 연결 상태 확인 (배포/연결 테스트용) */
export async function GET() {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Appwrite env not configured (API key, database, collections)' },
      { status: 503 }
    );
  }
  try {
    const config = await appwriteConfigGetApp();
    return NextResponse.json({
      ok: true,
      message: 'Appwrite connected',
      updateDate: config?.updateDate ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
