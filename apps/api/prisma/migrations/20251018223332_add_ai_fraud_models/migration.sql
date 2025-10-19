-- AlterTable
ALTER TABLE "AIValuation" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "modelVersion" TEXT NOT NULL DEFAULT 'baseline-v1',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FraudFlag" ADD COLUMN     "resolutionNote" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "reviewerId" TEXT,
ADD COLUMN     "tokenPk" TEXT;

-- CreateTable
CREATE TABLE "AIModelVersion" (
    "id" TEXT NOT NULL,
    "modelType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "ttlSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIModelVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIModelVersion_modelType_active_idx" ON "AIModelVersion"("modelType", "active");

-- CreateIndex
CREATE UNIQUE INDEX "AIModelVersion_modelType_version_key" ON "AIModelVersion"("modelType", "version");

-- CreateIndex
CREATE INDEX "AIValuation_modelVersion_idx" ON "AIValuation"("modelVersion");

-- AddForeignKey
ALTER TABLE "FraudFlag" ADD CONSTRAINT "FraudFlag_tokenPk_fkey" FOREIGN KEY ("tokenPk") REFERENCES "Token"("id") ON DELETE SET NULL ON UPDATE CASCADE;
