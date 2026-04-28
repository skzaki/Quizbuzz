/*
Required env vars:
- MSG91_AUTH_KEY
- MSG91_TEMPLATE_REGISTRATION
- MSG91_TEMPLATE_PAYMENT
- MSG91_TEMPLATE_REMINDER
- MSG91_TEMPLATE_RESULT
- MSG91_TEMPLATE_OTP
*/

import { BadRequestError, ExternalServiceError } from "../utils/errors.js";

const TEMPLATE_MAP = {
  REGISTRATION_CONFIRMATION: process.env.MSG91_TEMPLATE_REGISTRATION,
  PAYMENT_RECEIPT: process.env.MSG91_TEMPLATE_PAYMENT,
  QUIZ_REMINDER: process.env.MSG91_TEMPLATE_REMINDER,
  RESULT_ANNOUNCEMENT: process.env.MSG91_TEMPLATE_RESULT,
  OTP: process.env.MSG91_TEMPLATE_OTP
};

function normalizePhone(phone) {
  return String(phone ?? "").trim();
}

async function readResponseBody(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export async function sendTemplate(phone, template, variables = {}) {
  const templateId = TEMPLATE_MAP[template];
  if (!templateId) {
    throw new BadRequestError(`Unsupported WhatsApp template: ${template}`);
  }

  const normalizedPhone = normalizePhone(phone);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://api.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        template_id: templateId,
        recipients: [
          {
            mobiles: `91${normalizedPhone}`,
            ...variables
          }
        ],
        authkey: process.env.MSG91_AUTH_KEY
      }),
      signal: controller.signal
    });

    const responseBody = await readResponseBody(response);

    if (response.status !== 200) {
      throw new ExternalServiceError(
        `WhatsApp provider rejected template ${template}`,
        responseBody,
        "MSG91"
      );
    }

    return responseBody;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new ExternalServiceError("WhatsApp provider request timed out", null, "MSG91");
    }

    if (error instanceof ExternalServiceError) {
      throw error;
    }

    throw new ExternalServiceError(error.message || "WhatsApp provider request failed", null, "MSG91");
  } finally {
    clearTimeout(timeoutId);
  }
}