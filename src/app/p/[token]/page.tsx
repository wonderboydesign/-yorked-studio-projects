import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getStudio } from "@/lib/quotesServer";
import { QuoteContent, StudioWork, fillNote, formatMoney, formatMonthYear, whatsappLink, worksForQuote } from "@/lib/quotes";
import ApproveForm from "./ApproveForm";
import WorkCarousel from "./WorkCarousel";

// La tipografía de las propuestas del estudio
const helvetica = localFont({
  src: "../../fonts/HelveticaNowDisplay-Regular.otf",
  variable: "--font-proposal",
  display: "swap",
});

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const quote = await prisma.quote.findUnique({ where: { token: params.token }, select: { content: true } });
  const c = quote?.content as QuoteContent | undefined;
  return {
    title: c ? `Propuesta ${c.service} — ${c.brandName} | Wonder Boy®` : "Propuesta | Wonder Boy®",
    robots: { index: false, follow: false },
  };
}

export default async function ProposalPage({ params }: { params: { token: string } }) {
  const quote = await prisma.quote.findUnique({ where: { token: params.token } });
  if (!quote) notFound();

  // Alguien del estudio con sesión puede ver el borrador; esas visitas no cuentan
  const isStudio = !!(await verifySessionToken(cookies().get(AUTH_COOKIE_NAME)?.value));
  if (quote.status === "draft" && !isStudio) notFound();
  // Se cuentan las aperturas del cliente mientras decide; ya aprobada, no
  if (!isStudio && quote.status !== "approved") {
    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
        firstViewedAt: quote.firstViewedAt ?? new Date(),
        ...(quote.status === "sent" ? { status: "viewed" } : {}),
      },
    });
  }

  const c = quote.content as unknown as QuoteContent;
  const studio = await getStudio();
  const approved = quote.status === "approved";
  const issued = new Date(c.issuedAt);
  const expires = new Date(issued.getTime() + c.validDays * 86400000);
  const expired = !approved && Date.now() > expires.getTime();
  const earlyUntil = new Date(issued.getTime() + c.earlyDays * 86400000);
  const month = formatMonthYear(c.issuedAt);
  const single = c.options.length === 1;
  const chosen = c.options.find((o) => o.key === quote.approvedOption) ?? c.options.find((o) => o.recommended) ?? c.options[0];
  const totalWeeks = c.weeks;
  const works = worksForQuote(studio.works, c.workIds);
  const waApprove = whatsappLink(studio.whatsapp, `Hola, revisé la propuesta de ${c.brandName} y quiero arrancar.`);

  return (
    <div
      className={`${helvetica.variable} proposal min-h-screen`}
      style={{ ["--accent" as string]: c.accent, ["--dark" as string]: c.dark }}
    >
      {/* Barra superior */}
      <header className="sticky top-0 z-30 border-b border-black/10 bg-[#f1efe9]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <span className="text-[15px] font-medium tracking-tight">
            {studio.brandMark}
            <sup className="text-[9px]">®</sup>
          </span>
          <nav className="hidden gap-7 text-[13px] text-black/60 md:flex">
            <a href="#proceso" className="hover:text-black">Proceso</a>
            <a href="#trabajos" className="hover:text-black">Trabajos</a>
            <a href="#inversion" className="hover:text-black">Inversión</a>
            <a href="#contacto" className="hover:text-black">Contacto</a>
          </nav>
          <a href="#aprobar" className="pill-dark">
            {approved ? "Propuesta aprobada" : "Aprobar propuesta"} <span aria-hidden>→</span>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 sm:px-6">
        {/* 01 · Portada */}
        <section className="flex min-h-[calc(100svh-57px)] flex-col pb-6 pt-10">
          <p className="eyebrow">
            <span className="text-black">01</span> <span className="dot" /> Propuesta · {c.service} · {month} · Confidencial
          </p>
          <h1 className="mt-6 text-[clamp(72px,15vw,216px)] font-medium leading-[0.86] tracking-[-0.055em]">
            {c.brandLine1}
            <br />
            <span style={{ color: "var(--accent)" }}>{c.brandLine2}</span>
          </h1>
          <div className="mt-auto grid gap-6 border-t border-black/10 pt-8 sm:grid-cols-3 sm:items-end">
            <p className="max-w-xs text-[17px] leading-snug">{c.summary}</p>
            <div className="text-[13px] leading-relaxed">
              <p className="eyebrow mb-2">Preparado por</p>
              {studio.studioName}
              <br />
              {studio.city}, México
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <a href="#hola" className="pill-light">Ver propuesta</a>
              <a href="#aprobar" className="pill-dark">
                {approved ? "Ver aprobación" : "Aprobar propuesta"} <span aria-hidden>→</span>
              </a>
            </div>
          </div>
          <div className="mt-8 flex justify-between text-[11px] uppercase tracking-[0.14em] text-black/50">
            <span>Desliza para ver la propuesta</span>
            <span>©{issued.getFullYear()}</span>
          </div>
        </section>

        {expired && (
          <div className="mb-10 rounded-2xl bg-black px-6 py-4 text-[15px] text-[#f1efe9]">
            Esta propuesta venció el {expires.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}. Escríbenos y
            la actualizamos.
          </div>
        )}

        {/* 02 · Hola */}
        <section id="hola" className="grid gap-8 py-24 lg:grid-cols-[1fr_2fr]">
          <p className="eyebrow">
            <span className="text-black">02</span> Hola
          </p>
          <div>
            <h2 className="section-title">
              Una marca pensada como sistema, <span className="text-black/45">no como logotipo.</span>
            </h2>
            <p className="mt-12 max-w-xl text-[22px] leading-snug">
              Gracias por el interés en trabajar con {studio.studioName}.
            </p>
            <div className="mt-10 grid gap-6 text-[15px] leading-relaxed text-black/65 md:grid-cols-2">
              <p>
                Esta propuesta presenta nuestro enfoque para el desarrollo de la identidad de {c.brandName}: un sistema de
                marca sólido, coherente y preparado para vivir {c.touchpoints}.
              </p>
              <p>
                Entendemos el branding no como un ejercicio estético, sino como la creación de infraestructura estratégica
                que permite a una marca crecer, mantenerse relevante y operar con claridad a largo plazo.
              </p>
            </div>
          </div>
        </section>

        {/* 03 · Visión */}
        <section className="rounded-[28px] bg-[#121210] px-6 py-16 text-[#f1efe9] sm:px-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
            <p className="eyebrow text-[#f1efe9]/50">
              <span className="text-[#f1efe9]">03</span> Nuestra visión
            </p>
            <div>
              <h2 className="section-title">
                Menos ruido. <span className="text-[#f1efe9]/50">Más significado.</span>
              </h2>
              <p className="mt-12 max-w-xl text-[22px] leading-snug">
                Diseñamos marcas como sistemas. No creamos logotipos aislados ni piezas sueltas: construimos ecosistemas
                visuales y estratégicos que funcionan como herramientas reales para el negocio.
              </p>
              <p className="mt-6 max-w-xl text-[15px] text-[#f1efe9]/60">
                En una categoría como {c.category}, la marca es lo primero que el cliente ve, toca y comparte. Una marca
                bien diseñada:
              </p>
            </div>
          </div>
          <div className="mt-14 grid gap-6 border-t border-white/10 pt-8 sm:grid-cols-2 lg:grid-cols-4">
            {c.visionPoints.map((v, i) => (
              <div key={i}>
                <span className="text-[12px]" style={{ color: "var(--accent)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-2 text-[17px] leading-snug">{v}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 border-y border-black/10 lg:grid-cols-4 mt-24">
          {[
            [String(studio.yearsOfPractice), "Años de práctica"],
            [String(c.phases.length).padStart(2, "0"), "Fases de proceso"],
            [totalWeeks, "Semanas de trabajo"],
            [single ? "01" : String(c.options.length).padStart(2, "0"), single ? "Sistema completo" : "Opciones de alcance"],
          ].map(([n, l], i) => (
            <div key={i} className={`px-4 py-8 ${i > 0 ? "lg:border-l border-black/10" : ""} ${i % 2 ? "border-l border-black/10 lg:border-l" : ""}`}>
              <p className="text-[clamp(44px,6vw,64px)] font-medium leading-none tracking-[-0.04em]">{n}</p>
              <p className="mt-3 text-[12px] text-black/55">{l}</p>
            </div>
          ))}
        </section>

        {/* 04 · Proceso */}
        <section id="proceso" className="py-24">
          <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
            <p className="eyebrow">
              <span className="text-black">04</span> Nuestro proceso
            </p>
            <h2 className="section-title">
              Un proceso claro. <span className="text-black/45">Un resultado cuidado.</span>
            </h2>
          </div>
          <div className="mt-16">
            {c.phases.map((ph) => (
              <article key={ph.number} className="grid gap-4 border-t border-black/10 py-10 md:grid-cols-[80px_1fr_1.4fr_auto] md:gap-8">
                <p className="text-[12px] text-black/50">Fase {ph.number}</p>
                <div>
                  <h3 className="text-[28px] font-medium leading-tight tracking-[-0.02em]">{ph.name}</h3>
                  <p className="mt-1 text-[13px] text-black/55">{ph.subtitle}</p>
                </div>
                <div>
                  <p className="text-[14px] leading-relaxed text-black/70">{ph.description}</p>
                  <ul className="mt-5">
                    {ph.items.map((it, i) => (
                      <li key={i} className="flex gap-3 border-t border-black/10 py-2.5 text-[13px]">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
                <span className="h-fit w-fit rounded-full border border-black/15 px-3 py-1 text-[12px]">{ph.duration}</span>
              </article>
            ))}
          </div>
        </section>

        {/* 05 · Trabajos */}
        {works.length > 0 && (
          <section id="trabajos" className="pb-24">
            <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
              <p className="eyebrow">
                <span className="text-black">05</span> Marcas afines
              </p>
              <h2 className="section-title">
                Trabajos <span className="text-black/45">relacionados.</span>
              </h2>
            </div>
            <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {works.map((w) => (
                <WorkCard key={w.id} work={w} />
              ))}
              <a
                href={studio.portfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="flex aspect-[4/5] flex-col rounded-[22px] p-5 text-[#f1efe9] sm:aspect-[5/6]"
                style={{ background: "var(--dark)" }}
              >
                <span className="text-[11px] uppercase tracking-[0.14em] opacity-60">Portafolio</span>
                <p className="mt-auto text-[30px] font-medium leading-tight tracking-[-0.02em]">Ver más trabajos →</p>
                <span className="mt-auto text-[12px] opacity-60">wonderboy.mx</span>
              </a>
            </div>
          </section>
        )}

        {/* 06 · Inversión */}
        <section id="inversion" className="pb-24">
          <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
            <p className="eyebrow">
              <span className="text-black">06</span> Inversión
            </p>
            <h2 className="section-title">
              {single ? (
                <>
                  Un alcance. <span className="text-black/45">Un precio.</span>
                </>
              ) : (
                <>
                  Alcance <span className="text-black/45">por paquete.</span>
                </>
              )}
            </h2>
          </div>

          {single ? (
            <div className="mt-14 grid gap-3 lg:grid-cols-[1fr_1.1fr]">
              <div className="flex flex-col rounded-[28px] bg-[#121210] p-8 text-[#f1efe9] sm:p-10">
                <p className="text-[12px] text-[#f1efe9]/55">{chosen.phases}</p>
                <p className="mt-2 text-[22px]">
                  {chosen.name}
                  <br />
                  {c.brandName}
                </p>
                <p className="mt-16 text-[clamp(56px,7vw,96px)] font-medium leading-none tracking-[-0.045em]">
                  {formatMoney(chosen.price)} <span className="text-[18px] tracking-normal text-[#f1efe9]/60">MXN</span>
                </p>
                <p className="mt-3 max-w-xs text-[12px] text-[#f1efe9]/55">
                  Más IVA en caso de requerir factura. {c.advancePercent}% de anticipo para iniciar y {100 - c.advancePercent}%
                  contraentrega.
                </p>
                <a href="#aprobar" className="pill-light mt-auto w-fit !bg-[#f1efe9] pt-2.5 sm:mt-16">
                  {approved ? "Ver aprobación" : "Aprobar propuesta"} <span aria-hidden>→</span>
                </a>
              </div>
              <div className="rounded-[28px] bg-[#e7e4db] p-6 sm:p-8">
                <p className="eyebrow mb-3">Incluye</p>
                <ul>
                  {chosen.features.map((f, i) => (
                    <li key={i} className="border-t border-black/10 py-3 text-[14px]">
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-[#f1efe9] p-4">
                    <p className="text-[22px] font-medium">{formatMoney((chosen.price * c.advancePercent) / 100)}</p>
                    <p className="text-[11px] text-black/55">Anticipo para iniciar</p>
                  </div>
                  <div className="rounded-2xl bg-[#f1efe9] p-4">
                    <p className="text-[22px] font-medium">{formatMoney((chosen.price * (100 - c.advancePercent)) / 100)}</p>
                    <p className="text-[11px] text-black/55">Contraentrega</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-14 grid gap-3 lg:grid-cols-3">
              {c.options.map((o) => (
                <div
                  key={o.key}
                  className={`flex flex-col rounded-[28px] p-7 ${o.recommended ? "bg-[#121210] text-[#f1efe9]" : "bg-[#e7e4db]"}`}
                >
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="opacity-60">Opción {o.key}</span>
                    {o.recommended && (
                      <span className="rounded-full px-2.5 py-0.5 text-[11px]" style={{ background: "var(--accent)", color: "#fff" }}>
                        Recomendada
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-[26px] font-medium leading-tight tracking-[-0.02em]">{o.name}</p>
                  <p className="text-[12px] opacity-60">{o.phases} · {o.duration}</p>
                  <p className="mt-8 text-[52px] font-medium leading-none tracking-[-0.04em]">
                    {formatMoney(o.price)} <span className="text-[15px] tracking-normal opacity-60">MXN</span>
                  </p>
                  <ul className="mt-6 flex-1">
                    {o.features.map((f, i) => (
                      <li key={i} className={`border-t py-2.5 text-[13px] ${o.recommended ? "border-white/10" : "border-black/10"}`}>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {o.note && <p className="mt-4 text-[12px] opacity-60">{o.note}</p>}
                </div>
              ))}
            </div>
          )}

          {c.extras.length > 0 && (
            <div className="mt-10 rounded-[28px] border border-black/10 p-6 sm:p-8">
              <p className="eyebrow mb-3">Servicios adicionales, cotizados por separado</p>
              {c.extras.map((e, i) => (
                <div key={i} className="flex justify-between gap-6 border-t border-black/10 py-3 text-[14px]">
                  <span>{e.name}</span>
                  <span className="shrink-0 text-black/60">{e.price}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 07 · Notas */}
        <section className="pb-24">
          <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
            <p className="eyebrow">
              <span className="text-black">07</span> Notas importantes
            </p>
            <h2 className="section-title">
              Lo que hay que <span className="text-black/45">saber.</span>
            </h2>
          </div>
          <div className="mt-14 grid gap-x-10 md:grid-cols-2">
            {c.notes.map((n, i) => (
              <div key={i} className="border-t border-black/10 py-6">
                <h3 className="text-[16px] font-medium">{n.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-black/60">{fillNote(n.body, c)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 08 · Aprobar */}
        <section id="aprobar" className="rounded-[28px] px-6 py-16 text-[#f1efe9] sm:px-10" style={{ background: "var(--dark)" }}>
          <p className="eyebrow text-[#f1efe9]/60">
            <span className="text-[#f1efe9]">08</span> {approved ? "Propuesta aprobada" : "Empezar proyecto"}
          </p>
          <h2 className="mt-6 text-[clamp(64px,10vw,140px)] font-medium leading-[0.9] tracking-[-0.05em]">
            Muchas
            <br />
            gracias.
          </h2>

          {approved ? (
            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              <div>
                <p className="max-w-md text-[17px] leading-snug">
                  {quote.approvedName ? `${quote.approvedName.split(" ")[0]}, recibimos` : "Recibimos"} tu aprobación de{" "}
                  <strong className="font-medium">{chosen.name}</strong> el{" "}
                  {quote.approvedAt?.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}. Con el anticipo
                  apartamos tu lugar en la agenda y arrancamos con el briefing.
                </p>
                <a
                  href={whatsappLink(
                    studio.whatsapp,
                    `Hola, aprobé la propuesta de ${c.brandName} (${chosen.name}). Te envío el comprobante del anticipo.`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="pill-light mt-8 inline-flex !bg-[#f1efe9]"
                >
                  Enviar comprobante por WhatsApp <span aria-hidden>→</span>
                </a>
              </div>
              <BankDetails studio={studio} amount={(chosen.price * c.advancePercent) / 100} percent={c.advancePercent} />
            </div>
          ) : expired ? (
            <p className="mt-10 max-w-md text-[17px]">
              Esta propuesta venció. Escríbenos y la actualizamos.{" "}
              <a href={waApprove} className="underline">
                WhatsApp
              </a>
            </p>
          ) : (
            <>
              <p className="mt-8 max-w-md text-[15px] text-[#f1efe9]/75">
                Si la propuesta encaja, apruébala aquí y arrancamos con el briefing esta misma semana.
                {Date.now() < earlyUntil.getTime() &&
                  ` Confirmando antes del ${earlyUntil.toLocaleDateString("es-MX", { day: "numeric", month: "long" })} aplica un ${c.earlyDiscount}% de descuento.`}
              </p>
              <ApproveForm
                token={quote.token}
                options={c.options.map((o) => ({ key: o.key, name: o.name, price: o.price }))}
                defaultOption={chosen.key}
                whatsappUrl={waApprove}
              />
            </>
          )}

          <div id="contacto" className="mt-20 grid gap-6 border-t border-white/15 pt-8 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="eyebrow mb-2 text-[#f1efe9]/50">Contacto</p>
              {studio.phoneLabel}
            </div>
            <div>
              <p className="eyebrow mb-2 text-[#f1efe9]/50">Correo</p>
              {studio.emails.map((e) => (
                <a key={e} href={`mailto:${e}`} className="block hover:underline">
                  {e}
                </a>
              ))}
            </div>
            <div>
              <p className="eyebrow mb-2 text-[#f1efe9]/50">Estudio</p>
              {studio.city}
            </div>
            <div>
              <p className="eyebrow mb-2 text-[#f1efe9]/50">Instagram</p>
              {studio.instagram.map((h) => (
                <span key={h} className="block">
                  {h}
                </span>
              ))}
            </div>
          </div>
        </section>
        <footer className="flex justify-between py-6 text-[11px] text-black/50">
          <span>{studio.studioName} — Documento confidencial</span>
          <span>{month}</span>
        </footer>
      </main>
    </div>
  );
}

function BankDetails({
  studio,
  amount,
  percent,
}: {
  studio: Awaited<ReturnType<typeof getStudio>>;
  amount: number;
  percent: number;
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
      <p className="eyebrow mb-1">Datos para el anticipo</p>
      <p className="text-[34px] font-medium tracking-[-0.03em]">
        {formatMoney(amount)} <span className="text-[14px] tracking-normal text-black/55">MXN · {percent}%</span>
      </p>
      <p className="mb-3 text-[11px] text-black/55">Más IVA en caso de requerir factura.</p>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 border-t border-black/10 py-2.5 text-[14px]">
          <span className="text-black/55">{k}</span>
          <span className="text-right font-medium tabular-nums">{v}</span>
        </div>
      ))}
    </div>
  );
}

// Cuadro de un trabajo: con fotos, se muestran en carrusel a todo el cuadro y
// el texto va en blanco sobre un degradado; sin fotos, el color de fondo.
// La liga al proyecto va en el nombre, para no chocar con las flechas.
function WorkCard({ work: w }: { work: StudioWork }) {
  const images = (w.images ?? []).map((im) => im.url);
  const hasImages = images.length > 0;
  const light = hasImages || isDark(w.tone);
  const name = (
    <>
      {w.name}
      {w.link && <span className="ml-2 inline-block text-[20px] opacity-70">↗</span>}
    </>
  );
  return (
    <div
      className={`group relative flex aspect-[4/5] flex-col overflow-hidden rounded-[22px] p-5 sm:aspect-[5/6] ${
        light ? "text-[#f1efe9]" : ""
      }`}
      style={{ background: w.tone }}
    >
      {hasImages && <WorkCarousel images={images} alt={`${w.name}, ${w.kind || "identidad de marca"}`} />}
      <span className="pointer-events-none relative text-[11px] uppercase tracking-[0.14em] opacity-70">
        {w.kind || "Identidad de marca"}
      </span>
      <p className="relative mt-auto w-fit text-[30px] font-medium leading-tight tracking-[-0.02em]">
        {w.link ? (
          <a href={w.link} target="_blank" rel="noreferrer" className="hover:opacity-80">
            {name}
          </a>
        ) : (
          name
        )}
      </p>
      <div className={`pointer-events-none relative flex justify-between text-[12px] opacity-70 ${hasImages ? "mt-3" : "mt-auto"}`}>
        <span>{w.city}</span>
        <span>©{w.year}</span>
      </div>
    </div>
  );
}

function isDark(hex: string) {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m || m.length < 3) return false;
  const [r, g, b] = m.map((x) => parseInt(x, 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 110;
}
