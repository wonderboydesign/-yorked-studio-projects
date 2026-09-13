import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  return NextResponse.redirect(getGoogleAuthUrl(origin));
}
