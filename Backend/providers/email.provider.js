/*
Required env vars:
- SENDGRID_API_KEY
- EMAIL_FROM_ADDRESS
- EMAIL_FROM_NAME
*/

import { ExternalServiceError } from "../utils/errors.js";

async function readResponseBody(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export async function send({ to, subject, html }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: {
          email: process.env.EMAIL_FROM_ADDRESS,
          name: process.env.EMAIL_FROM_NAME
        },
        subject,
        content: [{ type: "text/html", value: html }]
      }),
      signal: controller.signal
    });

    if (response.status !== 202) {
      throw new ExternalServiceError(
        "SendGrid rejected the email request",
        await readResponseBody(response),
        "SendGrid"
      );
    }

    return { accepted: true };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new ExternalServiceError("SendGrid request timed out", null, "SendGrid");
    }

    if (error instanceof ExternalServiceError) {
      throw error;
    }

    throw new ExternalServiceError(error.message || "SendGrid request failed", null, "SendGrid");
  } finally {
    clearTimeout(timeoutId);
  }
}