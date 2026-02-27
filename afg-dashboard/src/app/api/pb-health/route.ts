import { NextResponse } from "next/server";
import { pbHealthCheck, getPocketBaseUrl } from "@/lib/pocketbase";

/** PocketBase 연결 상태 확인 (개발/배포 후 연결 테스트용) */
export async function GET() {
  const url = getPocketBaseUrl();
  const health = await pbHealthCheck();
  return NextResponse.json({
    pocketbaseUrl: url,
    ...health,
  });
}
