import { NextRequest, NextResponse } from "next/server";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { claudeClient, claudeErrorResponse } from "@/lib/claudeErrors";
import { ITEM_INCLUDE, ensureWorkspace } from "@/lib/brandingServer";
import { BrandNaming, BriefAnalysis, NAME_STYLES, NameData, NameStyle, RESEARCH_BLOCKS, BrandResearch } from "@/lib/branding";

// Proponer nombres puede tardar
export const maxDuration = 120;

const STYLE_KEYS = NAME_STYLES.map((s) => s.key) as [NameStyle, ...NameStyle[]];

const NamesSchema = z.object({
  names: z.array(
    z.object({
      name: z.string(),
      style: z.enum(STYLE_KEYS),
      meaning: z.string(),
      rationale: z.string(),
      pronunciation: z.string(),
      handle: z.string(),
    })
  ),
});

const SYSTEM_PROMPT = `Eres especialista en naming en Yorked Studio, un estudio de branding en México. Propones nombres de marca a partir del brief, los conceptos y el research del proyecto, para que el equipo los explore y arme una shortlist.

Buenos nombres para este trabajo:
- Se dicen y se escriben fácil en el mercado del cliente (piensa en cómo suena al decirlo en voz alta, en un mostrador o por teléfono).
- Salen de algo concreto del proyecto: el concepto, el público, el origen, el producto, un hallazgo del research. Nada genérico.
- Son distintos entre sí: varía raíces, sonidos y estilos; no entregues variaciones del mismo nombre.
- No se parecen a los de la competencia ni a marcas muy conocidas. No inventes datos sobre disponibilidad: el equipo revisa dominio, redes e IMPI a mano.
- Respetan los criterios del estudio (estilos pedidos, idioma, largo, lo que hay que evitar).

Para cada nombre entrega:
- name: el nombre, escrito como se usaría en el logotipo (respeta mayúsculas y acentos).
- style: uno de ${NAME_STYLES.map((s) => `"${s.key}" (${s.label.toLowerCase()})`).join(", ")}.
- meaning: qué significa o de dónde viene, en una frase.
- rationale: por qué funciona para esta marca, citando lo del brief o del research que lo sostiene, en una o dos frases.
- pronunciation: cómo se pronuncia si no es obvio para alguien en México; vacío si es obvio.
- handle: un usuario sugerido para redes, sin @, en minúsculas.

Escribe en español de México, claro y sin relleno.`;

function section(title: string, content: string | null | undefined) {
  const text = content?.trim();
  return text ? `## ${title}\n${text}` : "";
}

