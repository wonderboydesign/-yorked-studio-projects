import type { Metadata } from "next";
import { notFound } from "next/navigation";
import localFont from "next/font/local";
import { prisma } from "@/lib/prisma";
import { getStudio } from "@/lib/quotesServer";
import { formatMoney } from "@/lib/quotes";
import { amountInWords } from "@/lib/moneyWords";
import { receiptFolio } from "@/lib/portalServer";
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
export default async function Receipt({ params }: { params: { token: string; paymentId: string } }) {
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

  return (
    <div className={`${helvetica.variable} proposal min-h-screen print:bg-white`}>
      <div className="mx-auto max-w-[780px] px-5 py-10 print:p-0">
        <div className="mb-6 flex justify-end gap-2 print:hidden">
          <a href={`/c/${params.token}#pagos`} className="pill-light">
            ← Volver al portal
          </a>
          <PrintButton />
        </div>

        <article className="rounded-[22px] bg-white p-8 sm:p-12 print:rounded-none print:p-0">
          <header className="flex items-start justify-between gap-6 border-b border-black/10 pb-8">
            <div>
              <p className="text-[20px] font-medium tracking-tight">
                {studio.brandMark}
                <sup className="text-[10px]">®</sup>
              </p>
              <p className="mt-1 text-[12px] text-black/55">{studio.studioName}</p>
              <p className="text-[12px] text-black/55">{studio.city}, México</p>
            </div>
            <div className="text-right">
              <p className="eyebrow">Recibo de pago</p>
              <p className="mt-1 text-[20px] font-medium">{folio}</p>
              <p className="text-[12px] text-black/55">{longDate(payment.paidAt)}</p>
            </div>
          </header>

          <dl className="grid gap-6 py-8 text-[15px] sm:grid-cols-[160px_1fr]">
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
            <p className="mt-2 text-[44px] font-medium leading-none tracking-[-0.03em]">
              {formatMoney(payment.amount)} <span className="text-[16px] tracking-normal text-black/55">MXN</span>
            </p>
            <p className="mt-3 text-[14px]">{amountInWords(payment.amount)}</p>
          </div>

          <footer className="mt-10 grid gap-8 text-[12px] text-black/55 sm:grid-cols-2">
            <p>
              Este recibo ampara el pago indicado y no es un comprobante fiscal (CFDI). Si requieres factura, sube tu constancia
              de situación fiscal en tu portal.
            </p>
            <div className="text-right">
              <div className="ml-auto mb-2 h-px w-48 bg-black/30" />
              <p className="text-black">{studio.studioName}</p>
              <p>
                {studio.emails[0]} · {studio.phoneLabel}
              </p>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
