import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  const body = await request.json();
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Presentación";
  const slides = Array.isArray(body.slides) ? body.slides : [];

  const presentation = await prisma.presentation.create({
    data: { projectId: params.projectId, title, slides },
  });
  return NextResponse.json(presentation, { status: 201 });
}
