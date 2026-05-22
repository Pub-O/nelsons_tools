ALTER TABLE "Product"
ADD COLUMN "easyCountMeasureUnit" TEXT;

UPDATE "Product"
SET "easyCountMeasureUnit" = 'Milliliter'
WHERE "isEasyCount" = true
  AND "easyCountUnitQty" IS NOT NULL;
