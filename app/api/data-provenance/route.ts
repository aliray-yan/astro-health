import { NextResponse } from "next/server";
import { proxyJson, BackendUnreachableError } from "@/lib/backend";

export async function GET() {
  try {
    const { body, status } = await proxyJson("/api/data-provenance");
    return NextResponse.json(body, { status });
  } catch (err) {
    if (err instanceof BackendUnreachableError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
