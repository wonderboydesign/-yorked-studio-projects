import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { prisma } from "@/lib/prisma";
import CopyRows from "@/components/CopyRows";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getStudio } from "@/lib/quotesServer";
import { QuoteContent, formatMoney, whatsappLink } from "@/lib/quotes";
import { PortalPhase, clientAmount, computeProgress, accentInk, isDarkColor, readableDark } from "@/lib/portal";
import { projectQuote } from "@/lib/portalServer";
import { localTodayUTC } from "@/lib/portalDates";
import PortalBilling from "./PortalBilling";
import PortalNav from "./PortalNav";
import ApproveSupplierQuote from "./ApproveSupplierQuote";
import { cleanItems, cleanOptionsDoc, cleanQuoteDoc, countProducts, showsOriginal, supplierTotals } from "@/lib/supplierQuotes";

// La misma tipografía de las propuestas
const helvetica = localFont({
  src: "../../fonts/HelveticaNowDisplay-Regular.otf",
  variable: "--font-proposal",
  display: "swap",
});

export const dynamic = "force-dynamic";

const longDate = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "long", timeZone: "UTC" });
// Fecha y hora de una reunión, en la hora del centro de México
const meetingDate = (d: Date) =>
  d
    .toLocaleString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Mexico_City",
    })
    .replace(/^./, (c) => c.toUpperCase()) + " (hora del centro)";
const shortDate = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const project = await prisma.project.findFirst({ where: { portalToken: params.token }, select: { name: true } });
  return {
    title: project ? `${project.name} — Portal del proyecto | Wonder Boy®` : "Portal del proyecto | Wonder Boy®",
    robots: { index: false, follow: false },
  };
}

