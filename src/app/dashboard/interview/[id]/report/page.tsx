import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { InterviewReport } from "@/components/interview/InterviewReport";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportSchema, turnSchema } from "@/lib/interview";

export const metadata: Metadata = { title: "Interview report" };

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const interview = await db.interview.findFirst({
    where: { id, userId: user.id },
  });
  if (!interview) notFound();

  // No report yet means the interview is still running — send them back to it.
  if (interview.status !== "COMPLETED" || !interview.report) {
    redirect(`/dashboard/interview/${id}`);
  }

  const report = reportSchema.safeParse(interview.report);
  const transcript = z.array(turnSchema).safeParse(interview.transcript);
  if (!report.success || !transcript.success) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/interview"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> All interviews
      </Link>

      <InterviewReport
        report={report.data}
        transcript={transcript.data}
        jobTitle={interview.jobTitle}
        company={interview.company}
        deep={interview.deep}
        askedAt={interview.createdAt.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      />
    </div>
  );
}
