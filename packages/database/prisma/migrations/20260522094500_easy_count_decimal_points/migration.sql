ALTER TABLE "EasyCountLine"
ALTER COLUMN "startingCount" TYPE DECIMAL(12,3) USING "startingCount"::DECIMAL(12,3),
ALTER COLUMN "targetCount" TYPE DECIMAL(12,3) USING "targetCount"::DECIMAL(12,3),
ALTER COLUMN "registerCount" TYPE DECIMAL(12,3) USING "registerCount"::DECIMAL(12,3),
ALTER COLUMN "differenceCount" TYPE DECIMAL(12,3) USING "differenceCount"::DECIMAL(12,3);
