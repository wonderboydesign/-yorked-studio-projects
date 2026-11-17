import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getStudio } from "@/lib/quotesServer";
import { QuoteContent, formatMoney, whatsappLink } from "@/lib/quotes";
import { PortalPhase, computeProgress } from "@/lib/portal";
import { projectQuote } from "@/lib/portalServer";
import { localTodayUTC } from "@/lib/portalDates";

// La misma tipografía de las propuestas
const helvetica = localFont({
  src: "../../fonts/HelveticaNowDisplay-Regular.otf",
  variable: "--font-proposal",
  display: "swap",
});

export const dynamic = "force-dynamic";

const longDate = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "long", timeZone: "UTC" });
const shortDate = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const project = await prisma.project.findFirst({ where: { portalToken: params.token }, select: { name: true } });
  return {
    title: project ? `${project.name} — Portal del proyecto | Wonder Boy®` : "Portal del proyecto | Wonder Boy®",
    robots: { index: false, follow: false },
  };
}

export default async function ClientPortal({ params }: { params: { token: string } }) {
  const project = await prisma.project.findFirst({
    where: { portalToken: params.token },
    include: {
      tasks: { select: { name: true, status: true, startDate: true, endDate: true, phase: true } },
      payments: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!project) notFound();

  // Las visitas del estudio (con sesión) no cuentan como del cliente
  const isStudio = !!(await verifySessionToken(cookies().get(AUTH_COOKIE_NAME)?.value));
  if (!isStudio) await prisma.project.update({ where: { id: project.id }, data: { portalViewedAt: new Date() } });

  const [studio, quote] = await Promise.all([getStudio(), projectQuote(project.id)]);
  const c = quote?.content as unknown as QuoteContent | undefined;
  const today = localTodayUTC();
  const progress = computeProgress(project.tasks, today);
  const accent = c?.accent ?? project.color;
  const dark = c?.dark ?? "#121210";
  const line1 = c?.brandLine1 || project.name;
  const line2 = c?.brandLine1 ? c.brandLine2 : "";

  const payments = project.payments;
  const paid = payments.filter((p) => p.paidAt).reduce((n, p) => n + p.amount, 0);
  const total = payments.reduce((n, p) => n + p.amount, 0);
  const pending = payments.filter((p) => !p.paidAt);
  const next = pending[0];
  const current = progress.phases.find((p) => p.state === "active");
  const allDone = progress.percent >= 100 || (progress.phases.length > 0 && progress.phases.every((p) => p.state === "done"));
  const waPaid = whatsappLink(studio.whatsapp, `Hola, ya hice el pago de "${next?.label ?? ""}" de ${project.name}. Te comparto el comprobante.`);
  const waHello = whatsappLink(studio.whatsapp, `Hola, tengo una duda sobre el proyecto de ${project.name}.`);

  return (
    <div
      className={`${helvetica.variable} proposal min-h-screen`}
      style={{ ["--accent" as string]: accent, ["--dark" as string]: dark }}
    >
      <header className="sticky top-0 z-30 border-b border-black/10 bg-[#f1efe9]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <span className="text-[15px] font-medium tracking-tight">
            {studio.brandMark}
            <sup className="text-[9px]">®</sup>
          </span>
          <nav className="hidden gap-7 text-[13px] text-black/60 md:flex">
            <a href="#fases" className="hover:text-black">Fases</a>
            {payments.length > 0 && <a href="#pagos" className="hover:text-black">Pagos</a>}
            <a href="#contacto" className="hover:text-black">Contacto</a>
          </nav>
          <a href={waHello} target="_blank" rel="noreferrer" className="pill-dark">
            Escríbenos <span aria-hidden>→</span>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 sm:px-6">
        {/* Avance */}
        <section className="flex min-h-[calc(100svh-57px)] flex-col pb-6 pt-10">
          <p className="eyebrow">
            <span className="text-black">01</span> <span className="dot" /> Portal del proyecto · Actualizado al {longDate(today)}
          </p>
          <h1 className="mt-6 text-[clamp(64px,13vw,196px)] font-medium leading-[0.86] tracking-[-0.055em]">
            {line1}
            {line2 && (
              <>
                <br />
                <span style={{ color: "var(--accent)" }}>{line2}</span>
              </>
            )}
          </h1>

          <div className="mt-auto pt-12">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <p className="text-[clamp(72px,12vw,168px)] font-medium leading-none tracking-[-0.05em] tabular-nums">
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
        </section>

        {/* Fases */}
        <section id="fases" className="py-24">
          <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
            <p className="eyebrow">
              <span className="text-black">02</span> Fases
            </p>
            <h2 className="section-title">
              Dónde vamos. <span className="text-black/45">Lo que sigue.</span>
            </h2>
          </div>
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

        {/* Pagos */}
        {payments.length > 0 && (
          <section id="pagos" className="rounded-[28px] px-6 py-16 text-[#f1efe9] sm:px-10" style={{ background: "#121210" }}>
            <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
              <p className="eyebrow" style={{ color: "rgb(241 239 233 / 0.5)" }}>
                <span className="text-[#f1efe9]">03</span> Pagos
              </p>
              <div>
                <h2 className="section-title">
                  {pending.length === 0 ? (
                    <>
                      Todo al corriente. <span className="text-[#f1efe9]/50">Gracias.</span>
                    </>
                  ) : (
                    <>
                      Tus pagos. <span className="text-[#f1efe9]/50">Claros desde el inicio.</span>
                    </>
                  )}
                </h2>
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
              </div>
            </div>

            <div className="mt-14 grid gap-10 lg:grid-cols-[3fr_2fr]">
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
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
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
                <li className="border-t border-white/15 pt-4 text-[12px] text-[#f1efe9]/45">Montos en MXN. Más IVA en caso de requerir factura.</li>
              </ul>

              {next && (
                <div className="space-y-4">
                  <BankDetails studio={studio} label={next.label} amount={next.amount} />
                  <a href={waPaid} target="_blank" rel="noreferrer" className="pill-light w-full justify-center">
                    Ya hice mi pago · enviar comprobante <span aria-hidden>→</span>
                  </a>
                </div>
              )}
            </div>
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
    <article className={`grid gap-4 border-t border-black/10 py-8 md:grid-cols-[80px_1fr_auto] md:items-center md:gap-8 ${ph.state === "upcoming" ? "opacity-55" : ""}`}>
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
        className={`h-fit w-fit rounded-full px-3 py-1 text-[12px] ${ph.state === "active" ? "text-white" : "border border-black/15"}`}
        style={ph.state === "active" ? { background: "var(--accent)" } : undefined}
      >
        {chip}
      </span>
    </article>
  );
}

function BankDetails({ studio, label, amount }: { studio: Awaited<ReturnType<typeof getStudio>>; label: string; amount: number }) {
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
      <p className="eyebrow mb-1">Siguiente pago · {label}</p>
      <p className="text-[34px] font-medium tracking-[-0.03em]">
        {formatMoney(amount)} <span className="text-[14px] tracking-normal text-black/55">MXN</span>
      </p>
      <p className="mb-3 text-[11px] text-black/55">Más IVA en caso de requerir factura.</p>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 border-t border-black/10 py-2.5 text-[14px]">
          <span className="text-black/55">{k}</span>
          <span className="text-right font-medium">{v}</span>
        </div>
      ))}
    </div>
  );
}
