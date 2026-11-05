import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { claudeErrorResponse } from "@/lib/claudeErrors";
import { getStudio } from "@/lib/quotesServer";

// Sugerir alcance, tiempos y precio puede tardar
export const maxDuration = 120;

const SuggestionSchema = z.object({
  reasoning: z.string(),
  summary: z.string(),
  category: z.string(),
  touchpoints: z.string(),
  weeks: z.string(),
  phase1Focus: z.string(),
  applications: z.array(z.string()),
  options: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      phases: z.string(),
      price: z.number(),
      duration: z.string(),
      features: z.array(z.string()),
      note: z.string(),
      recommended: z.boolean(),
    })
  ),
  extras: z.array(z.object({ name: z.string(), price: z.string() })),
  accent: z.string(),
  dark: z.string(),
});

export type QuoteSuggestion = z.infer<typeof SuggestionSchema>;

const SYSTEM_PROMPT = `Eres la directora comercial de Yorked Studio by Wonder Boy Design®, un estudio de branding en Querétaro. Preparas propuestas de identidad de marca a partir de lo que pide un prospecto.

Tu trabajo: proponer alcance, aplicaciones, tiempos y precio usando SIEMPRE el tabulador del estudio como base. No inventes precios fuera de su lógica: ajusta dentro de los rangos según cuántas aplicaciones o presentaciones (SKU) necesita y su complejidad. Si el presupuesto del prospecto es menor, propón una opción que entre en él sin regalar el trabajo, y explícalo.

Devuelve:
- reasoning: para el estudio (el cliente no lo ve). Por qué ese alcance y ese precio, supuestos que tomaste y qué preguntarle al cliente.
- summary: una línea como "Diseño de identidad y sistema de marca para <marca>."
- category: la categoría como se usaría en "En una categoría como …" (ej. "el matcha", "el café de especialidad").
- touchpoints: dónde vivirá la marca, ej. "en barra, en vaso, en empaque y en digital".
- weeks: semanas totales del alcance recomendado, ej. "6–7".
- phase1Focus: primer punto de la Fase 01, ej. "Análisis del entorno: categoría matcha, cafeterías de especialidad, competencia".
- applications: lista concreta de aplicaciones de la Fase 03 para este negocio (vasos, empaque, menú, señalética, redes…), una por elemento.
- options: 1 opción si el pedido es claro, o 3 (A, B, C) si conviene dar niveles. Cada una con key (A/B/C), name, phases ("Fase 01 + 02 + 03 + 04"), price en MXN sin IVA (número entero, redondeado a miles), duration ("5–6 semanas"), features (lo que incluye, termina con rutas y rondas, ej. "2 rutas visuales · 2 rondas de ajuste"), note (una frase de para quién es; vacía si es una sola opción) y recommended (solo una en true).
- extras: servicios adicionales del tabulador que tengan sentido para este cliente, con su precio en texto.
- accent: un color hex de acento que evoque la categoría (para el título de la propuesta); dark: una versión oscura de ese color para el bloque de cierre.

Escribe en español de México, claro, sin relleno.`;

async function handle(_request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Falta configurar ANTHROPIC_API_KEY para sugerir con Claude (ver README)." },
      { status: 503 }
    );
  }

  const quote = await prisma.quote.findUnique({ where: { id: params.id }, include: { prospect: true } });
  if (!quote) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
  const p = quote.prospect;
  const studio = await getStudio();

  const prompt = [
    `# Prospecto: ${p.brandName}`,
    p.contact && `Contacto: ${p.contact}`,
    p.city && `Ciudad: ${p.city}`,
    p.category && `Giro / categoría: ${p.category}`,
    p.budget && `Presupuesto que mencionó: ${p.budget}`,
    p.needs ? `## Lo que necesita\n${p.needs}` : "## Lo que necesita\n(No se capturó; propón el alcance estándar de identidad de marca.)",
    p.notes && `## Notas internas\n${p.notes}`,
    `## Tabulador del estudio\n${studio.pricing}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const client = new Anthropic();
  let response;
  try {
    response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: betaZodOutputFormat(SuggestionSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (error) {
    return claudeErrorResponse(error, "sugerir-cotizacion");
  }

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return NextResponse.json({ error: "Claude no pudo armar la sugerencia. Intenta de nuevo." }, { status: 422 });
  }
  return NextResponse.json(response.parsed_output);
}

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    return await handle(_request, { params });
  } catch (error) {
    return claudeErrorResponse(error, "sugerir-cotizacion");
  }
}
