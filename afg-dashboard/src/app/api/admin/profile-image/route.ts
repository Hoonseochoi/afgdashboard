import { NextResponse } from "next/server";
import { requireDevelope } from "@/lib/admin-guard";
import {
  supabaseAgentProfileImagesGetAll,
  supabaseAgentProfileImageUpsert,
  isSupabaseConfigured,
} from "@/lib/supabase-server";

/** 프로필 이미지 매핑 전체 조회 (develope 전용) */
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
    const images = await supabaseAgentProfileImagesGetAll();
    return NextResponse.json({ images });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "프로필 이미지 조회 실패. agent_profile_images 테이블 확인.", detail: message },
      { status: 500 }
    );
  }
}

/** 특정 설계사 프로필 이미지 설정 (develope 전용). body: { code: string, imageUrl: string } */
export async function PATCH(request: Request) {
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
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    if (!code) {
      return NextResponse.json({ error: "설계사 코드(code)가 필요합니다." }, { status: 400 });
    }
    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl이 필요합니다. (data URL 또는 URL)" }, { status: 400 });
    }
    await supabaseAgentProfileImageUpsert(code, imageUrl);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "프로필 이미지 저장 실패.", detail: message },
      { status: 500 }
    );
  }
}
