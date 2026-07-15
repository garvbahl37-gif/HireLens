/**
 * Transactional email.
 *
 * Raw `fetch` to Resend rather than their SDK, mirroring the ElevenLabs call in
 * /api/tts — one HTTP POST does not need a dependency.
 *
 * Follows the same degrade-gracefully contract as the rest of the app
 * (MOCK_AI=1, demo billing): with no RESEND_API_KEY the message is logged to the
 * server console instead of sent, so password reset is fully testable on a
 * laptop with no third-party account. That is a DEVELOPMENT affordance and not
 * a production one — a reset flow whose only sink is console.log has documented
 * the bug, not fixed it. `emailConfigured()` exists so callers can tell the
 * difference and the UI can say so out loud.
 */

const FROM = process.env.EMAIL_FROM ?? "HireLens <onboarding@resend.dev>";

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    console.warn(
      `\n[email] RESEND_API_KEY not set — not sending. Message follows.\n` +
        `  to:      ${opts.to}\n` +
        `  subject: ${opts.subject}\n\n${opts.text}\n`
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
    }),
  });

  if (!res.ok) {
    // Surfaced to the caller, which swallows it: a user must never learn from an
    // error whether an address is registered.
    throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
  }
}

export function resetEmail(opts: { name: string; url: string }) {
  return {
    subject: "Reset your HireLens password",
    text: `Hi ${opts.name},

Someone asked to reset the password on your HireLens account. If that was you, open this link:

${opts.url}

It works once and expires in an hour.

If it wasn't you, ignore this email — nothing has changed, and your current password still works.

— HireLens`,
  };
}
