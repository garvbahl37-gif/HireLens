-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "panel" JSONB;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "coverLetter" JSONB,
ADD COLUMN     "parentReviewId" TEXT;

-- CreateIndex
CREATE INDEX "Review_parentReviewId_idx" ON "Review"("parentReviewId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_parentReviewId_fkey" FOREIGN KEY ("parentReviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;
