/**
 * Seeds a demo account so evaluators can log in without signing up:
 *   email: demo@hirelens.app   password: demo1234
 *
 *   npm run db:seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { mockAnalysis } from "../src/lib/ai";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const user = await db.user.upsert({
    where: { email: "demo@hirelens.app" },
    update: {},
    create: {
      email: "demo@hirelens.app",
      name: "Demo Grader",
      passwordHash,
    },
  });

  const existing = await db.review.count({ where: { userId: user.id } });
  if (existing > 0) {
    console.log("[seed] demo user already has reviews — nothing to do");
    return;
  }

  const first = mockAnalysis(false);
  const second = mockAnalysis(false);
  second.overallScore = 76;
  second.verdict =
    "Meaningfully improved — quantified bullets now carry the story.";
  second.dimensions.impact.score = 72;
  second.dimensions.impact.note =
    "8 of 11 bullets now lead with a measurable outcome. Strong improvement.";
  second.dimensions.atsReadiness.score = 78;
  second.missingKeywords = ["Terraform", "Datadog"];
  second.matchedKeywords = [
    ...second.matchedKeywords,
    "Kubernetes",
    "CI/CD",
    "GraphQL",
    "AWS",
  ];

  const now = new Date();
  const daysAgo = (n: number) =>
    new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  await db.review.create({
    data: {
      userId: user.id,
      jobTitle: "Senior Frontend Engineer",
      company: "Stripe",
      resumeFilename: "resume_v1.pdf",
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      overallScore: first.overallScore,
      verdict: first.verdict,
      result: JSON.parse(JSON.stringify(first)),
      deep: false,
      model: "seed",
      createdAt: daysAgo(6),
    },
  });

  await db.review.create({
    data: {
      userId: user.id,
      jobTitle: "Senior Frontend Engineer",
      company: "Stripe",
      resumeFilename: "resume_v2.pdf",
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      overallScore: second.overallScore,
      verdict: second.verdict,
      result: JSON.parse(JSON.stringify(second)),
      deep: false,
      model: "seed",
      createdAt: daysAgo(2),
    },
  });

  console.log("[seed] created demo@hirelens.app / demo1234 with 2 reviews");
}

const SAMPLE_RESUME = `ALEX MORGAN
Full-Stack Engineer · San Francisco, CA · alex.morgan@email.com

SUMMARY
Software engineer with 6 years of experience building web applications.

EXPERIENCE
Nimbus Labs — Software Engineer II (2022–present)
- Worked on the checkout flow and payment integrations.
- Responsible for maintaining backend services.
- Helped with code reviews and mentoring.
- Led migration from JavaScript to TypeScript across the main web app.

Brightpath — Software Engineer (2019–2022)
- Built internal dashboards with React and Node.js.
- Designed the Postgres schema for the reporting service.
- Collaborated with designers on the component library.

PROJECTS
- OpenShelf: open-source personal library tracker (1.2k GitHub stars).

SKILLS
React, TypeScript, Node.js, PostgreSQL, REST APIs, Git, Jest

EDUCATION
B.S. Computer Science, UC Davis (2019)`;

const SAMPLE_JD = `Senior Frontend Engineer — Payments Experience

We're looking for a senior frontend engineer to own the checkout and payments UI. You will:
- Build and maintain high-conversion checkout flows in React and TypeScript
- Partner with backend teams on GraphQL APIs
- Own quality: testing, observability (Datadog), and performance budgets
- Ship via modern CI/CD on Kubernetes and AWS; infrastructure as code with Terraform

Requirements:
- 5+ years with React and TypeScript
- Experience with GraphQL, Kubernetes, AWS
- Strong testing culture and CI/CD experience
- Bonus: payments/fintech background`;

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
