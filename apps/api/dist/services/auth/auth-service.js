import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { eq, and, gt, sql } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { users, userSessions } from "../../db/schema.js";
const SESSION_TTL_DAYS = 30;
export async function hashPassword(password) {
    return bcrypt.hash(password, 12);
}
export async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}
export async function findUserByUsername(username) {
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.username, username));
    return rows[0] ?? null;
}
export async function createUserSession(userId) {
    const db = getDb();
    const token = uuidv4() + uuidv4(); // 72 random hex chars
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await db.insert(userSessions).values({
        id: uuidv4(),
        userId,
        token,
        expiresAt,
    });
    return token;
}
export async function validateSession(token) {
    const db = getDb();
    const now = new Date().toISOString();
    const rows = await db
        .select({ user: users })
        .from(userSessions)
        .innerJoin(users, eq(userSessions.userId, users.id))
        .where(and(eq(userSessions.token, token), gt(userSessions.expiresAt, now)));
    return rows[0]?.user ?? null;
}
export async function deleteUserSession(token) {
    const db = getDb();
    await db.delete(userSessions).where(eq(userSessions.token, token));
}
export async function incrementTokenCount(userId, tokens) {
    if (tokens <= 0)
        return;
    const db = getDb();
    await db
        .update(users)
        .set({ tokenCount: sql `${users.tokenCount} + ${tokens}` })
        .where(eq(users.id, userId));
}
