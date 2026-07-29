/* global HIRELENS_API, SESSION_COOKIE, chrome */

const bodyEl = document.getElementById("body");
const siteEl = document.getElementById("site");
const openApp = document.getElementById("open-app");
openApp.href = `${HIRELENS_API}/dashboard`;

/* ------------------------------------------------------------------ */
/* The extractor — injected into the job page, so it must be entirely  */
/* self-contained (no outer references).                               */
/* ------------------------------------------------------------------ */
function extractJob() {
  const host = location.hostname;
  const txt = (el) => (el ? el.innerText.trim() : "");
  const first = (sels) => {
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el && el.innerText && el.innerText.trim().length > 20) return el.innerText.trim();
    }
    return "";
  };

  let title = "";
  let company = "";
  let text = "";

  if (host.includes("linkedin.com")) {
    title = first([".job-details-jobs-unified-top-card__job-title", ".jobs-unified-top-card__job-title", "h1"]);
    company = first([".job-details-jobs-unified-top-card__company-name", ".jobs-unified-top-card__company-name"]);
    text = first(["#job-details", ".jobs-description__content", ".jobs-description-content__text"]);
  } else if (host.includes("indeed.com")) {
    title = first([".jobsearch-JobInfoHeader-title", "h1.jobsearch-JobInfoHeader-title", "h1"]);
    company = first(["[data-company-name]", ".jobsearch-CompanyInfoContainer", ".jobsearch-JobInfoHeader-companyNameSimple"]);
    text = first(["#jobDescriptionText", ".jobsearch-JobComponent-description"]);
  } else if (host.includes("greenhouse.io")) {
    title = first([".app-title", "h1.section-header", "h1"]);
    company = first([".company-name", "span.company-name"]);
    text = first(["#content", ".job__description", "#job_description", "main"]);
  } else if (host.includes("lever.co")) {
    title = first([".posting-headline h2", "h2"]);
    company = document.title.split(" - ")[0] || "";
    text = first([".section-wrapper.page-full-width", ".posting-page", "main"]);
  } else if (host.includes("ashbyhq.com")) {
    title = first(["h1"]);
    text = first(['[class*="descriptionText"]', "main", "article"]);
  }

  // Generic fallback: the biggest visible text block on the page.
  if (!text) {
    let best = "";
    for (const el of document.querySelectorAll("main, article, section, div")) {
      const t = el.innerText || "";
      if (t.length > best.length && t.length < 20000) best = t;
    }
    text = best.trim();
  }
  if (!title) title = txt(document.querySelector("h1")) || document.title;

  return { title: title.slice(0, 200), company: company.slice(0, 200), text: text.slice(0, 12000) };
}

/* ------------------------------------------------------------------ */

function render(html) {
  bodyEl.innerHTML = html;
}

/**
 * Escape every dynamic value before it enters innerHTML. Job title/company come
 * from arbitrary pages and the verdict/keywords come from the model — all
 * untrusted. Escaping the five HTML-significant characters neutralises tag and
 * attribute injection while keeping the template approach.
 */
function esc(s) {
  return String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

function state({ title, msg, action }) {
  render(`
    <div class="state">
      <p style="font-weight:600">${esc(title)}</p>
      <p class="muted">${esc(msg)}</p>
      ${action ? `<a class="btn btn-primary" href="${esc(action.href)}" target="_blank" rel="noopener" style="margin-top:6px">${esc(action.label)}</a>` : ""}
    </div>
  `);
}

function ringSvg(score) {
  const color = score >= 75 ? "var(--good)" : score >= 55 ? "var(--warn)" : "var(--bad)";
  const r = 33, c = 2 * Math.PI * r, off = c * (1 - score / 100);
  return `
    <div class="ring">
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r="${r}" fill="none" stroke="var(--edge)" stroke-width="7" />
        <circle cx="38" cy="38" r="${r}" fill="none" stroke="${color}" stroke-width="7"
          stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"
          transform="rotate(-90 38 38)" />
      </svg>
      <span class="num" style="color:${color}">${score}</span>
    </div>`;
}

function renderResult(fit, meta) {
  const target = [meta.title, meta.company].filter(Boolean).join(" · ");
  const chips = (arr, cls) =>
    arr.length
      ? `<div class="chips">${arr.map((k) => `<span class="chip ${cls}">${esc(k)}</span>`).join("")}</div>`
      : `<p class="faint">None</p>`;
  const score = Math.max(0, Math.min(100, Math.round(Number(fit.score) || 0)));
  render(`
    <div class="result">
      <div class="score-row">
        ${ringSvg(score)}
        <div>
          <p class="verdict">${esc(fit.verdict || "")}</p>
          ${target ? `<p class="target">${esc(target)}</p>` : ""}
        </div>
      </div>
      <div>
        <p class="kw-title">Missing keywords</p>
        ${chips(Array.isArray(fit.missing) ? fit.missing : [], "bad")}
      </div>
      <div>
        <p class="kw-title">You already match</p>
        ${chips(Array.isArray(fit.matched) ? fit.matched : [], "good")}
      </div>
      <div class="divider"></div>
      <a class="btn btn-primary" href="${esc(HIRELENS_API)}/dashboard/new" target="_blank" rel="noopener">Run a full review →</a>
    </div>
  `);
}

/* ------------------------------------------------------------------ */

async function main() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !/^https?:/.test(tab.url)) {
    return state({ title: "No job page", msg: "Open a job posting on LinkedIn, Indeed, Greenhouse, Lever or Ashby, then click again." });
  }
  try {
    siteEl.textContent = new URL(tab.url).hostname.replace(/^www\./, "").split(".")[0];
  } catch {}

  // 1) The session token — the extension authenticates with it as a bearer.
  const cookie = await chrome.cookies.get({ url: HIRELENS_API, name: SESSION_COOKIE });
  if (!cookie || !cookie.value) {
    return state({
      title: "Sign in to HireLens",
      msg: "Log in once and this works on every job page.",
      action: { href: `${HIRELENS_API}/login`, label: "Sign in →" },
    });
  }

  // 2) Pull the job off the page.
  let job;
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractJob });
    job = res && res.result;
  } catch {
    return state({ title: "Can't read this page", msg: "Open the actual job posting (not a search list), then try again." });
  }
  if (!job || !job.text || job.text.length < 60) {
    return state({ title: "No job description found", msg: "Open the job posting itself — this looks like a list or a page without a description." });
  }

  // 3) Score it.
  try {
    const resp = await fetch(`${HIRELENS_API}/api/extension/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cookie.value}` },
      body: JSON.stringify({ jobDescription: job.text, jobTitle: job.title, company: job.company }),
    });
    const data = await resp.json().catch(() => ({}));

    if (resp.ok && data.fit) return renderResult(data.fit, job);

    if (data.code === "AUTH") {
      return state({ title: "Session expired", msg: "Sign in to HireLens again.", action: { href: `${HIRELENS_API}/login`, label: "Sign in →" } });
    }
    if (data.code === "NO_RESUME") {
      return state({ title: "Set your resume first", msg: "Add a primary resume in HireLens — then the extension scores every job against it.", action: { href: `${HIRELENS_API}/dashboard/account`, label: "Set primary resume →" } });
    }
    if (data.code === "RATE_LIMITED") {
      return state({ title: "Slow down a sec", msg: data.error || "Too many checks. Give it a minute." });
    }
    return state({ title: "Couldn't score this", msg: data.error || "Something went wrong. Try again." });
  } catch {
    return state({ title: "Can't reach HireLens", msg: `Is it running at ${HIRELENS_API}? Check the URL in config.js.` });
  }
}

main();
