/*
  Warnings:

  - You are about to drop the column `bundleId` on the `BundleItem` table. All the data in the column will be lost.
  - Added the required column `listingId` to the `BundleItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "BundleItem_bundleId_idx";

-- AlterTable
ALTER TABLE "BundleItem" DROP COLUMN "bundleId",
ADD COLUMN     "listingId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "endPrice" DECIMAL(65,18),
ADD COLUMN     "startPrice" DECIMAL(65,18);

-- CreateIndex
CREATE INDEX "BundleItem_listingId_idx" ON "BundleItem"("listingId");

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_tokenPk_fkey" FOREIGN KEY ("tokenPk") REFERENCES "Token"("id") ON DELETE CASCADE ON UPDATE CASCADE;
