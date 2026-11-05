import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

// Respuesta legible para cualquier falla al llamar a Claude. Lo inesperado se
// registra completo en los logs del servidor (Vercel → Logs) y al usuario le
// llega la causa en una línea, en lugar de un "Error 500" sin explicación.
const KEY_PATTERN = /sk-ant-[A-Za-z0-9_-]+/g;

// Nunca debe salir una clave en un mensaje ni en los logs
export function redactSecrets(text: string) {
  return text.replace(KEY_PATTERN, "sk-ant-•••");
}

// Cliente de Claude. Si en Vercel se pegó algo más que la clave (por ejemplo un
// comando curl completo, comillas o saltos de línea), se toma solo la clave.
export function claudeClient() {
  const raw = process.env.ANTHROPIC_API_KEY ?? "";
  const apiKey = raw.match(/sk-ant-[A-Za-z0-9_-]+/)?.[0] ?? raw.trim();
  return new Anthropic({ apiKey });
}

export function claudeErrorResponse(error: unknown, where: string) {
  const logged = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ""}` : String(error);
  console.error(`[${where}]`, redactSecrets(logged));
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
          : `Claude respondió con un error (${error.status ?? "sin estado"}): ${redactSecrets(String(detail)).slice(0, 200)}`,
      },
      { status: 502 }
    );
  }
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ error: `Error inesperado: ${redactSecrets(message).slice(0, 240)}` }, { status: 500 });
}
