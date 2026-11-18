import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { claudeClient, claudeErrorResponse } from "@/lib/claudeErrors";
import { isBlobUrl } from "@/lib/portalServer";

// Leer una imagen o PDF puede tardar
export const maxDuration = 120;

const ReadSchema = z.object({
  title: z.string(),
  supplier: z.string(),
  items: z.array(z.object({ description: z.string(), quantity: z.number(), unitPrice: z.number() })),
  pricesIncludeIva: z.boolean(),
  validDays: z.number(),
  notes: z.string(),
});

const SYSTEM_PROMPT = `Lees cotizaciones de proveedores (imprentas, producción, rotulación, empaques…) que recibe un estudio de diseño en México y las pasas a una tabla limpia para presentársela a su cliente.

Devuelve:
- title: un título corto de lo que se cotiza, para el cliente (ej. "Impresión de vasos y bolsas").
- supplier: el nombre del proveedor si aparece; vacío si no.
- items: un renglón por concepto, con description (clara, incluye medidas, materiales y acabados si vienen), quantity (número; 1 si es un servicio o lote) y unitPrice (precio unitario en MXN, número sin signos). Si solo viene el importe total del renglón, divide entre la cantidad. No inventes conceptos ni precios.
- pricesIncludeIva: true si los precios ya traen IVA incluido; false si son antes de IVA o no se dice.
- validDays: días de vigencia si se mencionan; 0 si no.
- notes: condiciones importantes para el cliente (tiempos de entrega, anticipo, envío, lo que no incluye), en una o dos frases; vacío si no hay.

Escribe en español de México.`;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Falta configurar ANTHROPIC_API_KEY para leer con Claude." }, { status: 503 });
    }
    const body = await request.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 20000) : "";
    const fileUrl = isBlobUrl(body.fileUrl) ? body.fileUrl : null;
    if (!text && !fileUrl) return NextResponse.json({ error: "Pega el texto o sube la imagen/PDF de la cotización." }, { status: 400 });

    const isPdf = !!fileUrl && (body.contentType === "application/pdf" || /\.pdf(\?|$)/i.test(fileUrl));
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    if (fileUrl) content.push(isPdf ? { type: "document", source: { type: "url", url: fileUrl } } : { type: "image", source: { type: "url", url: fileUrl } });
    content.push({ type: "text", text: text ? `Cotización del proveedor:\n\n${text}` : "Lee la cotización adjunta." });

    let response;
    try {
      response = await claudeClient().beta.messages.parse({
        model: "claude-opus-5-5",
        max_tokens: 8000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low", format: betaZodOutputFormat(ReadSchema) },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      });
    } catch (error) {
      return claudeErrorResponse(error, "leer-cotizacion-proveedor");
    }
    const out = response.parsed_output;
    if (response.stop_reason === "refusal" || !out) {
      return NextResponse.json({ error: "Claude no pudo leer la cotización. Revisa que se vea completa o captúrala a mano." }, { status: 422 });
    }
    return NextResponse.json(out);
  } catch (error) {
    return claudeErrorResponse(error, "leer-cotizacion-proveedor");
  }
}
