import {
  check,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({ columns: [verificationToken.identifier, verificationToken.token] }),
  ],
);

export const adventures = pgTable(
  "adventures",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    goalText: text("goalText").notNull(),
    title: text("title"),
    state: text("state").notNull().default("drafting"),
    readinessStatus: text("readinessStatus").notNull().default("not_ready"),
    interviewStatus: text("interviewStatus").notNull().default("interviewing"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (adventure) => [
    check("adventures_state_check", sql`${adventure.state} in ('drafting')`),
    check(
      "adventures_readiness_status_check",
      sql`${adventure.readinessStatus} in ('not_ready', 'ready_to_generate')`,
    ),
    check(
      "adventures_interview_status_check",
      sql`${adventure.interviewStatus} in ('interviewing', 'awaiting_confirmation', 'confirmed')`,
    ),
  ],
);

export const interviewOutputArtifacts = pgTable(
  "interviewOutputArtifacts",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    adventureId: text("adventureId")
      .notNull()
      .references(() => adventures.id, { onDelete: "cascade" }),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (artifact) => [
    unique("interview_output_artifacts_adventure_unique").on(artifact.adventureId),
  ],
);

export const adventureInterviewMessages = pgTable(
  "adventureInterviewMessages",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    adventureId: text("adventureId")
      .notNull()
      .references(() => adventures.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    sequenceNumber: integer("sequenceNumber").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (message) => [
    check(
      "adventure_interview_messages_role_check",
      sql`${message.role} in ('user', 'game_master')`,
    ),
    unique("adventure_interview_messages_adventure_sequence_unique").on(
      message.adventureId,
      message.sequenceNumber,
    ),
  ],
);
