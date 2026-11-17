import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { QuoteContent } from "./quotes";
import { computeProgress, paymentsFromQuote } from "./portal";
import { localTodayUTC } from "./portalDates";

export function newPortalToken() {
  return randomBytes(18).toString("base64url");
}

// La propuesta del proyecto: la aprobada del prospecto ligado, o la más reciente
export async function projectQuote(projectId: string) {
  return prisma.quote.findFirst({
    where: { prospect: { projectId } },
    orderBy: [{ approvedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    include: { prospect: true },
  });
}

export async function projectProgress(projectId: string) {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: { name: true, status: true, startDate: true, endDate: true, phase: true },
  });
  return computeProgress(tasks, localTodayUTC());
}

// Si el proyecto aún no tiene pagos, los crea desde la propuesta aprobada
export async function ensurePayments(projectId: string) {
  const count = await prisma.payment.count({ where: { projectId } });
  if (count > 0) return 0;
  const quote = await projectQuote(projectId);
  if (!quote || quote.status !== "approved") return 0;
  const progress = await projectProgress(projectId);
  const rows = paymentsFromQuote(quote.content as unknown as QuoteContent, quote.approvedOption, quote.approvedAt, progress.end);
  await prisma.payment.createMany({ data: rows.map((r) => ({ ...r, projectId })) });
  return rows.length;
}

export const PAYMENT_SELECT = { id: true, label: true, amount: true, dueDate: true, paidAt: true, order: true } as const;

const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null);

// Campos editables de un pago; fechas como "YYYY-MM-DD" o null
export function paymentFields(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  if (typeof body.label === "string" && body.label.trim()) data.label = body.label.trim().slice(0, 120);
  if (body.amount !== undefined) {
    const n = Number(body.amount);
    if (Number.isFinite(n) && n >= 0) data.amount = Math.round(n * 100) / 100;
  }
  if (body.dueDate !== undefined) data.dueDate = day(body.dueDate);
  if (body.paidAt !== undefined) data.paidAt = day(body.paidAt);
  return data;
}

