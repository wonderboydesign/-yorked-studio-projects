// Resetea la contraseña de un usuario existente (por si se le olvida y nadie
// más puede entrar a "Equipo" para cambiársela).
// Uso: RESET_EMAIL="tu@correo.com" RESET_PASSWORD="algo-largo" npm run db:reset-password
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.RESET_EMAIL;
  const password = process.env.RESET_PASSWORD;

  if (!email || !password) {
    console.error(
      "Uso: RESET_EMAIL=... RESET_PASSWORD=... npm run db:reset-password"
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("RESET_PASSWORD debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.update({
      where: { email: normalizedEmail },
      data: { passwordHash },
    });
    console.log(`Contraseña actualizada para ${user.name} <${user.email}>`);
  } catch {
    console.error(`No existe ningún usuario con el correo ${normalizedEmail}`);
    process.exit(1);
  }
}

main().finally(() => prisma.$disconnect());
