import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { claudeClient, claudeErrorResponse } from "@/lib/claudeErrors";
import { ensureWorkspace } from "@/lib/brandingServer";
import { BRIEF_CHECKLIST, BriefAnalysis, isImage } from "@/lib/branding";

// Leer PDFs e imágenes puede tardar
export const maxDuration = 120;

const AnalysisSchema = z.object({
  summary: z.string(),
  fields: z.array(
    z.object({
      key: z.string(),
      status: z.enum(["ok", "partial", "missing"]),
      value: z.string(),
    })
  ),
  questions: z.array(z.object({ question: z.string(), why: z.string() })),
  keywords: z.array(z.string()),
  conceptSeed: z.object({ name: z.string(), idea: z.string(), why: z.string() }),
});

const SYSTEM_PROMPT = `Eres estratega de marca en Yorked Studio, un estudio de branding. Al arrancar un proyecto lees todo lo que mandó el cliente (brief, notas, comentarios, archivos) para que el equipo sepa qué ya está claro y qué falta antes de diseñar.

Devuelve:
- summary: el proyecto en 3 a 5 frases, como se lo contarías a alguien del equipo que no estuvo en la junta.
- fields: una entrada por cada punto del checklist que se te da (usa su key exacta). status "ok" si está claro, "partial" si hay algo pero falta precisión, "missing" si no hay nada. value: lo que se sabe, en una o dos frases; si falta, qué falta exactamente.
- questions: de 3 a 8 preguntas para el cliente, ordenadas por importancia, redactadas para mandarse tal cual por WhatsApp o correo (cálidas, concretas, sin tecnicismos). why: para el equipo, qué decisión de diseño depende de la respuesta.
- keywords: de 5 a 10 palabras clave para buscar referencias y armar moodboards.
- conceptSeed: un concepto inicial de marca que salga de lo que ya se sabe, aunque falte información. name corto (2 a 4 palabras), idea en una o dos frases, why: qué del brief lo sostiene y qué supuesto tomaste.

No inventes datos del cliente: si algo no está, márcalo como faltante. Escribe en español de México, claro y sin relleno.`;

function block(title: string, text?: string | null) {
  const t = text?.trim();
  return t ? `## ${title}\n${t}` : "";
}

async function handle(_request: NextRequest, { params }: { params: { projectId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Falta configurar ANTHROPIC_API_KEY para analizar con Claude (ver README)." },
      { status: 503 }
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: { prospects: { orderBy: { updatedAt: "desc" }, take: 1 } },
  });
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const workspace = await ensureWorkspace(params.projectId);
  const items = await prisma.brandItem.findMany({
    where: { projectId: params.projectId, section: "brief" },
    orderBy: { createdAt: "asc" },
  });
  const comments = items.filter((i) => i.kind === "comment" && i.body?.trim());
  const files = items.filter((i) => i.kind === "file" && i.url);
  const prospect = project.prospects[0];

  if (!workspace.brief?.trim() && !workspace.context?.trim() && comments.length === 0 && files.length === 0 && !prospect?.needs) {
    return NextResponse.json(
      { error: "Aún no hay nada que analizar: escribe el brief, una nota o sube un archivo." },
      { status: 400 }
    );
  }

  const text = [
    `# Proyecto: ${project.name}${project.client ? ` — cliente: ${project.client}` : ""}`,
    block("Brief principal", workspace.brief),
    block("Contexto", workspace.context),
    block("Comentarios y notas", comments.map((c) => `- ${c.body}`).join("\n")),
    prospect &&
      block(
        "Lo que se capturó al cotizar",
        [
          prospect.category && `Giro: ${prospect.category}`,
          prospect.city && `Ciudad: ${prospect.city}`,
          prospect.budget && `Presupuesto mencionado: ${prospect.budget}`,
          prospect.needs && `Qué necesita: ${prospect.needs}`,
          prospect.notes && `Notas: ${prospect.notes}`,
        ]
          .filter(Boolean)
          .join("\n")
      ),
    files.length > 0 && `## Archivos adjuntos\n${files.map((f) => `- ${f.title}`).join("\n")}\n(Los PDF e imágenes van adjuntos arriba.)`,
    `## Checklist del brief (usa estas keys)\n${BRIEF_CHECKLIST.map((c) => `- ${c.key}: ${c.label} — ${c.hint}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  // PDF e imágenes del brief se le pasan a Claude para que los lea
  const attachments: Anthropic.Beta.BetaContentBlockParam[] = files.slice(0, 6).flatMap((f): Anthropic.Beta.BetaContentBlockParam[] => {
    if (f.contentType === "application/pdf" || /\.pdf(\?|$)/i.test(f.url!)) {
      return [{ type: "document", source: { type: "url", url: f.url! }, title: f.title ?? undefined }];
    }
    if (isImage(f.contentType, f.url)) return [{ type: "image", source: { type: "url", url: f.url! } }];
    return [];
  });

  const client = claudeClient();
  const run = (withFiles: boolean) =>
    client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: betaZodOutputFormat(AnalysisSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: [...(withFiles ? attachments : []), { type: "text", text }] }],
    });

  let response;
  try {
    try {
      response = await run(attachments.length > 0);
    } catch (error) {
      // Un archivo que no se pueda leer no debe tumbar el análisis
      if (attachments.length > 0 && error instanceof Anthropic.BadRequestError) response = await run(false);
      else throw error;
    }
  } catch (error) {
    return claudeErrorResponse(error, "analizar-brief");
  }

  const out = response.parsed_output;
  if (response.stop_reason === "refusal" || !out) {
    return NextResponse.json({ error: "Claude no pudo analizar el brief. Intenta de nuevo." }, { status: 422 });
  }

  // Se guarda en el orden del checklist, con sus etiquetas
  const analysis: BriefAnalysis = {
    analyzedAt: new Date().toISOString(),
    summary: out.summary,
    fields: BRIEF_CHECKLIST.map((c) => {
      const f = out.fields.find((x) => x.key === c.key);
      return { key: c.key, label: c.label, status: f?.status ?? "missing", value: f?.value ?? "" };
    }),
    questions: out.questions,
    keywords: out.keywords,
    conceptSeed: out.conceptSeed,
  };

  await prisma.brandWorkspace.update({
    where: { projectId: params.projectId },
    data: { briefAnalysis: analysis as unknown as object },
  });
  return NextResponse.json(analysis);
}

export async function POST(_request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    return await handle(_request, { params });
  } catch (error) {
    return claudeErrorResponse(error, "analizar-brief");
  }
}
