import mongoose from "mongoose";

const proctoringEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    contestId: { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true, index: true },
    eventType: {
      type: String,
      required: true,
      enum: ["FACE_NOT_DETECTED", "MULTIPLE_FACES", "TAB_SWITCH", "PHONE_DETECTED"],
      index: true
    },
    screenshotUrl: { type: String, default: null },
    occurredAt: { type: Date, required: true, default: Date.now, index: true },
    reviewed: { type: Boolean, default: false, index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewNote: { type: String, default: "" }
  },
  { timestamps: true }
);

proctoringEventSchema.index({ userId: 1, contestId: 1, occurredAt: -1 });
proctoringEventSchema.index({ contestId: 1, eventType: 1 });
proctoringEventSchema.index({ reviewed: 1 });

export const ProctoringEvent = mongoose.models.ProctoringEvent || mongoose.model("ProctoringEvent", proctoringEventSchema);