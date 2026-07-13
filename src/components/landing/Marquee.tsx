"use client";

const ITEMS = [
  "Applicant Tracking Systems",
  "Keyword matching",
  "Recruiter screening",
  "ATS parse rate",
  "Quantified impact",
  "Section grading",
  "Interview prep",
];

export function TrustMarquee() {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div className="marquee-mask relative overflow-hidden py-6">
      <div className="marquee-track gap-10">
        {doubled.map((item, i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-3 text-sm font-medium text-faint"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent/60" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
