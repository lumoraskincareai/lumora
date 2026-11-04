-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "emailVerifyCodeHash" TEXT,
ADD COLUMN     "emailVerifyExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailVerifyAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emailVerifySentAt" TIMESTAMP(3);

-- Accounts that exist before this migration predate email verification: treat
-- their emails as verified so nobody is locked out of their account.
UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;
