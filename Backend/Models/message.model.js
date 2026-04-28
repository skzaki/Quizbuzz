import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    contestId: { type: mongoose.Schema.Types.ObjectId, ref: "Contest", default: null },
    type: {
      type: String,
      enum: ["WHATSAPP", "EMAIL"],
      required: true
    },
    template: {
      type: String,
      enum: [
        "REGISTRATION_CONFIRMATION",
        "PAYMENT_RECEIPT",
        "QUIZ_REMINDER",
        "RESULT_ANNOUNCEMENT",
        "CERTIFICATE_READY",
        "OTP",
        "PAYMENT_FAILED"
      ],
      required: true
    },
    status: {
      type: String,
      enum: ["QUEUED", "SENT", "FAILED", "SKIPPED"],
      default: "QUEUED"
    },
    recipient: { type: String, default: "" },
    variables: { type: mongoose.Schema.Types.Mixed, default: {} },
    failReason: { type: String, default: "" },
    attemptCount: { type: Number, default: 0 },
    sentAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
  },
  {
    versionKey: false
  }
);

messageSchema.index({ userId: 1, createdAt: -1 });
messageSchema.index({ status: 1 });
messageSchema.index({ template: 1, userId: 1 });

export const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);