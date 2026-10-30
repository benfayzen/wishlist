-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_list" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "ownerId" TEXT,
    "listMode" TEXT NOT NULL DEFAULT 'standard',
    "groupId" TEXT NOT NULL,
    "public" BOOLEAN NOT NULL DEFAULT false,
    "hideOwner" BOOLEAN NOT NULL DEFAULT false,
    "allowSelfClaims" BOOLEAN NOT NULL DEFAULT false,
    "notForMe" BOOLEAN NOT NULL DEFAULT false,
    "icon" TEXT,
    "iconColor" TEXT,
    "description" TEXT,
    CONSTRAINT "list_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_list" ("allowSelfClaims", "description", "groupId", "hideOwner", "icon", "iconColor", "id", "name", "notForMe", "ownerId", "public") SELECT "allowSelfClaims", "description", "groupId", "hideOwner", "icon", "iconColor", "id", "name", "notForMe", "ownerId", "public" FROM "list";
DROP TABLE "list";
ALTER TABLE "new_list" RENAME TO "list";
CREATE UNIQUE INDEX "list_id_key" ON "list"("id");
CREATE INDEX "list_ownerId_idx" ON "list"("ownerId");
CREATE INDEX "list_groupId_idx" ON "list"("groupId");
CREATE INDEX "list_ownerId_groupId_idx" ON "list"("ownerId", "groupId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;


-- Only already-public legacy registries are upgraded. Private wishlists are
-- never published merely because one of their groups used Registry mode.
UPDATE "list" SET "listMode" = 'registry'
WHERE "public" = 1 AND COALESCE(
    (SELECT "value" FROM "system_config" WHERE "key" = 'listMode' AND "groupId" = "list"."groupId"),
    (SELECT "value" FROM "system_config" WHERE "key" = 'listMode' AND "groupId" = 'global'),
    'standard'
) = 'registry';
INSERT INTO "list_manager" ("id", "userId", "listId")
SELECT 'registry-owner-' || "list"."id", "ownerId", "list"."id" FROM "list"
WHERE "listMode" = 'registry' AND "ownerId" IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM "list_manager" WHERE "listId" = "list"."id" AND "userId" = "list"."ownerId");
DELETE FROM "list_group_share" WHERE "listId" IN (SELECT "id" FROM "list" WHERE "listMode" = 'registry');
UPDATE "list" SET "ownerId" = NULL, "groupId" = 'global', "hideOwner" = 1, "notForMe" = 1,
"allowSelfClaims" = 0, "name" = COALESCE(NULLIF(TRIM("name"), ''), 'Registry')
WHERE "listMode" = 'registry';
UPDATE "system_config" SET "value" = 'standard' WHERE "key" = 'listMode';
