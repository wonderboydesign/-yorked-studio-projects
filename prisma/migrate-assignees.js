// Copia el responsable único de cada tarea (campo en desuso `assigneeId`)
// a la nueva relación de varios responsables (`assignees`). Se corre una
// sola vez, después de `prisma db push`, para no perder las asignaciones
// que ya existían. Es seguro correrlo más de una vez: no duplica nada.
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.task.findMany({
    where: { assigneeId: { not: null } },
    select: { id: true, assigneeId: true },
  });

  let migrated = 0;
  for (const task of tasks) {
    await prisma.task.update({
      where: { id: task.id },
      data: { assignees: { connect: [{ id: task.assigneeId }] } },
    });
    migrated++;
  }

  console.log(`Listo: ${migrated} tarea(s) con su responsable copiado a la asignación múltiple.`);
}

main()
  .catch((err) => {
    console.error("Error al migrar responsables:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
