import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { AUTH_COOKIE_NAME, verifySessionToken } from "./auth";

export async function getCurrentUser() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true },
  });
}
