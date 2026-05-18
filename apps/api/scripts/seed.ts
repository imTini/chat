#!/usr/bin/env tsx
/**
 * Seed script — creates the first admin user.
 * Run: npx tsx apps/api/scripts/seed.ts
 *
 * Env vars:
 *   SEED_USERNAME  (default: admin)
 *   SEED_PASSWORD  (default: changeme)
 */
import { initDb, getDb } from "../src/db/index.js";
import { migrate } from "../src/db/migrate.js";
import { users } from "../src/db/schema.js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";

const username = process.env.SEED_USERNAME ?? "admin";
const password = process.env.SEED_PASSWORD ?? "changeme";

await initDb();
await migrate();

const db = getDb();
const existing = await db.select().from(users).where(eq(users.username, username));

if (existing.length > 0) {
  console.log(`User "${username}" already exists — skipping seed.`);
  process.exit(0);
}

const passwordHash = await bcrypt.hash(password, 12);
await db.insert(users).values({
  id: uuidv4(),
  username,
  passwordHash,
});

console.log(`✓ Created user "${username}". Password: ${password}`);
process.exit(0);
