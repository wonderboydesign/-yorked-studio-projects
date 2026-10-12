import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "El moodboard necesita un nombre" }, { status: 400 });
  }

  const board = await prisma.moodboard.create({
    data: { projectId: params.projectId, name, notes: body.notes || null },
  });
  return NextResponse.json(board, { status: 201 });
}
