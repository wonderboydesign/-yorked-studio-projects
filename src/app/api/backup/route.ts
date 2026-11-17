import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { localTodayUTC } from "@/lib/portalDates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Respaldo completo de la base de datos en un archivo JSON para guardar
// fuera de la app (Drive, Dropbox, disco). No incluye contraseñas ni la
// conexión con Google Calendar; los archivos subidos (fotos, PDFs) siguen
// en Vercel Blob y aquí van como ligas.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [
    users,
    projects,
    tasks,
    comments,
    attachments,
    brandWorkspaces,
    brandItems,
    moodboards,
    references,
    presentations,
    prospects,
    quotes,
    payments,
    studioSettings,
  ] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, email: true, createdAt: true, updatedAt: true } }),
    prisma.project.findMany(),
    prisma.task.findMany({ include: { assignees: { select: { id: true } } } }),
    prisma.comment.findMany(),
    prisma.attachment.findMany(),
    prisma.brandWorkspace.findMany(),
    prisma.brandItem.findMany(),
    prisma.moodboard.findMany(),
    prisma.reference.findMany(),
    prisma.presentation.findMany(),
    prisma.prospect.findMany(),
    prisma.quote.findMany(),
    prisma.payment.findMany(),
    prisma.studioSettings.findMany(),
  ]);

  const data = {
    users,
    projects,
    // Responsables como lista de ids, en lugar de los objetos completos
    tasks: tasks.map(({ assignees, ...t }) => ({ ...t, assigneeIds: assignees.map((a) => a.id) })),
    comments,
    attachments,
    brandWorkspaces,
    brandItems,
    moodboards,
    references,
    presentations,
    prospects,
    quotes,
    payments,
    studioSettings,
  };

  const backup = {
    app: "Yorked Studio Projects",
    version: 1,
    exportedAt: new Date().toISOString(),
    exportedBy: user.name,
    notes:
      "Respaldo de la base de datos. No incluye contraseñas (al restaurar, cada usuario define una nueva) ni la conexión con Google Calendar. Las fotos y archivos siguen en Vercel Blob; aquí van sus ligas. Contiene datos bancarios y de clientes: guárdalo en un lugar privado.",
    counts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])),
    data,
  };

  const day = localTodayUTC().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(backup, null, 1), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="yorked-respaldo-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
