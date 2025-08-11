import { NextRequest, NextResponse } from "next/server";
import { stateStore } from "@/app/lib/stateStore";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));
    const state = crypto.randomUUID();
    await stateStore.set(`oauth:state:${state}`, JSON.stringify(payload), { ex: 15 * 60 });
    return NextResponse.json({ state });
  } catch (err: any) {
    console.error("[auth-state POST] error:", err);
    return NextResponse.json({ error: "Failed to save state" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const state = req.nextUrl.searchParams.get("state");
    if (!state) return NextResponse.json({ error: "Missing state" }, { status: 400 });
    const key = `oauth:state:${state}`;
    const data = await stateStore.get(key);
    if (!data) return NextResponse.json({ error: "Session expired. Please restart." }, { status: 410 });
    await stateStore.del(key);
    return NextResponse.json(JSON.parse(data));
  } catch (err: any) {
    console.error("[auth-state GET] error:", err);
    return NextResponse.json({ error: "Failed to load state" }, { status: 500 });
  }
}
