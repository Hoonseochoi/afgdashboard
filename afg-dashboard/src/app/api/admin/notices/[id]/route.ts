import { NextResponse } from "next/server";
import { requireDevelope } from "@/lib/admin-guard";
import { supabaseNoticeUpdate } from "@/lib/supabase-server";

/** 공지 수정: on/off, 대상, 제목/내용 (develope 전용) */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDevelope();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }
  try {
    const body = await _request.json();
    const patch: { title?: string; body?: string; enabled?: boolean; target_audience?: string } = {};
    if (typeof body.title === "string") patch.title = body.title.trim();
    if (typeof body.body === "string") patch.body = body.body.trim();
    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
    if (typeof body.target_audience === "string") patch.target_audience = body.target_audience;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "수정할 필드가 없습니다." }, { status: 400 });
    }
    await supabaseNoticeUpdate(id, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "공지 수정 실패.", detail: message },
      { status: 500 }
    );
  }
}
