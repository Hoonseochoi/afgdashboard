/**
 * 1월 파트너 시상 고정 데이터 (january_partner_prize.json) 코드별 조회
 * GET /api/january-partner-prize?code=xxx
 */
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

function normalizeCode(c: string | null | undefined): string {
  const s = String(c ?? "").trim();
  const n = Number(s);
  if (!Number.isNaN(n) && n >= 0 && n < 1e15) return String(Math.round(n));
  return s;
}

let cache: Record<string, unknown> | null = null;

function getJanuaryPartnerData(): Record<string, unknown> {
  if (cache) return cache;
  try {
    const filePath = join(process.cwd(), "src", "data", "january_partner_prize.json");
    const raw = readFileSync(filePath, "utf-8");
    cache = JSON.parse(raw) as Record<string, unknown>;
    return cache ?? {};
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = normalizeCode(searchParams.get("code") ?? "");
  if (!code) {
    return NextResponse.json({});
  }
  const data = getJanuaryPartnerData();
  const row = data[code];
  return NextResponse.json(row ?? {});
}
