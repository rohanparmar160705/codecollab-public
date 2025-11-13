import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const permissions = [
    { action: "create", resource: "roles" },
    { action: "read", resource: "roles" },
    { action: "update", resource: "roles" },
    { action: "delete", resource: "roles" },
    { action: "create", resource: "permissions" },
    { action: "read", resource: "permissions" },
    { action: "delete", resource: "permissions" },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { action_resource: { action: p.action, resource: p.resource } },
      update: {},
      create: p,
    });
  }
}

main()
  .then(() => console.log("✅ Permissions seeded"))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
