import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export async function GET() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, password } = body;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "El correo es requerido" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash: await hashPassword(password),
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err: unknown) {
    if (typeof err === "object" && err && "code" in err && err.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un usuario con ese correo" }, { status: 409 });
    }
    throw err;
  }
}
