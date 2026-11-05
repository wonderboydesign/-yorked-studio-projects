import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

// Respuesta legible para cualquier falla al llamar a Claude. Lo inesperado se
// registra completo en los logs del servidor (Vercel → Logs) y al usuario le
// llega la causa en una línea, en lugar de un "Error 500" sin explicación.
export function claudeErrorResponse(error: unknown, where: string) {
  console.error(`[${where}]`, error);
  if (error instanceof Anthropic.AuthenticationError) {
    return NextResponse.json({ error: "La ANTHROPIC_API_KEY no es válida. Revísala en Vercel." }, { status: 502 });
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return NextResponse.json(
      { error: "La clave no tiene permiso para este modelo. Revisa tu cuenta en platform.claude.com." },
      { status: 502 }
    );
  }
  if (error instanceof Anthropic.RateLimitError) {
    return NextResponse.json({ error: "Se alcanzó el límite de uso de la API. Intenta en un minuto." }, { status: 429 });
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return NextResponse.json({ error: "Claude tardó demasiado en responder. Intenta de nuevo." }, { status: 504 });
  }
  if (error instanceof Anthropic.APIError) {
    const detail = (error.error as { error?: { message?: string } } | undefined)?.error?.message ?? error.message;
    const credit = /credit balance|billing/i.test(detail ?? "");
    return NextResponse.json(
      {
        error: credit
          ? "Tu cuenta de Claude no tiene créditos. Agrégalos en platform.claude.com → Billing."
          : `Claude respondió con un error (${error.status ?? "sin estado"}): ${String(detail).slice(0, 200)}`,
      },
      { status: 502 }
    );
  }
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ error: `Error inesperado: ${message.slice(0, 240)}` }, { status: 500 });
}
