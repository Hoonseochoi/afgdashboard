import { NextResponse } from "next/server";
import { requireDevelope } from "@/lib/admin-guard";
import {
  supabaseConfigGetApp,
  supabaseConfigGetAll,
  supabaseUploadLogList,
  supabaseUploadHistoryList,
  isSupabaseConfigured,
} from "@/lib/supabase-server";

/** config + upload_log + upload_history 조회 (develope 전용) */
export async function GET() {
  const guard = await requireDevelope();
  if (guard instanceof NextResponse) return guard;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase가 설정되지 않았습니다." },
      { status: 503 }
    );
  }
  try {
    const [configApp, configAll, uploadLog, uploadHistory] = await Promise.all([
      supabaseConfigGetApp(),
      supabaseConfigGetAll(),
      supabaseUploadLogList(100),
      supabaseUploadHistoryList(100),
    ]);
    return NextResponse.json({
      configApp: configApp ?? null,
      configAll,
      uploadLog,
      uploadHistory,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "업로드 로그 조회 실패.", detail: message },
      { status: 500 }
    );
  }
}
