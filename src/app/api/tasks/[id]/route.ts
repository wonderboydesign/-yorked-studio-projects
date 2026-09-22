import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sendTaskAssignedEmail } from "@/lib/email";
import { notifyTaskAssigned } from "@/lib/notifications";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.projectId !== undefined) data.projectId = body.projectId;
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
  if (body.status !== undefined) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId || null;

  const previousAssigneeId =
    data.assigneeId !== undefined
      ? (await prisma.task.findUnique({ where: { id: params.id }, select: { assigneeId: true } }))
          ?.assigneeId
      : undefined;

  const task = await prisma.task.update({
    where: { id: params.id },
    data,
    include: {
      project: true,
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  const assigneeChanged =
    data.assigneeId !== undefined && data.assigneeId !== previousAssigneeId;

  if (assigneeChanged && task.assignee) {
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

  return NextResponse.json(task);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.task.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
