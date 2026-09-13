import { NextResponse } from "next/server";
import { fetchUpcomingEvents, isGoogleCalendarConnected } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET() {
  const connected = await isGoogleCalendarConnected();
  if (!connected) {
    return NextResponse.json({ connected: false, events: [] });
  }

  try {
    const events = await fetchUpcomingEvents(7);
    return NextResponse.json({ connected: true, events });
  } catch (e) {
    if (e instanceof Error && e.message === "TOKEN_EXPIRED") {
      return NextResponse.json({ connected: false, expired: true, events: [] });
    }
    return NextResponse.json(
      { connected: true, events: [], error: "No se pudieron cargar los eventos." },
      { status: 200 }
    );
  }
}
