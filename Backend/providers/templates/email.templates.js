import { formatCurrency, formatIST, formatRank } from "../../utils/format.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout({ title, intro, bodyHtml, footerHtml = "" }) {
  return `
    <div style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.06);">
          <div style="padding:28px 24px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#ffffff;">
            <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.72;">QuizBuzz</div>
            <h1 style="margin:12px 0 0;font-size:26px;line-height:1.25;">${escapeHtml(title)}</h1>
          </div>
          <div style="padding:24px;line-height:1.7;font-size:15px;">
            <p style="margin:0 0 16px;">${escapeHtml(intro)}</p>
            ${bodyHtml}
            ${footerHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

export const REGISTRATION_CONFIRMATION = ({ name, contestName, startTime, registrationId }) => {
  /* Plain text fallback: Hi {name}, your registration for {contestName} is confirmed. Registration ID: {registrationId}. Starts at {startTime}. */
  const subject = `Registration confirmed for ${contestName}`;
  const html = layout({
    title: "Registration Confirmed",
    intro: `Hi ${escapeHtml(name)}, your registration for ${escapeHtml(contestName)} is confirmed.`,
    bodyHtml: `
      <div style="background:#f8fafc;border-radius:12px;padding:16px 18px;margin:18px 0;">
        <div><strong>Registration ID:</strong> ${escapeHtml(registrationId)}</div>
        <div><strong>Start time:</strong> ${escapeHtml(formatIST(startTime))}</div>
      </div>
    `,
    footerHtml: `<p style="margin:16px 0 0;color:#6b7280;">We’re glad to have you on QuizBuzz.</p>`
  });

  return { subject, html };
};

export const PAYMENT_RECEIPT = ({ name, contestName, amount, transactionId, receiptDate }) => {
  /* Plain text fallback: Hi {name}, your payment for {contestName} was received. Amount: {amount}. Transaction ID: {transactionId}. */
  const subject = `Payment receipt for ${contestName}`;
  const html = layout({
    title: "Payment Received",
    intro: `Hi ${escapeHtml(name)}, your payment for ${escapeHtml(contestName)} has been received.`,
    bodyHtml: `
      <div style="background:#f8fafc;border-radius:12px;padding:16px 18px;margin:18px 0;">
        <div><strong>Amount:</strong> ${escapeHtml(typeof amount === "number" ? formatCurrency(amount) : amount)}</div>
        <div><strong>Transaction ID:</strong> ${escapeHtml(transactionId)}</div>
        <div><strong>Receipt date:</strong> ${escapeHtml(formatIST(receiptDate))}</div>
      </div>
    `
  });

  return { subject, html };
};

export const QUIZ_REMINDER = ({ name, contestName, startTime, joinUrl }) => {
  /* Plain text fallback: Hi {name}, reminder for {contestName} starting at {startTime}. Join here: {joinUrl}. */
  const subject = `Reminder: ${contestName} starts soon`;
  const html = layout({
    title: "Quiz Reminder",
    intro: `Hi ${escapeHtml(name)}, this is a reminder for ${escapeHtml(contestName)}.`,
    bodyHtml: `
      <div style="background:#f8fafc;border-radius:12px;padding:16px 18px;margin:18px 0;">
        <div><strong>Start time:</strong> ${escapeHtml(formatIST(startTime))}</div>
        <div style="margin-top:12px;"><a href="${escapeHtml(joinUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;">Join contest</a></div>
      </div>
    `
  });

  return { subject, html };
};

export const RESULT_ANNOUNCEMENT = ({ name, contestName, score, total, rank, leaderboardUrl }) => {
  /* Plain text fallback: Hi {name}, results for {contestName} are ready. Score: {score}/{total}. Rank: {rank}. Leaderboard: {leaderboardUrl}. */
  const subject = `Results ready for ${contestName}`;
  const html = layout({
    title: "Results Announced",
    intro: `Hi ${escapeHtml(name)}, your results for ${escapeHtml(contestName)} are ready.`,
    bodyHtml: `
      <div style="background:#f8fafc;border-radius:12px;padding:16px 18px;margin:18px 0;">
        <div><strong>Score:</strong> ${escapeHtml(score)}/${escapeHtml(total)}</div>
        <div><strong>Rank:</strong> ${escapeHtml(formatRank(rank))}</div>
        <div style="margin-top:12px;"><a href="${escapeHtml(leaderboardUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;">View leaderboard</a></div>
      </div>
    `
  });

  return { subject, html };
};

export const CERTIFICATE_READY = ({ name, contestName, certificateUrl }) => {
  /* Plain text fallback: Hi {name}, your certificate for {contestName} is ready. Download: {certificateUrl}. */
  const subject = `Certificate ready for ${contestName}`;
  const html = layout({
    title: "Certificate Ready",
    intro: `Hi ${escapeHtml(name)}, your certificate for ${escapeHtml(contestName)} is ready.`,
    bodyHtml: `
      <div style="background:#f8fafc;border-radius:12px;padding:16px 18px;margin:18px 0;">
        <div style="margin-top:12px;"><a href="${escapeHtml(certificateUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;">Download certificate</a></div>
      </div>
    `
  });

  return { subject, html };
};

export const OTP = ({ otp, expiresInMinutes }) => {
  /* Plain text fallback: Your QuizBuzz OTP is {otp}. It expires in {expiresInMinutes} minutes. */
  const subject = "Your QuizBuzz OTP";
  const html = layout({
    title: "One-Time Password",
    intro: "Use the OTP below to continue your QuizBuzz verification.",
    bodyHtml: `
      <div style="text-align:center;background:#f8fafc;border-radius:12px;padding:22px 18px;margin:18px 0;">
        <div style="font-size:34px;letter-spacing:.22em;font-weight:700;color:#0f172a;">${escapeHtml(otp)}</div>
        <div style="margin-top:10px;color:#6b7280;">Expires in ${escapeHtml(expiresInMinutes)} minutes</div>
      </div>
    `,
    footerHtml: `<p style="margin:16px 0 0;color:#6b7280;">If you did not request this, you can ignore this email.</p>`
  });

  return { subject, html };
};

export const PAYMENT_FAILED = ({ name, contestName, failReason }) => {
  /* Plain text fallback: Hi {name}, your payment for {contestName} failed. Reason: {failReason}. Please try again. */
  const subject = `Payment failed for ${contestName}`;
  const html = layout({
    title: "Payment Failed",
    intro: `Hi ${escapeHtml(name)}, your payment for ${escapeHtml(contestName)} was not completed.`,
    bodyHtml: `
      <div style="background:#f8fafc;border-radius:12px;padding:16px 18px;margin:18px 0;">
        <div><strong>Reason:</strong> ${escapeHtml(failReason || "Payment failed")}</div>
      </div>
    `,
    footerHtml: `<p style="margin:16px 0 0;color:#6b7280;">You can try again from the contest payment page.</p>`
  });

  return { subject, html };
};

export const emailTemplates = {
  REGISTRATION_CONFIRMATION,
  PAYMENT_RECEIPT,
  QUIZ_REMINDER,
  RESULT_ANNOUNCEMENT,
  CERTIFICATE_READY,
  OTP,
  PAYMENT_FAILED
};

export default emailTemplates;