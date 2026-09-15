// Crea el primer usuario para poder entrar a la app, si todavía no existe.
// Uso manual: SEED_NAME="Ana" SEED_EMAIL="ana@brada.mx" SEED_PASSWORD="algo-largo" npm run db:seed
// También corre como parte de "npm run build": si faltan las variables SEED_*
// o el usuario ya existe, no hace nada y termina sin error (para no romper el deploy).
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const name = process.env.SEED_NAME;
  const email = process.env.SEED_EMAIL;
  const password = process.env.SEED_PASSWORD;

  if (!name || !email || !password) {
    console.log(
      "SEED_NAME/SEED_EMAIL/SEED_PASSWORD no están definidas, omitiendo seed de usuario."
    );
    return;
  }
  if (password.length < 8) {
    console.log("SEED_PASSWORD debe tener al menos 8 caracteres, omitiendo seed de usuario.");
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    console.log(`El usuario ${normalizedEmail} ya existe, no se modifica.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name: name.trim(), email: normalizedEmail, passwordHash },
  });

  console.log(`Usuario creado: ${user.name} <${user.email}>`);
}

main()
  .catch((err) => {
    // No tumbamos el build/deploy por un problema al sembrar el usuario inicial.
    console.error("Error al correr el seed de usuario (se ignora):", err);
  })
  .finally(() => prisma.$disconnect());
