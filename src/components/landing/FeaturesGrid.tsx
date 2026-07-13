"use client";

import {
  FileSearch,
  Gauge,
  History,
  MessageSquareText,
  PenLine,
  ScanSearch,
} from "lucide-react";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { RevealGroup } from "@/components/landing/Reveal";

const FEATURES = [
  {
    icon: Gauge,
    title: "Recruiter-calibrated scoring",
    body: "An overall verdict plus five dimensions — job match, ATS readiness, impact, clarity, structure — scored the way screeners actually think.",
    pro: false,
  },
  {
    icon: ScanSearch,
    title: "ATS keyword gap",
    body: "See exactly which hard requirements from the job description are missing from your resume before a keyword filter bins it.",
    pro: false,
  },
  {
    icon: FileSearch,
    title: "Section-by-section grades",
    body: "Summary, Experience, Projects, Skills, Education — each graded A–F with specific feedback, not generic tips.",
    pro: false,
  },
  {
    icon: PenLine,
    title: "Line-by-line rewrites",
    body: "Your weakest bullets, quoted verbatim and rewritten into quantified, achievement-driven lines tailored to the role.",
    pro: true,
  },
  {
    icon: MessageSquareText,
    title: "Interview question prep",
    body: "The questions your resume's gaps will provoke — so the hole in your story becomes a rehearsed answer.",
    pro: true,
  },
  {
    icon: History,
    title: "History & tracking",
    body: "Every review saved to your account. Iterate on your resume and watch the score climb between versions.",
    pro: false,
  },
];

export function FeaturesGrid() {
  return (
    <RevealGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((f) => (
        <FeatureCard key={f.title} {...f} />
      ))}
    </RevealGroup>
  );
}
