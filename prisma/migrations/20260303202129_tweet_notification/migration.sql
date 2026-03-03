/*
  Warnings:

  - You are about to drop the column `url` on the `Notification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "url";

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Tweet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
