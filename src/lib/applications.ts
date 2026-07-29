import { z } from "zod";

/**
 * Tracker stages, in board order. Kept in one place so the columns, the API
 * validation, and the status pills can't drift apart.
 */
export const APPLICATION_STATUSES = [
  "WISHLIST",
  "APPLIED",
  "SCREEN",
  "ONSITE",
  "OFFER",
  "REJECTED",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_META: Record<
  ApplicationStatus,
  { label: string; blurb: string; tone: string; dot: string }
> = {
  WISHLIST: { label: "Wishlist", blurb: "Roles you want", tone: "text-faint", dot: "bg-edge2" },
  APPLIED: { label: "Applied", blurb: "In the pile", tone: "text-muted", dot: "bg-muted" },
  SCREEN: { label: "Screen", blurb: "Recruiter call", tone: "text-warn", dot: "bg-warn" },
  ONSITE: { label: "Onsite", blurb: "Final rounds", tone: "text-accent", dot: "bg-accent" },
  OFFER: { label: "Offer", blurb: "You did it", tone: "text-good", dot: "bg-good" },
  REJECTED: { label: "Closed", blurb: "Onward", tone: "text-faint", dot: "bg-bad" },
};

/** A card as the board needs it — the row plus the linked review's score. */
export type ApplicationCard = {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  sourceUrl: string | null;
  notes: string | null;
  reviewId: string | null;
  interviewId: string | null;
  reviewScore: number | null;
  sortOrder: number;
  appliedAt: string | null;
};

export const createApplicationSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(120),
  role: z.string().trim().min(1, "Role is required").max(160),
  status: z.enum(APPLICATION_STATUSES).optional(),
  jobDescription: z.string().trim().max(20_000).optional(),
  sourceUrl: z.string().trim().url("Enter a valid URL").max(2000).optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional(),
  reviewId: z.string().optional(),
  interviewId: z.string().optional(),
});

export const updateApplicationSchema = z.object({
  company: z.string().trim().min(1).max(120).optional(),
  role: z.string().trim().min(1).max(160).optional(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  sortOrder: z.number().int().min(0).max(1_000_000).optional(),
  sourceUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional(),
  reviewId: z.string().nullable().optional(),
  interviewId: z.string().nullable().optional(),
});
