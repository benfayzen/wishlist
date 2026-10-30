-- CreateTable
CREATE TABLE "list_group_share" (
    "listId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    PRIMARY KEY ("listId", "groupId"),
    CONSTRAINT "list_group_share_listId_fkey" FOREIGN KEY ("listId") REFERENCES "list" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "list_group_share_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_list" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "ownerId" TEXT NOT NULL,
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

-- CreateIndex
CREATE INDEX "list_group_share_groupId_idx" ON "list_group_share"("groupId");


INSERT INTO "list_group_share" ("listId", "groupId") SELECT "id", "groupId" FROM "list";
