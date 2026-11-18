import DocBank from "./DocBank";
import {
  OPTIONS_PER_PAGE,
  OptionProduct,
  OptionsDoc,
  QuoteDoc,
  SupplierItem,
  cheapestMxn,
  countProducts,
  money2,
  supplierTotals,
} from "@/lib/supplierQuotes";

// Los dos formatos de documento del estudio para proveedores. Se ven como el
// PDF (páginas con encabezado, secciones numeradas y pie "1 / 2") y se
// descargan con el botón de imprimir.

export function Page({
  title,
  date,
  n,
  total,
  dark,
  children,
}: {
  title: string;
  date: string;
  n: number;
  total: number;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`doc-page ${dark ? "doc-dark" : ""}`}>
      <div className="flex justify-between gap-4 text-[13px] opacity-55">
        <span className="min-w-0 truncate">{title}</span>
        <span className="shrink-0">{date}</span>
      </div>
      <div className="mt-9 space-y-10 print:mt-5 print:space-y-5">{children}</div>
      <p className="doc-foot text-[12px] opacity-45">
        {n} / {total}
      </p>
    </section>
  );
}

// Sección numerada: "01 Sección" a la izquierda y título y contenido a la derecha
function Sec({ n, title, sub, children }: { n: number; title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_3fr] sm:gap-8">
      <p className="text-[13px]">
        <span>{String(n).padStart(2, "0")}</span> <span className="opacity-50">Sección</span>
      </p>
      <div className="min-w-0">
        <h2 className="text-[clamp(30px,4.2vw,40px)] leading-[1.05] tracking-[-0.035em]">{title}</h2>
        {sub && <p className="mt-2 text-[clamp(16px,2vw,20px)] opacity-55">{sub}</p>}
        {children && <div className="mt-6 print:mt-4">{children}</div>}
      </div>
    </div>
  );
}

