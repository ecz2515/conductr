import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { randomUUID } from "crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json(); // { albums, canonical }
    if (!body?.albums) {
      return NextResponse.json({ error: "Missing albums" }, { status: 400 });
    }

    const id = randomUUID();
    // Store for 15 minutes; adjust if you like.
    await redis.set(`authstate:${id}`, body, { ex: 15 * 60 });

    return NextResponse.json({ state: id });
  } catch (err: any) {
    console.error("[auth-state] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const data = await redis.get(`authstate:${id}`);
    if (!data) {
      return NextResponse.json({ error: "Not found or expired" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[auth-state] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
