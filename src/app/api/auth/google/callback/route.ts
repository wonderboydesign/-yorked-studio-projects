import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/google";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/?google=error`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, origin);
    if (!tokens.refresh_token) {
      // Google solo entrega refresh_token la primera vez que el usuario autoriza.
      // Si ya existe una conexión previa, avisamos igual como éxito.
      const existing = await prisma.googleAuth.findUnique({ where: { id: "singleton" } });
      if (!existing) {
        return NextResponse.redirect(`${origin}/?google=noRefreshToken`);
      }
      return NextResponse.redirect(`${origin}/?google=connected`);
    }

    await prisma.googleAuth.upsert({
      where: { id: "singleton" },
      update: { refreshToken: tokens.refresh_token },
      create: { id: "singleton", refreshToken: tokens.refresh_token },
    });

    return NextResponse.redirect(`${origin}/?google=connected`);
  } catch (e) {
    return NextResponse.redirect(`${origin}/?google=error`);
  }
}