async function handle(request: NextRequest, { params }: { params: { projectId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Falta configurar ANTHROPIC_API_KEY para sugerir nombres (ver README)." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const count = Math.min(Math.max(Number(body.count) || 8, 3), 15);
  const direction = typeof body.direction === "string" ? body.direction.trim().slice(0, 500) : "";

  const project = await prisma.project.findUnique({ where: { id: params.projectId } });
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const workspace = await ensureWorkspace(params.projectId);
  const items = await prisma.brandItem.findMany({
    where: { projectId: params.projectId, kind: { in: ["comment", "concept", "competitor", "insight", "name"] } },
    orderBy: { createdAt: "asc" },
  });
  const analysis = workspace.briefAnalysis as unknown as BriefAnalysis | null;
  const naming = (workspace.naming ?? {}) as BrandNaming;
  const comments = items.filter((i) => i.kind === "comment" && i.section === "brief" && i.body?.trim());

  if (!workspace.brief?.trim() && !workspace.context?.trim() && !analysis && comments.length === 0 && !naming.convey?.trim()) {
    return NextResponse.json(
      { error: "Primero escribe el brief (etapa 01) o qué debe transmitir el nombre." },
      { status: 400 }
    );
  }

  const concepts = items.filter((i) => i.kind === "concept" && i.status !== "discarded");
  const chosenConcepts = concepts.filter((c) => c.status === "chosen");
  const competitors = items.filter((i) => i.kind === "competitor" && i.title?.trim());
  const insights = items.filter((i) => i.kind === "insight");
  const names = items.filter((i) => i.kind === "name");
  const kept = names.filter((n) => n.status === "shortlist" || n.status === "chosen");
  const discarded = names.filter((n) => n.status === "discarded");
  const others = names.filter((n) => n.status !== "discarded" && n.status !== "shortlist" && n.status !== "chosen");
  const blocks = ((workspace.research ?? {}) as BrandResearch).blocks ?? {};
  const styles = (naming.styles ?? []).filter((s) => STYLE_KEYS.includes(s));

  const promptText = [
    `# Proyecto: ${project.name}${project.client ? ` — cliente: ${project.client}` : ""}`,
    section("Brief principal", workspace.brief),
    section("Contexto", workspace.context),
    analysis && section("Lectura del brief", analysis.summary),
    section("Comentarios del cliente y del equipo", comments.map((c) => `- ${c.body}`).join("\n")),
    section(
      chosenConcepts.length > 0 ? "Concepto elegido" : "Conceptos en exploración",
      (chosenConcepts.length > 0 ? chosenConcepts : concepts)
        .map((c) => `- ${c.title}: ${c.body?.split("\n")[0] ?? ""}`)
        .join("\n")
    ),
    section("Research — Audiencia", blocks.audience),
    section("Research — Categoría", blocks.category),
    section(
      "Hallazgos",
      insights
        .map((i) => {
          const d = (i.data ?? {}) as { found?: string; opportunity?: string };
          return d.found ? `- ${d.found}${d.opportunity ? ` → ${d.opportunity}` : ""}` : "";
        })
        .filter(Boolean)
        .join("\n")
    ),
    section("Competencia (no te parezcas a estos nombres)", competitors.map((c) => `- ${c.title}`).join("\n")),
    section(
      "Criterios de naming del estudio",
      [
        naming.convey?.trim() && `Qué debe transmitir: ${naming.convey.trim()}`,
        styles.length > 0 && `Estilos que nos interesan: ${styles.map((s) => NAME_STYLES.find((x) => x.key === s)?.label).join(", ")}`,
        naming.languages?.trim() && `Idioma: ${naming.languages.trim()}`,
        naming.length?.trim() && `Largo: ${naming.length.trim()}`,
        naming.avoid?.trim() && `Evitar: ${naming.avoid.trim()}`,
        naming.notes?.trim() && `Notas: ${naming.notes.trim()}`,
      ]
        .filter(Boolean)
        .join("\n")
    ),
    section("Nombres que nos gustan (busca en esa dirección, sin repetirlos)", kept.map((n) => `- ${n.title}`).join("\n")),
    section("Nombres descartados (evita ese tipo)", discarded.map((n) => `- ${n.title}`).join("\n")),
    section("Nombres que ya están en la lista (no los repitas)", others.map((n) => `- ${n.title}`).join("\n")),
    direction ? section("Pedido específico para esta ronda", direction) : "",
    `Propón ${count} nombres.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  let response;
  try {
    response = await claudeClient().beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(NamesSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: promptText }],
    });
  } catch (error) {
    return claudeErrorResponse(error, "sugerir-nombres");
  }

  if (response.stop_reason === "refusal") {
    return NextResponse.json({ error: "Claude no pudo sugerir nombres con este brief. Intenta de nuevo." }, { status: 422 });
  }
  // Sin repetir nombres que ya están en la lista
  const existing = new Set(names.map((n) => n.title?.trim().toLowerCase()));
  const fresh = (response.parsed_output?.names ?? []).filter((n) => {
    const key = n.name.trim().toLowerCase();
    if (!key || existing.has(key)) return false;
    existing.add(key);
    return true;
  });
  if (fresh.length === 0) {
    return NextResponse.json({ error: "No llegaron nombres nuevos. Intenta de nuevo." }, { status: 502 });
  }

  const last = await prisma.brandItem.findFirst({
    where: { projectId: params.projectId, section: "naming" },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const base = last?.order ?? 0;

  const created = await prisma.$transaction(
    fresh.map((n, i) => {
      const data: NameData = {
        style: n.style,
        meaning: n.meaning,
        rationale: n.rationale,
        pronunciation: n.pronunciation || undefined,
        handle: n.handle.replace(/^@/, "") || undefined,
      };
      return prisma.brandItem.create({
        data: {
          projectId: params.projectId,
          section: "naming",
          kind: "name",
          title: n.name.trim(),
          status: "explore",
          data: data as object,
          aiGenerated: true,
          order: base + i + 1,
          authorId: user.id,
        },
        include: ITEM_INCLUDE,
      });
    })
  );

  return NextResponse.json(created, { status: 201 });
}

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    return await handle(request, { params });
  } catch (error) {
    return claudeErrorResponse(error, "sugerir-nombres");
  }
}
