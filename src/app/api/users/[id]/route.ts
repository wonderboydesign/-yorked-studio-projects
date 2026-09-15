import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }
    data.name = body.name.trim();
  }
  if (body.email !== undefined) {
    if (typeof body.email !== "string" || !body.email.trim()) {
      return NextResponse.json({ error: "El correo es requerido" }, { status: 400 });
    }
    data.email = body.email.trim().toLowerCase();
  }
  if (body.password !== undefined && body.password !== "") {
    if (typeof body.password !== "string" || body.password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }
    data.passwordHash = await hashPassword(body.password);
  }

  try {
    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, email: true, createdAt: true },
    });
    return NextResponse.json(user);
  } catch (err: unknown) {
    if (typeof err === "object" && err && "code" in err && err.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un usuario con ese correo" }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const count = await prisma.user.count();
  if (count <= 1) {
    return NextResponse.json(
      { error: "No puedes eliminar el último usuario" },
      { status: 400 }
    );
  }
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
