/*
  Warnings:

  - You are about to drop the column `listingId` on the `BundleItem` table. All the data in the column will be lost.
  - Added the required column `bundleId` to the `BundleItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BundleItem" DROP CONSTRAINT "BundleItem_listingId_fkey";

-- DropIndex
DROP INDEX "BundleItem_listingId_idx";

-- AlterTable
ALTER TABLE "BundleItem" DROP COLUMN "listingId",
ADD COLUMN     "bundleId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "BundleItem_bundleId_idx" ON "BundleItem"("bundleId");

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
