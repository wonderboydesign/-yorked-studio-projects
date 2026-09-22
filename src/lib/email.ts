import { Resend } from "resend";

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

export async function sendTaskAssignedEmail({
  to,
  taskName,
  projectName,
  startDate,
  endDate,
  assignedByName,
  appUrl,
}: {
  to: string;
  taskName: string;
  projectName: string;
  startDate: Date;
  endDate: Date;
  assignedByName?: string;
  appUrl: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.log(
      `RESEND_API_KEY no está configurada, se omite el correo de asignación para ${to}.`
    );
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL || "Yorked Studio <onboarding@resend.dev>";
  const assignedBy = assignedByName ? `${assignedByName} te asignó` : "Te asignaron";

  try {
    await resend.emails.send({
      from,
      to,
      subject: `Tarea asignada: ${taskName}`,
      html: `
        <p>${assignedBy} la tarea <strong>${taskName}</strong> en el proyecto <strong>${projectName}</strong>.</p>
        <p>Fechas: ${formatDate(startDate)} — ${formatDate(endDate)}</p>
        <p><a href="${appUrl}">Ver en Yorked Studio</a></p>
      `,
    });
  } catch (err) {
    console.error("Error al enviar el correo de asignación:", err);
  }
}
