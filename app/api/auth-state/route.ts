import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { randomUUID } from "crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: NextRequest) {
  try {
    console.log("[auth-state] POST request received");
    const body = await req.json(); // { albums, canonical }
    console.log("[auth-state] POST request body:", body);

    if (!body?.albums) {
      console.warn("[auth-state] POST missing albums in request body");
      return NextResponse.json({ error: "Missing albums" }, { status: 400 });
    }

    const id = randomUUID();
    console.log("[auth-state] Generated UUID:", id);

    // Store for 15 minutes; adjust if you like.
    await redis.set(`authstate:${id}`, body, { ex: 15 * 60 });
    console.log("[auth-state] Stored data in Redis with key:", `authstate:${id}`);

    return NextResponse.json({ state: id });
  } catch (err: any) {
    console.error("[auth-state] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log("[auth-state] GET request received");
    const id = new URL(req.url).searchParams.get("id");
    console.log("[auth-state] GET request id:", id);

    if (!id) {
      console.warn("[auth-state] GET missing id in request");
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const data = await redis.get(`authstate:${id}`);
    console.log("[auth-state] Retrieved data from Redis for key:", `authstate:${id}`, "Data:", data);

    if (!data) {
      console.warn("[auth-state] Data not found or expired for id:", id);
      return NextResponse.json({ error: "Not found or expired" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[auth-state] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
