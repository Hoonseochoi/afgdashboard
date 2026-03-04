/**
 * 캡처용 로컬 데이터 API (로그인 없음)
 * data/capture/dashboard.json 내용을 그대로 반환.
 * bulk-capture 스크립트에서 사용.
 */
import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const dataPath = join(process.cwd(), 'data', 'capture', 'dashboard.json');
    if (!existsSync(dataPath)) {
      return NextResponse.json(
        { error: 'data/capture/dashboard.json 이 없습니다. scripts/capture-dump-dashboard.js 를 먼저 실행하세요.' },
        { status: 404 }
      );
    }
    const raw = readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('capture-data GET error:', message);
    return NextResponse.json({ error: '캡처 데이터 읽기 실패', detail: message }, { status: 500 });
  }
}
