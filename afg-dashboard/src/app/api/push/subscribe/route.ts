import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  supabasePushSubscriptionUpsert,
  supabasePushSubscriptionDelete,
} from "@/lib/supabase-server";

async function getUserCode(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("auth_session");
    if (!sessionCookie) return null;
    const session = JSON.parse(sessionCookie.value);
    return session.code ?? null;
  } catch {
    return null;
  }
}

// POST: 구독 저장
export async function POST(req: NextRequest) {
  try {
    const userCode = await getUserCode();
    if (!userCode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { endpoint, keys } = body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }
    await supabasePushSubscriptionUpsert(userCode, { endpoint, keys });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("push/subscribe POST error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE: 구독 삭제
export async function DELETE(req: NextRequest) {
  try {
    const userCode = await getUserCode();
    if (!userCode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { endpoint } = body;
    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }
    await supabasePushSubscriptionDelete(endpoint);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("push/subscribe DELETE error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
