/** Generates fixtures/sample-resume.pdf for testing the upload path. */
import { mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument, StandardFonts } from "pdf-lib";

const LINES = [
  "ALEX MORGAN",
  "Full-Stack Engineer | San Francisco, CA | alex.morgan@email.com",
  "",
  "SUMMARY",
  "Software engineer with 6 years of experience building web applications.",
  "",
  "EXPERIENCE",
  "Nimbus Labs - Software Engineer II (2022-present)",
  "- Worked on the checkout flow and payment integrations.",
  "- Responsible for maintaining backend services.",
  "- Helped with code reviews and mentoring.",
  "- Led migration from JavaScript to TypeScript across the main web app.",
  "",
  "Brightpath - Software Engineer (2019-2022)",
  "- Built internal dashboards with React and Node.js.",
  "- Designed the Postgres schema for the reporting service.",
  "- Collaborated with designers on the component library.",
  "",
  "PROJECTS",
  "OpenShelf: open-source personal library tracker (1.2k GitHub stars).",
  "",
  "SKILLS",
  "React, TypeScript, Node.js, PostgreSQL, REST APIs, Git, Jest",
  "",
  "EDUCATION",
  "B.S. Computer Science, UC Davis (2019)",
];

async function main() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let y = 750;
  for (const line of LINES) {
    page.drawText(line, { x: 50, y, size: 10, font });
    y -= 16;
  }
  mkdirSync("fixtures", { recursive: true });
  writeFileSync("fixtures/sample-resume.pdf", await doc.save());
  console.log("wrote fixtures/sample-resume.pdf");
}

main();
