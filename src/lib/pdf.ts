import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Analysis, CoverLetter } from "@/lib/ai";
import { DIMENSION_LABELS } from "@/lib/ai";

/**
 * Server-side PDF generation with pdf-lib.
 *
 * Deliberately typographic and restrained — a clean, ATS-safe, single-column
 * document a candidate can actually send, not a screenshot of the dark UI. Black
 * text on white, standard fonts (Helvetica/Times), generous margins, real word
 * wrapping. The premium is in the restraint.
 */

const INK = rgb(0.09, 0.09, 0.11);
const MUTED = rgb(0.42, 0.42, 0.46);
const RULE = rgb(0.85, 0.85, 0.87);
const EMBER = rgb(0.83, 0.31, 0.13);

const PAGE = { w: 612, h: 792 }; // US Letter, points
const MARGIN = 64;
const CONTENT_W = PAGE.w - MARGIN * 2;

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
  serif: PDFFont;
};

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(trial, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = trial;
      }
    }
    lines.push(line);
  }
  return lines;
}

function ensureRoom(ctx: Ctx, needed: number) {
  if (ctx.y - needed < MARGIN) {
    ctx.page = ctx.doc.addPage([PAGE.w, PAGE.h]);
    ctx.y = PAGE.h - MARGIN;
  }
}

function drawParagraph(
  ctx: Ctx,
  text: string,
  opts: {
    font?: PDFFont;
    size?: number;
    color?: ReturnType<typeof rgb>;
    lineHeight?: number;
    gapAfter?: number;
  } = {}
) {
  const font = opts.font ?? ctx.regular;
  const size = opts.size ?? 11;
  const lh = opts.lineHeight ?? size * 1.5;
  for (const line of wrap(text, font, size, CONTENT_W)) {
    ensureRoom(ctx, lh);
    ctx.page.drawText(line, {
      x: MARGIN,
      y: ctx.y,
      size,
      font,
      color: opts.color ?? INK,
    });
    ctx.y -= lh;
  }
  ctx.y -= opts.gapAfter ?? 0;
}

async function newCtx(): Promise<Ctx> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE.w, PAGE.h]);
  return {
    doc,
    page,
    y: PAGE.h - MARGIN,
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    serif: await doc.embedFont(StandardFonts.TimesRoman),
  };
}

/* ------------------------------------------------------------------ */
/* Cover letter                                                        */
/* ------------------------------------------------------------------ */

export async function coverLetterPdf(
  letter: CoverLetter,
  meta: { jobTitle: string; company: string | null; candidate: string }
): Promise<Uint8Array> {
  const ctx = await newCtx();

  const target = meta.company
    ? `${meta.jobTitle} · ${meta.company}`
    : meta.jobTitle;
  ctx.page.drawText(target.toUpperCase(), {
    x: MARGIN,
    y: ctx.y,
    size: 9,
    font: ctx.bold,
    color: EMBER,
  });
  ctx.y -= 26;

  drawParagraph(ctx, meta.candidate, { font: ctx.bold, size: 18, gapAfter: 8 });
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE.w - MARGIN, y: ctx.y },
    thickness: 1,
    color: RULE,
  });
  ctx.y -= 26;

  // The letter body, in a serif for a real-correspondence feel.
  drawParagraph(ctx, letter.hook, { font: ctx.serif, size: 11.5, gapAfter: 14 });
  for (const p of letter.paragraphs) {
    drawParagraph(ctx, p, { font: ctx.serif, size: 11.5, gapAfter: 14 });
  }
  drawParagraph(ctx, letter.closing, { font: ctx.serif, size: 11.5, gapAfter: 20 });

  drawParagraph(ctx, meta.candidate, { font: ctx.serif, size: 11.5 });

  footer(ctx);
  return ctx.doc.save();
}

/* ------------------------------------------------------------------ */
/* Review summary                                                      */
/* ------------------------------------------------------------------ */

export async function reviewSummaryPdf(
  analysis: Analysis,
  meta: { jobTitle: string; company: string | null }
): Promise<Uint8Array> {
  const ctx = await newCtx();

  const target = meta.company ? `${meta.jobTitle} · ${meta.company}` : meta.jobTitle;
  ctx.page.drawText("RESUME REVIEW", {
    x: MARGIN,
    y: ctx.y,
    size: 9,
    font: ctx.bold,
    color: EMBER,
  });
  ctx.y -= 26;

  // Score + verdict header.
  ctx.page.drawText(`${analysis.overallScore}`, {
    x: MARGIN,
    y: ctx.y - 8,
    size: 40,
    font: ctx.bold,
    color: INK,
  });
  ctx.page.drawText("/ 100", {
    x: MARGIN + ctx.bold.widthOfTextAtSize(`${analysis.overallScore}`, 40) + 6,
    y: ctx.y - 8,
    size: 12,
    font: ctx.regular,
    color: MUTED,
  });
  ctx.y -= 34;
  drawParagraph(ctx, analysis.verdict, { font: ctx.bold, size: 13, gapAfter: 6 });
  drawParagraph(ctx, target, { size: 9.5, color: MUTED, gapAfter: 4 });
  drawParagraph(ctx, analysis.summary, { size: 10.5, color: MUTED, gapAfter: 18 });

  // Dimensions.
  section(ctx, "Scores");
  for (const key of Object.keys(DIMENSION_LABELS) as Array<keyof Analysis["dimensions"]>) {
    const d = analysis.dimensions[key];
    ensureRoom(ctx, 18);
    ctx.page.drawText(DIMENSION_LABELS[key], { x: MARGIN, y: ctx.y, size: 10.5, font: ctx.bold, color: INK });
    ctx.page.drawText(`${d.score}`, {
      x: PAGE.w - MARGIN - ctx.bold.widthOfTextAtSize(`${d.score}`, 10.5),
      y: ctx.y,
      size: 10.5,
      font: ctx.bold,
      color: INK,
    });
    ctx.y -= 16;
  }
  ctx.y -= 10;

  // Missing keywords.
  if (analysis.missingKeywords.length) {
    section(ctx, "Missing keywords");
    drawParagraph(ctx, analysis.missingKeywords.join("  ·  "), { size: 10.5, color: MUTED, gapAfter: 14 });
  }

  // Top fixes.
  section(ctx, "Fix these, in order");
  for (const imp of analysis.improvements.slice(0, 6)) {
    drawParagraph(ctx, `• ${imp.issue}`, { font: ctx.bold, size: 10.5, gapAfter: 2 });
    drawParagraph(ctx, imp.fix, { size: 10, color: MUTED, gapAfter: 8 });
  }

  footer(ctx);
  return ctx.doc.save();
}

function section(ctx: Ctx, title: string) {
  ensureRoom(ctx, 30);
  ctx.y -= 4;
  ctx.page.drawText(title.toUpperCase(), { x: MARGIN, y: ctx.y, size: 8.5, font: ctx.bold, color: EMBER });
  ctx.y -= 8;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE.w - MARGIN, y: ctx.y },
    thickness: 0.75,
    color: RULE,
  });
  ctx.y -= 16;
}

function footer(ctx: Ctx) {
  ctx.page.drawText("Generated by HireLens", {
    x: MARGIN,
    y: 40,
    size: 8,
    font: ctx.regular,
    color: MUTED,
  });
}
