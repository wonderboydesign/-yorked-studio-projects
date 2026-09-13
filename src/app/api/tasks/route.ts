import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tasks = await prisma.task.findMany({
    include: { project: true },
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, projectId, startDate, endDate, status, notes } = body;

  if (!name || !projectId || !startDate || !endDate) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      name,
      projectId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
            status: status || "TODO",
      notes: notes || null,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
