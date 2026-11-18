import type { Metadata } from "next";
import { notFound } from "next/navigation";
import localFont from "next/font/local";
import { prisma } from "@/lib/prisma";
import { getStudio } from "@/lib/quotesServer";
import { QuoteContent } from "@/lib/quotes";
import { isDarkColor } from "@/lib/portal";
import { projectQuote } from "@/lib/portalServer";
import { cleanItems, cleanOptionsDoc, cleanQuoteDoc } from "@/lib/supplierQuotes";
import ApproveSupplierQuote from "../../ApproveSupplierQuote";
import PrintButton from "../../recibo/[paymentId]/PrintButton";
import { OptionsDocView, QuoteDocView } from "./DocViews";

const helvetica = localFont({
  src: "../../../../fonts/HelveticaNowDisplay-Regular.otf",
  variable: "--font-proposal",
  display: "swap",
});

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Documento | Wonder Boy®", robots: { index: false, follow: false } };

const longDate = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" });

// Cotización u opciones de un proveedor, con el diseño del estudio
export default async function SupplierDocument({ params }: { params: { token: string; id: string } }) {
  const project = await prisma.project.findFirst({ where: { portalToken: params.token } });
  if (!project) notFound();
  const q = await prisma.supplierQuote.findFirst({ where: { id: params.id, projectId: project.id } });
  if (!q) notFound();

  const [studio, quote] = await Promise.all([getStudio(), projectQuote(project.id)]);
  const c = quote?.content as unknown as QuoteContent | undefined;
  const accent = c?.accent ?? project.color;
  const date = longDate(q.createdAt);
  const forName = (project.client || project.name).toUpperCase();

  const b = studio.bank;
  const bankRows = ([["Banco", b.bankName], ["Titular", b.holder], ["Cuenta", b.account], ["CLABE", b.clabe], ...(b.showCard && b.card ? [["Tarjeta", b.card]] : [])] as [string, string][]).filter(([, v]) => v);

  const isOptions = q.kind === "options";
  const quoteDoc = cleanQuoteDoc(q.doc);
  const optionsDoc = cleanOptionsDoc(q.doc);
  if (!quoteDoc.forName) quoteDoc.forName = forName;
  if (!optionsDoc.forName) optionsDoc.forName = forName;

  return (
    <div
      className={`${helvetica.variable} proposal portal-lab doc min-h-screen`}
      style={{ ["--accent" as string]: accent, ["--accent-text" as string]: isDarkColor(accent) ? "#ffffff" : "#111111" }}
    >
      <div className="mx-auto max-w-[900px] px-4 py-8 sm:px-6 print:max-w-none print:p-0">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <a href={`/c/${params.token}#cotizaciones`} className="pill-outline no-plus">
            ← Volver al portal
          </a>
          <div className="flex flex-wrap items-center gap-3">
            {!isOptions &&
              (q.status === "approved" ? (
                <span className="text-[13px]">✓ Aprobada el {longDate(q.approvedAt ?? q.createdAt)}</span>
              ) : (
                <ApproveSupplierQuote token={params.token} id={q.id} title={q.title} />
              ))}
            <PrintButton />
          </div>
        </div>

        {isOptions ? (
          <OptionsDocView title={q.title} date={date} doc={optionsDoc} />
        ) : (
          <QuoteDocView title={q.title} date={date} doc={quoteDoc} items={cleanItems(q.items)} withIva={q.withIva} bankRows={bankRows} />
        )}
      </div>
    </div>
  );
}
