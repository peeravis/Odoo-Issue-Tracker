import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("admin1234", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin",
      password: hashedPassword,
      role: "admin",
    },
  });

  console.log("Admin user created:", admin.email);

  const project = await prisma.project.upsert({
    where: { code: "DEMO" },
    update: {},
    create: {
      name: "Demo Project",
      code: "DEMO",
      description: "Demo project for testing",
    },
  });

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: admin.id } },
    update: {},
    create: { projectId: project.id, userId: admin.id },
  });

  const issueTypes = ["Bug", "Request", "Change", "Question"];
  const modules = ["Sales", "Inventory", "Accounting", "HR", "API"];
  const departments = ["IT", "Finance", "Operations", "Sales", "Support"];

  for (let i = 0; i < issueTypes.length; i++) {
    await prisma.dropdownMaster.upsert({
      where: { type_label: { type: "issueType", label: issueTypes[i] } },
      update: {},
      create: { type: "issueType", label: issueTypes[i], sortOrder: i },
    });
  }

  for (let i = 0; i < modules.length; i++) {
    await prisma.dropdownMaster.upsert({
      where: { type_label: { type: "module", label: modules[i] } },
      update: {},
      create: { type: "module", label: modules[i], sortOrder: i },
    });
  }

  for (let i = 0; i < departments.length; i++) {
    await prisma.dropdownMaster.upsert({
      where: { type_label: { type: "department", label: departments[i] } },
      update: {},
      create: { type: "department", label: departments[i], sortOrder: i },
    });
  }

  await prisma.client.upsert({
    where: { name: "Demo Client" },
    update: {},
    create: { name: "Demo Client", code: "DC001" },
  });

  // Create sample issues
  const clientRow = await prisma.client.findFirst({ where: { name: "Demo Client" } });

  for (let i = 1; i <= 5; i++) {
    const statuses = ["open", "in_progress", "resolved", "closed", "reopened"] as const;
    const priorities = ["high", "medium", "low", "medium", "high"] as const;
    await prisma.issue.upsert({
      where: { projectId_issueNumber: { projectId: project.id, issueNumber: i } },
      update: {},
      create: {
        projectId: project.id,
        issueNumber: i,
        title: `Sample Issue #${i} - ปัญหาตัวอย่าง`,
        status: statuses[i - 1],
        priority: priorities[i - 1],
        issueType: issueTypes[i % issueTypes.length],
        module: modules[i % modules.length],
        department: departments[i % departments.length],
        clientId: clientRow?.id,
        createdById: admin.id,
        loggedById: admin.id,
        assigneeId: admin.id,
        dateReported: new Date(),
        solution: i > 2 ? `แก้ไขโดยการ update config ที่ server #${i}` : null,
      },
    });
  }

  console.log("Demo data seeded successfully");
  console.log("\n=== Admin Credentials ===");
  console.log("Email:    admin@example.com");
  console.log("Password: admin1234");
  console.log("URL:      http://localhost:3000");
  console.log("=========================\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
