import { prisma } from "./prisma";

export async function notifyTaskAssigned({
  userId,
  taskId,
  taskName,
  assignedByName,
}: {
  userId: string;
  taskId: string;
  taskName: string;
  assignedByName?: string;
}) {
  const message = assignedByName
    ? `${assignedByName} te asignó la tarea "${taskName}"`
    : `Te asignaron la tarea "${taskName}"`;

  await prisma.notification.create({
    data: { userId, taskId, message },
  });
}
