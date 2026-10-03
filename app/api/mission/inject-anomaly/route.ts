import { NextResponse } from "next/server";
import { proxyJson, BackendUnreachableError } from "@/lib/backend";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({}));
  try {
    const { body, status } = await proxyJson("/api/mission/inject-anomaly", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return NextResponse.json(body, { status });
  } catch (err) {
    if (err instanceof BackendUnreachableError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
