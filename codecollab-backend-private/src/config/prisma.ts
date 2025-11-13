import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

// Optional: connect on app start
prisma.$connect();

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

export default prisma;
