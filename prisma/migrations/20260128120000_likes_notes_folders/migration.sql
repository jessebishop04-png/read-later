-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Folder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Folder_userId_idx" ON "Folder"("userId");

-- AlterTable
ALTER TABLE "SavedItem" ADD COLUMN "folderId" TEXT;
ALTER TABLE "SavedItem" ADD COLUMN "liked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SavedItem" ADD COLUMN "likedAt" DATETIME;
ALTER TABLE "SavedItem" ADD COLUMN "notes" TEXT;

CREATE INDEX "SavedItem_userId_idx" ON "SavedItem"("userId");
CREATE INDEX "SavedItem_folderId_idx" ON "SavedItem"("folderId");
