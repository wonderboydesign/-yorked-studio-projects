import { prisma } from "./prisma";

const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

function getRedirectUri(origin: string) {
  return `${origin}/api/auth/google/callback`;
}

export function getGoogleAuthUrl(origin: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const params = new URLSearchParams({
    client_id: clientId || "",
    redirect_uri: getRedirectUri(origin),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, origin: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: getRedirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Error al intercambiar el código: ${await res.text()}`);
  }
  return res.json();
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Error al refrescar el token: ${await res.text()}`);
  }
  return res.json();
}

export async function isGoogleCalendarConnected() {
  const auth = await prisma.googleAuth.findUnique({ where: { id: "singleton" } });
  return !!auth;
}

export async function disconnectGoogleCalendar() {
  await prisma.googleAuth.deleteMany({});
}

export async function fetchUpcomingEvents(daysAhead: number = 7) {
  const auth = await prisma.googleAuth.findUnique({ where: { id: "singleton" } });
  if (!auth) return null;

  let access_token: string;
  try {
    const tokens = await refreshAccessToken(auth.refreshToken);
    access_token = tokens.access_token;
  } catch (e) {
    // El refresh token dejó de ser válido (revocado, o expiró por la
    // política de 7 días que Google aplica a apps en modo "Testing").
    // Borramos la conexión guardada para que la UI pida reconectar
    // en vez de fallar en silencio.
    await prisma.googleAuth.deleteMany({});
    throw new Error("TOKEN_EXPIRED");
  }

  const timeMin = new Date();
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + daysAhead);

  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "15",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );

  if (!res.ok) {
    const errBody = await res.text();
    console.error("Google Calendar API error:", res.status, errBody);
    throw new Error(`Error al obtener eventos: ${errBody}`);
  }

  const data = await res.json();
  return (data.items || []).map((e: any) => ({
    id: e.id,
    title: e.summary || "(Sin título)",
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date,
    allDay: !e.start?.dateTime,
    link: e.hangoutLink || e.htmlLink,
  }));
}
