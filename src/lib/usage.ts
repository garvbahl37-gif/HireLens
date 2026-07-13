import { db } from "@/lib/db";
import { FREE_MONTHLY_LIMIT, currentMonthStart } from "@/lib/plans";

/** Reviews created by this user in the current calendar month (UTC). */
export async function monthlyReviewCount(userId: string): Promise<number> {
  return db.review.count({
    where: { userId, createdAt: { gte: currentMonthStart() } },
  });
}

export async function remainingFreeReviews(userId: string): Promise<number> {
  const used = await monthlyReviewCount(userId);
  return Math.max(0, FREE_MONTHLY_LIMIT - used);
}

/** Mock interviews STARTED by this user in the current UTC month. */
export async function monthlyInterviewCount(userId: string): Promise<number> {
  return db.interview.count({
    where: { userId, createdAt: { gte: currentMonthStart() } },
  });
}
