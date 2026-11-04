-- AlterTable
ALTER TABLE "SkinProfile" ADD COLUMN     "sensitiveSkin" TEXT,
ADD COLUMN     "acneType" TEXT,
ADD COLUMN     "skinTone" INTEGER,
ADD COLUMN     "ageRange" TEXT,
ADD COLUMN     "specialSituations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "avoidIngredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "profileVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "completedSections" TEXT[] DEFAULT ARRAY[]::TEXT[];
