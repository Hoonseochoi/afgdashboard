import { NextResponse } from "next/server";
import { requireDevelope } from "@/lib/admin-guard";
import {
  supabaseNoticesList,
  supabaseNoticeInsert,
  isSupabaseConfigured,
} from "@/lib/supabase-server";

/** 공지사항 목록 (develope 전용) */
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
    const list = await supabaseNoticesList();
    return NextResponse.json({ notices: list });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "공지 목록 조회 실패. notices 테이블이 있는지 확인하세요.", detail: message },
      { status: 500 }
    );
  }
}

/** 공지사항 생성 (develope 전용). body 필드 하나만 사용 (제목 없음) */
export async function POST(request: Request) {
  const guard = await requireDevelope();
  if (guard instanceof NextResponse) return guard;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase가 설정되지 않았습니다." },
      { status: 503 }
    );
  }
  try {
    const body = await request.json();
    const content = typeof body.body === "string" ? body.body.trim() : "";
    const target = typeof body.target_audience === "string" ? body.target_audience : "all";
    if (!content) {
      return NextResponse.json(
        { error: "공지사항 내용을 입력해주세요." },
        { status: 400 }
      );
    }
    const notice = await supabaseNoticeInsert({
      title: "공지",
      body: content,
      enabled: body.enabled !== false,
      target_audience: target,
    });
    return NextResponse.json({ notice });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "공지 생성 실패.", detail: message },
      { status: 500 }
    );
  }
}
