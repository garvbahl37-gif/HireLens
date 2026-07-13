import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { InterviewRoom, type Msg } from "@/components/interview/InterviewRoom";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { turnSchema } from "@/lib/interview";

export const metadata: Metadata = { title: "Mock interview" };

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  // Ownership enforced in the query — another user's id 404s.
  const interview = await db.interview.findFirst({
    where: { id, userId: user.id },
  });
  if (!interview) notFound();

  // A finished interview has a report, not a room.
  if (interview.status === "COMPLETED") {
    redirect(`/dashboard/interview/${id}/report`);
  }

  const parsed = z.array(turnSchema).safeParse(interview.transcript);
  if (!parsed.success) notFound();

  const messages: Msg[] = parsed.data.map((t) => ({
    role: t.role,
    content: t.content,
    kind: t.kind,
    isFollowUp: t.isFollowUp,
  }));

  return (
    <InterviewRoom
      id={interview.id}
      jobTitle={interview.jobTitle}
      company={interview.company}
      initialMessages={messages}
      answered={interview.answered}
      totalQuestions={interview.totalQuestions}
      isPro={interview.deep}
    />
  );
}
