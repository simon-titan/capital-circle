import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, message: "Discord OAuth callback placeholder" });
}
