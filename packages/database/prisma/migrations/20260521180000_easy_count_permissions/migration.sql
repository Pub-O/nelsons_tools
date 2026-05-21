ALTER TABLE "Product"
ADD COLUMN "isEasyCount" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "easyCountUnitQty" DECIMAL(12,3);

ALTER TABLE "Employee"
ADD COLUMN "canConfigureProducts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "canManageEmployees" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "canManageLists" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "canUseEasyCount" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "EasyCountRun" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "locationId" UUID NOT NULL,
  "countedById" UUID,
  "note" TEXT,
  "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EasyCountRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EasyCountLine" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "easyCountRunId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "startingCount" INTEGER NOT NULL,
  "targetCount" INTEGER NOT NULL,
  "registerCount" INTEGER NOT NULL,
  "differenceCount" INTEGER NOT NULL,
  "quantityPerPoint" DECIMAL(12,3) NOT NULL,
  "correctionQty" DECIMAL(12,3) NOT NULL,

  CONSTRAINT "EasyCountLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EasyCountRun_locationId_countedAt_idx" ON "EasyCountRun"("locationId", "countedAt");

CREATE UNIQUE INDEX "EasyCountLine_easyCountRunId_productId_key" ON "EasyCountLine"("easyCountRunId", "productId");

ALTER TABLE "EasyCountRun"
ADD CONSTRAINT "EasyCountRun_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "Location"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EasyCountRun"
ADD CONSTRAINT "EasyCountRun_countedById_fkey"
FOREIGN KEY ("countedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EasyCountLine"
ADD CONSTRAINT "EasyCountLine_easyCountRunId_fkey"
FOREIGN KEY ("easyCountRunId") REFERENCES "EasyCountRun"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EasyCountLine"
ADD CONSTRAINT "EasyCountLine_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
