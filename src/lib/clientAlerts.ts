import { prisma } from "./prisma";
import { localTodayUTC } from "./portalDates";

// Pendientes por revisar de un cliente ganado: se muestran en su tarjeta de
// Clientes y arriba de su ficha. Se calculan al vuelo, así que se quitan solos
// cuando se resuelven (se paga, se revisa el brief, llega la constancia…).

export type AlertLevel = "late" | "todo" | "info";
export interface ClientAlert {
  id: string;
  level: AlertLevel;
  text: string;
}

const DAY = 86400000;
const ago = (days: number) => (days <= 0 ? "hoy" : days === 1 ? "hace 1 día" : `hace ${days} días`);

interface QuoteLite {
  status: string;
  approvedAt: Date | null;
  receiptUrl: string | null;
  wantsInvoice: boolean | null;
}
interface ProjectLite {
  wantsInvoice: boolean | null;
  payments: { label: string; dueDate: Date | null; paidAt: Date | null; order: number }[];
  clientBrief: { status: string; reviewedAt: Date | null } | null;
  certificates: number;
}

export function buildAlerts(quote: QuoteLite | null, project: ProjectLite | null, today: Date, now = new Date()): ClientAlert[] {
  const out: ClientAlert[] = [];
  const approvedDays = quote?.approvedAt ? Math.floor((now.getTime() - quote.approvedAt.getTime()) / DAY) : 0;

  if (project && project.payments.length > 0) {
    const sorted = [...project.payments].sort((a, b) => a.order - b.order);
    const first = sorted[0];
    const anticipoUnpaid = !first.paidAt;
    if (quote?.receiptUrl && anticipoUnpaid) {
      out.push({ id: "receipt", level: "info", text: "Comprobante recibido: confirma el pago" });
    }
    for (const p of sorted.filter((x) => !x.paidAt && x.dueDate && x.dueDate < today).slice(0, 2)) {
      const days = Math.max(1, Math.round((today.getTime() - p.dueDate!.getTime()) / DAY));
      const isAnticipo = p === first && /anticipo/i.test(p.label);
      out.push({
        id: `late-${p.label}`,
        level: "late",
        text: isAnticipo ? `No ha pagado el anticipo · venció ${ago(days)}` : `Pago vencido: ${p.label} · ${ago(days)}`,
      });
    }
  } else if (quote?.status === "approved") {
    // Aún no hay pagos en el portal: el anticipo corre desde que aprobó
    if (quote.receiptUrl) out.push({ id: "receipt", level: "info", text: "Comprobante recibido: confirma el pago" });
    else out.push({ id: "anticipo", level: approvedDays >= 2 ? "late" : "todo", text: `No ha pagado el anticipo · aprobó ${approvedDays <= 0 ? "hoy" : ago(approvedDays)}` });
  }

  const brief = project?.clientBrief;
  if (brief?.status === "submitted" && !brief.reviewedAt) out.push({ id: "brief", level: "info", text: "Brief enviado: revísalo" });
  else if (brief && brief.status === "draft" && approvedDays >= 3) out.push({ id: "brief-draft", level: "todo", text: "Su brief sigue sin enviarse" });

  const wantsInvoice = project?.wantsInvoice ?? quote?.wantsInvoice ?? null;
  if (wantsInvoice === true && project && project.certificates === 0) {
    out.push({ id: "invoice", level: "todo", text: "Pidió factura: falta su constancia fiscal" });
  }

  const rank = { late: 0, todo: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

// Pendientes de varios prospectos ganados a la vez (una consulta por tabla)
export async function loadAlerts(
  prospects: { id: string; stage: string; projectId: string | null; quotes?: QuoteLite[] }[]
): Promise<Map<string, ClientAlert[]>> {
  const won = prospects.filter((p) => p.stage === "won");
  const result = new Map<string, ClientAlert[]>();
  if (won.length === 0) return result;
  const projectIds = won.map((p) => p.projectId).filter((x): x is string => !!x);
  const projects = projectIds.length
    ? await prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: {
          id: true,
          wantsInvoice: true,
          payments: { select: { label: true, dueDate: true, paidAt: true, order: true } },
          clientBrief: { select: { status: true, reviewedAt: true } },
          documents: { where: { kind: "tax_certificate" }, select: { id: true } },
        },
      })
    : [];
  const byId = new Map(projects.map((p) => [p.id, p]));
  const today = localTodayUTC();
  for (const p of won) {
    const quote = (p.quotes ?? []).find((q) => q.status === "approved") ?? null;
    const pr = p.projectId ? byId.get(p.projectId) : undefined;
    const alerts = buildAlerts(
      quote,
      pr ? { wantsInvoice: pr.wantsInvoice, payments: pr.payments, clientBrief: pr.clientBrief, certificates: pr.documents.length } : null,
      today
    );
    if (alerts.length > 0) result.set(p.id, alerts);
  }
  return result;
}
