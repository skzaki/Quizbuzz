import { Worker } from "bullmq";
import logger from "../utils/logger.js";
import * as messageRepo from "../repositories/message.repository.js";
import { sendTemplate as sendWhatsAppTemplate } from "../providers/whatsapp.provider.js";
import emailTemplates from "../providers/templates/email.templates.js";
import { send as sendEmail } from "../providers/email.provider.js";

const redisConnection = { url: process.env.REDIS_URL };

export const messageWorker = new Worker(
  "messages",
  async (job) => {
    const { messageId, type, template, recipient, variables } = job.data;

    try {
      if (type === "WHATSAPP") {
        await sendWhatsAppTemplate(recipient, template, variables);
      } else if (type === "EMAIL") {
        const templateFactory = emailTemplates[template];
        if (typeof templateFactory !== "function") {
          throw new Error(`Unsupported email template: ${template}`);
        }

        const { subject, html } = templateFactory(variables);
        await sendEmail({ to: recipient, subject, html });
      } else {
        throw new Error(`Unsupported message type: ${type}`);
      }

      await messageRepo.markSent(messageId);
      return { messageId, status: "SENT" };
    } catch (err) {
      await messageRepo.markFailed(messageId, err.message);
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 20,
    limiter: {
      max: 100,
      duration: 1000
    }
  }
);

messageWorker.on("failed", (job, err) => {
  if (!job) {
    return;
  }

  if (job.attemptsMade >= (job.opts.attempts ?? 0)) {
    logger.error("Message permanently failed", {
      jobId: job.id,
      template: job.data?.template,
      recipient: job.data?.recipient,
      error: err.message
    });
  }
});

export default messageWorker;