function Title({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_3fr] sm:gap-8">
      <div className="hidden sm:block" />
      <div className="min-w-0">
        <h1 className="text-[clamp(44px,8vw,72px)] leading-[0.95] tracking-[-0.05em]">{title}</h1>
        {subtitle && <p className="mt-3 text-[clamp(16px,2vw,19px)] leading-snug opacity-60">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

function Meta({ items }: { items: [string, string][] }) {
  const shown = items.filter(([, v]) => v);
  if (shown.length === 0) return null;
  return (
    <div className="mt-8 grid gap-4 border-b border-black/10 pb-6 sm:grid-cols-2">
      {shown.map(([k, v]) => (
        <div key={k}>
          <p className="text-[12px] opacity-50">{k}</p>
          <p className="mt-1 text-[15px]">{v}</p>
        </div>
      ))}
    </div>
  );
}

function RowsPanel({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="doc-gray px-5 py-2 sm:px-6">
      {rows.map((r, i) => (
        <div key={i} className="grid gap-1 border-b border-black/10 py-3 print:py-2 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4">
          <span className="text-[13px] opacity-50">{r.label}</span>
          <span className="text-[15px]">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Cotización ───────────────────────── */

export function QuoteDocView({
  title,
  date,
  doc,
  items,
  withIva,
  bankRows,
}: {
  title: string;
  date: string;
  doc: QuoteDoc;
  items: SupplierItem[];
  withIva: boolean;
  bankRows: [string, string][];
}) {
  const t = supplierTotals(items, withIva);
  const highlighted = items[Math.min(doc.summaryItem, Math.max(0, items.length - 1))];
  const hasSummary = !!(doc.qtyValue || (doc.summaryLabel && highlighted));
  const advance = doc.advancePercent > 0 && doc.advancePercent < 100 ? Math.round(t.total * doc.advancePercent) / 100 : 0;
  let n = 0;
  const sections = doc.sections.filter((s) => s.title || s.rows.length);
  const total = 2;
  const hasPay = advance > 0 || doc.deliveryTime || doc.paymentForm || bankRows.length > 1;

  return (
    <>
      <Page title={title} date={date} n={1} total={total}>
        <Title title={title} subtitle={doc.subtitle}>
          <Meta
            items={[
              ["Para", doc.forName],
              ["Atención", doc.attention],
            ]}
          />
        </Title>
        {hasSummary && (
          <Sec n={++n} title="Resumen">
            <div className="grid gap-3 sm:grid-cols-2">
              {doc.qtyValue && (
                <div className="doc-gray p-5">
                  <p className="text-[12px] opacity-50">{doc.qtyLabel || "Cantidad"}</p>
                  <p className="mt-2 text-[34px] leading-none tracking-[-0.03em]">{doc.qtyValue}</p>
                  {doc.qtyUnit && <p className="mt-2 text-[12px] opacity-50">{doc.qtyUnit}</p>}
                </div>
              )}
              {doc.summaryLabel && highlighted && (
                <div className="doc-black p-5">
                  <p className="text-[12px] opacity-55">{doc.summaryLabel}</p>
                  <p className="mt-2 text-[clamp(28px,4vw,34px)] leading-none tracking-[-0.03em]">
                    {money2(highlighted.quantity * highlighted.unitPrice)}
                  </p>
                  {doc.summaryNote && <p className="mt-2 text-[12px] opacity-55">{doc.summaryNote}</p>}
                </div>
              )}
            </div>
          </Sec>
        )}
        {sections.map((s, i) => (
          <Sec key={i} n={++n} title={s.title || "Detalle"}>
            <RowsPanel rows={s.rows} />
          </Sec>
        ))}
      </Page>

      <Page title={title} date={date} n={2} total={total} dark>
        <Sec n={++n} title="Desglose">
          <div className="hidden grid-cols-[minmax(0,1fr)_56px_110px_120px] gap-x-4 border-b border-white pb-3 text-[12px] opacity-60 sm:grid">
            <span>Concepto</span>
            <span className="text-center">Cant.</span>
            <span className="text-right">P. unitario</span>
            <span className="text-right">Importe</span>
          </div>
          {items.map((it, i) => (
            <div key={i} className="border-b border-white/15 py-4">
              <div className="hidden grid-cols-[minmax(0,1fr)_56px_110px_120px] items-baseline gap-x-4 sm:grid">
                <span className="text-[16px]">{it.description}</span>
                <span className="text-center text-[15px]">{it.quantity.toLocaleString("es-MX")}</span>
                <span className="text-right text-[15px]">{money2(it.unitPrice)}</span>
                <span className="text-right text-[15px]">{money2(it.quantity * it.unitPrice)}</span>
              </div>
              <div className="sm:hidden">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[16px]">{it.description}</span>
                  <span className="shrink-0 text-[15px]">{money2(it.quantity * it.unitPrice)}</span>
                </div>
                <p className="mt-1 text-[12px] opacity-55">
                  {it.quantity.toLocaleString("es-MX")} × {money2(it.unitPrice)}
                </p>
              </div>
              {it.detail && <p className="mt-1 text-[12px] opacity-55">{it.detail}</p>}
            </div>
          ))}
          <div className="ml-auto mt-5 max-w-[360px] space-y-2 text-[15px]">
            {withIva && (
              <>
                <div className="flex justify-between gap-6">
                  <span className="opacity-55">Subtotal</span>
                  <span>{money2(t.subtotal)}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="opacity-55">IVA (16%)</span>
                  <span>{money2(t.iva)}</span>
                </div>
              </>
            )}
            <div className="flex items-baseline justify-between gap-6 border-t border-white pt-4">
              <span>Total</span>
              <span className="text-[clamp(22px,3.4vw,28px)] tracking-[-0.02em]">{money2(t.total)} MXN</span>
            </div>
            {!withIva && <p className="text-right text-[12px] opacity-50">Más IVA en caso de requerir factura.</p>}
          </div>
        </Sec>

        {hasPay && (
          <Sec n={++n} title="Pago y condiciones">
            {advance > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="doc-gray p-5 print:p-4">
                  <p className="text-[12px] opacity-50">Anticipo</p>
                  <p className="mt-2 text-[clamp(26px,3.6vw,32px)] leading-none tracking-[-0.03em]">{money2(advance)}</p>
                  <p className="mt-2 text-[12px] opacity-50">{doc.advancePercent}% del total</p>
                </div>
                <div className="doc-gray p-5 print:p-4">
                  <p className="text-[12px] opacity-50">Contra entrega</p>
                  <p className="mt-2 text-[clamp(26px,3.6vw,32px)] leading-none tracking-[-0.03em]">{money2(t.total - advance)}</p>
                  <p className="mt-2 text-[12px] opacity-50">{100 - doc.advancePercent}% del total</p>
                </div>
              </div>
            )}
            {(doc.deliveryTime || doc.paymentForm) && (
              <div className="mt-4 grid gap-4 border-y border-white/15 py-5 print:mt-3 print:py-3 sm:grid-cols-2">
                {doc.deliveryTime && (
                  <div>
                    <p className="text-[12px] opacity-50">Tiempo de entrega</p>
                    <p className="mt-1 text-[16px]">{doc.deliveryTime}</p>
                  </div>
                )}
                {doc.paymentForm && (
                  <div>
                    <p className="text-[12px] opacity-50">Forma de pago</p>
                    <p className="mt-1 text-[16px]">{doc.paymentForm}</p>
                  </div>
                )}
              </div>
            )}
            {doc.showBank && bankRows.length > 1 && (
              <div className="doc-gray mt-4 p-5 text-[#111] print:mt-3 print:p-4 sm:p-6">
                <p className="mb-2 text-[14px] opacity-55">Datos para transferencia</p>
                <DocBank rows={bankRows} />
              </div>
            )}
          </Sec>
        )}
        {doc.footer && <p className="pb-4 text-[12px] opacity-55 print:pb-6">{doc.footer}</p>}
      </Page>
    </>
  );
}

/* ───────────────────── Opciones de productos ───────────────────── */

function ProductCard({ p, i }: { p: OptionProduct; i: number }) {
  return (
    <article className="doc-gray flex min-w-0 flex-col p-4 sm:p-5 print:p-3.5">
      <div className="flex items-center justify-between gap-3 text-[12px]">
        <span className="min-w-0 truncate opacity-55">{p.supplier}</span>
        <span className="doc-tag shrink-0">Opción {String(i + 1).padStart(2, "0")}</span>
      </div>
      <div className="mt-4 flex h-[160px] items-center justify-center bg-white p-2 print:mt-3 print:h-[118px]">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt={p.title} loading="lazy" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-[12px] opacity-35">Sin imagen</span>
        )}
      </div>
      <p className="mt-4 text-[14px] leading-snug print:mt-3 print:text-[13px]">{p.title}</p>
      <p className="mt-3 min-h-[36px] text-[11px] leading-snug opacity-55 print:mt-2 print:min-h-[28px] print:text-[10px]">{p.note}</p>
      <div className="mt-auto flex items-end justify-between gap-3 border-t border-black/15 pt-3">
        <div className="min-w-0">
          <p className="text-[clamp(18px,2.4vw,22px)] leading-none tracking-[-0.02em]">{p.price === null ? "Por confirmar" : money2(p.price)}</p>
          <p className={`mt-1 text-[10px] leading-tight opacity-50 ${(p.priceLabel || "").length > 16 ? "" : "whitespace-nowrap"}`}>{p.priceLabel || (p.price === null ? "consulta al proveedor" : "MXN por pieza")}</p>
        </div>
        {p.link && (
          <a href={p.link} target="_blank" rel="noreferrer" className="doc-btn shrink-0">
            Ver producto <span aria-hidden>↗</span>
          </a>
        )}
      </div>
    </article>
  );
}

export function OptionsDocView({ title, date, doc }: { title: string; date: string; doc: OptionsDoc }) {
  const cats = doc.categories.filter((c) => c.products.length > 0);
  const pagesPerCat = cats.map((c) => Math.max(1, Math.ceil(c.products.length / OPTIONS_PER_PAGE)));
  const total = 1 + pagesPerCat.reduce((a, b) => a + b, 0);
  const products = countProducts(doc);
  const hasHowTo = doc.howTo.length > 0;
  let page = 1;
  let n = 0;

  return (
    <>
      <Page title={title} date={date} n={1} total={total}>
        <Title title={title} subtitle={doc.subtitle}>
          <Meta
            items={[
              ["Para", doc.forName],
              ["Opciones", `${products} ${products === 1 ? "producto" : "productos"} en ${cats.length} ${cats.length === 1 ? "categoría" : "categorías"}`],
            ]}
          />
        </Title>
        <Sec n={++n} title="Resumen">
          <div className="grid gap-3 sm:grid-cols-3">
            {cats.map((c, i) => {
              const from = cheapestMxn(c.products);
              return (
                <div key={i} className="doc-gray p-5">
                  <p className="text-[12px] opacity-50">{c.name}</p>
                  <p className="mt-3 text-[clamp(22px,3vw,26px)] leading-none tracking-[-0.02em]">
                    {c.products.length} {c.products.length === 1 ? "opción" : "opciones"}
                  </p>
                  {from !== null && <p className="mt-2 text-[12px] opacity-50">desde {money2(from).replace(/\.00$/, "")} MXN</p>}
                </div>
              );
            })}
          </div>
        </Sec>
        {hasHowTo && (
          <Sec n={++n} title="Cómo usar este documento">
            <RowsPanel rows={doc.howTo} />
          </Sec>
        )}
        {(doc.note || doc.noteSub) && (
          <div className="grid gap-3 sm:grid-cols-[1fr_3fr] sm:gap-8">
            <div className="hidden sm:block" />
            <div className="flex min-w-0 items-start gap-4">
              <span className="doc-tag mt-0.5 shrink-0 px-4 py-1.5 text-[12px]">Nota</span>
              <div className="text-[12px] leading-relaxed">
                {doc.note && <p>{doc.note}</p>}
                {doc.noteSub && <p className="opacity-50">{doc.noteSub}</p>}
              </div>
            </div>
          </div>
        )}
      </Page>

      {cats.map((c, ci) => {
        const from = cheapestMxn(c.products);
        const chunks: OptionProduct[][] = [];
        for (let k = 0; k < c.products.length; k += OPTIONS_PER_PAGE) chunks.push(c.products.slice(k, k + OPTIONS_PER_PAGE));
        const secN = n + 1 + ci;
        return chunks.map((chunk, k) => {
          page += 1;
          return (
            <Page key={`${ci}-${k}`} title={title} date={date} n={page} total={total}>
              <div className="grid gap-3 sm:grid-cols-[1fr_3fr] sm:gap-8">
                <p className="text-[13px]">
                  <span>{String(secN).padStart(2, "0")}</span> <span className="opacity-50">Sección</span>
                </p>
                <div className="min-w-0">
                  <h2 className="text-[clamp(30px,4.2vw,40px)] leading-[1.05] tracking-[-0.035em]">
                    {c.name}
                    {k > 0 && <span className="opacity-40"> · continuación</span>}
                  </h2>
                  <p className="mt-2 text-[clamp(16px,2vw,20px)] opacity-55">
                    {c.products.length} {c.products.length === 1 ? "opción" : "opciones"}
                    {from !== null && ` · desde ${money2(from).replace(/\.00$/, "")} MXN por pieza`}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                {chunk.map((p, j) => (
                  <ProductCard key={j} p={p} i={k * OPTIONS_PER_PAGE + j} />
                ))}
              </div>
            </Page>
          );
        });
      })}
    </>
  );
}
