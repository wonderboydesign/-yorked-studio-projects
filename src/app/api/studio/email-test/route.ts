import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { emailConfigured, sendTestEmail } from "@/lib/email";

// Estado del correo de avisos y envío de una prueba al correo de quien la pide
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ configured: emailConfigured(), from: process.env.RESEND_FROM_EMAIL || null });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const result = await sendTestEmail(user.email);
  return NextResponse.json({ ...result, to: user.email });
}
