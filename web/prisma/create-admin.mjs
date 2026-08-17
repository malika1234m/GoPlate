/**
 * Create or update a back-office admin.
 *
 *   node prisma/create-admin.mjs you@example.com "Your Name" "the-password"
 *
 * There is no sign-up route for admins by design — the only way to get an
 * account is to run this against the database, which means shell access to the
 * server. Re-running for an existing email resets that admin's password and
 * bumps tokenVersion, which signs their other sessions out.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [email, name, password] = process.argv.slice(2);

if (!email || !name || !password) {
  console.error('Usage: node prisma/create-admin.mjs <email> "<name>" "<password>"');
  process.exit(1);
}
if (password.length < 12) {
  // This account can change every customer's plan; a short password is not
  // a reasonable trade for convenience.
  console.error("Password must be at least 12 characters.");
  process.exit(1);
}

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash(password, 10);
const lower = email.toLowerCase();

const existing = await prisma.admin.findUnique({ where: { email: lower } });

if (existing) {
  await prisma.admin.update({
    where: { id: existing.id },
    data: { passwordHash, name, tokenVersion: { increment: 1 } },
  });
  console.log(`updated admin ${lower} (other sessions signed out)`);
} else {
  await prisma.admin.create({ data: { email: lower, name, passwordHash } });
  console.log(`created admin ${lower}`);
}

await prisma.$disconnect();
