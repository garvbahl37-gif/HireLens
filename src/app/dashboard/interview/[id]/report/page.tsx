import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { InterviewReport } from "@/components/interview/InterviewReport";
import { PanelCard } from "@/components/interview/PanelCard";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { panelReportSchema, reportSchema, turnSchema } from "@/lib/interview";

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

  const panel = panelReportSchema.safeParse(interview.panel);

  // The way back lives in the canopy header's back arrow (and the report's own
  // "All interviews" button), so the page opens straight onto the report.
  return (
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
      panel={
        <PanelCard
          key="panel"
          interviewId={interview.id}
          isPro={user.plan === "PRO"}
          initial={panel.success ? panel.data : null}
        />
      }
    />
  );
}
