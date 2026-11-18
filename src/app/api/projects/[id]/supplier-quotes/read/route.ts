import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { claudeClient, claudeErrorResponse } from "@/lib/claudeErrors";
import { isBlobUrl } from "@/lib/portalServer";

// Leer una imagen o PDF puede tardar
export const maxDuration = 120;

const Row = z.object({ label: z.string(), value: z.string() });

const QuoteRead = z.object({
  title: z.string(),
  supplier: z.string(),
  subtitle: z.string(),
  forName: z.string(),
  attention: z.string(),
  items: z.array(z.object({ description: z.string(), detail: z.string(), quantity: z.number(), unitPrice: z.number() })),
  pricesIncludeIva: z.boolean(),
  validDays: z.number(),
  notes: z.string(),
  qtyLabel: z.string(),
  qtyValue: z.string(),
  qtyUnit: z.string(),
  summaryLabel: z.string(),
  summaryItem: z.number(),
  summaryNote: z.string(),
  sections: z.array(z.object({ title: z.string(), rows: z.array(Row) })),
  deliveryTime: z.string(),
  paymentForm: z.string(),
  advancePercent: z.number(),
});

const OptionsRead = z.object({
  title: z.string(),
  subtitle: z.string(),
  forName: z.string(),
  note: z.string(),
  noteSub: z.string(),
  categories: z.array(
    z.object({
      name: z.string(),
      products: z.array(
        z.object({
          supplier: z.string(),
          title: z.string(),
          note: z.string(),
          price: z.number(),
          priceUnknown: z.boolean(),
          priceLabel: z.string(),
          link: z.string(),
        })
      ),
    })
  ),
});

const QUOTE_PROMPT = `Lees la información de un proveedor (cotización, correo, WhatsApp, PDF o foto) para un estudio de diseño en México, y la acomodas en el formato de cotización del estudio, que se presenta al cliente.

Devuelve:
- title: título corto ("Cotización"). subtitle: de qué trata, una frase ("Impresión de catálogos y encarpetado.").
- supplier: nombre del proveedor si aparece (es interno, no se muestra al cliente); vacío si no.
- forName: a quién va dirigida (cliente); attention: persona de atención; vacíos si no aparecen.
- items: un renglón por concepto: description (corta), detail (una línea con especificaciones; vacío si no hay), quantity y unitPrice en MXN. Si solo hay importe total, divide entre la cantidad. No inventes conceptos ni precios.
- pricesIncludeIva: true solo si los precios ya traen IVA incluido.
- qtyLabel ("Cantidad"), qtyValue (número como texto), qtyUnit (unidad: "catálogos"): la cantidad principal para el resumen; vacíos si no hay una principal.
- summaryLabel: nombre del costo principal para el resumen ("Costo de impresión de catálogos"); summaryItem: índice (desde 0) del renglón de items que se resalta; summaryNote: nota corta ("más IVA, por los 10 catálogos").
- sections: bloques de especificaciones, cada uno con title ("Especificaciones", "Encarpetado") y rows de label/value ("Papel" / "Couché de 300 gramos"). Pon aquí materiales, acabados, medidas, etc.
- deliveryTime ("Aproximadamente 3 semanas"), paymentForm ("50% de anticipo y 50% contra entrega"), advancePercent (50 si no se dice otra cosa; 0 si no hay anticipo).
- validDays: días de vigencia si se mencionan; 0 si no. notes: condiciones importantes para el cliente, una o dos frases; vacío si no hay.

Escribe en español de México, claro y sin relleno.`;

const OPTIONS_PROMPT = `Lees información de productos de proveedores o tiendas (listas, links, capturas, PDF) para un estudio de diseño en México, y la acomodas como un catálogo de opciones para que el cliente elija, por categorías.

Devuelve:
- title: título corto ("Proveedores"). subtitle: de qué trata ("Merch para Protech Films. Opciones para elegir la que mejor te convenga."). forName: cliente si aparece.
- note y noteSub: aclaraciones sobre precios (moneda, que pueden variar); vacías si no aparecen.
- categories: cada una con name ("Playeras") y products. Cada producto: supplier (tienda o proveedor: "Mercado Libre", "Amazon México"), title (nombre del producto, claro), note (aclaración corta, p. ej. "Costo unitario aprox. $96 por playera" o "Precio en dólares"; vacío si no hace falta), price (número; 0 si no se conoce) con priceUnknown true si no hay precio, priceLabel (lo que va debajo del precio: "MXN por pieza", "paquete de 3 piezas", "dólares (precio original)") y link (URL del producto si aparece; vacío si no).
No inventes productos ni precios. Agrupa por tipo de producto.

Escribe en español de México, claro y sin relleno.`;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Falta configurar ANTHROPIC_API_KEY para leer con Claude." }, { status: 503 });
    }
    const body = await request.json().catch(() => ({}));
    const kind = body.kind === "options" ? "options" : "quote";
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 30000) : "";
    const fileUrl = isBlobUrl(body.fileUrl) ? body.fileUrl : null;
    if (!text && !fileUrl) return NextResponse.json({ error: "Pega el texto o sube la imagen/PDF." }, { status: 400 });

    const isPdf = !!fileUrl && (body.contentType === "application/pdf" || /\.pdf(\?|$)/i.test(fileUrl));
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    if (fileUrl) content.push(isPdf ? { type: "document", source: { type: "url", url: fileUrl } } : { type: "image", source: { type: "url", url: fileUrl } });
    content.push({ type: "text", text: text ? `Información del proveedor:\n\n${text}` : "Lee la información adjunta." });

    const format = kind === "options" ? betaZodOutputFormat(OptionsRead) : betaZodOutputFormat(QuoteRead);
    let response;
    try {
      response = await claudeClient().beta.messages.parse({
        model: "claude-opus-5-5",
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium", format },
        system: kind === "options" ? OPTIONS_PROMPT : QUOTE_PROMPT,
        messages: [{ role: "user", content }],
      });
    } catch (error) {
      return claudeErrorResponse(error, "leer-cotizacion-proveedor");
    }
    const out = response.parsed_output;
    if (response.stop_reason === "refusal" || !out) {
      return NextResponse.json({ error: "Claude no pudo leer la información. Revisa que se vea completa o captúrala a mano." }, { status: 422 });
    }
    return NextResponse.json({ kind, ...out });
  } catch (error) {
    return claudeErrorResponse(error, "leer-cotizacion-proveedor");
  }
}
