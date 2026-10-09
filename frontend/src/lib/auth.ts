import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

// Resolve data/auth.db in repo root
const dbDir = path.resolve(process.cwd(), "../data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, "auth.db");
const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma("journal_mode = WAL");

// Initialize Better Auth schema if not present
db.exec(`
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    emailVerified INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    role TEXT NOT NULL DEFAULT 'warden',
    badge_id TEXT,
    rank TEXT,
    jurisdiction TEXT
  );

  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    expiresAt DATETIME NOT NULL,
    token TEXT NOT NULL UNIQUE,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    accessToken TEXT,
    refreshToken TEXT,
    idToken TEXT,
    accessTokenExpiresAt DATETIME,
    refreshTokenExpiresAt DATETIME,
    scope TEXT,
    password TEXT,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL
  );

  CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt DATETIME NOT NULL,
    createdAt DATETIME,
    updatedAt DATETIME
  );
`);

export const auth = betterAuth({
  database: db,
  secret: process.env.BETTER_AUTH_SECRET || "civicclean-secure-muni-auth-secret-key-2026-auth",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5173",
  trustedOrigins: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://192.168.137.73:5173",
    "http://localhost:8000",
  ],
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "warden",
      },
      badge_id: {
        type: "string",
        required: false,
      },
      rank: {
        type: "string",
        required: false,
      },
      jurisdiction: {
        type: "string",
        required: false,
      },
    },
  },
});

/**
 * Automatically seed the two official municipal personas on startup
 */
export async function seedOfficialAccounts() {
  try {
    const existing = db.prepare("SELECT email FROM user").all() as { email: string }[];
    const existingEmails = new Set(existing.map((row) => row.email.toLowerCase()));

    // 1. Desk Adjudicator
    if (!existingEmails.has("adjudicator@civicclean.gov")) {
      console.log("[Auth] Seeding Control Room Adjudicator account...");
      await auth.api.signUpEmail({
        body: {
          name: "Inspector Sarah Chen",
          email: "adjudicator@civicclean.gov",
          password: "Adjudicator2026!",
          role: "adjudicator",
          badge_id: "MCE-9042",
          rank: "Sworn Adjudication Inspector",
          jurisdiction: "Central Municipal Operations",
        },
      });
      console.log("[Auth] Adjudicator account seeded successfully.");
    }

    // 2. Field Enforcement Warden
    if (!existingEmails.has("warden@civicclean.gov")) {
      console.log("[Auth] Seeding Field Enforcement Warden account...");
      await auth.api.signUpEmail({
        body: {
          name: "Officer Marcus Vance",
          email: "warden@civicclean.gov",
          password: "Warden2026!",
          role: "warden",
          badge_id: "FP-108",
          rank: "Senior Patrol Warden",
          jurisdiction: "Downtown Sector 7",
        },
      });
      console.log("[Auth] Field Warden account seeded successfully.");
    }
  } catch (err) {
    console.warn("[Auth] Account seeding notice:", err);
  }
}

// Run seeder once
void seedOfficialAccounts();
