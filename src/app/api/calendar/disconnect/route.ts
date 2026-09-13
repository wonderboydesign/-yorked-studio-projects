import { NextResponse } from "next/server";
import { disconnectGoogleCalendar } from "@/lib/google";

export async function POST() {
  await disconnectGoogleCalendar();
  return NextResponse.json({ ok: true });
}
