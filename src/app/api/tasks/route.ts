import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sendTaskAssignedEmail } from "@/lib/email";
import { notifyTaskAssigned } from "@/lib/notifications";

export async function GET() {
  const tasks = await prisma.task.findMany({
    include: {
      project: true,
      assignee: { select: { id: true, name: true, email: true } },
      attachments: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, projectId, startDate, endDate, status, notes, assigneeId } = body;

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
      assigneeId: assigneeId || null,
    },
    include: {
      project: true,
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  if (task.assignee) {
    const currentUser = await getCurrentUser();
    await notifyTaskAssigned({
      userId: task.assignee.id,
      taskId: task.id,
      taskName: task.name,
      assignedByName: currentUser?.name,
    });
    await sendTaskAssignedEmail({
      to: task.assignee.email,
      taskName: task.name,
      projectName: task.project.name,
      startDate: task.startDate,
      endDate: task.endDate,
      assignedByName: currentUser?.name,
      appUrl: request.nextUrl.origin,
    });
  }

  return NextResponse.json(task, { status: 201 });
}
