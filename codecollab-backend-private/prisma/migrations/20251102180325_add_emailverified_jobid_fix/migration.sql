-- AlterTable
ALTER TABLE "Execution" ADD COLUMN     "jobId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false;
