import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sendTaskAssignedEmail } from "@/lib/email";
import { notifyTaskAssigned } from "@/lib/notifications";

export async function GET() {
  const tasks = await prisma.task.findMany({
    include: {
      project: true,
      assignees: { select: { id: true, name: true, email: true } },
      attachments: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, projectId, startDate, endDate, status, notes, assigneeIds } = body;

  if (!name || !projectId || !startDate || !endDate) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const ids: string[] = Array.isArray(assigneeIds) ? assigneeIds.filter(Boolean) : [];

  const task = await prisma.task.create({
    data: {
      name,
      projectId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: status || "TODO",
      notes: notes || null,
      assignees: ids.length > 0 ? { connect: ids.map((id) => ({ id })) } : undefined,
    },
    include: {
      project: true,
      assignees: { select: { id: true, name: true, email: true } },
    },
  });

  if (task.assignees.length > 0) {
    const currentUser = await getCurrentUser();
    for (const assignee of task.assignees) {
      await notifyTaskAssigned({
        userId: assignee.id,
        taskId: task.id,
        taskName: task.name,
        assignedByName: currentUser?.name,
      });
      await sendTaskAssignedEmail({
        to: assignee.email,
        taskName: task.name,
        projectName: task.project.name,
        startDate: task.startDate,
        endDate: task.endDate,
        assignedByName: currentUser?.name,
        appUrl: request.nextUrl.origin,
      });
    }
  }

  return NextResponse.json(task, { status: 201 });
}