export default async function ClientPortal({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { estilo?: string };
}) {
  // Estilo del portal: "laboratorio" (blanco, esquinas rectas, botones en el
  // color del proyecto). ?estilo=editorial muestra el diseño anterior.
  const lab = searchParams?.estilo !== "editorial";
  const project = await prisma.project.findFirst({
    where: { portalToken: params.token },
    include: {
      tasks: { select: { name: true, status: true, startDate: true, endDate: true, phase: true } },
      payments: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      documents: { orderBy: { createdAt: "desc" } },
      links: { orderBy: [{ date: "desc" }, { createdAt: "desc" }] },
      supplierQuotes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) notFound();

  // Las visitas del estudio (con sesión) no cuentan como del cliente
  const isStudio = !!(await verifySessionToken(cookies().get(AUTH_COOKIE_NAME)?.value));
  if (!isStudio) await prisma.project.update({ where: { id: project.id }, data: { portalViewedAt: new Date() } });

  const [studio, quote] = await Promise.all([getStudio(), projectQuote(project.id)]);
  const c = quote?.content as unknown as QuoteContent | undefined;
  const today = localTodayUTC();
  // El cálculo automático con las tareas; si el estudio fijó a mano el
  // porcentaje o la fecha de entrega, se muestra eso (solo esos dos datos)
  const auto = computeProgress(project.tasks, today);
  const progress = {
    ...auto,
    percent: project.progressOverride ?? auto.percent,
    end: project.estimatedEnd ?? auto.end,
  };
  const accent = c?.accent ?? project.color;
  const dark = readableDark(c?.dark ?? "#121210");
  const line1 = c?.brandLine1 || project.name;
  const line2 = c?.brandLine1 ? c.brandLine2 : "";

  // El cliente solo ve lo que paga: con IVA ya sumado si el proyecto lo lleva
  // (project.withIva es el IVA general de antes, como respaldo)
  const payments = project.payments.map((p) => {
    const iva = p.withIva || project.withIva;
    return { ...p, iva, amount: clientAmount(p.amount, iva) };
  });
  const paid = payments.filter((p) => p.paidAt).reduce((n, p) => n + p.amount, 0);
  const total = payments.reduce((n, p) => n + p.amount, 0);
  const pending = payments.filter((p) => !p.paidAt);
  const next = pending[0];
  const current = progress.phases.find((p) => p.state === "active");
  const allDone = progress.percent >= 100 || (progress.phases.length > 0 && progress.phases.every((p) => p.state === "done"));
  const waPaid = whatsappLink(studio.whatsapp, `Hola, ya hice el pago de "${next?.label ?? ""}" de ${project.name}. Te comparto el comprobante.`);
  // Reuniones: la próxima (o la que está en curso, hasta 2 h después) arriba
  const now = Date.now();
  const meetings = project.links.filter((l) => l.kind === "meeting" && l.date);
  const upcoming = meetings
    .filter((l) => l.date!.getTime() >= now - 2 * 3600 * 1000)
    .sort((a, b) => a.date!.getTime() - b.date!.getTime());
  const nextMeeting = upcoming[0];
  const deliveries = project.links.filter((l) => l.kind === "delivery");
  const brandFiles = project.links.filter((l) => l.kind === "brand");
  // Secciones que el estudio decidió ocultar y tipo de portal (retainer = "Lo nuevo")
  const hidden = new Set(project.portalHidden);
  const retainer = project.portalMode === "retainer";
  const show = (id: string) => !hidden.has(id);
  const proposalUrl = quote && quote.status !== "draft" ? `/p/${quote.token}` : null;
  const phaseName = new Map(progress.phases.map((p) => [p.number, p.name]));

  // Numeración de secciones según lo que tenga el proyecto
  const order = [
    show("fases") && "fases",
    meetings.length > 0 && show("reuniones") && "reuniones",
    deliveries.length > 0 && show("entregas") && "entregas",
    project.supplierQuotes.length > 0 && show("cotizaciones") && "cotizaciones",
    payments.length > 0 && show("pagos") && "pagos",
    show("facturacion") && "facturacion",
    brandFiles.length > 0 && show("marca") && "marca",
  ].filter(Boolean) as string[];
  const num = (id: string) => String(order.indexOf(id) + 2).padStart(2, "0");
  const NAV_LABELS: Record<string, string> = {
    fases: "Fases",
    reuniones: "Reuniones",
    entregas: retainer ? "Lo nuevo" : "Entregas",
    cotizaciones: "Cotizaciones",
    pagos: "Pagos",
    facturacion: "Facturas y recibos",
    marca: "Tu marca",
  };
  const navItems = [{ id: "inicio", label: "Inicio" }, ...order.map((id) => ({ id, label: NAV_LABELS[id] })), { id: "contacto", label: "Contacto" }];

  // Entregas: más recientes primero; en un retainer se agrupan por mes
  const deliveryDate = (d: (typeof deliveries)[number]) => d.date ?? d.createdAt;
  const sortedDeliveries = [...deliveries].sort((a, b) => deliveryDate(b).getTime() - deliveryDate(a).getTime());
  const monthOf = (d: Date) => d.toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "America/Mexico_City" });
  const deliveryMonths: { key: string; label: string; items: typeof deliveries }[] = [];
  for (const d of sortedDeliveries) {
    const label = monthOf(deliveryDate(d));
    const last = deliveryMonths[deliveryMonths.length - 1];
    if (last && last.key === label) last.items.push(d);
    else deliveryMonths.push({ key: label, label, items: [d] });
  }
  const deliveriesThisMonth = deliveries.filter((d) => monthOf(deliveryDate(d)) === monthOf(new Date())).length;
  const renderDelivery = (d: (typeof deliveries)[number]) => {
    const isNew = now - d.createdAt.getTime() < 7 * 86400000;
    const hasLink = !!d.url;
    const isPdf = !!d.pathname || /\.pdf(\?|$)/i.test(d.url);
    const isImage = /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(d.url);
    const showPhase = d.phase && show("fases");
    const cls = "group flex min-h-[220px] flex-col rounded-[22px] border border-black/10 p-5";
    const body = (
      <>
        {isImage && retainer && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.url} alt={d.title} loading="lazy" className="mb-4 h-44 w-full rounded-[14px] bg-black/[0.04] object-cover" />
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow">{showPhase ? `Fase ${d.phase}${phaseName.get(d.phase!) ? ` · ${phaseName.get(d.phase!)}` : ""}` : retainer ? "Nuevo contenido" : "Entrega"}</span>
          {isNew && (
            <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
              Nueva
            </span>
          )}
        </div>
        <p className="mt-4 text-[24px] font-medium leading-tight tracking-[-0.02em]">{d.title}</p>
        {d.note && <p className="mt-2 text-[13px] text-black/60">{d.note}</p>}
        <div className="mt-auto flex items-center justify-between pt-6 text-[13px] text-black/55">
          <span>{shortDate(d.date ?? d.createdAt)}</span>
          {hasLink && (
            <span className="pill-dark no-plus">
              {isPdf ? "Abrir PDF" : "Abrir"} <span aria-hidden>↗</span>
            </span>
          )}
        </div>
      </>
    );
    // Sin link, la entrega es solo informativa (no se abre)
    return hasLink ? (
      <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className={`${cls} hover:bg-black/[0.03]`}>
        {body}
      </a>
    ) : (
      <div key={d.id} className={cls}>
        {body}
      </div>
    );
  };

  const waHello = whatsappLink(studio.whatsapp, `Hola, tengo una duda sobre el proyecto de ${project.name}.`);

  return (
    <div
      className={`${helvetica.variable} proposal min-h-screen${lab ? " portal-lab" : ""}`}
      style={{
        ["--accent" as string]: accent,
        ["--dark" as string]: dark,
        ["--accent-ink" as string]: accentInk(accent, "#f2f2f2"),
        ["--accent-ink-dark" as string]: accentInk(accent, dark),
        // Texto de los botones: blanco sobre acentos oscuros, negro sobre claros
        ["--accent-text" as string]: isDarkColor(accent) ? "#ffffff" : "#111111",
      }}
    >
      <header className="pt-header sticky top-0 z-30 border-b border-black/10 bg-[#f1efe9]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <span className="text-[15px] font-medium tracking-tight">
            {studio.brandMark}
            <sup className="text-[9px]">®</sup>
          </span>
          <PortalNav variant="desktop" items={navItems} />
          <a href={waHello} target="_blank" rel="noreferrer" className="pill-dark">
            Escríbenos <span aria-hidden>→</span>
          </a>
        </div>
        <PortalNav variant="mobile" items={navItems} />
      </header>

      <main className="mx-auto max-w-[1440px] px-5 sm:px-6">
        {/* Avance */}
        <section id="inicio" className={`flex flex-col pt-10 ${show("avance") ? "min-h-[calc(100svh-57px)] pb-6" : "pb-16"}`}>
          <p className="eyebrow">
            <span className="text-black">01</span> <span className="dot" /> Portal del proyecto · Actualizado al {longDate(today)}
          </p>
          {project.logoUrl ? (
            // Con logotipo: el logo es la imagen principal, a la izquierda, y el nombre queda pequeño debajo
            <div className="flex flex-1 flex-col items-start justify-center py-10 text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.logoUrl}
                alt={project.name}
                className="h-[180px] w-auto max-w-full object-contain object-left sm:h-[280px] lg:h-[380px]"
              />
              <h1 className={project.showName ? "mt-8 text-[clamp(15px,1.7vw,22px)] font-medium leading-tight tracking-[-0.02em]" : "sr-only"}>
                {line1}
                {line2 && (
                  <>
                    {" "}
                    <span style={{ color: "var(--accent-ink)" }}>{line2}</span>
                  </>
                )}
              </h1>
            </div>
          ) : (
            <h1 className="pt-hero-title mt-6 text-[clamp(64px,13vw,196px)] font-medium leading-[0.86] tracking-[-0.055em]">
              {line1}
              {line2 && (
                <>
                  <br />
                  <span style={{ color: "var(--accent-ink)" }}>{line2}</span>
                </>
              )}
            </h1>
          )}

          {/* Accesos rápidos: propuesta, próxima reunión y descargables */}
          {(proposalUrl || (nextMeeting && show("reuniones")) || (brandFiles.length > 0 && show("marca"))) && (
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {nextMeeting && show("reuniones") && (
                <div className="flex flex-col rounded-[22px] p-5 sm:col-span-2 lg:col-span-1" style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
                  <span className="text-[11px] uppercase tracking-[0.14em] opacity-90">Próxima reunión</span>
                  <p className="mt-3 text-[22px] font-medium leading-tight">{nextMeeting.title}</p>
                  <p className="mt-1 text-[14px] opacity-95">{meetingDate(nextMeeting.date!)}</p>
                  {nextMeeting.note && <p className="mt-2 text-[13px] opacity-90">{nextMeeting.note}</p>}
                  <a href={nextMeeting.url} target="_blank" rel="noreferrer" className="pill-light mt-5 w-fit">
                    Unirme a la reunión <span aria-hidden>→</span>
                  </a>
                </div>
              )}
              {proposalUrl && (
                <a href={proposalUrl} target="_blank" rel="noreferrer" className="group flex flex-col rounded-[22px] border border-black/10 p-5 hover:bg-black/[0.03]">
                  <span className="eyebrow">Tu propuesta</span>
                  <p className="mt-3 text-[22px] font-medium leading-tight">Alcance, fases e inversión acordados</p>
                  <span className="mt-auto pt-5 text-[13px] text-black/60 group-hover:text-black">Ver propuesta ↗</span>
                </a>
              )}
              {brandFiles.length > 0 && show("marca") && (
                <a href="#marca" className="group flex flex-col rounded-[22px] bg-[#121210] p-5 text-[#f1efe9]">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-[#f1efe9]/55">Tu marca</span>
                  <p className="mt-3 text-[22px] font-medium leading-tight">Descargables de tu marca</p>
                  <span className="mt-auto pt-5 text-[13px] text-[#f1efe9]/60 group-hover:text-[#f1efe9]">
                    {brandFiles.length} {brandFiles.length === 1 ? "archivo" : "archivos"} ↓
                  </span>
                </a>
              )}
            </div>
          )}

          {show("avance") && (
          <div className="mt-auto pt-12">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <p className="pt-percent text-[clamp(72px,12vw,168px)] font-medium leading-none tracking-[-0.05em] tabular-nums">
                {progress.percent}
                <span className="text-[0.4em] text-black/40">%</span>
              </p>
              <div className="max-w-sm pb-3 text-[15px] leading-snug">
                {allDone ? (
                  <p>Tu proyecto está terminado. Gracias por confiar en nosotros.</p>
                ) : current ? (
                  <p>
                    Estamos en la <span className="font-medium">Fase {current.number} · {current.name}</span>, hasta el{" "}
                    {longDate(current.end)}.
                  </p>
                ) : progress.start && progress.start > today ? (
                  <p>Arrancamos el {longDate(progress.start)}.</p>
                ) : (
                  <p>Tu proyecto está en marcha.</p>
                )}
                {progress.end && !allDone && <p className="mt-1 text-black/55">Entrega estimada: {longDate(progress.end)}</p>}
              </div>
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-black/10">
              <div className="h-full rounded-full" style={{ width: `${progress.percent}%`, background: "var(--accent)" }} />
            </div>
          </div>
          )}
        </section>

        {show("fases") && (
        <section id="fases" className="py-24">
          <SectionHead n={num("fases")} title="Fases del proyecto" tagline={allDone ? "Así lo hicimos, paso a paso." : "Dónde vamos y lo que sigue."} />
          <div className="mt-16">
            {progress.phases.length === 0 ? (
              <p className="border-t border-black/10 py-10 text-[15px] text-black/55">
                Estamos preparando el calendario del proyecto; aquí verás cada fase y su avance.
              </p>
            ) : (
              progress.phases.map((ph) => <PhaseRow key={`${ph.number}-${ph.start.toISOString()}`} phase={ph} />)
            )}
          </div>
        </section>

        )}

        {/* Reuniones */}
        {meetings.length > 0 && show("reuniones") && (
          <section id="reuniones" className="pb-24">
            <SectionHead n={num("reuniones")} title="Reuniones" tagline="Fecha, hora y link para unirte." />
            <ul className="mt-14">
              {[...meetings]
                .sort((a, b) => b.date!.getTime() - a.date!.getTime())
                .map((m) => {
                  const past = m.date!.getTime() < now - 2 * 3600 * 1000;
                  return (
                    <li key={m.id} className={`grid gap-3 border-t border-black/10 py-6 md:grid-cols-[1fr_auto] md:items-center ${past ? "opacity-80" : ""}`}>
                      <div className="min-w-0">
                        <p className="text-[22px] font-medium leading-tight tracking-[-0.01em]">{m.title}</p>
                        <p className="mt-1 text-[13px] text-black/55">
                          {meetingDate(m.date!)}
                          {m.note && ` · ${m.note}`}
                        </p>
                      </div>
                      {past ? (
                        <span className="text-[12px] text-black/50">Ya pasó</span>
                      ) : (
                        <a href={m.url} target="_blank" rel="noreferrer" className="pill-dark w-fit">
                          Unirme <span aria-hidden>→</span>
                        </a>
                      )}
                    </li>
                  );
                })}
            </ul>
          </section>
        )}

        {/* Entregas (en un retainer: "Lo nuevo", agrupado por mes) */}
        {deliveries.length > 0 && show("entregas") && (
          <section id="entregas" className="pb-24">
            <SectionHead
              n={num("entregas")}
              title={retainer ? "Lo nuevo" : "Entregas"}
              tagline={
                retainer
                  ? `${deliveriesThisMonth} ${deliveriesThisMonth === 1 ? "entrega" : "entregas"} este mes · lo más reciente primero.`
                  : "Lo que te hemos presentado, siempre a la mano."
              }
            />
            {retainer ? (
              deliveryMonths.map((g) => (
                <div key={g.key} className="mt-14">
                  <p className="eyebrow mb-4 capitalize">{g.label}</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{g.items.map(renderDelivery)}</div>
                </div>
              ))
            ) : (
              <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{deliveries.map(renderDelivery)}</div>
            )}
          </section>
        )}

        {/* Cotizaciones y opciones de proveedores */}
        {project.supplierQuotes.length > 0 && show("cotizaciones") && (
          <section id="cotizaciones" className="pb-24">
            <SectionHead n={num("cotizaciones")} title="Cotizaciones" tagline="Producción, impresión y opciones que gestionamos para tu marca." />
            <div className="mt-14 grid gap-3 lg:grid-cols-2">
              {project.supplierQuotes.map((q) => {
                const isOptions = q.kind === "options";
                const items = cleanItems(q.items);
                const t = supplierTotals(items, q.withIva);
                const od = isOptions ? cleanOptionsDoc(q.doc) : null;
                const nProducts = od ? countProducts(od) : 0;
                const subtitle = isOptions ? od!.subtitle : cleanQuoteDoc(q.doc).subtitle;
                const original = showsOriginal(q);
                const expired = !isOptions && !!q.validUntil && q.validUntil < today && q.status !== "approved";
                return (
                  <article key={q.id} className="flex min-w-0 flex-col rounded-[22px] border border-black/10 p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="eyebrow">{isOptions ? "Opciones" : "Cotización"}</span>
                      {!isOptions && (
                        <span className={`rounded-full px-2.5 py-0.5 text-[12px] ${q.status === "approved" ? "bg-black text-[#f1efe9]" : "border border-black/15"}`}>
                          {q.status === "approved" ? "✓ Aprobada" : expired ? "Vencida" : "Por aprobar"}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-[26px] font-medium leading-tight tracking-[-0.02em]">{q.title}</h3>
                    {subtitle && <p className="mt-2 text-[14px] leading-snug text-black/60">{subtitle}</p>}
                    <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-black/20 pt-3">
                      {original && (isOptions ? nProducts === 0 : items.length === 0) ? (
                        <span className="text-[15px]">Documento original</span>
                      ) : isOptions ? (
                        <span className="text-[15px]">
                          {nProducts} {nProducts === 1 ? "producto" : "productos"} en {od!.categories.length} {od!.categories.length === 1 ? "categoría" : "categorías"}
                        </span>
                      ) : (
                        <>
                          <span className="text-[13px] text-black/55">Total{q.withIva ? " con IVA" : ""}</span>
                          <span className="text-[28px] font-medium tracking-[-0.02em]">{formatMoney(t.total)}</span>
                        </>
                      )}
                    </div>
                    {!isOptions && q.validUntil && q.status !== "approved" && (
                      <p className="mt-2 text-[12px] text-black/50">
                        {expired ? "Venció" : "Vigente hasta"} el {longDate(q.validUntil)}
                      </p>
                    )}
                    <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
                      <a href={`/c/${params.token}/documento/${q.id}`} className="pill-dark">
                        {original ? "Ver documento" : isOptions ? "Ver opciones" : "Ver cotización"} <span aria-hidden>→</span>
                      </a>
                      {!isOptions && q.status === "approved" && <p className="text-[13px]">Aprobada el {longDate(q.approvedAt ?? q.createdAt)}.</p>}
                      {!isOptions && q.status !== "approved" && !expired && <ApproveSupplierQuote token={params.token} id={q.id} title={q.title} />}
                      {q.showFile && q.fileUrl && !original && (
                        <a href={q.fileUrl} target="_blank" rel="noreferrer" className="text-[13px] text-black/60 hover:text-black">
                          Documento original ↗
                        </a>
                      )}
                      <a
                        href={whatsappLink(studio.whatsapp, `Hola, tengo una duda sobre "${q.title}" de ${project.name}.`)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[13px] text-black/60 hover:text-black"
                      >
                        Tengo dudas ↗
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Pagos */}
        {payments.length > 0 && show("pagos") && (
          <section id="pagos" className="rounded-[28px] px-6 py-16 text-[#f1efe9] sm:px-10" style={{ background: "#121210" }}>
            <SectionHead
              dark
              n={num("pagos")}
              title="Pagos del proyecto"
              tagline={pending.length === 0 ? "Todo al corriente. Gracias." : "Lo que llevas pagado y lo que sigue."}
            />
            <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
              <div className="hidden lg:block" />
              <div>
                <div className="mt-10 grid grid-cols-2 gap-6 border-t border-white/15 pt-6 text-[13px] sm:grid-cols-3">
                  <div>
                    <p className="text-[#f1efe9]/50">Total</p>
                    <p className="mt-1 text-[24px] font-medium tracking-[-0.02em]">{formatMoney(total)}</p>
                  </div>
                  <div>
                    <p className="text-[#f1efe9]/50">Pagado</p>
                    <p className="mt-1 text-[24px] font-medium tracking-[-0.02em]">{formatMoney(paid)}</p>
                  </div>
                  <div>
                    <p className="text-[#f1efe9]/50">Pendiente</p>
                    <p className={`mt-1 text-[24px] font-medium tracking-[-0.02em] ${pending.length ? "underline decoration-[var(--accent)] decoration-2 underline-offset-[6px]" : ""}`}>
                      {formatMoney(total - paid)}
                    </p>
                  </div>
                </div>
                {project.creditVisible && (project.creditBalance ?? 0) > 0 && (
                  <div className="mt-8 border-t border-white/15 pt-6 text-[13px]">
                    <p className="text-[#f1efe9]/50">Saldo a favor</p>
                    <p className="mt-1 text-[24px] font-medium tracking-[-0.02em]">{formatMoney(project.creditBalance!)}</p>
                    <p className="mt-1 text-[#f1efe9]/60">{project.creditNote || "Disponible para tus próximos proyectos."}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <ul>
                {payments.map((p) => {
                  const overdue = !p.paidAt && p.dueDate && p.dueDate < today;
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-4 border-t border-white/15 py-5">
                      <div className="min-w-0">
                        <p className="text-[19px] leading-tight">{p.label}</p>
                        <p className="mt-1 text-[13px] text-[#f1efe9]/55">
                          {p.paidAt
                            ? `Pagado el ${longDate(p.paidAt)}`
                            : p.dueDate
                            ? `${overdue ? "Venció" : "Vence"} el ${longDate(p.dueDate)}`
                            : "Pendiente"}
                          {p.iva && " · IVA incluido"}
                        </p>
                        {p.paidAt && (
                          <a
                            href={`/c/${params.token}/recibo/${p.id}`}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#f1efe9] px-3 py-1.5 text-[12px] text-[#121210] hover:opacity-90"
                          >
                            Descargar recibo <span aria-hidden>↓</span>
                          </a>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
                        <span className="text-[19px] font-medium">{formatMoney(p.amount)}</span>
                        <span
                          className={`rounded-full px-3 py-1 text-[12px] ${p.paidAt ? "bg-white/10 text-[#f1efe9]/80" : "bg-[#f1efe9] text-[#121210]"}`}
                        >
                          {p.paidAt ? "✓ Pagado" : "Pendiente"}
                        </span>
                      </div>
                    </li>
                  );
                })}
                <li className="border-t border-white/15 pt-4 text-[12px] text-[#f1efe9]/65">Montos en MXN.</li>
              </ul>

              <div className="space-y-4">
                <BankDetails studio={studio} label={next?.label} amount={next?.amount} withIva={next?.iva} />
                {next && (
                  <a href={waPaid} target="_blank" rel="noreferrer" className="pill-light w-full justify-center">
                    Ya hice mi pago · enviar comprobante <span aria-hidden>→</span>
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {show("facturacion") && (
        <section id="facturacion" className="py-24">
          <SectionHead n={num("facturacion")} title="Facturas y recibos" tagline="Descarga tus recibos o sube tu constancia si requieres factura." />
          <PortalBilling
            token={params.token}
            receipts={payments
              .filter((p) => p.paidAt)
              .map((p) => ({ id: p.id, label: p.label, amount: formatMoney(p.amount), paidAt: p.paidAt!.toISOString(), url: `/c/${params.token}/recibo/${p.id}` }))}
            certificates={project.documents
              .filter((d) => d.kind === "tax_certificate")
              .map((d) => ({ id: d.id, name: d.name, url: d.url, createdAt: d.createdAt.toISOString() }))}
            invoices={project.documents
              .filter((d) => d.kind === "invoice")
              .map((d) => ({ id: d.id, name: d.name, url: d.url, createdAt: d.createdAt.toISOString() }))}
          />
        </section>

        )}

        {/* Tu marca */}
        {brandFiles.length > 0 && show("marca") && (
          <section id="marca" className="mb-8 rounded-[28px] bg-[#121210] px-6 py-16 text-[#f1efe9] sm:px-10">
            <SectionHead dark n={num("marca")} title="Tu marca" tagline="Todos tus archivos finales, listos para usarse." />
            <ul className="mt-14">
              {brandFiles.map((f) => (
                <li key={f.id}>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between gap-4 border-t border-white/15 py-5"
                  >
                    <div className="min-w-0">
                      <p className="text-[20px] leading-tight">{f.title}</p>
                      {f.note && <p className="mt-1 text-[13px] text-[#f1efe9]/55">{f.note}</p>}
                    </div>
                    <span className="shrink-0 rounded-full bg-[#f1efe9] px-4 py-2 text-[13px] text-[#121210] group-hover:opacity-90">
                      {f.pathname ? "Descargar ↓" : "Abrir ↗"}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Contacto */}
        <section id="contacto" className="grid gap-6 py-16 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="eyebrow mb-2">WhatsApp</p>
            <a href={waHello} target="_blank" rel="noreferrer" className="hover:underline">
              {studio.phoneLabel}
            </a>
          </div>
          <div>
            <p className="eyebrow mb-2">Correo</p>
            {studio.emails.map((e) => (
              <a key={e} href={`mailto:${e}`} className="block hover:underline">
                {e}
              </a>
            ))}
          </div>
          <div>
            <p className="eyebrow mb-2">Estudio</p>
            {studio.city}
          </div>
          <div>
            <p className="eyebrow mb-2">Instagram</p>
            {studio.instagram.map((h) => (
              <span key={h} className="block">
                {h}
              </span>
            ))}
          </div>
        </section>
        <footer className="flex justify-between border-t border-black/10 py-6 text-[11px] text-black/50">
          <span>{studio.studioName} — Portal privado del proyecto</span>
          <span>{project.name}</span>
        </footer>
      </main>
    </div>
  );
}

function PhaseRow({ phase: ph }: { phase: PortalPhase }) {
  const chip =
    ph.state === "done" ? "✓ Terminada" : ph.state === "active" ? `En curso · ${ph.percent}%` : "Por venir";
  return (
    <article className={`grid gap-4 border-t border-black/10 py-8 md:grid-cols-[80px_1fr_auto] md:items-center md:gap-8 ${ph.state === "upcoming" ? "opacity-80" : ""}`}>
      <p className="text-[12px] text-black/50">Fase {ph.number}</p>
      <div className="min-w-0">
        <h3 className="text-[28px] font-medium leading-tight tracking-[-0.02em]">{ph.name}</h3>
        <p className="mt-1 text-[13px] text-black/55">
          {shortDate(ph.start)} – {shortDate(ph.end)}
        </p>
        <div className="mt-4 h-1 max-w-xl overflow-hidden rounded-full bg-black/10">
          <div className="h-full rounded-full" style={{ width: `${ph.percent}%`, background: ph.state === "done" ? "#121210" : "var(--accent)" }} />
        </div>
      </div>
      <span
        className={`h-fit w-fit rounded-full px-3 py-1 text-[12px] ${ph.state === "active" ? "" : "border border-black/15"}`}
        style={ph.state === "active" ? { background: "var(--accent)", color: "var(--accent-text)" } : undefined}
      >
        {chip}
      </span>
    </article>
  );
}

function BankDetails({
  studio,
  label,
  amount,
  withIva,
}: {
  studio: Awaited<ReturnType<typeof getStudio>>;
  label?: string;
  amount?: number;
  withIva?: boolean;
}) {
  const b = studio.bank;
  const rows = [
    ["Banco", b.bankName],
    ["Titular", b.holder],
    ["Cuenta", b.account],
    ["CLABE", b.clabe],
    ...(b.showCard && b.card ? [["Tarjeta", b.card]] : []),
  ].filter(([, v]) => v);
  if (rows.length <= 1) return null;
  return (
    <div className="rounded-[22px] bg-[#f1efe9] p-6 text-[#121210]">
      {label && amount !== undefined ? (
        <>
          <p className="eyebrow eyebrow-ink mb-1">Siguiente pago · {label}</p>
          <p className="text-[34px] font-medium tracking-[-0.03em]">
            {formatMoney(amount)} <span className="text-[14px] tracking-normal text-black/55">MXN</span>
          </p>
          {withIva ? <p className="mb-3 text-[11px] text-black/55">IVA incluido.</p> : <div className="mb-3" />}
        </>
      ) : (
        <p className="eyebrow eyebrow-ink mb-3">Datos para transferencia</p>
      )}
      <CopyRows rows={rows as [string, string][]} />
    </div>
  );
}

// Encabezado de sección: número y nombre claro de la sección (para que el
// cliente sepa dónde está) y una frase de apoyo más pequeña
function SectionHead({ n, title, tagline, dark }: { n: string; title: string; tagline: string; dark?: boolean }) {
  return (
    <div className="pt-head grid gap-3 lg:grid-cols-[1fr_2fr] lg:gap-8">
      <p className="pt-head-n eyebrow" style={dark ? { color: "rgb(241 239 233 / 0.5)" } : undefined}>
        <span className={dark ? "text-[#f1efe9]" : "text-black"}>{n}</span> Sección
      </p>
      <div>
        <h2 className="pt-head-title text-[clamp(40px,6vw,84px)] font-medium leading-[0.95] tracking-[-0.045em]">{title}</h2>
        <p className={`pt-head-tag mt-3 max-w-xl text-[clamp(17px,1.6vw,22px)] leading-snug ${dark ? "text-[#f1efe9]/55" : "text-black/50"}`}>{tagline}</p>
      </div>
    </div>
  );
}

