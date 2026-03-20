import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import webpush from "web-push";
import {
  supabasePushSubscriptionsGetAll,
  supabasePushSubscriptionDelete,
} from "@/lib/supabase-server";

// VAPID 설정
webpush.setVapidDetails(
  "mailto:admin@afg-dashboard.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

async function getSessionCode(): Promise<string | null> {
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, body: msgBody, url, apiKey } = body;

    // 인증: develope 계정 쿠키 OR 내부 api key
    const isInternal = !!process.env.PUSH_API_SECRET && apiKey === process.env.PUSH_API_SECRET;
    if (!isInternal) {
      const sessionCode = await getSessionCode();
      if (sessionCode !== "develope") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (!title || !msgBody) {
      return NextResponse.json({ error: "title and body required" }, { status: 400 });
    }

    const subscriptions = await supabasePushSubscriptionsGetAll();
    if (subscriptions.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: "구독자 없음" });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const notifUrl = url || `${appUrl}/direct`;

    const payload = JSON.stringify({ title, body: msgBody, url: notifUrl });
    let sent = 0;
    let failed = 0;
    const toDelete: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth_key },
            },
            payload
          );
          sent++;
        } catch (err: any) {
          // 만료/무효 구독은 삭제 대상
          if (err.statusCode === 410 || err.statusCode === 404) {
            toDelete.push(sub.endpoint);
          }
          failed++;
        }
      })
    );

    // 만료된 구독 정리 (fire and forget)
    if (toDelete.length > 0) {
      await Promise.allSettled(toDelete.map((ep) => supabasePushSubscriptionDelete(ep)));
    }

    return NextResponse.json({ ok: true, sent, failed, total: subscriptions.length });
  } catch (e: any) {
    console.error("push/send POST error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
