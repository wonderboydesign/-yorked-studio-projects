import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { filename, url, pathname, contentType, size } = body;

  if (!filename || !url || !pathname || !contentType || typeof size !== "number") {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const attachment = await prisma.attachment.create({
    data: { filename, url, pathname, contentType, size, taskId: params.id },
  });

  return NextResponse.json(attachment, { status: 201 });
}
