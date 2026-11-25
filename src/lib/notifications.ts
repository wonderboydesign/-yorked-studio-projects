import { prisma } from "./prisma";
import { sendStudioEventEmail } from "./email";

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

// Avisos de lo que hacen los clientes en sus ligas (brief enviado, propuesta
// aprobada, comprobante subido): llegan a todo el equipo en la campana y, si
// el correo está configurado, también por correo. Nunca debe romper la acción
// del cliente, por eso se traga cualquier error.
export async function notifyStudio({
  kind,
  message,
  projectId,
  prospectId,
}: {
  kind: "brief" | "quote" | "receipt" | "material";
  message: string;
  projectId?: string | null;
  prospectId?: string | null;
}) {
  try {
    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    if (users.length === 0) return;
    await prisma.notification.createMany({
      data: users.map((u) => ({ userId: u.id, message, kind, projectId: projectId ?? null, prospectId: prospectId ?? null })),
    });
    await sendStudioEventEmail({ to: users.map((u) => u.email), subject: message, message });
  } catch (err) {
    console.error("No se pudo crear el aviso para el estudio:", err);
  }
}
