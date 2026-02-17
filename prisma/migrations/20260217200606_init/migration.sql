-- AlterTable
ALTER TABLE "Tweet" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "content" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE INDEX "Tweet_authorId_idx" ON "Tweet"("authorId");

-- CreateIndex
CREATE INDEX "Tweet_createdAt_idx" ON "Tweet"("createdAt");
