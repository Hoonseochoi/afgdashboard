import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      "..",
      "data",
      "fix",
      "26031w_prize.jpg",
    );
    const file = await fs.readFile(filePath);
    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error:
          e instanceof Error ? e.message : "Failed to load prize guide image",
      },
      { status: 500 },
    );
  }
}

