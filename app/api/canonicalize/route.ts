// app/api/canonicalize/route.ts

import { NextRequest, NextResponse } from "next/server";
import { nlpToCanonicalPiece } from "@/app/utils/nlpconverter";

// POST only
export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    const canonical = await nlpToCanonicalPiece(query);

    return NextResponse.json(canonical);
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to canonicalize", details: e.message },
      { status: 500 }
    );
  }
}
