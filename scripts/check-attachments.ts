import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { stat } from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const attachments = await prisma.attachment.findMany({
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      createdAt: true,
      issueId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const missing: typeof attachments = [];
  const suspicious: (typeof attachments[number] & { size: number })[] = [];
  const ok: typeof attachments = [];

  for (const a of attachments) {
    const diskName = path.basename(a.fileUrl);
    const filePath = path.join(UPLOAD_DIR, diskName);
    try {
      const s = await stat(filePath);
      if (s.size === 0) {
        suspicious.push({ ...a, size: 0 });
      } else if (s.size < 1024) {
        suspicious.push({ ...a, size: s.size });
      } else {
        ok.push(a);
      }
    } catch {
      missing.push(a);
    }
  }

  console.log(`UPLOAD_DIR: ${UPLOAD_DIR}`);
  console.log(`Total attachments in DB: ${attachments.length}`);
  console.log(`  OK on disk:   ${ok.length}`);
  console.log(`  Suspicious:   ${suspicious.length} (0 or <1KB — likely truncated)`);
  console.log(`  Missing:      ${missing.length}`);

  if (missing.length) {
    console.log("\n=== MISSING FILES ===");
    for (const a of missing) {
      console.log(
        `${a.createdAt.toISOString()}  issue=${a.issueId}  id=${a.id}  file=${a.fileName}  url=${a.fileUrl}`,
      );
    }
  }
  if (suspicious.length) {
    console.log("\n=== SUSPICIOUS (likely truncated) ===");
    for (const a of suspicious) {
      console.log(
        `${a.createdAt.toISOString()}  size=${a.size}B  issue=${a.issueId}  id=${a.id}  file=${a.fileName}`,
      );
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
