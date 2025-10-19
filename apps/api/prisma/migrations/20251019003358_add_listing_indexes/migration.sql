-- CreateIndex
CREATE INDEX "Listing_status_type_idx" ON "Listing"("status", "type");

-- CreateIndex
CREATE INDEX "Listing_createdAt_idx" ON "Listing"("createdAt");
