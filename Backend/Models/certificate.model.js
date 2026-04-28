import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    contestId: { type: mongoose.Schema.Types.ObjectId, ref: "Contest", index: true },
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: "Submission", default: null, index: true },
    score: { type: Number, default: 0, min: 0 },
    rank: { type: Number, default: 0, min: 0 },
    totalParticipants: { type: Number, default: 0, min: 0 },
    certificateUrl: { type: String, default: null, trim: true },
    issuedAt: { type: Date, default: Date.now, required: true },
    templateVersion: { type: String, default: "v1", trim: true },
    userRef: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    contestRef: { type: mongoose.Schema.Types.ObjectId, ref: "Contest", default: null, index: true },
    certificateNumber: { type: String, default: null, trim: true },
    certificateType: {
      type: String,
      enum: ["completion", "participation", "achievement", "winner"],
      default: null
    }
  },
  {
    timestamps: true
  }
);

certificateSchema.index({ userId: 1, contestId: 1 }, { unique: true });
certificateSchema.index({ contestId: 1 });

certificateSchema.pre("validate", function (next) {
  if (!this.userId && this.userRef) {
    this.userId = this.userRef;
  }

  if (!this.contestId && this.contestRef) {
    this.contestId = this.contestRef;
  }

  next();
});

export const Certificate = mongoose.models.Certificate || mongoose.model("Certificate", certificateSchema);