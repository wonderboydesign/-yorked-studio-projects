import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const comments = await prisma.comment.findMany({
    where: { taskId: params.id },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(comments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "El comentario está vacío" }, { status: 400 });
  }

  const currentUser = await getCurrentUser();
  const comment = await prisma.comment.create({
    data: { text, taskId: params.id, authorId: currentUser?.id ?? null },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
