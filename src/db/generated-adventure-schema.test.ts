import { randomUUID } from "node:crypto";

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

async function expectDatabaseConstraintViolation(operation: () => Promise<unknown>): Promise<void> {
  await expect(operation()).rejects.toMatchObject({
    code: expect.stringMatching(/^(23503|23505|23514)$/),
  });
}

describeWithDatabase("generated Adventure schema constraints", () => {
  let sql: postgres.Sql;

  beforeAll(() => {
    sql = postgres(databaseUrl!, { max: 1 });
  });

  afterAll(async () => {
    await sql.end();
  });

  it("rejects invalid generated Adventure relational data", async () => {
    const suffix = randomUUID();
    const userId = `schema-user-${suffix}`;
    const adventureId = `schema-adventure-${suffix}`;
    const artifactId = `schema-artifact-${suffix}`;
    const actId = `schema-act-${suffix}`;
    const skillId = `schema-skill-${suffix}`;
    const inventoryItemId = `schema-inventory-${suffix}`;
    const questId = `schema-quest-${suffix}`;
    const bossFightId = `schema-boss-${suffix}`;

    try {
      await sql`insert into "users" ("id", "email") values (${userId}, ${`${userId}@example.com`})`;
      await sql`
        insert into "adventures" ("id", "userId", "goalText", "state")
        values (${adventureId}, ${userId}, 'Validate generated adventure schema', 'drafting')
      `;
      await sql`
        insert into "interviewOutputArtifacts" ("id", "adventureId", "payload")
        values (${artifactId}, ${adventureId}, ${sql.json({ goalSummary: "Validate schema" })})
      `;
      await sql`
        insert into "generatedAdventureManifests"
          ("adventureId", "interviewOutputArtifactId", "title", "themeSummary", "goalSummary")
        values (${adventureId}, ${artifactId}, 'Schema Quest', 'A careful test', 'Validate constraints')
      `;
      await sql`
        insert into "adventureActs" ("id", "adventureId", "title", "summary", "sequenceNumber")
        values (${actId}, ${adventureId}, 'Act 1', 'Start safely', 1)
      `;
      await sql`
        insert into "adventureSkills" ("id", "adventureId", "name", "description")
        values (${skillId}, ${adventureId}, 'Schema Reading', 'Understand database constraints')
      `;
      await sql`
        insert into "adventureInventoryItems" ("id", "adventureId", "name", "purpose", "sequenceNumber")
        values (${inventoryItemId}, ${adventureId}, 'Checklist', 'Keep validation focused', 1)
      `;
      await sql`
        insert into "adventureQuests"
          ("id", "adventureId", "actId", "type", "title", "description", "doneCondition", "rewardIntent", "sequenceNumber")
        values (${questId}, ${adventureId}, ${actId}, 'main', 'Check constraints', 'Exercise invalid writes', 'All invalid writes are rejected', 'Confidence', 1)
      `;
      await sql`
        insert into "adventureBossFights"
          ("id", "adventureId", "actId", "title", "description", "doneCondition", "rewardIntent", "sequenceNumber")
        values (${bossFightId}, ${adventureId}, ${actId}, 'Migration Trial', 'Apply schema safely', 'Migration validates', 'Durability', 1)
      `;

      await sql`update "adventures" set "state" = 'generated' where "id" = ${adventureId}`;

      await expectDatabaseConstraintViolation(
        () => sql`update "adventures" set "state" = 'invalid' where "id" = ${adventureId}`,
      );
      await expectDatabaseConstraintViolation(
        () => sql`
          insert into "adventureActs" ("adventureId", "title", "summary", "sequenceNumber")
          values (${adventureId}, 'Duplicate Act', 'Duplicate sequence', 1)
        `,
      );
      await expectDatabaseConstraintViolation(
        () => sql`
          insert into "adventureQuests"
            ("adventureId", "actId", "type", "title", "description", "doneCondition", "rewardIntent", "status", "sequenceNumber")
          values (${adventureId}, ${actId}, 'main', 'Invalid Quest', 'Bad status', 'Rejected', 'None', 'paused', 2)
        `,
      );
      await expectDatabaseConstraintViolation(
        () => sql`
          insert into "adventureBossFights"
            ("adventureId", "actId", "title", "description", "doneCondition", "rewardIntent", "status", "sequenceNumber")
          values (${adventureId}, ${actId}, 'Invalid Boss', 'Bad status', 'Rejected', 'None', 'paused', 2)
        `,
      );
      await expectDatabaseConstraintViolation(
        () => sql`
          insert into "adventureInventoryItems"
            ("adventureId", "name", "purpose", "status", "sequenceNumber")
          values (${adventureId}, 'Invalid Item', 'Bad status', 'lost', 2)
        `,
      );
      await expectDatabaseConstraintViolation(
        () => sql`
          insert into "adventureAchievements"
            ("adventureId", "name", "description", "unlockCondition", "status", "sequenceNumber")
          values (${adventureId}, 'Invalid Achievement', 'Bad status', 'Never', 'hidden', 1)
        `,
      );
      await expectDatabaseConstraintViolation(
        () => sql`
          insert into "adventureSkills" ("adventureId", "name", "description", "xp")
          values (${adventureId}, 'Invalid XP', 'Negative XP rejected', -1)
        `,
      );
      await expectDatabaseConstraintViolation(
        () => sql`
          insert into "adventureQuestSkillRewards" ("questId", "skillId", "xp")
          values (${questId}, ${skillId}, 0)
        `,
      );
      await expectDatabaseConstraintViolation(
        () => sql`
          insert into "adventureBossFightSkillRewards" ("bossFightId", "skillId", "xp")
          values (${bossFightId}, ${skillId}, -1)
        `,
      );
      await expectDatabaseConstraintViolation(
        () => sql`
          insert into "adventureQuestInventoryItems" ("questId", "inventoryItemId")
          values ('missing-quest', ${inventoryItemId})
        `,
      );
    } finally {
      await sql`delete from "users" where "id" = ${userId}`;
    }
  });
});
