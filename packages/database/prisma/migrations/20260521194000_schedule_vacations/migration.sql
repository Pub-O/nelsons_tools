ALTER TABLE "Employee"
ADD COLUMN "weeklyHours" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "canManageSchedule" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "EmployeeVacation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "employeeId" UUID NOT NULL,
  "startsOn" DATE NOT NULL,
  "endsOn" DATE NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EmployeeVacation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmployeeVacation_organizationId_startsOn_endsOn_idx" ON "EmployeeVacation"("organizationId", "startsOn", "endsOn");
CREATE INDEX "EmployeeVacation_employeeId_startsOn_idx" ON "EmployeeVacation"("employeeId", "startsOn");

ALTER TABLE "EmployeeVacation"
ADD CONSTRAINT "EmployeeVacation_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmployeeVacation"
ADD CONSTRAINT "EmployeeVacation_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
