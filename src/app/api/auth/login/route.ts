import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, AUTH_MAX_AGE, createSessionToken } from "@/lib/auth";
import { verifyPasswordHash } from "@/lib/password";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user || !(await verifyPasswordHash(password, user.passwordHash))) {
    return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
  }

  const token = await createSessionToken(user.id);
  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email },
  });
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_MAX_AGE,
    path: "/",
  });
  return response;
}
