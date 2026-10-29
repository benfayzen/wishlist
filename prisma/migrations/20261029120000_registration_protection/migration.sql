CREATE TABLE "registration_event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);
CREATE INDEX "registration_event_key_kind_createdAt_idx" ON "registration_event"("key", "kind", "createdAt");
CREATE INDEX "registration_event_expiresAt_idx" ON "registration_event"("expiresAt");
