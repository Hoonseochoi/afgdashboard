import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const DEV_MASTER_ID = "develope";

export type AdminSession = { code: string; name?: string; role?: string };

/** develope 계정만 허용. 아니면 403 JSON 반환. 성공 시 세션 객체 반환 */
export async function requireDevelope(): Promise<
  NextResponse | { session: AdminSession }
> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("auth_session");
  if (!sessionCookie) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }
  let session: AdminSession;
  try {
    session = JSON.parse(sessionCookie.value) as AdminSession;
  } catch {
    return NextResponse.json(
      { error: "세션이 유효하지 않습니다." },
      { status: 401 }
    );
  }
  if (session.code !== DEV_MASTER_ID) {
    return NextResponse.json(
      { error: "관리자(develope) 계정만 접근할 수 있습니다." },
      { status: 403 }
    );
  }
  return { session };
}
