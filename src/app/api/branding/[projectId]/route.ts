import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BRAND_STAGE_KEYS, ITEM_INCLUDE, ensureWorkspace } from "@/lib/brandingServer";

export async function GET(_request: NextRequest, { params }: { params: { projectId: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.projectId } });
  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  const workspace = await ensureWorkspace(params.projectId);
  const [items, moodboards, presentations] = await Promise.all([
    prisma.brandItem.findMany({
      where: { projectId: params.projectId },
      include: ITEM_INCLUDE,
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    prisma.moodboard.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.presentation.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({ workspace, items, moodboards, presentations });
}

export async function PATCH(request: NextRequest, { params }: { params: { projectId: string } }) {
  const body = await request.json();
  const data: Record<string, unknown> = {};

  for (const field of ["brief", "context", "conceptNotes", "plan"]) {
    if (typeof body[field] === "string") data[field] = body[field];
  }
  if (body.research && typeof body.research === "object" && !Array.isArray(body.research)) {
    data.research = body.research;
  }
  if (typeof body.stage === "string" && BRAND_STAGE_KEYS.includes(body.stage)) {
    data.stage = body.stage;
  }

  await ensureWorkspace(params.projectId);
  const workspace = await prisma.brandWorkspace.update({
    where: { projectId: params.projectId },
    data,
  });
  return NextResponse.json(workspace);
}
