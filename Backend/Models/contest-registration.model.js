import mongoose from "mongoose";

const REGISTRATION_STATUSES = [
  "REGISTERED",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "DISQUALIFIED"
];

const contestRegistrationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    contestId: { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true, index: true },
    status: {
      type: String,
      enum: REGISTRATION_STATUSES,
      default: "REGISTERED",
      index: true,
      set: (value) => (typeof value === "string" ? value.toUpperCase() : value)
    },
    registeredAt: { type: Date, default: Date.now },
    paymentId: { type: String }
  },
  { timestamps: true }
);

contestRegistrationSchema.index({ userId: 1, contestId: 1 }, { unique: true });
contestRegistrationSchema.index({ contestId: 1, status: 1 });
contestRegistrationSchema.index({ contestId: 1, status: 1, registeredAt: -1 });

export const ContestRegistration =
  mongoose.models.ContestRegistration ||
  mongoose.model("ContestRegistration", contestRegistrationSchema);
