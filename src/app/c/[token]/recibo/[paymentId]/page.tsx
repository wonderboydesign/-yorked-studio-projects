import type { Metadata } from "next";
import { notFound } from "next/navigation";
import localFont from "next/font/local";
import { prisma } from "@/lib/prisma";
import { getStudio } from "@/lib/quotesServer";
import { formatMoney } from "@/lib/quotes";
import { amountInWords } from "@/lib/moneyWords";
import { projectQuote, receiptFolio } from "@/lib/portalServer";
import { QuoteContent } from "@/lib/quotes";
import { clientAmount, isDarkColor } from "@/lib/portal";
import PrintButton from "./PrintButton";

const helvetica = localFont({
  src: "../../../../fonts/HelveticaNowDisplay-Regular.otf",
  variable: "--font-proposal",
  display: "swap",
});

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Recibo de pago | Wonder Boy®", robots: { index: false, follow: false } };

const longDate = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// Recibo de un pago ya hecho, para clientes que no requieren factura. Se
// abre desde el portal y se guarda como PDF con el botón (imprimir).
export default async function Receipt({
  params,
  searchParams,
}: {
  params: { token: string; paymentId: string };
  searchParams?: { estilo?: string };
}) {
  const lab = searchParams?.estilo !== "editorial";
  const project = await prisma.project.findFirst({
    where: { portalToken: params.token },
    include: { prospects: { orderBy: { updatedAt: "desc" }, take: 1 } },
  });
  if (!project) notFound();
  const payment = await prisma.payment.findFirst({ where: { id: params.paymentId, projectId: project.id } });
  if (!payment || !payment.paidAt) notFound();

  const studio = await getStudio();
  const prospect = project.prospects[0];
  const client = prospect?.contact ? `${prospect.contact} · ${prospect.brandName}` : project.client || project.name;
  const folio = receiptFolio(payment);
  const iva = payment.withIva || project.withIva;
  const amount = clientAmount(payment.amount, iva);
  // Resumen de pagos del proyecto hasta este recibo, en lo que paga el cliente
  const [all, quote] = await Promise.all([
    prisma.payment.findMany({ where: { projectId: project.id } }),
    projectQuote(project.id),
  ]);
  const toClient = (p: { amount: number; withIva: boolean }) => clientAmount(p.amount, p.withIva || project.withIva);
  const projectTotal = all.reduce((n, p) => n + toClient(p), 0);
  const paidToDate = all.filter((p) => p.paidAt && p.paidAt <= payment.paidAt!).reduce((n, p) => n + toClient(p), 0);
  const c = quote?.content as unknown as QuoteContent | undefined;
  const accent = c?.accent ?? project.color;

  return (
    <div
      className={`${helvetica.variable} proposal min-h-screen print:bg-white${lab ? " portal-lab" : ""}`}
      style={{ ["--accent" as string]: accent, ["--accent-text" as string]: isDarkColor(accent) ? "#ffffff" : "#111111" }}
    >
      <div className="mx-auto max-w-[780px] px-5 py-10 print:p-0">
        <div className="mb-6 flex justify-end gap-2 print:hidden">
          <a href={`/c/${params.token}#pagos`} className="pill-outline no-plus">
            ← Volver al portal
          </a>
          <PrintButton />
        </div>

        <article className="overflow-hidden rounded-[22px] bg-white [print-color-adjust:exact] [-webkit-print-color-adjust:exact] print:rounded-none">
          {/* Franja con el color del proyecto */}
          <div className="flex items-end justify-between gap-6 px-6 py-6 text-white sm:px-12 sm:py-8" style={{ background: accent }}>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.14em] opacity-75">Recibo de pago</p>
              <p className="mt-2 text-[clamp(30px,6vw,48px)] font-medium leading-none tracking-[-0.03em]">{project.name}</p>
            </div>
            <span className="shrink-0 -rotate-6 rounded-lg border-2 border-white px-3 py-1 text-[14px] font-medium tracking-[0.2em]">PAGADO</span>
          </div>

          <div className="p-6 sm:p-12">
            <header className="flex flex-wrap items-start justify-between gap-6 border-b border-black/10 pb-8">
              <div>
                <p className="text-[20px] font-medium tracking-tight">
                  {studio.brandMark}
                  <sup className="text-[10px]">®</sup>
                </p>
                <p className="mt-1 text-[12px] text-black/55">{studio.studioName}</p>
                <p className="text-[12px] text-black/55">{studio.city}, México</p>
              </div>
              <div className="sm:text-right">
                <p className="eyebrow">Folio</p>
                <p className="mt-1 text-[20px] font-medium">{folio}</p>
                <p className="text-[12px] text-black/55">{longDate(payment.paidAt)}</p>
              </div>
            </header>

            <dl className="grid gap-x-6 gap-y-4 py-8 text-[15px] sm:grid-cols-[160px_1fr]">
              <dt className="text-black/55">Recibimos de</dt>
              <dd>{client}</dd>
              <dt className="text-black/55">Concepto</dt>
              <dd>
                {payment.label} · {project.name}
              </dd>
              <dt className="text-black/55">Fecha de pago</dt>
              <dd>{longDate(payment.paidAt)}</dd>
            </dl>

            <div className="rounded-[18px] bg-[#f1efe9] p-6">
              <p className="eyebrow">Cantidad recibida</p>
              <p className="mt-2 text-[clamp(34px,7vw,48px)] font-medium leading-none tracking-[-0.03em]">
                {formatMoney(amount)} <span className="text-[16px] tracking-normal text-black/55">MXN{iva ? " · IVA incluido" : ""}</span>
              </p>
              <p className="mt-3 text-[14px]">{amountInWords(amount)}</p>
            </div>

            {all.length > 1 && (
              <div className="mt-6 grid grid-cols-3 gap-4 border-t border-black/10 pt-5 text-[13px]">
                <div>
                  <p className="text-black/55">Total del proyecto</p>
                  <p className="mt-1 text-[17px] font-medium">{formatMoney(projectTotal)}</p>
                </div>
                <div>
                  <p className="text-black/55">Pagado a la fecha</p>
                  <p className="mt-1 text-[17px] font-medium">{formatMoney(paidToDate)}</p>
                </div>
                <div>
                  <p className="text-black/55">Saldo</p>
                  <p className="mt-1 text-[17px] font-medium">{formatMoney(Math.max(0, projectTotal - paidToDate))}</p>
                </div>
              </div>
            )}

            <footer className="mt-10 grid gap-8 text-[12px] text-black/55 sm:grid-cols-2">
              <p>
                Este recibo ampara el pago indicado y no es un comprobante fiscal (CFDI). Si requieres factura, sube tu
                constancia de situación fiscal en tu portal.
              </p>
              <div className="sm:text-right">
                <div className="mb-2 h-px w-48 bg-black/30 sm:ml-auto" />
                <p className="text-black">{studio.studioName}</p>
                <p>
                  {studio.emails[0]} · {studio.phoneLabel}
                </p>
              </div>
            </footer>
          </div>
        </article>
      </div>
    </div>
  );
}
