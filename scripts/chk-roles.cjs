const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const roles = await prisma.user.findMany({ where: { role: { not: "user" } }, select: { id: true, username: true, nickname: true, role: true }, take: 10 });
  console.log(JSON.stringify(roles, null, 2));
  await prisma.$disconnect();
})();
