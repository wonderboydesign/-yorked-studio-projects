import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ITEM_INCLUDE, ensureWorkspace } from "@/lib/brandingServer";
import { isImage } from "@/lib/branding";

// Generar conceptos puede tardar; en Vercel se amplía el límite de la función
export const maxDuration = 120;

const ConceptsSchema = z.object({
  concepts: z.array(
    z.object({
      name: z.string(),
      idea: z.string(),
      rationale: z.string(),
      keywords: z.array(z.string()),
      visualDirection: z.string(),
      tone: z.string(),
    })
  ),
});

const SYSTEM_PROMPT = `Eres director/a creativo/a senior en Yorked Studio, un estudio de branding. Tu trabajo es proponer conceptos de marca a partir de un brief, para que el equipo los explore después en investigación, moodboards y bocetos.

Cada concepto debe ser una idea central distinta (no variaciones de la misma), anclada en algo concreto del brief: el cliente, su público, su contexto o un problema que mencionen. Evita lugares comunes de branding ("innovación", "cercanía", "calidad") salvo que el brief los convierta en algo específico.

Para cada concepto entrega:
- name: un nombre corto y memorable para el concepto (2 a 4 palabras).
- idea: la idea central en una o dos frases.
- rationale: por qué responde al brief, citando lo que lo justifica.
- keywords: 4 a 6 palabras clave que sirvan para buscar referencias.
- visualDirection: cómo se podría ver (tipografía, color, forma, fotografía, materialidad), en dos o tres frases.
- tone: cómo habla la marca, en una frase.

Escribe en español neutro, claro y sin relleno. Si el brief es escaso, trabaja con lo que hay y deja ver en el rationale qué supuesto tomaste.`;

function section(title: string, content: string | null | undefined) {
  const text = content?.trim();
  return text ? `## ${title}\n${text}` : "";
}

function formatConceptBody(c: z.infer<typeof ConceptsSchema>["concepts"][number]) {
  return [
    c.idea,
    `Por qué: ${c.rationale}`,
    `Dirección visual: ${c.visualDirection}`,
    `Tono: ${c.tone}`,
    `Palabras clave: ${c.keywords.join(", ")}`,
  ].join("\n\n");
}

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Falta configurar ANTHROPIC_API_KEY para generar conceptos (ver README)." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const count = Math.min(Math.max(Number(body.count) || 3, 1), 5);
  const direction = typeof body.direction === "string" ? body.direction.trim() : "";

  const project = await prisma.project.findUnique({ where: { id: params.projectId } });
  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }
  const workspace = await ensureWorkspace(params.projectId);
  if (!workspace.brief?.trim()) {
    return NextResponse.json(
      { error: "Primero escribe el brief principal en la etapa 01." },
      { status: 400 }
    );
  }

  const items = await prisma.brandItem.findMany({
    where: { projectId: params.projectId, section: { in: ["brief", "concept"] } },
    orderBy: { createdAt: "asc" },
  });
  const comments = items.filter((i) => i.kind === "comment" && i.body);
  const references = items.filter((i) => i.kind === "reference");
  const existingConcepts = items.filter((i) => i.kind === "concept" && i.status !== "discarded");

  const promptText = [
    `# Proyecto: ${project.name}${project.client ? ` — cliente: ${project.client}` : ""}`,
    section("Brief principal", workspace.brief),
    section("Contexto", workspace.context),
    section("Comentarios del cliente y del equipo", comments.map((c) => `- ${c.body}`).join("\n")),
    section("Notas de conceptualización", workspace.conceptNotes),
    section(
      "Referencias que subió el equipo",
      references
        .map((r) => `- ${[r.title, r.body, r.linkUrl].filter(Boolean).join(" — ")}`)
        .filter((line) => line !== "- ")
        .join("\n")
    ),
    section(
      "Conceptos que ya existen (propón otros distintos)",
      existingConcepts.map((c) => `- ${c.title}: ${c.body?.split("\n")[0] ?? ""}`).join("\n")
    ),
    direction ? section("Pedido específico para esta ronda", direction) : "",
    `Propón ${count} concepto${count === 1 ? "" : "s"}.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Las imágenes de referencia ayudan a leer la intención visual del equipo
  const imageBlocks: Anthropic.Beta.BetaImageBlockParam[] = references
    .filter((r) => r.url && isImage(r.contentType, r.url))
    .slice(0, 6)
    .map((r) => ({ type: "image", source: { type: "url", url: r.url! } }));

  const client = new Anthropic();

  async function generate(withImages: boolean) {
    return client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: betaZodOutputFormat(ConceptsSchema) },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [...(withImages ? imageBlocks : []), { type: "text", text: promptText }],
        },
      ],
    });
  }

  let response;
  try {
    try {
      response = await generate(imageBlocks.length > 0);
    } catch (error) {
      // Una imagen que no se puede descargar no debería tumbar la ronda
      if (imageBlocks.length > 0 && error instanceof Anthropic.BadRequestError) {
        response = await generate(false);
      } else {
        throw error;
      }
    }
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "La ANTHROPIC_API_KEY no es válida." }, { status: 502 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Se alcanzó el límite de uso de la API. Intenta en un minuto." },
        { status: 429 }
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Error de la API de Claude (${error.status ?? "sin estado"}).` },
        { status: 502 }
      );
    }
    throw error;
  }

  if (response.stop_reason === "refusal") {
    return NextResponse.json(
      { error: "Claude no pudo generar conceptos con este brief. Ajusta el texto e intenta de nuevo." },
      { status: 422 }
    );
  }
  const concepts = response.parsed_output?.concepts ?? [];
  if (concepts.length === 0) {
    return NextResponse.json({ error: "No llegaron conceptos. Intenta de nuevo." }, { status: 502 });
  }

  const last = await prisma.brandItem.findFirst({
    where: { projectId: params.projectId, section: "concept" },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const base = last?.order ?? 0;

  const created = await prisma.$transaction(
    concepts.map((c, i) =>
      prisma.brandItem.create({
        data: {
          projectId: params.projectId,
          section: "concept",
          kind: "concept",
          title: c.name,
          body: formatConceptBody(c),
          status: "proposed",
          aiGenerated: true,
          order: base + i + 1,
          authorId: user.id,
        },
        include: ITEM_INCLUDE,
      })
    )
  );

  return NextResponse.json(created, { status: 201 });
}
