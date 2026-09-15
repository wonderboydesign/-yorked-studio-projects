// Crea (o actualiza la contraseña de) el primer usuario para poder entrar a la app.
// Uso: SEED_NAME="Ana" SEED_EMAIL="ana@brada.mx" SEED_PASSWORD="algo-largo" npm run db:seed
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const name = process.env.SEED_NAME;
  const email = process.env.SEED_EMAIL;
  const password = process.env.SEED_PASSWORD;

  if (!name || !email || !password) {
    console.error(
      "Faltan variables de entorno. Uso: SEED_NAME=... SEED_EMAIL=... SEED_PASSWORD=... npm run db:seed"
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("SEED_PASSWORD debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { name: name.trim(), passwordHash },
    create: { name: name.trim(), email: normalizedEmail, passwordHash },
  });

  console.log(`Usuario listo: ${user.name} <${user.email}>`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
